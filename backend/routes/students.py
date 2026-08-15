import csv
import io
import hashlib
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Query, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import require_privilege, verifySubAdminOrAdmin, get_subadmin_allowed_institution_ids, get_current_user_optional
from services.mailer import MailerService

router = APIRouter()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def is_valid_email(email: str) -> bool:
    pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(pattern, email) is not None

@router.get("/specializations", response_model=List[schemas.SpecializationResponse])
def get_specializations(
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    return db.query(models.Specialization).filter(models.Specialization.is_active == True).order_by(models.Specialization.name.asc()).all()

@router.get("", response_model=List[schemas.UserResponse])
def get_students(
    institution_id: Optional[int] = Query(None),
    specialization: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "learner")
    
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        query = query.filter(models.User.institution_id.in_(allowed_ids))
        
    if institution_id:
        if allowed_ids is not None and institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized for this institution")
        query = query.filter(models.User.institution_id == institution_id)
        
    if specialization:
        query = query.filter(models.User.specialization == specialization)
        
    if search:
        search_term = f"%{search}%"
        query = query.filter((models.User.name.ilike(search_term)) | (models.User.email.ilike(search_term)))
        
    return query.order_by(models.User.id.desc()).all()

@router.post("", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    student_in: schemas.StudentCreateAdmin,
    current_user: models.User = Depends(require_privilege("manage_students")),
    db: Session = Depends(get_db)
):
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        if student_in.institution_id is None or student_in.institution_id not in allowed_ids:
            raise HTTPException(
                status_code=403,
                detail="Access Denied: You cannot create a student for an institution outside your assigned scope."
            )
            
    existing = db.query(models.User).filter(models.User.email == student_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")
        
    if student_in.institution_id:
        inst = db.query(models.Institution).filter(models.Institution.id == student_in.institution_id).first()
        if not inst:
            raise HTTPException(status_code=404, detail="Specified institution does not exist.")

    hashed_pwd = hash_password(student_in.password)
    db_user = models.User(
        email=student_in.email,
        name=student_in.name,
        hashed_password=hashed_pwd,
        role="learner",
        institution_id=student_in.institution_id,
        specialization=student_in.specialization,
        is_active=True,
        must_change_password=True,
        force_password_change=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Auto-enroll in active cycle
    active_cycle = db.query(models.RegistrationCycle).filter(models.RegistrationCycle.is_active == True).first()
    cycle_name = active_cycle.name if active_cycle else "2026-2027"
    
    spec = db.query(models.Specialization).filter(models.Specialization.name == student_in.specialization).first() if student_in.specialization else None
    if student_in.specialization and not spec:
        raise HTTPException(status_code=400, detail=f"Specialization '{student_in.specialization}' not found in system.")
    spec_id = spec.id if spec else None

    registration = models.StudentRegistration(
        user_id=db_user.id,
        specialization_id=spec_id,
        institution_id=student_in.institution_id,
        cycle_year=cycle_name,
        current_tier="District",
        access_status="active",
        is_archived=False
    )
    db.add(registration)
    db.commit()
    
    # Send Onboarding Email (with DB session for audit log)
    email_success = MailerService.send_onboarding_email(db_user.email, db_user.name, student_in.password, db=db)
    
    response_data = schemas.UserResponse.model_validate(db_user)
    if not email_success:
        response_data.warning = "Student created successfully, but the onboarding email failed to send."
    
    return response_data

@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_student(
    user_id: int,
    student_in: schemas.StudentUpdateAdmin,
    current_user: models.User = Depends(require_privilege("manage_students")),
    db: Session = Depends(get_db)
):
    student = db.query(models.User).filter(models.User.id == user_id, models.User.role == "learner").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        if student.institution_id is not None and student.institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized to modify this student.")
        if student_in.institution_id is not None and student_in.institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Cannot assign student to an institution outside your scope.")
            
    update_data = student_in.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"] != student.email:
        existing = db.query(models.User).filter(models.User.email == update_data["email"], models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use.")
            
    for k, v in update_data.items():
        setattr(student, k, v)
        
    db.commit()
    db.refresh(student)
    return student

@router.put("/{user_id}/password")
def reset_student_password(
    user_id: int,
    pwd_in: schemas.StudentPasswordReset,
    current_user: models.User = Depends(require_privilege("reset_passwords")),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Prevent escalation: Cannot reset password of admin or sub-admin!
    if user.role in ["admin", "sub_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Cannot reset passwords of administrative accounts."
        )
        
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None and user.institution_id not in allowed_ids:
        raise HTTPException(status_code=403, detail="Not authorized to reset password for this student.")
        
    user.hashed_password = hash_password(pwd_in.new_password)
    db.commit()
    return {"message": f"Password for {user.email} reset successfully."}

@router.put("/{user_id}/specialization", response_model=schemas.UserResponse)
def allocate_specialization(
    user_id: int,
    spec_in: schemas.SpecializationAllocation,
    current_user: models.User = Depends(require_privilege("allocate_specializations")),
    db: Session = Depends(get_db)
):
    student = db.query(models.User).filter(models.User.id == user_id, models.User.role == "learner").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None and student.institution_id not in allowed_ids:
        raise HTTPException(status_code=403, detail="Not authorized to allocate specialization for this student.")
        
    student.specialization = spec_in.specialization
    db.commit()
    db.refresh(student)
    return student

@router.post("/bulk-specialization")
def bulk_allocate_specialization(
    bulk_in: schemas.BulkSpecializationAllocation,
    current_user: models.User = Depends(require_privilege("allocate_specializations")),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.id.in_(bulk_in.student_ids), models.User.role == "learner")
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        query = query.filter(models.User.institution_id.in_(allowed_ids))
        
    students = query.all()
    count = 0
    for s in students:
        s.specialization = bulk_in.specialization
        count += 1
        
    db.commit()
    return {
        "message": f"Specialization '{bulk_in.specialization}' allocated to {count} student(s).",
        "updated_count": count
    }

@router.post("/bulk-subject-assignment")
def bulk_subject_assignment(
    bulk_in: schemas.BulkSubjectAssignmentCreate,
    current_user: models.User = Depends(require_privilege("allocate_specializations")),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.id.in_(bulk_in.student_ids), models.User.role == "learner")
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        query = query.filter(models.User.institution_id.in_(allowed_ids))
        
    students = query.all()
    count = 0
    new_assignments = []
    for s in students:
        # Find active registration
        reg = db.query(models.StudentRegistration).filter(
            models.StudentRegistration.user_id == s.id,
            models.StudentRegistration.access_status == "active"
        ).first()
        if reg:
            # Check if assignment already exists
            existing = db.query(models.StudentSubjectAssignment).filter(
                models.StudentSubjectAssignment.user_id == s.id,
                models.StudentSubjectAssignment.subject_id == bulk_in.subject_id
            ).first()
            if not existing:
                new_assignments.append(models.StudentSubjectAssignment(
                    user_id=s.id,
                    subject_id=bulk_in.subject_id,
                    registration_id=reg.id
                ))
                count += 1
                
    if new_assignments:
        db.bulk_save_objects(new_assignments)
        db.commit()
        
    return {
        "message": f"Subject assigned to {count} student(s).",
        "assigned_count": count
    }

@router.get("/template")
def download_upload_template(
    current_user: models.User = Depends(require_privilege("bulk_upload"))
):
    content = "name,email,password,institution_code,specialization\nJane Doe,jane.doe@example.com,secret123,STANFORD,AI & Machine Learning\nJohn Smith,john.smith@example.com,password456,MIT,Data Science\n"
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=student_upload_template.csv"}
    )

@router.post("/bulk-upload", response_model=schemas.BulkUploadResponse)
def bulk_upload_students(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_privilege("bulk_upload")),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(('.csv', '.txt')):
        raise HTTPException(status_code=400, detail="Only CSV files are supported for bulk upload.")
        
    content_bytes = file.file.read()
    try:
        content_str = content_bytes.decode('utf-8')
    except Exception:
        content_str = content_bytes.decode('latin-1')
        
    reader = csv.DictReader(io.StringIO(content_str))
    required_cols = {"name", "email", "password"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400, 
            detail=f"CSV must contain at least the required columns: {', '.join(required_cols)}"
        )
        
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    
    # Pre-load institutions map for fast lookup
    institutions = db.query(models.Institution).all()
    inst_by_code = {i.code.strip().upper(): i for i in institutions if i.code}
    inst_by_name = {i.name.strip().upper(): i for i in institutions}
    inst_by_id = {str(i.id): i for i in institutions}
    
    specs = db.query(models.Specialization).all()
    spec_by_name = {s.name.strip().upper(): s for s in specs}
    
    total_rows = 0
    success_count = 0
    errors: List[schemas.BulkUploadRowError] = []
    
    new_users = []
    seen_emails = set()
    
    for row_idx, row in enumerate(reader, start=2):
        total_rows += 1
        name = row.get("name", "").strip()
        email = row.get("email", "").strip().lower()
        password = row.get("password", "").strip()
        inst_identifier = row.get("institution_code", "") or row.get("institution", "") or row.get("institution_id", "")
        inst_identifier = str(inst_identifier).strip()
        specialization = row.get("specialization", "").strip() or None
        
        if not name or not email or not password:
            errors.append(schemas.BulkUploadRowError(row=row_idx, email=email, reason="Missing required fields (name, email, or password)"))
            continue
            
        if not is_valid_email(email):
            errors.append(schemas.BulkUploadRowError(row=row_idx, email=email, reason="Invalid email format"))
            continue
            
        if email in seen_emails:
            errors.append(schemas.BulkUploadRowError(row=row_idx, email=email, reason="Duplicate email in CSV file"))
            continue
            
        existing_db = db.query(models.User).filter(models.User.email == email).first()
        if existing_db:
            errors.append(schemas.BulkUploadRowError(row=row_idx, email=email, reason="Email already registered in database"))
            continue
            
        target_inst = None
        if inst_identifier:
            target_inst = inst_by_code.get(inst_identifier.upper()) or inst_by_name.get(inst_identifier.upper()) or inst_by_id.get(inst_identifier)
            if not target_inst:
                errors.append(schemas.BulkUploadRowError(row=row_idx, email=email, reason=f"Institution '{inst_identifier}' not found in system"))
                continue
                
        if specialization:
            target_spec = spec_by_name.get(specialization.upper())
            if not target_spec:
                errors.append(schemas.BulkUploadRowError(row=row_idx, email=email, reason=f"Specialization '{specialization}' not found in system"))
                continue
                
        if allowed_ids is not None:
            if not target_inst or target_inst.id not in allowed_ids:
                errors.append(schemas.BulkUploadRowError(
                    row=row_idx, 
                    email=email, 
                    reason="Access Denied: Cannot upload student to an institution outside your assigned scope"
                ))
                continue
                
        seen_emails.add(email)
        hashed_pwd = hash_password(password)
        new_users.append(models.User(
            email=email,
            name=name,
            hashed_password=hashed_pwd,
            role="learner",
            institution_id=target_inst.id if target_inst else None,
            specialization=specialization,
            is_active=True,
            must_change_password=True,
            force_password_change=True,
        ))
        # ⚑ Bulk upload trigger: onboarding emails queued in background.
        background_tasks.add_task(
            MailerService.send_onboarding_email,
            email, name, password
        )
        
        success_count += 1
        
    if new_users:
        db.bulk_save_objects(new_users)
        db.commit()
        
        # Auto-enroll newly created students in active cycle
        active_cycle = db.query(models.RegistrationCycle).filter(models.RegistrationCycle.is_active == True).first()
        cycle_name = active_cycle.name if active_cycle else "2026-2027"
        
        # We need their IDs for the registration table
        inserted_emails = [u.email for u in new_users]
        inserted_users = db.query(models.User).filter(models.User.email.in_(inserted_emails)).all()
        
        new_registrations = []
        for u in inserted_users:
            spec = db.query(models.Specialization).filter(models.Specialization.name == u.specialization).first() if u.specialization else None
            spec_id = spec.id if spec else None
            new_registrations.append(models.StudentRegistration(
                user_id=u.id,
                specialization_id=spec_id,
                institution_id=u.institution_id,
                cycle_year=cycle_name,
                current_tier="District",
                access_status="active",
                is_archived=False
            ))
            
        if new_registrations:
            db.bulk_save_objects(new_registrations)
            db.commit()
        
    return schemas.BulkUploadResponse(
        total_rows=total_rows,
        success_count=success_count,
        error_count=len(errors),
        errors=errors
    )
