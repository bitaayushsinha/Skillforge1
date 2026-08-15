import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from services.access_scheduler import sweep_expired_access_windows, get_access_window_config, set_access_window_config

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_config_durations(db_session):
    config = get_access_window_config(db_session)
    assert config["POST_RESULT_ACCESS_DAYS"] == 7
    assert config["PAYMENT_GRACE_PERIOD_DAYS"] == 7

    updated = set_access_window_config(db_session, post_result_days=10, grace_period_days=5)
    assert updated["POST_RESULT_ACCESS_DAYS"] == 10
    assert updated["PAYMENT_GRACE_PERIOD_DAYS"] == 5

def test_sweep_expired_post_exam_access(db_session):
    now = datetime.datetime(2026, 7, 9, 12, 0, 0, tzinfo=datetime.timezone.utc)
    user = models.User(id=1, email="learner@test.com", name="Learner", hashed_password="pwd")
    inst = models.Institution(id=1, name="Inst")
    spec = models.Specialization(id=1, name="Spec")
    db_session.add_all([user, inst, spec])
    db_session.commit()

    reg = models.StudentRegistration(
        id=100,
        user_id=1,
        institution_id=1,
        specialization_id=1,
        access_state="post_exam_access",
        access_status="active",
        deactivates_at=now - datetime.timedelta(hours=1)
    )
    db_session.add(reg)
    db_session.commit()

    result = sweep_expired_access_windows(db_session, now=now)
    assert result["deactivated_window_count"] == 1
    assert reg.access_state == "deactivated"
    assert reg.access_status == "deactivated"

    logs = db_session.query(models.AccessAuditLog).all()
    assert len(logs) == 1
    assert logs[0].trigger_event == "WINDOW_EXPIRED"

def test_sweep_expired_payment_grace_period(db_session):
    now = datetime.datetime(2026, 7, 9, 12, 0, 0, tzinfo=datetime.timezone.utc)
    user = models.User(id=2, email="qualified@test.com", name="Qualified", hashed_password="pwd")
    inst = models.Institution(id=2, name="Inst2")
    spec = models.Specialization(id=2, name="Spec2")
    db_session.add_all([user, inst, spec])
    db_session.commit()

    reg = models.StudentRegistration(
        id=101,
        user_id=2,
        institution_id=2,
        specialization_id=2,
        access_state="pending_payment",
        access_status="active",
        grace_period_end=now - datetime.timedelta(days=1)
    )
    db_session.add(reg)
    db_session.commit()

    result = sweep_expired_access_windows(db_session, now=now)
    assert result["deactivated_grace_count"] == 1
    assert reg.access_state == "deactivated"
    assert reg.access_status == "deactivated"

    logs = db_session.query(models.AccessAuditLog).all()
    assert len(logs) == 1
    assert logs[0].trigger_event == "GRACE_PERIOD_EXPIRED"
