import requests
import sys

BASE_URL = "http://localhost:8000"

def verify_phase4d():
    print("=== VERIFYING PHASE 4d: CSV EXPORT ENDPOINTS ===")
    
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json().get("access_token")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    endpoints = [
        "/api/admin/reports/enrollment/csv",
        "/api/admin/reports/progression/csv",
        "/api/admin/reports/export/csv",
        "/api/admin/analytics/enrollment/csv",
        "/api/admin/analytics/progression/csv",
        "/api/admin/analytics/export/csv"
    ]
    
    for ep in endpoints:
        print(f"\nTesting endpoint: {ep}")
        res = requests.get(f"{BASE_URL}{ep}", headers=headers)
        print(f"Status Code: {res.status_code}")
        assert res.status_code == 200, f"Expected 200 OK for {ep}, got {res.status_code}: {res.text}"
        content_type = res.headers.get("Content-Type")
        content_disp = res.headers.get("Content-Disposition")
        print(f"Content-Type: {content_type}")
        print(f"Content-Disposition: {content_disp}")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        assert "attachment" in str(content_disp), f"Expected attachment in Content-Disposition, got {content_disp}"
        lines = res.text.strip().split('\n')
        print(f"Total CSV lines exported: {len(lines)}")
        assert len(lines) >= 1, "CSV should contain at least the header row"
        print(f"Header row: {lines[0]}")
        
    print("\nSUCCESS: Phase 4d CSV Export Endpoints verified perfectly across both reporting & analytics modules!")

if __name__ == "__main__":
    verify_phase4d()
