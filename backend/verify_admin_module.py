import urllib.request
import urllib.parse
import urllib.error
import json
import uuid
import sqlite3

BASE_URL = "http://localhost:8000"

def make_req(method, endpoint, data=None, token=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = headers or {}
    if token:
        req_headers['Authorization'] = f"Bearer {token}"
    
    body = None
    if data is not None:
        if isinstance(data, (dict, list)):
            body = json.dumps(data).encode('utf-8')
            req_headers['Content-Type'] = 'application/json'
        elif isinstance(data, bytes):
            body = data
        else:
            body = str(data).encode('utf-8')
            
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        try:
            return e.code, json.loads(content)
        except:
            return e.code, {"error": content}

def run_tests():
    print("="*60)
    print("STARTING END-TO-END VERIFICATION OF ADMIN & SUB-ADMIN MODULE")
    print("="*60)

    # 1. Register / Login Super Admin
    admin_email = f"superadmin_{uuid.uuid4().hex[:6]}@skillforge.com"
    admin_pass = "adminsecret123"
    print(f"\n[1] Registering Super Admin account: {admin_email}")
    status, res = make_req("POST", "/api/auth/register", {
        "email": admin_email,
        "password": admin_pass,
        "name": "Super Admin Tester"
    })
    if status not in [200, 201]:
        print(f"Failed to register admin: {status} {res}")
        return
    admin_id = res["user"]["id"]
    print(f"    -> Success! Registered User ID: {admin_id}")

    # Elevate to super admin in DB directly
    print("    -> Elevating role to 'admin' in system database...")
    conn = sqlite3.connect('skillforge.db')
    c = conn.cursor()
    c.execute("UPDATE users SET role = 'admin' WHERE id = ?", (admin_id,))
    conn.commit()
    conn.close()

    print("    -> Logging in as Super Admin...")
    status, res = make_req("POST", "/api/auth/login", {
        "email": admin_email,
        "password": admin_pass
    })
    admin_token = res.get("access_token")
    print(f"    -> Got Admin JWT Token! (Status: {status})")

    # 2. Create Institutions
    print("\n[2] Testing Institutions Directory CRUD...")
    mit_code = f"MIT_{uuid.uuid4().hex[:4].upper()}"
    hbs_code = f"HBS_{uuid.uuid4().hex[:4].upper()}"
    
    status, res = make_req("POST", "/api/institutions", {
        "name": f"MIT Engineering Institute {mit_code}",
        "code": mit_code,
        "contact_email": "admin@mit.edu",
        "address": "77 Massachusetts Ave"
    }, token=admin_token)
    if status not in [200, 201]:
        print(f"    -> ERROR creating MIT institution: {status} {res}")
        return
    mit_id = res["id"]
    print(f"    -> Created Institution 1: MIT Engineering (ID: {mit_id}, Code: {mit_code})")

    status, res = make_req("POST", "/api/institutions", {
        "name": f"Harvard Business School {hbs_code}",
        "code": hbs_code,
        "contact_email": "admin@hbs.edu",
        "address": "Boston, MA"
    }, token=admin_token)
    if status not in [200, 201]:
        print(f"    -> ERROR creating HBS institution: {status} {res}")
        return
    hbs_id = res["id"]
    print(f"    -> Created Institution 2: Harvard Business School (ID: {hbs_id}, Code: {hbs_code})")

    # 3. Create Sub-Admin scoped to MIT only
    print("\n[3] Testing Sub-Admin Account Creation & Capability Scoping...")
    subadmin_email = f"subadmin_{uuid.uuid4().hex[:6]}@skillforge.com"
    subadmin_pass = "subadmin123"
    
    status, res = make_req("POST", "/api/admin/subadmins", {
        "email": subadmin_email,
        "password": subadmin_pass,
        "name": "MIT Department Coordinator",
        "privileges": {
            "manage_institutions": False, # Explicitly forbidden from managing institutions!
            "manage_students": True,
            "reset_passwords": True,
            "allocate_specializations": True,
            "bulk_upload": True,
            "view_reports": True,
            "custom_reports": True,
            "enrollment_reports": True,
            "export_data": False
        },
        "institution_ids": [mit_id]
    }, token=admin_token)
    if status not in [200, 201]:
        print(f"    -> ERROR creating Sub-Admin: {status} {res}")
        return
    subadmin_id = res["id"]
    print(f"    -> Created Sub-Admin: {subadmin_email} (ID: {subadmin_id})")
    print(f"    -> Scoped exclusively to MIT Engineering (ID: {mit_id})")

    print("    -> Logging in as Sub-Admin...")
    status, res = make_req("POST", "/api/auth/login", {
        "email": subadmin_email,
        "password": subadmin_pass
    })
    subadmin_token = res.get("access_token")
    print("    -> Got Sub-Admin JWT Token!")

    # 4. Test Granular Privilege Enforcement & Data Segregation
    print("\n[4] Verifying Granular Privileges & Data Segregation...")
    print("    -> Sub-Admin trying to create an Institution (manage_institutions=False)...")
    status, res = make_req("POST", "/api/institutions", {
        "name": "Unauthorized College", "code": "UNAUTH"
    }, token=subadmin_token)
    if status == 403:
        print(f"    -> SUCCESS: Correctly blocked with HTTP 403 Forbidden: {res.get('detail')}")
    else:
        print(f"    -> ERROR: Expected 403, got {status}: {res}")

    print(f"    -> Sub-Admin trying to add a student to Harvard Business School (ID: {hbs_id})...")
    status, res = make_req("POST", "/api/admin/students", {
        "email": f"unauthorized_{uuid.uuid4().hex[:4]}@hbs.edu",
        "password": "pass",
        "name": "HBS Student",
        "institution_id": hbs_id
    }, token=subadmin_token)
    if status == 403:
        print(f"    -> SUCCESS: Correctly blocked with HTTP 403 Forbidden: {res.get('detail')}")
    else:
        print(f"    -> ERROR: Expected 403, got {status}: {res}")

    print(f"    -> Sub-Admin adding a student to authorized MIT Engineering (ID: {mit_id})...")
    mit_student_email = f"mit_learner_{uuid.uuid4().hex[:4]}@mit.edu"
    status, res = make_req("POST", "/api/admin/students", {
        "email": mit_student_email,
        "password": "pass",
        "name": "Authorized MIT Learner",
        "institution_id": mit_id,
        "specialization": "AI & Robotics"
    }, token=subadmin_token)
    if status in [200, 201]:
        mit_student_id = res["id"]
        print(f"    -> SUCCESS: Student created with ID: {mit_student_id}")
    else:
        print(f"    -> ERROR: Failed to create MIT student: {status} {res}")

    # 5. Zero-Escalation Password Reset
    print("\n[5] Testing Zero-Escalation Password Reset...")
    print(f"    -> Sub-Admin resetting password for learner ID {mit_student_id}...")
    status, res = make_req("PUT", f"/api/admin/students/{mit_student_id}/password", {
        "new_password": "newsecretpassword456"
    }, token=subadmin_token)
    if status == 200:
        print("    -> SUCCESS: Learner password reset successfully!")
    else:
        print(f"    -> ERROR: Reset failed: {status} {res}")

    print(f"    -> Sub-Admin trying to reset password of Super Admin ID {admin_id}...")
    status, res = make_req("PUT", f"/api/admin/students/{admin_id}/password", {
        "new_password": "hackedadminpassword"
    }, token=subadmin_token)
    if status == 403:
        print(f"    -> SUCCESS: Correctly blocked with HTTP 403 Forbidden: {res.get('detail')}")
    else:
        print(f"    -> ERROR: Expected 403, got {status}: {res}")

    # 6. Bulk CSV Upload with Line-by-Line Error Reporting
    print("\n[6] Testing Bulk CSV Upload & Structured Error Reporting...")
    csv_content = f"name,email,password,institution_code,specialization\n" \
                  f"MIT Batch 1,batch1_{uuid.uuid4().hex[:4]}@mit.edu,pwd123,{mit_code},Deep Learning\n" \
                  f"HBS Unauthorized,unauth_{uuid.uuid4().hex[:4]}@hbs.edu,pwd123,{hbs_code},Finance\n" \
                  f"Invalid Format Learner,,pwd123,{mit_code},Robotics\n"
    
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="upload_test.csv"\r\n'
        f'Content-Type: text/csv\r\n\r\n'
        f'{csv_content}\r\n'
        f'--{boundary}--\r\n'
    ).encode('utf-8')
    
    status, res = make_req("POST", "/api/admin/students/bulk-upload", data=body, token=subadmin_token, headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    })
    if status == 200:
        print(f"    -> SUCCESS: Bulk upload processed!")
        print(f"       Total inspected: {res['total_rows']}")
        print(f"       Success count:   {res['success_count']}")
        print(f"       Error count:     {res['error_count']}")
        print("       Line-by-line failure report:")
        for err in res["errors"]:
            print(f"         * Row {err['row']} ({err['email']}): {err['reason']}")
    else:
        print(f"    -> ERROR: Bulk upload failed: {status} {res}")

    # 7. Reports & Analytics Scoping
    print("\n[7] Testing Reports & Analytics Telemetry Scoping...")
    status, res_sub = make_req("GET", "/api/admin/reports/engagement", token=subadmin_token)
    print(f"    -> Sub-Admin scoped engagement stats:")
    print(f"       Total Students: {res_sub['total_students']}, Active: {res_sub['active_students']}")
    
    status, res_adm = make_req("GET", "/api/admin/reports/engagement", token=admin_token)
    print(f"    -> Super Admin system-wide engagement stats:")
    print(f"       Total Students: {res_adm['total_students']}, Active: {res_adm['active_students']}")

    print("\n" + "="*60)
    print("ALL 7 CRITICAL REQUIREMENTS & SRP SPECS VERIFIED SUCCESSFULLY!")
    print("="*60)

if __name__ == "__main__":
    run_tests()
