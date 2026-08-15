import requests
import sys
import datetime

BASE_URL = "http://localhost:8000"

def verify_phase1():
    print("=== VERIFYING PHASE 1: SLOT BOOKING WINDOW BYPASS & VALIDATION ===")
    
    # 1. Login as learner
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "learner@skillforge.com", "password": "learner123"})
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.status_code} {login_res.text}")
        # Try finding any learner
        sys.path.append('.')
        from database import SessionLocal
        import models
        db = SessionLocal()
        learner = db.query(models.User).filter(models.User.role == "learner").first()
        if not learner:
            print("No learner found in DB.")
            return
        from auth import create_access_token
        token = create_access_token({"sub": str(learner.id), "role": learner.role})
        db.close()
    else:
        token = login_res.json().get("access_token")
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get subjects to find one with an exam window
    sys.path.append('.')
    from database import SessionLocal
    import models
    db = SessionLocal()
    ew = db.query(models.ExamWindow).first()
    if not ew:
        print("No ExamWindow found in DB! Creating a test ExamWindow...")
        subj = db.query(models.Subject).first()
        if not subj:
            print("No subject found.")
            return
        ew = models.ExamWindow(
            subject_id=subj.id,
            start_date=datetime.datetime.now() - datetime.timedelta(days=10),
            end_date=datetime.datetime.now() + datetime.timedelta(days=30),
            daily_start_time="09:00",
            daily_end_time="17:00",
            slot_duration_minutes=60
        )
        db.add(ew)
        db.commit()
        db.refresh(ew)
        
    subject_id = ew.subject_id
    print(f"Testing against Subject ID {subject_id} with window: {ew.start_date.date()} to {ew.end_date.date()}, daily {ew.daily_start_time} - {ew.daily_end_time}")
    
    # Ensure learner is assigned to this subject and has active registration
    from routes.learning import verify_subject_registration
    learner_id = int(headers["Authorization"].split()[-1]) if not login_res.ok else login_res.json()["user"]["id"]
    
    reg = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == learner_id,
        models.StudentRegistration.access_status == "active"
    ).first()
    if not reg:
        print("Activating learner registration...")
        reg = db.query(models.StudentRegistration).filter(models.StudentRegistration.user_id == learner_id).first()
        if reg:
            reg.access_status = "active"
            db.commit()
    if reg:
        assign = db.query(models.StudentSubjectAssignment).filter(
            models.StudentSubjectAssignment.user_id == learner_id,
            models.StudentSubjectAssignment.subject_id == subject_id
        ).first()
        if not assign:
            print("Assigning subject to learner...")
            assign = models.StudentSubjectAssignment(user_id=learner_id, subject_id=subject_id, registration_id=reg.id)
            db.add(assign)
            db.commit()
            
    # Also clean up any existing confirmed booking and sessions for this user and subject so we don't hit max attempts
    db.query(models.ExamSlotBooking).filter(
        models.ExamSlotBooking.user_id == learner_id,
        models.ExamSlotBooking.subject_id == subject_id
    ).delete()
    db.query(models.ExamSession).filter(
        models.ExamSession.student_id == learner_id,
        models.ExamSession.subject_id == subject_id
    ).delete()
    db.commit()
    ew_start_date = ew.start_date.date()
    db.close()
    
    # Test A: Book outside daily time window (e.g. 23:00 - 00:00)
    out_of_hours_payload = {
        "subject_id": subject_id,
        "slot_date": str(ew_start_date + datetime.timedelta(days=1)),
        "slot_time": "23:00 - 00:00"
    }
    res_time = requests.post(f"{BASE_URL}/api/learning/subjects/{subject_id}/slots/book", json=out_of_hours_payload, headers=headers)
    print(f"Test A (Out of daily hours '23:00 - 00:00'): Status {res_time.status_code} - {res_time.json() if res_time.status_code == 400 else res_time.text}")
    assert res_time.status_code == 400, f"Expected 400 rejection for out of hours slot, got {res_time.status_code}"
    
    # Test B: Book outside date window (e.g. 2099-01-01)
    out_of_date_payload = {
        "subject_id": subject_id,
        "slot_date": "2099-01-01",
        "slot_time": "10:00 AM - 11:00 AM"
    }
    res_date = requests.post(f"{BASE_URL}/api/learning/subjects/{subject_id}/slots/book", json=out_of_date_payload, headers=headers)
    print(f"Test B (Out of date window '2099-01-01'): Status {res_date.status_code} - {res_date.json() if res_date.status_code == 400 else res_date.text}")
    assert res_date.status_code == 400, f"Expected 400 rejection for out of date window, got {res_date.status_code}"
    
    # Test C: Book with malformed/unparseable time string (previously silently caught and bypassed!)
    malformed_payload = {
        "subject_id": subject_id,
        "slot_date": str(ew_start_date + datetime.timedelta(days=1)),
        "slot_time": "INVALID_TIME_STRING - 12:00 PM"
    }
    res_malformed = requests.post(f"{BASE_URL}/api/learning/subjects/{subject_id}/slots/book", json=malformed_payload, headers=headers)
    print(f"Test C (Malformed time 'INVALID_TIME_STRING'): Status {res_malformed.status_code} - {res_malformed.json() if res_malformed.status_code == 400 else res_malformed.text}")
    assert res_malformed.status_code == 400, f"Expected 400 rejection for malformed time, got {res_malformed.status_code}"
    
    # Test D: Book valid slot within window using 24h range string like "10:00 - 11:00" (which previously failed to parse and silently bypassed check)
    valid_payload = {
        "subject_id": subject_id,
        "slot_date": str(ew_start_date + datetime.timedelta(days=1)),
        "slot_time": "10:00 - 11:00"
    }
    res_valid = requests.post(f"{BASE_URL}/api/learning/subjects/{subject_id}/slots/book", json=valid_payload, headers=headers)
    print(f"Test D (Valid 24h slot '10:00 - 11:00'): Status {res_valid.status_code} - {res_valid.json() if res_valid.ok else res_valid.text}")
    assert res_valid.ok, f"Expected success for valid slot inside window, got {res_valid.status_code}"
    
    print("\nSUCCESS: All Phase 1 Slot Booking Window bypass verification tests passed!")

if __name__ == "__main__":
    verify_phase1()
