from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter()

@router.get("/bookmarks", response_model=List[schemas.BookmarkResponse])
def get_bookmarks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all bookmarks for the current user.
    """
    bookmarks = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == current_user.id
    ).order_by(models.Bookmark.created_at.desc()).all()
    return bookmarks

@router.post("/bookmarks", response_model=schemas.BookmarkResponse, status_code=status.HTTP_201_CREATED)
def create_bookmark(
    bookmark_in: schemas.BookmarkCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new bookmark for the current user. If duplicate exists, returns the existing bookmark.
    """
    existing = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == current_user.id,
        models.Bookmark.item_type == bookmark_in.item_type,
        models.Bookmark.item_id == bookmark_in.item_id
    ).first()
    if existing:
        return existing

    new_bm = models.Bookmark(
        user_id=current_user.id,
        item_type=bookmark_in.item_type,
        item_id=bookmark_in.item_id,
        title=bookmark_in.title,
        url_path=bookmark_in.url_path
    )
    db.add(new_bm)
    db.commit()
    db.refresh(new_bm)
    return new_bm

@router.delete("/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(
    bookmark_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a bookmark belonging to the current user.
    """
    bm = db.query(models.Bookmark).filter(
        models.Bookmark.id == bookmark_id,
        models.Bookmark.user_id == current_user.id
    ).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found.")
    db.delete(bm)
    db.commit()
    return None

@router.get("/my-mock-results", response_model=List[schemas.MockTestAttemptResponse])
def get_my_mock_results(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all mock test attempts for the current user.
    """
    attempts = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.user_id == current_user.id
    ).order_by(models.MockTestAttempt.attempt_date.desc()).all()
    return attempts

@router.post("/start-mock-exam")
def start_mock_exam(
    req: schemas.StartMockExamRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Starts an AI/formal mock exam attempt and enforces daily attempt limits.
    """
    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == current_user.id,
        models.StudentRegistration.access_status == "active"
    ).first()

    if not registration:
        raise HTTPException(status_code=403, detail="No active registration found.")

    subject = None
    if req.subject_id:
        subject = db.query(models.Subject).filter(models.Subject.id == req.subject_id).first()
    elif req.topic:
        subject = db.query(models.Subject).filter(
            models.Subject.specialization_id == registration.specialization_id,
            func.lower(models.Subject.name) == req.topic.lower()
        ).first()

    if not subject:
        subjects = db.query(models.Subject).filter(
            models.Subject.specialization_id == registration.specialization_id
        ).all()
        if not subjects:
            raise HTTPException(status_code=403, detail="No subjects assigned for mock tests.")
        subject = subjects[0]

    config = db.query(models.ExamConfig).filter(
        models.ExamConfig.subject_id == subject.id,
        models.ExamConfig.level == registration.current_tier
    ).first()

    if config and config.per_day_ai_limit is not None:
        daily_limit = config.per_day_ai_limit
    else:
        daily_limit = subject.daily_mock_attempts_limit if subject and subject.daily_mock_attempts_limit is not None else 3

    today = datetime.datetime.utcnow().date()
    today_start = datetime.datetime.combine(today, datetime.datetime.min.time())

    attempts_today = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.user_id == current_user.id,
        models.MockTestAttempt.attempt_date >= today_start
    ).count()

    if attempts_today >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily mock test limit ({daily_limit}) exceeded. Please try again tomorrow."
        )

    topic_name = req.topic or (subject.name if subject else "General Assessment")
    new_attempt = models.MockTestAttempt(
        user_id=current_user.id,
        topic=topic_name,
        attempt_date=datetime.datetime.utcnow(),
        status="completed",
        score=0.0,
        total_questions=req.count or 10
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)

    return {
        "status": "success",
        "attempt_id": new_attempt.id,
        "topic": new_attempt.topic,
        "daily_limit": daily_limit,
        "attempts_today": attempts_today + 1
    }

# ─── Registered Subjects ────────────────────────────────────────────────────────

@router.get("/my-registration", response_model=Optional[schemas.StudentRegistrationResponse])
def get_my_registration(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reg = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == current_user.id
    ).order_by(models.StudentRegistration.id.desc()).first()
    return reg

@router.get("/subjects-progress")
def get_subjects_progress(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns per-subject exam progress: for each assigned subject, return the
    subject name, all bookings, and the latest exam result (score, pass/fail, level).
    """
    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == current_user.id
    ).order_by(models.StudentRegistration.id.desc()).first()

    if not registration:
        return []

    assignments = db.query(models.StudentSubjectAssignment).filter(
        models.StudentSubjectAssignment.user_id == current_user.id,
        models.StudentSubjectAssignment.registration_id == registration.id
    ).all()

    subject_ids = [a.subject_id for a in assignments]
    if not subject_ids:
        return []

    subjects = db.query(models.Subject).filter(models.Subject.id.in_(subject_ids)).all()
    subject_map = {s.id: s for s in subjects}

    # Fetch all bookings for this student grouped by subject
    all_bookings = db.query(models.ExamSlotBooking).filter(
        models.ExamSlotBooking.user_id == current_user.id,
        models.ExamSlotBooking.subject_id.in_(subject_ids)
    ).order_by(models.ExamSlotBooking.created_at.desc()).all()

    # Fetch all results for this student
    booking_refs = [b.booking_reference for b in all_bookings]
    exam_refs = [b.exam_engine_session_ref for b in all_bookings if b.exam_engine_session_ref]

    all_results = db.query(models.ExamResult).filter(
        models.ExamResult.student_id == current_user.id
    ).order_by(models.ExamResult.received_at.desc()).all()

    # Index results by booking_ref and exam_engine_session_ref
    results_by_ref = {}
    for r in all_results:
        if r.booking_ref:
            results_by_ref[r.booking_ref] = r
        if r.exam_engine_session_ref:
            results_by_ref[r.exam_engine_session_ref] = r

    progress = []
    for sid in subject_ids:
        subj = subject_map.get(sid)
        if not subj:
            continue

        bookings_for_subject = [b for b in all_bookings if b.subject_id == sid]

        # Find the best (highest scoring) result for this subject
        subject_results = [
            results_by_ref.get(b.booking_reference) or results_by_ref.get(b.exam_engine_session_ref)
            for b in bookings_for_subject
        ]
        subject_results = [r for r in subject_results if r is not None]

        best_result = max(subject_results, key=lambda r: r.score, default=None)
        latest_result = subject_results[0] if subject_results else None

        completed_count = sum(1 for b in bookings_for_subject if b.status == "completed")
        passed = best_result and (best_result.pass_fail in ("PASS", "pass"))

        progress.append({
            "subject_id": sid,
            "subject_name": subj.name,
            "subject_code": subj.code or f"SUB-{sid}",
            "tier": subj.semester_tier or registration.current_tier or "District",
            "total_bookings": len(bookings_for_subject),
            "completed_bookings": completed_count,
            "attempt_count": completed_count,
            "best_score": best_result.score if best_result else None,
            "best_pass_fail": best_result.pass_fail if best_result else None,
            "latest_score": latest_result.score if latest_result else None,
            "latest_pass_fail": latest_result.pass_fail if latest_result else None,
            "latest_level": latest_result.level if latest_result else None,
            "latest_booking_ref": latest_result.booking_ref if latest_result else None,
            "topic_breakdown": latest_result.topic_breakdown if latest_result else None,
            "passed": bool(passed),
            "has_result": bool(subject_results),
        })

    return progress

@router.get("/subjects", response_model=List[schemas.SubjectResponse])
def get_registered_subjects(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch explicitly assigned subjects for the student.
    """
    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == current_user.id,
        models.StudentRegistration.access_status == "active"
    ).first()

    subjects = []
    if registration:
        assignments = db.query(models.StudentSubjectAssignment).filter(
            models.StudentSubjectAssignment.user_id == current_user.id,
            models.StudentSubjectAssignment.registration_id == registration.id
        ).all()
        subject_ids = [a.subject_id for a in assignments]
        if subject_ids:
            subjects = db.query(models.Subject).filter(models.Subject.id.in_(subject_ids)).all()
    
    return subjects

@router.get("/subjects/{subject_id}/courses", response_model=List[schemas.CourseResponse])
def get_subject_courses(
    subject_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the underlying marketplace courses linked to a registered subject.
    Enforces that the student is registered for the subject's specialization.
    """
    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == current_user.id,
        models.StudentRegistration.access_status == "active"
    ).first()

    if not registration:
        raise HTTPException(status_code=403, detail="No active program registration found.")

    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    assignment = db.query(models.StudentSubjectAssignment).filter(
        models.StudentSubjectAssignment.user_id == current_user.id,
        models.StudentSubjectAssignment.subject_id == subject_id,
        models.StudentSubjectAssignment.registration_id == registration.id
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Access denied. Subject is not explicitly assigned to you.")

    mappings = db.query(models.SubjectCourseMapping).filter(
        models.SubjectCourseMapping.subject_id == subject_id
    ).order_by(models.SubjectCourseMapping.order_index.asc()).all()

    course_ids = [m.course_id for m in mappings]
    
    if not course_ids:
        return []

    courses = db.query(models.Course).filter(models.Course.id.in_(course_ids)).all()
    
    # Sort courses based on mapping order
    course_dict = {c.id: c for c in courses}
    ordered_courses = [course_dict[cid] for cid in course_ids if cid in course_dict]

    return ordered_courses

def verify_subject_registration(subject_id: int, user_id: int, db: Session) -> models.StudentRegistration:
    """
    Helper function to enforce that a student has an active registration before booking.
    Returns the valid registration if access is allowed, raises 403 otherwise.
    """
    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == user_id,
        models.StudentRegistration.access_status == "active"
    ).first()

    if not registration:
        raise HTTPException(status_code=403, detail="No active program registration found.")

    assignment = db.query(models.StudentSubjectAssignment).filter(
        models.StudentSubjectAssignment.user_id == user_id,
        models.StudentSubjectAssignment.subject_id == subject_id,
        models.StudentSubjectAssignment.registration_id == registration.id
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Access denied. Subject is not explicitly assigned to you.")

    return registration

# ─── Exam Slot Booking ──────────────────────────────────────────────────────────

from services.exam_engine_client import ExamEngineClient
import datetime
import uuid

@router.get("/subjects/{subject_id}/slots/available")
def get_available_slots(
    subject_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns available slot dates and times for a subject based on ExamWindow configuration.
    """
    verify_subject_registration(subject_id, current_user.id, db)
    
    exam_window = db.query(models.ExamWindow).filter(models.ExamWindow.subject_id == subject_id).first()
    
    if not exam_window:
        return []

    available_slots = []
    
    # Calculate days between start and end
    start_date = exam_window.start_date.date()
    end_date = exam_window.end_date.date()
    
    if end_date < start_date:
        return []
        
    delta_days = (end_date - start_date).days
    
    for i in range(delta_days + 1):
        slot_date = start_date + datetime.timedelta(days=i)
        if slot_date < datetime.date.today():
            continue
            
        # Parse daily start and end times
        try:
            st = datetime.datetime.strptime(exam_window.daily_start_time, "%H:%M").time()
            et = datetime.datetime.strptime(exam_window.daily_end_time, "%H:%M").time()
        except ValueError:
            st = datetime.time(9, 0)
            et = datetime.time(17, 0)
            
        slot_duration = exam_window.slot_duration_minutes or 60
        
        current_dt = datetime.datetime.combine(slot_date, st)
        end_dt = datetime.datetime.combine(slot_date, et)
        
        times = []
        while current_dt + datetime.timedelta(minutes=slot_duration) <= end_dt:
            next_dt = current_dt + datetime.timedelta(minutes=slot_duration)
            times.append(f"{current_dt.strftime('%I:%M %p')} - {next_dt.strftime('%I:%M %p')}")
            current_dt = next_dt
            
        if times:
            available_slots.append({
                "date": slot_date.strftime("%Y-%m-%d"),
                "times": times
            })
            
    return available_slots

@router.post("/subjects/{subject_id}/slots/book", response_model=schemas.ExamSlotBookingResponse)
def book_exam_slot(
    subject_id: int,
    booking_in: schemas.ExamSlotBookingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    registration = verify_subject_registration(subject_id, current_user.id, db)
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    
    existing_booking = db.query(models.ExamSlotBooking).filter(
        models.ExamSlotBooking.user_id == current_user.id,
        models.ExamSlotBooking.subject_id == subject_id,
        models.ExamSlotBooking.status == "confirmed"
    ).first()
    
    if existing_booking:
        raise HTTPException(status_code=400, detail="You already have a confirmed booking for this subject.")
        
    booking_ref = f"BKG-{uuid.uuid4().hex[:6].upper()}"

    exam_window = db.query(models.ExamWindow).filter(models.ExamWindow.subject_id == subject_id).first()
    if not exam_window:
        raise HTTPException(status_code=400, detail="No exam window configured for this subject.")

    # Parse slot datetime and validate against exam window
    time_part = booking_in.slot_time.split(' - ')[0].strip()
    dt_str = f"{booking_in.slot_date} {time_part}"
    slot_dt = None
    for fmt in ("%Y-%m-%d %I:%M %p", "%Y-%m-%d %I:%M%p", "%Y-%m-%d %H:%M"):
        try:
            slot_dt = datetime.datetime.strptime(dt_str, fmt)
            break
        except ValueError:
            continue
            
    if not slot_dt:
        raise HTTPException(status_code=400, detail=f"Invalid slot date or time format provided: '{booking_in.slot_date} {booking_in.slot_time}'")
        
    slot_dt_iso = slot_dt.isoformat()
    slot_date_obj = slot_dt.date()
    slot_time_obj = slot_dt.time()
    
    # Check date window
    if slot_date_obj < exam_window.start_date.date() or slot_date_obj > exam_window.end_date.date():
        raise HTTPException(status_code=400, detail="Requested slot date is outside the configured exam window.")
        
    # Check daily time window
    try:
        win_start = datetime.datetime.strptime(exam_window.daily_start_time, "%H:%M").time()
        win_end = datetime.datetime.strptime(exam_window.daily_end_time, "%H:%M").time()
    except ValueError:
        win_start = datetime.time(9, 0)
        win_end = datetime.time(17, 0)
        
    if slot_time_obj < win_start or slot_time_obj >= win_end:
        raise HTTPException(status_code=400, detail="Requested slot time is outside the daily allowed hours.")

    subject_code = subject.code or f"SUB-{subject.id}"
    
    client_res = ExamEngineClient.book_slot(
        booking_reference=booking_ref,
        student_id=current_user.id,
        student_name=current_user.name,
        student_email=current_user.email,
        registration_number=registration.registration_number,
        subject_id=subject.id,
        subject_code=subject_code,
        subject_name=subject.name,
        level=subject.semester_tier or registration.current_tier or "District",
        slot_date=booking_in.slot_date,
        slot_time=booking_in.slot_time,
        slot_datetime=slot_dt_iso
    )
    
    # Handle explicit confirmation failures
    if not client_res.get("success"):
        raise HTTPException(
            status_code=502,
            detail=f"Exam Engine slot confirmation failed: {client_res.get('message', 'Unknown error')}"
        )
        
    link_status = client_res.get("link_status", "pending")
    is_link_active = (link_status == "confirmed")
    
    db_booking = models.ExamSlotBooking(
        user_id=current_user.id,
        subject_id=subject_id,
        registration_id=registration.id,
        slot_date=booking_in.slot_date,
        slot_time=booking_in.slot_time,
        slot_datetime=slot_dt,
        booking_reference=booking_ref,
        status="confirmed",
        exam_engine_slot_id=client_res.get("exam_engine_session_ref"),
        assessment_link=client_res.get("assessment_link"),
        is_link_active=is_link_active,
        link_status=link_status,
        exam_engine_session_ref=client_res.get("exam_engine_session_ref")
    )
    
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

@router.get("/slots", response_model=List[schemas.ExamSlotBookingResponse])
def get_my_slots(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    View all slots booked by the current student.
    """
    bookings = db.query(models.ExamSlotBooking).filter(
        models.ExamSlotBooking.user_id == current_user.id
    ).order_by(models.ExamSlotBooking.slot_datetime.asc()).all()
    return bookings

@router.delete("/slots/{booking_id}")
def cancel_slot(
    booking_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.ExamSlotBooking).filter(
        models.ExamSlotBooking.id == booking_id,
        models.ExamSlotBooking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
        
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled.")
        
    if booking.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed assessment.")
        
    # Cancel via Exam Engine client
    ref = booking.exam_engine_session_ref or booking.exam_engine_slot_id
    if ref:
        ExamEngineClient.cancel_slot(ref)
        
    booking.status = "cancelled"
    db.commit()
    return {"message": "Booking cancelled successfully", "booking_reference": booking.booking_reference}

# ─── Course Progress Endpoints ──────────────────────────────────────────────────

import json

def verify_course_access_and_registration(course_id: int, user: models.User, db: Session) -> models.Course:
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if user.role not in ("admin", "sub_admin", "super_admin"):
        registration = db.query(models.StudentRegistration).filter(
            models.StudentRegistration.user_id == user.id,
            models.StudentRegistration.access_status == "active"
        ).first()
        if not registration:
            raise HTTPException(status_code=403, detail="No active program registration found.")

        mappings = db.query(models.SubjectCourseMapping).filter(
            models.SubjectCourseMapping.course_id == course_id
        ).all()
        subject_ids = [m.subject_id for m in mappings]

        if not subject_ids:
            raise HTTPException(status_code=403, detail="Access denied. Course is not assigned to any subject.")

        assignment = db.query(models.StudentSubjectAssignment).filter(
            models.StudentSubjectAssignment.user_id == user.id,
            models.StudentSubjectAssignment.registration_id == registration.id,
            models.StudentSubjectAssignment.subject_id.in_(subject_ids)
        ).first()

        if not assignment:
            raise HTTPException(status_code=403, detail="Access denied. Course is not explicitly assigned to you.")

    return course

def validate_linear_progression(course: models.Course, new_completed_items: list):
    modules_data = course.modules_data
    if not modules_data or not isinstance(modules_data, list) or len(modules_data) <= 1:
        return

    module_items = {}
    all_valid_items = set()
    for mIndex, mod in enumerate(modules_data):
        module_items[mIndex] = []
        lessons = mod.get("lessons") if isinstance(mod, dict) else None
        if lessons and isinstance(lessons, list):
            for lesson in lessons:
                if not isinstance(lesson, dict):
                    continue
                l_key = str(lesson.get("id") or lesson.get("title") or "")
                contents = lesson.get("contents")
                if contents and isinstance(contents, list) and len(contents) > 0:
                    for cIndex, content in enumerate(contents):
                        if not isinstance(content, dict):
                            continue
                        c_id = content.get("id") if content.get("id") is not None else cIndex
                        c_str = str(c_id)
                        variants = {f"{l_key}_c{c_str}", f"{l_key}_{c_str}"}
                        if c_str.startswith("c"):
                            variants.add(f"{l_key}_c{c_str.lstrip('c')}")
                        module_items[mIndex].append(variants)
                        all_valid_items.update(variants)
                else:
                    item_id = f"{l_key}_l0"
                    module_items[mIndex].append({item_id})
                    all_valid_items.add(item_id)
        all_valid_items.add(f"mod_res_{mIndex}")

    if not isinstance(new_completed_items, list):
        raise HTTPException(status_code=400, detail="completed_items must be a list.")

    # Validate that submitted item IDs exist in the course structure
    for item_id in new_completed_items:
        if not isinstance(item_id, str):
            continue
        if "mod_res_" in item_id or "module_results" in item_id:
            continue
        if all_valid_items and item_id not in all_valid_items:
            raise HTTPException(status_code=400, detail=f"Invalid item ID provided: '{item_id}' does not belong to any module in this course.")

    submitted_set = set(new_completed_items)
    for mIndex in range(1, len(modules_data)):
        # Check if any item belonging to module mIndex is in submitted_set
        mod_items_present = any(variants.intersection(submitted_set) for variants in module_items[mIndex])
        if mod_items_present:
            # Check if module mIndex - 1 is fully completed (each required item must have at least one variant in submitted_set)
            prev_incomplete = any(not variants.intersection(submitted_set) for variants in module_items[mIndex - 1])
            if prev_incomplete:
                prev_title = modules_data[mIndex - 1].get("title", f"Module {mIndex}") if isinstance(modules_data[mIndex - 1], dict) else f"Module {mIndex}"
                curr_title = modules_data[mIndex].get("title", f"Module {mIndex + 1}") if isinstance(modules_data[mIndex], dict) else f"Module {mIndex + 1}"
                raise HTTPException(status_code=400, detail=f"Linear progression rule violation: Preceding module '{prev_title}' must be completed before progressing to module '{curr_title}'.")

@router.get("/courses/{course_id}/progress")
def get_course_progress(
    course_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_course_access_and_registration(course_id=course_id, user=current_user, db=db)
    progress = db.query(models.UserCourseProgress).filter(
        models.UserCourseProgress.user_id == current_user.id,
        models.UserCourseProgress.course_id == course_id
    ).first()
    if not progress:
        return {"completed_items": [], "quiz_answers": {}}
    try:
        completed = json.loads(progress.completed_items or "[]")
    except Exception:
        completed = []
    try:
        answers = json.loads(progress.quiz_answers or "{}")
    except Exception:
        answers = {}
    return {"completed_items": completed, "quiz_answers": answers}

@router.put("/courses/{course_id}/progress")
def update_course_progress(
    course_id: int,
    payload: schemas.UserCourseProgressUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = verify_course_access_and_registration(course_id=course_id, user=current_user, db=db)
    if payload.completed_items is not None:
        validate_linear_progression(course=course, new_completed_items=payload.completed_items)

    progress = db.query(models.UserCourseProgress).filter(
        models.UserCourseProgress.user_id == current_user.id,
        models.UserCourseProgress.course_id == course_id
    ).first()
    if not progress:
        progress = models.UserCourseProgress(
            user_id=current_user.id,
            course_id=course_id,
            completed_items="[]",
            quiz_answers="{}"
        )
        db.add(progress)
    if payload.completed_items is not None:
        progress.completed_items = json.dumps(payload.completed_items)
    if payload.quiz_answers is not None:
        progress.quiz_answers = json.dumps(payload.quiz_answers)
    db.commit()
    db.refresh(progress)
    return {"status": "success", "completed_items": json.loads(progress.completed_items), "quiz_answers": json.loads(progress.quiz_answers)}

@router.get("/results", response_model=List[schemas.ExamResultResponse])
def get_my_exam_results(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all assessment results received from the Exam Engine for the current student.
    """
    results = db.query(models.ExamResult).filter(
        models.ExamResult.student_id == current_user.id
    ).order_by(models.ExamResult.received_at.desc()).all()
    return results

@router.get("/slots/{booking_reference}/result", response_model=schemas.ExamResultResponse)
def get_booking_result(
    booking_reference: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch the ExamResult for a specific booking reference.
    Returns 404 if the result has not yet been received from the Exam Engine.
    """
    result = db.query(models.ExamResult).filter(
        models.ExamResult.booking_ref == booking_reference
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not yet received from Examination Engine")
    return result
