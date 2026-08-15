import requests
import uuid
import time
from database import SessionLocal
from models import User, StudentRegistration, Subject, StudentSubjectAssignment, ExamWindow
import datetime

BASE_URL = "http://localhost:8000"

def e2e_test(outcome="pass", level="District"):
    print(f"\n--- Running E2E Test: {outcome.upper()} at {level} level ---")
    
    db = SessionLocal()
    
    # 1. Get a learner who is active
    user = db.query(User).filter(User.role == 'learner').first()
    student_email = user.email
    student_id = user.id
    print(f"Using Learner: {student_email}")
    
    # 2. Get the learner's active registration
    reg = db.query(StudentRegistration).filter(
        StudentRegistration.user_id == student_id, 
        StudentRegistration.access_status == 'active'
    ).first()
    if not reg:
        print("No active registration found for this learner. Trying to find any learner with an active registration...")
        reg = db.query(StudentRegistration).filter(StudentRegistration.access_status == 'active').first()
        if not reg:
            print("No active registration found in the entire DB.")
            return False
        user = db.query(User).filter(User.id == reg.user_id).first()
        student_email = user.email
        student_id = user.id
        print(f"Switched to Learner: {student_email}")
        
    spec_id = reg.specialization_id
    
    # 3. Get the subject for this level
    subject = db.query(Subject).filter(
        Subject.specialization_id == spec_id,
        Subject.semester_tier == level
    ).first()
    if not subject:
        print(f"No subject found for level {level} in spec {spec_id}")
        return False
        
    subject_id = subject.id
    print(f"Testing on Subject: {subject.name} (ID: {subject_id})")
    
    # 3.5 Ensure subject is explicitly assigned to student
    existing_assignment = db.query(StudentSubjectAssignment).filter(
        StudentSubjectAssignment.user_id == student_id,
        StudentSubjectAssignment.subject_id == subject_id
    ).first()
    if not existing_assignment:
        new_assignment = StudentSubjectAssignment(
            user_id=student_id,
            subject_id=subject_id,
            registration_id=reg.id
        )
        db.add(new_assignment)
        db.commit()
        print("Explicitly assigned subject to learner.")

    # 3.6 Ensure there is an ExamWindow for this subject so slots can be generated
    window = db.query(ExamWindow).filter(ExamWindow.subject_id == subject_id).first()
    if not window:
        window = ExamWindow(
            subject_id=subject_id,
            level=level,
            start_date=datetime.datetime.utcnow() - datetime.timedelta(days=1),
            end_date=datetime.datetime.utcnow() + datetime.timedelta(days=30),
            daily_start_time='09:00',
            daily_end_time='17:00',
            slot_duration_minutes=60
        )
        db.add(window)
        db.commit()
        print("Created ExamWindow for subject.")
        
    db.close()

    
    # 4. Login as student
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": "learner123"})
    if not res.ok:
        print(f"LOGIN ERROR: {res.json()}")
        return False
        
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # 5. Cancel any existing active bookings for this subject
    res = requests.get(f"{BASE_URL}/api/learning/slots", headers=student_headers)
    for booking in res.json():
        if booking["subject_id"] == subject_id and booking["status"] == "confirmed":
            requests.delete(f"{BASE_URL}/api/learning/slots/{booking['id']}", headers=student_headers)
            print(f"Cancelled existing booking {booking['id']}")
            
    # 6. Book new slot
    res = requests.get(f"{BASE_URL}/api/learning/subjects/{subject_id}/slots/available", headers=student_headers)
    if not res.ok:
        print(f"Failed to get slots: {res.status_code} {res.text}")
        return False
        
    slots = res.json()
    if not slots:
        print("No available slots!")
        return False
        
    slot_date = slots[0]["date"]
    slot_time = slots[0]["times"][0]
    
    res = requests.post(f"{BASE_URL}/api/learning/subjects/{subject_id}/slots/book", json={
        "subject_id": subject_id, "slot_date": slot_date, "slot_time": slot_time
    }, headers=student_headers)
    
    if not res.ok:
        print(f"Slot booking failed: {res.json()}")
        return False
        
    booking = res.json()
    print(f"Slot Booked: {booking['booking_reference']} | Link Active: {booking['is_link_active']}")
    
    assessment_link = booking.get("assessment_link")
    if not assessment_link:
        print("Link is pending, triggering webhook...")
        requests.post(f"{BASE_URL}/api/v1/exam-engine/admin/trigger-links")
        # Fetch the slot again to get the link
        res = requests.get(f"{BASE_URL}/api/learning/slots", headers=student_headers)
        for booking_obj in res.json():
            if booking_obj["id"] == booking["id"]:
                assessment_link = booking_obj.get("assessment_link")
                print(f"Updated Link Active Status: {booking_obj['is_link_active']}")
                break

    if not assessment_link:
        print("FAIL: No assessment link generated even after triggering webhook!")
        return False
        
    temp_user_id = assessment_link.split("/")[-1]
    print(f"Extracted Credential ID: {temp_user_id}")
    
    # 7. Complete real exam session
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/start")
    if not res.ok:
        print(f"Failed to start exam: {res.json()}")
        return False
        
    exam_data = res.json()
    questions = exam_data["questions"]
    print(f"Exam started. Got {len(questions)} questions.")
    
    # Answer questions
    answer_idx = 0 if outcome == "pass" else 1 
    for q in questions:
        requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/answers", json={
            "question_id": q["id"], "answer": answer_idx
        })
        
    # Submit exam
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/submit")
    result_data = res.json()
    print(f"Exam Submitted: Score {result_data['score_percentage']}% | Passed: {result_data['passed']}")
    
    # 8. Check SRP's access-rule engine reaction
    time.sleep(1) 
    res = requests.get(f"{BASE_URL}/api/learning/my-registration", headers=student_headers)
    reg = res.json()
    print(f"New Registration State: {reg['access_state']} | Current Tier: {reg['current_tier']} | Payment Required: {reg['payment_required']}")
    
    # 9. Check if certificate generated (if passed and appropriate level)
    res = requests.get(f"{BASE_URL}/api/learning/results", headers=student_headers)
    results = res.json()
    print(f"SRP Exam Results: {len(results)} found")
    
    if results:
        print(f"Latest SRP Result: {results[0]['score']} - {results[0]['pass_fail']}")
        
    return True

if __name__ == "__main__":
    e2e_test(outcome="pass", level="District")
    # For now just test PASS. If it passes, the access-rule engine should put the student in pending_payment state.
