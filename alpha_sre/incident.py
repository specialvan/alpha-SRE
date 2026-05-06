from __future__ import annotations

from dataclasses import dataclass, field

from .validation import ValidationIssue, ValidationResult


INCIDENT_REPORT_VERSION = "1.0"


@dataclass(frozen=True)
class IncidentActionItem:
    action: str
    owner: str
    layer: str
    due_date: str | None = None
    status: str = "open"


@dataclass(frozen=True)
class IncidentReport:
    incident_id: str
    title: str
    severity: str
    status: str
    date_opened: str
    incident_owner: str
    affected_workflow: str = ""
    observable_failure: str = ""
    scope_of_impact: str = ""
    detection_source: str = ""
    triggering_command_id: str | None = None
    suspected_failure_classification: str | None = None
    rollback_triggered: bool | None = None
    gate_bypass_involved: bool | None = None
    replay_session_id: str | None = None
    locked_command_id: str | None = None
    locked_event_chain_reference: str | None = None
    pre_state_snapshot_id: str | None = None
    post_state_snapshot_id: str | None = None
    policy_version: str | None = None
    replay_result_summary: str = ""
    state_identity: str | None = None
    snapshot_schema_version: str | None = None
    contract_version_reference: str | None = None
    detected_state_drift: tuple[str, ...] = field(default_factory=tuple)
    detected_contract_mismatch: tuple[str, ...] = field(default_factory=tuple)
    missing_mechanism: str | None = None
    existing_control_gap: str | None = None
    owning_spec: str | None = None
    temporary_workaround: str | None = None
    primary_cause: str = ""
    contributing_causes: tuple[str, ...] = field(default_factory=tuple)
    validation_escape_reason: str = ""
    immediate_mitigation: str = ""
    rollback_trigger: str = ""
    rollback_action_taken: str = ""
    residual_risk: str = ""
    required_regression_test: str | None = None
    known_failure_class_covered: str | None = None
    recurred_from_prior_incident: bool | None = None
    is_regression: bool | None = None
    replay_confirmed_regression: bool | None = None
    evidence_location: str | None = None
    pass_criteria_for_closure: str = ""
    evidence_references: tuple[str, ...] = field(default_factory=tuple)
    action_items: tuple[IncidentActionItem, ...] = field(default_factory=tuple)
    artifact_version: str = INCIDENT_REPORT_VERSION

    def validate(self) -> ValidationResult:
        issues = []
        if not self.incident_id:
            issues.append(ValidationIssue("missing_incident_id", "incident id is required", field="incident_id"))
        if not self.title:
            issues.append(ValidationIssue("missing_incident_title", "incident title is required", subject_id=self.incident_id, field="title"))
        if not self.severity:
            issues.append(ValidationIssue("missing_incident_severity", "incident severity is required", subject_id=self.incident_id, field="severity"))
        if not self.status:
            issues.append(ValidationIssue("missing_incident_status", "incident status is required", subject_id=self.incident_id, field="status"))
        if not self.date_opened:
            issues.append(ValidationIssue("missing_incident_open_date", "incident open date is required", subject_id=self.incident_id, field="date_opened"))
        if not self.incident_owner:
            issues.append(ValidationIssue("missing_incident_owner", "incident owner is required", subject_id=self.incident_id, field="incident_owner"))
        if not self.locked_command_id:
            issues.append(ValidationIssue("missing_locked_command_id", "incident report requires locked command id", subject_id=self.incident_id))
        if not self.pre_state_snapshot_id:
            issues.append(ValidationIssue("missing_pre_state_snapshot_id", "incident report requires pre-state snapshot id", subject_id=self.incident_id))
        if not self.evidence_references:
            issues.append(ValidationIssue("missing_incident_evidence", "incident report requires evidence references", subject_id=self.incident_id))
        return ValidationResult(not issues, tuple(issues))

    @classmethod
    def from_replay_bundle(
        cls,
        *,
        incident_id: str,
        title: str,
        severity: str,
        status: str,
        date_opened: str,
        incident_owner: str,
        replay_bundle_reference: str,
        bundle,
        affected_workflow: str = "",
        observable_failure: str = "",
        scope_of_impact: str = "",
        detection_source: str = "",
        rollback_triggered: bool | None = None,
        gate_bypass_involved: bool | None = None,
        missing_mechanism: str | None = None,
        existing_control_gap: str | None = None,
        owning_spec: str | None = None,
        temporary_workaround: str | None = None,
        primary_cause: str = "",
        contributing_causes: tuple[str, ...] = (),
        validation_escape_reason: str = "",
        immediate_mitigation: str = "",
        rollback_trigger: str = "",
        rollback_action_taken: str = "",
        residual_risk: str = "",
        pass_criteria_for_closure: str = "",
        action_items: tuple[IncidentActionItem, ...] = (),
    ) -> "IncidentReport":
        replay_session_id = None
        if bundle.session is not None and bundle.session.observation_frame is not None:
            replay_session_id = bundle.session.observation_frame.replay_id
        elif bundle.replay.evidence_references:
            replay_session_id = next((item.removeprefix("replay:") for item in bundle.replay.evidence_references if item.startswith("replay:")), None)

        required_regression_test = None
        if bundle.replay.causal_validation is not None:
            for finding in bundle.replay.causal_validation.findings:
                if finding.recommended_regression_test:
                    required_regression_test = finding.recommended_regression_test
                    break

        detected_contract_mismatch = tuple(
            issue.code for issue in bundle.replay.issues if issue.code.endswith("_mismatch")
        )
        detected_state_drift = tuple(reason for reason in bundle.drift_report.reasons if reason.endswith("_drift"))
        replay_summary = bundle.replay.failure_classification or ("ok" if bundle.replay.ok else "unknown")

        return cls(
            incident_id=incident_id,
            title=title,
            severity=severity,
            status=status,
            date_opened=date_opened,
            incident_owner=incident_owner,
            affected_workflow=affected_workflow,
            observable_failure=observable_failure,
            scope_of_impact=scope_of_impact,
            detection_source=detection_source,
            triggering_command_id=bundle.command.command_id,
            suspected_failure_classification=bundle.replay.failure_classification,
            rollback_triggered=rollback_triggered,
            gate_bypass_involved=gate_bypass_involved,
            replay_session_id=replay_session_id,
            locked_command_id=bundle.command.command_id,
            locked_event_chain_reference=replay_bundle_reference,
            pre_state_snapshot_id=bundle.snapshot.snapshot_id,
            post_state_snapshot_id=bundle.replay.state.snapshot_id,
            policy_version=bundle.snapshot.policy_version,
            replay_result_summary=replay_summary,
            state_identity=bundle.snapshot.state_identity,
            snapshot_schema_version=bundle.snapshot.schema_version,
            contract_version_reference=bundle.bundle_version,
            detected_state_drift=detected_state_drift,
            detected_contract_mismatch=detected_contract_mismatch,
            missing_mechanism=missing_mechanism,
            existing_control_gap=existing_control_gap,
            owning_spec=owning_spec,
            temporary_workaround=temporary_workaround,
            primary_cause=primary_cause,
            contributing_causes=contributing_causes,
            validation_escape_reason=validation_escape_reason,
            immediate_mitigation=immediate_mitigation,
            rollback_trigger=rollback_trigger,
            rollback_action_taken=rollback_action_taken,
            residual_risk=residual_risk,
            required_regression_test=required_regression_test,
            known_failure_class_covered=bundle.replay.failure_classification,
            recurred_from_prior_incident=False,
            is_regression=required_regression_test is not None,
            replay_confirmed_regression=required_regression_test is not None,
            evidence_location=replay_bundle_reference,
            pass_criteria_for_closure=pass_criteria_for_closure,
            evidence_references=bundle.replay.evidence_references,
            action_items=action_items,
        )
