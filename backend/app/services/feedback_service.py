from app.schemas.feedback import FeedbackCreate


class FeedbackService:
    def create(self, payload: FeedbackCreate) -> None:
        # TODO: persist to database and dispatch analytics event.
        return None


feedback_service = FeedbackService()

