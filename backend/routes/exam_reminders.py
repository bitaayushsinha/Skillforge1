import schemas
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import datetime
import logging

router = APIRouter(prefix="/api/v1/exam-engine", tags=["Exam Engine API"])
logger = logging.getLogger(__name__)

def mock_send_email(to_email: str, subject: str, body: str):
    """Mock function to simulate sending an email."""
    print(f"--- MOCK EMAIL TO: {to_email} ---")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("-----------------------------------")
    logger.info(f"Sent reminder email to {to_email}: {subject}")

@router.post("/admin/trigger-reminders")
def trigger_reminders(db: Session = Depends(get_db)):
    """Admin endpoint to process active exam sessions and trigger email reminders."""
    # Find active credentials
    active_creds = db.query(models.ExamCredential).filter(models.ExamCredential.status == "issued").all()
    count = 0
    sent_logs = []
    
    now = datetime.datetime.utcnow()
    
    for cred in active_creds:
        session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
        if not session:
            continue
            
        user = db.query(models.User).filter(models.User.id == session.student_id).first()
        if not user:
            continue
            
        # In a real system, we'd check cred.issued_at vs now to determine 24h/Day-Of/30m marks.
        # For this prototype, we'll just send a general mock reminder if it's within 24 hours of expiry.
        if cred.expires_at:
            time_until_expiry = cred.expires_at - now
            if time_until_expiry.total_seconds() > 0 and time_until_expiry.total_seconds() < 86400: # Less than 24 hours
                
                subject = f"Reminder: Your SkillForge Formal Exam for {session.level} Level"
                import os
                frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
                link = f"{frontend_url}/exam/take/{cred.temp_user_id}"
                body = f"""
Hello {user.name},

This is a reminder for your upcoming SkillForge exam.
Booking Reference: {session.booking_ref}

Your secure assessment link is: {link}
Temporary Credential ID: {cred.temp_user_id}

Please ensure you join on time and have a quiet, well-lit room for the AI proctoring compliance check.

Good luck!
SkillForge Exam Engine Team
                """
                mock_send_email(user.email, subject, body)
                sent_logs.append({
                    "email": user.email,
                    "type": "24h_or_less_reminder",
                    "session_ref": session.session_ref
                })
                count += 1
                
    return {"reminders_sent": count, "logs": sent_logs}
