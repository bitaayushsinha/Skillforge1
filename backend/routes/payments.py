import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user
from services.payment_service import (
    create_order_for_tier,
    verify_razorpay_signature,
    process_successful_payment,
    TIER_PRICING
)

router = APIRouter()
logger = logging.getLogger("payments_router")

@router.get("/pricing")
def get_tier_pricing():
    """ Returns INR pricing breakdown including 18% GST for frontend checkout. """
    return TIER_PRICING

@router.get("/history")
def get_payment_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ Fetch the payment history for the current user """
    records = db.query(models.PaymentRecord).filter(
        models.PaymentRecord.user_id == current_user.id
    ).order_by(models.PaymentRecord.created_at.desc()).all()
    return records

import os

@router.post("/create-order", response_model=schemas.PaymentOrderResponse)
def create_payment_order(
    order_in: schemas.PaymentOrderCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates an order/payment intent for Razorpay checkout with full GST breakdown.
    """
    try:
        payment_record = create_order_for_tier(
            db=db,
            user_id=current_user.id,
            registration_id=order_in.registration_id,
            target_tier=order_in.target_tier
        )
        return {
            "order_id": payment_record.gateway_order_id,
            "amount": payment_record.total_amount,
            "currency": payment_record.currency,
            "target_tier": payment_record.target_tier,
            "key_id": os.getenv("RAZORPAY_KEY_ID", "rzp_test_TDQGFCm2xKMtfk")
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
def verify_payment(
    verification: schemas.PaymentVerification,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synchronously verifies Razorpay HMAC signature and processes level unlock.
    """
    is_valid = verify_razorpay_signature(
        order_id=verification.order_id,
        payment_id=verification.payment_id,
        signature=verification.signature
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature verification.")

    try:
        result = process_successful_payment(
            db=db,
            registration_id=verification.registration_id,
            target_tier=verification.target_tier,
            gateway_order_id=verification.order_id,
            gateway_payment_id=verification.payment_id
        )
        return {
            "message": "Payment verified successfully, level unlocked.",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def razorpay_async_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature")
):
    """
    Asynchronous webhook handler for Razorpay payment confirmations.
    """
    payload_json = await request.json()
    event = payload_json.get("event")
    logger.info(f"Received Razorpay async webhook event: {event}")

    if event in ("order.paid", "payment.captured"):
        payload_data = payload_json.get("payload", {})
        payment_entity = payload_data.get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id") or payload_json.get("order_id")
        payment_id = payment_entity.get("id") or payload_json.get("payment_id")
        registration_id = payload_json.get("registration_id")
        target_tier = payload_json.get("target_tier")

        # If webhook has order_id, locate PaymentRecord
        payment_record = None
        if order_id:
            payment_record = db.query(models.PaymentRecord).filter(
                models.PaymentRecord.gateway_order_id == order_id
            ).first()

        if payment_record:
            registration_id = payment_record.registration_id
            target_tier = payment_record.target_tier

        if not registration_id or not target_tier:
            logger.warning("Webhook missing registration_id or target_tier mapping.")
            return {"status": "ignored", "reason": "missing registration mapping"}

        result = process_successful_payment(
            db=db,
            registration_id=registration_id,
            target_tier=target_tier,
            gateway_order_id=order_id,
            gateway_payment_id=payment_id
        )
        return {"status": "success", "processed": result}

    return {"status": "ignored", "event": event}
