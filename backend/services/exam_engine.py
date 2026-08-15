import uuid

class ExamEngineService:
    @staticmethod
    def confirm_slot(user_id: int, subject_code: str, slot_date: str, slot_time: str) -> dict:
        """
        Stub for Exam Engine contract.
        In the future, this makes a webhook/API call to the external exam engine to reserve the slot.
        Returns external_slot_id and an assessment_link.
        """
        # Simulate an external unique ID
        external_id = f"ext-slot-{uuid.uuid4().hex[:8]}"
        
        # Simulate an assessment link that will activate at exam time
        link = f"https://exam.skillforge.engine/assess/{external_id}"
        
        return {
            "success": True,
            "exam_engine_slot_id": external_id,
            "assessment_link": link
        }
        
    @staticmethod
    def cancel_slot(external_slot_id: str) -> bool:
        """
        Stub to notify the external engine of a cancellation.
        """
        return True
