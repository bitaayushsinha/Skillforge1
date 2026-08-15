from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth import verifyAdminRole

router = APIRouter(prefix="/api/exam-configs", tags=["Exam Configs"])

@router.get("/", response_model=List[schemas.ExamConfigResponse])
def get_exam_configs(subject_id: int = None, level: str = None, db: Session = Depends(get_db)):
    """List exam configurations, optionally filtered by subject and level."""
    query = db.query(models.ExamConfig)
    if subject_id:
        query = query.filter(models.ExamConfig.subject_id == subject_id)
    if level:
        query = query.filter(models.ExamConfig.level == level)
    return query.all()

@router.post("/", response_model=schemas.ExamConfigResponse, status_code=status.HTTP_201_CREATED)
def create_exam_config(config_in: schemas.ExamConfigCreate, db: Session = Depends(get_db)):
    """Create a new exam configuration."""
    existing = db.query(models.ExamConfig).filter(
        models.ExamConfig.subject_id == config_in.subject_id,
        models.ExamConfig.level == config_in.level
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Config already exists for this subject and level.")
        
    config = models.ExamConfig(**config_in.dict())
    db.add(config)
    db.commit()
    db.refresh(config)
    return config

@router.put("/{config_id}", response_model=schemas.ExamConfigResponse)
def update_exam_config(config_id: int, config_in: schemas.ExamConfigUpdate, db: Session = Depends(get_db)):
    """Update an existing exam configuration."""
    config = db.query(models.ExamConfig).filter(models.ExamConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Exam config not found")
        
    update_data = config_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
        
    db.commit()
    db.refresh(config)
    return config
