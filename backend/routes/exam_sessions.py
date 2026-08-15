from fastapi import APIRouter, Depends, HTTPException, status, Response

from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import datetime
import random

router = APIRouter(prefix="/api/v1/exam-engine", tags=["Exam Engine Core API"])

@router.get("/sessions/{temp_user_id}")
def get_session_info(temp_user_id: str, db: Session = Depends(get_db)):
    """Get session info for the frontend exam portal compliance page."""
    cred = db.query(models.ExamCredential).filter(models.ExamCredential.temp_user_id == temp_user_id).first()
    if not cred or cred.status != "issued":
        raise HTTPException(status_code=403, detail="Invalid or non-issued credential")
        
    session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    subject = db.query(models.Subject).filter(models.Subject.id == session.subject_id).first()
    student = db.query(models.User).filter(models.User.id == session.student_id).first()
    config = db.query(models.ExamConfig).filter(
        models.ExamConfig.subject_id == session.subject_id,
        models.ExamConfig.level == session.level
    ).first()
    
    return {
        "status": session.status,
        "subject_name": subject.name if subject else "Unknown Subject",
        "level": session.level,
        "student_name": student.name if student else "Unknown Student",
        "requires_screenshare": config.requires_screenshare if config else False
    }

@router.post("/sessions/{temp_user_id}/start", response_model=schemas.ExamStartResponse)
def start_exam_session(temp_user_id: str, db: Session = Depends(get_db)):
    """Starts the exam, sets start_time, and returns the randomized question set."""
    cred = db.query(models.ExamCredential).filter(models.ExamCredential.temp_user_id == temp_user_id).first()
    if not cred or cred.status != "issued":
        raise HTTPException(status_code=403, detail="Invalid or non-issued credential")
        
    session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status != "pending" and session.status != "active":
        raise HTTPException(status_code=400, detail=f"Session is {session.status}, cannot start")

    # Enforce StudentRegistration Lockout, Cooldown, and Tier Gates
    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == session.student_id
    ).order_by(models.StudentRegistration.id.desc()).first()

    if registration:
        if getattr(registration, "is_locked", False) or registration.access_state == "locked_out":
            raise HTTPException(status_code=403, detail="Maximum exam attempts reached. Registration locked out for mentor intervention.")
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        cooldown_dt = getattr(registration, "cooldown_until", None)
        if cooldown_dt and cooldown_dt > now_utc:
            raise HTTPException(status_code=403, detail=f"Re-attempt cooldown active until {cooldown_dt.isoformat()}.")

        tier_ranks = {"District": 1, "State": 2, "National": 3}
        current_rank = tier_ranks.get((registration.current_tier or "District").strip().capitalize(), 1)
        req_rank = tier_ranks.get((session.level or "District").strip().capitalize(), 1)
        if req_rank > current_rank:
            raise HTTPException(status_code=403, detail=f"Access denied: Prerequisite tier not completed. Current tier is '{registration.current_tier}', but session requires '{session.level}'.")
        
    # Get Exam Config
    config = db.query(models.ExamConfig).filter(
        models.ExamConfig.subject_id == session.subject_id,
        models.ExamConfig.level == session.level
    ).first()
    
    duration = config.duration_minutes if config else 60
    question_count = config.question_count if config else 60
    
    # Generate question set if not already generated
    if not session.question_set:
        banks = db.query(models.QuestionBank).filter(
            models.QuestionBank.subject_id == session.subject_id,
            models.QuestionBank.level == session.level,
            models.QuestionBank.bank_type == "formal",
            models.QuestionBank.is_active == True
        ).all()
        
        bank_ids = [b.id for b in banks]
        all_questions = db.query(models.Question).filter(models.Question.bank_id.in_(bank_ids)).all()
        
        if not all_questions:
            # Fallback if no specific bank exists
            all_questions = db.query(models.Question).all()
            
        if config and not config.randomize_questions:
            selected = all_questions[:question_count]
        else:
            selected = random.sample(all_questions, min(len(all_questions), question_count))
        session.question_set = [q.id for q in selected]
        
    # Mark as active
    session.status = "active"
    if not session.start_time:
        session.start_time = datetime.datetime.utcnow()
        session.remaining_duration = duration * 60
        
    db.commit()
    
    # Fetch questions
    questions = db.query(models.Question).filter(models.Question.id.in_(session.question_set)).all()
    # Ensure they are in the generated order
    q_dict = {q.id: q for q in questions}
    ordered_questions = [q_dict[qid] for qid in session.question_set if qid in q_dict]
    
    payloads = [
        schemas.ExamQuestionPayload(id=q.id, text=q.text, options=q.options) 
        for q in ordered_questions
    ]
    # Fetch previous answers
    answers = db.query(models.ExamAnswer).filter(models.ExamAnswer.session_id == session.id).all()
    prev_answers = [{"question_id": a.question_id, "answer": a.answer} for a in answers]
    
    # Recalculate remaining duration
    start_dt = session.start_time
    if isinstance(start_dt, str):
        # sqlite might return string if not parsed properly by SQLAlchemy in some edge cases
        start_dt = datetime.datetime.fromisoformat(start_dt)
        
    elapsed = (datetime.datetime.utcnow() - start_dt.replace(tzinfo=None)).total_seconds()
    remaining_seconds = int(max(0, duration * 60 - elapsed))
    
    return {
        "session_ref": session.session_ref,
        "duration_minutes": duration,
        "remaining_seconds": remaining_seconds,
        "questions": payloads,
        "previous_answers": prev_answers,
        "start_time": session.start_time
    }

@router.post("/sessions/{temp_user_id}/answers")
def save_answer(temp_user_id: str, request: schemas.ExamAnswerRequest, db: Session = Depends(get_db)):
    """Save an answer during the exam."""
    cred = db.query(models.ExamCredential).filter(models.ExamCredential.temp_user_id == temp_user_id).first()
    if not cred or cred.status != "issued":
        raise HTTPException(status_code=403, detail="Invalid credential")
        
    session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Exam is not currently active")
        
    config = db.query(models.ExamConfig).filter(
        models.ExamConfig.subject_id == session.subject_id,
        models.ExamConfig.level == session.level
    ).first()
    duration = config.duration_minutes if config else 60
    
    start_dt = session.start_time
    if isinstance(start_dt, str):
        start_dt = datetime.datetime.fromisoformat(start_dt)
        
    elapsed = (datetime.datetime.utcnow() - start_dt.replace(tzinfo=None)).total_seconds()
    
    # 15 second grace period for latency
    if elapsed > (duration * 60) + 15:
        raise HTTPException(status_code=403, detail="Time limit exceeded. Exam must be submitted.")
        
    # Check if answer exists
    existing = db.query(models.ExamAnswer).filter(
        models.ExamAnswer.session_id == session.id,
        models.ExamAnswer.question_id == request.question_id
    ).first()
    
    if existing:
        existing.answer = request.answer
    else:
        new_ans = models.ExamAnswer(
            session_id=session.id,
            question_id=request.question_id,
            answer=request.answer
        )
        db.add(new_ans)
        
    db.commit()
    return {"success": True}

@router.post("/sessions/{temp_user_id}/violations")
def log_violation(temp_user_id: str, request: schemas.ViolationCreate, db: Session = Depends(get_db)):
    """Log a proctoring violation and auto-suspend if threshold exceeded."""
    cred = db.query(models.ExamCredential).filter(models.ExamCredential.temp_user_id == temp_user_id).first()
    if not cred or cred.status != "issued":
        raise HTTPException(status_code=403, detail="Invalid credential")
        
    session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
    
    violation = models.ExamViolationLog(
        session_id=session.id,
        violation_time=datetime.datetime.utcnow().isoformat(),
        violation_type=request.type,
        message=request.message,
        severity=request.severity
    )
    db.add(violation)
    db.commit()
    
    # Check for auto-suspension
    config = db.query(models.ExamConfig).filter(
        models.ExamConfig.subject_id == session.subject_id,
        models.ExamConfig.level == session.level
    ).first()
    max_v = config.max_violations if config else 3
    
    current_violations = db.query(models.ExamViolationLog).filter(
        models.ExamViolationLog.session_id == session.id,
        models.ExamViolationLog.severity > 0
    ).count()
    if current_violations >= max_v and session.status == "active":
        session.status = "suspended"
        session.suspended_at = datetime.datetime.utcnow()
        
        audit = models.ExamAuditLog(
            session_id=session.id,
            action="session_suspended",
            description=f"Auto-suspended due to exceeding max violations ({max_v})",
            actor_id="System"
        )
        db.add(audit)
        db.commit()
        return {"success": True, "status": "suspended", "message": "Max violations reached. Session suspended."}
        
    return {"success": True, "status": session.status}

@router.post("/sessions/{temp_user_id}/suspend")
def suspend_exam(temp_user_id: str, request: schemas.ViolationCreate, db: Session = Depends(get_db)):
    """Suspend the exam due to critical violation."""
    cred = db.query(models.ExamCredential).filter(models.ExamCredential.temp_user_id == temp_user_id).first()
    if not cred or cred.status != "issued":
        raise HTTPException(status_code=403, detail="Invalid credential")
        
    session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
    
    # Log the critical violation first
    violation = models.ExamViolationLog(
        session_id=session.id,
        violation_time=datetime.datetime.utcnow().isoformat(),
        violation_type=request.type,
        message=f"CRITICAL SUSPENSION: {request.message}"
    )
    db.add(violation)
    
    session.status = "suspended"
    session.suspended_at = datetime.datetime.utcnow()
    
    audit = models.ExamAuditLog(
        session_id=session.id,
        action="session_suspended",
        description=f"Auto-suspended due to {request.type}",
        actor_id="System"
    )
    db.add(audit)
    
    db.commit()
    return {"success": True, "status": "suspended"}

@router.get("/sessions/{temp_user_id}/status")
def get_session_status(temp_user_id: str, db: Session = Depends(get_db)):
    """Poll for session status (used when suspended to check if resumed)."""
    cred = db.query(models.ExamCredential).filter(models.ExamCredential.temp_user_id == temp_user_id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Not found")
    session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
    
    if cred.status == "expired":
        return {"status": "expired", "message": "Credential has expired."}
        
    if session.status == "suspended":
        last_violation = db.query(models.ExamViolationLog).filter(
            models.ExamViolationLog.session_id == session.id
        ).order_by(models.ExamViolationLog.id.desc()).first()
        v_msg = last_violation.message if last_violation else "Violation detected."
        return {"status": "suspended", "message": f"Suspended: {v_msg}"}
        
    if session.status == "terminated":
        return {"status": "terminated", "message": "Exam session was terminated."}
        
    if session.status == "active":
        config = db.query(models.ExamConfig).filter(
            models.ExamConfig.subject_id == session.subject_id,
            models.ExamConfig.level == session.level
        ).first()
        duration = config.duration_minutes if config else 60
        start_dt = session.start_time
        if isinstance(start_dt, str):
            start_dt = datetime.datetime.fromisoformat(start_dt)
        elapsed = (datetime.datetime.utcnow() - start_dt.replace(tzinfo=None)).total_seconds()
        remaining_seconds = int(max(0, duration * 60 - elapsed))
        return {"status": session.status, "cred_status": cred.status, "remaining_seconds": remaining_seconds}
        
    return {"status": session.status, "cred_status": cred.status}

@router.post("/admin/sessions/{session_ref}/resume")
def admin_resume_session(session_ref: str, db: Session = Depends(get_db)):
    """Admin endpoint to resume a suspended session and restore time."""
    session = db.query(models.ExamSession).filter(models.ExamSession.session_ref == session_ref).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status == "suspended" and session.suspended_at and session.start_time:
        suspended_at = session.suspended_at
        if isinstance(suspended_at, str):
            suspended_at = datetime.datetime.fromisoformat(suspended_at)
            
        start_dt = session.start_time
        if isinstance(start_dt, str):
            start_dt = datetime.datetime.fromisoformat(start_dt)
            
        time_lost = datetime.datetime.utcnow() - suspended_at.replace(tzinfo=None)
        
        # Restore time by moving start_time forward
        session.start_time = start_dt + time_lost
        
    session.status = "active"
    session.suspended_at = None
    
    audit = models.ExamAuditLog(
        session_id=session.id,
        action="admin_approved_resume",
        description="Admin cleared violations, restored time, and resumed session.",
        actor_id="Admin"
    )
    db.add(audit)
    
    db.commit()
    return {"success": True, "status": "active"}

@router.get("/admin/sessions")
def admin_get_live_sessions(db: Session = Depends(get_db)):
    """Admin endpoint to fetch all active and suspended sessions."""
    sessions = db.query(models.ExamSession).filter(
        models.ExamSession.status.in_(["active", "suspended"])
    ).order_by(models.ExamSession.start_time.desc()).all()
    
    res = []
    for s in sessions:
        user = db.query(models.User).filter(models.User.id == s.student_id).first()
        res.append({
            "session_ref": s.session_ref,
            "student_name": user.name if user else "Unknown",
            "subject_id": s.subject_id,
            "level": s.level,
            "status": s.status,
            "start_time": s.start_time,
            "suspended_at": s.suspended_at,
            "termination_reason": s.termination_reason,
            "resume_approved_by": s.resume_approved_by,
            "resume_approved_at": s.resume_approved_at
        })
    return res

@router.get("/admin/sessions/{session_ref}/violations")
def admin_get_session_violations(session_ref: str, db: Session = Depends(get_db)):
    """Admin endpoint to fetch violation logs for a specific session."""
    session = db.query(models.ExamSession).filter(models.ExamSession.session_ref == session_ref).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    logs = db.query(models.ExamViolationLog).filter(
        models.ExamViolationLog.session_id == session.id
    ).order_by(models.ExamViolationLog.id.desc()).all()
    
    return logs

import urllib.request
import json

from fastapi import BackgroundTasks

def send_webhook(url, payload):
    try:
        import urllib.request, json, os, hmac, hashlib
        body_bytes = json.dumps(payload).encode('utf-8')
        secret = os.getenv("EXAM_ENGINE_WEBHOOK_SECRET", "skillforge_dummy_secret")
        sig = hmac.new(secret.encode('utf-8'), body_bytes, hashlib.sha256).hexdigest()
        req = urllib.request.Request(url, data=body_bytes, headers={
            'Content-Type': 'application/json', 
            'X-Webhook-Secret': secret,
            'X-Exam-Engine-Signature': sig
        })
        urllib.request.urlopen(req, timeout=5)
        print("Webhook sent successfully!")
    except Exception as e:
        print(f"WEBHOOK SEND FAILED: {str(e)}")

@router.post("/sessions/{temp_user_id}/submit", response_model=schemas.ExamSubmitResponse)
def submit_exam(temp_user_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Submit the exam, calculate score, and send SRP webhook."""
    cred = db.query(models.ExamCredential).filter(models.ExamCredential.temp_user_id == temp_user_id).first()
    if not cred or cred.status != "issued":
        raise HTTPException(status_code=403, detail="Invalid credential")
        
    session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
    if session.status not in ["active", "suspended"]:
        raise HTTPException(status_code=400, detail="Exam cannot be submitted in its current state")
        
    session.status = "completed"
    cred.status = "used"
    
    # Calculate score & topic breakdown
    questions = db.query(models.Question).filter(models.Question.id.in_(session.question_set)).all() if session.question_set else []
    q_dict = {q.id: q for q in questions}
    answers = db.query(models.ExamAnswer).filter(models.ExamAnswer.session_id == session.id).all()
    ans_dict = {a.question_id: a.answer for a in answers}
    
    correct = 0
    total = len(session.question_set) if session.question_set else 1
    topic_stats = {}
    correct_vs_selected = {}
    
    for qid in (session.question_set or []):
        q = q_dict.get(qid)
        if not q:
            continue
        t_tag = getattr(q, "topic_tag", None) or "General"
        if t_tag not in topic_stats:
            topic_stats[t_tag] = {"correct": 0, "total": 0}
        topic_stats[t_tag]["total"] += 1
        
        user_ans = ans_dict.get(qid)
        is_corr = (user_ans is not None and user_ans == q.correct_answer)
        if is_corr:
            correct += 1
            topic_stats[t_tag]["correct"] += 1
        correct_vs_selected[str(qid)] = {
            "selected": user_ans,
            "correct": q.correct_answer,
            "is_correct": is_corr
        }
            
    score_percentage = round((correct / total) * 100, 2)
    
    tier = (session.level or "District").strip().capitalize()
    if tier == "District":
        passed = score_percentage >= 50.0
    elif tier == "State":
        passed = score_percentage >= 60.0
    elif tier == "National":
        passed = score_percentage >= 80.0
    else:
        passed = score_percentage >= 50.0
    
    topic_breakdown = {}
    for tag, st in topic_stats.items():
        acc = round((st["correct"] / st["total"]) * 100, 1) if st["total"] > 0 else 0.0
        topic_breakdown[tag] = {
            "correct": st["correct"],
            "total": st["total"],
            "accuracy": acc
        }
    
    db.commit()
    
    # Send SRP Webhook via background task matching ResultPayload exactly
    payload = {
        "booking_reference": session.booking_ref,
        "exam_engine_session_ref": session.session_ref,
        "student_id": session.student_id,
        "subject_id": session.subject_id,
        "level": session.level,
        "score": score_percentage,
        "pass_fail": "pass" if passed else "fail",
        "topic_breakdown": topic_breakdown,
        "correct_vs_selected": correct_vs_selected,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    
    url = "http://localhost:8000/api/webhooks/exam-engine/result"
    background_tasks.add_task(send_webhook, url, payload)
        
    return {
        "success": True,
        "score_percentage": score_percentage,
        "passed": passed,
        "message": "Exam submitted successfully.",
        "topic_breakdown": topic_breakdown,
        "level": session.level
    }

@router.post("/admin/sweep-expired-sessions")
def sweep_expired_sessions(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Sweep sessions that have passed their credential expiration time and were not submitted."""
    now = datetime.datetime.utcnow()
    
    creds = db.query(models.ExamCredential).filter(
        models.ExamCredential.expires_at < now,
        models.ExamCredential.status.in_(["issued", "active", "expired"])
    ).all()
    
    count = 0
    for cred in creds:
        session = db.query(models.ExamSession).filter(models.ExamSession.id == cred.session_id).first()
        if session and session.status in ["pending", "active", "suspended"]:
            session.status = "terminated"
            cred.status = "expired"
            
            questions = db.query(models.Question).filter(models.Question.id.in_(session.question_set)).all() if session.question_set else []
            q_dict = {q.id: q for q in questions}
            answers = db.query(models.ExamAnswer).filter(models.ExamAnswer.session_id == session.id).all()
            ans_dict = {a.question_id: a.answer for a in answers}
            
            correct = 0
            total = len(session.question_set) if session.question_set else 1
            topic_stats = {}
            correct_vs_selected = {}
            for qid in (session.question_set or []):
                q = q_dict.get(qid)
                if not q:
                    continue
                t_tag = getattr(q, "topic_tag", None) or "General"
                if t_tag not in topic_stats:
                    topic_stats[t_tag] = {"correct": 0, "total": 0}
                topic_stats[t_tag]["total"] += 1
                u_ans = ans_dict.get(qid)
                is_corr = (u_ans is not None and u_ans == q.correct_answer)
                if is_corr:
                    correct += 1
                    topic_stats[t_tag]["correct"] += 1
                correct_vs_selected[str(qid)] = {
                    "selected": u_ans,
                    "correct": q.correct_answer,
                    "is_correct": is_corr
                }
            
            score_percentage = round((correct / total) * 100, 2)
            tier = (session.level or "District").strip().capitalize()
            if tier == "District":
                passed = score_percentage >= 50.0
            elif tier == "State":
                passed = score_percentage >= 60.0
            elif tier == "National":
                passed = score_percentage >= 80.0
            else:
                passed = score_percentage >= 50.0
                
            topic_breakdown = {}
            for tag, st in topic_stats.items():
                acc = round((st["correct"] / st["total"]) * 100, 1) if st["total"] > 0 else 0.0
                topic_breakdown[tag] = {
                    "correct": st["correct"],
                    "total": st["total"],
                    "accuracy": acc
                }
            
            # Send webhook
            payload = {
                "booking_reference": session.booking_ref,
                "exam_engine_session_ref": session.session_ref,
                "student_id": session.student_id,
                "subject_id": session.subject_id,
                "level": session.level,
                "score": score_percentage,
                "pass_fail": "pass" if passed else "fail",
                "topic_breakdown": topic_breakdown,
                "correct_vs_selected": correct_vs_selected,
                "timestamp": now.isoformat()
            }
            url = "http://localhost:8000/api/webhooks/exam-engine/result"
            background_tasks.add_task(send_webhook, url, payload)
            
            count += 1
            
    db.commit()
    return {"swept": count}

@router.get("/sessions/{session_ref}/analytics-report/pdf")
def download_session_analytics_pdf(session_ref: str, db: Session = Depends(get_db)):
    """Generate and download a comprehensive Analytics Report PDF for an exam session."""
    session = db.query(models.ExamSession).filter(models.ExamSession.session_ref == session_ref).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
        
    student = db.query(models.User).filter(models.User.id == session.student_id).first()
    student_name = student.name if student else "SkillForge Learner"
    
    subject = db.query(models.Subject).filter(models.Subject.id == session.subject_id).first()
    exam_title = subject.name if subject else "SkillForge Exam"
    
    questions = db.query(models.Question).filter(models.Question.id.in_(session.question_set)).all() if session.question_set else []
    q_dict = {q.id: q for q in questions}
    answers = db.query(models.ExamAnswer).filter(models.ExamAnswer.session_id == session.id).all()
    ans_dict = {a.question_id: a.answer for a in answers}
    
    correct = 0
    total = len(session.question_set) if session.question_set else 1
    topic_stats = {}
    for qid in (session.question_set or []):
        q = q_dict.get(qid)
        if not q:
            continue
        t_tag = getattr(q, "topic_tag", None) or "General"
        if t_tag not in topic_stats:
            topic_stats[t_tag] = {"correct": 0, "total": 0}
        topic_stats[t_tag]["total"] += 1
        user_ans = ans_dict.get(qid)
        if user_ans is not None and user_ans == q.correct_answer:
            correct += 1
            topic_stats[t_tag]["correct"] += 1
            
    score_percentage = round((correct / total) * 100, 2)
    tier = (session.level or "District").strip().capitalize()
    if tier == "District":
        passed = score_percentage >= 50.0
    elif tier == "State":
        passed = score_percentage >= 60.0
    elif tier == "National":
        passed = score_percentage >= 80.0
    else:
        passed = score_percentage >= 50.0
        
    topic_breakdown = {}
    for tag, st in topic_stats.items():
        acc = round((st["correct"] / st["total"]) * 100, 1) if st["total"] > 0 else 0.0
        topic_breakdown[tag] = {
            "correct": st["correct"],
            "total": st["total"],
            "accuracy": acc
        }
        
    from utils.pdf_generator import generate_analytics_report_pdf
    pdf_bytes = generate_analytics_report_pdf(
        student_name=student_name,
        student_id=str(session.student_id),
        exam_title=exam_title,
        level=tier,
        score=score_percentage,
        passed=passed,
        topic_breakdown=topic_breakdown,
        booking_ref=session.booking_ref or "N/A",
        session_ref=session.session_ref or "N/A",
        date_str=str(session.created_at or datetime.datetime.utcnow())
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="SkillForge_Analytics_Report_{session.session_ref}.pdf"'}
    )



