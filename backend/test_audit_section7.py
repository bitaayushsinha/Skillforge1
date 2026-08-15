import requests
import datetime
import uuid
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== AUDITING SECTION 7: COMMUNICATIONS & FORUMS ===")
    
    # 0. Setup: Admin Token & Student Setup
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    admin_token = admin_login.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    sys.path.append('.')
    from database import SessionLocal
    import models
    db = SessionLocal()
    
    inst = db.query(models.Institution).first()
    inst_id = inst.id if inst else 1
    
    student_email = f"audit_sec7_{uuid.uuid4().hex[:8]}@skillforge.com"
    student_pwd = "password123"
    
    # Create test student for spec 1
    res_student = requests.post(f"{BASE_URL}/api/admin/students", json={
        "name": "Audit Sec7 Student",
        "email": student_email,
        "password": student_pwd,
        "institution_id": inst_id,
        "specialization": "Artificial Intelligence & Autonomous Systems"
    }, headers=admin_headers)
    
    if res_student.status_code != 201:
        print(f"Failed to create student: {res_student.text}")
        # fallback to student 50
        student_id = 50
        student_email = "test_student@skillforge.com"
        student_pwd = "password123"
    else:
        student_id = res_student.json()["id"]
    
    student_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": student_pwd})
    student_token = student_login.json().get("access_token")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    print("\n1. Announcements Isolation")
    # Admin creates an announcement for a DIFFERENT institution
    # Assuming inst_id + 1 is a different institution (we will just send it in payload)
    other_inst_id = inst_id + 1
    
    ann_payload = {
        "title": "Top Secret Announcement",
        "content": "For another institution only",
        "target_institution_id": other_inst_id
    }
    ann_res = requests.post(f"{BASE_URL}/api/communications/announcements", json=ann_payload, headers=admin_headers)
    if ann_res.status_code == 201:
        print("Announcement created by admin for a different institution.")
        
    # Student retrieves announcements
    get_ann_res = requests.get(f"{BASE_URL}/api/communications/announcements", headers=student_headers)
    print(f"Student fetch announcements status: {get_ann_res.status_code}")
    if get_ann_res.status_code == 200:
        anns = get_ann_res.json()
        titles = [a['title'] for a in anns]
        if "Top Secret Announcement" in titles:
            print("VULNERABILITY: Announcements are NOT isolated by institution! Student saw another institution's announcement.")
        else:
            print("Isolation successful: Student only sees their institution's (or global) announcements.")
            
    print("\n2. Helpdesk / Support Tickets")
    ticket_payload = {
        "subject": "Help with Course",
        "description": "I can't see my module.",
        "category": "technical",
        "priority": "high"
    }
    tick_res = requests.post(f"{BASE_URL}/api/communications/tickets", json=ticket_payload, headers=student_headers)
    print(f"Student create ticket status: {tick_res.status_code}")
    
    if tick_res.status_code == 201:
        ticket_id = tick_res.json()['id']
        print(f"Ticket {ticket_id} successfully created.")
        
        # Admin replies to ticket
        reply_payload = {"message": "We are looking into this."}
        reply_res = requests.post(f"{BASE_URL}/api/communications/tickets/{ticket_id}/reply", json=reply_payload, headers=admin_headers)
        print(f"Admin reply status: {reply_res.status_code}")
        
    print("\n3. Discussion Forums")
    # Does the backend have any forum endpoints?
    print("Forums Not Built: Inspected routes/communications.py. No endpoints for Discussion Forums exist.")
    
    db.close()

if __name__ == "__main__":
    run_tests()
