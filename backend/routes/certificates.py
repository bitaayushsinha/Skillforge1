import schemas
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Union, Any
from pydantic import BaseModel
from datetime import datetime

from database import get_db
import models
from services.certificate_service import (
    generate_certificate_service,
    get_user_certificates_service,
    verify_certificate_service
)

class CertificateGenerateRequest(BaseModel):
    user_id: Union[int, str]
    course_id: Union[int, str]
    course_name: Optional[str] = None
    completion_percentage: Optional[int] = 100
    assessment_status: Optional[str] = "passed"

class CertificateResponseSchema(BaseModel):
    id: Union[int, str]
    user_id: Union[int, str]
    course_id: Union[int, str]
    course_name: str
    cert_id: str
    certificate_id: str
    issue_date: str
    qr_code_path: Optional[str] = None
    certificate_status: str = "valid"
    certificate_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

router = APIRouter()
verify_router = APIRouter()

@router.post("/generate", response_model=CertificateResponseSchema, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=CertificateResponseSchema, status_code=status.HTTP_201_CREATED)
def generate_cert_endpoint(req: CertificateGenerateRequest, request: Request, db: Session = Depends(get_db)):
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    frontend_url = "http://localhost:3000"
    return generate_certificate_service(
        db=db,
        user_id=req.user_id,
        course_id=req.course_id,
        course_name=req.course_name,
        completion_percentage=req.completion_percentage or 100,
        assessment_status=req.assessment_status or "passed",
        frontend_url=frontend_url,
        backend_url=base_url
    )

@router.get("/user/{user_id}", response_model=List[CertificateResponseSchema])
@router.get("/{user_id}", response_model=List[CertificateResponseSchema])
def get_user_certs_endpoint(user_id: str, db: Session = Depends(get_db)):
    return get_user_certificates_service(db=db, user_id=user_id)

@router.delete("/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cert_endpoint(cert_id: str, db: Session = Depends(get_db)):
    cert = db.query(models.Certificate).filter(
        (models.Certificate.id == str(cert_id)) | 
        (models.Certificate.certificate_id == str(cert_id)) |
        (models.Certificate.cert_id == str(cert_id))
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    db.delete(cert)
    db.commit()
    return None

@verify_router.get("/{certificate_id}")
def verify_cert_endpoint(certificate_id: str, request: Request, db: Session = Depends(get_db)):
    cert = verify_certificate_service(db=db, certificate_id=certificate_id)
    
    accept_header = request.headers.get("accept", "")
    if "application/json" in accept_header or request.url.path.startswith("/api/"):
        if not cert:
            return JSONResponse(status_code=404, content={"valid": False, "status": "Invalid Certificate ❌"})
        
        user_id_val = int(cert.user_id) if str(cert.user_id).isdigit() else cert.user_id
        try:
            user_obj = db.query(models.User).filter(models.User.id == user_id_val).first()
        except Exception:
            user_obj = None
        learner_name = user_obj.name if user_obj else "SkillForge Learner"
        
        return {
            "valid": True,
            "status": "Valid",
            "message": "Certificate Verified ✅",
            "certificate_id": cert.certificate_id,
            "learner_name": learner_name,
            "course_name": cert.course_name,
            "issue_date": cert.issue_date,
            "qr_code_path": cert.qr_code_path,
            "certificate_url": cert.certificate_url
        }
    
    if not cert:
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>SkillForge - Verification Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 40px; max-width: 450px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
                .icon { width: 80px; height: 80px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 20px; border: 2px solid rgba(239, 68, 68, 0.3); }
                h1 { font-size: 24px; margin-bottom: 10px; color: #f8fafc; }
                p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
                .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 600; transition: background 0.2s; }
                .btn:hover { background: #2563eb; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✕</div>
                <h1>Invalid Certificate ❌</h1>
                <p>We could not find a verified certificate with the ID <strong>""" + certificate_id + """</strong> in the SkillForge database.</p>
                <a href="http://localhost:3000" class="btn">Return to SkillForge</a>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=404)
        
    user_id_val = int(cert.user_id) if str(cert.user_id).isdigit() else cert.user_id
    try:
        user_obj = db.query(models.User).filter(models.User.id == user_id_val).first()
    except Exception:
        user_obj = None
    learner_name = user_obj.name if user_obj else "SkillForge Learner"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SkillForge - Verified Certificate</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }}
            .card {{ background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 40px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden; }}
            .card::before {{ content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #10b981, #3b82f6); }}
            .badge {{ display: inline-flex; items-center; gap: 8px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px 16px; border-radius: 100px; font-weight: 700; font-size: 14px; margin-bottom: 24px; letter-spacing: 0.5px; text-transform: uppercase; }}
            h1 {{ font-size: 26px; margin: 0 0 8px; color: #ffffff; }}
            .subtitle {{ color: #38bdf8; font-weight: 600; font-size: 16px; margin-bottom: 30px; }}
            .details {{ background: #0f172a; border-radius: 16px; padding: 20px; text-align: left; margin-bottom: 30px; border: 1px solid #334155; }}
            .row {{ display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #1e293b; }}
            .row:last-child {{ border-bottom: none; }}
            .label {{ color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; }}
            .value {{ color: #e2e8f0; font-weight: 700; font-size: 15px; text-align: right; }}
            .seal {{ font-size: 13px; color: #94a3b8; display: flex; align-items: center; justify-content: center; gap: 6px; }}
            .btn {{ display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 600; transition: background 0.2s; margin-top: 20px; }}
            .btn:hover {{ background: #2563eb; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">✓ Certificate Verified ✅</div>
            <h1>{learner_name}</h1>
            <div class="subtitle">{cert.course_name}</div>
            
            <div class="details">
                <div class="row">
                    <span class="label">Certificate ID</span>
                    <span class="value" style="color: #38bdf8;">{cert.certificate_id}</span>
                </div>
                <div class="row">
                    <span class="label">Issue Date</span>
                    <span class="value">{cert.issue_date}</span>
                </div>
                <div class="row">
                    <span class="label">Status</span>
                    <span class="value" style="color: #10b981;">Valid & Active</span>
                </div>
                <div class="row">
                    <span class="label">Issuer</span>
                    <span class="value">SkillForge LMS</span>
                </div>
            </div>
            
            <div class="seal">
                <span>🛡️ Officially verified by SkillForge LMS Authority</span>
            </div>
            
            <a href="http://localhost:3000" class="btn">Go to SkillForge</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@verify_router.get("/student/{student_id}")
def verify_student_certs_endpoint(student_id: str, request: Request, db: Session = Depends(get_db)):
    # Try by user ID or registration number
    user = None
    if student_id.isdigit():
        user = db.query(models.User).filter(models.User.id == int(student_id)).first()
    if not user:
        reg = db.query(models.StudentRegistration).filter(models.StudentRegistration.registration_number == student_id).first()
        if reg:
            user = db.query(models.User).filter(models.User.id == reg.user_id).first()
            
    accept_header = request.headers.get("accept", "")
    wants_json = "application/json" in accept_header or request.url.path.startswith("/api/")
    
    if not user:
        if wants_json:
            return JSONResponse(status_code=404, content={"valid": False, "status": "Student not found ❌"})
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>SkillForge - Verification Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 40px; max-width: 450px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
                .icon { width: 80px; height: 80px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 20px; border: 2px solid rgba(239, 68, 68, 0.3); }
                h1 { font-size: 24px; margin-bottom: 10px; color: #f8fafc; }
                p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
                .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 600; transition: background 0.2s; }
                .btn:hover { background: #2563eb; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✕</div>
                <h1>Student Not Found ❌</h1>
                <p>We could not find a student matching the ID <strong>""" + student_id + """</strong> in the SkillForge database.</p>
                <a href="http://localhost:3000" class="btn">Return to SkillForge</a>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=404)
        
    certs = get_user_certificates_service(db, user.id)
    
    if wants_json:
        return {
            "valid": True,
            "student_name": user.name,
            "student_id": student_id,
            "certificates": [
                {
                    "certificate_id": c.certificate_id,
                    "course_name": c.course_name,
                    "issue_date": c.issue_date,
                    "status": c.certificate_status,
                    "url": c.certificate_url
                } for c in certs
            ]
        }
        
    certs_html = ""
    if not certs:
        certs_html = "<p style='color: #94a3b8;'>No certificates issued yet.</p>"
    else:
        for c in certs:
            status_color = "#10b981" if c.certificate_status == "valid" else "#f59e0b"
            status_text = "Valid & Active" if c.certificate_status == "valid" else "Pending Confirmation"
            certs_html += f"""
            <div class="details" style="margin-bottom: 15px; padding: 15px; border: 1px solid #334155; border-radius: 12px; background: #0f172a;">
                <h3 style="margin-top: 0; color: #f8fafc; font-size: 16px;">{c.course_name}</h3>
                <div class="row">
                    <span class="label">Certificate ID</span>
                    <span class="value" style="color: #38bdf8;">{c.certificate_id}</span>
                </div>
                <div class="row">
                    <span class="label">Issue Date</span>
                    <span class="value">{c.issue_date}</span>
                </div>
                <div class="row">
                    <span class="label">Status</span>
                    <span class="value" style="color: {status_color};">{status_text}</span>
                </div>
            </div>
            """
            
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SkillForge - Student Credentials</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }}
            .card {{ background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 40px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden; }}
            .card::before {{ content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); }}
            .badge {{ display: inline-flex; align-items: center; gap: 8px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); padding: 8px 16px; border-radius: 100px; font-weight: 700; font-size: 14px; margin-bottom: 24px; letter-spacing: 0.5px; text-transform: uppercase; }}
            h1 {{ font-size: 26px; margin: 0 0 8px; color: #ffffff; }}
            .subtitle {{ color: #94a3b8; font-weight: 600; font-size: 14px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }}
            .details {{ text-align: left; }}
            .row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; }}
            .row:last-child {{ border-bottom: none; }}
            .label {{ color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600; }}
            .value {{ color: #e2e8f0; font-weight: 700; font-size: 14px; text-align: right; }}
            .seal {{ font-size: 13px; color: #94a3b8; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; }}
            .btn {{ display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 600; transition: background 0.2s; margin-top: 20px; }}
            .btn:hover {{ background: #2563eb; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">👤 Learner Record Verified</div>
            <h1>{user.name}</h1>
            <div class="subtitle">SkillForge Student • {len(certs)} Credentials</div>
            
            <div style="text-align: left; margin-bottom: 15px;">
                <h2 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #334155; padding-bottom: 8px;">Earned Certificates</h2>
            </div>
            
            {certs_html}
            
            <div class="seal">
                <span>🛡️ Verified by SkillForge LMS Authority</span>
            </div>
            
            <a href="http://localhost:3000" class="btn">Go to SkillForge</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
