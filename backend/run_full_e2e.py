import requests
import uuid
import time
import os
import sqlite3

BASE_URL = "http://localhost:8000"

def run_e2e_test():
    print("=== STARTING SKILLFORGE E2E JOURNEY TEST ===")
    
    # 1. Admin logs in
    print("\n--- STEP 1 & 2: Admin Login and College Creation ---")
    admin_creds = {"email": "admin@skillforge.com", "password": "admin123"}
    res = requests.post(f"{BASE_URL}/api/auth/login", json=admin_creds)
    if not res.ok:
        print(f"FAILED Admin login: {res.text}")
        return False
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Admin creates a college
    college_code = f"TEST-COL-{uuid.uuid4().hex[:6].upper()}"
    res = requests.post(f"{BASE_URL}/api/institutions", json={
        "name": f"Test E2E University {college_code}",
        "code": college_code,
        "address": "123 Test St",
        "contact_email": f"admin@{college_code.lower()}.edu"
    }, headers=admin_headers)
    if not res.ok:
        print(f"FAILED to create college: {res.text}")
        return False
    college = res.json()
    print(f"SUCCESS: Created College '{college['name']}' (ID: {college['id']})")
    
    # 3. Bulk upload student
    print("\n--- STEP 3: Bulk Upload Student ---")
    student_email = f"student_{uuid.uuid4().hex[:6]}@e2etest.com"
    student_password = "SecurePassword123"
    csv_content = f"name,email,password,institution_code,specialization\nTest Student,{student_email},{student_password},{college_code},Artificial Intelligence & Autonomous Systems\n"
    
    # Create temp CSV file
    csv_path = "temp_upload.csv"
    with open(csv_path, "w") as f:
        f.write(csv_content)
        
    with open(csv_path, "rb") as f:
        res = requests.post(f"{BASE_URL}/api/admin/students/bulk-upload", files={"file": ("upload.csv", f, "text/csv")}, headers=admin_headers)
        
    os.remove(csv_path)
    
    if not res.ok:
        print(f"FAILED to bulk upload student: {res.text}")
        return False
        
    upload_res = res.json()
    if upload_res.get("error_count") > 0:
        print(f"FAILED bulk upload validation: {upload_res.get('errors')}")
        return False
        
    print(f"SUCCESS: Uploaded Student '{student_email}'")
    
    # 4. Student Logs In (First time)
    print("\n--- STEP 4 & 5: Student Initial Login & Forced Password Change ---")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": student_password})
    if not res.ok:
        print(f"FAILED Student login: {res.text}")
        return False
        
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    res = requests.get(f"{BASE_URL}/api/users/me", headers=student_headers)
    student_data = res.json()
    if not student_data.get("must_change_password"):
        print("FAILED: Student was NOT forced to change password.")
        return False
    
    # 5. Change Password
    new_password = "NewSecurePassword456"
    res = requests.post(f"{BASE_URL}/api/communications/change-password", json={
        "current_password": student_password,
        "new_password": new_password
    }, headers=student_headers)
    
    if not res.ok:
        print(f"FAILED to change password: {res.text}")
        return False
    print("SUCCESS: Student changed password.")
    
    # 6. Re-login with new password
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": new_password})
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # 7. Views Subjects
    print("\n--- STEP 6 & 7: View Subjects & Book Exam Slot ---")
    res = requests.get(f"{BASE_URL}/api/learning/subjects", headers=student_headers)
    if not res.ok:
        print(f"FAILED to fetch subjects: {res.text}")
        return False
    subjects = res.json()
    if not subjects:
        print("FAILED: No subjects assigned to student!")
        return False
        
    # Get District subject
    subject = next((s for s in subjects if s["semester_tier"] == "District"), subjects[0])
    print(f"SUCCESS: Found assigned subject: {subject['name']}")
    
    # 8. Takes Mock Test (AI)
    print("\n--- STEP 9: AI Mock Assessment ---")
    res = requests.post(f"{BASE_URL}/api/assessment/generate", json={
        "topic": "Neural Networks", "difficulty": "Beginner", "count": 2
    }, headers=student_headers)
    if not res.ok:
        print(f"FAILED mock test generation: {res.text}")
        return False
    print(f"SUCCESS: Mock test generated {len(res.json())} questions.")
    
    # 9. Book Slot
    res = requests.get(f"{BASE_URL}/api/learning/subjects/{subject['id']}/slots/available", headers=student_headers)
    slots = res.json()
    if not slots:
        print("FAILED: No slots available.")
        return False
        
    slot_date = slots[0]["date"]
    slot_time = slots[0]["times"][0]
    
    res = requests.post(f"{BASE_URL}/api/learning/subjects/{subject['id']}/slots/book", json={
        "subject_id": subject['id'], "slot_date": slot_date, "slot_time": slot_time
    }, headers=student_headers)
    
    if not res.ok:
        print(f"FAILED to book slot: {res.text}")
        return False
        
    booking = res.json()
    print(f"SUCCESS: Slot booked! Booking Ref: {booking['booking_reference']}")
    
    print("\n--- STEP 10: Real Exam Engine Test ---")
    
    # Trigger link generation (Exam engine cron job mock)
    print("Triggering Exam Engine to generate assessment links...")
    requests.post(f"{BASE_URL}/api/v1/exam-engine/admin/trigger-links", headers=admin_headers)
    
    # Refetch booking to get the link
    res = requests.get(f"{BASE_URL}/api/learning/slots", headers=student_headers)
    my_bookings = res.json()
    booking = my_bookings[-1] # The latest one
    
    assessment_link = booking.get("assessment_link")
    if not assessment_link:
        print("FAILED: Assessment link was not generated after trigger!")
        return False
        
    temp_user_id = assessment_link.split("/")[-1]
    
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/start")
    if not res.ok:
        print(f"FAILED to start exam: {res.text}")
        return False
    questions = res.json()["questions"]
    print(f"SUCCESS: Started exam, received {len(questions)} questions.")
    
    for q in questions:
        # Give correct answers
        requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/answers", json={
            "question_id": q["id"], "answer": 0
        })
        
    res = requests.post(f"{BASE_URL}/api/v1/exam-engine/sessions/{temp_user_id}/submit")
    result = res.json()
    print(f"SUCCESS: Exam submitted! Score: {result['score_percentage']}%, Passed: {result['passed']}")
    
    # Wait for webhooks to process
    time.sleep(2)
    
    # 11. Reports Generated & Transition Checked
    print("\n--- STEP 12 & 13: Results & Transition Engine ---")
    res = requests.get(f"{BASE_URL}/api/learning/results", headers=student_headers)
    results = res.json()
    if not results:
        print("FAILED: No results found in LMS!")
        return False
    print(f"SUCCESS: LMS received result: {results[0]['score']} - {results[0]['pass_fail']}")
    
    res = requests.get(f"{BASE_URL}/api/learning/my-registration", headers=student_headers)
    reg = res.json()
    print(f"Registration State -> Tier: {reg['current_tier']}, Status: {reg['access_state']}")
    
    if reg['access_state'] != 'pending_payment':
        print("FAILED: State machine did not transition student to pending_payment!")
        return False
        
    # 12. Payment for Next Level
    print("\n--- STEP 14 & 15: Payment & Unlock ---")
    res = requests.post(f"{BASE_URL}/api/payments/create-order", json={
        "registration_id": reg["id"],
        "target_tier": "State"
    }, headers=student_headers)
    
    if not res.ok:
        print(f"FAILED to create payment order: {res.text}")
        return False
    order = res.json()
    print(f"SUCCESS: Payment order created: {order['order_id']}")
    
    # Complete payment
    res = requests.post(f"{BASE_URL}/api/payments/verify", json={
        "registration_id": reg["id"],
        "target_tier": "State",
        "order_id": order["order_id"],
        "payment_id": f"pay_{uuid.uuid4().hex[:10]}",
        "signature": "dummy_signature_for_test"
    }, headers=student_headers)
    
    if not res.ok:
        print(f"FAILED payment verification: {res.text}")
        return False
    print("SUCCESS: Payment verified.")
    
    # Verify final state
    res = requests.get(f"{BASE_URL}/api/learning/my-registration", headers=student_headers)
    final_reg = res.json()
    print(f"FINAL Registration State -> Tier: {final_reg['current_tier']}, Status: {final_reg['access_state']}")
    
    if final_reg['current_tier'] == 'State' and final_reg['access_state'] == 'active':
        print("\n🏆 END-TO-END TEST PASSED! The journey is completely verified!")
        return True
    else:
        print("\n❌ TEST FAILED at the final hurdle. Did not unlock State tier correctly.")
        return False

if __name__ == "__main__":
    run_e2e_test()
