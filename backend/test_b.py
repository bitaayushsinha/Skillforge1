import requests
import sqlite3
from test_edge_cases import get_learner, get_subject_for_learner, book_slot

BASE_URL = "http://localhost:8000"

def test_b_violation():
    print("\n--- Test B: Mid-Exam Proctoring Violation ---")
    email, user_id = get_learner()
    subject_id = get_subject_for_learner(user_id)
    session_ref, link = book_slot(email, subject_id)
    print(f"Booked slot. Session ref: {session_ref}")
    
    # Extract temp_user_id from db
    conn = sqlite3.connect("skillforge.db")
    conn.row_factory = sqlite3.Row
    cred = conn.execute("SELECT c.temp_user_id, c.id FROM exam_credentials c JOIN exam_sessions s ON s.id=c.session_id WHERE s.session_ref=?", (session_ref,)).fetchone()
    temp_user_id = cred["temp_user_id"]
    
    # We need to simulate time passing so it's active. Let's just use the admin endpoint to trigger it.
    admin_token = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"}).json()["access_token"]
    requests.post(f"{BASE_URL}/api/v1/exam-engine/admin/trigger-links", headers={"Authorization": f"Bearer {admin_token}"})
    
    # Start session
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/start")
    start_data = res.json()
    print("Start session:", start_data)
    
    first_q_id = start_data["questions"][0]["id"]
    
    # Submit one answer
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/answers", json={
        "question_id": first_q_id, "answer": 0
    })
    print("Answered Q1:", res.ok)
    
    # Trigger 3 violations
    for i in range(3):
        res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/violations", json={
            "type": "face_missing", "message": f"Face not detected {i}"
        })
        print(f"Violation {i}:", res.ok)
        
    # Trigger suspend (frontend does this after threshold)
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/suspend", json={
        "type": "multiple_faces", "message": "Threshold exceeded"
    })
    print("Suspend response:", res.json())
    
    if res.json().get("status") != "suspended":
        print("FAIL: Did not suspend correctly.")
        return False
        
    # Verify in DB
    conn = sqlite3.connect("skillforge.db")
    conn.row_factory = sqlite3.Row
    session = conn.execute("SELECT id, status FROM exam_sessions WHERE session_ref=?", (session_ref,)).fetchone()
    if session["status"] != "suspended":
        print("FAIL: Session status not updated in DB.")
        return False
        
    # Verify responses preserved
    ans = conn.execute("SELECT COUNT(*) as c FROM exam_answers WHERE session_id=?", (session["id"],)).fetchone()
    if ans["c"] != 1:
        print(f"FAIL: Answers lost! Found {ans['c']}")
        return False
    print("PASS: Answers preserved.")
    
    # Admin sees it - Admin gets it via direct DB check or API. Since there's no API in exam_sessions.py to list violations, we check DB.
    viols = conn.execute("SELECT COUNT(*) as c FROM exam_violation_logs WHERE session_id=?", (session["id"],)).fetchone()
    if viols["c"] < 4: # 3 + 1 for suspend
        print("FAIL: Violations not logged correctly.")
        return False
    print("PASS: Violations logged.")
    
    # Admin resume
    admin_token = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"}).json()["access_token"]
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/admin/sessions/{session_ref}/resume", headers={"Authorization": f"Bearer {admin_token}"})
    if not res.ok:
        print("FAIL: Admin could not resume.")
        return False
    print("PASS: Admin resumed session.")
    return True

if __name__ == "__main__":
    test_b_violation()
