import requests
import sys
import hmac
import hashlib
import os

BASE_URL = "http://localhost:8000"

def verify_phase3():
    print("=== VERIFYING PHASE 3: RAZORPAY PAYMENT GATEWAY INTEGRATION ===")
    
    sys.path.append('.')
    from database import SessionLocal
    import models
    from auth import create_access_token
    from services.payment_service import verify_razorpay_signature
    
    db = SessionLocal()
    
    # 1. Setup student registration eligible for State level (District score >= 50%)
    print("Setting up test student registration with district_score = 75.0...")
    spec = db.query(models.Specialization).first()
    inst = db.query(models.Institution).first()
    
    learner = db.query(models.User).filter(models.User.email == "test_rzp_learner@skillforge.com").first()
    if not learner:
        learner = models.User(email="test_rzp_learner@skillforge.com", name="Razorpay Learner", hashed_password="hashedpassword", role="learner")
        db.add(learner)
        db.commit()
        db.refresh(learner)
        
    reg = db.query(models.StudentRegistration).filter(models.StudentRegistration.user_id == learner.id).first()
    if not reg:
        reg = models.StudentRegistration(
            user_id=learner.id,
            institution_id=inst.id if inst else 1,
            specialization_id=spec.id if spec else 1,
            district_score=75.0,
            current_tier="District",
            access_status="active"
        )
        db.add(reg)
    else:
        reg.district_score = 75.0
        reg.current_tier = "District"
        reg.access_status = "active"
    db.commit()
    db.refresh(reg)
    reg_id = reg.id
    
    token = create_access_token({"sub": str(learner.id), "role": learner.role})
    headers = {"Authorization": f"Bearer {token}"}
    db.close()
    
    # Test 1: Call POST /api/payments/create-order -> Expect live Razorpay order creation
    print(f"\n--- Test 1: Creating live Razorpay order for State tier (Registration ID {reg_id}) ---")
    order_payload = {"registration_id": reg_id, "target_tier": "State"}
    res_order = requests.post(f"{BASE_URL}/api/payments/create-order", json=order_payload, headers=headers)
    print(f"Status: {res_order.status_code} - Response: {res_order.text}")
    assert res_order.ok, f"Expected 200 OK when creating Razorpay order, got {res_order.status_code}: {res_order.text}"
    order_data = res_order.json()
    
    order_id = order_data["order_id"]
    assert order_id.startswith("order_"), f"Expected order_id to start with 'order_', got {order_id}"
    assert order_data["amount"] == 1770.0, f"Expected amount 1770.0 INR, got {order_data['amount']}"
    assert order_data.get("key_id") == "rzp_test_TDQGFCm2xKMtfk", f"Expected key_id rzp_test_TDQGFCm2xKMtfk, got {order_data.get('key_id')}"
    print(f"Successfully created live Razorpay order: {order_id} for amount {order_data['amount']} INR with key {order_data['key_id']}")
    
    # Test 2: Verify direct unit test of verify_razorpay_signature helper
    print(f"\n--- Test 2: Unit testing HMAC SHA256 signature verification logic ---")
    test_payment_id = "pay_fake123456789"
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "RzXrymAZJUiGKAoDtZsFMV1G")
    payload_str = f"{order_id}|{test_payment_id}"
    valid_signature = hmac.new(
        key_secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    assert verify_razorpay_signature(order_id, test_payment_id, valid_signature) is True, "Expected valid signature to verify True"
    assert verify_razorpay_signature(order_id, test_payment_id, "tampered_sig_1234") is False, "Expected tampered signature to verify False"
    print("HMAC SHA256 unit tests passed successfully.")
    
    # Test 3: Call POST /api/payments/verify with INVALID/tampered signature -> Expect 400 Bad Request
    print(f"\n--- Test 3: Submitting invalid signature to POST /api/payments/verify ---")
    invalid_verify_payload = {
        "registration_id": reg_id,
        "target_tier": "State",
        "order_id": order_id,
        "payment_id": test_payment_id,
        "signature": "invalid_signature_string"
    }
    res_bad_verify = requests.post(f"{BASE_URL}/api/payments/verify", json=invalid_verify_payload, headers=headers)
    print(f"Status: {res_bad_verify.status_code} - Response: {res_bad_verify.text}")
    assert res_bad_verify.status_code == 400, f"Expected 400 Bad Request for invalid signature, got {res_bad_verify.status_code}"
    assert "Invalid payment signature verification" in res_bad_verify.text
    print("Invalid signature rejected properly.")
    
    # Test 4: Call POST /api/payments/verify with VALID HMAC signature -> Expect 200 OK and level unlock
    print(f"\n--- Test 4: Submitting valid signature to POST /api/payments/verify ---")
    valid_verify_payload = {
        "registration_id": reg_id,
        "target_tier": "State",
        "order_id": order_id,
        "payment_id": test_payment_id,
        "signature": valid_signature
    }
    res_verify = requests.post(f"{BASE_URL}/api/payments/verify", json=valid_verify_payload, headers=headers)
    print(f"Status: {res_verify.status_code} - Response: {res_verify.text}")
    assert res_verify.ok, f"Expected 200 OK for valid verification, got {res_verify.status_code}: {res_verify.text}"
    verify_data = res_verify.json()
    assert verify_data["new_tier"] == "State", f"Expected new_tier State, got {verify_data.get('new_tier')}"
    assert verify_data.get("message") == "Payment verified successfully, level unlocked."
    print("Payment verified and State tier unlocked successfully!")
    
    print("\nSUCCESS: All Phase 3 Razorpay Payment Gateway integration tests passed perfectly!")

if __name__ == "__main__":
    verify_phase3()
