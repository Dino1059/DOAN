from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.feedback.models import Feedback


class FeedbackRepository:
    """Repository riêng vì bảng feedback không có owner_id (không dùng OwnedRepository)."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, feedback: Feedback) -> Feedback:
        self.session.add(feedback)
        await self.session.flush()  # để DB điền created_at
        await self.session.refresh(feedback)
        return feedback
