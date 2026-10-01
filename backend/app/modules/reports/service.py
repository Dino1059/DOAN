import secrets

from app.core.crud_service import CrudService
from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import Conflict, NotFound
from app.core.ids import new_id
from app.modules.evidence.repository import EvidenceRepository
from app.modules.evidence.storage import LocalStorage
from app.modules.execution.state_machine import TERMINAL
from app.modules.reports.exporters import markdown as markdown_exporter
from app.modules.reports.exporters import pdf as pdf_exporter
from app.modules.reports.models import Report
from app.modules.reports.repository import ReportsRepository
from app.modules.reports.schemas import ReportDetailOut, ReportGenerateIn, ReportListQuery, ReportOut
from app.modules.test_runs.schemas import RunDetail
from app.modules.test_runs.service import TestRunsService

_RESULT_LABELS = {"completed": "Passed", "failed": "Failed", "cancelled": "Cancelled"}


class ReportService(CrudService[Report]):
    model = Report
    id_prefix = "RPT"
    not_found_message = "Report not found"

    def __init__(
        self, repo, search_repo: ReportsRepository, runs: TestRunsService,
        evidence: EvidenceRepository, storage: LocalStorage,
    ) -> None:
        super().__init__(repo)
        self.search_repo = search_repo
        self.runs = runs
        self.evidence = evidence
        self.storage = storage

    async def generate(self, user: CurrentUserInfo, data: ReportGenerateIn) -> ReportDetailOut:
        run = await self.runs.detail(user, data.run_id)  # không phải của mình → 404
        if run.status not in TERMINAL:
            raise Conflict(f"Run is still '{run.status}'; generate a report after it finishes", code="RUN_NOT_FINISHED")

        content = markdown_exporter.render(run, await self._evidence_counts(run))
        report_id = new_id(self.id_prefix)
        if data.format == "pdf":
            body, ext = pdf_exporter.render(content), "pdf"
        else:
            body, ext = content.encode("utf-8"), "md"
        key = self.storage.save(f"reports/{report_id}.{ext}", body)

        report = await self.repo.add(Report(
            id=report_id, owner_id=user.id, run_id=run.run_id, name=(data.name or run.name)[:200],
            format=data.format, storage_key=key,
        ))
        return self._detail_out(report, run)

    async def list(self, user: CurrentUserInfo, query: ReportListQuery) -> list[ReportOut]:
        rows = await self.search_repo.search(user.id, query)
        return [self._out(report) for report, _run in rows]

    async def detail(self, user: CurrentUserInfo, report_id: str) -> ReportDetailOut:
        report = await self.get_or_404(user, report_id)
        run = await self.runs.detail(user, report.run_id)
        return self._detail_out(report, run)

    async def download(self, user: CurrentUserInfo, report_id: str) -> tuple[Report, bytes]:
        report = await self.get_or_404(user, report_id)
        return report, self._read(report)

    async def delete(self, user: CurrentUserInfo, report_id: str) -> None:
        report = await self.get_or_404(user, report_id)
        await self.repo.delete(report)
        try:
            self.storage.delete_prefix(report.storage_key)
        except OSError:
            pass  # file đã mất sẵn: không chặn việc xoá bản ghi

    async def share(self, user: CurrentUserInfo, report_id: str) -> str:
        report = await self.get_or_404(user, report_id)
        if not report.share_token:
            report.share_token = secrets.token_urlsafe(16)
            await self.repo.session.flush()
        return report.share_token

    async def unshare(self, user: CurrentUserInfo, report_id: str) -> None:
        report = await self.get_or_404(user, report_id)
        report.share_token = None
        await self.repo.session.flush()

    async def get_shared(self, token: str) -> tuple[Report, bytes]:
        report = await self.search_repo.get_by_token(token)
        if report is None:
            raise NotFound("Report not found", code="REPORT_NOT_FOUND")
        return report, self._read(report)

    # ---------- helpers ----------

    def _read(self, report: Report) -> bytes:
        try:
            return self.storage.read(report.storage_key)
        except FileNotFoundError:
            raise NotFound("Report file is missing", code="REPORT_FILE_MISSING") from None

    async def _evidence_counts(self, run: RunDetail) -> dict[int, int]:
        return {step.step_no: len(await self.evidence.list_for_step(run.run_id, step.step_no)) for step in run.steps}

    def _out(self, report: Report) -> ReportOut:
        return ReportOut(
            id=report.id, run_id=report.run_id, name=report.name, format=report.format,
            shared=report.share_token is not None, created_at=report.created_at,
        )

    def _detail_out(self, report: Report, run: RunDetail) -> ReportDetailOut:
        failed_step_no = next((s.step_no for s in run.steps if s.status == "failed"), None)
        failed_step = f"Step {failed_step_no} / {len(run.steps)}" if failed_step_no else "—"
        result = _RESULT_LABELS.get(run.status, run.status.title())
        return ReportDetailOut(
            **self._out(report).model_dump(), result=result, duration=run.duration, failed_step=failed_step
        )
