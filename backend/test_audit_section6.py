import requests
import datetime
import uuid
import sys
import json
import re

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== AUDITING SECTION 6: CERTIFICATIONS ===")
    
    # Check if there is any blockchain logic in certificate_service.py
    has_blockchain = False
    has_ipfs = False
    has_public_verification = False
    try:
        with open('services/certificate_service.py', 'r', encoding='utf-8') as f:
            content = f.read()
            if 'blockchain' in content.lower() or 'web3' in content.lower() or 'smart contract' in content.lower():
                has_blockchain = True
            if 'ipfs' in content.lower():
                has_ipfs = True
            
        with open('routes/certificates.py', 'r', encoding='utf-8') as f:
            content = f.read()
            if '@router.get("/verify/' in content:
                has_public_verification = True
    except Exception as e:
        print(f"Error reading source files: {e}")
        
    print(f"\n1. Source Code Inspection")
    print(f"Blockchain logic found: {has_blockchain}")
    print(f"IPFS logic found: {has_ipfs}")
    print(f"Public Verification Endpoint found: {has_public_verification}")

    # 2. Test the API directly
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@skillforge.com", "password": "admin123"})
    admin_token = admin_login.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Use existing test student 50 or generate a new one
    sys.path.append('.')
    from database import SessionLocal
    import models
    db = SessionLocal()
    student = db.query(models.User).filter(models.User.role == "student").first()
    student_id = student.id if student else 1
    
    payload = {
        "user_id": student_id,
        "type": "participation",
        "description": "Test Certificate for Audit",
        "title": "Audit Cert"
    }
    
    gen_res = requests.post(f"{BASE_URL}/api/certificates/generate", json=payload, headers=admin_headers)
    print(f"\n2. Cert Generation Status: {gen_res.status_code}")
    if gen_res.status_code == 201:
        cert = gen_res.json()
        print("Certificate successfully generated.")
        print(f"Certificate ID: {cert.get('id')}")
        print(f"Blockchain ID present: {bool(cert.get('blockchain_id'))}")
        print(f"IPFS Hash present: {bool(cert.get('ipfs_hash'))}")
        
        # We already know there is no public verification endpoint, but let's check what the frontend has
        print("VULNERABILITY / MISSING FEATURE: There is no public-facing /verify endpoint in the backend to validate these certificates externally.")
    
    db.close()

if __name__ == "__main__":
    run_tests()
