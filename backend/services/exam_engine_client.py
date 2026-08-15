import os
import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class ExamEngineClient:
    """
    Client for outbound communication with the Examination Engine.
    Uses configurable base URL (defaulting to the Phase 4 stub server at http://localhost:8001).
    """

    @classmethod
    def get_base_url(cls) -> str:
        return os.getenv("EXAM_ENGINE_BASE_URL", "http://localhost:8000").rstrip("/")

    @classmethod
    def get_webhook_callback_url(cls) -> str:
        return os.getenv("SRP_WEBHOOK_BASE_URL", "http://localhost:8000/api/webhooks/exam-engine")

    @classmethod
    def book_slot(
        cls,
        booking_reference: str,
        student_id: int,
        student_name: str,
        student_email: str,
        registration_number: Optional[str],
        subject_id: int,
        subject_code: str,
        subject_name: str,
        level: str,
        slot_date: str,
        slot_time: str,
        slot_datetime: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends "slot booked" call to the Exam Engine to request link confirmation.
        Returns a dictionary adhering to:
        {
            "success": bool,
            "booking_reference": str,
            "exam_engine_session_ref": Optional[str],
            "assessment_link": Optional[str],
            "link_status": str,  # 'confirmed', 'pending', or 'failed'
            "message": str
        }
        """
        url = f"{cls.get_base_url()}/api/v1/exam-engine/slots/book"
        payload = {
            "booking_reference": booking_reference,
            "student_id": student_id,
            "student_name": student_name,
            "student_email": student_email,
            "registration_number": registration_number,
            "subject_id": subject_id,
            "subject_code": subject_code,
            "subject_name": subject_name,
            "level": level,
            "slot_date": slot_date,
            "slot_time": slot_time,
            "slot_datetime": slot_datetime,
            "webhook_callback_url": cls.get_webhook_callback_url()
        }

        try:
            logger.info(f"Sending slot booking request to Exam Engine: {url} (ref: {booking_reference})")
            response = requests.post(url, json=payload, timeout=8)
            
            if response.status_code in (200, 201):
                data = response.json()
                link_status = data.get("link_status", "pending")
                return {
                    "success": data.get("success", True),
                    "booking_reference": data.get("booking_reference", booking_reference),
                    "exam_engine_session_ref": data.get("exam_engine_session_ref"),
                    "assessment_link": data.get("assessment_link"),
                    "link_status": link_status,
                    "message": data.get("message", "Booking submitted successfully")
                }
            else:
                logger.error(f"Exam Engine returned error {response.status_code}: {response.text}")
                return {
                    "success": False,
                    "booking_reference": booking_reference,
                    "exam_engine_session_ref": None,
                    "assessment_link": None,
                    "link_status": "failed",
                    "message": f"Exam Engine responded with HTTP {response.status_code}: {response.text}"
                }
        except requests.exceptions.RequestException as e:
            logger.error(f"Connection failure calling Exam Engine at {url}: {e}")
            return {
                "success": False,
                "booking_reference": booking_reference,
                "exam_engine_session_ref": None,
                "assessment_link": None,
                "link_status": "failed",
                "message": f"Failed to connect to Examination Engine: {str(e)}"
            }

    @classmethod
    def cancel_slot(cls, exam_engine_session_ref: str) -> bool:
        """
        Optional call to notify Exam Engine if a slot is cancelled.
        """
        url = f"{cls.get_base_url()}/api/v1/exam-engine/slots/cancel"
        try:
            res = requests.post(url, json={"exam_engine_session_ref": exam_engine_session_ref}, timeout=5)
            return res.status_code in (200, 201)
        except Exception as e:
            logger.warning(f"Failed to notify Exam Engine of cancellation: {e}")
            return False
