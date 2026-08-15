import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from services.certificate_service import issue_level_certificate_and_badge

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_qualifying_district_certificate_and_bronze_badge(db_session):
    res = issue_level_certificate_and_badge(
        db=db_session,
        user_id=1,
        tier="District",
        score=52.0,
        is_qualifying=True
    )

    assert res["issued_now"] is True
    assert res["badge_tier"] == "Bronze"
    assert res["certificate"].course_name == "SkillForge District Qualification Certificate"
    assert res["certificate"].certificate_status == "valid"

def test_non_qualifying_participation_certificate(db_session):
    res = issue_level_certificate_and_badge(
        db=db_session,
        user_id=2,
        tier="District",
        score=44.0,
        is_qualifying=False
    )

    assert res["issued_now"] is True
    assert res["badge_tier"] is None
    assert "Pending IBM Approval" in res["certificate"].course_name
    assert res["certificate"].certificate_status == "pending_ibm_confirmation"

def test_idempotent_certificate_issuance(db_session):
    res1 = issue_level_certificate_and_badge(
        db=db_session,
        user_id=3,
        tier="State",
        score=65.0,
        is_qualifying=True
    )
    res2 = issue_level_certificate_and_badge(
        db=db_session,
        user_id=3,
        tier="State",
        score=65.0,
        is_qualifying=True
    )

    assert res1["issued_now"] is True
    assert res2["issued_now"] is False
    assert res1["certificate"].certificate_id == res2["certificate"].certificate_id

    certs = db_session.query(models.Certificate).filter(models.Certificate.user_id == "3").all()
    assert len(certs) == 1
