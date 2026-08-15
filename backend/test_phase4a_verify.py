import requests
import sys

BASE_URL = "http://localhost:8000"

def verify_phase4a():
    print("=== VERIFYING PHASE 4a: MOCK EXAM RESULTS & DAILY ATTEMPT LIMIT ===")
    sys.path.append('.')
    from database import SessionLocal
    import models
    from auth import create_access_token
    
    db = SessionLocal()
    learner = db.query(models.User).filter(models.User.email == "test_mock_learner@skillforge.com").first()
    if not learner:
        learner = models.User(email="test_mock_learner@skillforge.com", name="Mock Learner", hashed_password="pwd", role="learner")
        db.add(learner)
        db.commit()
        db.refresh(learner)
        
    spec = db.query(models.Specialization).first()
    inst = db.query(models.Institution).first()
    
    reg = db.query(models.StudentRegistration).filter(models.StudentRegistration.user_id == learner.id).first()
    if not reg:
        reg = models.StudentRegistration(
            user_id=learner.id,
            institution_id=inst.id if inst else 1,
            specialization_id=spec.id if spec else 1,
            current_tier="District",
            access_status="active"
        )
        db.add(reg)
    else:
        reg.access_status = "active"
        reg.current_tier = "District"
    db.commit()
    db.refresh(reg)
    
    # Get any subject or create one with daily limit = 3
    subj = db.query(models.Subject).filter(models.Subject.specialization_id == reg.specialization_id).first()
    if not subj:
        subj = models.Subject(name="AI Practice Subject", specialization_id=reg.specialization_id, daily_mock_attempts_limit=3, semester_tier="District", ai_mock_exams_enabled=True)
        db.add(subj)
        db.commit()
        db.refresh(subj)
    else:
        subj.daily_mock_attempts_limit = 3
        db.commit()
        db.refresh(subj)
        
    # Clear today's attempts for cleanly testing daily limit
    from datetime import datetime
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.user_id == learner.id,
        models.MockTestAttempt.attempt_date >= today_start
    ).delete()
    db.commit()
    
    subj_id = subj.id
    subj_name = subj.name
    
    token = create_access_token({"sub": str(learner.id), "role": learner.role})
    headers = {"Authorization": f"Bearer {token}"}
    db.close()
    
    # Test 1: GET /api/learning/my-mock-results initially empty
    print("\n--- Test 1: GET /api/learning/my-mock-results (Should be empty initially today) ---")
    res_empty = requests.get(f"{BASE_URL}/api/learning/my-mock-results", headers=headers)
    print(f"Status: {res_empty.status_code} - Response: {res_empty.text}")
    assert res_empty.ok, f"Expected 200 OK, got {res_empty.status_code}"
    
    # Test 2: Start 3 mock attempts -> All should succeed (200 OK)
    print(f"\n--- Test 2: Starting 3 mock attempts (Daily limit is 3) ---")
    for i in range(1, 4):
        res_start = requests.post(f"{BASE_URL}/api/learning/start-mock-exam", json={"subject_id": subj_id, "topic": subj_name}, headers=headers)
        print(f"Attempt {i} Status: {res_start.status_code} - Response: {res_start.text}")
        assert res_start.ok, f"Expected 200 OK for attempt {i}, got {res_start.status_code}: {res_start.text}"
        
    # Test 3: Verify GET /api/learning/my-mock-results now has 3 attempts
    print("\n--- Test 3: GET /api/learning/my-mock-results after 3 attempts ---")
    res_list = requests.get(f"{BASE_URL}/api/learning/my-mock-results", headers=headers)
    print(f"Status: {res_list.status_code} - Results Count: {len(res_list.json())}")
    assert res_list.ok
    assert len(res_list.json()) >= 3, f"Expected at least 3 mock results, got {len(res_list.json())}"
    
    # Test 4: Start 4th mock attempt -> Should be blocked by daily limit (429 Too Many Requests)
    print("\n--- Test 4: Starting 4th mock attempt (Should exceed daily limit of 3) ---")
    res_exceed = requests.post(f"{BASE_URL}/api/learning/start-mock-exam", json={"subject_id": subj_id, "topic": subj_name}, headers=headers)
    print(f"Attempt 4 Status: {res_exceed.status_code} - Response: {res_exceed.text}")
    assert res_exceed.status_code == 429, f"Expected 429 Too Many Requests, got {res_exceed.status_code}: {res_exceed.text}"
    assert "Daily mock test limit" in res_exceed.text
    print("4th attempt correctly blocked with 429 Too Many Requests!")
    
    print("\nSUCCESS: Phase 4a Mock Exam Results and Daily Attempt Limit verified perfectly!")

if __name__ == "__main__":
    verify_phase4a()
