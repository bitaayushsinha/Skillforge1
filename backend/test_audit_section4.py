import requests
import datetime
import uuid
import sys
import json

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== AUDITING SECTION 4: ASSESSMENTS & EXAM ENGINE ===")
    
    # 0. Setup: Admin Token & Student Setup
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    admin_token = admin_login.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # We will use SQLAlchemy to provision the data safely
    sys.path.append('.')
    from database import SessionLocal
    import models
    
    db = SessionLocal()
    
    # Find or create a subject
    subject = db.query(models.Subject).first()
    if not subject:
        subject = models.Subject(name="Section 4 Audit Subject", code="AUDIT-4", category="Test")
        db.add(subject)
        db.commit()
        db.refresh(subject)
        
    # Find an institution
    inst = db.query(models.Institution).first()
    inst_id = inst.id if inst else 1
    
    student_email = f"audit_sec4_{uuid.uuid4().hex[:8]}@skillforge.com"
    student_pwd = "password123"
    
    # Create test student via API
    res_student = requests.post(f"{BASE_URL}/api/admin/students", json={
        "name": "Audit Sec4 Student",
        "email": student_email,
        "password": student_pwd,
        "institution_id": inst_id,
        "specialization": "Artificial Intelligence & Autonomous Systems"
    }, headers=admin_headers)
    student_id = res_student.json()["id"]
    
    # Login as student
    student_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": student_pwd})
    student_token = student_login.json().get("access_token")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # Assign Subject
    requests.post(f"{BASE_URL}/api/admin/students/bulk-subject-assignment", json={
        "student_ids": [student_id],
        "subject_id": subject.id
    }, headers=admin_headers)
    
    # Setup Exam Window
    window = db.query(models.ExamWindow).filter(models.ExamWindow.subject_id == subject.id).first()
    if not window:
        window = models.ExamWindow(
            subject_id=subject.id,
            start_date=datetime.datetime.utcnow() - datetime.timedelta(days=1),
            end_date=datetime.datetime.utcnow() + datetime.timedelta(days=1),
            daily_start_time="00:00",
            daily_end_time="23:59"
        )
        db.add(window)
        db.commit()
        
    # Book a Slot
    print("\n1. Exam Link Generation")
    book_res = requests.post(f"{BASE_URL}/api/learning/subjects/{subject.id}/slots/book", json={
        "subject_id": subject.id,
        "slot_date": datetime.datetime.utcnow().isoformat()[:10],
        "slot_time": "12:00 - 13:00"
    }, headers=student_headers)
    print(f"Booking status: {book_res.status_code}")
    
    booking_data = book_res.json()
    if "assessment_link" in booking_data and booking_data["assessment_link"]:
        print("Success: Generated assessment link.")
        session_ref = booking_data.get("exam_engine_session_ref")
        booking_ref = booking_data.get("booking_reference")
    else:
        print("Failed to generate assessment link.")
        session_ref = "sess_dummy"
        booking_ref = "BKG-DUMMY"
        
    print("\n2. Exam Webhook Integration (Receive Result & Auto-certify)")
    # We will simulate the webhook payload from the Exam Engine
    # The webhook signature is required by `verify_exam_engine_webhook`
    
    # The actual ResultPayload is:
    webhook_payload = {
        "booking_reference": booking_ref,
        "exam_engine_session_ref": session_ref,
        "student_id": student_id,
        "subject_id": subject.id,
        "score": 85.5,
        "pass_fail": "PASS",
        "level": "State",
        "topic_breakdown": {"math": 90, "science": 80},
        "correct_vs_selected": {"q1": "A"},
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }
    
    # Send secret directly via X-Webhook-Secret header
    # Let's get the secret from env or use the default from backend
    import os
    from dotenv import load_dotenv
    load_dotenv()
    secret = os.getenv("EXAM_ENGINE_WEBHOOK_SECRET", "super_secret_exam_key_123!")
    
    webhook_headers = {
        "Content-Type": "application/json",
        "X-Webhook-Secret": secret
    }
    
    wh_res = requests.post(f"{BASE_URL}/api/webhooks/exam-engine/result", json=webhook_payload, headers=webhook_headers)
    print(f"Webhook processing status: {wh_res.status_code}")
    if wh_res.status_code == 200:
        print("Webhook processed successfully.")
    else:
        print(f"Webhook failed: {wh_res.text}")
        
    print("\n3. Cert Generation Post-Exam")
    # Verify if cert was generated
    cert_res = requests.get(f"{BASE_URL}/api/certificates/{student_id}", headers=student_headers)
    certs = cert_res.json() if cert_res.status_code == 200 else []
    print(f"Certificates found: {len(certs)}")
    if len(certs) > 0:
        print("Success: Certificate automatically generated upon exam completion.")
    else:
        print("Failure: No certificate generated after passing exam.")
        
    db.close()

if __name__ == "__main__":
    run_tests()
