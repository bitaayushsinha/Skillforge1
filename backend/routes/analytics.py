from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from database import get_db
import models
import schemas
from auth import get_current_user_optional

router = APIRouter()

@router.get("/leaderboard", response_model=schemas.LeaderboardResponse)
def get_leaderboard(
    tier: str = Query("District", description="District, State, or National"),
    metric: str = Query("avg_score", description="avg_score or pass_rate"),
    cycle_year: str = Query("2026-2027"),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    # Determine own institution for highlighting (returns None if not applicable)
    own_institution_id = None
    if current_user and current_user.role in ("sub_admin", "learner"):
        # For sub_admin, get their first institution assignment
        if current_user.role == "sub_admin":
            access = db.query(models.SubAdminInstitutionAccess).filter(
                models.SubAdminInstitutionAccess.subadmin_id == current_user.id
            ).first()
            own_institution_id = access.institution_id if access else None
        else:
            own_institution_id = current_user.institution_id

    # Aggregate: Institution → StudentRegistration (cycle-scoped) → ExamResult (tier-filtered)
    #
    # We join:
    #   Institution
    #   → StudentRegistration ON StudentRegistration.institution_id == Institution.id
    #                          AND cycle_year match AND not archived
    #   → ExamResult           ON ExamResult.student_id == StudentRegistration.user_id
    #                          AND ExamResult.level == tier
    #
    # Grouping by Institution gives us per-institution aggregates.

    query = (
        db.query(
            models.Institution.id.label("institution_id"),
            models.Institution.name.label("institution_name"),
            func.avg(models.ExamResult.score).label("avg_score"),
            func.count(models.ExamResult.id).label("total_students"),
            func.sum(
                case((models.ExamResult.pass_fail == "Pass", 1), else_=0)
            ).label("total_passed"),
        )
        .join(
            models.StudentRegistration,
            (models.StudentRegistration.institution_id == models.Institution.id)
            & (models.StudentRegistration.cycle_year == cycle_year)
            & (models.StudentRegistration.is_archived == False),
        )
        .join(
            models.ExamResult,
            (models.ExamResult.student_id == models.StudentRegistration.user_id)
            & (models.ExamResult.level == tier),
        )
        .group_by(models.Institution.id, models.Institution.name)
    )

    stats = query.all()

    leaderboard_list = []
    for row in stats:
        total_students = row.total_students or 0
        total_passed = row.total_passed or 0
        avg_score = row.avg_score or 0.0
        pass_rate = (total_passed / total_students * 100.0) if total_students > 0 else 0.0

        leaderboard_list.append(
            schemas.LeaderboardInstitutionStat(
                institution_id=row.institution_id,
                institution_name=row.institution_name,
                avg_score=round(avg_score, 2),
                pass_rate=round(pass_rate, 2),
                total_students=total_students,
                total_passed=total_passed,
                rank=0,  # Will compute next
            )
        )

    # Sort by selected metric (secondary sort by the other metric for stability)
    if metric == "pass_rate":
        leaderboard_list.sort(key=lambda x: (x.pass_rate, x.avg_score), reverse=True)
    else:
        leaderboard_list.sort(key=lambda x: (x.avg_score, x.pass_rate), reverse=True)

    # Assign ranks
    for idx, stat in enumerate(leaderboard_list):
        stat.rank = idx + 1

    return schemas.LeaderboardResponse(
        tier=tier,
        cycle_year=cycle_year,
        metric=metric,
        leaderboard=leaderboard_list,
        own_institution_id=own_institution_id,
    )
