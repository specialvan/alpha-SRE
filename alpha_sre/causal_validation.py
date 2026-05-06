from __future__ import annotations

from dataclasses import dataclass, field

from .events import Event
from .state import NarrativeSnapshot, VisibilityScope
from .validation import ValidationIssue


@dataclass(frozen=True)
class CausalFinding:
    failure_class: str
    offending_event_id: str
    missing_prerequisite_or_overwrite_point: str | None = None
    affected_state_field: str | None = None
    affected_subject: str | None = None
    replay_evidence_reference: str | None = None
    recommended_regression_test: str | None = None


@dataclass(frozen=True)
class CausalValidationResult:
    ok: bool
    issues: tuple[ValidationIssue, ...] = field(default_factory=tuple)
    findings: tuple[CausalFinding, ...] = field(default_factory=tuple)
    checked_outcome_count: int = 0
    covered_outcome_count: int = 0
    checked_rule_change_count: int = 0
    drift_rule_change_count: int = 0


def _append_issue_and_finding(
    issues: list[ValidationIssue],
    findings: list[CausalFinding],
    issue: ValidationIssue,
    *,
    missing_prerequisite_or_overwrite_point: str | None = None,
    affected_state_field: str | None = None,
    affected_subject: str | None = None,
    replay_evidence_reference: str | None = None,
    recommended_regression_test: str | None = None,
) -> None:
    issues.append(issue)
    findings.append(
        CausalFinding(
            failure_class=issue.code,
            offending_event_id=issue.subject_id or "unknown-event",
            missing_prerequisite_or_overwrite_point=missing_prerequisite_or_overwrite_point,
            affected_state_field=affected_state_field,
            affected_subject=affected_subject,
            replay_evidence_reference=replay_evidence_reference,
            recommended_regression_test=recommended_regression_test,
        )
    )


def validate_causality(snapshot: NarrativeSnapshot, events: list[Event]) -> CausalValidationResult:
    issues: list[ValidationIssue] = []
    findings: list[CausalFinding] = []
    checked_outcome_count = 0
    covered_outcome_count = 0
    checked_rule_change_count = 0
    drift_rule_change_count = 0
    snapshot_validation = snapshot.validate()
    issues.extend(snapshot_validation.issues)
    known_world_rules = set(snapshot.world_rules)
    known_memories = set(snapshot.memories)
    known_events = set()
    seen_order = set()

    for event in sorted(events, key=lambda e: e.causal_order_index):
        if event.event_id in known_events:
            _append_issue_and_finding(
                issues,
                findings,
                ValidationIssue("duplicate_event_id", "duplicate event id in replay chain", subject_id=event.event_id),
                missing_prerequisite_or_overwrite_point=f"event_id:{event.event_id}",
                affected_state_field=f"events.{event.event_id}.event_id",
                affected_subject=event.event_id,
                replay_evidence_reference=f"event:{event.event_id}",
                recommended_regression_test="replay_regression::reject_duplicate_event_ids",
            )
        known_events.add(event.event_id)
        if event.causal_order_index in seen_order:
            _append_issue_and_finding(
                issues,
                findings,
                ValidationIssue("duplicate_causal_index", "duplicate causal order index", subject_id=event.event_id),
                missing_prerequisite_or_overwrite_point=f"causal_order_index:{event.causal_order_index}",
                affected_state_field=f"events.{event.event_id}.causal_order_index",
                affected_subject=event.event_id,
                replay_evidence_reference=f"event:{event.event_id}",
                recommended_regression_test="replay_regression::reject_duplicate_causal_order",
            )
        seen_order.add(event.causal_order_index)
        event_validation = event.validate()
        issues.extend(event_validation.issues)
        payload = event.payload
        if event.event_type == "reveal":
            revealed = payload.get("memory_id")
            if revealed not in known_memories:
                _append_issue_and_finding(
                    issues,
                    findings,
                    ValidationIssue("missing_precondition", "reveal requires an existing memory", subject_id=event.event_id),
                    missing_prerequisite_or_overwrite_point=f"memory:{revealed}" if revealed is not None else "missing_memory",
                    affected_state_field=f"memories.{revealed}" if revealed is not None else "memories",
                    affected_subject=revealed,
                    replay_evidence_reference=f"event:{event.event_id}",
                    recommended_regression_test="replay_regression::reveal_requires_existing_memory",
                )
            if event.visibility_scope == VisibilityScope.HIDDEN:
                _append_issue_and_finding(
                    issues,
                    findings,
                    ValidationIssue("visibility_leak", "hidden reveal leaked into actor-visible chain", subject_id=event.event_id),
                    affected_state_field=f"memories.{revealed}.visibility_scope" if revealed is not None else f"events.{event.event_id}.visibility_scope",
                    affected_subject=revealed,
                    replay_evidence_reference=f"event:{event.event_id}",
                    recommended_regression_test="replay_regression::hidden_reveal_blocked",
                )
        if event.event_type == "world_rule_update":
            checked_rule_change_count += 1
            rule_id = payload.get("rule_id")
            if payload.get("authority") == "authorized" and rule_id:
                known_world_rules.add(rule_id)
            elif rule_id:
                drift_rule_change_count += 1
                _append_issue_and_finding(
                    issues,
                    findings,
                    ValidationIssue("unauthorized_overwrite", "world rule changed without authority", subject_id=event.event_id),
                    missing_prerequisite_or_overwrite_point=f"rule:{rule_id}",
                    affected_state_field=f"world_rules.{rule_id}",
                    affected_subject=rule_id,
                    replay_evidence_reference=f"event:{event.event_id}",
                    recommended_regression_test="replay_regression::authorized_world_rule_updates_only",
                )
        if event.event_type == "chapter_outcome":
            checked_outcome_count += 1
            prereq = payload.get("prerequisite_event_id")
            if prereq is None or prereq not in known_events:
                _append_issue_and_finding(
                    issues,
                    findings,
                    ValidationIssue("missing_precondition", "outcome lacks causal prerequisite", subject_id=event.event_id),
                    missing_prerequisite_or_overwrite_point="missing_event" if prereq is None else f"missing_event:{prereq}",
                    affected_state_field=f"events.{event.event_id}.prerequisite_event_id",
                    affected_subject=event.event_id,
                    replay_evidence_reference=f"event:{event.event_id}",
                    recommended_regression_test="replay_regression::chapter_outcome_requires_prerequisite",
                )
            else:
                covered_outcome_count += 1
            if payload.get("knowledge_source") == "hidden":
                _append_issue_and_finding(
                    issues,
                    findings,
                    ValidationIssue("visibility_leak", "outcome relies on hidden knowledge", subject_id=event.event_id),
                    affected_state_field=f"events.{event.event_id}.knowledge_source",
                    affected_subject=event.event_id,
                    replay_evidence_reference=f"event:{event.event_id}",
                    recommended_regression_test="replay_regression::hidden_knowledge_blocked_in_outcome",
                )
        if event.event_type == "add_memory":
            memory_id = payload.get("memory_id")
            if memory_id:
                known_memories.add(memory_id)

    return CausalValidationResult(
        ok=not issues,
        issues=tuple(issues),
        findings=tuple(findings),
        checked_outcome_count=checked_outcome_count,
        covered_outcome_count=covered_outcome_count,
        checked_rule_change_count=checked_rule_change_count,
        drift_rule_change_count=drift_rule_change_count,
    )
