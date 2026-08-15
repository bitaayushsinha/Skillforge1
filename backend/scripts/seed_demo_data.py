import os
import sys
import time
import datetime
import hmac
import hashlib
import uuid
from io import BytesIO

# Make sure we can import from backend dir to elevate the admin
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ[k] = v
load_env()
if "JWT_SECRET_KEY" not in os.environ:
    os.environ["JWT_SECRET_KEY"] = "demo_secret_key"

from database import SessionLocal
from models import User, RegistrationCycle
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def get_env(key, default=""):
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if line.startswith(f"{key}="):
                    return line.split("=", 1)[1].strip()
    return os.environ.get(key, default)

RAZORPAY_KEY_SECRET = get_env("RAZORPAY_KEY_SECRET", "dummy_secret_for_local")
WEBHOOK_SECRET = get_env("EXAM_ENGINE_WEBHOOK_SECRET", "dummy_webhook_secret")

def elevate_admin(email):
    db = SessionLocal()
    admin = db.query(User).filter_by(email=email).first()
    if admin:
        admin.role = 'admin'
        db.commit()
    db.close()

from models import User, RegistrationCycle, Specialization

def clean_existing_users_and_setup_cycle():
    db = SessionLocal()
    
    # Ensure active cycle exists
    active_cycle = db.query(RegistrationCycle).filter_by(is_active=True).first()
    if not active_cycle:
        new_cycle = RegistrationCycle(
            name=f"Demo Cycle {datetime.datetime.now().year}",
            is_active=True,
            start_date=datetime.date.today(),
            end_date=datetime.date.today() + datetime.timedelta(days=365)
        )
        db.add(new_cycle)
        db.commit()

    # Ensure a specialization exists
    spec = db.query(Specialization).first()
    if not spec:
        spec = Specialization(name="Computer Science", code="CS")
        db.add(spec)
        db.commit()

    emails = ["admin@skillforge.com", "dean@stanfordtech.edu", "demo@skillforge.com"]
    for email in emails:
        user = db.query(User).filter_by(email=email).first()
        if user:
            # Manually clean up subadmin privileges if they exist (to avoid UNIQUE constraint errors if cascade is missing)
            from models import SubAdminPrivilege, SubAdminInstitutionAccess
            privs = db.query(SubAdminPrivilege).filter_by(user_id=user.id).all()
            for p in privs:
                db.delete(p)
            accs = db.query(SubAdminInstitutionAccess).filter_by(subadmin_id=user.id).all()
            for a in accs:
                db.delete(a)
                
            db.delete(user)
    db.commit()
    db.close()

def main():
    print("="*60)
    print("--- SEEDING REALISTIC DEMO DATA ---")
    print("="*60)
    
    clean_existing_users_and_setup_cycle()
    
    # 1. Create Super Admin
    admin_email = "admin@skillforge.com"
    admin_pass = "skillforge2026!"
    print(f"\n[1] Registering Super Admin: {admin_email}")
    res = client.post("/api/auth/register", json={
        "email": admin_email,
        "password": admin_pass,
        "name": "Super Admin"
    })
    if res.status_code not in [200, 201] and "already exists" not in res.text:
        print(f"Error registering admin: {res.text}")
        return
    
    print("    -> Elevating to admin in DB...")
    elevate_admin(admin_email)
    
    # Login as admin
    res = client.post("/api/auth/login", json={"email": admin_email, "password": admin_pass})
    if res.status_code != 200:
        print("Failed to login as admin!")
        return
    admin_token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    print("    -> Admin logged in successfully.")

    # 2. Create Institutions
    print("\n[2] Creating Institutions...")
    institutions_data = [
        {"name": "Stanford Technology Institute", "code": "STI", "contact_email": "admin@stanfordtech.edu", "address": "Stanford, CA"},
        {"name": "MIT Institute of Design", "code": "MIT", "contact_email": "hello@mit.edu", "address": "Cambridge, MA"},
        {"name": "Indian Institute of Technology Delhi", "code": "IITD", "contact_email": "director@iitd.ac.in", "address": "Hauz Khas, New Delhi"}
    ]
    inst_ids = {}
    for data in institutions_data:
        res = client.post("/api/institutions", json=data, headers=headers)
        if res.status_code in [200, 201]:
            inst_ids[data["code"]] = res.json()["id"]
            print(f"    -> Created Institution: {data['name']}")
        else:
            print(f"    -> Note for {data['name']}: {res.text}")
            
    # Try fetching institutions to get IDs if they already existed
    res = client.get("/api/institutions", headers=headers)
    for inst in res.json():
        inst_ids[inst["code"]] = inst["id"]

    # 3. Create Sub-Admin
    print("\n[3] Creating Sub-Admin for Stanford Tech...")
    subadmin_email = "dean@stanfordtech.edu"
    subadmin_pass = "stanford2026!"
    stanford_id = inst_ids.get("STI")
    if stanford_id:
        res = client.post("/api/admin/subadmins", json={
            "email": subadmin_email,
            "password": subadmin_pass,
            "name": "Dr. Emily Chen (Dean)",
            "privileges": {
                "manage_institutions": False, "manage_students": True, "reset_passwords": True,
                "allocate_specializations": True, "bulk_upload": True, "view_reports": True,
                "custom_reports": True, "enrollment_reports": True, "export_data": True
            },
            "institution_ids": [stanford_id]
        }, headers=headers)
        if res.status_code in [200, 201]:
            print("    -> Created Sub-Admin: Dr. Emily Chen")
        else:
            print(f"    -> Note for Sub-Admin: {res.text}")

    # 4. Bulk Upload Students
    print("\n[4] Bulk Uploading Students...")
    # Login as sub-admin to do the bulk upload for Stanford
    res = client.post("/api/auth/login", json={"email": subadmin_email, "password": subadmin_pass})
    if res.status_code == 200:
        subadmin_token = res.json()["access_token"]
        subadmin_headers = {"Authorization": f"Bearer {subadmin_token}"}
        
        csv_content = "name,email,password,institution_code,specialization\n"
        csv_content += "Alice Johnson,alice@example.com,Student@123,STI,AI & Machine Learning\n"
        csv_content += "Bob Smith,bob@example.com,Student@123,STI,Data Science\n"
        csv_content += "Charlie Davis,charlie@example.com,Student@123,STI,Cybersecurity\n"
        csv_content += "Diana Prince,diana@example.com,Student@123,STI,AI & Machine Learning\n"
        
        files = {'file': ('students.csv', BytesIO(csv_content.encode('utf-8')), 'text/csv')}
        res = client.post("/api/admin/students/bulk-upload", files=files, headers=subadmin_headers)
        print(f"    -> Bulk Upload Response: {res.text}")
    else:
        print("    -> Skipping bulk upload, subadmin login failed.")

    # 5. Create Main Persona (demo@skillforge.com)
    print("\n[5] Creating Demo Persona...")
    demo_email = "demo@skillforge.com"
    demo_pass = "skillforge2026!"
    res = client.post("/api/auth/register", json={
        "email": demo_email,
        "password": demo_pass,
        "name": "Demo Learner"
    })
    
    # Manually fix up the Demo Learner's registration in DB to have STI institution
    db = SessionLocal()
    demo_user = db.query(User).filter_by(email=demo_email).first()
    if demo_user:
        # Create a dummy specialization if none exists
        from models import Specialization, StudentRegistration
        spec = db.query(Specialization).first()
        if not spec:
            spec = Specialization(name="Computer Science", code="CS")
            db.add(spec)
            db.commit()
            db.refresh(spec)
        
        reg = db.query(StudentRegistration).filter_by(user_id=demo_user.id).first()
        if reg:
            reg.institution_id = inst_ids.get("STI", 1)
            reg.specialization_id = spec.id
            db.commit()
    db.close()
    
    # Login as demo persona
    res = client.post("/api/auth/login", json={"email": demo_email, "password": demo_pass})
    if res.status_code != 200:
        print("Failed to login as Demo Learner!")
        return
    demo_token = res.json()["access_token"]
    demo_headers = {"Authorization": f"Bearer {demo_token}"}
    print("    -> Demo Learner logged in successfully.")

    # 6. Simulate Booking and Passing Exam
    print("\n[6] Simulating Exam Booking and Result for Demo Learner...")
    # Get subjects
    res = client.get("/api/learning/subjects", headers=demo_headers)
    subjects = res.json()
    if not subjects:
        print("    -> No subjects found to book.")
    else:
        subject = subjects[0]
        # Get slots
        res = client.get(f"/api/learning/subjects/{subject['id']}/slots/available", headers=demo_headers)
        slots = res.json()
        if slots:
            slot_date = slots[0]["date"]
            slot_time = slots[0]["times"][0]
            # Book slot
            res = client.post(f"/api/learning/subjects/{subject['id']}/slots/book", json={
                "subject_id": subject['id'],
                "slot_date": slot_date,
                "slot_time": slot_time
            }, headers=demo_headers)
            
            if res.status_code in [200, 201]:
                booking = res.json()
                print(f"    -> Booked slot! Reference: {booking['booking_reference']}")
                
                # Send Webhook Result
                print("    -> Firing simulated Exam Engine Webhook (Passing Result)...")
                
                payload_str = '{' + f'"booking_ref": "{booking["booking_reference"]}", "score": 85, "status": "pass"' + '}'
                signature = hmac.new(WEBHOOK_SECRET.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
                
                res = client.post("/api/webhooks/exam-engine/result", data=payload_str, headers={
                    "Content-Type": "application/json",
                    "X-Exam-Engine-Signature": signature
                })
                print(f"    -> Webhook response: {res.text}")
                
                # Payment for Next Tier
                print("\n[7] Simulating Payment Unlock for National Tier...")
                # Create Order
                res = client.post("/api/payments/create-order", json={
                    "registration_id": booking['registration_id'],
                    "target_tier": "National"
                }, headers=demo_headers)
                
                if res.status_code in [200, 201]:
                    order_data = res.json()
                    order_id = order_data["order_id"]
                    print(f"    -> Payment Order created: {order_id}")
                    
                    # Generate Signature
                    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
                    sig_payload = f"{order_id}|{payment_id}"
                    sig = hmac.new(RAZORPAY_KEY_SECRET.encode(), sig_payload.encode(), hashlib.sha256).hexdigest()
                    
                    # Verify Payment
                    res = client.post("/api/payments/verify", json={
                        "registration_id": booking['registration_id'],
                        "target_tier": "National",
                        "order_id": order_id,
                        "payment_id": payment_id,
                        "signature": sig
                    }, headers=demo_headers)
                    print(f"    -> Payment Verification Response: {res.text}")
                else:
                    print(f"    -> Failed to create order: {res.text}")
                    
            else:
                print(f"    -> Failed to book slot: {res.text}")

    print("\n[SUCCESS] Seed Complete! You can now log into the frontend with:")
    print("   Super Admin: admin@skillforge.com / skillforge2026!")
    print("   Sub Admin: dean@stanfordtech.edu / stanford2026!")
    print("   Student: demo@skillforge.com / skillforge2026!")

if __name__ == "__main__":
    main()
