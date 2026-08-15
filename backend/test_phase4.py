import requests
import time
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql+pg8000://'))

BASE_URL = "http://localhost:8000/api/v1/exam-engine"

def setup_db():
    with engine.connect() as conn:
        subject_id = conn.execute(text('SELECT id FROM subjects LIMIT 1')).fetchone()[0]
        uid = str(time.time()).replace('.', '')
        user_id = conn.execute(text('INSERT INTO users (email, name, hashed_password, role, is_active) VALUES (:e, :n, :h, :r, :a) RETURNING id'), 
                       {'e': f'test4_{uid}@example.com', 'n': 'Phase 4 User', 'h': 'hash', 'r': 'student', 'a': 1}).fetchone()[0]
        
        session_ref = f'sess_{uid}'
        session_id = conn.execute(text('INSERT INTO exam_sessions (session_ref, student_id, subject_id, level, booking_ref, status, remaining_duration) VALUES (:sr, :si, :sub, :lvl, :b, :st, :rd) RETURNING id'),
                       {'sr': session_ref, 'si': user_id, 'sub': subject_id, 'lvl': 'District', 'b': f'book_{uid}', 'st': 'pending', 'rd': 3600}).fetchone()[0]
        
        temp_user_id = f'cred_{uid}'
        conn.execute(text('INSERT INTO exam_credentials (session_id, temp_user_id, temp_password_hash, expires_at, status) VALUES (:si, :tui, :tph, CURRENT_TIMESTAMP + interval \'1 day\', :st)'),
                       {'si': session_id, 'tui': temp_user_id, 'tph': 'hash', 'st': 'issued'})
        
        bank_id = conn.execute(text('INSERT INTO exam_question_banks (subject_id, level, name, bank_type) VALUES (:sub, :lvl, :n, :bt) RETURNING id'), 
                       {'sub': subject_id, 'lvl': 'District', 'n': 'Test Bank 4', 'bt': 'formal'}).fetchone()[0]
        
        conn.execute(text('INSERT INTO exam_questions (bank_id, text, options, correct_answer) VALUES (:bi, :t, :o, :ca)'), 
                       {'bi': bank_id, 't': 'Q1', 'o': '["A", "B"]', 'ca': 0})
        conn.commit()
    return temp_user_id, session_ref

def run_test():
    temp_user_id, session_ref = setup_db()
    print(f"Setup complete. temp_user_id: {temp_user_id}, session_ref: {session_ref}")

    # 1. Start Exam
    start_res = requests.post(f"{BASE_URL}/sessions/{temp_user_id}/start")
    print("Start Exam:", start_res.status_code)
    
    question_id = start_res.json()["questions"][0]["id"]
    
    # 2. Suspend Exam
    print("Suspending exam...")
    susp_res = requests.post(f"{BASE_URL}/sessions/{temp_user_id}/suspend", json={"type": "hardware", "message": "Manual suspension", "severity": 1})
    print("Suspend Result:", susp_res.json())
    
    # Wait 2 seconds to accumulate some lost time
    time.sleep(2)
    
    # 3. Try to save answer while suspended
    ans_res1 = requests.post(f"{BASE_URL}/sessions/{temp_user_id}/answers", json={"question_id": question_id, "answer": 0})
    print("Answer while suspended:", ans_res1.status_code, ans_res1.text)
    assert ans_res1.status_code == 400, "Should reject answer while suspended"
    
    # 4. Resume Exam
    print("Resuming exam via admin endpoint...")
    res_res = requests.post(f"{BASE_URL}/admin/sessions/{session_ref}/resume")
    print("Resume Result:", res_res.json())
    
    # 5. Try to save answer again
    ans_res2 = requests.post(f"{BASE_URL}/sessions/{temp_user_id}/answers", json={"question_id": question_id, "answer": 1})
    print("Answer after resume:", ans_res2.status_code, ans_res2.text)
    assert ans_res2.status_code == 200, "Should accept answer after resume"
    
    # Verify remaining time
    status_res = requests.get(f"{BASE_URL}/sessions/{temp_user_id}/status")
    print("Status after resume:", status_res.json())
    
    print("✅ All Phase 4 tests passed successfully.")

if __name__ == "__main__":
    run_test()
