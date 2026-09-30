from app.core.ids import new_id
from app.modules.feedback.models import Feedback
from app.modules.feedback.repository import FeedbackRepository
from app.modules.feedback.schemas import FeedbackIn, FeedbackOut


class FeedbackService:
    def __init__(self, repo: FeedbackRepository) -> None:
        self.repo = repo

    async def submit(self, data: FeedbackIn, user_id: str | None = None) -> FeedbackOut:
        feedback = Feedback(
            id=new_id("FBK"),
            user_id=user_id,
            rating=data.rating,
            category=data.category,
            message=data.message,
        )
        return FeedbackOut.model_validate(await self.repo.add(feedback))
