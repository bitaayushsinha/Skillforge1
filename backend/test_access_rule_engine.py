import datetime
import pytest
from services.access_rule_engine import evaluate_exam_result_transition, POST_RESULT_ACCESS_DAYS, PAYMENT_GRACE_PERIOD_DAYS

def test_district_below_50_percent():
    """District < 50% -> PostExamAccess (7-10 days access), no badge, payment_required=False"""
    now = datetime.datetime(2026, 7, 9, 12, 0, 0, tzinfo=datetime.timezone.utc)
    outcome = evaluate_exam_result_transition(current_tier="District", current_state="active", score=49.9, now=now)
    assert outcome.new_state == "post_exam_access"
    assert outcome.qualification_passed is False
    assert outcome.payment_required is False
    assert outcome.badge_tier is None
    assert outcome.deactivates_at == now + datetime.timedelta(days=POST_RESULT_ACCESS_DAYS)
    assert outcome.grace_period_end is None
    assert "analytics_report" in outcome.deliverables_triggered
    assert "participation_cert" in outcome.deliverables_triggered

def test_district_boundary_exactly_50_percent():
    """District exactly 50% -> PendingPayment, Bronze badge, payment_required=True"""
    now = datetime.datetime(2026, 7, 9, 12, 0, 0, tzinfo=datetime.timezone.utc)
    outcome = evaluate_exam_result_transition(current_tier="District", current_state="active", score=50.0, now=now)
    assert outcome.new_state == "pending_payment"
    assert outcome.qualification_passed is True
    assert outcome.payment_required is True
    assert outcome.badge_tier == "Bronze"
    assert outcome.deactivates_at is None
    assert outcome.grace_period_end == now + datetime.timedelta(days=PAYMENT_GRACE_PERIOD_DAYS)
    assert "qualification_notice" in outcome.deliverables_triggered
    assert "bronze_badge" in outcome.deliverables_triggered

def test_state_below_60_percent():
    """State < 60% (e.g. 59.9%) -> PostExamAccess, no badge, payment_required=False"""
    now = datetime.datetime(2026, 7, 9, 12, 0, 0, tzinfo=datetime.timezone.utc)
    outcome = evaluate_exam_result_transition(current_tier="State", current_state="active", score=59.9, now=now)
    assert outcome.new_state == "post_exam_access"
    assert outcome.qualification_passed is False
    assert outcome.payment_required is False
    assert outcome.badge_tier is None
    assert outcome.deactivates_at == now + datetime.timedelta(days=POST_RESULT_ACCESS_DAYS)

def test_state_boundary_exactly_60_percent():
    """State exactly 60% -> PendingPayment, Silver badge, payment_required=True"""
    now = datetime.datetime(2026, 7, 9, 12, 0, 0, tzinfo=datetime.timezone.utc)
    outcome = evaluate_exam_result_transition(current_tier="State", current_state="active", score=60.0, now=now)
    assert outcome.new_state == "pending_payment"
    assert outcome.qualification_passed is True
    assert outcome.payment_required is True
    assert outcome.badge_tier == "Silver"
    assert outcome.grace_period_end == now + datetime.timedelta(days=PAYMENT_GRACE_PERIOD_DAYS)
    assert "silver_badge" in outcome.deliverables_triggered

def test_national_below_80_percent():
    """National < 80% (e.g. 79.9%) -> PostExamAccess, no badge, payment_required=False"""
    now = datetime.datetime(2026, 7, 9, 12, 0, 0, tzinfo=datetime.timezone.utc)
    outcome = evaluate_exam_result_transition(current_tier="National", current_state="active", score=79.9, now=now)
    assert outcome.new_state == "post_exam_access"
    assert outcome.qualification_passed is False
    assert outcome.payment_required is False
    assert outcome.badge_tier is None
    assert outcome.deactivates_at == now + datetime.timedelta(days=POST_RESULT_ACCESS_DAYS)

def test_national_boundary_exactly_80_percent():
    """National exactly 80% -> InnovationHubAccess, Gold badge, indefinite access"""
    now = datetime.datetime(2026, 7, 9, 12, 0, 0, tzinfo=datetime.timezone.utc)
    outcome = evaluate_exam_result_transition(current_tier="National", current_state="active", score=80.0, now=now)
    assert outcome.new_state == "innovation_hub_access"
    assert outcome.qualification_passed is True
    assert outcome.payment_required is False
    assert outcome.badge_tier == "Gold"
    assert outcome.deactivates_at is None
    assert outcome.grace_period_end is None
    assert "innovation_hub_access" in outcome.deliverables_triggered
