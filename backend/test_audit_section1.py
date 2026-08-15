import requests
import json
import csv
import os

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== AUDITING SECTION 1: ADMIN & SUB-ADMIN PANEL ===")
    
    # We will need the admin token first. Assuming seed data has admin@skillforge.com / admin123
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    if admin_login.status_code != 200:
        print("FAILED: Could not log in as admin")
        return
    admin_token = admin_login.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # First get an actual institution ID
    inst_res = requests.get(f"{BASE_URL}/api/institutions")
    if inst_res.status_code == 200 and len(inst_res.json()) > 0:
        inst_id = inst_res.json()[0]['id']
        inst_name = inst_res.json()[0]['name']
    else:
        inst_id = 1
        inst_name = "Unknown"
        
    print("\n1. Main Admin Full Access")
    # Test an admin-only endpoint
    res = requests.get(f"{BASE_URL}/api/admin/reports/system-dashboard", headers=admin_headers)
    print(f"Admin stats endpoint status: {res.status_code}")
    
    print("\n2 & 3. Sub-admin creation & Granular privilege assignment")
    # Create a sub-admin with limited privileges (e.g., only manage_users)
    # Using a random suffix to avoid "Email already in use" if it already exists
    import random
    suffix = random.randint(1000,9999)
    subadmin_data = {
        "email": f"audit_subadmin_{suffix}@skillforge.com",
        "name": "Audit SubAdmin",
        "password": "password123",
        "institution_ids": [inst_id], 
        "privileges": {"manage_users": True, "manage_content": False}
    }
    res_subadmin = requests.post(f"{BASE_URL}/api/admin/subadmins", json=subadmin_data, headers=admin_headers)
    print(f"Create subadmin status: {res_subadmin.status_code}")
    if res_subadmin.status_code in [200, 201]:
        print("Subadmin created successfully.")
        # Log in as subadmin
        sa_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": f"audit_subadmin_{suffix}@skillforge.com", "password": "password123"})
        sa_token = sa_login.json().get("access_token")
        sa_headers = {"Authorization": f"Bearer {sa_token}"}
        
        # Test 1: Action INSIDE privilege set (manage_users) -> get students
        res_allowed = requests.get(f"{BASE_URL}/api/admin/students", headers=sa_headers)
        print(f"Sub-admin action WITH privilege (get students) status: {res_allowed.status_code}")
        
        # Test 2: Action OUTSIDE privilege set (manage_content) -> create live session
        res_denied = requests.post(f"{BASE_URL}/api/communications/live-sessions", json={
            "title": "Hack Session", "host_name": "Hacker", 
            "session_datetime": "2030-01-01T10:00:00Z", "zoom_join_url": "http://zoom", "zoom_meeting_id": "123", "zoom_passcode": "pass", "duration_minutes": 60
        }, headers=sa_headers)
        print(f"Sub-admin action WITHOUT privilege (create live session) status: {res_denied.status_code}")
    
    print(f"\n8. Bulk upload (using real institution {inst_name} ID: {inst_id})")
    # Get a real specialization ID
    spec_res = requests.get(f"{BASE_URL}/api/learning/specializations")
    if spec_res.status_code == 200 and len(spec_res.json()) > 0:
        spec_id = spec_res.json()[0]['id']
    else:
        spec_id = 1
        
    csv_filename = "audit_bulk_upload.csv"
    with open(csv_filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["name", "email", "password", "institution_id", "specialization_id"])
        writer.writerow(["Valid Student", f"valid_bulk_{suffix}@skillforge.com", "pass123", str(inst_id), str(spec_id)])
        writer.writerow(["Invalid Student", "invalid_email", "pass123", str(inst_id), str(spec_id)]) 
    
    with open(csv_filename, 'rb') as f:
        files = {'file': (csv_filename, f, 'text/csv')}
        res_upload = requests.post(f"{BASE_URL}/api/admin/students/bulk-upload", files=files, headers=admin_headers)
        print(f"Bulk upload status: {res_upload.status_code}")
        try:
            print(f"Bulk upload response: {res_upload.json()}")
        except:
            pass

    print("\n4. Institution management with real data segregation")
    if 'sa_headers' in locals():
        res_sa_students = requests.get(f"{BASE_URL}/api/admin/students", headers=sa_headers)
        if res_sa_students.status_code == 200:
            students = res_sa_students.json()
            inst_ids = set(s.get('institution_id') for s in students if 'institution_id' in s)
            print(f"Institutions found in subadmin student list: {inst_ids}")
            # Ensure inst_id is the ONLY one in inst_ids
            if not inst_ids:
                print("No students found.")
            elif len(inst_ids) == 1 and list(inst_ids)[0] == inst_id:
                print(f"Successfully segregated to {inst_id}")
            else:
                print("FAILED segregation check.")
        else:
            print("Could not fetch students for subadmin")

if __name__ == "__main__":
    run_tests()
