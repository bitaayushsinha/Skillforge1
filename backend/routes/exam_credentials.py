from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import uuid
import datetime
from typing import Optional

router = APIRouter(prefix="/api/v1/exam-engine", tags=["Exam Engine API"])

@router.post("/slots/book", response_model=schemas.SlotBookResponse)
def book_slot(request: schemas.SlotBookRequest, db: Session = Depends(get_db)):
    """SRP webhook endpoint for booking an exam slot and generating credentials."""
    existing_session = db.query(models.ExamSession).filter(
        models.ExamSession.booking_ref == request.booking_reference
    ).first()
    
    if existing_session:
        return {
            "success": True,
            "booking_reference": request.booking_reference,
            "exam_engine_session_ref": existing_session.session_ref,
            "link_status": existing_session.status,
            "message": "Slot already booked in Exam Engine."
        }
        
    # Check StudentRegistration for Lockout, Cooldown, and Tier Gates
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == request.student_id
    ).order_by(models.StudentRegistration.id.desc()).first()

    if registration:
        if getattr(registration, "is_locked", False) or registration.access_state == "locked_out":
            return {
                "success": False,
                "booking_reference": request.booking_reference,
                "link_status": "rejected",
                "message": "Maximum exam attempts reached. Registration locked out for mentor intervention."
            }

        cooldown_dt = getattr(registration, "cooldown_until", None)
        if cooldown_dt and cooldown_dt > now_utc:
            return {
                "success": False,
                "booking_reference": request.booking_reference,
                "link_status": "rejected",
                "message": f"Re-attempt cooldown active until {cooldown_dt.isoformat()}."
            }

        # Check tier gating hierarchy (Item 14)
        tier_ranks = {"District": 1, "State": 2, "National": 3}
        current_rank = tier_ranks.get((registration.current_tier or "District").strip().capitalize(), 1)
        req_rank = tier_ranks.get((request.level or "District").strip().capitalize(), 1)
        if req_rank > current_rank:
            return {
                "success": False,
                "booking_reference": request.booking_reference,
                "link_status": "rejected",
                "message": f"Access denied: Prerequisite tier not completed. Current tier is '{registration.current_tier}', but requested exam is '{request.level}'."
            }

    config = db.query(models.ExamConfig).filter(
        models.ExamConfig.subject_id == request.subject_id,
        models.ExamConfig.level == request.level
    ).first()
    max_attempts = (config.max_attempts or 3) if config else 3
    
    previous_attempts = db.query(models.ExamSession).filter(
        models.ExamSession.student_id == request.student_id,
        models.ExamSession.subject_id == request.subject_id,
        models.ExamSession.level == request.level,
        models.ExamSession.status.in_(["completed", "terminated", "active", "suspended"])
    ).count()
    
    reg_attempts = getattr(registration, "attempt_count", 0) if registration else 0
    effective_attempts = max(previous_attempts, reg_attempts or 0)
    
    if effective_attempts >= max_attempts:
        return {
            "success": False,
            "booking_reference": request.booking_reference,
            "link_status": "rejected",
            "message": f"Maximum allowed attempts ({max_attempts}) reached for this exam."
        }
        
    # Prevent stacking: Check if a pending session already exists
    pending_session = db.query(models.ExamSession).filter(
        models.ExamSession.student_id == request.student_id,
        models.ExamSession.subject_id == request.subject_id,
        models.ExamSession.level == request.level,
        models.ExamSession.status == "pending"
    ).first()
    
    if pending_session:
        return {
            "success": False,
            "booking_reference": request.booking_reference,
            "link_status": "rejected",
            "message": "You already have a pending credential for this exam. Please complete or cancel it before booking a new slot."
        }
        
    session_ref = f"sess_{uuid.uuid4().hex[:12]}"
    exam_session = models.ExamSession(
        session_ref=session_ref,
        student_id=request.student_id,
        subject_id=request.subject_id,
        level=request.level,
        booking_ref=request.booking_reference,
        status="pending"
    )
    db.add(exam_session)
    db.commit()
    db.refresh(exam_session)
    
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=1)
    if request.slot_datetime:
        try:
            slot_time = datetime.datetime.fromisoformat(request.slot_datetime.replace('Z', '+00:00'))
            expires_at = slot_time + datetime.timedelta(hours=4)
        except Exception:
            pass
            
    temp_user_id = f"SF-{uuid.uuid4().hex[:8].upper()}"
    credential = models.ExamCredential(
        session_id=exam_session.id,
        temp_user_id=temp_user_id,
        temp_password_hash=uuid.uuid4().hex, # plain token for now
        expires_at=expires_at,
        status="issued"
    )
    
    db.add(credential)
    db.commit()
    
    import os
    
    skip_enforcement = os.getenv("SKIP_CREDENTIAL_WINDOW_ENFORCEMENT", "false").lower() == "true"
    
    if skip_enforcement:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        link = f"{frontend_url}/exam/take/{temp_user_id}"
        
        # Auto-activate for demo purposes
        exam_session.status = "active"
        db.commit()
    
        return {
            "success": True,
            "booking_reference": request.booking_reference,
            "exam_engine_session_ref": session_ref,
            "assessment_link": link,
            "link_status": "confirmed",
            "message": "Slot booked and link generated immediately (Demo Mode)."
        }
    else:
        return {
            "success": True,
            "booking_reference": request.booking_reference,
            "exam_engine_session_ref": session_ref,
            "link_status": "pending",
            "message": "Slot booked and credential pending."
        }

@router.get("/credentials/{temp_user_id}", response_model=schemas.CredentialVerifyResponse)
def verify_credential(temp_user_id: str, db: Session = Depends(get_db)):
    """Verify if a credential is valid, ready, or expired."""
    cred = db.query(models.ExamCredential).filter(models.ExamCredential.temp_user_id == temp_user_id).first()
    
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found for credential")
        
    user = db.query(models.User).filter(models.User.id == session.student_id).first()
    subject = db.query(models.Subject).filter(models.Subject.id == session.subject_id).first()
    config = db.query(models.ExamConfig).filter(
        models.ExamConfig.subject_id == session.subject_id,
        models.ExamConfig.level == session.level
    ).first()
    
    is_valid = False
    status_msg = cred.status
    now = datetime.datetime.now(datetime.timezone.utc)
    
    if cred.status == "revoked":
        status_msg = "revoked"
    elif cred.status == "used":
        status_msg = "used"
    elif now > cred.expires_at:
        status_msg = "expired"
        if cred.status != "expired":
            cred.status = "expired"
            
            # Notify admin
            admin_email = "admin@skillforge.com" # Simplification for now
            email_log = models.EmailLog(
                recipient=admin_email,
                template_type="credential_expired",
                subject=f"Credential Expired for Session {session.session_ref}",
                status="sent"
            )
            db.add(email_log)
            db.commit()
    else:
        is_valid = True
        status_msg = "ready"
        
    return {
        "is_valid": is_valid,
        "status": status_msg,
        "student_name": user.name if user else "Unknown",
        "subject_name": subject.name if subject else "Unknown",
        "level": session.level,
        "window_start": cred.issued_at,
        "window_end": cred.expires_at,
        "requires_screenshare": config.requires_screenshare if config else False
    }

import urllib.request
import json

@router.post("/admin/trigger-links")
def trigger_link_webhooks(db: Session = Depends(get_db)):
    """Admin endpoint to process pending sessions and fire SRP Link Ready webhooks."""
    pending_sessions = db.query(models.ExamSession).filter(models.ExamSession.status == "pending").all()
    count = 0
    errors = []
    
    for session in pending_sessions:
        cred = db.query(models.ExamCredential).filter(models.ExamCredential.session_id == session.id).first()
        if not cred:
            continue
            
        import os
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        link = f"{frontend_url}/exam/take/{cred.temp_user_id}"
        
        payload = {
            "booking_reference": session.booking_ref,
            "exam_engine_session_ref": session.session_ref,
            "assessment_link": link,
            "link_status": "confirmed",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
        try:
            # Send to local SRP webhook
            url = "http://localhost:8000/api/webhooks/exam-engine/link-ready"
            import os
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
                'Content-Type': 'application/json',
                'X-Webhook-Secret': os.getenv("EXAM_ENGINE_WEBHOOK_SECRET", "skillforge_dummy_secret")
            })
            response = urllib.request.urlopen(req)
            
            if response.status in [200, 201]:
                session.status = "active"
                db.commit()
                count += 1
            else:
                errors.append(f"Session {session.session_ref}: Bad status {response.status}")
        except Exception as e:
            errors.append(f"Session {session.session_ref}: {str(e)}")
            
    return {"processed": count, "errors": errors}

@router.post("/admin/poc/regenerate-credential/{session_ref}")
def regenerate_credential(session_ref: str, db: Session = Depends(get_db)):
    """Admin endpoint to regenerate an expired credential."""
    session = db.query(models.ExamSession).filter(models.ExamSession.session_ref == session_ref).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    cred = db.query(models.ExamCredential).filter(models.ExamCredential.session_id == session.id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    cred.status = "issued"
    cred.expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=4)
    db.commit()
    
    return {"success": True, "message": "Credential regenerated"}
