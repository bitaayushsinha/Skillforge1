import re
import random
from datetime import datetime
from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging

import models
from utils.qr_generator import generate_qr_code
import os

logger = logging.getLogger(__name__)

def ensure_qr_code_exists(db: Session, cert: models.Certificate, frontend_url: str = "http://localhost:3000", backend_url: str = "http://localhost:8000") -> models.Certificate:
    if not cert:
        return cert
    filepath = os.path.join("uploads", "qrcodes", f"{cert.certificate_id}.png")
    if not cert.qr_code_path or not os.path.exists(filepath):
        qr_url = generate_qr_code(cert.certificate_id, frontend_url=frontend_url, backend_url=backend_url)
        cert.qr_code_path = qr_url
        if not cert.certificate_url:
            cert.certificate_url = f"{frontend_url.rstrip('/')}/verify/{cert.certificate_id}"
        db.commit()
        db.refresh(cert)
    return cert

def extract_course_prefix(course_name: str) -> str:
    if not course_name:
        return "CERT"
    # Take first word and remove non-alphanumeric characters
    words = course_name.strip().split()
    if not words:
        return "CERT"
    first_word = re.sub(r'[^A-Za-z0-9]', '', words[0]).upper()
    if len(first_word) >= 2:
        return first_word[:6]
    # If first word is too short, try to combine first letters or take whole cleaned string
    cleaned_all = re.sub(r'[^A-Za-z0-9]', '', course_name).upper()
    return cleaned_all[:4] if cleaned_all else "CERT"

def generate_certificate_service(
    db: Session,
    user_id: Any,
    course_id: Any,
    course_name: Optional[str] = None,
    completion_percentage: int = 100,
    assessment_status: str = "passed",
    frontend_url: str = "http://localhost:3000",
    backend_url: str = "http://localhost:8000"
) -> models.Certificate:
    # 1. Enforce validation rule: completion = 100% and assessment = 'passed'
    if completion_percentage != 100 or str(assessment_status).lower() != "passed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate can only be generated if course completion is 100% and assessment status is passed."
        )
    
    str_user_id = str(user_id)
    str_course_id = str(course_id)
    
    # 2. Prevent duplicates: Check if certificate already exists for this course and user
    existing = db.query(models.Certificate).filter(
        models.Certificate.user_id.in_([str_user_id, int(str_user_id) if str_user_id.isdigit() else str_user_id]),
        models.Certificate.course_id.in_([str_course_id, int(str_course_id) if str_course_id.isdigit() else str_course_id])
    ).first()
    
    if existing:
        logger.info(f"Returning existing certificate {existing.certificate_id} for user {user_id} and course {course_id}")
        return ensure_qr_code_exists(db, existing, frontend_url=frontend_url, backend_url=backend_url)
        
    # Get course name if not provided
    if not course_name:
        course_obj = db.query(models.Course).filter(
            models.Course.id.in_([str_course_id, int(str_course_id) if str_course_id.isdigit() else str_course_id])
        ).first()
        course_name = course_obj.title if course_obj else "SkillForge Course"
        
    # 3. Generate unique certificate ID format: SF-{PREFIX}-{YEAR}-{RANDOM}
    prefix = extract_course_prefix(course_name)
    year = datetime.now().year
    
    while True:
        rand_num = f"{random.randint(1, 9999):04d}"
        cert_id = f"SF-{prefix}-{year}-{rand_num}"
        # Check uniqueness in DB
        duplicate_id = db.query(models.Certificate).filter(models.Certificate.certificate_id == cert_id).first()
        if not duplicate_id:
            break
            
    # 4. Generate QR Code image url pointing to frontend verify page
    qr_code_url = generate_qr_code(cert_id, frontend_url=frontend_url, backend_url=backend_url)
    verify_url = f"{frontend_url.rstrip('/')}/verify/{cert_id}"
    
    today_str = f"{datetime.now().day:02d} / {datetime.now().month:02d} / {datetime.now().year}"
    
    new_cert = models.Certificate(
        user_id=str_user_id,
        course_id=str_course_id,
        course_name=course_name,
        certificate_id=cert_id,
        cert_id=cert_id,
        issue_date=today_str,
        qr_code_path=qr_code_url,
        certificate_status="valid",
        certificate_url=verify_url
    )
    
    db.add(new_cert)
    db.commit()
    db.refresh(new_cert)
    logger.info(f"Generated new certificate: {cert_id}")
    return new_cert

def get_user_certificates_service(db: Session, user_id: Any) -> List[models.Certificate]:
    str_user_id = str(user_id)
    certs = db.query(models.Certificate).filter(
        models.Certificate.user_id.in_([str_user_id, int(str_user_id) if str_user_id.isdigit() else str_user_id])
    ).order_by(models.Certificate.created_at.desc()).all()
    return [ensure_qr_code_exists(db, c) for c in certs]

def verify_certificate_service(db: Session, certificate_id: str) -> Optional[models.Certificate]:
    cert = db.query(models.Certificate).filter(
        models.Certificate.certificate_id == certificate_id
    ).first()
    return ensure_qr_code_exists(db, cert) if cert else None

def issue_level_certificate_and_badge(
    db: Session,
    user_id: Any,
    tier: str,
    score: float,
    is_qualifying: bool,
    frontend_url: str = "http://localhost:3000",
    backend_url: str = "http://localhost:8000"
) -> Dict[str, Any]:
    """
    Auto-generates instant certificate and tiered badge (Bronze/Silver/Gold) on exam completion.
    Configurable template engine supporting 'pending IBM confirmation' participation templates.
    """
    tier_normalized = (tier or "District").strip().capitalize()

    if is_qualifying:
        if tier_normalized == "District":
            cert_title = "SkillForge District Qualification Certificate"
            badge_tier = "Bronze"
        elif tier_normalized == "State":
            cert_title = "SkillForge State Merit Certificate"
            badge_tier = "Silver"
        elif tier_normalized == "National":
            cert_title = "SkillForge National Excellence Certification"
            badge_tier = "Gold"
        else:
            cert_title = f"SkillForge {tier_normalized} Certificate"
            badge_tier = "Bronze"
        status_label = "valid"
    else:
        cert_title = f"SkillForge {tier_normalized} Participation Certificate (Pending IBM Approval)"
        badge_tier = None
        status_label = "pending_ibm_confirmation"

    str_user_id = str(user_id)
    # Use tier as synthetic course_id so wallet displays unique level certs
    synthetic_course_id = f"tier_{tier_normalized.lower()}_{'pass' if is_qualifying else 'part'}"

    existing = db.query(models.Certificate).filter(
        models.Certificate.user_id == str_user_id,
        models.Certificate.course_id == synthetic_course_id
    ).first()

    if existing:
        return {
            "certificate": ensure_qr_code_exists(db, existing, frontend_url, backend_url),
            "badge_tier": badge_tier,
            "issued_now": False
        }

    prefix = extract_course_prefix(tier_normalized)
    year = datetime.now().year

    while True:
        rand_num = f"{random.randint(1, 9999):04d}"
        cert_id = f"SF-{prefix}-{year}-{rand_num}"
        if not db.query(models.Certificate).filter(models.Certificate.certificate_id == cert_id).first():
            break

    qr_code_url = generate_qr_code(cert_id, frontend_url=frontend_url, backend_url=backend_url)
    verify_url = f"{frontend_url.rstrip('/')}/verify/{cert_id}"
    today_str = f"{datetime.now().day:02d} / {datetime.now().month:02d} / {datetime.now().year}"

    new_cert = models.Certificate(
        user_id=str_user_id,
        course_id=synthetic_course_id,
        course_name=cert_title,
        certificate_id=cert_id,
        cert_id=cert_id,
        issue_date=today_str,
        qr_code_path=qr_code_url,
        certificate_status=status_label,
        certificate_url=verify_url
    )

    db.add(new_cert)
    db.commit()
    db.refresh(new_cert)

    logger.info(f"Auto-issued {cert_title} ({cert_id}) for user {user_id} (badge={badge_tier})")
    return {
        "certificate": new_cert,
        "badge_tier": badge_tier,
        "issued_now": True
    }

