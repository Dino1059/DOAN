from fastapi import APIRouter

from app.schemas.feedback import FeedbackCreate
from app.services.feedback_service import feedback_service

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("")
def create_feedback(payload: FeedbackCreate) -> dict[str, str]:
    feedback_service.create(payload)
    return {"status": "received"}

