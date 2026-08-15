import schemas
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx
import os
import hmac
import hashlib
import json
from auth import get_current_user
import models

router = APIRouter()

class DemoExamSimulationRequest(BaseModel):
    booking_ref: str
    score: int
    status: str  # 'pass' or 'fail'

@router.post("/simulate-exam-result")
async def simulate_exam_result(
    request: DemoExamSimulationRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    Demo endpoint used purely to simulate the behavior of the external Exam Engine.
    It generates the signed payload and forwards it to the actual webhook endpoint locally.
    """
    webhook_secret = os.getenv("EXAM_ENGINE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="EXAM_ENGINE_WEBHOOK_SECRET is not configured on the backend.")

    payload = {
        "booking_reference": request.booking_ref,
        "score": request.score,
        "pass_fail": request.status
    }
    
    payload_str = json.dumps(payload, separators=(',', ':'))
    signature = hmac.new(
        webhook_secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    # We use the current server's port (assumed 8000 for local, or deployed URL)
    # Alternatively, we could directly call the function, but HTTP request tests the whole stack.
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
    webhook_url = f"{backend_url}/api/webhooks/exam-engine/result"
    
    headers = {
        "Content-Type": "application/json",
        "X-Exam-Engine-Signature": signature
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(webhook_url, content=payload_str, headers=headers, timeout=10.0)
            if response.status_code >= 400:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Webhook simulation failed: {response.text}"
                )
            return {"success": True, "webhook_response": response.json()}
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to reach local webhook: {str(e)}")
