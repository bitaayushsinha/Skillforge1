import datetime
from fastapi.testclient import TestClient
from main import app, hash_password
from database import SessionLocal
import models

client = TestClient(app)

def test_live_sessions_srp5():
    db = SessionLocal()
    try:
        print("=== STARTING SECTION 5 LIVE SESSIONS VERIFICATION ===")

        # 1. Setup test admin user
        admin_email = "test_srp5_admin@skillforge.com"
        admin_user = db.query(models.User).filter(models.User.email == admin_email).first()
        if not admin_user:
            admin_user = models.User(
                email=admin_email,
                name="SRP5 Admin",
                role="admin",
                hashed_password=hash_password("password123"),
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # 2. Setup two distinct Specializations
        spec1 = db.query(models.Specialization).filter(models.Specialization.name == "SRP5 Spec Alpha").first()
        if not spec1:
            spec1 = models.Specialization(name="SRP5 Spec Alpha", description="Alpha Spec")
            db.add(spec1)
            db.commit()
            db.refresh(spec1)

        spec2 = db.query(models.Specialization).filter(models.Specialization.name == "SRP5 Spec Beta").first()
        if not spec2:
            spec2 = models.Specialization(name="SRP5 Spec Beta", description="Beta Spec")
            db.add(spec2)
            db.commit()
            db.refresh(spec2)

        # 3. Setup two Students enrolled in Spec Alpha and Spec Beta respectively
        s1_email = "srp5_student_alpha@skillforge.com"
        student_alpha = db.query(models.User).filter(models.User.email == s1_email).first()
        if not student_alpha:
            student_alpha = models.User(
                email=s1_email,
                name="Student Alpha",
                role="learner",
                hashed_password=hash_password("password123"),
                is_active=True
            )
            db.add(student_alpha)
            db.commit()
            db.refresh(student_alpha)

        reg_alpha = db.query(models.StudentRegistration).filter(models.StudentRegistration.user_id == student_alpha.id).first()
        if not reg_alpha:
            reg_alpha = models.StudentRegistration(
                user_id=student_alpha.id,
                specialization_id=spec1.id,
                batch_name="Batch-2026",
                registration_number="REG-ALPHA-001"
            )
            db.add(reg_alpha)
            db.commit()

        s2_email = "srp5_student_beta@skillforge.com"
        student_beta = db.query(models.User).filter(models.User.email == s2_email).first()
        if not student_beta:
            student_beta = models.User(
                email=s2_email,
                name="Student Beta",
                role="learner",
                hashed_password=hash_password("password123"),
                is_active=True
            )
            db.add(student_beta)
            db.commit()
            db.refresh(student_beta)

        reg_beta = db.query(models.StudentRegistration).filter(models.StudentRegistration.user_id == student_beta.id).first()
        if not reg_beta:
            reg_beta = models.StudentRegistration(
                user_id=student_beta.id,
                specialization_id=spec2.id,
                batch_name="Batch-2026",
                registration_number="REG-BETA-001"
            )
            db.add(reg_beta)
            db.commit()

        # Login as Admin to get JWT token
        login_res = client.post("/api/auth/login", json={"email": admin_email, "password": "password123"})
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        admin_token = login_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # TEST A: Reject creation of past session date
        past_dt = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)).isoformat()
        res_past = client.post(
            "/api/communications/live-sessions",
            headers=admin_headers,
            json={
                "title": "Past Session Should Fail",
                "host_name": "Admin",
                "session_datetime": past_dt,
                "zoom_join_url": "https://zoom.us/j/111111111"
            }
        )
        assert res_past.status_code == 400, f"Expected 400 for past datetime, got {res_past.status_code}"
        print("[PASS] TEST A: Past session datetime correctly rejected (400 Bad Request)")

        # TEST B: Create Session Alpha targeted ONLY to spec1
        future_alpha_dt = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat()
        res_create_alpha = client.post(
            "/api/communications/live-sessions",
            headers=admin_headers,
            json={
                "title": "Alpha Specialization Live Class",
                "description": "Exclusively for Alpha Spec students",
                "host_name": "Dr. Alpha Instructor",
                "session_datetime": future_alpha_dt,
                "duration_minutes": 90,
                "zoom_join_url": "https://zoom.us/j/999888777?pwd=alphapass",
                "zoom_meeting_id": "999 888 777",
                "zoom_passcode": "alphapass",
                "target_specialization_id": spec1.id
            }
        )
        assert res_create_alpha.status_code == 201, f"Failed to create Alpha session: {res_create_alpha.text}"
        sess_alpha = res_create_alpha.json()
        assert sess_alpha["zoom_join_url"] == "https://zoom.us/j/999888777?pwd=alphapass"
        assert sess_alpha["target_specialization_id"] == spec1.id
        print(f"[PASS] TEST B: Created Alpha Live Class (ID={sess_alpha['id']}) targeting Spec Alpha (ID={spec1.id})")

        # TEST C: Create Session Beta targeted ONLY to spec2
        future_beta_dt = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)).isoformat()
        res_create_beta = client.post(
            "/api/communications/live-sessions",
            headers=admin_headers,
            json={
                "title": "Beta Specialization Workshop",
                "description": "Exclusively for Beta Spec students",
                "host_name": "Prof. Beta Host",
                "session_datetime": future_beta_dt,
                "duration_minutes": 60,
                "zoom_join_url": "https://zoom.us/j/444555666",
                "target_specialization_id": spec2.id
            }
        )
        assert res_create_beta.status_code == 201, f"Failed to create Beta session: {res_create_beta.text}"
        sess_beta = res_create_beta.json()
        print(f"[PASS] TEST C: Created Beta Live Class (ID={sess_beta['id']}) targeting Spec Beta (ID={spec2.id})")

        # TEST D: Verify Student Alpha sees Session Alpha AND DOES NOT see Session Beta
        login_alpha = client.post("/api/auth/login", json={"email": s1_email, "password": "password123"})
        alpha_token = login_alpha.json()["access_token"]
        res_alpha_list = client.get("/api/communications/live-sessions?upcoming_only=true", headers={"Authorization": f"Bearer {alpha_token}"})
        assert res_alpha_list.status_code == 200
        alpha_ids = [s["id"] for s in res_alpha_list.json()]
        assert sess_alpha["id"] in alpha_ids, f"Student Alpha missing their Alpha session: {alpha_ids}"
        assert sess_beta["id"] not in alpha_ids, f"Student Alpha incorrectly sees Beta session! {alpha_ids}"
        print("[PASS] TEST D: Student Alpha sees ONLY Alpha Live Class and is isolated from Beta class")

        # TEST E: Verify Student Beta sees Session Beta AND DOES NOT see Session Alpha
        login_beta = client.post("/api/auth/login", json={"email": s2_email, "password": "password123"})
        beta_token = login_beta.json()["access_token"]
        res_beta_list = client.get("/api/communications/live-sessions?upcoming_only=true", headers={"Authorization": f"Bearer {beta_token}"})
        assert res_beta_list.status_code == 200
        beta_ids = [s["id"] for s in res_beta_list.json()]
        assert sess_beta["id"] in beta_ids, f"Student Beta missing their Beta session: {beta_ids}"
        assert sess_alpha["id"] not in beta_ids, f"Student Beta incorrectly sees Alpha session! {beta_ids}"
        print("[PASS] TEST E: Student Beta sees ONLY Beta Live Class and is isolated from Alpha class")

        # TEST F: Admin updates Session Alpha status to 'live'
        res_update = client.put(
            f"/api/communications/live-sessions/{sess_alpha['id']}",
            headers=admin_headers,
            json={"status": "live"}
        )
        assert res_update.status_code == 200
        assert res_update.json()["status"] == "live"
        print("[PASS] TEST F: Admin updated Session status to 'live'")

        # Clean up test sessions
        client.delete(f"/api/communications/live-sessions/{sess_alpha['id']}", headers=admin_headers)
        client.delete(f"/api/communications/live-sessions/{sess_beta['id']}", headers=admin_headers)
        print("[PASS] CLEANUP: Test live sessions removed")
        print("=== ALL 6 SECTION 5 VERIFICATION TESTS PASSED SUCCESSFULLY ===")

    finally:
        db.close()

if __name__ == "__main__":
    test_live_sessions_srp5()
