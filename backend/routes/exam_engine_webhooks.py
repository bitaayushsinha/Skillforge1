import schemas
import hmac
import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
import models

logger = logging.getLogger("exam_engine_webhooks")
logging.basicConfig(level=logging.INFO)

router = APIRouter()

EXAM_ENGINE_WEBHOOK_SECRET = os.getenv("EXAM_ENGINE_WEBHOOK_SECRET")

async def verify_webhook_auth(
    request: Request,
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    x_signature: Optional[str] = Header(None, alias="X-Exam-Engine-Signature")
):
    """
    Validates inbound webhooks from the Exam Engine.
    Supports either X-Webhook-Secret exact match OR X-Exam-Engine-Signature HMAC-SHA256 signature.
    """
    if not EXAM_ENGINE_WEBHOOK_SECRET:
        logger.error("EXAM_ENGINE_WEBHOOK_SECRET is not configured.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook configuration missing")

    if x_webhook_secret and hmac.compare_digest(x_webhook_secret, EXAM_ENGINE_WEBHOOK_SECRET):
        return True

    body_bytes = await request.body()
    expected_signature = hmac.new(
        EXAM_ENGINE_WEBHOOK_SECRET.encode("utf-8"),
        body_bytes,
        hashlib.sha256
    ).hexdigest()

    if x_signature and hmac.compare_digest(x_signature, expected_signature):
        return True

    logger.warning("Unauthorized webhook request rejected due to invalid authentication signature/token")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing webhook authentication signature/token"
    )

class LinkReadyPayload(BaseModel):
    booking_reference: str
    exam_engine_session_ref: Optional[str] = None
    assessment_link: str
    link_status: str = "confirmed"
    timestamp: Optional[str] = None

class ResultPayload(BaseModel):
    booking_reference: str
    exam_engine_session_ref: Optional[str] = None
    student_id: Optional[int] = None
    subject_id: Optional[int] = None
    level: Optional[str] = None
    score: float
    pass_fail: str
    topic_breakdown: Optional[Any] = None
    correct_vs_selected: Optional[Any] = None
    timestamp: Optional[str] = None

@router.post("/link-ready", dependencies=[Depends(verify_webhook_auth)])
async def webhook_link_ready(
    payload: LinkReadyPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Inbound webhook from Exam Engine confirming assessment link readiness.
    Updates ExamSlotBooking status and assessment_link.
    """
    raw_body = (await request.body()).decode("utf-8")
    logger.info(f"[WEBHOOK AUDIT] /link-ready received at {datetime.utcnow().isoformat()}Z | Payload: {raw_body}")

    booking = db.query(models.ExamSlotBooking).filter(
        (models.ExamSlotBooking.booking_reference == payload.booking_reference) |
        (models.ExamSlotBooking.exam_engine_session_ref == payload.exam_engine_session_ref)
    ).first()

    if not booking:
        logger.error(f"Booking reference '{payload.booking_reference}' not found for /link-ready webhook.")
        raise HTTPException(status_code=404, detail="Booking reference not found.")

    booking.link_status = payload.link_status
    booking.assessment_link = payload.assessment_link
    if payload.exam_engine_session_ref:
        booking.exam_engine_session_ref = payload.exam_engine_session_ref
    booking.is_link_active = (payload.link_status == "confirmed")

    db.commit()
    db.refresh(booking)

    logger.info(f"Successfully updated booking '{booking.booking_reference}' to link_status='{booking.link_status}'")
    return {
        "status": "success",
        "booking_reference": booking.booking_reference,
        "link_status": booking.link_status,
        "assessment_link": booking.assessment_link
    }

@router.post("/result", dependencies=[Depends(verify_webhook_auth)])
async def webhook_exam_result(
    payload: ResultPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Inbound webhook from Exam Engine pushing final assessment result and score.
    Creates an ExamResult audit record and marks the booking completed.
    """
    raw_body = (await request.body()).decode("utf-8")
    logger.info(f"[WEBHOOK AUDIT] /result received at {datetime.utcnow().isoformat()}Z | Payload: {raw_body}")

    booking = db.query(models.ExamSlotBooking).filter(
        (models.ExamSlotBooking.booking_reference == payload.booking_reference) |
        (models.ExamSlotBooking.exam_engine_session_ref == payload.exam_engine_session_ref)
    ).first()

    student_id = payload.student_id or (booking.user_id if booking else None)
    subject_id = payload.subject_id or (booking.subject_id if booking else None)

    exam_result = models.ExamResult(
        booking_ref=payload.booking_reference,
        exam_engine_session_ref=payload.exam_engine_session_ref,
        student_id=student_id,
        subject_id=subject_id,
        level=payload.level,
        score=payload.score,
        pass_fail=payload.pass_fail,
        topic_breakdown=payload.topic_breakdown,
        correct_vs_selected=payload.correct_vs_selected,
        raw_payload=raw_body
    )
    db.add(exam_result)

    if booking:
        booking.status = "completed"
        booking.is_link_active = False

    # Wire into Phase 2 Access-Rule Engine Core
    from services.access_rule_engine import apply_exam_result_transition
    transition_summary = None
    if student_id:
        registration = db.query(models.StudentRegistration).filter(
            models.StudentRegistration.user_id == student_id
        ).first()
        if registration:
            outcome = apply_exam_result_transition(db, registration, exam_result)
            transition_summary = {
                "previous_state": outcome.previous_state,
                "new_state": outcome.new_state,
                "qualification_passed": outcome.qualification_passed,
                "payment_required": outcome.payment_required,
                "badge_tier": outcome.badge_tier
            }

    db.commit()
    db.refresh(exam_result)

    logger.info(f"Stored ExamResult ID {exam_result.id} for booking '{payload.booking_reference}' (score={payload.score}, status={payload.pass_fail})")
    return {
        "status": "success",
        "result_id": exam_result.id,
        "booking_reference": payload.booking_reference,
        "score": exam_result.score,
        "pass_fail": exam_result.pass_fail,
        "fsm_transition": transition_summary
    }
