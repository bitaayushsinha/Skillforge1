import requests
import json

BASE_URL = "http://localhost:8000/api/v1/exam-engine"

def verify_phase5():
    # 1. Fetch active and suspended sessions (what LiveSessionMonitor does on load)
    print("Fetching active/suspended sessions for Admin Dashboard...")
    sessions_res = requests.get(f"{BASE_URL}/admin/sessions")
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    print(f"Found {len(sessions)} active/suspended sessions.")
    
    if len(sessions) > 0:
        session = sessions[0]
        print(f"Sample session: ref={session['session_ref']}, status={session['status']}, student={session['student_name']}")
        
        # 2. Fetch violations for the selected session (what happens when admin clicks a row)
        session_ref = session['session_ref']
        print(f"\nFetching violations for session {session_ref}...")
        violations_res = requests.get(f"{BASE_URL}/admin/sessions/{session_ref}/violations")
        assert violations_res.status_code == 200
        violations = violations_res.json()
        print(f"Found {len(violations)} violations.")
        if len(violations) > 0:
            print(f"Latest violation: {violations[0]['violation_type']} - {violations[0]['message']}")
    
    print("\n✅ Phase 5 (Admin Dashboard UI API integration) verified successfully.")

if __name__ == "__main__":
    verify_phase5()
