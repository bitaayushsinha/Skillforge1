import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from database import Base

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String, index=True, nullable=False)
    course_id = Column(String, index=True, nullable=False)
    course_name = Column(String, nullable=False)
    certificate_id = Column(String, unique=True, index=True, nullable=False)
    cert_id = Column(String, index=True, nullable=True)
    issue_date = Column(String, nullable=False)
    qr_code_path = Column(Text, nullable=True)
    certificate_status = Column(String, default="valid", nullable=False)
    certificate_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
