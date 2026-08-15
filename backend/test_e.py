import requests
import sqlite3
import time
from test_edge_cases import get_learner, get_subject_for_learner, book_slot

BASE_URL = "http://localhost:8000"

def test_e_boundary():
    print("\n--- Test E: Non-100% and Failing Scores Boundary Conditions ---")
    email, user_id = get_learner()
    subject_id = get_subject_for_learner(user_id)
    session_ref, link = book_slot(email, subject_id)
    
    # Extract session_id and temp_user_id from db
    conn = sqlite3.connect("skillforge.db")
    conn.row_factory = sqlite3.Row
    cred = conn.execute("SELECT c.id, c.temp_user_id, c.session_id FROM exam_credentials c JOIN exam_sessions s ON s.id=c.session_id WHERE s.session_ref=?", (session_ref,)).fetchone()
    temp_user_id = cred["temp_user_id"]
    
    # Trigger link active
    admin_token = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"}).json()["access_token"]
    requests.post(f"{BASE_URL}/api/v1/exam-engine/admin/trigger-links", headers={"Authorization": f"Bearer {admin_token}"})
    
    # Start session
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/start")
    start1 = res.json()
    questions = start1["questions"]
    print(f"Session started. Total questions: {len(questions)}")
    
    # Determine how many to answer correctly to get exactly 45% (FAIL at District level)
    target_correct = int(len(questions) * 0.45)
    print(f"Targeting {target_correct} correct answers for 45% score.")
    
    # Need to fetch the correct answers from DB to simulate getting them right/wrong
    correct_answers = {}
    q_rows = conn.execute(f"SELECT id, correct_answer FROM exam_questions").fetchall()
    for row in q_rows:
        correct_answers[row["id"]] = row["correct_answer"]
        
    for i, q in enumerate(questions):
        if i < target_correct:
            ans = correct_answers.get(q["id"], 0)
        else:
            ans = (correct_answers.get(q["id"], 0) + 1) % len(q["options"]) # intentionally wrong
            
        requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/answers", json={
            "question_id": q["id"], "answer": ans
        })
        
    # Submit exam
    res_submit = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/submit")
    submit_data = res_submit.json()
    print("Submit Response:", submit_data)
    
    if submit_data.get("passed"):
        print("FAIL: Expected to fail with 45%, but passed.")
        return False
        
    print(f"PASS: Exam submitted with {submit_data['score_percentage']}% and passed={submit_data['passed']}")
    
    # Wait for webhook to process
    time.sleep(3)
    
    conn2 = sqlite3.connect("skillforge.db")
    conn2.row_factory = sqlite3.Row
    srp_reg = conn2.execute("SELECT access_state, district_score FROM student_registrations WHERE user_id=?", (user_id,)).fetchone()
    
    if srp_reg["access_state"] != "post_exam_access":
         print(f"FAIL: SRP state not post_exam_access for failed exam. Got: {srp_reg['access_state']}")
         return False
         
    if srp_reg["district_score"] != submit_data["score_percentage"]:
         print(f"FAIL: District score not updated properly. Got {srp_reg['district_score']}")
         return False
         
    print("PASS: SRP Rules Engine handled failing score correctly.")
    return True

if __name__ == "__main__":
    test_e_boundary()
