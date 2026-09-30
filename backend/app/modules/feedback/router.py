from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.db.session import get_session
from app.modules.feedback.repository import FeedbackRepository
from app.modules.feedback.schemas import FeedbackIn, FeedbackReceived
from app.modules.feedback.service import FeedbackService

router = APIRouter(prefix="/feedback", tags=["feedback"])


def get_feedback_service(session: Annotated[AsyncSession, Depends(get_session)]) -> FeedbackService:
    return FeedbackService(FeedbackRepository(session))


@router.post("", status_code=201, response_model=FeedbackReceived)
async def create_feedback(
    payload: FeedbackIn,
    user: CurrentUser,
    svc: Annotated[FeedbackService, Depends(get_feedback_service)],
) -> FeedbackReceived:
    return FeedbackReceived(data=await svc.submit(payload, user_id=user.id))
