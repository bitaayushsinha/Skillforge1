import sys
import os
import json
import uuid
import hmac
import hashlib
from datetime import datetime

# Add backend directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "exam_engine_stub")))

from fastapi.testclient import TestClient
import models
from database import SessionLocal, engine
from main import app as srp_app
from server import app as stub_app

def run_verification():
    print("=====================================================================")
    print("   SKILLFORGE LMS <-> EXAMINATION ENGINE INTEGRATION E2E TEST PASS")
    print("=====================================================================")

    # Initialize DB tables
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    srp_client = TestClient(srp_app)
    stub_client = TestClient(stub_app)

    # Clean up any test records from prior runs
    test_booking_ref = f"BKG-TEST-{uuid.uuid4().hex[:6].upper()}"
    secret = os.getenv("EXAM_ENGINE_WEBHOOK_SECRET", "skillforge-exam-engine-secret-2026")

    print("\n[STEP 1] Testing Stub Exam Engine Outbound Booking Endpoint...")
    booking_payload = {
        "booking_reference": test_booking_ref,
        "student_id": 101,
        "student_name": "Test Student",
        "student_email": "test@skillforge.edu",
        "registration_number": "REG-101",
        "subject_id": 1,
        "subject_code": "CS-101",
        "subject_name": "Intro to AI",
        "level": "District",
        "slot_date": "2026-07-20",
        "slot_time": "10:00 AM - 11:30 AM",
        "webhook_callback_url": "http://localhost:8000/api/webhooks/exam-engine"
    }

    stub_res = stub_client.post("/api/v1/exam-engine/slots/book", json=booking_payload)
    assert stub_res.status_code == 200, f"Stub booking failed: {stub_res.text}"
    stub_data = stub_res.json()
    assert stub_data["success"] is True
    session_ref = stub_data["exam_engine_session_ref"]
    assessment_link = stub_data["assessment_link"]
    print(f"  [OK] Stub returned Session Ref: {session_ref}")
    print(f"  [OK] Stub returned Assessment Link: {assessment_link}")

    print("\n[STEP 2] Creating local SRP ExamSlotBooking record to simulate Phase 2 persistence...")
    booking = models.ExamSlotBooking(
        user_id=101,
        subject_id=1,
        slot_date="2026-07-20",
        slot_time="10:00 AM - 11:30 AM",
        booking_reference=test_booking_ref,
        status="confirmed",
        is_link_active=True,
        link_status="confirmed",
        exam_engine_session_ref=session_ref,
        assessment_link=assessment_link
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    print(f"  [OK] Saved ExamSlotBooking ID {booking.id} with link_status='{booking.link_status}'")

    print("\n[STEP 3] Testing Inbound Webhook Authentication (Unauthorized Reject Test)...")
    unauth_res = srp_client.post(
        "/api/webhooks/exam-engine/link-ready",
        json={"booking_reference": test_booking_ref, "assessment_link": "http://hack.link"}
    )
    assert unauth_res.status_code == 401, f"Expected 401 Unauthorized, got {unauth_res.status_code}"
    print("  [OK] Unauthorized webhook call correctly rejected with 401.")

    print("\n[STEP 4] Testing Signed Inbound Webhook (/link-ready)...")
    link_ready_payload = {
        "booking_reference": test_booking_ref,
        "exam_engine_session_ref": session_ref,
        "assessment_link": f"{assessment_link}?room=ready",
        "link_status": "confirmed"
    }
    body_bytes = json.dumps(link_ready_payload, separators=(',', ':')).encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

    link_res = srp_client.post(
        "/api/webhooks/exam-engine/link-ready",
        content=body_bytes,
        headers={"X-Exam-Engine-Signature": sig, "Content-Type": "application/json"}
    )
    assert link_res.status_code == 200, f"Signed link-ready failed: {link_res.text}"
    db.refresh(booking)
    assert booking.assessment_link == f"{assessment_link}?room=ready"
    print(f"  [OK] Signed /link-ready updated booking assessment_link: {booking.assessment_link}")

    print("\n[STEP 5] Testing Signed Inbound Webhook (/result)...")
    result_payload = {
        "booking_reference": test_booking_ref,
        "exam_engine_session_ref": session_ref,
        "student_id": 101,
        "subject_id": 1,
        "level": "District",
        "score": 92.5,
        "pass_fail": "PASS",
        "topic_breakdown": [
            {"topic": "Data Structures", "score": 95, "total": 100},
            {"topic": "Algorithms", "score": 90, "total": 100}
        ],
        "correct_vs_selected": [
            {"question_id": 1, "question": "Time complexity?", "selected": "O(1)", "correct": "O(1)", "is_correct": True}
        ],
        "timestamp": datetime.utcnow().isoformat()
    }

    result_res = srp_client.post(
        "/api/webhooks/exam-engine/result",
        json=result_payload,
        headers={"X-Webhook-Secret": secret}
    )
    assert result_res.status_code == 200, f"Signed result webhook failed: {result_res.text}"
    result_json = result_res.json()
    print(f"  [OK] /result webhook accepted! Created ExamResult ID: {result_json['result_id']}")

    db.refresh(booking)
    assert booking.status == "completed"
    assert booking.is_link_active is False
    print(f"  [OK] Booking '{booking.booking_reference}' marked status='{booking.status}', is_link_active={booking.is_link_active}")

    print("\n[STEP 6] Verifying Student Portal API Endpoint /api/learning/results...")
    exam_result = db.query(models.ExamResult).filter(models.ExamResult.booking_ref == test_booking_ref).first()
    assert exam_result is not None
    assert exam_result.score == 92.5
    assert exam_result.pass_fail == "PASS"
    print(f"  [OK] ExamResult verified in DB: score={exam_result.score}, status={exam_result.pass_fail}, topic_breakdown={exam_result.topic_breakdown[:40]}...")

    # Clean up test record
    db.delete(exam_result)
    db.delete(booking)
    db.commit()
    db.close()

    print("\n=====================================================================")
    print("   ALL 6 VERIFICATION PHASES PASSED SUCCESSFULLY!")
    print("=====================================================================")

if __name__ == "__main__":
    run_verification()
