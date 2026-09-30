from datetime import datetime, timezone

from sqlalchemy import exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ids import new_id
from app.db.repository import OwnedRepository
from app.modules.test_planning.models import Conversation, ConversationMessage, TestPlan, TestPlanStep


class PlanningRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.conversations = OwnedRepository(Conversation, session)
        self.plans = OwnedRepository(TestPlan, session)

    # ----- conversations -----

    async def create_conversation(self, owner_id: str, title: str, llm_provider: str, llm_model: str) -> Conversation:
        next_seq = await self.session.scalar(
            select(func.coalesce(func.max(Conversation.seq_no), 0) + 1).where(Conversation.owner_id == owner_id)
        )
        conversation = await self.conversations.add(
            Conversation(
                id=new_id("CNV"), owner_id=owner_id, seq_no=next_seq, title=title,
                llm_provider=llm_provider, llm_model=llm_model,
            )
        )
        await self.session.refresh(conversation)  # lấy created_at/last_message_at do DB điền
        return conversation

    async def search_conversations(self, owner_id: str, q: str | None, limit: int) -> list[Conversation]:
        where = [Conversation.archived_at.is_(None)]
        if q:
            pattern = f"%{q}%"
            where.append(
                or_(
                    Conversation.title.ilike(pattern),
                    exists().where(
                        ConversationMessage.conversation_id == Conversation.id,
                        ConversationMessage.role == "user",
                        ConversationMessage.content.ilike(pattern),
                    ),
                    exists().where(TestPlan.conversation_id == Conversation.id, TestPlan.target_url.ilike(pattern)),
                )
            )
        return await self.conversations.list(
            owner_id, where=tuple(where), order_by=(Conversation.last_message_at.desc(),), limit=limit
        )

    # ----- messages -----

    async def append_message(self, conversation: Conversation, *, role: str, content: str, **fields) -> ConversationMessage:
        next_seq = await self.session.scalar(
            select(func.coalesce(func.max(ConversationMessage.seq), 0) + 1).where(
                ConversationMessage.conversation_id == conversation.id
            )
        )
        message = ConversationMessage(
            id=new_id("MSG"), conversation_id=conversation.id, seq=next_seq, role=role, content=content, **fields
        )
        self.session.add(message)
        conversation.last_message_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def list_messages(self, conversation_id: str) -> list[ConversationMessage]:
        stmt = (
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.seq)
        )
        return list((await self.session.execute(stmt)).scalars())

    # ----- plans -----

    async def latest_plan(self, conversation_id: str) -> TestPlan | None:
        stmt = (
            select(TestPlan)
            .where(TestPlan.conversation_id == conversation_id)
            .order_by(TestPlan.version.desc())
            .limit(1)
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def latest_plans_for(self, conversation_ids: list[str]) -> dict[str, tuple[TestPlan, int]]:
        """Plan mới nhất + số bước của nhiều phiên cùng lúc (cho Session History, tránh N+1)."""
        if not conversation_ids:
            return {}
        latest = (
            select(TestPlan.id)
            .where(TestPlan.conversation_id.in_(conversation_ids))
            .distinct(TestPlan.conversation_id)
            .order_by(TestPlan.conversation_id, TestPlan.version.desc())
        )
        step_count = (
            select(func.count(TestPlanStep.id)).where(TestPlanStep.plan_id == TestPlan.id).scalar_subquery()
        )
        rows = (await self.session.execute(select(TestPlan, step_count).where(TestPlan.id.in_(latest)))).all()
        return {plan.conversation_id: (plan, count) for plan, count in rows}

    async def add_plan(self, plan: TestPlan, steps: list[TestPlanStep]) -> TestPlan:
        plan.steps = steps
        await self.plans.add(plan)
        await self.session.refresh(plan)
        return plan

    async def replace_steps(self, plan: TestPlan, steps: list[TestPlanStep]) -> TestPlan:
        plan.steps.clear()
        await self.session.flush()  # xoá bước cũ trước để không vướng UNIQUE(plan_id, step_no)
        plan.steps.extend(steps)
        await self.session.flush()
        await self.session.refresh(plan)
        return plan
