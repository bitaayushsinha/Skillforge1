from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import datetime
import uuid

router = APIRouter()

# Pending IBM confirmation config
PASSING_SCORE = 60.0
INNOVATION_HUB_SCORE = 80.0
GRACE_PERIOD_DAYS = 7

@router.post("/exam-engine/results")
def ingest_exam_results(
    payload: schemas.ExamResultWebhookPayload,
    db: Session = Depends(get_db)
    # Note: In production, we'd have API key auth for webhooks: Depends(verify_webhook_signature)
):
    """
    Webhook endpoint to receive assessment results from the Exam Engine.
    Executes the Phase 4 State Machine logic for District -> State -> National progression.
    """
    # Find the booking
    booking = db.query(models.ExamSlotBooking).filter(
        models.ExamSlotBooking.exam_engine_slot_id == payload.exam_engine_slot_id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found for this slot ID")
        
    booking.status = payload.status if payload.status in ["completed", "cancelled"] else "completed"
    
    # Update the registration state
    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.id == booking.registration_id
    ).first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    subject = db.query(models.Subject).filter(models.Subject.id == payload.subject_id).first()
    tier = subject.semester_tier if subject and subject.semester_tier else registration.current_tier
    
    # Phase 4 State Machine Logic
    if payload.score < PASSING_SCORE:
        registration.access_status = "deactivated"
        # No cert issued, progression stops
    else:
        # Passed!
        if tier == "District":
            registration.district_score = payload.score
            registration.access_status = "deactivating_soon"
            registration.grace_period_end = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=GRACE_PERIOD_DAYS)
            issue_certificate(db, payload.user_id, booking.subject_id, "District Badge/Certificate")
            
        elif tier == "State":
            registration.state_score = payload.score
            registration.access_status = "deactivating_soon"
            registration.grace_period_end = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=GRACE_PERIOD_DAYS)
            issue_certificate(db, payload.user_id, booking.subject_id, "State Badge/Certificate")
            
        elif tier == "National":
            registration.national_score = payload.score
            registration.access_status = "active"
            registration.grace_period_end = None
            if payload.score >= INNOVATION_HUB_SCORE:
                registration.innovation_hub_eligible = True
            issue_certificate(db, payload.user_id, booking.subject_id, "National Badge/Certificate")
            
    db.commit()
    return {"message": "Webhook processed successfully", "new_status": registration.access_status, "current_tier": tier}

def issue_certificate(db: Session, user_id: int, subject_id: int, cert_name: str):
    """ Helper to issue a badge/certificate via existing models """
    cert_id = f"SF-PRG-{uuid.uuid4().hex[:8].upper()}"
    new_cert = models.Certificate(
        user_id=str(user_id),
        course_id=str(subject_id), # Reusing course_id for subject_id as string
        course_name=cert_name,
        certificate_id=cert_id,
        cert_id=cert_id,
        issue_date=datetime.date.today().isoformat()
    )
    db.add(new_cert)
