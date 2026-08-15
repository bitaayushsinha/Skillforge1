import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from services.payment_service import create_order_for_tier, process_successful_payment, TIER_PRICING

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_state_order_creation_and_pricing(db_session):
    user = models.User(id=1, email="learner1@test.com", name="Learner1", hashed_password="pwd")
    inst = models.Institution(id=1, name="Inst1")
    spec = models.Specialization(id=1, name="Spec1")
    db_session.add_all([user, inst, spec])
    db_session.commit()

    reg = models.StudentRegistration(
        id=10,
        user_id=1,
        institution_id=1,
        specialization_id=1,
        current_tier="District",
        district_score=55.0,
        access_state="pending_payment"
    )
    db_session.add(reg)
    db_session.commit()

    order = create_order_for_tier(db_session, user_id=1, registration_id=10, target_tier="State")
    assert order.amount == 1500.0
    assert order.gst_amount == 270.0
    assert order.total_amount == 1770.0
    assert order.status == "created"

def test_state_order_creation_rejects_unqualified(db_session):
    user = models.User(id=2, email="learner2@test.com", name="Learner2", hashed_password="pwd")
    reg = models.StudentRegistration(
        id=11,
        user_id=2,
        institution_id=1,
        specialization_id=1,
        current_tier="District",
        district_score=45.0
    )
    db_session.add_all([user, reg])
    db_session.commit()

    with pytest.raises(ValueError, match="score >= 50%"):
        create_order_for_tier(db_session, user_id=2, registration_id=11, target_tier="State")

def test_process_successful_payment_unlocks_state(db_session):
    now = datetime.datetime(2026, 7, 9, 12, 0, 0, tzinfo=datetime.timezone.utc)
    user = models.User(id=3, email="learner3@test.com", name="Learner3", hashed_password="pwd")
    reg = models.StudentRegistration(
        id=12,
        user_id=3,
        institution_id=1,
        specialization_id=1,
        current_tier="District",
        district_score=60.0,
        access_state="pending_payment",
        payment_required=True
    )
    db_session.add_all([user, reg])
    db_session.commit()

    order = create_order_for_tier(db_session, user_id=3, registration_id=12, target_tier="State")

    res = process_successful_payment(
        db_session,
        registration_id=12,
        target_tier="State",
        gateway_order_id=order.gateway_order_id,
        gateway_payment_id="pay_123456",
        now=now
    )

    assert res["status"] == "success"
    assert res["new_tier"] == "State"
    assert reg.access_state == "active"
    assert reg.payment_required is False
    assert reg.total_paid_amount == 1770.0

    logs = db_session.query(models.AccessAuditLog).all()
    assert len(logs) == 1
    assert logs[0].trigger_event == "PAYMENT_SUCCEEDED"
