from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth import verifyAdminRole, verifyExpertRole

router = APIRouter(prefix="/api/exam-banks", tags=["Exam Banks"])

@router.get("/", response_model=List[schemas.QuestionBankResponse])
def get_question_banks(db: Session = Depends(get_db)):
    """List all question banks."""
    return db.query(models.QuestionBank).all()

@router.post("/", response_model=schemas.QuestionBankResponse, status_code=status.HTTP_201_CREATED)
def create_question_bank(bank_in: schemas.QuestionBankCreate, db: Session = Depends(get_db)):
    """Create a new question bank."""
    bank = models.QuestionBank(**bank_in.dict())
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank

@router.get("/{bank_id}/questions", response_model=List[schemas.QuestionResponse])
def get_questions_for_bank(bank_id: int, db: Session = Depends(get_db)):
    """Get all questions for a specific bank."""
    bank = db.query(models.QuestionBank).filter(models.QuestionBank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Question bank not found")
    return db.query(models.Question).filter(models.Question.bank_id == bank_id).all()

@router.post("/{bank_id}/questions/upload", response_model=schemas.QuestionUploadResponse)
def upload_questions(bank_id: int, questions: List[schemas.QuestionCreate], db: Session = Depends(get_db)):
    """Upload a JSON array of questions with row-level validation."""
    bank = db.query(models.QuestionBank).filter(models.QuestionBank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Question bank not found")
        
    imported = 0
    errors = []
    
    for idx, q in enumerate(questions):
        try:
            if not q.options or len(q.options) < 2:
                errors.append(f"Row {idx+1}: Must have at least 2 options.")
                continue
            if q.correct_answer < 0 or q.correct_answer >= len(q.options):
                errors.append(f"Row {idx+1}: Correct answer index out of bounds.")
                continue
                
            db_question = models.Question(
                bank_id=bank_id,
                text=q.text,
                options=q.options,
                correct_answer=q.correct_answer,
                explanation=q.explanation
            )
            db.add(db_question)
            imported += 1
        except Exception as e:
            errors.append(f"Row {idx+1}: Unexpected error {str(e)}")
            
    db.commit()
    
    return {
        "success": len(errors) == 0 or imported > 0,
        "imported_count": imported,
        "errors": errors
    }
