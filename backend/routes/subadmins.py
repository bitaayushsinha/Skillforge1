import hashlib
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import verifyAdminRole, verifySubAdminOrAdmin, get_subadmin_allowed_institution_ids
from services.mailer import MailerService

router = APIRouter()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def build_subadmin_response(user: models.User, db: Session):
    priv = db.query(models.SubAdminPrivilege).filter(models.SubAdminPrivilege.user_id == user.id).first()
    accesses = db.query(models.SubAdminInstitutionAccess).filter(models.SubAdminInstitutionAccess.subadmin_id == user.id).all()
    inst_ids = [a.institution_id for a in accesses]
    
    resp = user.__dict__.copy()
    resp["privileges"] = priv
    resp["institution_ids"] = inst_ids
    return resp

@router.get("/me", response_model=schemas.SubAdminResponse)
def get_my_subadmin_profile(
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    return build_subadmin_response(current_user, db)

@router.get("", response_model=List[schemas.SubAdminResponse])
def get_all_subadmins(
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    users = db.query(models.User).filter(models.User.role == "sub_admin").order_by(models.User.id.asc()).all()
    return [build_subadmin_response(u, db) for u in users]

@router.post("", response_model=schemas.SubAdminResponse, status_code=status.HTTP_201_CREATED)
def create_subadmin(
    subadmin_in: schemas.SubAdminCreate,
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    existing_user = db.query(models.User).filter(models.User.email == subadmin_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists."
        )
    
    hashed_pwd = hash_password(subadmin_in.password)
    db_user = models.User(
        email=subadmin_in.email,
        name=subadmin_in.name,
        hashed_password=hashed_pwd,
        role="sub_admin",
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create privilege record
    priv_data = subadmin_in.privileges.model_dump() if subadmin_in.privileges else {}
    db_priv = models.SubAdminPrivilege(
        user_id=db_user.id,
        **priv_data
    )
    db.add(db_priv)
    
    # Bind institution access if provided
    if subadmin_in.institution_ids:
        for inst_id in subadmin_in.institution_ids:
            db.add(models.SubAdminInstitutionAccess(
                subadmin_id=db_user.id,
                institution_id=inst_id
            ))
            
    db.commit()
    
    # ⚑ Prepare text for email
    institutions_text = "All Institutions (Global Access)"
    if subadmin_in.institution_ids:
        assigned_insts = db.query(models.Institution).filter(models.Institution.id.in_(subadmin_in.institution_ids)).all()
        institutions_text = "\n".join(f"- {i.name}" for i in assigned_insts)
        
    privs_dict = subadmin_in.privileges.model_dump() if subadmin_in.privileges else {}
    privileges_text = "\n".join(f"- {k.replace('_', ' ').title()}" for k, v in privs_dict.items() if v)
    if not privileges_text:
        privileges_text = "- No specific privileges assigned"
        
    email_success = MailerService.send_subadmin_onboarding_email(
        db_user.email, db_user.name, subadmin_in.password, institutions_text, privileges_text, db=db
    )
    
    resp = build_subadmin_response(db_user, db)
    if not email_success:
        resp["warning"] = "Sub-admin created successfully, but the onboarding email failed to send."
        
    return resp

@router.put("/{user_id}/privileges", response_model=schemas.SubAdminResponse)
def update_subadmin_privileges(
    user_id: int,
    update_in: schemas.SubAdminUpdate,
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "sub_admin").first()
    if not user:
        raise HTTPException(status_code=404, detail="Sub-admin user not found")
        
    if update_in.name:
        user.name = update_in.name
    if update_in.email:
        existing = db.query(models.User).filter(models.User.email == update_in.email, models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = update_in.email
    if update_in.password:
        user.hashed_password = hash_password(update_in.password)
        
    # Update or create SubAdminPrivilege
    if update_in.privileges is not None:
        priv = db.query(models.SubAdminPrivilege).filter(models.SubAdminPrivilege.user_id == user_id).first()
        priv_data = update_in.privileges.model_dump()
        if priv:
            for k, v in priv_data.items():
                setattr(priv, k, v)
        else:
            db_priv = models.SubAdminPrivilege(user_id=user_id, **priv_data)
            db.add(db_priv)
            
    # Update Institution Access if provided
    if update_in.institution_ids is not None:
        db.query(models.SubAdminInstitutionAccess).filter(
            models.SubAdminInstitutionAccess.subadmin_id == user_id
        ).delete(synchronize_session=False)
        for inst_id in update_in.institution_ids:
            db.add(models.SubAdminInstitutionAccess(
                subadmin_id=user_id,
                institution_id=inst_id
            ))
            
    db.commit()
    db.refresh(user)
    return build_subadmin_response(user, db)

@router.delete("/{user_id}", response_model=schemas.MessageResponse)
def delete_subadmin(
    user_id: int,
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "sub_admin").first()
    if not user:
        raise HTTPException(status_code=404, detail="Sub-admin user not found")
        
    db.query(models.SubAdminPrivilege).filter(models.SubAdminPrivilege.user_id == user_id).delete(synchronize_session=False)
    db.query(models.SubAdminInstitutionAccess).filter(models.SubAdminInstitutionAccess.subadmin_id == user_id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return {"message": "Sub-admin deleted successfully"}


# ─── Exam Window Management ─────────────────────────────────────────────────────

class ExamWindowUpdate(schemas.BaseModel):
    exam_window_start: Optional[str] = None  # ISO datetime string
    exam_window_end: Optional[str] = None    # ISO datetime string

@router.get("/subjects", response_model=List[schemas.SubjectResponse])
def admin_list_subjects(
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    """List subjects. Scoped by institution if sub-admin."""
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    query = db.query(models.Subject)
    if allowed_ids is not None:
        # If institution_ids is empty, allowed_ids is [], which means no access
        # Subjects with null institution_id are global. We can return global subjects + their institution subjects.
        query = query.filter((models.Subject.institution_id == None) | (models.Subject.institution_id.in_(allowed_ids)))
    return query.order_by(models.Subject.specialization_id, models.Subject.id).all()

@router.post("/subjects", response_model=schemas.SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_in: schemas.SubjectCreate,
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        if subject_in.institution_id is None or subject_in.institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized to create subject outside your institution.")
    
    db_subject = models.Subject(**subject_in.model_dump())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

@router.put("/subjects/{subject_id}", response_model=schemas.SubjectResponse)
def update_subject(
    subject_id: int,
    subject_in: schemas.SubjectCreate,
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        if subject.institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized to edit this subject.")
        if subject_in.institution_id is not None and subject_in.institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized to change to this institution.")
            
    for k, v in subject_in.model_dump().items():
        setattr(subject, k, v)
    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/subjects/{subject_id}", response_model=schemas.MessageResponse)
def delete_subject(
    subject_id: int,
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        if subject.institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized to delete this subject.")
            
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully"}

@router.get("/subjects/{subject_id}/exam-window", response_model=Optional[schemas.ExamWindowResponse])
def get_exam_window(
    subject_id: int,
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    # Just getting the first one for now or active cycle
    window = db.query(models.ExamWindow).filter(models.ExamWindow.subject_id == subject_id).first()
    return window

@router.patch("/subjects/{subject_id}/exam-window")

def set_exam_window(
    subject_id: int,
    window: schemas.ExamWindowUpdate,
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    """
    Set or update the exam booking window for a subject.
    """
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None and subject.institution_id is not None and subject.institution_id not in allowed_ids:
        raise HTTPException(status_code=403, detail="Not authorized for this subject.")

    exam_window = db.query(models.ExamWindow).filter(models.ExamWindow.subject_id == subject_id).first()
    
    if not exam_window:
        # Create new if doesn't exist
        exam_window = models.ExamWindow(
            subject_id=subject_id,
            level="District",
            start_date=window.start_date or datetime.utcnow(),
            end_date=window.end_date or datetime.utcnow(),
            daily_start_time=window.daily_start_time or "09:00",
            daily_end_time=window.daily_end_time or "17:00",
            slot_duration_minutes=window.slot_duration_minutes or 60
        )
        db.add(exam_window)
    else:
        if window.start_date is not None: exam_window.start_date = window.start_date
        if window.end_date is not None: exam_window.end_date = window.end_date
        if window.daily_start_time is not None: exam_window.daily_start_time = window.daily_start_time
        if window.daily_end_time is not None: exam_window.daily_end_time = window.daily_end_time
        if window.slot_duration_minutes is not None: exam_window.slot_duration_minutes = window.slot_duration_minutes

    if exam_window.start_date and exam_window.end_date:
        if exam_window.start_date >= exam_window.end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date.")

    if exam_window.daily_start_time and exam_window.daily_end_time:
        try:
            st = datetime.strptime(exam_window.daily_start_time, "%H:%M").time()
            et = datetime.strptime(exam_window.daily_end_time, "%H:%M").time()
            if st >= et:
                raise HTTPException(status_code=400, detail="Daily end time must be after start time (use 24-hour format).")
        except ValueError as e:
            if "Daily end time" in str(e): raise
            pass # ignore parse errors here, let them default later

    db.commit()
    db.refresh(exam_window)
    return {
        "message": f"Exam window updated for '{subject.name}'",
        "subject_id": subject.id,
        "window": schemas.ExamWindowResponse.model_validate(exam_window)
    }

