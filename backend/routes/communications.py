import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import (
    get_current_user,
    verifySubAdminOrAdmin,
    get_subadmin_allowed_institution_ids,
)
from services.mailer import MailerService

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _assert_sub_admin_scope(current_user: models.User, target_institution_id: Optional[int], db: Session):
    """Raise 403 if a sub-admin targets an institution outside their scope."""
    if current_user.role == "admin":
        return
    allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
    if allowed_ids is None:
        return  # unrestricted sub-admin
    if target_institution_id is not None and target_institution_id not in allowed_ids:
        raise HTTPException(
            status_code=403,
            detail="Access Denied: You cannot target an institution outside your administrative scope.",
        )


def _student_registration(user_id: int, db: Session) -> Optional[models.StudentRegistration]:
    return (
        db.query(models.StudentRegistration)
        .filter(
            models.StudentRegistration.user_id == user_id,
            models.StudentRegistration.access_status == "active",
        )
        .first()
    )


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2 — FORCED PASSWORD CHANGE
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/change-password", summary="Change password (clears force_password_change flag)")
def change_password(
    req: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Student uses this after first login to clear the force_password_change flag.
    Accepts either the hashed or the plain-text current_password for backwards compat.
    """
    import hashlib

    def _hash(pw: str) -> str:
        return hashlib.sha256(pw.encode()).hexdigest()

    if (
        current_user.hashed_password != req.current_password
        and current_user.hashed_password != _hash(req.current_password)
    ):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    current_user.hashed_password = _hash(req.new_password)
    current_user.must_change_password = False
    current_user.force_password_change = False
    db.commit()
    return {"message": "Password changed successfully."}


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3 — ANNOUNCEMENTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/announcements", response_model=List[schemas.AnnouncementResponse])
def get_announcements(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Admin: returns all announcements.
    Student: returns announcements targeted at their institution/specialization/batch.
    Each announcement includes an 'is_read' field for the notification bar.
    """
    if current_user.role in ["admin", "sub_admin"]:
        announcements = (
            db.query(models.Announcement)
            .order_by(models.Announcement.created_at.desc())
            .all()
        )
        return [schemas.AnnouncementResponse(**a.__dict__, is_read=True) for a in announcements]

    registration = _student_registration(current_user.id, db)
    query = db.query(models.Announcement)

    if registration:
        query = query.filter(
            (models.Announcement.target_institution_id == None)
            | (models.Announcement.target_institution_id == registration.institution_id),
            (models.Announcement.target_specialization_id == None)
            | (models.Announcement.target_specialization_id == registration.specialization_id),
            (models.Announcement.target_batch == None)
            | (models.Announcement.target_batch == registration.batch_name),
        )
    else:
        query = query.filter(
            models.Announcement.target_institution_id == None,
            models.Announcement.target_specialization_id == None,
            models.Announcement.target_batch == None,
        )

    # Expire filter: skip announcements that have passed their expiry
    now = datetime.datetime.now(datetime.timezone.utc)
    query = query.filter(
        (models.Announcement.expires_at == None) | (models.Announcement.expires_at > now)
    )

    announcements = query.order_by(models.Announcement.created_at.desc()).all()

    # Resolve read state for each announcement
    read_ids = {
        r.announcement_id
        for r in db.query(models.AnnouncementRead)
        .filter(models.AnnouncementRead.user_id == current_user.id)
        .all()
    }

    result = []
    for a in announcements:
        data = {**a.__dict__}
        data["is_read"] = a.id in read_ids
        result.append(schemas.AnnouncementResponse(**data))
    return result


@router.post("/announcements", response_model=schemas.AnnouncementResponse, status_code=201)
def create_announcement(
    announcement_in: schemas.AnnouncementCreate,
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db),
):
    """Create a targeted announcement; sub-admins are restricted to their institution scope."""
    _assert_sub_admin_scope(current_user, announcement_in.target_institution_id, db)

    db_ann = models.Announcement(
        **announcement_in.model_dump(),
        author_id=current_user.id,
    )
    db.add(db_ann)
    db.commit()
    db.refresh(db_ann)
    return schemas.AnnouncementResponse(**db_ann.__dict__, is_read=True)


@router.post("/announcements/{announcement_id}/read", status_code=200, response_model=schemas.MessageResponse)
def mark_announcement_read(
    announcement_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single announcement as read for the current user."""
    exists = db.query(models.AnnouncementRead).filter(
        models.AnnouncementRead.user_id == current_user.id,
        models.AnnouncementRead.announcement_id == announcement_id,
    ).first()
    if not exists:
        db.add(models.AnnouncementRead(user_id=current_user.id, announcement_id=announcement_id))
        db.commit()
    return {"message": "Marked as read."}


@router.post("/announcements/mark-all-read", status_code=200)
def mark_all_announcements_read(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all visible announcements as read for the current student."""
    registration = _student_registration(current_user.id, db)
    query = db.query(models.Announcement)
    if registration:
        query = query.filter(
            (models.Announcement.target_institution_id == None)
            | (models.Announcement.target_institution_id == registration.institution_id),
            (models.Announcement.target_specialization_id == None)
            | (models.Announcement.target_specialization_id == registration.specialization_id),
            (models.Announcement.target_batch == None)
            | (models.Announcement.target_batch == registration.batch_name),
        )
    announcements = query.all()
    for a in announcements:
        exists = db.query(models.AnnouncementRead).filter(
            models.AnnouncementRead.user_id == current_user.id,
            models.AnnouncementRead.announcement_id == a.id,
        ).first()
        if not exists:
            db.add(models.AnnouncementRead(user_id=current_user.id, announcement_id=a.id))
    db.commit()
    return {"message": f"Marked {len(announcements)} announcement(s) as read."}


@router.delete("/announcements/{announcement_id}", status_code=204)
def delete_announcement(
    announcement_id: int,
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db),
):
    ann = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")
    _assert_sub_admin_scope(current_user, ann.target_institution_id, db)
    db.delete(ann)
    db.commit()
    return None


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4 — SUPPORT TICKETS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/tickets", response_model=List[schemas.SupportTicketResponse])
def get_tickets(
    status_filter: Optional[str] = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Learner: own tickets only.
    Admin/Sub-admin: all tickets (sub-admin scoped by their institutions).
    """
    if current_user.role in ["admin", "sub_admin"]:
        query = db.query(models.SupportTicket)
        if current_user.role == "sub_admin":
            allowed_ids = get_subadmin_allowed_institution_ids(current_user, db)
            if allowed_ids is not None:
                # Scope to students within allowed institutions
                scoped_user_ids = [
                    u.id
                    for u in db.query(models.User)
                    .filter(models.User.institution_id.in_(allowed_ids))
                    .all()
                ]
                query = query.filter(models.SupportTicket.user_id.in_(scoped_user_ids))
        if status_filter:
            query = query.filter(models.SupportTicket.status == status_filter)
        tickets = query.order_by(models.SupportTicket.created_at.desc()).all()
    else:
        query = db.query(models.SupportTicket).filter(
            models.SupportTicket.user_id == current_user.id
        )
        if status_filter:
            query = query.filter(models.SupportTicket.status == status_filter)
        tickets = query.order_by(models.SupportTicket.created_at.desc()).all()

    result = []
    for t in tickets:
        messages = (
            db.query(models.TicketMessage)
            .filter(models.TicketMessage.ticket_id == t.id)
            .order_by(models.TicketMessage.created_at.asc())
            .all()
        )
        t_dict = {**t.__dict__}
        t_dict["messages"] = [schemas.TicketMessageResponse(**m.__dict__) for m in messages]
        result.append(schemas.SupportTicketResponse(**t_dict))
    return result


@router.post("/tickets", response_model=schemas.SupportTicketResponse, status_code=201)
def create_ticket(
    ticket_in: schemas.SupportTicketCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket_number = f"TKT-{uuid.uuid4().hex[:6].upper()}"
    db_ticket = models.SupportTicket(
        **ticket_in.model_dump(),
        user_id=current_user.id,
        ticket_number=ticket_number,
        status="open",
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)

    # Create opening message from student in thread
    opening_msg = models.TicketMessage(
        ticket_id=db_ticket.id,
        sender_id=current_user.id,
        sender_name=current_user.name,
        sender_role=current_user.role,
        body=ticket_in.message,
    )
    db.add(opening_msg)
    db.commit()
    db.refresh(db_ticket)

    messages = db.query(models.TicketMessage).filter(models.TicketMessage.ticket_id == db_ticket.id).all()
    t_dict = {**db_ticket.__dict__}
    t_dict["messages"] = [schemas.TicketMessageResponse(**m.__dict__) for m in messages]
    return schemas.SupportTicketResponse(**t_dict)


@router.post("/tickets/{ticket_id}/reply", response_model=schemas.SupportTicketResponse)
def reply_to_ticket(
    ticket_id: int,
    msg_in: schemas.TicketMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student or admin/sub-admin can add a threaded reply."""
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    if current_user.role == "learner" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only reply to your own tickets.")

    # Progress status: if admin/sub-admin replies on an open ticket → in_progress
    if current_user.role in ["admin", "sub_admin"] and ticket.status == "open":
        ticket.status = "in_progress"

    new_msg = models.TicketMessage(
        ticket_id=ticket_id,
        sender_id=current_user.id,
        sender_name=current_user.name,
        sender_role=current_user.role,
        body=msg_in.body,
    )
    db.add(new_msg)
    db.commit()

    # Notify the student when admin responds
    if current_user.role in ["admin", "sub_admin"]:
        student = db.query(models.User).filter(models.User.id == ticket.user_id).first()
        if student:
            # Background mailer (non-blocking)
            try:
                MailerService.send_ticket_update_email(
                    email=student.email,
                    name=student.name,
                    ticket_number=ticket.ticket_number,
                    subject_text=ticket.subject,
                    update_body=msg_in.body,
                    db=db,
                )
            except Exception:
                pass

    db.refresh(ticket)
    messages = db.query(models.TicketMessage).filter(models.TicketMessage.ticket_id == ticket.id).all()
    t_dict = {**ticket.__dict__}
    t_dict["messages"] = [schemas.TicketMessageResponse(**m.__dict__) for m in messages]
    return schemas.SupportTicketResponse(**t_dict)


@router.put("/tickets/{ticket_id}/status", response_model=schemas.SupportTicketResponse)
def update_ticket_status(
    ticket_id: int,
    payload: dict,
    current_user: models.User = Depends(verifySubAdminOrAdmin),
    db: Session = Depends(get_db),
):
    """Admin/Sub-admin updates ticket status and optionally adds an admin_response summary."""
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    new_status = payload.get("status")
    if new_status:
        valid_statuses = {"open", "in_progress", "resolved", "closed"}
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}.")
        ticket.status = new_status
        if new_status == "resolved":
            ticket.resolved_at = datetime.datetime.now(datetime.timezone.utc)

    admin_response = payload.get("admin_response")
    if admin_response:
        ticket.admin_response = admin_response

    db.commit()
    db.refresh(ticket)
    messages = db.query(models.TicketMessage).filter(models.TicketMessage.ticket_id == ticket.id).all()
    t_dict = {**ticket.__dict__}
    t_dict["messages"] = [schemas.TicketMessageResponse(**m.__dict__) for m in messages]
    return schemas.SupportTicketResponse(**t_dict)


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5 — LIVE SESSIONS
# ─────────────────────────────────────────────────────────────────────────────

def _verify_live_session_manager(current_user: models.User, db: Session):
    if current_user.role in ["admin", "expert"]:
        return
    if current_user.role == "sub_admin":
        priv = db.query(models.SubAdminPrivilege).filter(models.SubAdminPrivilege.user_id == current_user.id).first()
        if not priv or not getattr(priv, "manage_content", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: Sub-admin requires 'manage_content' privilege to manage live sessions."
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied: Role 'admin', 'sub_admin' (with manage_content), or 'expert' required."
    )


@router.get("/live-sessions", response_model=List[schemas.LiveSessionResponse])
def get_live_sessions(
    upcoming_only: bool = Query(True),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Admin/Sub-admin/Expert: see all sessions.
    Student: see active sessions scoped to their batch/specialization/institution.
    """
    query = db.query(models.LiveSession)

    if current_user.role in ["admin", "sub_admin", "expert"]:
        pass  # no scoping for admin/expert
    else:
        # Hide cancelled sessions from students
        query = query.filter(models.LiveSession.status != "cancelled")

        registration = _student_registration(current_user.id, db)
        if registration:
            query = query.filter(
                (models.LiveSession.target_institution_id == None)
                | (models.LiveSession.target_institution_id == registration.institution_id),
                (models.LiveSession.target_specialization_id == None)
                | (models.LiveSession.target_specialization_id == registration.specialization_id),
                (models.LiveSession.target_batch == None)
                | (models.LiveSession.target_batch == registration.batch_name),
            )
        else:
            query = query.filter(
                models.LiveSession.target_institution_id == None,
                models.LiveSession.target_specialization_id == None,
                models.LiveSession.target_batch == None,
            )

    if upcoming_only:
        now = datetime.datetime.now(datetime.timezone.utc)
        query = query.filter(models.LiveSession.session_datetime >= now)

    return query.order_by(models.LiveSession.session_datetime.asc()).all()


@router.post("/live-sessions", response_model=schemas.LiveSessionResponse, status_code=201)
def create_live_session(
    session_in: schemas.LiveSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin/Sub-admin/Expert creates a new live session with Zoom link."""
    _verify_live_session_manager(current_user, db)
    _assert_sub_admin_scope(current_user, session_in.target_institution_id, db)

    # Validate scheduled_at is in the future
    now = datetime.datetime.now(datetime.timezone.utc)
    dt = session_in.session_datetime
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    if dt <= now:
        raise HTTPException(status_code=400, detail="Scheduled session date/time must be in the future.")

    # Validate target specialization exists
    if session_in.target_specialization_id is not None:
        spec = db.query(models.Specialization).filter(models.Specialization.id == session_in.target_specialization_id).first()
        if not spec:
            raise HTTPException(status_code=404, detail=f"Specialization with id {session_in.target_specialization_id} not found.")

    payload = session_in.model_dump()
    if not payload.get("host_id"):
        payload["host_id"] = current_user.id

    db_session = models.LiveSession(
        **payload,
        created_by=current_user.id,
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.put("/live-sessions/{session_id}", response_model=schemas.LiveSessionResponse)
def update_live_session(
    session_id: int,
    session_in: schemas.LiveSessionUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_live_session_manager(current_user, db)
    session = db.query(models.LiveSession).filter(models.LiveSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found.")
    if current_user.role == "expert" and session.created_by != current_user.id and session.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Experts can only edit sessions they created or host.")
    _assert_sub_admin_scope(current_user, session_in.target_institution_id or session.target_institution_id, db)

    if session_in.target_specialization_id is not None:
        spec = db.query(models.Specialization).filter(models.Specialization.id == session_in.target_specialization_id).first()
        if not spec:
            raise HTTPException(status_code=404, detail=f"Specialization with id {session_in.target_specialization_id} not found.")

    for key, value in session_in.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(session, key, value)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/live-sessions/{session_id}", status_code=204)
def delete_live_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_live_session_manager(current_user, db)
    session = db.query(models.LiveSession).filter(models.LiveSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found.")
    if current_user.role == "expert" and session.created_by != current_user.id and session.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Experts can only delete sessions they created or host.")
    _assert_sub_admin_scope(current_user, session.target_institution_id, db)
    db.delete(session)
    db.commit()
    return None


# ─────────────────────────────────────────────────────────────────────────────
# EMAIL AUDIT LOG (admin only)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/email-logs", response_model=List[schemas.EmailLogResponse])
def get_email_logs(
    recipient: Optional[str] = Query(None),
    template_type: Optional[str] = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view email logs.")
    query = db.query(models.EmailLog)
    if recipient:
        query = query.filter(models.EmailLog.recipient.ilike(f"%{recipient}%"))
    if template_type:
        query = query.filter(models.EmailLog.template_type == template_type)
    return query.order_by(models.EmailLog.sent_at.desc()).limit(200).all()
