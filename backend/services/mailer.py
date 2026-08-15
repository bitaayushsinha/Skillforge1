import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from services.email_templates import (
    get_onboarding_template,
    get_announcement_template,
    get_ticket_update_template,
    get_subadmin_onboarding_template,
)

logger = logging.getLogger(__name__)

class MailerService:
    @classmethod
    def _get_db_session(cls, db: Optional[Session] = None):
        if db is not None:
            return db, False
        return SessionLocal(), True

    @classmethod
    def _record_email_log(
        cls,
        recipient: str,
        template_type: str,
        subject: str,
        status: str,
        error_message: Optional[str] = None,
        db: Optional[Session] = None,
    ):
        session, should_close = cls._get_db_session(db)
        try:
            log_entry = models.EmailLog(
                recipient=recipient,
                template_type=template_type,
                subject=subject,
                status=status,
                error_message=error_message,
            )
            session.add(log_entry)
            session.commit()
        except Exception as e:
            logger.error(f"Failed to record EmailLog for {recipient}: {e}")
            session.rollback()
        finally:
            if should_close:
                session.close()

    @classmethod
    def send_email(
        cls,
        recipient: str,
        subject: str,
        text_body: str,
        html_body: str,
        template_type: str,
        db: Optional[Session] = None,
    ) -> bool:
        smtp_host = os.getenv("SMTP_HOST", "")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_from = os.getenv("SMTP_FROM_EMAIL", "noreply@skillforge.edu")
        demo_override = os.getenv("DEMO_EMAIL_OVERRIDE", "")

        original_recipient = recipient
        if demo_override:
            recipient = demo_override
            subject = f"[Diverted from {original_recipient}] {subject}"

        # Dev / Console Fallback Mode
        if not smtp_host:
            logger.info("=== DEV MOCK EMAIL OUTPUT ===")
            logger.info(f"To: {recipient}")
            logger.info(f"Template Type: {template_type}")
            logger.info(f"Subject: {subject}")
            logger.info(f"Body:\n{text_body}")
            logger.info("=============================")
            cls._record_email_log(
                recipient=recipient,
                template_type=template_type,
                subject=subject,
                status="mocked",
                db=db,
            )
            return True

        # SMTP Sending
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_from
            msg["To"] = recipient

            part1 = MIMEText(text_body, "plain")
            part2 = MIMEText(html_body, "html")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, recipient, msg.as_string())

            cls._record_email_log(
                recipient=recipient,
                template_type=template_type,
                subject=subject,
                status="sent",
                db=db,
            )
            return True
        except Exception as e:
            logger.error(f"SMTP send failed for {recipient}: {e}")
            cls._record_email_log(
                recipient=recipient,
                template_type=template_type,
                subject=subject,
                status="failed",
                error_message=str(e),
                db=db,
            )
            return False

    @classmethod
    def send_onboarding_email(
        cls, email: str, name: str, temp_password: str, db: Optional[Session] = None
    ) -> bool:
        """
        Sends onboarding email with temporary credentials and first login instructions.
        """
        portal_url = os.getenv("PORTAL_URL", "http://localhost:3000")
        payload = get_onboarding_template(name, email, temp_password, portal_url)
        return cls.send_email(
            recipient=email,
            subject=payload["subject"],
            text_body=payload["text_body"],
            html_body=payload["html_body"],
            template_type=payload["template_type"],
            db=db,
        )

    @classmethod
    def send_announcement_email(
        cls, email: str, name: str, title: str, content: str, db: Optional[Session] = None
    ) -> bool:
        portal_url = os.getenv("PORTAL_URL", "http://localhost:3000")
        payload = get_announcement_template(name, title, content, portal_url)
        return cls.send_email(
            recipient=email,
            subject=payload["subject"],
            text_body=payload["text_body"],
            html_body=payload["html_body"],
            template_type=payload["template_type"],
            db=db,
        )

    @classmethod
    def send_ticket_update_email(
        cls, email: str, name: str, ticket_number: str, subject_text: str, update_body: str, db: Optional[Session] = None
    ) -> bool:
        portal_url = os.getenv("PORTAL_URL", "http://localhost:3000")
        payload = get_ticket_update_template(name, ticket_number, subject_text, update_body, portal_url)
        return cls.send_email(
            recipient=email,
            subject=payload["subject"],
            text_body=payload["text_body"],
            html_body=payload["html_body"],
            template_type=payload["template_type"],
            db=db,
        )

    @classmethod
    def send_subadmin_onboarding_email(
        cls, email: str, name: str, temp_password: str, assigned_institutions_text: str, privileges_text: str, db: Optional[Session] = None
    ) -> bool:
        portal_url = os.getenv("PORTAL_URL", "http://localhost:3000")
        payload = get_subadmin_onboarding_template(
            name, email, temp_password, assigned_institutions_text, privileges_text, portal_url
        )
        return cls.send_email(
            recipient=email,
            subject=payload["subject"],
            text_body=payload["text_body"],
            html_body=payload["html_body"],
            template_type=payload["template_type"],
            db=db,
        )
