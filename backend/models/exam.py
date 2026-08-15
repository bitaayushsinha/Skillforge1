from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from database import Base

class QuestionBank(Base):
    __tablename__ = "exam_question_banks"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(String, nullable=False, index=True)  # e.g., District, State, National
    name = Column(String, nullable=False)
    bank_type = Column(String, default="formal") # formal or mock
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Question(Base):
    __tablename__ = "exam_questions"
    id = Column(Integer, primary_key=True, index=True)
    bank_id = Column(Integer, ForeignKey("exam_question_banks.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # List of strings
    correct_answer = Column(Integer, nullable=False)  # Index in options
    explanation = Column(Text, nullable=True)
    topic_tag = Column(String, default="General", nullable=True)


class ExamConfig(Base):
    __tablename__ = "exam_configs"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(String, nullable=False, index=True)
    duration_minutes = Column(Integer, default=60)
    question_count = Column(Integer, default=50)
    ai_mock_enabled = Column(Boolean, default=True)
    randomize_questions = Column(Boolean, default=True)
    requires_screenshare = Column(Boolean, default=False)
    max_attempts = Column(Integer, default=1)
    per_day_ai_limit = Column(Integer, default=3)
    max_violations = Column(Integer, default=3)
    
class ExamSession(Base):
    __tablename__ = "exam_sessions"
    id = Column(Integer, primary_key=True, index=True)
    session_ref = Column(String, unique=True, index=True, nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(String, nullable=False)
    booking_ref = Column(String, index=True, nullable=False)
    status = Column(String, default="pending")  # pending, active, suspended, completed, terminated
    start_time = Column(DateTime(timezone=True), nullable=True)
    suspended_at = Column(DateTime(timezone=True), nullable=True)
    remaining_duration = Column(Integer, nullable=True)  # in seconds
    question_set = Column(JSON, nullable=True)  # List of question IDs
    termination_reason = Column(Text, nullable=True)
    resume_approved_by = Column(String, nullable=True)
    resume_approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ExamCredential(Base):
    __tablename__ = "exam_credentials"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    temp_user_id = Column(String, unique=True, index=True, nullable=False)
    temp_password_hash = Column(String, nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="active")  # active, expired, revoked, used
    
class ExamAnswer(Base):
    __tablename__ = "exam_answers"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("exam_questions.id", ondelete="CASCADE"), nullable=False)
    answer = Column(Integer, nullable=True)
    saved_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ExamViolationLog(Base):
    __tablename__ = "exam_violation_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    violation_time = Column(String, nullable=False)  # Time string or seconds elapsed
    violation_type = Column(String, nullable=False)  # tab, fullscreen, eye, body, etc.
    message = Column(Text, nullable=False)
    severity = Column(Integer, default=1)
    action_taken = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ExamAuditLog(Base):
    __tablename__ = "exam_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    action = Column(String, nullable=False)  # credential_generated, login_attempt, session_suspended, admin_approved_resume
    description = Column(Text, nullable=True)
    actor_id = Column(String, nullable=True) # Admin ID or System or Temp User ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
