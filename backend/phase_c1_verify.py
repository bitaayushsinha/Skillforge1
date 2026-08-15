"""
Phase C1 - End-to-End Verification Script (ASCII-safe for Windows console)
Tests: POC scoping, leaderboard ranking, real data flow
Run from: backend/ directory  with:  python phase_c1_verify.py
"""
import json
import urllib.request
import urllib.error
import sqlite3
import sys
from datetime import datetime

BASE = "http://localhost:8000"
DB_PATH = "skillforge.db"

results_log = []

def log(label, status, detail=""):
    icon = "[PASS]" if status else "[FAIL]"
    msg = f"  {icon}  {label}"
    if detail:
        msg += f"\n         {detail}"
    print(msg)
    results_log.append((label, status, detail))

def api(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        try:
            body_bytes = e.read()
            return json.loads(body_bytes), e.code
        except Exception:
            return None, e.code
    except Exception as e:
        return None, str(e)

def login(email, password):
    data, code = api("POST", "/api/auth/login", {"email": email, "password": password})
    if code == 200 and data:
        return data["access_token"], data["user"]
    return None, None

def create_institution(name, code, token):
    data, code = api("POST", "/api/institutions", {"name": name, "code": code}, token)
    if code in (200, 201) and data:
        return data["id"]
    insts, _ = api("GET", "/api/institutions", token=token)
    for i in (insts or []):
        if i["name"] == name:
            return i["id"]
    return None

def create_subadmin(email, name, password, verify_assessments, institution_ids, token):
    body = {
        "email": email,
        "name": name,
        "password": password,
        "role": "sub_admin",
        "privileges": {
            "manage_institutions": False,
            "manage_students": True,
            "allocate_specializations": False,
            "view_reports": True,
            "reset_passwords": False,
            "bulk_upload": False,
            "manage_content": False,
            "custom_reports": False,
            "enrollment_reports": False,
            "verify_assessments": verify_assessments,
        },
        "institution_ids": institution_ids,
    }
    data, code = api("POST", "/api/admin/subadmins", body, token)
    if code in (200, 201) and data:
        return data["id"]
    subs, _ = api("GET", "/api/admin/subadmins", token=token)
    for s in (subs or []):
        if s["email"] == email:
            return s["id"]
    return None

def get_or_create_student(email, name, password, institution_id, token):
    body = {"email": email, "name": name, "password": password, "institution_id": institution_id}
    data, code = api("POST", "/api/admin/students", body, token)
    if code in (200, 201) and data:
        return data["id"]
    users, _ = api("GET", "/api/admin/users", token=token)
    for u in (users or []):
        if u["email"] == email:
            return u["id"]
    return None

def inject_exam_result(db, student_id, level, score, pass_fail, topic_breakdown=None):
    import uuid
    booking_ref = "C1-TEST-" + uuid.uuid4().hex[:8].upper()
    tb = json.dumps(topic_breakdown) if topic_breakdown else None
    cur = db.cursor()
    cur.execute(
        "INSERT INTO exam_results "
        "(booking_ref, student_id, level, score, pass_fail, topic_breakdown, received_at, verified_by_poc) "
        "VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 0)",
        (booking_ref, student_id, level, score, pass_fail, tb)
    )
    db.commit()
    return cur.lastrowid, booking_ref

def ensure_student_registration(db, user_id, institution_id, cycle_year="2026-2027"):
    cur = db.cursor()
    cur.execute(
        "SELECT id FROM student_registrations WHERE user_id=? AND cycle_year=? AND is_archived=0",
        (user_id, cycle_year)
    )
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE student_registrations SET institution_id=? WHERE id=?", (institution_id, row[0]))
        db.commit()
        return row[0]
    cur.execute("SELECT id FROM specializations LIMIT 1")
    spec_row = cur.fetchone()
    spec_id = spec_row[0] if spec_row else 1
    import uuid
    reg_num = "C1-" + uuid.uuid4().hex[:6].upper()
    cur.execute(
        "INSERT INTO student_registrations "
        "(user_id, institution_id, specialization_id, registration_number, cycle_year, current_tier, "
        "access_status, access_state, is_archived, payment_status) "
        "VALUES (?, ?, ?, ?, ?, 'District', 'active', 'active', 0, 'unpaid')",
        (user_id, institution_id, spec_id, reg_num, cycle_year)
    )
    db.commit()
    return cur.lastrowid


# =============================================================================
print("")
print("=" * 62)
print("  Phase C1 -- End-to-End Verification")
print("=" * 62)
print("")

# --- Step 1: Admin login -------------------------------------------------------
print("-- Step 1: Admin Login " + "-" * 38)
admin_token, admin_user = login("admin@skillforge.com", "admin123")
log("Admin login", bool(admin_token),
    "user_id=" + str(admin_user["id"] if admin_user else "N/A"))
if not admin_token:
    print("ABORT: Cannot continue without admin token")
    sys.exit(1)

# --- Step 2: Create/confirm two institutions -----------------------------------
print("")
print("-- Step 2: Institutions " + "-" * 37)
inst_a_id = create_institution("C1 Alpha Institute", "C1-ALPHA", admin_token)
inst_b_id = create_institution("C1 Beta Academy", "C1-BETA", admin_token)
log("Institution A created/found", bool(inst_a_id), "id=" + str(inst_a_id))
log("Institution B created/found", bool(inst_b_id), "id=" + str(inst_b_id))

# --- Step 3: POC sub-admins ---------------------------------------------------
print("")
print("-- Step 3: POC Users " + "-" * 40)
poc_a_id = create_subadmin(
    "poc_alpha@c1test.com", "POC Alpha", "TestPOC@123",
    verify_assessments=True, institution_ids=[inst_a_id], token=admin_token
)
poc_b_id = create_subadmin(
    "poc_beta@c1test.com", "POC Beta", "TestPOC@123",
    verify_assessments=True, institution_ids=[inst_b_id], token=admin_token
)
log("POC Alpha created/found", bool(poc_a_id), "user_id=" + str(poc_a_id) + " institution=" + str(inst_a_id))
log("POC Beta created/found", bool(poc_b_id), "user_id=" + str(poc_b_id) + " institution=" + str(inst_b_id))

poc_a_tok, poc_a_user = login("poc_alpha@c1test.com", "TestPOC@123")
poc_b_tok, poc_b_user = login("poc_beta@c1test.com", "TestPOC@123")
log("POC Alpha login", bool(poc_a_tok))
log("POC Beta login", bool(poc_b_tok))

poc_a_profile, _ = api("GET", "/api/admin/subadmins/me", token=poc_a_tok)
poc_b_profile, _ = api("GET", "/api/admin/subadmins/me", token=poc_b_tok)
a_va = poc_a_profile and poc_a_profile.get("privileges", {}).get("verify_assessments") is True
b_va = poc_b_profile and poc_b_profile.get("privileges", {}).get("verify_assessments") is True
log("POC Alpha has verify_assessments privilege", a_va)
log("POC Beta has verify_assessments privilege", b_va)

# --- Step 4: Students and exam results ----------------------------------------
print("")
print("-- Step 4: Students & Exam Results " + "-" * 25)
db = sqlite3.connect(DB_PATH)

students_a = [
    ("stu_a1@c1test.com", "Alice A1", 82.0, "Pass"),
    ("stu_a2@c1test.com", "Alice A2", 91.0, "Pass"),
    ("stu_a3@c1test.com", "Alice A3", 47.0, "Fail"),
]
students_b = [
    ("stu_b1@c1test.com", "Bob B1",   55.0, "Pass"),
    ("stu_b2@c1test.com", "Bob B2",   60.0, "Pass"),
    ("stu_b3@c1test.com", "Bob B3",   38.0, "Fail"),
    ("stu_b4@c1test.com", "Bob B4",   72.0, "Pass"),
]

# Institution A avg ~73.3, 2/3 pass
inst_a_user_ids = []
for email, name, score, pf in students_a:
    uid = get_or_create_student(email, name, "TestStu@123", inst_a_id, admin_token)
    if uid:
        ensure_student_registration(db, uid, inst_a_id)
        inject_exam_result(db, uid, "District", score, pf,
                           {"Mathematics": int(score), "Science": int(score - 5)})
        inst_a_user_ids.append(uid)
        log("  Student " + name + " (score=" + str(score) + " " + pf + ")", True, "user_id=" + str(uid))
    else:
        log("  Student " + name, False, "Could not create/find user")

# Institution B avg ~56.25, 3/4 pass
inst_b_user_ids = []
for email, name, score, pf in students_b:
    uid = get_or_create_student(email, name, "TestStu@123", inst_b_id, admin_token)
    if uid:
        ensure_student_registration(db, uid, inst_b_id)
        inject_exam_result(db, uid, "District", score, pf,
                           {"Mathematics": int(score), "Science": int(score + 5)})
        inst_b_user_ids.append(uid)
        log("  Student " + name + " (score=" + str(score) + " " + pf + ")", True, "user_id=" + str(uid))
    else:
        log("  Student " + name, False, "Could not create/find user")

db.close()

# --- Step 5: Leaderboard ranking ----------------------------------------------
print("")
print("-- Step 5: Leaderboard Ranking " + "-" * 30)
lb_data, lb_code = api("GET",
    "/api/analytics/leaderboard?tier=District&metric=avg_score&cycle_year=2026-2027",
    token=admin_token)
log("Leaderboard returns 200", lb_code == 200, "HTTP " + str(lb_code))

if lb_data and lb_data.get("leaderboard"):
    entries = lb_data["leaderboard"]
    found_a = next((e for e in entries if e["institution_id"] == inst_a_id), None)
    found_b = next((e for e in entries if e["institution_id"] == inst_b_id), None)

    log("Institution A appears in leaderboard", bool(found_a),
        ("rank=" + str(found_a["rank"]) + " avg=" + str(found_a["avg_score"])) if found_a else "NOT FOUND")
    log("Institution B appears in leaderboard", bool(found_b),
        ("rank=" + str(found_b["rank"]) + " avg=" + str(found_b["avg_score"])) if found_b else "NOT FOUND")

    if found_a and found_b:
        a_ranks_higher = found_a["rank"] < found_b["rank"]
        log("Institution A ranks higher than B (higher avg score)",
            a_ranks_higher,
            "A rank=" + str(found_a["rank"]) + " avg=" + str(found_a["avg_score"]) +
            " | B rank=" + str(found_b["rank"]) + " avg=" + str(found_b["avg_score"]))

    print("")
    print("  Full District leaderboard (avg_score sorted):")
    for e in entries:
        marker = " <-- A" if e["institution_id"] == inst_a_id else (" <-- B" if e["institution_id"] == inst_b_id else "")
        print("    #" + str(e["rank"]) + " " + e["institution_name"] +
              ": avg=" + str(e["avg_score"]) +
              " pass_rate=" + str(e["pass_rate"]) + "%" +
              " (" + str(e["total_passed"]) + "/" + str(e["total_students"]) + ")" + marker)
else:
    log("Leaderboard has entries", False, "Response: " + str(lb_data))

# --- Step 6: own_institution_id scoping ---------------------------------------
print("")
print("-- Step 6: own_institution_id Scoping " + "-" * 22)
lb_poc_a, _ = api("GET",
    "/api/analytics/leaderboard?tier=District&metric=avg_score&cycle_year=2026-2027",
    token=poc_a_tok)
lb_poc_b, _ = api("GET",
    "/api/analytics/leaderboard?tier=District&metric=avg_score&cycle_year=2026-2027",
    token=poc_b_tok)

own_a = lb_poc_a.get("own_institution_id") if lb_poc_a else None
own_b = lb_poc_b.get("own_institution_id") if lb_poc_b else None
log("POC Alpha own_institution_id == inst_a_id", own_a == inst_a_id,
    "got=" + str(own_a) + " expected=" + str(inst_a_id))
log("POC Beta own_institution_id == inst_b_id", own_b == inst_b_id,
    "got=" + str(own_b) + " expected=" + str(inst_b_id))

# --- Step 7: POC sees only own institution students ---------------------------
print("")
print("-- Step 7: POC Institution Scoping " + "-" * 25)
poc_a_students, code_a = api("GET", "/api/admin/poc/students?cycle_year=2026-2027", token=poc_a_tok)
poc_b_students, code_b = api("GET", "/api/admin/poc/students?cycle_year=2026-2027", token=poc_b_tok)

log("POC Alpha can fetch students (200)", code_a == 200,
    "HTTP " + str(code_a) + " count=" + str(len(poc_a_students or [])))
log("POC Beta can fetch students (200)", code_b == 200,
    "HTTP " + str(code_b) + " count=" + str(len(poc_b_students or [])))

a_returned_uids = set(s["user_id"] for s in (poc_a_students or []))
b_returned_uids = set(s["user_id"] for s in (poc_b_students or []))

a_test_visible = [uid for uid in inst_a_user_ids if uid in a_returned_uids]
b_test_visible = [uid for uid in inst_b_user_ids if uid in b_returned_uids]
a_sees_no_b    = not any(uid in a_returned_uids for uid in inst_b_user_ids)
b_sees_no_a    = not any(uid in b_returned_uids for uid in inst_a_user_ids)

log("POC Alpha sees all Institution A test students",
    len(a_test_visible) == len(inst_a_user_ids),
    "visible=" + str(len(a_test_visible)) + "/" + str(len(inst_a_user_ids)))
log("POC Alpha does NOT see Institution B students", a_sees_no_b)
log("POC Beta sees all Institution B test students",
    len(b_test_visible) == len(inst_b_user_ids),
    "visible=" + str(len(b_test_visible)) + "/" + str(len(inst_b_user_ids)))
log("POC Beta does NOT see Institution A students", b_sees_no_a)

# --- Step 8: Cross-institution access denied ----------------------------------
print("")
print("-- Step 8: Cross-Institution Access Denial " + "-" * 18)
if inst_b_user_ids:
    b_uid = inst_b_user_ids[0]
    _, cross_code = api("GET", "/api/admin/poc/results/student/" + str(b_uid), token=poc_a_tok)
    log("POC Alpha blocked from Institution B student results (403)",
        cross_code == 403, "HTTP " + str(cross_code))

if inst_a_user_ids:
    a_uid = inst_a_user_ids[0]
    _, cross_code2 = api("GET", "/api/admin/poc/results/student/" + str(a_uid), token=poc_b_tok)
    log("POC Beta blocked from Institution A student results (403)",
        cross_code2 == 403, "HTTP " + str(cross_code2))

# --- Step 9: Legitimate access and verification -------------------------------
print("")
print("-- Step 9: Legitimate Access & Verify Action " + "-" * 15)
if inst_a_user_ids:
    a_uid = inst_a_user_ids[0]
    results_data, results_code = api("GET",
        "/api/admin/poc/results/student/" + str(a_uid), token=poc_a_tok)
    log("POC Alpha reads Institution A results (200)",
        results_code == 200 and isinstance(results_data, list),
        "HTTP " + str(results_code) + " count=" + str(len(results_data or [])))

    if results_data:
        # Find the C1-TEST result we injected for this student
        c1_result = next((r for r in results_data if r.get("booking_ref", "").startswith("C1-TEST")), results_data[0])
        result_id = c1_result["id"]
        initial_verified = c1_result.get("verified_by_poc", False)
        log("verified_by_poc field present in result",
            "verified_by_poc" in c1_result)

        # Verify it
        verify_resp, verify_code = api("POST",
            "/api/admin/poc/results/" + str(result_id) + "/verify", token=poc_a_tok)
        log("POC Alpha verify action returns 200",
            verify_code == 200, "HTTP " + str(verify_code))

        if verify_resp:
            new_verified = verify_resp.get("verified_by_poc", False)
            log("verified_by_poc toggled True after verify",
                new_verified is True,
                "before=" + str(initial_verified) + " after=" + str(new_verified))
            log("verified_by_id set to POC Alpha's user_id",
                verify_resp.get("verified_by_id") == poc_a_id,
                "verified_by_id=" + str(verify_resp.get("verified_by_id")) + " poc_a_id=" + str(poc_a_id))

            # Cross-institution verify: POC Alpha tries to verify Institution B result
            if inst_b_user_ids:
                b_results, _ = api("GET",
                    "/api/admin/poc/results/student/" + str(inst_b_user_ids[0]), token=poc_b_tok)
                if b_results:
                    b_result_id = next(
                        (r["id"] for r in b_results if r.get("booking_ref", "").startswith("C1-TEST")),
                        b_results[0]["id"]
                    )
                    _, cross_v_code = api("POST",
                        "/api/admin/poc/results/" + str(b_result_id) + "/verify", token=poc_a_tok)
                    log("POC Alpha blocked from verifying Institution B result (403)",
                        cross_v_code == 403, "HTTP " + str(cross_v_code))

# --- Step 10: Unauthenticated blocked -----------------------------------------
print("")
print("-- Step 10: Unauthenticated Access Blocked " + "-" * 18)
_, unauth_code = api("GET", "/api/admin/poc/students")
log("Unauthenticated /poc/students returns 401",
    unauth_code == 401, "HTTP " + str(unauth_code))

# --- Step 11: Leaderboard reflects new live result immediately ----------------
print("")
print("-- Step 11: Leaderboard Live Aggregation " + "-" * 19)
lb_before, _ = api("GET",
    "/api/analytics/leaderboard?tier=District&metric=avg_score&cycle_year=2026-2027",
    token=admin_token)
b_before = next((e for e in (lb_before or {}).get("leaderboard", []) if e["institution_id"] == inst_b_id), None)
count_before = b_before["total_students"] if b_before else 0
avg_before = b_before["avg_score"] if b_before else 0

# Inject a 99.0 score result for Institution B (simulating a real exam completion)
if inst_b_user_ids:
    db = sqlite3.connect(DB_PATH)
    inject_exam_result(db, inst_b_user_ids[0], "District", 99.0, "Pass",
                       {"Mathematics": 99, "Science": 99})
    db.close()

lb_after, _ = api("GET",
    "/api/analytics/leaderboard?tier=District&metric=avg_score&cycle_year=2026-2027",
    token=admin_token)
b_after = next((e for e in (lb_after or {}).get("leaderboard", []) if e["institution_id"] == inst_b_id), None)
count_after = b_after["total_students"] if b_after else 0
avg_after = b_after["avg_score"] if b_after else 0

log("Leaderboard total_students increases after new result",
    count_after > count_before,
    "B total_students: before=" + str(count_before) + " after=" + str(count_after))
log("Leaderboard avg_score changes after new high score",
    avg_after != avg_before,
    "B avg: before=" + str(avg_before) + " after=" + str(avg_after))

# --- Final Summary ------------------------------------------------------------
print("")
print("=" * 62)
print("  RESULTS SUMMARY")
print("=" * 62)
passed = sum(1 for _, s, _ in results_log if s)
failed = sum(1 for _, s, _ in results_log if not s)

for label, status, detail in results_log:
    icon = "[PASS]" if status else "[FAIL]"
    print("  " + icon + "  " + label)
    if not status and detail:
        print("         -> " + detail)

print("")
print("  TOTAL: " + str(passed) + " passed, " + str(failed) + " failed out of " + str(len(results_log)) + " checks")
if failed == 0:
    print("")
    print("  *** ALL CHECKS PASSED - both features fully functional with real data ***")
    print("")
else:
    print("")
    print("  WARNING: " + str(failed) + " check(s) failed - see details above")
    print("")
