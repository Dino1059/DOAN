"""Import mọi models để Alembic (autogenerate/check) thấy đủ bảng.

Thêm 1 dòng import mỗi khi một module có models.py mới.
"""
from app.db.base import Base
from app.modules.auth.models import AuthSession, User  # noqa: F401
from app.modules.environments.models import Environment  # noqa: F401
from app.modules.evidence.models import EvidenceArtifact  # noqa: F401
from app.modules.execution.models import RunIntervention, TestRun, TestRunStep  # noqa: F401
from app.modules.feedback.models import Feedback  # noqa: F401
from app.modules.test_planning.models import (  # noqa: F401
    Conversation,
    ConversationMessage,
    TestPlan,
    TestPlanStep,
)

__all__ = ["Base"]
