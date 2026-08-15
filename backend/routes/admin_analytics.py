from typing import List, Optional
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from database import get_db
import models
import schemas
from auth import verifyAdminRole

router = APIRouter(prefix="/api/admin/analytics", tags=["Admin Analytics"])

@router.get("/batch-stats", response_model=schemas.BatchAnalyticsResponse)
def get_batch_stats(
    institution_id: Optional[int] = Query(None, description="Filter by institution"),
    specialization_id: Optional[int] = Query(None, description="Filter by specialization"),
    cycle_year: Optional[str] = Query(None, description="Filter by cycle year"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verifyAdminRole)
):
    query = (
        db.query(
            models.StudentRegistration.batch_name,
            func.count(func.distinct(models.StudentRegistration.user_id)).label("total_students"),
            func.sum(case((models.StudentRegistration.access_state == 'active', 1), else_=0)).label("active_students"),
            func.count(models.ExamResult.id).label("total_exams_taken"),
            func.sum(case((models.ExamResult.pass_fail == "Pass", 1), else_=0)).label("total_passed"),
            func.avg(models.ExamResult.score).label("avg_score")
        )
        .outerjoin(
            models.ExamResult,
            (models.ExamResult.student_id == models.StudentRegistration.user_id)
        )
        .filter(models.StudentRegistration.batch_name.isnot(None))
    )

    if institution_id:
        query = query.filter(models.StudentRegistration.institution_id == institution_id)
    if specialization_id:
        query = query.filter(models.StudentRegistration.specialization_id == specialization_id)
    if cycle_year:
        query = query.filter(models.StudentRegistration.cycle_year == cycle_year)

    query = query.group_by(models.StudentRegistration.batch_name)

    stats = query.all()
    batches = []
    
    for row in stats:
        total_students = row.total_students or 0
        total_exams_taken = row.total_exams_taken or 0
        total_passed = row.total_passed or 0
        
        pass_rate = (total_passed / total_exams_taken * 100.0) if total_exams_taken > 0 else 0.0
        
        batches.append(
            schemas.BatchAnalyticsStat(
                batch_name=row.batch_name,
                total_students=total_students,
                active_students=row.active_students or 0,
                total_exams_taken=total_exams_taken,
                total_passed=total_passed,
                pass_rate=round(pass_rate, 2),
                avg_score=round(row.avg_score or 0.0, 2)
            )
        )
        
    return schemas.BatchAnalyticsResponse(batches=batches)

@router.get("/progression", response_model=schemas.ProgressionAnalyticsResponse)
def get_progression_stats(
    institution_id: Optional[int] = Query(None, description="Filter by institution"),
    batch_name: Optional[str] = Query(None, description="Filter by batch name"),
    cycle_year: Optional[str] = Query(None, description="Filter by cycle year"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verifyAdminRole)
):
    query = (
        db.query(
            models.StudentRegistration.current_tier,
            models.StudentRegistration.access_status,
            models.StudentRegistration.payment_status,
            models.StudentRegistration.payment_required,
            func.count(models.StudentRegistration.id).label("student_count")
        )
    )

    if institution_id:
        query = query.filter(models.StudentRegistration.institution_id == institution_id)
    if batch_name:
        query = query.filter(models.StudentRegistration.batch_name == batch_name)
    if cycle_year:
        query = query.filter(models.StudentRegistration.cycle_year == cycle_year)

    query = query.group_by(
        models.StudentRegistration.current_tier,
        models.StudentRegistration.access_status,
        models.StudentRegistration.payment_status,
        models.StudentRegistration.payment_required
    )

    stats = query.all()
    
    tier_stats = {}
    
    for row in stats:
        tier = row.current_tier or "District"
        if tier not in tier_stats:
            tier_stats[tier] = {
                "active": 0,
                "grace_period": 0,
                "deactivated": 0,
                "pending_payment": 0,
                "total": 0
            }
            
        count = row.student_count or 0
        tier_stats[tier]["total"] += count
        
        if row.payment_required and row.payment_status == 'unpaid':
            tier_stats[tier]["pending_payment"] += count
        else:
            status = row.access_status or "active"
            if status == "active":
                tier_stats[tier]["active"] += count
            elif status == "grace_period":
                tier_stats[tier]["grace_period"] += count
            elif status == "deactivated":
                tier_stats[tier]["deactivated"] += count
            else:
                tier_stats[tier]["active"] += count  # Fallback

    result = []
    for tier, data in tier_stats.items():
        result.append(schemas.ProgressionTierStat(
            tier=tier,
            **data
        ))
        
    # Sort logically by tier progression
    tier_order = {"District": 1, "State": 2, "National": 3}
    result.sort(key=lambda x: tier_order.get(x.tier, 99))
    
    return schemas.ProgressionAnalyticsResponse(tiers=result)

@router.get("/payments", response_model=schemas.PaymentAnalyticsResponse)
def get_payment_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verifyAdminRole)
):
    query = (
        db.query(
            models.PaymentRecord.target_tier,
            models.PaymentRecord.status,
            func.count(models.PaymentRecord.id).label("count"),
            func.sum(models.PaymentRecord.total_amount).label("revenue")
        )
        .group_by(models.PaymentRecord.target_tier, models.PaymentRecord.status)
    )

    stats = query.all()
    tier_stats = {}
    
    for row in stats:
        tier = row.target_tier
        if tier not in tier_stats:
            tier_stats[tier] = {
                "paid_count": 0,
                "pending_count": 0,
                "failed_count": 0,
                "total_revenue": 0.0
            }
        
        status = row.status
        count = row.count or 0
        revenue = row.revenue or 0.0
        
        if status == "success" or status == "paid":
            tier_stats[tier]["paid_count"] += count
            tier_stats[tier]["total_revenue"] += revenue
        elif status == "failed":
            tier_stats[tier]["failed_count"] += count
        else: # created or pending
            tier_stats[tier]["pending_count"] += count

    result = []
    for tier, data in tier_stats.items():
        result.append(schemas.PaymentTierStat(
            tier=tier,
            **data
        ))
        
    return schemas.PaymentAnalyticsResponse(tiers=result)

@router.get("/access-status", response_model=schemas.AccessStatusResponse)
def get_access_status(
    status: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verifyAdminRole)
):
    query = db.query(
        models.StudentRegistration,
        models.User,
        models.Institution
    ).join(
        models.User, models.StudentRegistration.user_id == models.User.id
    ).outerjoin(
        models.Institution, models.StudentRegistration.institution_id == models.Institution.id
    )

    if status:
        query = query.filter(models.StudentRegistration.access_status == status)
    if institution_id:
        query = query.filter(models.StudentRegistration.institution_id == institution_id)
    if level:
        query = query.filter(models.StudentRegistration.current_tier == level)
        
    records = query.all()
    
    items = []
    for reg, user, inst in records:
        items.append(schemas.AccessStatusItem(
            registration_id=reg.id,
            student_name=user.name,
            email=user.email,
            institution_name=inst.name if inst else "Independent",
            current_tier=reg.current_tier,
            access_status=reg.access_status,
            grace_period_end=reg.grace_period_end
        ))
        
    return schemas.AccessStatusResponse(records=items)

@router.post("/access-status/{registration_id}/override")
def override_access_status(
    registration_id: int,
    req: schemas.AccessOverrideRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verifyAdminRole)
):
    if req.action not in ("activate", "deactivate"):
        raise HTTPException(status_code=400, detail="Invalid action")
    if not req.reason:
        raise HTTPException(status_code=400, detail="Reason is required for manual override")
        
    reg = db.query(models.StudentRegistration).filter(models.StudentRegistration.id == registration_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    previous_state = reg.access_status
    new_state = "manual_active" if req.action == "activate" else "manual_deactivated"
    
    reg.access_state = "active" if req.action == "activate" else "deactivated"
    reg.access_status = new_state
    
    audit_log = models.AccessAuditLog(
        registration_id=reg.id,
        user_id=reg.user_id,
        previous_state=previous_state,
        new_state=new_state,
        trigger_event="MANUAL_OVERRIDE",
        reason=req.reason,
        admin_id=current_user.id
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": f"Successfully overridden access status to {new_state}"}

@router.get("/completion-metrics", response_model=schemas.CompletionMetricsResponse)
def get_completion_metrics(
    institution_id: Optional[int] = Query(None, description="Filter by institution"),
    cycle_year: Optional[str] = Query(None, description="Filter by cycle year"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verifyAdminRole)
):
    query = db.query(models.StudentRegistration)
    if institution_id:
        query = query.filter(models.StudentRegistration.institution_id == institution_id)
    if cycle_year:
        query = query.filter(models.StudentRegistration.cycle_year == cycle_year)
        
    regs = query.all()
    
    tier_stats = {
        "District": {"total": 0, "completed": 0, "dropped": 0},
        "State": {"total": 0, "completed": 0, "dropped": 0},
        "National": {"total": 0, "completed": 0, "dropped": 0}
    }
    
    for r in regs:
        tier = r.current_tier or "District"
        if tier not in tier_stats:
            continue
            
        tier_stats[tier]["total"] += 1
        # Completed means access_status is completed, or past state (e.g. State tier means they completed District)
        if r.access_status in ["completed", "post_exam_access", "payment_required", "grace_period"] or (r.payment_required and r.payment_status == 'unpaid'):
            tier_stats[tier]["completed"] += 1
        elif r.access_status in ["deactivated", "manual_deactivated"]:
            tier_stats[tier]["dropped"] += 1
            
    tiers_res = []
    for tier, stats in tier_stats.items():
        total = stats["total"]
        if total > 0:
            comp_rate = (stats["completed"] / total) * 100.0
            drop_rate = (stats["dropped"] / total) * 100.0
        else:
            comp_rate = 0.0
            drop_rate = 0.0
            
        tiers_res.append(schemas.CompletionStat(
            tier=tier,
            total_students=total,
            completed=stats["completed"],
            dropped_out=stats["dropped"],
            completion_rate=round(comp_rate, 2),
            drop_out_rate=round(drop_rate, 2)
        ))
        
    return schemas.CompletionMetricsResponse(tiers=tiers_res)

@router.get("/time-to-certification", response_model=schemas.TimeToCertificationResponse)
def get_time_to_certification(
    institution_id: Optional[int] = Query(None, description="Filter by institution"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verifyAdminRole)
):
    from models.certificate import Certificate
    from sqlalchemy.sql import text
    
    query = db.query(
        models.StudentRegistration.current_tier,
        models.StudentRegistration.created_at.label("reg_date"),
        Certificate.created_at.label("cert_date")
    ).join(
        Certificate, text("CAST(student_registrations.user_id AS VARCHAR) = certificates.user_id")
    )
    
    if institution_id:
        query = query.filter(models.StudentRegistration.institution_id == institution_id)
        
    results = query.all()
    
    tier_stats = {}
    for r in results:
        tier = r.current_tier or "District"
        if tier not in tier_stats:
            tier_stats[tier] = {"days_sum": 0.0, "count": 0}
            
        reg_date = r.reg_date
        cert_date = r.cert_date
        if reg_date and cert_date:
            days = (cert_date - reg_date).days
            if days >= 0:
                tier_stats[tier]["days_sum"] += days
                tier_stats[tier]["count"] += 1
                
    tiers_res = []
    for tier, data in tier_stats.items():
        avg = (data["days_sum"] / data["count"]) if data["count"] > 0 else 0.0
        tiers_res.append(schemas.TimeToCertificationStat(
            tier=tier,
            avg_days=round(avg, 2),
            student_count=data["count"]
        ))
        
    return schemas.TimeToCertificationResponse(tiers=tiers_res)

@router.get("/enrollment/csv")
@router.get("/export/enrollment/csv")
def export_enrollment_csv_analytics(
    institution_id: Optional[int] = Query(None),
    specialization: Optional[str] = Query(None),
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "learner")
    if institution_id:
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
        headers={"Content-Disposition": "attachment; filename=skillforge_enrollment_analytics.csv"}
    )

@router.get("/engagement/csv")
@router.get("/progression/csv")
@router.get("/export/progression/csv")
def export_progression_csv_analytics(
    institution_id: Optional[int] = Query(None),
    specialization: Optional[str] = Query(None),
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "learner")
    if institution_id:
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
        headers={"Content-Disposition": "attachment; filename=skillforge_progression_analytics.csv"}
    )

@router.get("/export/csv")
@router.get("/csv")
def export_comprehensive_csv_analytics(
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "learner")
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
        headers={"Content-Disposition": "attachment; filename=skillforge_comprehensive_analytics.csv"}
    )
