import os
import datetime
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

# Configurable window durations per spec
POST_RESULT_ACCESS_DAYS = int(os.getenv("POST_RESULT_ACCESS_DAYS", "7"))
PAYMENT_GRACE_PERIOD_DAYS = int(os.getenv("PAYMENT_GRACE_PERIOD_DAYS", "7"))

@dataclass
class TransitionOutcome:
    previous_state: str
    new_state: str
    new_access_status: str
    deactivates_at: Optional[datetime.datetime]
    grace_period_end: Optional[datetime.datetime]
    payment_required: bool
    badge_tier: Optional[str]
    qualification_passed: bool
    deliverables_triggered: List[str] = field(default_factory=list)
    audit_event: str = "EXAM_RESULT_RECEIVED"
    reason: str = ""
    increment_attempt: bool = False
    cooldown_end: Optional[datetime.datetime] = None
    lockout_triggered: bool = False

def evaluate_exam_result_transition(
    current_tier: str,
    current_state: str,
    score: float,
    now: Optional[datetime.datetime] = None,
    attempt_count: int = 0
) -> TransitionOutcome:
    """
    Pure business logic function evaluating an inbound exam score for a student's tier
    and determining the resulting FSM state, timers, badge tier, attempts, and deliverables.
    """
    if now is None:
        now = datetime.datetime.now(datetime.timezone.utc)
        
    tier = (current_tier or "District").strip().capitalize()
    state = (current_state or "active").strip().lower()
    
    # 1. District Level Rules (<50% vs >=50%)
    if tier == "District":
        if score < 50.0:
            next_attempt = attempt_count + 1
            if next_attempt >= 3:
                return TransitionOutcome(
                    previous_state=state,
                    new_state="locked_out",
                    new_access_status="locked",
                    deactivates_at=now,
                    grace_period_end=None,
                    payment_required=False,
                    badge_tier=None,
                    qualification_passed=False,
                    deliverables_triggered=["analytics_report", "participation_cert", "admin_intervention_flag"],
                    audit_event="EXAM_RESULT_RECEIVED",
                    reason=f"District score {score}% < 50% threshold. Attempt {next_attempt}/3. Max attempts reached; registration locked out.",
                    increment_attempt=True,
                    cooldown_end=None,
                    lockout_triggered=True
                )
            else:
                return TransitionOutcome(
                    previous_state=state,
                    new_state="cooldown",
                    new_access_status="active",
                    deactivates_at=now + datetime.timedelta(days=POST_RESULT_ACCESS_DAYS),
                    grace_period_end=None,
                    payment_required=False,
                    badge_tier=None,
                    qualification_passed=False,
                    deliverables_triggered=["analytics_report", "participation_cert"],
                    audit_event="EXAM_RESULT_RECEIVED",
                    reason=f"District score {score}% < 50% threshold. Attempt {next_attempt}/3. 7-day cooldown enforced until re-attempt.",
                    increment_attempt=True,
                    cooldown_end=now + datetime.timedelta(days=7),
                    lockout_triggered=False
                )
        else:
            return TransitionOutcome(
                previous_state=state,
                new_state="pending_payment",
                new_access_status="active",
                deactivates_at=None,
                grace_period_end=now + datetime.timedelta(days=PAYMENT_GRACE_PERIOD_DAYS),
                payment_required=True,
                badge_tier="Bronze",
                qualification_passed=True,
                deliverables_triggered=["qualification_notice", "bronze_badge", "district_certificate"],
                audit_event="EXAM_RESULT_RECEIVED",
                reason=f"District score {score}% >= 50% threshold. Bronze badge & certificate unlocked. Prompted for State payment."
            )

    # 2. State Level Rules (<60% vs >=60%)
    elif tier == "State":
        if score < 60.0:
            next_attempt = attempt_count + 1
            if next_attempt >= 3:
                return TransitionOutcome(
                    previous_state=state,
                    new_state="locked_out",
                    new_access_status="locked",
                    deactivates_at=now,
                    grace_period_end=None,
                    payment_required=False,
                    badge_tier=None,
                    qualification_passed=False,
                    deliverables_triggered=["analytics_report", "participation_cert", "admin_intervention_flag"],
                    audit_event="EXAM_RESULT_RECEIVED",
                    reason=f"State score {score}% < 60% threshold. Attempt {next_attempt}/3. Max attempts reached; registration locked out.",
                    increment_attempt=True,
                    cooldown_end=None,
                    lockout_triggered=True
                )
            else:
                return TransitionOutcome(
                    previous_state=state,
                    new_state="cooldown",
                    new_access_status="active",
                    deactivates_at=now + datetime.timedelta(days=POST_RESULT_ACCESS_DAYS),
                    grace_period_end=None,
                    payment_required=False,
                    badge_tier=None,
                    qualification_passed=False,
                    deliverables_triggered=["analytics_report", "participation_cert"],
                    audit_event="EXAM_RESULT_RECEIVED",
                    reason=f"State score {score}% < 60% threshold. Attempt {next_attempt}/3. 14-day cooldown enforced until re-attempt.",
                    increment_attempt=True,
                    cooldown_end=now + datetime.timedelta(days=14),
                    lockout_triggered=False
                )
        else:
            return TransitionOutcome(
                previous_state=state,
                new_state="pending_payment",
                new_access_status="active",
                deactivates_at=None,
                grace_period_end=now + datetime.timedelta(days=PAYMENT_GRACE_PERIOD_DAYS),
                payment_required=True,
                badge_tier="Silver",
                qualification_passed=True,
                deliverables_triggered=["qualification_notice", "silver_badge", "state_certificate", "analytics_report"],
                audit_event="EXAM_RESULT_RECEIVED",
                reason=f"State score {score}% >= 60% threshold. Silver badge & certificate unlocked. Prompted for National payment."
            )

    # 3. National Level Rules (<80% vs >=80%)
    elif tier == "National":
        if score < 80.0:
            next_attempt = attempt_count + 1
            if next_attempt >= 3:
                return TransitionOutcome(
                    previous_state=state,
                    new_state="locked_out",
                    new_access_status="locked",
                    deactivates_at=now,
                    grace_period_end=None,
                    payment_required=False,
                    badge_tier=None,
                    qualification_passed=False,
                    deliverables_triggered=["analytics_report", "participation_completion_cert", "admin_intervention_flag"],
                    audit_event="EXAM_RESULT_RECEIVED",
                    reason=f"National score {score}% < 80% threshold. Attempt {next_attempt}/3. Max attempts reached; registration locked out.",
                    increment_attempt=True,
                    cooldown_end=None,
                    lockout_triggered=True
                )
            else:
                return TransitionOutcome(
                    previous_state=state,
                    new_state="cooldown",
                    new_access_status="active",
                    deactivates_at=now + datetime.timedelta(days=POST_RESULT_ACCESS_DAYS),
                    grace_period_end=None,
                    payment_required=False,
                    badge_tier=None,
                    qualification_passed=False,
                    deliverables_triggered=["analytics_report", "participation_completion_cert"],
                    audit_event="EXAM_RESULT_RECEIVED",
                    reason=f"National score {score}% < 80% threshold. Attempt {next_attempt}/3. 14-day cooldown enforced until re-attempt.",
                    increment_attempt=True,
                    cooldown_end=now + datetime.timedelta(days=14),
                    lockout_triggered=False
                )
        else:
            return TransitionOutcome(
                previous_state=state,
                new_state="innovation_hub_access",
                new_access_status="active",
                deactivates_at=None,
                grace_period_end=None,
                payment_required=False,
                badge_tier="Gold",
                qualification_passed=True,
                deliverables_triggered=["final_certification", "gold_badge", "analytics_report", "innovation_hub_access"],
                audit_event="EXAM_RESULT_RECEIVED",
                reason=f"National score {score}% >= 80% threshold. Final Certification, Gold Badge & Innovation Hub access unlocked."
            )

    # Fallback for unexpected tier
    return TransitionOutcome(
        previous_state=state,
        new_state=state,
        new_access_status="active",
        deactivates_at=None,
        grace_period_end=None,
        payment_required=False,
        badge_tier=None,
        qualification_passed=False,
        deliverables_triggered=[],
        audit_event="EXAM_RESULT_RECEIVED",
        reason=f"Unknown tier '{current_tier}', no transition performed."
    )


def apply_exam_result_transition(
    db: Any,
    registration: Any,
    exam_result: Any,
    now: Optional[datetime.datetime] = None
) -> TransitionOutcome:
    """
    Applies the computed TransitionOutcome to a StudentRegistration SQLAlchemy model instance
    and records an AccessAuditLog entry in the database.
    """
    if now is None:
        now = datetime.datetime.now(datetime.timezone.utc)

    curr_attempts = getattr(registration, "attempt_count", 0) or 0
    outcome = evaluate_exam_result_transition(
        current_tier=registration.current_tier,
        current_state=getattr(registration, "access_state", "active") or "active",
        score=exam_result.score,
        now=now,
        attempt_count=curr_attempts
    )

    # Record scores against the registration
    tier = (registration.current_tier or "District").strip().capitalize()
    if tier == "District":
        registration.district_score = exam_result.score
    elif tier == "State":
        registration.state_score = exam_result.score
    elif tier == "National":
        registration.national_score = exam_result.score
        if outcome.qualification_passed:
            registration.innovation_hub_eligible = True

    # Update registration FSM fields
    previous_state = getattr(registration, "access_state", "active") or "active"
    registration.access_state = outcome.new_state
    registration.access_status = outcome.new_access_status
    registration.status_started_at = now
    registration.deactivates_at = outcome.deactivates_at
    registration.grace_period_end = outcome.grace_period_end
    registration.payment_required = outcome.payment_required
    if outcome.badge_tier:
        registration.badge_tier = outcome.badge_tier

    if outcome.increment_attempt:
        registration.attempt_count = curr_attempts + 1
    if outcome.cooldown_end:
        registration.cooldown_until = outcome.cooldown_end
    if outcome.lockout_triggered:
        registration.is_locked = True


    # Create Audit Log entry
    from models import AccessAuditLog
    audit_entry = AccessAuditLog(
        registration_id=registration.id,
        user_id=registration.user_id,
        previous_state=previous_state,
        new_state=outcome.new_state,
        trigger_event=outcome.audit_event,
        reason=outcome.reason
    )
    db.add(audit_entry)

    # Phase 5: Trigger instant certificate & tiered badge issuance
    try:
        from services.certificate_service import issue_level_certificate_and_badge
        issue_level_certificate_and_badge(
            db=db,
            user_id=registration.user_id,
            tier=tier,
            score=exam_result.score,
            is_qualifying=outcome.qualification_passed
        )
    except Exception as cert_err:
        import logging
        logging.getLogger(__name__).warning(f"Certificate issuance warning: {cert_err}")

    return outcome
