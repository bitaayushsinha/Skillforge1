import hmac
import hashlib
import os
import uuid
import datetime
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import models

logger = logging.getLogger("payment_service")

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_TDQGFCm2xKMtfk")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "RzXrymAZJUiGKAoDtZsFMV1G")

TIER_PRICING = {
    "State": {
        "base_amount": 1500.0,
        "gst_rate": 0.18,
        "gst_amount": 270.0,
        "total_amount": 1770.0,
        "required_district_score": 50.0
    },
    "National": {
        "base_amount": 2000.0,
        "gst_rate": 0.18,
        "gst_amount": 360.0,
        "total_amount": 2360.0,
        "required_state_score": 60.0
    }
}

def create_order_for_tier(db: Session, user_id: int, registration_id: int, target_tier: str) -> models.PaymentRecord:
    """ Creates a PaymentRecord for Razorpay checkout with tax breakdown and calls Razorpay API. """
    tier_info = TIER_PRICING.get(target_tier)
    if not tier_info:
        raise ValueError(f"Invalid target tier '{target_tier}' for payment.")

    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.id == registration_id,
        models.StudentRegistration.user_id == user_id
    ).first()

    if not registration:
        raise ValueError("Registration not found.")

    # Validate eligibility scores
    if target_tier == "State":
        score = registration.district_score
        if score is None or score < tier_info["required_district_score"]:
            raise ValueError("Cannot unlock State level without passing District level (score >= 50%).")
    elif target_tier == "National":
        score = registration.state_score
        if score is None or score < tier_info["required_state_score"]:
            raise ValueError("Cannot unlock National level without passing State level (score >= 60%).")

    import requests
    razorpay_amount = int(round(tier_info["total_amount"] * 100))
    receipt_id = f"rcpt_{uuid.uuid4().hex[:12]}"
    payload = {
        "amount": razorpay_amount,
        "currency": "INR",
        "receipt": receipt_id,
        "notes": {
            "user_id": str(user_id),
            "registration_id": str(registration_id),
            "target_tier": target_tier
        }
    }

    try:
        response = requests.post(
            "https://api.razorpay.com/v1/orders",
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
            json=payload,
            timeout=10
        )
        if response.status_code not in (200, 201):
            logger.error(f"Razorpay API error ({response.status_code}): {response.text}")
            raise ValueError(f"Razorpay order creation failed: {response.text}")
        order_data = response.json()
        order_id = order_data.get("id")
        if not order_id:
            raise ValueError("Razorpay order creation returned no ID.")
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error connecting to Razorpay: {e}")
        raise ValueError(f"Failed to connect to payment gateway: {str(e)}")

    payment_record = models.PaymentRecord(
        user_id=user_id,
        registration_id=registration_id,
        target_tier=target_tier,
        amount=tier_info["base_amount"],
        gst_amount=tier_info["gst_amount"],
        total_amount=tier_info["total_amount"],
        currency="INR",
        gateway_order_id=order_id,
        status="created"
    )
    db.add(payment_record)
    db.commit()
    db.refresh(payment_record)
    return payment_record

def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """ Verifies Razorpay HMAC-SHA256 signature. """
    if not RAZORPAY_KEY_SECRET:
        return False

    payload = f"{order_id}|{payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature)

def process_successful_payment(
    db: Session,
    registration_id: int,
    target_tier: str,
    gateway_order_id: Optional[str] = None,
    gateway_payment_id: Optional[str] = None,
    now: Optional[datetime.datetime] = None
) -> Dict[str, Any]:
    """
    Processes tier unlock and access reactivation upon successful payment verification.
    Shared by both synchronous /verify and asynchronous /webhook endpoints.
    """
    if now is None:
        now = datetime.datetime.now(datetime.timezone.utc)

    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.id == registration_id
    ).first()

    if not registration:
        raise ValueError(f"Registration ID {registration_id} not found.")

    tier_info = TIER_PRICING.get(target_tier, {
        "base_amount": 0.0, "gst_amount": 0.0, "total_amount": 0.0
    })

    previous_state = getattr(registration, "access_state", "active") or "active"

    # Update PaymentRecord if one exists
    payment_record = None
    if gateway_order_id:
        payment_record = db.query(models.PaymentRecord).filter(
            models.PaymentRecord.gateway_order_id == gateway_order_id
        ).first()
    if payment_record and payment_record.status == "paid":
        logger.info(f"Payment order {payment_record.gateway_order_id} already processed. Returning idempotent receipt.")
        return {
            "status": "success",
            "registration_id": registration.id,
            "new_tier": registration.current_tier,
            "access_state": registration.access_state,
            "access_status": registration.access_status,
            "amount_paid": tier_info["total_amount"],
            "gst_included": tier_info["gst_amount"],
            "idempotent_replay": True
        }

    if not payment_record:
        # Find latest created record for this registration and target_tier
        payment_record = db.query(models.PaymentRecord).filter(
            models.PaymentRecord.registration_id == registration_id,
            models.PaymentRecord.target_tier == target_tier,
            models.PaymentRecord.status == "created"
        ).order_by(models.PaymentRecord.id.desc()).first()

    if payment_record:
        payment_record.status = "paid"
        payment_record.gateway_payment_id = gateway_payment_id or f"pay_{uuid.uuid4().hex[:12]}"
        payment_record.completed_at = now

    # Advance tier and reactivate access
    if target_tier == "State":
        registration.current_tier = "State"
        registration.payment_status = "state_paid"
    elif target_tier == "National":
        registration.current_tier = "National"
        registration.payment_status = "national_paid"

    registration.access_state = "active"
    registration.access_status = "active"
    registration.payment_required = False
    registration.grace_period_end = None
    registration.deactivates_at = None
    registration.total_paid_amount = (registration.total_paid_amount or 0.0) + tier_info["total_amount"]
    registration.last_payment_date = now

    # Record Audit Log
    audit = models.AccessAuditLog(
        registration_id=registration.id,
        user_id=registration.user_id,
        previous_state=previous_state,
        new_state="active",
        trigger_event="PAYMENT_SUCCEEDED",
        reason=f"Unlocked {target_tier} level via payment of ₹{tier_info['total_amount']} (including ₹{tier_info['gst_amount']} GST)."
    )
    db.add(audit)
    db.commit()

    logger.info(f"Payment succeeded for registration {registration_id} -> {target_tier} active.")
    return {
        "status": "success",
        "registration_id": registration.id,
        "new_tier": registration.current_tier,
        "access_state": registration.access_state,
        "access_status": registration.access_status,
        "amount_paid": tier_info["total_amount"],
        "gst_included": tier_info["gst_amount"]
    }
