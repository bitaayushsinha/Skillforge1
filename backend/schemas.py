from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from typing import Optional, List, Any
from datetime import datetime

class MessageResponse(BaseModel):
    message: str

class SuccessResponse(BaseModel):
    success: bool
    status: Optional[str] = None
    message: Optional[str] = None
    
class ActionStatusResponse(BaseModel):
    status: str
    message: Optional[str] = None
    cred_status: Optional[str] = None
    
class WebhookSuccessResponse(BaseModel):
    status: str
    booking_reference: str
    link_status: Optional[str] = None
    assessment_link: Optional[str] = None
    result_id: Optional[int] = None
    score: Optional[float] = None
    pass_fail: Optional[str] = None
    fsm_transition: Optional[Any] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    institution_id: Optional[int] = None
    specialization: Optional[str] = None

class UserCreateByAdmin(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str
    institution_id: Optional[int] = None
    specialization: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserGoogleLogin(BaseModel):
    id_token: str

class UserUpdate(BaseModel):
    email: EmailStr
    name: str
    weekly_goal_hours: float
    password: Optional[str] = None
    institution_id: Optional[int] = None
    specialization: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    is_active: bool
    role: str
    streak: Optional[int] = 0
    xp_points: Optional[int] = 0
    weekly_goal_hours: Optional[float] = 8.0
    weekly_progress_hours: Optional[float] = 0.0
    institution_id: Optional[int] = None
    specialization: Optional[str] = None
    must_change_password: Optional[bool] = False
    force_password_change: Optional[bool] = False
    warning: Optional[str] = None

    class Config:
        from_attributes = True

class SpecializationResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class CourseResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    rating: float
    students_count: int
    hours: int
    is_ai_generated: bool
    is_expert_validated: bool
    image_url: Optional[str] = None
    modules_data: Optional[List[Any]] = None
    quiz_questions: Optional[List[Any]] = None

    class Config:
        from_attributes = True

class ExpertResponse(BaseModel):
    id: int
    name: str
    role: str
    bio: str
    avatar_url: Optional[str] = None
    courses_validated_count: int

    class Config:
        from_attributes = True

class StatResponse(BaseModel):
    id: int
    key: str
    value: str
    label: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class CourseProposalCreate(BaseModel):
    course_name: str
    reason_to_learn: str
    skill_level: str
    preferred_learning_style: str
    expected_outcome: str
    additional_notes: Optional[str] = None
    public_voting: bool = False
    learner_id: Optional[int] = None
    learner_name: Optional[str] = None
    profile_image: Optional[str] = None

class CourseProposalResponse(CourseProposalCreate):
    id: int
    status: str
    ai_summary: Optional[str] = None
    ai_category: Optional[str] = None
    risk_level: Optional[str] = None
    demand_score: Optional[int] = None
    ai_recommendation: Optional[str] = None
    duplicate_status: bool = False
    ai_flagged_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    reviewer_feedback: Optional[str] = None
    upvotes: int = 0
    downvotes: int = 0
    comment_count: int = 0
    user_vote: Optional[str] = None

    class Config:
        from_attributes = True

class VoteRequest(BaseModel):
    vote_type: str

class CommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[int] = None

class CommentResponse(BaseModel):
    id: int
    proposal_id: int
    user_id: int
    parent_comment_id: Optional[int] = None
    content: str
    likes: int
    created_at: datetime
    user_name: str
    user_image: Optional[str] = None

    class Config:
        from_attributes = True

class ProposalStatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None
    reviewer_feedback: Optional[str] = None

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime
    action_url: Optional[str] = None
    action_label: Optional[str] = None

    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str

class RoleUpdate(BaseModel):
    role: str

class CourseCreateUpdate(BaseModel):
    title: str
    description: str
    category: str
    rating: float
    students_count: int
    hours: int
    is_ai_generated: bool
    is_expert_validated: bool
    image_url: Optional[str] = None
    modules_data: Optional[List[Any]] = None
    quiz_questions: Optional[List[Any]] = None

class CourseMaterialCreate(BaseModel):
    title: str
    type: str
    content_url: Optional[str] = None
    text_content: Optional[str] = None

class CourseMaterialsUpdate(BaseModel):
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    image_url: Optional[str] = None
    text_content: Optional[str] = None

class CourseMaterialResponse(CourseMaterialCreate):
    id: int
    course_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CertificateCreate(BaseModel):
    user_id: int
    course_id: int
    course_name: str
    cert_id: str
    issue_date: str

class CertificateResponse(CertificateCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Course Feedback ---
class CourseFeedbackCreate(BaseModel):
    course_id: int
    rating: int          # 1-5
    title: Optional[str] = None
    comment: str

class CourseFeedbackResponse(BaseModel):
    id: int
    course_id: int
    user_id: Optional[int] = None
    user_name: str
    rating: int
    title: Optional[str] = None
    comment: str
    helpful_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class SubscriberCreate(BaseModel):
    email: str

class SubscriberResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer: int

class QuizGenerationRequest(BaseModel):
    count: int = 5
    course_title: Optional[str] = None
    course_description: Optional[str] = None
    modules_data: Optional[List[Any]] = None

class AssessmentQuestion(BaseModel):
    question: str
    options: List[str]
    answer: int
    explanation: Optional[str] = None

class AssessmentTopicRequest(BaseModel):
    topic: str
    difficulty: Optional[str] = "Intermediate"
    count: int = 10

# --- Admin & Sub-Admin Management Schemas ---

class InstitutionCreate(BaseModel):
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None

class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None

class InstitutionResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SubAdminPrivilegeCreateUpdate(BaseModel):
    manage_institutions: bool = False
    manage_students: bool = False
    allocate_specializations: bool = False
    view_reports: bool = False
    reset_passwords: bool = False
    bulk_upload: bool = False
    manage_content: bool = False
    custom_reports: bool = False
    enrollment_reports: bool = False
    verify_assessments: bool = False

    @field_validator("*", mode="before")
    @classmethod
    def convert_none_to_false(cls, v):
        return False if v is None else v

class SubAdminPrivilegeResponse(SubAdminPrivilegeCreateUpdate):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class SubAdminCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = "sub_admin"
    privileges: Optional[SubAdminPrivilegeCreateUpdate] = None
    institution_ids: Optional[List[int]] = None

class SubAdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    privileges: Optional[SubAdminPrivilegeCreateUpdate] = None
    institution_ids: Optional[List[int]] = None

class SubAdminResponse(UserResponse):
    privileges: Optional[SubAdminPrivilegeResponse] = None
    institution_ids: Optional[List[int]] = None

    class Config:
        from_attributes = True

class SubAdminInstitutionAccessCreate(BaseModel):
    subadmin_id: int
    institution_id: int

class SubAdminInstitutionAccessResponse(BaseModel):
    id: int
    subadmin_id: int
    institution_id: int

    class Config:
        from_attributes = True

# --- Student Management & Bulk Upload Schemas ---

class StudentCreateAdmin(BaseModel):
    email: EmailStr
    name: str
    password: str
    institution_id: Optional[int] = None
    specialization: Optional[str] = None

class StudentUpdateAdmin(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    institution_id: Optional[int] = None
    specialization: Optional[str] = None
    weekly_goal_hours: Optional[float] = None
    is_active: Optional[bool] = None

class StudentPasswordReset(BaseModel):
    new_password: str

class SpecializationAllocation(BaseModel):
    specialization: str

class BulkSpecializationAllocation(BaseModel):
    student_ids: List[int]
    specialization: str

class BulkUploadRowError(BaseModel):
    row: int
    email: Optional[str] = None
    reason: str

class BulkUploadResponse(BaseModel):
    total_rows: int
    success_count: int
    error_count: int
    errors: List[BulkUploadRowError]

# --- Reports & Analytics Schemas ---

class EngagementReportResponse(BaseModel):
    total_students: int
    active_students: int
    inactive_students: int
    total_goal_hours: float
    total_progress_hours: float
    average_streak: float
    average_xp: float
    completion_rate: float
    total_certificates_issued: int

class InstitutionEnrollmentStat(BaseModel):
    institution_id: Optional[int] = None
    institution_name: str
    registered: int
    active: int
    inactive: int

class SpecializationStat(BaseModel):
    specialization: str
    student_count: int

class EnrollmentReportResponse(BaseModel):
    total_registered: int
    total_active: int
    total_inactive: int
    average_subjects_per_student: float
    by_institution: List[InstitutionEnrollmentStat]
    by_specialization: List[SpecializationStat]

class LeaderboardInstitutionStat(BaseModel):
    institution_id: Optional[int] = None
    institution_name: str
    avg_score: float
    pass_rate: float
    total_students: int
    total_passed: int
    rank: int

class LeaderboardResponse(BaseModel):
    tier: str
    cycle_year: str
    metric: str
    leaderboard: List[LeaderboardInstitutionStat]
    own_institution_id: Optional[int] = None

# --- Specialization & Curriculum Schemas ---
class SpecializationCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class SpecializationResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SubjectCreate(BaseModel):
    specialization_id: int
    institution_id: Optional[int] = None
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    semester_tier: Optional[str] = "District"
    ai_mock_exams_enabled: bool = True
    daily_mock_attempts_limit: int = 3

class MockTestAttemptResponse(BaseModel):
    id: int
    user_id: int
    attempt_date: datetime
    topic: Optional[str] = None
    score: Optional[float] = None
    total_questions: Optional[int] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True

class StartMockExamRequest(BaseModel):
    subject_id: Optional[int] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = "Intermediate"
    count: Optional[int] = 10

class BookmarkCreate(BaseModel):
    item_type: str
    item_id: int
    title: Optional[str] = None
    url_path: Optional[str] = None

class BookmarkResponse(BaseModel):
    id: int
    user_id: int
    item_type: str
    item_id: int
    title: Optional[str] = None
    url_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SubjectResponse(BaseModel):
    id: int
    specialization_id: int
    institution_id: Optional[int] = None
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    semester_tier: str
    ai_mock_exams_enabled: bool
    daily_mock_attempts_limit: int
    created_at: datetime

    class Config:
        from_attributes = True

class StudentSubjectAssignmentCreate(BaseModel):
    subject_id: int
    registration_id: int

class StudentSubjectAssignmentResponse(BaseModel):
    id: int
    user_id: int
    subject_id: int
    registration_id: int
    assigned_at: datetime

    class Config:
        from_attributes = True

class BulkSubjectAssignmentCreate(BaseModel):
    student_ids: List[int]
    subject_id: int

class ExamWindowCreate(BaseModel):
    subject_id: int
    level: str
    cycle_year: str = "2026-2027"
    start_date: datetime
    end_date: datetime
    daily_start_time: str
    daily_end_time: str
    slot_duration_minutes: int = 60

class ExamWindowUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    daily_start_time: Optional[str] = None
    daily_end_time: Optional[str] = None
    slot_duration_minutes: Optional[int] = None

class ExamWindowResponse(BaseModel):
    id: int
    subject_id: int
    level: str
    cycle_year: str
    start_date: datetime
    end_date: datetime
    daily_start_time: str
    daily_end_time: str
    slot_duration_minutes: int
    created_at: datetime

    class Config:
        from_attributes = True

class SubjectCourseMappingCreate(BaseModel):
    subject_id: int
    course_id: int
    order_index: int = 0

class SubjectCourseMappingResponse(BaseModel):
    id: int
    subject_id: int
    course_id: int
    order_index: int

    class Config:
        from_attributes = True

# --- Student Registration Schemas ---
class StudentRegistrationCreate(BaseModel):
    user_id: int
    institution_id: int
    specialization_id: int
    registration_number: Optional[str] = None
    batch_name: Optional[str] = None
    cycle_year: str = "2026-2027"

class StudentRegistrationResponse(BaseModel):
    id: int
    user_id: int
    institution_id: int
    specialization_id: int
    registration_number: Optional[str] = None
    batch_name: Optional[str] = None
    cycle_year: str
    current_tier: str
    access_status: str
    access_state: Optional[str] = "active"
    status_started_at: Optional[datetime] = None
    deactivates_at: Optional[datetime] = None
    grace_period_end: Optional[datetime] = None
    payment_required: bool = False
    badge_tier: Optional[str] = None
    payment_status: str = "unpaid"
    total_paid_amount: float = 0.0
    last_payment_date: Optional[datetime] = None
    district_score: Optional[float] = None
    state_score: Optional[float] = None
    national_score: Optional[float] = None
    innovation_hub_eligible: bool = False
    participation_cert_status: str = "pending_approval"
    cert_metadata: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Exam Slot Booking & Exam Result Schemas ---
class ExamSlotBookingCreate(BaseModel):
    subject_id: int
    slot_date: str
    slot_time: str

class ExamSlotBookingResponse(BaseModel):
    id: int
    user_id: int
    subject_id: int
    registration_id: Optional[int] = None
    slot_date: str
    slot_time: str
    slot_datetime: Optional[datetime] = None
    booking_reference: str
    status: str
    exam_engine_slot_id: Optional[str] = None
    assessment_link: Optional[str] = None
    is_link_active: bool
    link_status: str = "pending"
    exam_engine_session_ref: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ExamResultCreate(BaseModel):
    booking_ref: str
    exam_engine_session_ref: Optional[str] = None
    student_id: Optional[int] = None
    subject_id: Optional[int] = None
    level: Optional[str] = None
    score: float
    pass_fail: str
    topic_breakdown: Optional[Any] = None
    correct_vs_selected: Optional[Any] = None
    raw_payload: Optional[str] = None

class ExamResultResponse(BaseModel):
    id: int
    booking_ref: str
    exam_engine_session_ref: Optional[str] = None
    student_id: Optional[int] = None
    subject_id: Optional[int] = None
    level: Optional[str] = None
    score: float
    pass_fail: str
    topic_breakdown: Optional[Any] = None
    correct_vs_selected: Optional[Any] = None
    received_at: datetime
    raw_payload: Optional[str] = None
    verified_by_poc: bool = False
    verified_at: Optional[datetime] = None
    verified_by_id: Optional[int] = None

    class Config:
        from_attributes = True

class ExamResultWebhookPayload(BaseModel):
    user_id: int
    subject_id: int
    exam_engine_slot_id: str
    score: float
    status: str = "completed"

# --- Exam Engine (Phase 2) Schemas ---
class QuestionBankCreate(BaseModel):
    subject_id: int
    level: str
    name: str
    bank_type: str = "formal"
    is_active: Optional[bool] = True

class QuestionBankResponse(QuestionBankCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    text: str
    options: List[str]
    correct_answer: int
    explanation: Optional[str] = None

class QuestionResponse(QuestionCreate):
    id: int
    bank_id: int

    class Config:
        from_attributes = True

class QuestionUploadResponse(BaseModel):
    success: bool
    imported_count: int
    errors: List[str] = []

class ExamConfigCreate(BaseModel):
    subject_id: int
    level: str
    duration_minutes: int = 60
    question_count: int = 60
    ai_mock_enabled: bool = True
    randomize_questions: bool = True
    max_attempts: int = 1
    per_day_ai_limit: int = 3
    max_violations: int = 3
    requires_screenshare: bool = False

class ExamConfigUpdate(BaseModel):
    duration_minutes: Optional[int] = None
    question_count: Optional[int] = None
    ai_mock_enabled: Optional[bool] = None
    randomize_questions: Optional[bool] = None
    max_attempts: Optional[int] = None
    per_day_ai_limit: Optional[int] = None
    max_violations: Optional[int] = None
    requires_screenshare: Optional[bool] = None

class ExamConfigResponse(ExamConfigCreate):
    id: int

    class Config:
        from_attributes = True

class SlotBookRequest(BaseModel):
    booking_reference: str
    student_id: int
    student_name: str
    student_email: str
    registration_number: Optional[str] = None
    subject_id: int
    subject_code: str
    subject_name: str
    level: str
    slot_date: Optional[str] = None
    slot_time: Optional[str] = None
    slot_datetime: Optional[str] = None
    webhook_callback_url: str

class SlotBookResponse(BaseModel):
    success: bool
    booking_reference: str
    exam_engine_session_ref: Optional[str] = None
    assessment_link: Optional[str] = None
    link_status: str
    message: str

class CredentialVerifyResponse(BaseModel):
    is_valid: bool
    status: str
    student_name: str
    subject_name: str
    level: str
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    requires_screenshare: bool = False

class ExamQuestionPayload(BaseModel):
    id: int
    text: str
    options: List[str]

class PreviousAnswer(BaseModel):
    question_id: int
    answer: Optional[int] = None

class ExamStartResponse(BaseModel):
    session_ref: str
    duration_minutes: int
    remaining_seconds: Optional[int] = None
    previous_answers: Optional[List[PreviousAnswer]] = []
    questions: List[ExamQuestionPayload]
    start_time: datetime

class ExamAnswerRequest(BaseModel):
    question_id: int
    answer: int

class ViolationCreate(BaseModel):
    type: str
    message: str
    severity: Optional[int] = 1

class ExamSubmitResponse(BaseModel):
    success: bool
    score_percentage: float
    passed: bool
    message: str
    topic_breakdown: Optional[Any] = None
    level: Optional[str] = None


# --- Support Ticket & Announcement Schemas ---
class TicketMessageCreate(BaseModel):
    body: str

class TicketMessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_id: Optional[int] = None
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    body: str
    created_at: datetime

    class Config:
        from_attributes = True

class SupportTicketCreate(BaseModel):
    subject: str
    category: str
    message: str
    priority: str = "medium"

class SupportTicketResponse(BaseModel):
    id: int
    user_id: int
    ticket_number: str
    subject: str
    category: str
    message: str
    status: str
    priority: str
    admin_response: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: Optional[List[TicketMessageResponse]] = []

    class Config:
        from_attributes = True

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"
    target_institution_id: Optional[int] = None
    target_specialization_id: Optional[int] = None
    target_batch: Optional[str] = None
    expires_at: Optional[datetime] = None

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    priority: str
    target_institution_id: Optional[int] = None
    target_specialization_id: Optional[int] = None
    target_batch: Optional[str] = None
    author_id: Optional[int] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_read: Optional[bool] = False

    class Config:
        from_attributes = True

class LiveSessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    host_name: str
    host_id: Optional[int] = None
    session_datetime: datetime
    duration_minutes: int = 60
    zoom_join_url: str
    zoom_meeting_id: Optional[str] = None
    zoom_passcode: Optional[str] = None
    target_institution_id: Optional[int] = None
    target_specialization_id: Optional[int] = None
    target_batch: Optional[str] = None
    status: Optional[str] = "scheduled"

class LiveSessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    host_name: Optional[str] = None
    host_id: Optional[int] = None
    session_datetime: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    zoom_join_url: Optional[str] = None
    zoom_meeting_id: Optional[str] = None
    zoom_passcode: Optional[str] = None
    target_institution_id: Optional[int] = None
    target_specialization_id: Optional[int] = None
    target_batch: Optional[str] = None
    status: Optional[str] = None

class LiveSessionResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    host_name: str
    host_id: Optional[int] = None
    session_datetime: datetime
    duration_minutes: int
    zoom_join_url: str
    zoom_meeting_id: Optional[str] = None
    zoom_passcode: Optional[str] = None
    target_institution_id: Optional[int] = None
    target_specialization_id: Optional[int] = None
    target_batch: Optional[str] = None
    status: Optional[str] = "scheduled"
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class EmailLogResponse(BaseModel):
    id: int
    recipient: str
    template_type: str
    subject: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    sent_at: datetime

    class Config:
        from_attributes = True

class CertificateIssueCreate(BaseModel):
    learner_name: str
    learner_email: str
    course_name: str
    issue_description: str

class CertificateIssueUpdate(BaseModel):
    learner_name: Optional[str] = None
    learner_email: Optional[str] = None
    course_name: Optional[str] = None
    issue_description: Optional[str] = None
    status: Optional[str] = None

class CertificateIssueResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    learner_name: str
    learner_email: str
    course_name: str
    issue_description: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserCourseProgressUpdate(BaseModel):
    completed_items: Optional[List[Any]] = None
    quiz_answers: Optional[Any] = None

class UserCourseProgressResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    completed_items: List[Any]
    quiz_answers: Any
    last_accessed_at: datetime

    class Config:
        from_attributes = True

class PaymentOrderCreate(BaseModel):
    registration_id: int
    target_tier: str

class PaymentOrderResponse(BaseModel):
    order_id: str
    amount: float
    currency: str
    target_tier: str
    key_id: Optional[str] = None

class PaymentVerification(BaseModel):
    registration_id: int
    target_tier: str
    order_id: str
    payment_id: str
    signature: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class PaymentRecordResponse(BaseModel):
    id: int
    user_id: int
    registration_id: int
    target_tier: str
    amount: float
    gst_amount: float
    total_amount: float
    currency: str
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AccessAuditLogResponse(BaseModel):
    id: int
    registration_id: int
    user_id: Optional[int] = None
    previous_state: Optional[str] = None
    new_state: str
    trigger_event: str
    reason: Optional[str] = None
    admin_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# COMMUNICATION LAYER SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: Optional[str] = "normal"
    target_institution_id: Optional[int] = None
    target_specialization_id: Optional[int] = None
    target_batch: Optional[str] = None
    expires_at: Optional[datetime] = None

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    priority: Optional[str] = "normal"
    target_institution_id: Optional[int] = None
    target_specialization_id: Optional[int] = None
    target_batch: Optional[str] = None
    expires_at: Optional[datetime] = None
    author_id: Optional[int] = None
    created_at: datetime
    is_read: Optional[bool] = False

    class Config:
        from_attributes = True


class TicketMessageCreate(BaseModel):
    body: str

class TicketMessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_id: Optional[int] = None
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class SupportTicketCreate(BaseModel):
    subject: str
    category: Optional[str] = "General Inquiry"
    priority: Optional[str] = "medium"
    message: str

class SupportTicketResponse(BaseModel):
    id: int
    user_id: int
    ticket_number: str
    subject: str
    category: Optional[str] = None
    priority: Optional[str] = "medium"
    status: str
    message: Optional[str] = None
    admin_response: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    messages: Optional[List[TicketMessageResponse]] = []

    class Config:
        from_attributes = True



class EmailLogResponse(BaseModel):
    id: int
    recipient: str
    template_type: str
    subject: str
    status: str
    error_message: Optional[str] = None
    sent_at: datetime

    class Config:
        from_attributes = True

# Phase 5: Admin Aggregate Dashboards Schemas

class BatchAnalyticsItem(BaseModel):
    cycle_year: str
    total_students: int
    pass_rate: float
    avg_score: float

class ProgressionItem(BaseModel):
    tier: str
    student_count: int

class RevenueItem(BaseModel):
    tier: str
    total_revenue: float
    currency: str = "INR"

class AdminAggregateDashboardResponse(BaseModel):
    batch_analytics: List[BatchAnalyticsItem]
    progression: List[ProgressionItem]
    revenue: List[RevenueItem]

# --- Main-Admin Analytics Dashboards ---

class BatchAnalyticsStat(BaseModel):
    batch_name: str
    total_students: int
    active_students: int
    total_exams_taken: int
    total_passed: int
    pass_rate: float
    avg_score: float

class BatchAnalyticsResponse(BaseModel):
    batches: List[BatchAnalyticsStat]

class ProgressionTierStat(BaseModel):
    tier: str
    active: int
    grace_period: int
    deactivated: int
    pending_payment: int
    total: int

class ProgressionAnalyticsResponse(BaseModel):
    tiers: List[ProgressionTierStat]

class PaymentTierStat(BaseModel):
    tier: str
    paid_count: int
    pending_count: int
    failed_count: int
    total_revenue: float
    currency: str = "INR"

class PaymentAnalyticsResponse(BaseModel):
    tiers: List[PaymentTierStat]

class AccessStatusItem(BaseModel):
    registration_id: int
    student_name: str
    email: str
    institution_name: Optional[str] = None
    current_tier: str
    access_status: str
    grace_period_end: Optional[datetime] = None

class AccessStatusResponse(BaseModel):
    records: List[AccessStatusItem]

class AccessOverrideRequest(BaseModel):
    action: str
    reason: str




class CompletionStat(BaseModel):
    tier: str
    total_students: int
    completed: int
    dropped_out: int
    completion_rate: float
    drop_out_rate: float

class CompletionMetricsResponse(BaseModel):
    tiers: List[CompletionStat]

class TimeToCertificationStat(BaseModel):
    tier: str
    avg_days: float
    student_count: int

class TimeToCertificationResponse(BaseModel):
    tiers: List[TimeToCertificationStat]


class ViolationLogResponse(BaseModel):
    id: int
    session_id: int
    violation_time: str
    violation_type: str
    message: str
    severity: int
    action_taken: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
