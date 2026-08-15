import requests
import sqlite3
import datetime
import os
import uuid

BASE_URL = "http://localhost:8000"

def get_learner():
    conn = sqlite3.connect("skillforge.db")
    conn.row_factory = sqlite3.Row
    user = conn.execute("SELECT email, id FROM users WHERE role='learner' LIMIT 1").fetchone()
    return user["email"], user["id"]

def get_subject_for_learner(student_id, level="District"):
    conn = sqlite3.connect("skillforge.db")
    conn.row_factory = sqlite3.Row
    reg = conn.execute("SELECT id, specialization_id FROM student_registrations WHERE user_id=? LIMIT 1", (student_id,)).fetchone()
    subject = conn.execute("SELECT id, name FROM subjects WHERE specialization_id=? AND semester_tier=? LIMIT 1", (reg["specialization_id"], level)).fetchone()
    return subject["id"]

def book_slot(student_email, subject_id):
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": "learner123"})
    student_token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {student_token}"}

    # Cancel existing bookings
    res = requests.get(f"{BASE_URL}/api/learning/slots", headers=headers)
    for booking in res.json():
        if booking["subject_id"] == subject_id and booking["status"] == "confirmed":
            requests.delete(f"{BASE_URL}/api/learning/slots/{booking['id']}", headers=headers)

    res = requests.get(f"{BASE_URL}/api/learning/subjects/{subject_id}/slots/available", headers=headers)
    slots = res.json()
    slot_date = slots[0]["date"]
    slot_time = slots[0]["times"][0]

    res = requests.post(f"{BASE_URL}/api/learning/subjects/{subject_id}/slots/book", json={
        "subject_id": subject_id, "slot_date": slot_date, "slot_time": slot_time
    }, headers=headers)
    
    booking = res.json()
    return booking["exam_engine_session_ref"], booking.get("assessment_link")

def test_a_credential_expiry():
    print("\n--- Test A: Credential Expiry ---")
    email, user_id = get_learner()
    subject_id = get_subject_for_learner(user_id)
    session_ref, link = book_slot(email, subject_id)
    print(f"Booked slot. Session ref: {session_ref}")
    
    # 1. Manually expire the credential in the DB
    conn = sqlite3.connect("skillforge.db")
    conn.row_factory = sqlite3.Row
    # Actually wait, credentials are in exam_credentials table.
    cred = conn.execute("SELECT c.temp_user_id, c.id FROM exam_credentials c JOIN exam_sessions s ON s.id=c.session_id WHERE s.session_ref=?", (session_ref,)).fetchone()
    if not cred:
        print("FAIL: Credential not found")
        return False
        
    temp_user_id = cred["temp_user_id"]
    cred_id = cred["id"]
    
    # Expire it
    conn.execute("UPDATE exam_credentials SET expires_at=datetime('now', '-1 hour') WHERE id=?", (cred_id,))
    conn.commit()
    
    # 2. Check verify endpoint (should fire auto-expiry and notify admin)
    res = requests.get(f"{BASE_URL}/api/v1/exam-engine/credentials/{temp_user_id}")
    status_data = res.json()
    print(f"Verify response: {status_data['status']}")
    
    if status_data["status"] != "expired":
        print("FAIL: Credential did not expire.")
        return False
        
    # Check if admin notification exists
    notif = conn.execute("SELECT * FROM email_logs WHERE subject LIKE '%expired%' AND recipient = 'admin@skillforge.com' ORDER BY sent_at DESC LIMIT 1").fetchone()
    if not notif:
        print("FAIL: Admin not notified of expiration.")
        return False
    print("PASS: Admin notified.")
    
    # 3. Admin regenerate/resend endpoint
    admin_token = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"}).json()["access_token"]
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/admin/poc/regenerate-credential/{session_ref}", headers={"Authorization": f"Bearer {admin_token}"})
    if not res.ok:
        print(f"FAIL: Admin regenerate failed: {res.json()}")
        return False
        
    print("PASS: Admin regenerated credential successfully.")
    return True

if __name__ == "__main__":
    test_a_credential_expiry()
