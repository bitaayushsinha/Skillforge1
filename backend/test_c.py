import requests
import sqlite3
import time
from test_edge_cases import get_learner, get_subject_for_learner, book_slot

BASE_URL = "http://localhost:8000"

def test_c_resume():
    print("\n--- Test C: Resume After Interruption ---")
    email, user_id = get_learner()
    subject_id = get_subject_for_learner(user_id)
    session_ref, link = book_slot(email, subject_id)
    
    # Extract temp_user_id from db
    conn = sqlite3.connect("skillforge.db")
    conn.row_factory = sqlite3.Row
    cred = conn.execute("SELECT c.temp_user_id FROM exam_credentials c JOIN exam_sessions s ON s.id=c.session_id WHERE s.session_ref=?", (session_ref,)).fetchone()
    temp_user_id = cred["temp_user_id"]
    
    # Trigger link active
    admin_token = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"}).json()["access_token"]
    requests.post(f"{BASE_URL}/api/v1/exam-engine/admin/trigger-links", headers={"Authorization": f"Bearer {admin_token}"})
    
    # Start session 1
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/start")
    print("Start 1 text:", res.text)
    start1 = res.json()
    first_q_id = start1["questions"][0]["id"]
    print(f"Start 1 duration_minutes: {start1['duration_minutes']}")
    
    # Answer 1 question
    res_ans = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/answers", json={
        "question_id": first_q_id, "answer": 1
    })
    print(f"Answer response: {res_ans.status_code} {res_ans.text}")
    
    # Wait a bit to simulate disconnect
    print("Simulating 3 second disconnect...")
    time.sleep(3)
    
    # Start session 2 (resume)
    res2 = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/start")
    start2 = res2.json()
    print("Start 2 response:", start2)
    
    # Check answers
    prev_ans = start2.get("previous_answers", [])
    if len(prev_ans) != 1 or prev_ans[0]["question_id"] != first_q_id or prev_ans[0]["answer"] != 1:
        print(f"FAIL: Previous answers not restored correctly. Got: {prev_ans}")
        return False
    print("PASS: Previous answers restored.")
    
    # Check time
    rem = start2.get("remaining_seconds", 3600)
    expected_max = start1["duration_minutes"] * 60 - 2
    if rem >= start1["duration_minutes"] * 60:
        print(f"FAIL: Remaining time not recalculated. Got {rem}s")
        return False
    print(f"PASS: Time recalculated correctly (Remaining: {rem}s)")
    return True

if __name__ == "__main__":
    test_c_resume()
