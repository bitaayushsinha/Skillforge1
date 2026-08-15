from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import require_privilege, get_current_user_optional, get_subadmin_allowed_institution_ids

router = APIRouter()

@router.post("", response_model=schemas.InstitutionResponse, status_code=status.HTTP_201_CREATED)
def create_institution(
    inst_in: schemas.InstitutionCreate,
    current_user: models.User = Depends(require_privilege("manage_institutions")),
    db: Session = Depends(get_db)
):
    existing = db.query(models.Institution).filter(models.Institution.name == inst_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="An institution with this name already exists.")
        
    if inst_in.code:
        existing_code = db.query(models.Institution).filter(models.Institution.code == inst_in.code).first()
        if existing_code:
            raise HTTPException(status_code=400, detail="An institution with this code already exists.")

    db_inst = models.Institution(**inst_in.model_dump())
    db.add(db_inst)
    db.commit()
    db.refresh(db_inst)
    
    # If a sub-admin created this institution, bind their access automatically
    if current_user.role == "sub_admin":
        db.add(models.SubAdminInstitutionAccess(
            subadmin_id=current_user.id,
            institution_id=db_inst.id
        ))
        db.commit()
        
    return db_inst

@router.get("", response_model=List[schemas.InstitutionResponse])
def get_institutions(
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(models.Institution)
    if current_user and current_user.role == "sub_admin":
        allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
        if allowed_ids is not None:
            query = query.filter(models.Institution.id.in_(allowed_ids))
            
    return query.order_by(models.Institution.name.asc()).all()

@router.get("/{inst_id}", response_model=schemas.InstitutionResponse)
def get_institution(
    inst_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    inst = db.query(models.Institution).filter(models.Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found.")
        
    if current_user and current_user.role == "sub_admin":
        allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
        if allowed_ids is not None and inst_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Access Denied: Not authorized for this institution.")
            
    return inst

@router.put("/{inst_id}", response_model=schemas.InstitutionResponse)
def update_institution(
    inst_id: int,
    inst_in: schemas.InstitutionUpdate,
    current_user: models.User = Depends(require_privilege("manage_institutions")),
    db: Session = Depends(get_db)
):
    inst = db.query(models.Institution).filter(models.Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found.")
        
    if current_user.role == "sub_admin":
        allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
        if allowed_ids is not None and inst_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Access Denied: Not authorized to manage this institution.")
            
    update_data = inst_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != inst.name:
        existing = db.query(models.Institution).filter(models.Institution.name == update_data["name"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="An institution with this name already exists.")
            
    if "code" in update_data and update_data["code"] and update_data["code"] != inst.code:
        existing = db.query(models.Institution).filter(models.Institution.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="An institution with this code already exists.")
            
    for k, v in update_data.items():
        setattr(inst, k, v)
        
    db.commit()
    db.refresh(inst)
    return inst

@router.delete("/{inst_id}", response_model=schemas.MessageResponse)
def delete_institution(
    inst_id: int,
    current_user: models.User = Depends(require_privilege("manage_institutions")),
    db: Session = Depends(get_db)
):
    inst = db.query(models.Institution).filter(models.Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found.")
        
    if current_user.role == "sub_admin":
        allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
        if allowed_ids is not None and inst_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Access Denied: Not authorized to manage this institution.")
            
    db.query(models.SubAdminInstitutionAccess).filter(models.SubAdminInstitutionAccess.institution_id == inst_id).delete(synchronize_session=False)
    db.delete(inst)
    db.commit()
    return {"message": "Institution deleted successfully"}
