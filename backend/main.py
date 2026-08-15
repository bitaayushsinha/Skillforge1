import hashlib
import os
import uuid
import datetime
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime


from database import engine, Base, get_db
import models
import schemas
from seed import seed_db
from ai_service import AIProposalService
import ai_service
import groq_service
from auth import create_access_token, verifyReviewerRole, get_current_user, get_current_user_optional, verifyAdminRole, verifyExpertRole
from migrate import migrate
from routes import exam_banks, exam_configs, exam_credentials, exam_reminders, exam_sessions, admin_analytics

# Initialize database tables and run seed if database is empty
Base.metadata.create_all(bind=engine)
migrate()

# Auto-migrate certificates table schema if upgrading sqlite local db
try:
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            conn.execute(text("SELECT qr_code_path, certificate_id, certificate_status, certificate_url FROM certificates LIMIT 1"))
        except Exception:
            print("Migrating certificates table schema...")
            for col_def in [
                "ADD COLUMN qr_code_path TEXT",
                "ADD COLUMN certificate_id VARCHAR(100)",
                "ADD COLUMN certificate_status VARCHAR(50) DEFAULT 'valid'",
                "ADD COLUMN certificate_url TEXT"
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE certificates {col_def}"))
                except Exception:
                    pass
            conn.commit()
except Exception as e_mig:
    print(f"Migration check completed: {e_mig}")

try:
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            conn.execute(text("SELECT topic_tag FROM exam_questions LIMIT 1"))
        except Exception:
            print("Migrating exam_questions table schema to add topic_tag...")
            try:
                conn.execute(text("ALTER TABLE exam_questions ADD COLUMN topic_tag VARCHAR(100) DEFAULT 'General'"))
                conn.commit()
            except Exception as e_q:
                print(f"exam_questions topic_tag migration note: {e_q}")

        for col_stmt in [
            "ADD COLUMN attempt_count INTEGER DEFAULT 0",
            "ADD COLUMN cooldown_until TIMESTAMP WITH TIME ZONE NULL",
            "ADD COLUMN is_locked BOOLEAN DEFAULT FALSE"
        ]:
            try:
                conn.execute(text(f"ALTER TABLE student_registrations {col_stmt}"))
                conn.commit()
            except Exception:
                pass
except Exception as e_mig2:
    print(f"migration check completed: {e_mig2}")



db = next(get_db())
try:
    if db.query(models.Course).count() == 0:
        print("Database empty. Seeding starter data...")
        seed_db()
finally:
    db.close()

app = FastAPI(title="SkillForge LMS API", version="1.0.0")

if os.getenv("SKIP_CREDENTIAL_WINDOW_ENFORCEMENT", "false").lower() == "true":
    print("=" * 80)
    print("WARNING: SKIP_CREDENTIAL_WINDOW_ENFORCEMENT IS ENABLED")
    print("WARNING: Exam credentials will be auto-confirmed instantly upon booking.")
    print("=" * 80)

app.include_router(exam_banks.router)
app.include_router(exam_configs.router)
app.include_router(exam_credentials.router)
app.include_router(exam_reminders.router)
app.include_router(exam_sessions.router)
app.include_router(admin_analytics.router)

# Mount static uploads serving
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
allow_origin_regex = os.getenv("ALLOW_ORIGIN_REGEX", r".*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.get("/", response_model=schemas.MessageResponse)
def read_root():
    return {"message": "Welcome to the SkillForge LMS API. Access docs at /docs"}

# Stats endpoint
@app.get("/api/stats", response_model=List[schemas.StatResponse])
def get_stats(db: Session = Depends(get_db)):
    stats = db.query(models.Stat).all()
    return stats

# Courses endpoint with filter and search capabilities
@app.get("/api/courses", response_model=List[schemas.CourseResponse])
def get_courses(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Course)
    
    if category and category != "All":
        query = query.filter(models.Course.category == category)
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.Course.title.ilike(search_filter)) | 
            (models.Course.description.ilike(search_filter))
        )
        
    return query.all()

@app.get("/api/courses/{course_id}/quiz", response_model=List[schemas.QuizQuestion])
def generate_course_quiz(course_id: int, count: int = 5, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if course.quiz_questions and len(course.quiz_questions) > 0:
        return course.quiz_questions
    return []

@app.post("/api/courses/quiz/generate", response_model=List[schemas.QuizQuestion])
def generate_course_quiz_from_data(req: schemas.QuizGenerationRequest):
    context_parts = []
    if req.course_title:
        context_parts.append(f"Course: {req.course_title}")
    if req.course_description:
        context_parts.append(f"Description: {req.course_description}")
        
    if req.modules_data:
        import json
        context_parts.append("Course Modules and Content:")
        context_parts.append(json.dumps(req.modules_data))
        
    context_text = "\n\n".join(context_parts)
    if len(context_text) > 10000:
        context_text = context_text[:10000]
        
    quiz_questions = ai_service.generate_quiz(context_text, count=req.count)
    return quiz_questions

@app.post("/api/assessment/generate", response_model=List[schemas.AssessmentQuestion])
def generate_topic_assessment_endpoint(
    req: schemas.AssessmentTopicRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Fetch user's active registration to get specialization/subjects
    registration = db.query(models.StudentRegistration).filter(
        models.StudentRegistration.user_id == current_user.id,
        models.StudentRegistration.access_status == "active"
    ).first()
    
    if not registration:
        raise HTTPException(status_code=403, detail="No active registration found.")
        
    subjects = db.query(models.Subject).filter(
        models.Subject.specialization_id == registration.specialization_id
    ).all()
    
    if not subjects:
        raise HTTPException(status_code=403, detail="No subjects assigned for mock tests.")
        
    subject = next((s for s in subjects if s.name.lower() == req.topic.lower()), None)
    if not subject:
        subject = subjects[0]
        
    config = None
    if subject:
        config = db.query(models.ExamConfig).filter(
            models.ExamConfig.subject_id == subject.id,
            models.ExamConfig.level == registration.current_tier
        ).first()

    # Get max daily limit from config, fallback to subject or 3
    if config and config.per_day_ai_limit is not None:
        daily_limit = config.per_day_ai_limit
    else:
        daily_limit = max([s.daily_mock_attempts_limit for s in subjects] + [3])
    
    # 2. Check today's attempts
    today = datetime.now().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    attempts_today = db.query(models.MockTestAttempt).filter(
        models.MockTestAttempt.user_id == current_user.id,
        models.MockTestAttempt.attempt_date >= today_start
    ).count()
    
    if attempts_today >= daily_limit:
        raise HTTPException(
            status_code=429, 
            detail=f"Daily mock test limit ({daily_limit}) exceeded. Please try again tomorrow."
        )
        
    # 3. Generate questions
    ai_enabled = config.ai_mock_enabled if config else True
    questions = None
    
    if ai_enabled:
        questions = ai_service.generate_topic_assessment(topic=req.topic, difficulty=req.difficulty or "Intermediate", count=req.count or 10)
        
    if not questions:
        # Fallback or Non-AI mode: Query mock question banks
        if not subject:
            raise HTTPException(status_code=400, detail="Cannot generate mock test: AI disabled and no matching subject found for question bank.")
            
        banks = db.query(models.QuestionBank).filter(
            models.QuestionBank.subject_id == subject.id,
            models.QuestionBank.level == registration.current_tier,
            models.QuestionBank.bank_type == "mock",
            models.QuestionBank.is_active == True
        ).all()
        
        bank_ids = [b.id for b in banks]
        all_q = db.query(models.Question).filter(models.Question.bank_id.in_(bank_ids)).all()
        
        if not all_q:
            raise HTTPException(status_code=404, detail="No mock questions available in the question bank for this subject.")
            
        q_count = req.count or 10
        if config and not config.randomize_questions:
            selected_q = all_q[:q_count]
        else:
            import random
            selected_q = random.sample(all_q, min(len(all_q), q_count))
            
        questions = [
            schemas.AssessmentQuestion(
                question=q.text,
                options=q.options,
                answer=q.correct_answer,
                explanation=q.explanation
            ) for q in selected_q
        ]
    
    # 4. Record attempt
    new_attempt = models.MockTestAttempt(
        user_id=current_user.id,
        topic=req.topic,
        attempt_date=datetime.utcnow()
    )
    db.add(new_attempt)
    db.commit()
    
    return questions

# Experts endpoint combined with unified handler later in this file


# Auth Register
@app.post("/api/auth/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        hashed_pwd = hash_password(user_in.password)
        if existing_user.hashed_password == hashed_pwd:
            # Re-registration / Reactivation logic
            if not existing_user.is_active:
                existing_user.is_active = True
            
            # Update name if provided
            if user_in.name and user_in.name != existing_user.name:
                existing_user.name = user_in.name
                
            db.commit()
            db.refresh(existing_user)
            
            # Create a StudentRegistration for the active cycle if it doesn't exist
            active_cycle = db.query(models.RegistrationCycle).filter(models.RegistrationCycle.is_active == True).first()
            if active_cycle:
                existing_reg = db.query(models.StudentRegistration).filter(
                    models.StudentRegistration.user_id == existing_user.id,
                    models.StudentRegistration.cycle_year == active_cycle.name
                ).first()
                if not existing_reg:
                    # Provide fallback defaults for DB constraints
                    fallback_inst = db.query(models.Institution).first()
                    fallback_spec = db.query(models.Specialization).first()
                    inst_id = fallback_inst.id if fallback_inst else 1
                    spec_id = fallback_spec.id if fallback_spec else 1
                    
                    new_reg = models.StudentRegistration(
                        user_id=existing_user.id,
                        cycle_year=active_cycle.name,
                        current_tier="District",
                        access_status="active",
                        is_archived=False,
                        institution_id=user_in.institution_id or inst_id,
                        specialization_id=spec_id
                    )
                    db.add(new_reg)
                    db.commit()
                    
            access_token = create_access_token(data={"sub": str(existing_user.id), "role": existing_user.role})
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": existing_user
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="A user with this email address already exists. If this is you, please use your existing password to re-register/reactivate, or log in."
            )
    
    # Create new user
    hashed_pwd = hash_password(user_in.password)
    db_user = models.User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=hashed_pwd,
        role="learner"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create initial StudentRegistration for new user
    active_cycle = db.query(models.RegistrationCycle).filter(models.RegistrationCycle.is_active == True).first()
    if active_cycle:
        fallback_inst = db.query(models.Institution).first()
        fallback_spec = db.query(models.Specialization).first()
        inst_id = fallback_inst.id if fallback_inst else 1
        spec_id = fallback_spec.id if fallback_spec else 1
        
        new_reg = models.StudentRegistration(
            user_id=db_user.id,
            cycle_year=active_cycle.name,
            current_tier="District",
            access_status="active",
            is_archived=False,
            institution_id=user_in.institution_id or inst_id,
            specialization_id=spec_id
        )
        db.add(new_reg)
        db.commit()
    
    access_token = create_access_token(data={"sub": str(db_user.id), "role": db_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

# Auth Login
@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not db_user:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password."
        )
    
    # Verify password
    hashed_pwd = hash_password(user_in.password)
    if db_user.hashed_password != hashed_pwd:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password."
        )
        
    # Reactivation logic for active cycle
    if db_user.role == "learner":
        active_cycle = db.query(models.RegistrationCycle).filter(models.RegistrationCycle.is_active == True).first()
        if active_cycle:
            existing_reg = db.query(models.StudentRegistration).filter(
                models.StudentRegistration.user_id == db_user.id,
                models.StudentRegistration.cycle_year == active_cycle.name
            ).first()
            if not existing_reg:
                fallback_inst = db.query(models.Institution).first()
                fallback_spec = db.query(models.Specialization).first()
                inst_id = fallback_inst.id if fallback_inst else 1
                spec_id = fallback_spec.id if fallback_spec else 1
                
                # Fetch last known institution and specialization if available
                last_reg = db.query(models.StudentRegistration).filter(
                    models.StudentRegistration.user_id == db_user.id
                ).order_by(models.StudentRegistration.id.desc()).first()
                
                new_reg = models.StudentRegistration(
                    user_id=db_user.id,
                    cycle_year=active_cycle.name,
                    current_tier="District",
                    access_status="active",
                    is_archived=False,
                    institution_id=last_reg.institution_id if last_reg else inst_id,
                    specialization_id=last_reg.specialization_id if last_reg else spec_id
                )
                db.add(new_reg)
                db.commit()

    access_token = create_access_token(data={"sub": str(db_user.id), "role": db_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

# Auth Google
@app.post("/api/auth/google", response_model=schemas.TokenResponse)
def google_auth(user_in: schemas.UserGoogleLogin, db: Session = Depends(get_db)):
    import requests
    tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={user_in.id_token}"
    try:
        response = requests.get(tokeninfo_url)
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Invalid Google ID Token."
            )
        id_info = response.json()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to verify Google token: {str(e)}"
        )
        
    email = id_info.get("email")
    name = id_info.get("name", "Google User")

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Google account does not provide an email address."
        )

    db_user = db.query(models.User).filter(models.User.email == email).first()
    if not db_user:
        # Create new Google user with initial progress data
        import uuid
        random_pwd = hash_password(str(uuid.uuid4()))
        db_user = models.User(
            email=email,
            name=name,
            hashed_password=random_pwd,
            role="learner",
            streak=12,
            xp_points=2840,
            weekly_goal_hours=8.0,
            weekly_progress_hours=6.5,
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
    # Reactivation logic for active cycle
    if db_user.role == "learner":
        active_cycle = db.query(models.RegistrationCycle).filter(models.RegistrationCycle.is_active == True).first()
        if active_cycle:
            existing_reg = db.query(models.StudentRegistration).filter(
                models.StudentRegistration.user_id == db_user.id,
                models.StudentRegistration.cycle_year == active_cycle.name
            ).first()
            if not existing_reg:
                fallback_inst = db.query(models.Institution).first()
                fallback_spec = db.query(models.Specialization).first()
                inst_id = fallback_inst.id if fallback_inst else 1
                spec_id = fallback_spec.id if fallback_spec else 1
                
                last_reg = db.query(models.StudentRegistration).filter(
                    models.StudentRegistration.user_id == db_user.id
                ).order_by(models.StudentRegistration.id.desc()).first()
                
                new_reg = models.StudentRegistration(
                    user_id=db_user.id,
                    cycle_year=active_cycle.name,
                    current_tier="District",
                    access_status="active",
                    is_archived=False,
                    institution_id=last_reg.institution_id if last_reg else inst_id,
                    specialization_id=last_reg.specialization_id if last_reg else spec_id
                )
                db.add(new_reg)
                db.commit()
        
    access_token = create_access_token(data={"sub": str(db_user.id), "role": db_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

# User Profile Update
@app.put("/api/users/profile", response_model=schemas.UserResponse)
def update_profile(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.email != current_user.email:
        existing = db.query(models.User).filter(models.User.email == user_update.email).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Email address already in use."
            )
    
    current_user.name = user_update.name
    current_user.email = user_update.email
    current_user.weekly_goal_hours = user_update.weekly_goal_hours
    if user_update.password:
        current_user.hashed_password = hash_password(user_update.password)
    
    db.commit()
    db.refresh(current_user)
    return current_user

# Get current user (used by frontend to refresh user context, e.g. after force password change)
@app.get("/api/users/me", response_model=schemas.UserResponse)
def get_current_user_me(
    current_user: models.User = Depends(get_current_user),
):
    return current_user

# Admin - Start New Cycle & Archive
class StartCycleRequest(schemas.BaseModel):
    new_cycle_name: str

@app.post("/api/admin/cycles/start-new")
def start_new_cycle(req: StartCycleRequest, current_user: models.User = Depends(verifyAdminRole), db: Session = Depends(get_db)):
    """
    Phase 7 Archival Logic: 
    Deactivate current cycle, create new cycle, and mark all existing student registrations as archived.
    """
    # Deactivate current active cycle
    active_cycle = db.query(models.RegistrationCycle).filter(models.RegistrationCycle.is_active == True).first()
    if active_cycle:
        active_cycle.is_active = False
        
        # Archive all registrations from this old cycle
        old_regs = db.query(models.StudentRegistration).filter(
            models.StudentRegistration.cycle_year == active_cycle.name,
            models.StudentRegistration.is_archived == False
        ).all()
        for reg in old_regs:
            reg.is_archived = True

    # Check if new cycle name already exists
    existing_cycle = db.query(models.RegistrationCycle).filter(models.RegistrationCycle.name == req.new_cycle_name).first()
    if existing_cycle:
        existing_cycle.is_active = True
    else:
        new_cycle = models.RegistrationCycle(
            name=req.new_cycle_name,
            is_active=True,
            start_date=datetime.utcnow()
        )
        db.add(new_cycle)

    db.commit()
    return {"message": f"Successfully started new cycle: {req.new_cycle_name} and archived previous data."}

# Course Proposal Create
@app.post("/api/proposals/create", response_model=schemas.CourseProposalResponse, status_code=status.HTTP_201_CREATED)
def create_proposal(
    proposal_in: schemas.CourseProposalCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    db_proposal = models.CourseProposal(
        **proposal_in.dict(),
        status="pending"
    )
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    
    # Trigger background task for AI Preprocessing
    background_tasks.add_task(AIProposalService.process_proposal, db_proposal.id)
    
    return db_proposal

@app.get("/api/proposals/community")
def get_community_proposals(db: Session = Depends(get_db)):
    proposals = db.query(models.CourseProposal).order_by(models.CourseProposal.upvotes.desc(), models.CourseProposal.id.desc()).all()
    results = []
    now = datetime.utcnow()
    for p in proposals:
        days_ago = (now - p.created_at).days if p.created_at else 0
        tags = [{"label": p.status.capitalize(), "type": "active" if p.status == "pending" else ""}]
        if p.ai_category:
            tags.append({"label": p.ai_category})
        elif p.skill_level:
            tags.append({"label": p.skill_level})
        results.append({
            "id": p.id,
            "title": p.course_name,
            "author": f"@{p.learner_name or 'learner'}",
            "daysAgo": max(1, days_ago),
            "tags": tags,
            "votes": p.upvotes or 0
        })
    return results

@app.post("/api/proposals/{proposal_id}/vote")
def vote_proposal(proposal_id: int, db: Session = Depends(get_db)):
    proposal = db.query(models.CourseProposal).filter(models.CourseProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    proposal.upvotes = (proposal.upvotes or 0) + 1
    db.commit()
    return {"id": proposal.id, "votes": proposal.upvotes}

# Review Center endpoints (Protected)
@app.get("/api/reviewer/proposals", response_model=List[schemas.CourseProposalResponse])
def get_reviewer_proposals(

    status_filter: Optional[str] = None,
    current_user: models.User = Depends(verifyReviewerRole),
    db: Session = Depends(get_db)
):
    query = db.query(models.CourseProposal)
    if status_filter and status_filter != 'all':
        query = query.filter(models.CourseProposal.status == status_filter)
    return query.order_by(models.CourseProposal.id.desc()).all()

@app.put("/api/reviewer/proposals/{proposal_id}/status", response_model=schemas.CourseProposalResponse)
def update_proposal_status(
    proposal_id: int,
    status_update: schemas.ProposalStatusUpdate,
    current_user: models.User = Depends(verifyReviewerRole),
    db: Session = Depends(get_db)
):
    proposal = db.query(models.CourseProposal).filter(models.CourseProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
        
    proposal.status = status_update.status
    if status_update.status == "rejected":
        proposal.rejection_reason = status_update.rejection_reason
        proposal.reviewer_feedback = status_update.reviewer_feedback
        
        # Create notification for learner if learner_id exists
        if proposal.learner_id:
            message = f"Status: Rejected\nReason: {status_update.rejection_reason}\nReviewer Feedback: {status_update.reviewer_feedback}"
            notification = models.Notification(
                user_id=proposal.learner_id,
                title=f"Proposal Update: {proposal.course_name}",
                message=message,
                action_label="Edit & Resubmit",
                action_url=f"/proposals/edit/{proposal.id}"
            )
            db.add(notification)

    db.commit()
    db.refresh(proposal)
    return proposal

@app.get("/api/reviewer/certificate-issues", response_model=List[schemas.CertificateIssueResponse])
def get_reviewer_certificate_issues(
    current_user: models.User = Depends(verifyReviewerRole),
    db: Session = Depends(get_db)
):
    return db.query(models.CertificateIssue).order_by(models.CertificateIssue.id.desc()).all()

@app.put("/api/reviewer/certificate-issues/{issue_id}", response_model=schemas.CertificateIssueResponse)
def update_certificate_issue(
    issue_id: int,
    issue_update: schemas.CertificateIssueUpdate,
    current_user: models.User = Depends(verifyReviewerRole),
    db: Session = Depends(get_db)
):
    issue = db.query(models.CertificateIssue).filter(models.CertificateIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Certificate issue not found")
    update_data = issue_update.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(issue, k, v)
    db.commit()
    db.refresh(issue)
    return issue

# Notifications endpoint
@app.get("/api/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(

    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Notification).filter(models.Notification.user_id == current_user.id).order_by(models.Notification.created_at.desc()).all()

# Community Voting Endpoints
@app.get("/api/community/proposals", response_model=List[schemas.CourseProposalResponse])
def get_community_proposals(
    sort_by: str = "newest",
    category: Optional[str] = None,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(models.CourseProposal).filter(models.CourseProposal.status == "approved")
    if category:
        query = query.filter(models.CourseProposal.ai_category == category)
        
    if sort_by == "newest":
        query = query.order_by(models.CourseProposal.created_at.desc())
    elif sort_by == "most_voted":
        query = query.order_by(models.CourseProposal.upvotes.desc())
    elif sort_by == "most_discussed":
        query = query.order_by(models.CourseProposal.comment_count.desc())
    elif sort_by == "trending":
        query = query.order_by((models.CourseProposal.upvotes + models.CourseProposal.comment_count).desc())
        
    proposals = query.all()
    
    # Determine user_vote if authenticated
    result = []
    if current_user:
        user_votes = {v.proposal_id: v.vote_type for v in db.query(models.ProposalVote).filter(models.ProposalVote.user_id == current_user.id).all()}
    else:
        user_votes = {}
        
    for p in proposals:
        p_dict = p.__dict__.copy()
        p_dict["user_vote"] = user_votes.get(p.id)
        result.append(p_dict)
        
    return result

@app.post("/api/community/proposals/{proposal_id}/vote", response_model=schemas.CourseProposalResponse)
def vote_on_proposal(
    proposal_id: int,
    vote_req: schemas.VoteRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = db.query(models.CourseProposal).filter(models.CourseProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
        
    existing_vote = db.query(models.ProposalVote).filter(
        models.ProposalVote.proposal_id == proposal_id,
        models.ProposalVote.user_id == current_user.id
    ).first()
    
    if existing_vote:
        if existing_vote.vote_type == vote_req.vote_type:
            # Toggle off
            db.delete(existing_vote)
            if vote_req.vote_type == "upvote":
                proposal.upvotes = max(0, proposal.upvotes - 1)
            else:
                proposal.downvotes = max(0, proposal.downvotes - 1)
            user_vote = None
        else:
            # Switch vote
            old_vote = existing_vote.vote_type
            existing_vote.vote_type = vote_req.vote_type
            if old_vote == "upvote":
                proposal.upvotes = max(0, proposal.upvotes - 1)
                proposal.downvotes += 1
            else:
                proposal.downvotes = max(0, proposal.downvotes - 1)
                proposal.upvotes += 1
            user_vote = vote_req.vote_type
    else:
        # New vote
        new_vote = models.ProposalVote(
            proposal_id=proposal_id,
            user_id=current_user.id,
            vote_type=vote_req.vote_type
        )
        db.add(new_vote)
        if vote_req.vote_type == "upvote":
            proposal.upvotes += 1
        else:
            proposal.downvotes += 1
        user_vote = vote_req.vote_type
        
    db.commit()
    db.refresh(proposal)
    
    p_dict = proposal.__dict__.copy()
    p_dict["user_vote"] = user_vote
    return p_dict

@app.get("/api/community/proposals/{proposal_id}/comments", response_model=List[schemas.CommentResponse])
def get_comments(proposal_id: int, db: Session = Depends(get_db)):
    comments = db.query(models.ProposalComment).filter(models.ProposalComment.proposal_id == proposal_id).order_by(models.ProposalComment.created_at.asc()).all()
    
    user_ids = [c.user_id for c in comments]
    users = db.query(models.User).filter(models.User.id.in_(user_ids)).all()
    user_map = {u.id: {"name": u.name, "image": None} for u in users}
    
    result = []
    for c in comments:
        c_dict = c.__dict__.copy()
        c_dict["user_name"] = user_map.get(c.user_id, {}).get("name", "Anonymous")
        c_dict["user_image"] = user_map.get(c.user_id, {}).get("image", None)
        result.append(c_dict)
    return result

@app.post("/api/community/proposals/{proposal_id}/comment", response_model=schemas.CommentResponse)
def post_comment(
    proposal_id: int, 
    comment_req: schemas.CommentCreate, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = db.query(models.CourseProposal).filter(models.CourseProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
        
    new_comment = models.ProposalComment(
        proposal_id=proposal_id,
        user_id=current_user.id,
        parent_comment_id=comment_req.parent_comment_id,
        content=comment_req.content
    )
    db.add(new_comment)
    
    proposal.comment_count += 1
    db.commit()
    db.refresh(new_comment)
    
    c_dict = new_comment.__dict__.copy()
    c_dict["user_name"] = current_user.name
    c_dict["user_image"] = None
    return c_dict

@app.post("/api/community/comments/{comment_id}/like")
def like_comment(
    comment_id: int, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(models.ProposalComment).filter(models.ProposalComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    comment.likes += 1
    db.commit()
    return {"likes": comment.likes}

# Silence 404 console logs when AI browser extensions poll localhost for chat interfaces
@app.get("/chat/conversations", include_in_schema=False)
@app.get("/api/chat/conversations", include_in_schema=False)
def get_empty_chat_conversations():
    return []

# AI Assistant Endpoint
@app.post("/api/ai/chat", response_model=schemas.ChatResponse)
def ai_chat(
    chat_req: schemas.ChatRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    try:
        # Fetch available courses to provide to AI
        courses = db.query(models.Course).all()
        course_list = [f"- {c.title} ({c.category})" for c in courses]
        available_courses_text = "Available SkillForge Courses:\n" + "\n".join(course_list)
        
        # Combine existing context with course list
        enriched_context = chat_req.context or ""
        if enriched_context:
            enriched_context += "\n\n"
        enriched_context += available_courses_text

        response_text = groq_service.generate_ai_response(chat_req.messages, enriched_context)
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin endpoints
@app.get("/api/admin/users", response_model=List[schemas.UserResponse])
def get_users(
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    return db.query(models.User).order_by(models.User.id.asc()).all()

@app.post("/api/admin/users", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    user_in: schemas.UserCreateByAdmin,
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists."
        )
    
    hashed_pwd = hash_password(user_in.password)
    db_user = models.User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=hashed_pwd,
        role=user_in.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.put("/api/admin/users/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int,
    role_update: schemas.RoleUpdate,
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    return user

@app.post("/api/admin/upload")
def admin_upload_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(verifyExpertRole),
    db: Session = Depends(get_db)
):
    os.makedirs("uploads", exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    import uuid
    filename = f"{uuid.uuid4()}{file_ext}"
    filepath = os.path.join("uploads", filename)
    with open(filepath, "wb") as buffer:
        buffer.write(file.file.read())
    return {"url": f"/uploads/{filename}"}

@app.post("/api/admin/courses", response_model=schemas.CourseResponse)
def create_course(
    course_in: schemas.CourseCreateUpdate,
    current_user: models.User = Depends(verifyExpertRole),
    db: Session = Depends(get_db)
):
    course = models.Course(**course_in.dict())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

@app.put("/api/admin/courses/{course_id}", response_model=schemas.CourseResponse)
def update_course(
    course_id: int,
    course_in: schemas.CourseCreateUpdate,
    current_user: models.User = Depends(verifyExpertRole),
    db: Session = Depends(get_db)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for key, value in course_in.dict().items():
        setattr(course, key, value)
    db.commit()
    db.refresh(course)
    return course

@app.put("/api/admin/courses/{course_id}/materials")
def update_admin_course_materials(
    course_id: int,
    payload: schemas.CourseMaterialsUpdate,
    current_user: models.User = Depends(verifyExpertRole),
    db: Session = Depends(get_db)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    types_to_update = []
    if payload.video_url is not None:
        types_to_update.append('video')
    if payload.pdf_url is not None:
        types_to_update.append('pdf')
    if payload.image_url is not None:
        types_to_update.append('image')
    if payload.text_content is not None:
        types_to_update.append('text')
        
    if types_to_update:
        db.query(models.CourseMaterial).filter(
            models.CourseMaterial.course_id == course_id,
            models.CourseMaterial.type.in_(types_to_update)
        ).delete(synchronize_session=False)
        
    if payload.video_url:
        db.add(models.CourseMaterial(
            course_id=course_id,
            title="Lecture Video",
            type="video",
            content_url=payload.video_url
        ))
    if payload.pdf_url:
        db.add(models.CourseMaterial(
            course_id=course_id,
            title="Course Handout (PDF)",
            type="pdf",
            content_url=payload.pdf_url
        ))
    if payload.image_url:
        db.add(models.CourseMaterial(
            course_id=course_id,
            title="Course Diagram",
            type="image",
            content_url=payload.image_url
        ))
    if payload.text_content:
        db.add(models.CourseMaterial(
            course_id=course_id,
            title="Syllabus Outline",
            type="text",
            text_content=payload.text_content
        ))
        
    db.commit()
    return {"message": "Materials updated successfully"}

@app.delete("/api/admin/users/{user_id}", response_model=schemas.MessageResponse)
def delete_user(
    user_id: int,
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete an admin user")
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.delete("/api/admin/courses/{course_id}", response_model=schemas.MessageResponse)
def delete_course(
    course_id: int,
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}

@app.delete("/api/admin/proposals/{proposal_id}", response_model=schemas.MessageResponse)
def delete_proposal(
    proposal_id: int,
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    proposal = db.query(models.CourseProposal).filter(models.CourseProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    db.delete(proposal)
    db.commit()
    return {"message": "Proposal deleted successfully"}

@app.get("/api/admin/access-config")
def get_admin_access_config(
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    from services.access_scheduler import get_access_window_config
    return get_access_window_config(db)

@app.put("/api/admin/access-config")
def update_admin_access_config(
    payload: dict,
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    from services.access_scheduler import set_access_window_config
    post_days = int(payload.get("POST_RESULT_ACCESS_DAYS", 7))
    grace_days = int(payload.get("PAYMENT_GRACE_PERIOD_DAYS", 7))
    return set_access_window_config(db, post_days, grace_days)

@app.post("/api/admin/access-config/sweep")
def trigger_access_sweeper(
    current_user: models.User = Depends(verifyAdminRole),
    db: Session = Depends(get_db)
):
    from services.access_scheduler import sweep_expired_access_windows
    return sweep_expired_access_windows(db)

# Expert endpoints
@app.get("/api/expert/courses", response_model=List[schemas.CourseResponse])
def get_expert_courses(
    current_user: models.User = Depends(verifyExpertRole),
    db: Session = Depends(get_db)
):
    return db.query(models.Course).order_by(models.Course.id.desc()).all()

@app.get("/api/expert/courses/{course_id}/materials", response_model=List[schemas.CourseMaterialResponse])
def get_course_materials(
    course_id: int,
    current_user: models.User = Depends(verifyExpertRole),
    db: Session = Depends(get_db)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db.query(models.CourseMaterial).filter(models.CourseMaterial.course_id == course_id).order_by(models.CourseMaterial.id.asc()).all()

@app.post("/api/expert/courses/{course_id}/materials", response_model=schemas.CourseMaterialResponse)
def create_course_material(
    course_id: int,
    title: str = Form(...),
    type: str = Form(...),
    text_content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(verifyExpertRole),
    db: Session = Depends(get_db)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    content_url = None
    if file:
        os.makedirs("uploads", exist_ok=True)
        file_ext = os.path.splitext(file.filename)[1]
        import uuid
        filename = f"{uuid.uuid4()}{file_ext}"
        filepath = os.path.join("uploads", filename)
        
        file_bytes = file.file.read()
        with open(filepath, "wb") as buffer:
            buffer.write(file_bytes)
        content_url = f"/uploads/{filename}"

        if file_ext.lower() == '.pdf':
            try:
                import io
                from pypdf import PdfReader # type: ignore
                pdf = PdfReader(io.BytesIO(file_bytes))
                extracted_text = ""
                for page in pdf.pages:
                    extracted_text += page.extract_text() + "\n"
                
                if extracted_text.strip():
                    text_content = (text_content or "") + "\n\n" + extracted_text.strip()
            except Exception as e:
                print(f"Error extracting PDF text: {e}")

    db_material = models.CourseMaterial(
        course_id=course_id,
        title=title,
        type=type,
        text_content=text_content,
        content_url=content_url
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material

@app.get("/api/expert/learners-performance")
def get_expert_learners_performance(
    current_user: models.User = Depends(verifyExpertRole),
    db: Session = Depends(get_db)
):
    learners = db.query(models.User).filter(models.User.role == "learner").all()
    courses = db.query(models.Course).all()
    certs = db.query(models.Certificate).all()
    
    # Map certificates by user_id
    user_certs = {}
    for c in certs:
        uid = str(c.user_id)
        if uid not in user_certs:
            user_certs[uid] = []
        user_certs[uid].append(c)
        
    result = []
    
    # Process real DB learners
    for u in learners:
        uid_str = str(u.id)
        u_certs = user_certs.get(uid_str, [])
        
        # Build course performance for real learner
        c_perf = []
        for idx, course in enumerate(courses[:4]):
            # Check if this course has a certificate
            matched_cert = next((c for c in u_certs if str(c.course_id) == str(course.id) or c.course_name == course.title), None)
            
            if matched_cert:
                c_perf.append({
                    "course_id": str(course.id),
                    "course_title": course.title,
                    "category": course.category,
                    "progress_percentage": 100,
                    "modules_completed": "4/4",
                    "time_spent": f"{course.hours}h 00m",
                    "last_active": matched_cert.issue_date or "Recently",
                    "assessment": {
                        "status": "passed",
                        "score": 100,
                        "passing_score": 60,
                        "attempts": 1,
                        "last_attempt_date": matched_cert.issue_date or "Recently",
                        "certificate_id": matched_cert.certificate_id,
                        "certificate_url": matched_cert.certificate_url,
                        "quiz_breakdown": [
                            {"lesson": "Lesson 1: Core Fundamentals", "score": 100, "status": "Passed"},
                            {"lesson": "Lesson 2: Advanced Architecture", "score": 95, "status": "Passed"},
                            {"lesson": "Final Assessment & Quiz", "score": 100, "status": "Passed"}
                        ]
                    }
                })
            else:
                pass # Removed simulated progress data
        
        passed_count = sum(1 for cp in c_perf if cp["assessment"]["status"] == "passed")
        pass_rate = int((passed_count / max(1, len(c_perf))) * 100)
        
        result.append({
            "learner_id": u.id,
            "name": u.name,
            "email": u.email,
            "avatar_url": f"https://images.unsplash.com/photo-{1534528741775 + u.id*1000}?auto=format&fit=crop&q=80&w=150",
            "role": u.role,
            "xp_points": u.xp_points or 2500,
            "streak": u.streak or 10,
            "weekly_progress_hours": u.weekly_progress_hours or 6.5,
            "overall_pass_rate": f"{pass_rate}%",
            "total_courses": len(c_perf),
            "completed_assessments": passed_count,
            "courses_performance": c_perf
        })
        
    # If fewer than 5 learners in DB, add realistic simulated learners for rich expert validation
    if len(result) < 6:
        sample_profiles = [
            {"name": "Sophia Chen", "email": "sophia.chen@example.com", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", "xp": 4200, "streak": 21, "hours": 14.5},
            {"name": "Marcus Vance", "email": "m.vance@devnet.io", "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150", "xp": 3890, "streak": 18, "hours": 11.0},
            {"name": "Elena Rostova", "email": "elena.r@ai-labs.org", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150", "xp": 3150, "streak": 14, "hours": 9.5},
            {"name": "Liam O'Connor", "email": "liam.oconnor@techstack.com", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150", "xp": 1950, "streak": 7, "hours": 5.0},
            {"name": "Priya Patel", "email": "priya.p@cloudscale.net", "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150", "xp": 5120, "streak": 30, "hours": 18.0},
            {"name": "David Kim", "email": "david.kim@systems.kr", "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150", "xp": 2740, "streak": 9, "hours": 7.2}
        ]
        
        for idx, sp in enumerate(sample_profiles):
            sim_id = 100 + idx
            c_perf = []
            for c_idx, course in enumerate(courses[:4]):
                # Vary performance across courses
                pattern = (idx + c_idx) % 4
                if pattern == 0 or pattern == 1:
                    status = "passed"
                    score = 88 + (c_idx * 3) % 12
                    prog = 100
                    att = 1
                elif pattern == 2:
                    status = "in_progress"
                    score = 74
                    prog = 65
                    att = 2
                else:
                    status = "retake_required"
                    score = 48
                    prog = 30
                    att = 3
                
                c_perf.append({
                    "course_id": str(course.id),
                    "course_title": course.title,
                    "category": course.category,
                    "progress_percentage": prog,
                    "modules_completed": f"{int(prog/25)}/4",
                    "time_spent": f"{int(course.hours * (prog/100))}h 15m",
                    "last_active": f"2026-07-0{1 + (c_idx % 3)}",
                    "assessment": {
                        "status": status,
                        "score": score,
                        "passing_score": 60,
                        "attempts": att,
                        "last_attempt_date": f"2026-07-0{1 + (c_idx % 3)}",
                        "certificate_id": f"SF-VAL-{2026}-{5000+sim_id*10+c_idx}" if status == "passed" else None,
                        "certificate_url": f"http://localhost:3000/verify/SF-VAL-{2026}-{5000+sim_id*10+c_idx}" if status == "passed" else None,
                        "quiz_breakdown": [
                            {"lesson": "Lesson 1: Core Fundamentals", "score": min(100, score + 8), "status": "Passed" if score + 8 >= 60 else "Failed"},
                            {"lesson": "Lesson 2: Advanced Architecture", "score": score, "status": "Passed" if score >= 60 else "Failed"},
                            {"lesson": "Final Assessment & Quiz", "score": max(30, score - 6), "status": "Passed" if score - 6 >= 60 else "Retake Required"}
                        ]
                    }
                })
            
            passed_count = sum(1 for cp in c_perf if cp["assessment"]["status"] == "passed")
            pass_rate = int((passed_count / max(1, len(c_perf))) * 100)
            
            result.append({
                "learner_id": sim_id,
                "name": sp["name"],
                "email": sp["email"],
                "avatar_url": sp["avatar"],
                "role": "learner",
                "xp_points": sp["xp"],
                "streak": sp["streak"],
                "weekly_progress_hours": sp["hours"],
                "overall_pass_rate": f"{pass_rate}%",
                "total_courses": len(c_perf),
                "completed_assessments": passed_count,
                "courses_performance": c_perf
            })
            
    return result

@app.get("/api/experts", response_model=List[schemas.ExpertResponse])
def get_experts(db: Session = Depends(get_db)):
    expert_rows = db.query(models.Expert).all()
    if expert_rows:
        return expert_rows
    users = db.query(models.User).filter(models.User.role == "expert").all()
    experts_list = []
    for user in users:
        experts_list.append({
            "id": user.id,
            "name": user.name,
            "role": "Industry Expert",
            "bio": f"{user.name} is a validated industry expert.",
            "avatar_url": None,
            "courses_validated_count": user.streak if user.streak else 0
        })
    return experts_list

# ─── Course Feedback Endpoints ──────────────────────────────────────────────

@app.get("/api/feedback", response_model=List[schemas.CourseFeedbackResponse])
def get_feedback(
    course_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.CourseFeedback)
    if course_id:
        query = query.filter(models.CourseFeedback.course_id == course_id)
    return query.order_by(models.CourseFeedback.created_at.desc()).all()

@app.post("/api/feedback", response_model=schemas.CourseFeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(
    feedback_in: schemas.CourseFeedbackCreate,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    course = db.query(models.Course).filter(models.Course.id == feedback_in.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    user_name = current_user.name if current_user else "Anonymous"
    user_id = current_user.id if current_user else None
    
    db_feedback = models.CourseFeedback(
        course_id=feedback_in.course_id,
        user_id=user_id,
        user_name=user_name,
        rating=feedback_in.rating,
        title=feedback_in.title,
        comment=feedback_in.comment,
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@app.post("/api/feedback/{feedback_id}/helpful")
def mark_helpful(
    feedback_id: int,
    db: Session = Depends(get_db)
):
    fb = db.query(models.CourseFeedback).filter(models.CourseFeedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    fb.helpful_count += 1
    db.commit()
    return {"helpful_count": fb.helpful_count}

@app.post("/api/subscribe", response_model=schemas.SubscriberResponse, status_code=status.HTTP_201_CREATED)
def subscribe(
    subscriber_in: schemas.SubscriberCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(models.Subscriber).filter(models.Subscriber.email == subscriber_in.email).first()
    if existing:
        return existing
    
    new_sub = models.Subscriber(email=subscriber_in.email)
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub

@app.get("/api/admin/subscribers", response_model=List[schemas.SubscriberResponse])
def get_subscribers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verifyAdminRole)
):
    return db.query(models.Subscriber).order_by(models.Subscriber.created_at.desc()).all()

# Certificates and Verification Routers
from routes.certificates import router as certificates_router, verify_router
from routes.subadmins import router as subadmins_router
from routes.institutions import router as institutions_router
from routes.students import router as students_router
from routes.reports import router as reports_router
from routes.learning import router as learning_router
from routes.webhooks import router as webhooks_router
from routes.exam_engine_webhooks import router as exam_engine_webhooks_router
from routes.payments import router as payments_router
from routes.communications import router as communications_router
from routes.analytics import router as analytics_router
from routes.poc import router as poc_router
from routes.demo import router as demo_router

app.include_router(certificates_router, prefix="/api/certificates", tags=["Certificates"])
app.include_router(certificates_router, prefix="/certificates", tags=["Certificates"])
app.include_router(verify_router, prefix="/api/verify", tags=["Verification"])
app.include_router(verify_router, prefix="/verify", tags=["Verification"])
app.include_router(subadmins_router, prefix="/api/admin/subadmins", tags=["Admin Sub-Admins"])
app.include_router(institutions_router, prefix="/api/institutions", tags=["Institutions"])
app.include_router(students_router, prefix="/api/admin/students", tags=["Admin Students & Bulk Ops"])
app.include_router(reports_router, prefix="/api/admin/reports", tags=["Admin Reports & Analytics"])
app.include_router(learning_router, prefix="/api/learning", tags=["Learning"])
app.include_router(webhooks_router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(exam_engine_webhooks_router, prefix="/api/webhooks/exam-engine", tags=["Exam Engine Webhooks"])
app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
app.include_router(communications_router, prefix="/api/communications", tags=["Communications"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics & Leaderboard"])
app.include_router(analytics_router, prefix="/api/learning/analytics", tags=["Analytics & Leaderboard"])
app.include_router(analytics_router, prefix="/api/admin/analytics", tags=["Analytics & Leaderboard"])
app.include_router(poc_router, prefix="/api/admin/poc", tags=["POC Operations"])
app.include_router(demo_router, prefix="/api/demo", tags=["Demo"])
