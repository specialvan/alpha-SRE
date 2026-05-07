from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Tuple

from .events import Command, Event
from .gate import ConsistencyGate, GateResult
from .incident import IncidentReport
from .metrics import MetricSummary, compute_metrics
from .replay import ReplayEngine, ReplayResult
from .state import NarrativeSnapshot
from .versioning import schema_versions_compatible
from .validation import ValidationIssue

READ_CONTRACT_VERSION = "1.0"
WRITE_CONTRACT_VERSION = "1.0"
REPLAY_CONTRACT_VERSION = "1.0"
INCIDENT_EXPORT_CONTRACT_VERSION = "1.0"
RELEASE_ATTEMPT_CONTRACT_VERSION = "1.0"


@dataclass(frozen=True)
class ReadRequest:
    expected_state_identity: str | None = None
    expected_schema_version: str | None = None
    expected_visibility_version: str | None = None


@dataclass(frozen=True)
class ReadResponse:
    ok: bool
    snapshot: NarrativeSnapshot | None
    issues: Tuple[ValidationIssue, ...] = field(default_factory=tuple)
    contract_version: str = READ_CONTRACT_VERSION


@dataclass(frozen=True)
class WriteBackRequest:
    command: Command
    snapshot: NarrativeSnapshot
    events: Tuple[Event, ...]
    source_system: str
    actor: str
    expected_policy_version: str
    expected_visibility_version: str
    expected_schema_version: str
    expected_replay_contract_version: str = REPLAY_CONTRACT_VERSION
    contract_version: str = WRITE_CONTRACT_VERSION


@dataclass(frozen=True)
class ReplayDriftReport:
    drifted: bool
    reasons: Tuple[str, ...] = field(default_factory=tuple)
    source_signature: Dict[str, Any] = field(default_factory=dict)
    replay_signature: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class WriteBackResult:
    ok: bool
    replay: ReplayResult
    gate: GateResult
    metrics: MetricSummary
    drift_report: ReplayDriftReport
    issues: Tuple[ValidationIssue, ...] = field(default_factory=tuple)
    contract_version: str = WRITE_CONTRACT_VERSION


@dataclass(frozen=True)
class ReleaseAttemptRecord:
    attempt_id: str
    triggering_command_id: str
    started_at: str
    source_snapshot_id: str
    source_system: str
    actor: str
    write_back_ok: bool
    gate_allowed: bool
    drift_detected: bool
    manual_rollback_performed: bool = False
    rollback_reason: str = ""
    incident_id: str | None = None
    derived_from_attempt_id: str | None = None
    contract_version: str = RELEASE_ATTEMPT_CONTRACT_VERSION


@dataclass(frozen=True)
class IncidentExportRequest:
    report: IncidentReport
    artifact_reference: str
    source_system: str
    expected_contract_version: str = INCIDENT_EXPORT_CONTRACT_VERSION


@dataclass(frozen=True)
class IncidentExportResponse:
    ok: bool
    incident_id: str | None
    artifact_reference: str | None
    failure_classification: str | None
    regression_test_reference: str | None
    replay_references: Tuple[str, ...] = field(default_factory=tuple)
    issues: Tuple[ValidationIssue, ...] = field(default_factory=tuple)
    contract_version: str = INCIDENT_EXPORT_CONTRACT_VERSION


def _snapshot_signature(snapshot: NarrativeSnapshot) -> Dict[str, Any]:
    return {
        "snapshot_id": snapshot.snapshot_id,
        "state_identity": snapshot.state_identity,
        "schema_version": snapshot.schema_version,
        "policy_version": snapshot.policy_version,
        "visibility_version": snapshot.visibility_version,
        "character_ids": tuple(sorted(snapshot.characters)),
        "relationship_ids": tuple(sorted(snapshot.relationships)),
        "memory_ids": tuple(sorted(snapshot.memories)),
        "world_rule_ids": tuple(sorted(snapshot.world_rules)),
        "chapter_intent_ids": tuple(sorted(snapshot.chapter_intents)),
        "fact_ids": tuple(sorted(snapshot.facts)),
        "belief_ids": tuple(sorted(snapshot.beliefs)),
        "plot_thread_ids": tuple(sorted(snapshot.plot_threads)),
        "capability_ids": tuple(sorted(snapshot.capabilities)),
        "visibility_edge_ids": tuple(sorted(snapshot.visibility_edges)),
    }


class IntegrationBridge:
    incident_export_request_cls = IncidentExportRequest
    release_attempt_record_cls = ReleaseAttemptRecord

    def __init__(self, replay_engine: ReplayEngine | None = None, gate: ConsistencyGate | None = None) -> None:
        self._replay_engine = replay_engine or ReplayEngine()
        self._gate = gate or ConsistencyGate()

    def read_snapshot(self, request: ReadRequest, snapshot: NarrativeSnapshot) -> ReadResponse:
        issues: list[ValidationIssue] = []
        if request.expected_state_identity and request.expected_state_identity != snapshot.state_identity:
            issues.append(
                ValidationIssue(
                    "state_identity_mismatch",
                    "requested state identity does not match snapshot",
                    subject_id=snapshot.snapshot_id,
                )
            )
        if request.expected_schema_version and not schema_versions_compatible(request.expected_schema_version, snapshot.schema_version):
            issues.append(
                ValidationIssue(
                    "schema_version_mismatch",
                    "requested schema version is not compatible with snapshot",
                    subject_id=snapshot.snapshot_id,
                )
            )
        if request.expected_visibility_version and request.expected_visibility_version != snapshot.visibility_version:
            issues.append(
                ValidationIssue(
                    "visibility_version_mismatch",
                    "requested visibility version does not match snapshot",
                    subject_id=snapshot.snapshot_id,
                )
            )
        issues.extend(snapshot.validate().issues)
        if issues:
            return ReadResponse(False, None, tuple(issues))
        return ReadResponse(True, snapshot.clone())

    def build_drift_report(self, source_snapshot: NarrativeSnapshot, replay_result: ReplayResult) -> ReplayDriftReport:
        source_signature = _snapshot_signature(source_snapshot)
        replay_signature = _snapshot_signature(replay_result.state)
        reasons: list[str] = []
        if source_signature["state_identity"] != replay_signature["state_identity"]:
            reasons.append("state_identity_drift")
        if source_signature["schema_version"] != replay_signature["schema_version"]:
            reasons.append("schema_version_drift")
        if source_signature["policy_version"] != replay_signature["policy_version"]:
            reasons.append("policy_version_drift")
        if source_signature["visibility_version"] != replay_signature["visibility_version"]:
            reasons.append("visibility_version_drift")
        return ReplayDriftReport(bool(reasons), tuple(dict.fromkeys(reasons)), source_signature, replay_signature)

    def export_incident(self, request: IncidentExportRequest) -> IncidentExportResponse:
        issues: list[ValidationIssue] = []
        if request.expected_contract_version != INCIDENT_EXPORT_CONTRACT_VERSION:
            issues.append(
                ValidationIssue(
                    "incident_export_contract_mismatch",
                    "incident export contract version is unsupported",
                    subject_id=request.report.incident_id,
                )
            )
        if not request.artifact_reference:
            issues.append(
                ValidationIssue(
                    "missing_incident_artifact_reference",
                    "incident export requires an artifact reference",
                    subject_id=request.report.incident_id,
                )
            )
        if not request.source_system:
            issues.append(
                ValidationIssue(
                    "missing_incident_source_system",
                    "incident export requires a source system identity",
                    subject_id=request.report.incident_id,
                )
            )
        issues.extend(request.report.validate().issues)
        return IncidentExportResponse(
            ok=not issues,
            incident_id=request.report.incident_id if request.report.incident_id else None,
            artifact_reference=request.artifact_reference if request.artifact_reference else None,
            failure_classification=request.report.suspected_failure_classification,
            regression_test_reference=request.report.required_regression_test,
            replay_references=request.report.evidence_references,
            issues=tuple(issues),
        )

    def build_release_attempt_record(
        self,
        request: WriteBackRequest,
        result: WriteBackResult,
        *,
        attempt_id: str,
        manual_rollback_performed: bool = False,
        rollback_reason: str = "",
        incident_id: str | None = None,
        derived_from_attempt_id: str | None = None,
    ) -> ReleaseAttemptRecord:
        return ReleaseAttemptRecord(
            attempt_id=attempt_id,
            triggering_command_id=request.command.command_id,
            started_at=request.command.created_at,
            source_snapshot_id=request.snapshot.snapshot_id,
            source_system=request.source_system,
            actor=request.actor,
            write_back_ok=result.ok,
            gate_allowed=result.gate.allowed,
            drift_detected=result.drift_report.drifted,
            manual_rollback_performed=manual_rollback_performed,
            rollback_reason=rollback_reason,
            incident_id=incident_id,
            derived_from_attempt_id=derived_from_attempt_id,
        )

    def write_back(self, request: WriteBackRequest) -> WriteBackResult:
        issues: list[ValidationIssue] = []
        if request.contract_version != WRITE_CONTRACT_VERSION:
            issues.append(
                ValidationIssue(
                    "write_contract_mismatch",
                    "write-back contract version is unsupported",
                    subject_id=request.command.command_id,
                )
            )
        if request.expected_policy_version != request.snapshot.policy_version:
            issues.append(
                ValidationIssue(
                    "policy_version_mismatch",
                    "write-back policy version does not match snapshot",
                    subject_id=request.command.command_id,
                )
            )
        if request.expected_visibility_version != request.snapshot.visibility_version:
            issues.append(
                ValidationIssue(
                    "visibility_version_mismatch",
                    "write-back visibility version does not match snapshot",
                    subject_id=request.command.command_id,
                )
            )
        if not schema_versions_compatible(request.expected_schema_version, request.snapshot.schema_version):
            issues.append(
                ValidationIssue(
                    "schema_version_mismatch",
                    "write-back schema version is not compatible with snapshot",
                    subject_id=request.command.command_id,
                )
            )
        if request.expected_replay_contract_version != REPLAY_CONTRACT_VERSION:
            issues.append(
                ValidationIssue(
                    "replay_contract_mismatch",
                    "write-back replay contract version is unsupported",
                    subject_id=request.command.command_id,
                )
            )
        if issues:
            empty_replay = self._replay_engine.replay(request.command, request.snapshot, list(request.events))
            validation_results = [empty_replay.causal_validation] if empty_replay.causal_validation else []
            metrics = compute_metrics(
                [empty_replay],
                validation_results,
                snapshots=[request.snapshot],
                current_time=request.command.created_at,
            )
            gate = self._gate.evaluate(empty_replay, metrics)
            final_metrics = compute_metrics(
                [empty_replay],
                validation_results,
                write_back_successes=[False],
                snapshots=[request.snapshot],
                current_time=request.command.created_at,
            )
            drift_report = self.build_drift_report(request.snapshot, empty_replay)
            return WriteBackResult(False, empty_replay, gate, final_metrics, drift_report, tuple(issues))

        replay = self._replay_engine.replay(request.command, request.snapshot, list(request.events))
        validation_results = [replay.causal_validation] if replay.causal_validation else []
        metrics = compute_metrics(
            [replay],
            validation_results,
            snapshots=[request.snapshot],
            current_time=request.command.created_at,
        )
        gate = self._gate.evaluate(replay, metrics)
        drift_report = self.build_drift_report(request.snapshot, replay)
        if drift_report.drifted:
            issues.extend(
                ValidationIssue(
                    code,
                    "replay drift detected during write-back",
                    subject_id=request.command.command_id,
                )
                for code in drift_report.reasons
            )
        if not gate.allowed:
            issues.extend(
                ValidationIssue(
                    code,
                    "consistency gate blocked write-back",
                    subject_id=request.command.command_id,
                )
                for code in gate.blocking_issues
            )
        final_ok = not issues and replay.ok and gate.allowed
        final_metrics = compute_metrics(
            [replay],
            validation_results,
            write_back_successes=[final_ok],
            snapshots=[request.snapshot],
            current_time=request.command.created_at,
        )
        return WriteBackResult(final_ok, replay, gate, final_metrics, drift_report, tuple(issues))
