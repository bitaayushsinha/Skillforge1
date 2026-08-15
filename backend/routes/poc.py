from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
import schemas
from auth import verifySubAdminOrAdmin, get_subadmin_allowed_institution_ids
from datetime import datetime

router = APIRouter()

def verify_poc_access(
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    if current_user.role == "admin":
        return current_user
    priv = db.query(models.SubAdminPrivilege).filter(models.SubAdminPrivilege.user_id == current_user.id).first()
    if not priv or not priv.verify_assessments:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You lack POC/Assessment Verification privileges."
        )
    return current_user

@router.get("/students", response_model=List[schemas.StudentRegistrationResponse])
def get_poc_students(
    cycle_year: str = Query("2026-2027"),
    current_user: models.User = Depends(verify_poc_access),
    db: Session = Depends(get_db)
):
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    
    query = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.cycle_year == cycle_year
    )
    
    if allowed_ids is not None:
        query = query.filter(models.StudentRegistration.institution_id.in_(allowed_ids))
        
    return query.all()

@router.get("/results/student/{student_id}", response_model=List[schemas.ExamResultResponse])
def get_student_results(
    student_id: int,
    current_user: models.User = Depends(verify_poc_access),
    db: Session = Depends(get_db)
):
    # Verify the student belongs to an allowed institution
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None and student.institution_id not in allowed_ids:
        raise HTTPException(status_code=403, detail="Not authorized to view this student")

    results = db.query(models.ExamResult).filter(models.ExamResult.student_id == student_id).all()
    return results

@router.post("/results/{result_id}/verify", response_model=schemas.ExamResultResponse)
def verify_result(
    result_id: int,
    current_user: models.User = Depends(verify_poc_access),
    db: Session = Depends(get_db)
):
    result = db.query(models.ExamResult).filter(models.ExamResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
        
    # Verify institution
    if result.student_id:
        student = db.query(models.User).filter(models.User.id == result.student_id).first()
        if student:
            allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
            if allowed_ids is not None and student.institution_id not in allowed_ids:
                raise HTTPException(status_code=403, detail="Not authorized to verify this result")

    # Toggle verification
    result.verified_by_poc = not result.verified_by_poc
    result.verified_at = func.now() if result.verified_by_poc else None
    result.verified_by_id = current_user.id if result.verified_by_poc else None
    
    db.commit()
    db.refresh(result)
    return result
