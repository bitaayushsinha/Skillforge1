import os
import datetime
import logging
from sqlalchemy.orm import Session
import models

logger = logging.getLogger("access_scheduler")
logging.basicConfig(level=logging.INFO)

DEFAULT_POST_RESULT_DAYS = int(os.getenv("POST_RESULT_ACCESS_DAYS", "7"))
DEFAULT_GRACE_PERIOD_DAYS = int(os.getenv("PAYMENT_GRACE_PERIOD_DAYS", "7"))

def get_access_window_config(db: Session) -> dict:
    """ Retrieves configurable durations for post-exam access and payment grace periods. """
    post_stat = db.query(models.Stat).filter(models.Stat.key == "POST_RESULT_ACCESS_DAYS").first()
    grace_stat = db.query(models.Stat).filter(models.Stat.key == "PAYMENT_GRACE_PERIOD_DAYS").first()

    post_days = int(post_stat.value) if post_stat and post_stat.value.isdigit() else DEFAULT_POST_RESULT_DAYS
    grace_days = int(grace_stat.value) if grace_stat and grace_stat.value.isdigit() else DEFAULT_GRACE_PERIOD_DAYS

    return {
        "POST_RESULT_ACCESS_DAYS": post_days,
        "PAYMENT_GRACE_PERIOD_DAYS": grace_days
    }

def set_access_window_config(db: Session, post_result_days: int, grace_period_days: int) -> dict:
    """ Admin helper to update configurable access and grace period settings. """
    for key, val, label in [
        ("POST_RESULT_ACCESS_DAYS", str(post_result_days), "Post-Exam Active Access Days"),
        ("PAYMENT_GRACE_PERIOD_DAYS", str(grace_period_days), "Payment Grace Period Days")
    ]:
        stat = db.query(models.Stat).filter(models.Stat.key == key).first()
        if stat:
            stat.value = val
        else:
            stat = models.Stat(key=key, value=val, label=label)
            db.add(stat)

    db.commit()
    return get_access_window_config(db)

def sweep_expired_access_windows(db: Session, now: datetime.datetime = None) -> dict:
    """
    Background job checking for:
    1. Access windows past their 7-10 day expiry -> auto-deactivate.
    2. Payment grace periods expired without payment -> auto-deactivate.
    """
    if now is None:
        now = datetime.datetime.now(datetime.timezone.utc)

    deactivated_window_count = 0
    deactivated_grace_count = 0

    # 1. Sweep expired post-exam access windows (< threshold after 7-10 days)
    expired_post_exams = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.access_state == "post_exam_access",
        models.StudentRegistration.deactivates_at <= now,
        ~models.StudentRegistration.access_status.startswith("manual_")
    ).all()

    for reg in expired_post_exams:
        prev_state = reg.access_state
        reg.access_state = "deactivated"
        reg.access_status = "deactivated"

        audit = models.AccessAuditLog(
            registration_id=reg.id,
            user_id=reg.user_id,
            previous_state=prev_state,
            new_state="deactivated",
            trigger_event="WINDOW_EXPIRED",
            reason="Post-exam access window expired (7-10 days elapsed)."
        )
        db.add(audit)
        deactivated_window_count += 1

    # 2. Sweep expired payment grace periods (>= threshold but unpaid after grace period)
    expired_grace_periods = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.access_state == "pending_payment",
        models.StudentRegistration.grace_period_end <= now,
        ~models.StudentRegistration.access_status.startswith("manual_")
    ).all()

    for reg in expired_grace_periods:
        prev_state = reg.access_state
        reg.access_state = "deactivated"
        reg.access_status = "deactivated"

        audit = models.AccessAuditLog(
            registration_id=reg.id,
            user_id=reg.user_id,
            previous_state=prev_state,
            new_state="deactivated",
            trigger_event="GRACE_PERIOD_EXPIRED",
            reason="Payment grace period expired without required payment."
        )
        db.add(audit)
        deactivated_grace_count += 1

    if deactivated_window_count > 0 or deactivated_grace_count > 0:
        db.commit()

    logger.info(f"Sweeper summary: {deactivated_window_count} windows expired, {deactivated_grace_count} grace periods expired.")
    return {
        "status": "success",
        "deactivated_window_count": deactivated_window_count,
        "deactivated_grace_count": deactivated_grace_count,
        "swept_at": now.isoformat()
    }
