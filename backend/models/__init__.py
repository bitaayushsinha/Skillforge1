from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from database import Base
from .certificate import Certificate
from .exam import QuestionBank, Question, ExamConfig, ExamSession, ExamCredential, ExamAnswer, ExamViolationLog, ExamAuditLog

class RegistrationCycle(Base):
    __tablename__ = "registration_cycles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="learner")
    is_active = Column(Boolean, default=True)
    streak = Column(Integer, default=0)
    xp_points = Column(Integer, default=0)
    weekly_goal_hours = Column(Float, default=8.0)
    weekly_progress_hours = Column(Float, default=0.0)
    institution_id = Column(Integer, nullable=True, index=True)
    specialization = Column(String, nullable=True, index=True)
    must_change_password = Column(Boolean, default=False)
    force_password_change = Column(Boolean, default=False)

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    rating = Column(Float, default=0.0)
    students_count = Column(Integer, default=0)
    hours = Column(Integer, default=0)
    is_ai_generated = Column(Boolean, default=True)
    is_expert_validated = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)
    modules_data = Column(JSON, nullable=True)
    quiz_questions = Column(JSON, nullable=True)

class Expert(Base):
    __tablename__ = "experts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    bio = Column(Text, nullable=False)
    avatar_url = Column(String, nullable=True)
    courses_validated_count = Column(Integer, default=0)

class Stat(Base):
    __tablename__ = "stats"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=False)
    label = Column(String, nullable=False)

class CourseProposal(Base):
    __tablename__ = "course_proposals"

    id = Column(Integer, primary_key=True, index=True)
    course_name = Column(String, nullable=False)
    reason_to_learn = Column(String, nullable=False)
    skill_level = Column(String, nullable=False)
    preferred_learning_style = Column(Text, nullable=False)
    expected_outcome = Column(Text, nullable=False)
    additional_notes = Column(Text, nullable=True)
    public_voting = Column(Boolean, default=False)
    status = Column(String, default="pending")
    learner_id = Column(Integer, nullable=True)
    learner_name = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    
    # AI Preprocessing fields
    ai_summary = Column(Text, nullable=True)
    ai_category = Column(String, nullable=True)
    risk_level = Column(String, nullable=True)
    demand_score = Column(Integer, nullable=True)
    ai_recommendation = Column(String, nullable=True)
    duplicate_status = Column(Boolean, default=False)
    ai_flagged_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    rejection_reason = Column(String, nullable=True)
    reviewer_feedback = Column(Text, nullable=True)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    action_url = Column(String, nullable=True)
    action_label = Column(String, nullable=True)

class ProposalVote(Base):
    __tablename__ = "proposal_votes"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, index=True, nullable=False)
    user_id = Column(Integer, index=True, nullable=False)
    vote_type = Column(String, nullable=False)

class ProposalComment(Base):
    __tablename__ = "proposal_comments"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, index=True, nullable=False)
    user_id = Column(Integer, index=True, nullable=False)
    parent_comment_id = Column(Integer, index=True, nullable=True)
    content = Column(Text, nullable=False)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CourseFeedback(Base):
    __tablename__ = "course_feedback"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, index=True, nullable=False)
    user_id = Column(Integer, index=True, nullable=True)   # nullable for anonymous
    user_name = Column(String, nullable=False)
    rating = Column(Integer, nullable=False)               # 1-5 stars
    title = Column(String, nullable=True)
    comment = Column(Text, nullable=False)
    helpful_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CourseMaterial(Base):
    __tablename__ = "course_materials"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, index=True, nullable=False)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'video', 'text', 'pdf', 'image'
    content_url = Column(String, nullable=True)
    text_content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    code = Column(String, unique=True, index=True, nullable=True)
    address = Column(Text, nullable=True)
    contact_email = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SubAdminPrivilege(Base):
    __tablename__ = "subadmin_privileges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False, unique=True)
    manage_institutions = Column(Boolean, default=False)
    manage_students = Column(Boolean, default=False)
    allocate_specializations = Column(Boolean, default=False)
    view_reports = Column(Boolean, default=False)
    reset_passwords = Column(Boolean, default=False)
    bulk_upload = Column(Boolean, default=False)
    manage_content = Column(Boolean, default=False)
    custom_reports = Column(Boolean, default=False)
    enrollment_reports = Column(Boolean, default=False)
    verify_assessments = Column(Boolean, default=False)

class SubAdminInstitutionAccess(Base):
    __tablename__ = "subadmin_institution_access"

    id = Column(Integer, primary_key=True, index=True)
    subadmin_id = Column(Integer, index=True, nullable=False)
    institution_id = Column(Integer, index=True, nullable=False)

class Specialization(Base):
    __tablename__ = "specializations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    code = Column(String, unique=True, index=True, nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    specialization_id = Column(Integer, ForeignKey("specializations.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, index=True, nullable=True)
    description = Column(Text, nullable=True)
    semester_tier = Column(String, default="District")
    ai_mock_exams_enabled = Column(Boolean, default=True)
    daily_mock_attempts_limit = Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StudentSubjectAssignment(Base):
    __tablename__ = "student_subject_assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    registration_id = Column(Integer, ForeignKey("student_registrations.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

class ExamWindow(Base):
    __tablename__ = "exam_windows"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(String, nullable=False)
    cycle_year = Column(String, default="2026-2027", index=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    daily_start_time = Column(String, nullable=False)
    daily_end_time = Column(String, nullable=False)
    slot_duration_minutes = Column(Integer, default=60)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SubjectCourseMapping(Base):
    __tablename__ = "subject_course_mappings"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index = Column(Integer, default=0)

class MockTestAttempt(Base):
    __tablename__ = "mock_test_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_date = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    topic = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    total_questions = Column(Integer, default=10)
    status = Column(String, default="completed")

class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String, nullable=False)
    item_id = Column(Integer, nullable=False)
    title = Column(String, nullable=True)
    url_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class StudentRegistration(Base):
    __tablename__ = "student_registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=True, index=True)
    specialization_id = Column(Integer, ForeignKey("specializations.id", ondelete="RESTRICT"), nullable=True, index=True)
    registration_number = Column(String, unique=True, index=True, nullable=True)
    batch_name = Column(String, index=True, nullable=True)
    cycle_year = Column(String, default="2026-2027", index=True)
    current_tier = Column(String, default="District")
    access_status = Column(String, default="active")
    access_state = Column(String, default="active", index=True)
    status_started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    deactivates_at = Column(DateTime(timezone=True), nullable=True)
    grace_period_end = Column(DateTime(timezone=True), nullable=True)
    payment_required = Column(Boolean, default=False)
    badge_tier = Column(String, nullable=True)
    payment_status = Column(String, default="unpaid")
    total_paid_amount = Column(Float, default=0.0)
    last_payment_date = Column(DateTime(timezone=True), nullable=True)
    district_score = Column(Float, nullable=True)
    state_score = Column(Float, nullable=True)
    national_score = Column(Float, nullable=True)
    innovation_hub_eligible = Column(Boolean, default=False)
    participation_cert_status = Column(String, default="pending_approval")
    cert_metadata = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False)
    attempt_count = Column(Integer, default=0)
    cooldown_until = Column(DateTime(timezone=True), nullable=True)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ExamSlotBooking(Base):
    __tablename__ = "exam_slot_bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    registration_id = Column(Integer, ForeignKey("student_registrations.id", ondelete="CASCADE"), nullable=True)
    slot_date = Column(String, nullable=False)
    slot_time = Column(String, nullable=False)
    slot_datetime = Column(DateTime(timezone=True), index=True, nullable=True)
    booking_reference = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="confirmed")
    exam_engine_slot_id = Column(String, nullable=True)
    assessment_link = Column(String, nullable=True)
    is_link_active = Column(Boolean, default=False)
    link_status = Column(String, default="pending")
    exam_engine_session_ref = Column(String, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ExamResult(Base):
    __tablename__ = "exam_results"

    id = Column(Integer, primary_key=True, index=True)
    booking_ref = Column(String, index=True, nullable=False)
    exam_engine_session_ref = Column(String, index=True, nullable=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    level = Column(String, nullable=True)
    score = Column(Float, nullable=False)
    pass_fail = Column(String, nullable=False)
    topic_breakdown = Column(JSON, nullable=True)
    correct_vs_selected = Column(JSON, nullable=True)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    raw_payload = Column(Text, nullable=True)
    verified_by_poc = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ticket_number = Column(String, unique=True, index=True, nullable=False)
    subject = Column(String, nullable=False)
    category = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="open", index=True)
    priority = Column(String, default="medium")
    admin_response = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String, default="normal")
    target_institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    target_specialization_id = Column(Integer, ForeignKey("specializations.id", ondelete="CASCADE"), nullable=True, index=True)
    target_batch = Column(String, index=True, nullable=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

class LiveSession(Base):
    __tablename__ = "live_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    host_name = Column(String, nullable=False)
    session_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, default=60)
    zoom_meeting_id = Column(String, nullable=True)
    zoom_join_url = Column(String, nullable=False)
    zoom_passcode = Column(String, nullable=True)
    target_institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    target_specialization_id = Column(Integer, ForeignKey("specializations.id", ondelete="CASCADE"), nullable=True)
    target_batch = Column(String, nullable=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="scheduled", index=True)  # scheduled, live, completed, cancelled
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CertificateIssue(Base):
    __tablename__ = "certificate_issues"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    learner_name = Column(String, nullable=False)
    learner_email = Column(String, nullable=False)
    course_name = Column(String, nullable=False)
    issue_description = Column(Text, nullable=False)
    status = Column(String, default="open", index=True)  # 'open', 'resolved'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class UserCourseProgress(Base):
    __tablename__ = "user_course_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    completed_items = Column(Text, default="[]")  # JSON string array of completed item IDs/keys
    quiz_answers = Column(Text, default="{}")     # JSON string dict of quiz answers
    last_accessed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    registration_id = Column(Integer, ForeignKey("student_registrations.id", ondelete="CASCADE"), nullable=False, index=True)
    target_tier = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    gst_amount = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    gateway_order_id = Column(String, index=True, nullable=True)
    gateway_payment_id = Column(String, index=True, nullable=True)
    status = Column(String, default="created")  # 'created', 'paid', 'failed'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

class AccessAuditLog(Base):
    __tablename__ = "access_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("student_registrations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, nullable=True)
    previous_state = Column(String, nullable=True)
    new_state = Column(String, nullable=False)
    trigger_event = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    admin_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient = Column(String, index=True, nullable=False)
    template_type = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    status = Column(String, default="sent")  # 'sent', 'failed', 'mocked'
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), server_default=func.now())

class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sender_name = Column(String, nullable=True)
    sender_role = Column(String, nullable=True)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LeaderboardSnapshot(Base):
    __tablename__ = "leaderboard_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    cycle_year = Column(String, index=True, nullable=False)
    tier = Column(String, index=True, nullable=False) # "Institution", "District", "State", "National"
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    
    avg_score = Column(Float, nullable=False, default=0.0)
    pass_rate = Column(Float, nullable=False, default=0.0)
    total_students = Column(Integer, nullable=False, default=0)
    total_passed = Column(Integer, nullable=False, default=0)
    
    rank = Column(Integer, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
