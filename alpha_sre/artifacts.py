from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Tuple

from .events import Command, Event
from .gate import GateResult
from .incident import INCIDENT_REPORT_VERSION, IncidentReport
from .integration import RELEASE_ATTEMPT_CONTRACT_VERSION, ReleaseAttemptRecord, ReplayDriftReport
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
from .review import NARRATIVE_QUALITY_REVIEW_CONTRACT_VERSION, NarrativeQualityReviewRecord
from .state import NarrativeSnapshot


ARTIFACT_BUNDLE_VERSION = "1.0"
ARTIFACT_CATALOG_VERSION = "1.0"
ARTIFACT_FIELD_SOURCES = {
    "artifact_ref": "catalog_metadata",
    "artifact_kind": "catalog_metadata",
    "relative_path": "catalog_metadata",
    "native_primary_id": "native_artifact",
}


def _require_exact_version(data: dict, field: str, expected: str, artifact_name: str) -> None:
    actual = data.get(field)
    if actual != expected:
        raise ValueError(
            f"{artifact_name} {field} is unsupported: expected {expected}, got {actual!r}"
        )


def _require_catalog_primary_id(value: object, field: str, artifact_name: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{artifact_name} {field} is required for catalog generation")
    return value


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

        _require_exact_version(data, "bundle_version", ARTIFACT_BUNDLE_VERSION, "replay bundle")
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
            bundle_version=data["bundle_version"],
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

    def build_catalog(self) -> dict:
        artifacts = []

        for target in sorted(self.base_dir.rglob("*.json")):
            if target.name == "index.json":
                continue

            relative_path = target.relative_to(self.base_dir).as_posix()
            parts = Path(relative_path).parts
            if not parts:
                continue

            bucket = parts[0]
            if bucket == "bundles":
                data = json.loads(target.read_text(encoding="utf-8"))
                _require_exact_version(data, "bundle_version", ARTIFACT_BUNDLE_VERSION, "replay bundle")
                command = data.get("command", {})
                artifacts.append(
                    {
                        "artifact_ref": f"bundle:{Path(relative_path).stem}",
                        "artifact_kind": "replay_bundle",
                        "relative_path": relative_path,
                        "native_primary_id": _require_catalog_primary_id(
                            command.get("command_id"),
                            "command.command_id",
                            "replay bundle",
                        ),
                    }
                )
                continue

            if bucket == "incidents":
                data = json.loads(target.read_text(encoding="utf-8"))
                _require_exact_version(data, "artifact_version", INCIDENT_REPORT_VERSION, "incident report")
                artifacts.append(
                    {
                        "artifact_ref": f"incident:{_require_catalog_primary_id(data.get('incident_id'), 'incident_id', 'incident report')}",
                        "artifact_kind": "incident_report",
                        "relative_path": relative_path,
                        "native_primary_id": _require_catalog_primary_id(
                            data.get("incident_id"),
                            "incident_id",
                            "incident report",
                        ),
                    }
                )
                continue

            if bucket == "releases":
                data = json.loads(target.read_text(encoding="utf-8"))
                _require_exact_version(
                    data,
                    "contract_version",
                    RELEASE_ATTEMPT_CONTRACT_VERSION,
                    "release attempt record",
                )
                artifacts.append(
                    {
                        "artifact_ref": f"release:{_require_catalog_primary_id(data.get('attempt_id'), 'attempt_id', 'release attempt record')}",
                        "artifact_kind": "release_attempt_record",
                        "relative_path": relative_path,
                        "native_primary_id": _require_catalog_primary_id(
                            data.get("attempt_id"),
                            "attempt_id",
                            "release attempt record",
                        ),
                    }
                )
                continue

            if bucket == "reviews":
                data = json.loads(target.read_text(encoding="utf-8"))
                _require_exact_version(
                    data,
                    "contract_version",
                    NARRATIVE_QUALITY_REVIEW_CONTRACT_VERSION,
                    "quality review record",
                )
                artifacts.append(
                    {
                        "artifact_ref": f"review:{_require_catalog_primary_id(data.get('review_id'), 'review_id', 'quality review record')}",
                        "artifact_kind": "quality_review_record",
                        "relative_path": relative_path,
                        "native_primary_id": _require_catalog_primary_id(
                            data.get("review_id"),
                            "review_id",
                            "quality review record",
                        ),
                    }
                )

        return {
            "catalog_version": ARTIFACT_CATALOG_VERSION,
            "field_sources": dict(ARTIFACT_FIELD_SOURCES),
            "artifacts": artifacts,
        }
