from typing import List, Optional
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response

from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
import schemas
from auth import verifySubAdminOrAdmin, get_subadmin_allowed_institution_ids

router = APIRouter()

def verify_report_access(
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db)
):
    if current_user.role == "admin":
        return current_user
    priv = db.query(models.SubAdminPrivilege).filter(models.SubAdminPrivilege.user_id == current_user.id).first()
    if not priv or (not priv.view_reports and not priv.custom_reports and not priv.enrollment_reports):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You lack reports and analytics privileges."
        )
    return current_user

@router.get("/engagement", response_model=schemas.EngagementReportResponse)
def get_engagement_report(
    institution_id: Optional[int] = Query(None),
    specialization: Optional[str] = Query(None),
    program: Optional[str] = Query(None),
    current_user: models.User = Depends(verify_report_access),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "learner")
    
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        query = query.filter(models.User.institution_id.in_(allowed_ids))
        
    if institution_id:
        if allowed_ids is not None and institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized for this institution")
        query = query.filter(models.User.institution_id == institution_id)
        
    if specialization:
        query = query.filter(models.User.specialization == specialization)
    elif program:
        query = query.filter(models.User.specialization.ilike(f"%{program}%"))
        
    students = query.all()
    total = len(students)
    if total == 0:
        return schemas.EngagementReportResponse(
            total_students=0,
            active_students=0,
            inactive_students=0,
            total_goal_hours=0.0,
            total_progress_hours=0.0,
            average_streak=0.0,
            average_xp=0.0,
            completion_rate=0.0,
            total_certificates_issued=0
        )
        
    active = sum(1 for s in students if s.is_active)
    inactive = total - active
    goal_hours = sum(s.weekly_goal_hours or 0.0 for s in students)
    prog_hours = sum(s.weekly_progress_hours or 0.0 for s in students)
    avg_streak = round(sum(s.streak or 0 for s in students) / total, 1)
    avg_xp = round(sum(s.xp_points or 0 for s in students) / total, 1)
    
    comp_rate = min(100.0, round((prog_hours / max(1.0, goal_hours)) * 100.0, 1))
    
    student_id_strs = [str(s.id) for s in students]
    cert_count = db.query(models.Certificate).filter(models.Certificate.user_id.in_(student_id_strs)).count()
    
    return schemas.EngagementReportResponse(
        total_students=total,
        active_students=active,
        inactive_students=inactive,
        total_goal_hours=round(goal_hours, 1),
        total_progress_hours=round(prog_hours, 1),
        average_streak=avg_streak,
        average_xp=avg_xp,
        completion_rate=comp_rate,
        total_certificates_issued=cert_count
    )

@router.get("/system-dashboard", response_model=schemas.AdminAggregateDashboardResponse)
def get_system_dashboard(
    current_user: models.User = Depends(verify_report_access),
    db: Session = Depends(get_db)
):
    # 1. Batch-wise analytics (RegistrationCycle -> StudentRegistration -> ExamResult)
    # We group by cycle_year and calculate total students, pass_rate, avg_score
    batch_analytics = []
    cycles = db.query(models.RegistrationCycle).all()
    for cycle in cycles:
        students_in_cycle = db.query(models.StudentRegistration).filter(
            models.StudentRegistration.cycle_year == cycle.name
        ).all()
        student_ids = [s.user_id for s in students_in_cycle]
        
        if student_ids:
            results = db.query(models.ExamResult).filter(
                models.ExamResult.student_id.in_(student_ids)
            ).all()
            total_students = len(student_ids)
            if results:
                avg_score = sum(r.score for r in results) / len(results)
                passes = sum(1 for r in results if r.pass_fail == 'Pass')
                pass_rate = (passes / len(results)) * 100
            else:
                avg_score = 0
                pass_rate = 0
                
            batch_analytics.append({
                "cycle_year": cycle.name,
                "total_students": total_students,
                "pass_rate": round(pass_rate, 2),
                "avg_score": round(avg_score, 2)
            })
    
    # 2. Progression Tracking (Count of students in each tier)
    progression = []
    tiers = db.query(
        models.StudentRegistration.current_tier, 
        func.count(models.StudentRegistration.id)
    ).group_by(models.StudentRegistration.current_tier).all()
    for tier, count in tiers:
        if tier:
            progression.append({
                "tier": tier,
                "student_count": count
            })
            
    # 3. Payment Tracking (Revenue by tier)
    revenue = []
    rev_tiers = db.query(
        models.PaymentRecord.target_tier,
        func.sum(models.PaymentRecord.total_amount)
    ).filter(models.PaymentRecord.status == "success").group_by(models.PaymentRecord.target_tier).all()
    for tier, total in rev_tiers:
        if tier:
            revenue.append({
                "tier": tier,
                "total_revenue": total or 0.0,
                "currency": "INR"
            })
            
    return {
        "batch_analytics": batch_analytics,
        "progression": progression,
        "revenue": revenue
    }


@router.get("/enrollment", response_model=schemas.EnrollmentReportResponse)
def get_enrollment_report(
    institution_id: Optional[int] = Query(None),
    specialization: Optional[str] = Query(None),
    current_user: models.User = Depends(verify_report_access),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "learner")
    
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        query = query.filter(models.User.institution_id.in_(allowed_ids))
        
    if institution_id:
        if allowed_ids is not None and institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized for this institution")
        query = query.filter(models.User.institution_id == institution_id)
        
    if specialization:
        query = query.filter(models.User.specialization == specialization)
        
    students = query.all()
    total = len(students)
    active = sum(1 for s in students if s.is_active)
    inactive = total - active
    
    # Calculate dynamic average subjects per student based on course progress
    avg_subjects = round(sum((s.weekly_progress_hours or 0.0) / 4.0 for s in students) / max(1, total), 1) if total else 0.0
    
    # Pre-fetch all institutions for name mapping
    institutions = db.query(models.Institution).all()
    inst_name_map = {i.id: i.name for i in institutions}
    
    inst_stats = {}
    spec_stats = {}
    
    for s in students:
        i_id = s.institution_id
        if i_id not in inst_stats:
            inst_stats[i_id] = {
                "institution_id": i_id,
                "institution_name": inst_name_map.get(i_id, "Unassigned / Independent"),
                "registered": 0,
                "active": 0,
                "inactive": 0
            }
        inst_stats[i_id]["registered"] += 1
        if s.is_active:
            inst_stats[i_id]["active"] += 1
        else:
            inst_stats[i_id]["inactive"] += 1
            
        spec_name = s.specialization or "General / Undecided"
        spec_stats[spec_name] = spec_stats.get(spec_name, 0) + 1
        
    by_inst = [
        schemas.InstitutionEnrollmentStat(**data) for data in sorted(inst_stats.values(), key=lambda x: x["registered"], reverse=True)
    ]
    by_spec = [
        schemas.SpecializationStat(specialization=k, student_count=v)
        for k, v in sorted(spec_stats.items(), key=lambda x: x[1], reverse=True)
    ]
    
    return schemas.EnrollmentReportResponse(
        total_registered=total,
        total_active=active,
        total_inactive=inactive,
        average_subjects_per_student=avg_subjects,
        by_institution=by_inst,
        by_specialization=by_spec
    )

@router.get("/student/{user_id}/analytics/pdf")
def download_student_analytics_pdf(user_id: int, db: Session = Depends(get_db)):
    """Generate and download a comprehensive PDF analytics report for a student."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
        
    latest_session = db.query(models.ExamSession).filter(
        models.ExamSession.student_id == user_id,
        models.ExamSession.status == "completed"
    ).order_by(models.ExamSession.id.desc()).first()
    
    if latest_session:
        subject = db.query(models.Subject).filter(models.Subject.id == latest_session.subject_id).first()
        exam_title = subject.name if subject else "SkillForge Exam"
        questions = db.query(models.Question).filter(models.Question.id.in_(latest_session.question_set)).all() if latest_session.question_set else []
        q_dict = {q.id: q for q in questions}
        answers = db.query(models.ExamAnswer).filter(models.ExamAnswer.session_id == latest_session.id).all()
        ans_dict = {a.question_id: a.answer for a in answers}
        
        correct = 0
        total = len(latest_session.question_set) if latest_session.question_set else 1
        topic_stats = {}
        for qid in (latest_session.question_set or []):
            q = q_dict.get(qid)
            if not q:
                continue
            t_tag = getattr(q, "topic_tag", None) or "General"
            if t_tag not in topic_stats:
                topic_stats[t_tag] = {"correct": 0, "total": 0}
            topic_stats[t_tag]["total"] += 1
            u_ans = ans_dict.get(qid)
            if u_ans is not None and u_ans == q.correct_answer:
                correct += 1
                topic_stats[t_tag]["correct"] += 1
                
        score_percentage = round((correct / total) * 100, 2)
        tier = (latest_session.level or "District").strip().capitalize()
        passed = score_percentage >= (50.0 if tier == "District" else (60.0 if tier == "State" else 80.0))
        topic_breakdown = {}
        for tag, st in topic_stats.items():
            acc = round((st["correct"] / st["total"]) * 100, 1) if st["total"] > 0 else 0.0
            topic_breakdown[tag] = {"correct": st["correct"], "total": st["total"], "accuracy": acc}
            
        booking_ref = getattr(latest_session, "booking_ref", None) or "N/A"
        session_ref = getattr(latest_session, "session_ref", None) or "N/A"
    else:
        # Check ExamResult
        res = db.query(models.ExamResult).filter(models.ExamResult.student_id == user_id).order_by(models.ExamResult.id.desc()).first()
        if res and res.subject_id:
            subj = db.query(models.Subject).filter(models.Subject.id == res.subject_id).first()
            exam_title = subj.name if subj else f"Subject ID {res.subject_id}"
        else:
            exam_title = "General Competency Evaluation"
        score_percentage = float(res.score) if res and res.score is not None else 0.0
        passed = (res.pass_fail.lower() == "pass") if res and res.pass_fail else False
        tier = res.level if res and res.level else "District"
        topic_breakdown = res.topic_breakdown if (res and hasattr(res, "topic_breakdown") and res.topic_breakdown) else {}
        booking_ref = getattr(res, "booking_ref", None) or getattr(res, "booking_reference", None) or "N/A"
        session_ref = getattr(res, "exam_engine_session_ref", None) or "N/A"
        
    from utils.pdf_generator import generate_analytics_report_pdf
    pdf_bytes = generate_analytics_report_pdf(
        student_name=user.name,
        student_id=str(user.id),
        exam_title=exam_title,
        level=tier,
        score=score_percentage,
        passed=passed,
        topic_breakdown=topic_breakdown,
        booking_ref=booking_ref,
        session_ref=session_ref
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="SkillForge_Analytics_Report_{user.id}.pdf"'}
    )

@router.get("/enrollment/csv")
@router.get("/export/enrollment/csv")
def export_enrollment_csv(
    institution_id: Optional[int] = Query(None),
    specialization: Optional[str] = Query(None),
    current_user: models.User = Depends(verify_report_access),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "learner")
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        query = query.filter(models.User.institution_id.in_(allowed_ids))
    if institution_id:
        if allowed_ids is not None and institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized for this institution")
        query = query.filter(models.User.institution_id == institution_id)
    if specialization:
        query = query.filter(models.User.specialization == specialization)
        
    students = query.all()
    institutions = {i.id: i.name for i in db.query(models.Institution).all()}
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Name", "Email", "Institution", "Specialization", "Active Status"])
    for s in students:
        writer.writerow([
            s.id,
            s.name,
            s.email,
            institutions.get(s.institution_id, "Unassigned / Independent"),
            s.specialization or "General / Undecided",
            "Active" if s.is_active else "Inactive"
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=skillforge_enrollment_report.csv"}
    )

@router.get("/engagement/csv")
@router.get("/progression/csv")
@router.get("/export/progression/csv")
def export_progression_csv(
    institution_id: Optional[int] = Query(None),
    specialization: Optional[str] = Query(None),
    current_user: models.User = Depends(verify_report_access),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "learner")
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        query = query.filter(models.User.institution_id.in_(allowed_ids))
    if institution_id:
        if allowed_ids is not None and institution_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Not authorized for this institution")
        query = query.filter(models.User.institution_id == institution_id)
    if specialization:
        query = query.filter(models.User.specialization == specialization)
        
    students = query.all()
    institutions = {i.id: i.name for i in db.query(models.Institution).all()}
    regs = {r.user_id: r for r in db.query(models.StudentRegistration).all()}
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Name", "Email", "Institution", "Current Tier", "XP Points", "Streak", "Weekly Goal Hours", "Weekly Progress Hours"])
    for s in students:
        reg = regs.get(s.id)
        tier = reg.current_tier if reg and reg.current_tier else "District"
        writer.writerow([
            s.id,
            s.name,
            s.email,
            institutions.get(s.institution_id, "Unassigned / Independent"),
            tier,
            s.xp_points or 0,
            s.streak or 0,
            s.weekly_goal_hours or 0.0,
            s.weekly_progress_hours or 0.0
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=skillforge_progression_report.csv"}
    )

@router.get("/export/csv")
@router.get("/csv")
def export_comprehensive_csv(
    current_user: models.User = Depends(verify_report_access),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "learner")
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is not None:
        query = query.filter(models.User.institution_id.in_(allowed_ids))
    students = query.all()
    institutions = {i.id: i.name for i in db.query(models.Institution).all()}
    regs = {r.user_id: r for r in db.query(models.StudentRegistration).all()}
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Name", "Email", "Institution", "Specialization", "Active Status", "Current Tier", "XP Points", "Streak", "Weekly Goal Hours", "Weekly Progress Hours"])
    for s in students:
        reg = regs.get(s.id)
        tier = reg.current_tier if reg and reg.current_tier else "District"
        writer.writerow([
            s.id,
            s.name,
            s.email,
            institutions.get(s.institution_id, "Unassigned / Independent"),
            s.specialization or "General / Undecided",
            "Active" if s.is_active else "Inactive",
            tier,
            s.xp_points or 0,
            s.streak or 0,
            s.weekly_goal_hours or 0.0,
            s.weekly_progress_hours or 0.0
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=skillforge_comprehensive_report.csv"}
    )

