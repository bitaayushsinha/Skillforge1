import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from services.access_rule_engine import apply_exam_result_transition
from services.payment_service import create_order_for_tier, process_successful_payment
from services.access_scheduler import sweep_expired_access_windows

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

class MockExamResult:
    def __init__(self, score: float):
        self.score = score

def test_journey_a_full_progression_to_innovation_hub(db):
    """
    Journey A (Qualifying & Advancing):
    District -> State -> National -> Innovation Hub permanent access.
    """
    # Setup Student
    user = models.User(id=10, email="journey_a@skillforge.io", name="Asha Learner", hashed_password="pwd")
    inst = models.Institution(id=10, name="IIT Delhi")
    spec = models.Specialization(id=10, name="AI Engineering")
    reg = models.StudentRegistration(
        id=100,
        user_id=10,
        institution_id=10,
        specialization_id=10,
        current_tier="District",
        access_state="active",
        access_status="active"
    )
    db.add_all([user, inst, spec, reg])
    db.commit()

    # --- Step 1: District Exam Pass (Score = 52.0% >= 50%) ---
    result_dist = MockExamResult(score=52.0)
    outcome_dist = apply_exam_result_transition(db, reg, result_dist)
    assert outcome_dist.qualification_passed is True
    assert reg.access_state == "pending_payment"
    assert reg.payment_required is True
    assert reg.badge_tier == "Bronze"
    assert reg.district_score == 52.0

    # Verify Bronze badge and District certificate issued
    certs_dist = db.query(models.Certificate).filter(models.Certificate.user_id == "10").all()
    assert len(certs_dist) == 1
    assert "District Qualification Certificate" in certs_dist[0].course_name

    # --- Step 2: Student Pays ₹1,770 (₹1,500 + GST) to unlock State ---
    order_state = create_order_for_tier(db, user_id=10, registration_id=100, target_tier="State")
    assert order_state.total_amount == 1770.0

    pay_res_state = process_successful_payment(
        db, registration_id=100, target_tier="State", gateway_order_id=order_state.gateway_order_id
    )
    assert pay_res_state["status"] == "success"
    assert reg.current_tier == "State"
    assert reg.access_state == "active"
    assert reg.payment_required is False

    # --- Step 3: State Exam Pass (Score = 68.0% >= 60%) ---
    result_state = MockExamResult(score=68.0)
    outcome_state = apply_exam_result_transition(db, reg, result_state)
    assert outcome_state.qualification_passed is True
    assert reg.access_state == "pending_payment"
    assert reg.badge_tier == "Silver"
    assert reg.state_score == 68.0

    # Verify Silver badge and State certificate issued
    certs_state = db.query(models.Certificate).filter(models.Certificate.user_id == "10").all()
    assert len(certs_state) == 2

    # --- Step 4: Student Pays ₹2,360 (₹2,000 + GST) to unlock National ---
    order_nat = create_order_for_tier(db, user_id=10, registration_id=100, target_tier="National")
    assert order_nat.total_amount == 2360.0

    pay_res_nat = process_successful_payment(
        db, registration_id=100, target_tier="National", gateway_order_id=order_nat.gateway_order_id
    )
    assert reg.current_tier == "National"
    assert reg.access_state == "active"

    # --- Step 5: National Exam Pass (Score = 85.0% >= 80%) ---
    result_nat = MockExamResult(score=85.0)
    outcome_nat = apply_exam_result_transition(db, reg, result_nat)
    assert outcome_nat.qualification_passed is True
    assert reg.access_state == "innovation_hub_access"
    assert reg.badge_tier == "Gold"
    assert reg.innovation_hub_eligible is True
    assert reg.deactivates_at is None
    assert reg.grace_period_end is None

    # Verify complete audit log history
    audits = db.query(models.AccessAuditLog).filter(models.AccessAuditLog.registration_id == 100).all()
    assert len(audits) >= 5

def test_journey_b_window_and_grace_period_expirations(db):
    """
    Journey B (Window & Grace Period Expiration):
    1. Student scores < pass mark -> enters 7-day post-exam review window -> auto-deactivates after expiry.
    2. Student scores >= pass mark -> enters 7-day payment grace period -> auto-deactivates if unpaid after expiry.
    """
    now = datetime.datetime(2026, 7, 9, 12, 0, 0)

    # --- Scenario B1: Non-Qualifying Post-Exam Window Expiry ---
    user1 = models.User(id=20, email="journey_b1@skillforge.io", name="Rahul Learner", hashed_password="pwd")
    reg1 = models.StudentRegistration(
        id=200, user_id=20, institution_id=1, specialization_id=1,
        current_tier="District", access_state="active"
    )
    db.add_all([user1, reg1])
    db.commit()

    # Scores 42.0% (< 50%)
    outcome_b1 = apply_exam_result_transition(db, reg1, MockExamResult(score=42.0), now=now)
    assert outcome_b1.qualification_passed is False
    assert reg1.access_state == "post_exam_access"
    assert reg1.deactivates_at == now + datetime.timedelta(days=7)

    # Simulate 8 days later: sweeper runs
    future_8_days = now + datetime.timedelta(days=8)
    sweep_summary_1 = sweep_expired_access_windows(db, now=future_8_days)
    assert sweep_summary_1["deactivated_window_count"] == 1
    assert reg1.access_state == "deactivated"
    assert reg1.access_status == "deactivated"

    # --- Scenario B2: Qualifying Unpaid Grace Period Expiry ---
    user2 = models.User(id=21, email="journey_b2@skillforge.io", name="Priya Learner", hashed_password="pwd")
    reg2 = models.StudentRegistration(
        id=201, user_id=21, institution_id=1, specialization_id=1,
        current_tier="District", access_state="active"
    )
    db.add_all([user2, reg2])
    db.commit()

    # Scores 55.0% (>= 50%) -> enters pending_payment with 7-day grace period
    outcome_b2 = apply_exam_result_transition(db, reg2, MockExamResult(score=55.0), now=now)
    assert outcome_b2.qualification_passed is True
    assert reg2.access_state == "pending_payment"
    assert reg2.grace_period_end == now + datetime.timedelta(days=7)

    # Simulate 8 days later without payment: sweeper runs
    sweep_summary_2 = sweep_expired_access_windows(db, now=future_8_days)
    assert sweep_summary_2["deactivated_grace_count"] == 1
    assert reg2.access_state == "deactivated"
    assert reg2.access_status == "deactivated"
