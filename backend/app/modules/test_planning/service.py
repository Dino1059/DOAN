from datetime import datetime, timezone

from app.agents.llm.base import LLMError
from app.agents.protocol import ChatTurn, PlanDraft
from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import Conflict, NotFound, UpstreamError
from app.core.ids import new_id
from app.modules.test_planning.models import Conversation, ConversationMessage, TestPlan, TestPlanStep
from app.modules.test_planning.repository import PlanningRepository
from app.modules.test_planning.schemas import (
    ConversationDetailOut,
    ConversationOut,
    ConversationPatchIn,
    GeneratePlanIn,
    GeneratePlanOut,
    MessageOut,
    PlanOut,
    StepIn,
    StepOut,
)

_Step = tuple[str, str, str]  # (action, selector, expected)


class PlanningService:
    def __init__(self, repo: PlanningRepository, planner) -> None:
        self.repo = repo
        self.planner = planner  # PlannerAgent (OpenAI) hoặc FakePlanner — cùng hàm generate()

    # ---------- Sinh plan (tin nhắn chat, Run Again) ----------

    async def generate_plan(self, user: CurrentUserInfo, req: GeneratePlanIn) -> GeneratePlanOut:
        is_new = req.conversation_id is None
        if is_new:
            # Tên tạm; đổi thành tên do Planner đặt sau khi sinh plan xong.
            conversation = await self.repo.create_conversation(
                user.id, title=req.prompt[:60], llm_provider="pending", llm_model="pending"
            )
        else:
            conversation = await self._get_conversation(user, req.conversation_id)

        history = [
            ChatTurn(role=m.role, content=m.content)
            for m in await self.repo.list_messages(conversation.id)
            if m.role in ("user", "assistant")
        ]
        current = await self.repo.latest_plan(conversation.id)

        user_msg = await self.repo.append_message(conversation, role="user", content=req.prompt)
        try:
            draft: PlanDraft = await self.planner.generate(
                req.prompt, history, _plan_for_llm(current) if current else None
            )
        except LLMError as exc:
            # Lỗi → get_session rollback cả transaction: không để lại phiên/tin nhắn dở dang.
            raise UpstreamError(f"Planner Agent failed: {exc}", code="PLANNER_FAILED") from exc

        steps = self._build_steps(draft, current, user_msg)
        plan = await self.repo.add_plan(
            TestPlan(
                id=new_id("PLN"),
                owner_id=user.id,
                conversation_id=conversation.id,
                version=(current.version + 1) if current else 1,
                source_message_id=user_msg.id,
                objective=draft.objective,
                target_url=draft.target_url,
                preconditions=draft.preconditions,
                test_data=draft.test_data,
                llm_provider=draft.usage.provider,
                llm_model=draft.usage.model,
                status="draft",
            ),
            steps,
        )
        if is_new:
            conversation.title = draft.title
            conversation.llm_provider = draft.usage.provider
            conversation.llm_model = draft.usage.model

        assistant_msg = await self.repo.append_message(
            conversation,
            role="assistant",
            agent="planner",
            kind="plan_updated" if current else "plan_created",
            content=draft.reply or f"Created a test plan with {len(steps)} steps.",
            plan_id=plan.id,
            llm_provider=draft.usage.provider,
            llm_model=draft.usage.model,
            prompt_tokens=draft.usage.prompt_tokens,
            completion_tokens=draft.usage.completion_tokens,
            latency_ms=draft.usage.latency_ms,
        )
        return GeneratePlanOut(
            **_plan_out(plan).model_dump(),
            conversation=_conversation_out(conversation, plan, len(plan.steps)),
            messages=[MessageOut.model_validate(user_msg), MessageOut.model_validate(assistant_msg)],
        )

    @staticmethod
    def _build_steps(draft: PlanDraft, current: TestPlan | None, user_msg: ConversationMessage) -> list[TestPlanStep]:
        """Đánh dấu cột Source: bước giữ nguyên thì giữ nguồn cũ, bước LLM đổi theo tin nhắn thì 'chat_edit'."""
        previous = {s.step_no: s for s in current.steps} if current else {}
        result = []
        for no, d in enumerate(draft.steps, start=1):
            old = previous.get(no)
            unchanged = old is not None and (old.action, old.selector, old.expected) == (d.action, d.selector, d.expected)
            if not current:
                source, source_msg = "original", None
            elif unchanged:
                source, source_msg = old.source, old.source_message_id
            else:
                source, source_msg = "chat_edit", user_msg.id
            result.append(
                TestPlanStep(
                    id=new_id("STP"), step_no=no, action=d.action, selector=d.selector, expected=d.expected,
                    source=source, source_message_id=source_msg,
                )
            )
        return result

    # ---------- Sửa plan trực tiếp (Edit Directly, + Add Step, xoá bước) ----------

    async def update_steps(self, user: CurrentUserInfo, plan_id: str, steps: list[StepIn]) -> PlanOut:
        plan = await self._get_plan(user, plan_id)
        if plan.status != "draft":
            raise Conflict(
                "This plan has already been run and is locked. Send a chat message to create a new version.",
                code="PLAN_LOCKED",
            )
        previous = {s.step_no: s for s in plan.steps}
        new_steps = []
        for no, s in enumerate(steps, start=1):
            old = previous.get(no)
            unchanged = old is not None and (old.action, old.selector, old.expected) == (s.action, s.selector, s.expected)
            new_steps.append(
                TestPlanStep(
                    id=new_id("STP"), step_no=no, action=s.action, selector=s.selector, expected=s.expected,
                    source=old.source if unchanged else "manual",
                    source_message_id=old.source_message_id if unchanged else None,
                )
            )
        plan = await self.repo.replace_steps(plan, new_steps)
        return _plan_out(plan)

    async def approve(self, user: CurrentUserInfo, plan_id: str) -> PlanOut:
        """Khoá plan khi bấm Confirm & Run (được execution gọi). Gọi lại nhiều lần vẫn an toàn."""
        plan = await self._get_plan(user, plan_id)
        if plan.status != "approved":
            await self.repo.plans.update(plan, {"status": "approved"})
        return _plan_out(plan)

    async def note_run(self, owner_id: str, plan_id: str, run_id: str, kind: str, content: str) -> None:
        """Ghi tin "Test status" vào phiên chat của plan (được execution gọi khi bắt đầu/kết thúc run)."""
        plan = await self.repo.plans.get(plan_id, owner_id)
        if plan is None:
            return
        conversation = await self.repo.conversations.get(plan.conversation_id, owner_id)
        if conversation is None:
            return
        await self.repo.append_message(
            conversation, role="assistant", agent="browser_executor", kind=kind, content=content,
            plan_id=plan_id, run_id=run_id,
        )

    async def get_plan(self, user: CurrentUserInfo, plan_id: str) -> PlanOut:
        return _plan_out(await self._get_plan(user, plan_id))

    # ---------- Session History ----------

    async def list_conversations(self, user: CurrentUserInfo, q: str | None, limit: int) -> list[ConversationOut]:
        conversations = await self.repo.search_conversations(user.id, q.strip() if q else None, limit)
        latest = await self.repo.latest_plans_for([c.id for c in conversations])
        return [_conversation_out(c, *latest.get(c.id, (None, 0))) for c in conversations]

    async def get_conversation(self, user: CurrentUserInfo, conversation_id: str) -> ConversationDetailOut:
        conversation = await self._get_conversation(user, conversation_id)
        plan = await self.repo.latest_plan(conversation.id)
        messages = await self.repo.list_messages(conversation.id)
        return ConversationDetailOut(
            conversation=_conversation_out(conversation, plan, len(plan.steps) if plan else 0),
            messages=[MessageOut.model_validate(m) for m in messages],
            latest_plan=_plan_out(plan) if plan else None,
        )

    async def update_conversation(
        self, user: CurrentUserInfo, conversation_id: str, patch: ConversationPatchIn
    ) -> ConversationOut:
        conversation = await self._get_conversation(user, conversation_id)
        changes: dict = {}
        if patch.title is not None:
            changes["title"] = patch.title
        if patch.archived is not None:
            changes["archived_at"] = datetime.now(timezone.utc) if patch.archived else None
        await self.repo.conversations.update(conversation, changes)
        plan = await self.repo.latest_plan(conversation.id)
        return _conversation_out(conversation, plan, len(plan.steps) if plan else 0)

    # ---------- helpers ----------

    async def _get_conversation(self, user: CurrentUserInfo, conversation_id: str) -> Conversation:
        conversation = await self.repo.conversations.get(conversation_id, user.id)
        if conversation is None:
            raise NotFound("Conversation not found", code="CONVERSATION_NOT_FOUND")
        return conversation

    async def _get_plan(self, user: CurrentUserInfo, plan_id: str) -> TestPlan:
        plan = await self.repo.plans.get(plan_id, user.id)
        if plan is None:
            raise NotFound("Test plan not found", code="PLAN_NOT_FOUND")
        return plan


def _plan_for_llm(plan: TestPlan) -> dict:
    return {
        "objective": plan.objective,
        "target_url": plan.target_url or "",
        "preconditions": plan.preconditions,
        "test_data": plan.test_data,
        "steps": [{"action": s.action, "selector": s.selector, "expected": s.expected} for s in plan.steps],
    }


def _plan_out(plan: TestPlan) -> PlanOut:
    return PlanOut(
        plan_id=plan.id,
        task_id=plan.id,
        conversation_id=plan.conversation_id,
        version=plan.version,
        status=plan.status,
        objective=plan.objective,
        target_url=plan.target_url or "",
        preconditions=plan.preconditions,
        test_data=plan.test_data,
        steps=[
            StepOut(id=s.step_no, step_no=s.step_no, action=s.action, selector=s.selector, expected=s.expected, source=s.source)
            for s in plan.steps
        ],
        llm_provider=plan.llm_provider,
        llm_model=plan.llm_model,
        created_at=plan.created_at,
    )


def _conversation_out(conversation: Conversation, plan: TestPlan | None, step_count: int) -> ConversationOut:
    return ConversationOut(
        id=conversation.id,
        seq_no=conversation.seq_no,
        title=conversation.title,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        archived=conversation.archived_at is not None,
        latest_plan_id=plan.id if plan else None,
        latest_plan_status=plan.status if plan else None,
        latest_plan_steps=step_count,
        target_url=(plan.target_url or None) if plan else None,
    )
