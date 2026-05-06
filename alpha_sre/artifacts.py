from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Tuple

from .events import Command, Event
from .gate import GateResult
from .incident import IncidentReport
from .integration import ReleaseAttemptRecord, ReplayDriftReport
from .metrics import MetricSummary
from .replay import ReplayResult, ReplaySession
from .serialization import (
    command_from_dict,
    event_from_dict,
    gate_result_from_dict,
    incident_report_from_dict,
    metric_summary_from_dict,
    narrative_quality_review_record_from_dict,
    release_attempt_record_from_dict,
    replay_session_from_dict,
    replay_result_from_dict,
    snapshot_from_dict,
    to_jsonable,
)
from .review import NarrativeQualityReviewRecord
from .state import NarrativeSnapshot


ARTIFACT_BUNDLE_VERSION = "1.0"


@dataclass(frozen=True)
class ReplayBundle:
    command: Command
    snapshot: NarrativeSnapshot
    events: Tuple[Event, ...]
    replay: ReplayResult
    gate: GateResult
    metrics: MetricSummary
    drift_report: ReplayDriftReport
    session: ReplaySession | None = None
    bundle_version: str = ARTIFACT_BUNDLE_VERSION

    def to_dict(self) -> dict:
        return to_jsonable(self)

    @classmethod
    def from_dict(cls, data: dict) -> "ReplayBundle":
        from .integration import ReplayDriftReport

        drift = data.get("drift_report", {})
        return cls(
            command=command_from_dict(data["command"]),
            snapshot=snapshot_from_dict(data["snapshot"]),
            events=tuple(event_from_dict(item) for item in data.get("events", [])),
            replay=replay_result_from_dict(data["replay"]),
            gate=gate_result_from_dict(data["gate"]),
            metrics=metric_summary_from_dict(data["metrics"]),
            drift_report=ReplayDriftReport(
                drifted=bool(drift.get("drifted", False)),
                reasons=tuple(drift.get("reasons", ())),
                source_signature=dict(drift.get("source_signature", {})),
                replay_signature=dict(drift.get("replay_signature", {})),
            ),
            session=replay_session_from_dict(data["session"]) if data.get("session") is not None else None,
            bundle_version=data.get("bundle_version", ARTIFACT_BUNDLE_VERSION),
        )


@dataclass(frozen=True)
class JsonArtifactStore:
    base_dir: Path
    indent: int = 2
    sort_keys: bool = True

    def _resolve(self, relative_path: str) -> Path:
        base = self.base_dir.resolve()
        target = (base / relative_path).resolve()
        if base not in target.parents and target != base:
            raise ValueError("artifact path escapes base directory")
        return target

    def save_bundle(self, relative_path: str, bundle: ReplayBundle) -> Path:
        target = self._resolve(relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(bundle.to_dict(), indent=self.indent, sort_keys=self.sort_keys), encoding="utf-8")
        return target

    def load_bundle(self, relative_path: str) -> ReplayBundle:
        target = self._resolve(relative_path)
        return ReplayBundle.from_dict(json.loads(target.read_text(encoding="utf-8")))

    def save_incident_report(self, relative_path: str, report: IncidentReport) -> Path:
        target = self._resolve(relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(to_jsonable(report), indent=self.indent, sort_keys=self.sort_keys), encoding="utf-8")
        return target

    def load_incident_report(self, relative_path: str) -> IncidentReport:
        target = self._resolve(relative_path)
        return incident_report_from_dict(json.loads(target.read_text(encoding="utf-8")))

    def save_release_attempt_record(self, relative_path: str, record: ReleaseAttemptRecord) -> Path:
        target = self._resolve(relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(to_jsonable(record), indent=self.indent, sort_keys=self.sort_keys), encoding="utf-8")
        return target

    def load_release_attempt_record(self, relative_path: str) -> ReleaseAttemptRecord:
        target = self._resolve(relative_path)
        return release_attempt_record_from_dict(json.loads(target.read_text(encoding="utf-8")))

    def save_quality_review_record(self, relative_path: str, record: NarrativeQualityReviewRecord) -> Path:
        target = self._resolve(relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(to_jsonable(record), indent=self.indent, sort_keys=self.sort_keys), encoding="utf-8")
        return target

    def load_quality_review_record(self, relative_path: str) -> NarrativeQualityReviewRecord:
        target = self._resolve(relative_path)
        return narrative_quality_review_record_from_dict(json.loads(target.read_text(encoding="utf-8")))
