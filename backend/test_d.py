import requests
import sqlite3
import time
from test_edge_cases import get_learner, get_subject_for_learner, book_slot

BASE_URL = "http://localhost:8000"

def test_d_timeout():
    print("\n--- Test D: Failed/Timed-Out Link Confirmation ---")
    email, user_id = get_learner()
    subject_id = get_subject_for_learner(user_id)
    session_ref, link = book_slot(email, subject_id)
    
    # Extract session_id and temp_user_id from db
    conn = sqlite3.connect("skillforge.db")
    conn.row_factory = sqlite3.Row
    cred = conn.execute("SELECT c.id, c.temp_user_id, c.session_id FROM exam_credentials c JOIN exam_sessions s ON s.id=c.session_id WHERE s.session_ref=?", (session_ref,)).fetchone()
    temp_user_id = cred["temp_user_id"]
    cred_id = cred["id"]
    session_id = cred["session_id"]
    
    # Trigger link active
    admin_token = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"}).json()["access_token"]
    requests.post(f"{BASE_URL}/api/v1/exam-engine/admin/trigger-links", headers={"Authorization": f"Bearer {admin_token}"})
    
    # Start session 1
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/start")
    start1 = res.json()
    print("Session started.")
    
    # Force expiration directly in db
    conn.execute("UPDATE exam_credentials SET expires_at=datetime('now', '-1 minute') WHERE id=?", (cred_id,))
    conn.commit()
    
    # Run Sweep
    print("Running background sweep...")
    requests.post(f"{BASE_URL}/api/v1/exam-engine/admin/sweep-expired-sessions")
    
    # Check status
    sess_row = conn.execute("SELECT status FROM exam_sessions WHERE id=?", (session_id,)).fetchone()
    if sess_row["status"] != "terminated":
        print(f"FAIL: Session not terminated. Got: {sess_row['status']}")
        return False
        
    print("PASS: Session terminated.")
    
    # Verify SRP webhook result
    srp_reg = conn.execute("SELECT access_state FROM student_registrations WHERE user_id=?", (user_id,)).fetchone()
    # The webhook should mark it as post_exam_access (or failed) depending on rules.
    # Actually, access_rule_engine sets access_state = "post_exam_access" if passed or failed? 
    # Let's check the webhook log if possible.
    if srp_reg["access_state"] == "post_exam_access":
         print("PASS: SRP processed fail webhook.")
    else:
         print(f"FAIL: SRP state not post_exam_access. Got: {srp_reg['access_state']}")
         return False
         
    return True

if __name__ == "__main__":
    test_d_timeout()
