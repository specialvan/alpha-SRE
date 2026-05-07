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
    checked_visibility_decision_count: int = 0
    checked_actor_action_count: int = 0
    checked_plot_obligation_count: int = 0
    checked_rule_activation_count: int = 0
    checked_post_state_surface_count: int = 0


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
    checked_visibility_decision_count = 0
    checked_actor_action_count = 0
    checked_plot_obligation_count = 0
    checked_rule_activation_count = 0
    snapshot_validation = snapshot.validate()
    issues.extend(snapshot_validation.issues)
    known_world_rules = set(snapshot.world_rules)
    known_memories = set(snapshot.memories)
    known_events = set()
    resolution_events_by_thread = set()
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
        actor_id = payload.get("actor_id") or payload.get("character_id")
        action_type = payload.get("action_type") or event.event_type
        checked_actor_action_count += 1
        denied_capabilities = [
            capability
            for capability in snapshot.capabilities.values()
            if capability.character_id == actor_id
            and capability.action_type == action_type
            and not capability.allowed
            and capability.valid_until_event_id is None
        ]
        for capability in denied_capabilities:
            _append_issue_and_finding(
                issues,
                findings,
                ValidationIssue("capability_violation", "event violates persisted capability state", subject_id=event.event_id, field=f"capabilities.{capability.capability_id}"),
                missing_prerequisite_or_overwrite_point=f"capability:{capability.capability_id}",
                affected_state_field=f"capabilities.{capability.capability_id}",
                affected_subject=actor_id,
                replay_evidence_reference=f"event:{event.event_id}",
                recommended_regression_test="replay_regression::capability_denial_blocks_action",
            )
        if payload.get("requires_capability"):
            has_allowed_capability = any(
                capability.character_id == actor_id
                and capability.action_type == action_type
                and capability.allowed
                and capability.valid_until_event_id is None
                for capability in snapshot.capabilities.values()
            )
            if not has_allowed_capability:
                _append_issue_and_finding(
                    issues,
                    findings,
                    ValidationIssue("capability_violation", "event requires a capability absent from state", subject_id=event.event_id, field=action_type),
                    missing_prerequisite_or_overwrite_point=f"capability:{actor_id}:{action_type}",
                    affected_state_field="capabilities",
                    affected_subject=actor_id,
                    replay_evidence_reference=f"event:{event.event_id}",
                    recommended_regression_test="replay_regression::required_capability_must_exist",
                )
        required_rule_id = payload.get("required_rule_id") or payload.get("active_rule_id")
        if required_rule_id is not None:
            checked_rule_activation_count += 1
            rule = snapshot.world_rules.get(required_rule_id)
            if rule is None or rule.activation_status != "active":
                _append_issue_and_finding(
                    issues,
                    findings,
                    ValidationIssue("inactive_rule_use", "event depends on an inactive world rule", subject_id=event.event_id, field=f"world_rules.{required_rule_id}"),
                    missing_prerequisite_or_overwrite_point=f"rule:{required_rule_id}",
                    affected_state_field=f"world_rules.{required_rule_id}.activation_status",
                    affected_subject=required_rule_id,
                    replay_evidence_reference=f"event:{event.event_id}",
                    recommended_regression_test="replay_regression::inactive_world_rule_cannot_authorize_action",
                )
        belief_id = payload.get("belief_id")
        if belief_id is not None:
            belief = snapshot.beliefs.get(belief_id)
            if belief is None:
                _append_issue_and_finding(
                    issues,
                    findings,
                    ValidationIssue("belief_construction_gap", "event relies on belief absent from state", subject_id=event.event_id, field=f"beliefs.{belief_id}"),
                    missing_prerequisite_or_overwrite_point=f"belief:{belief_id}",
                    affected_state_field=f"beliefs.{belief_id}",
                    affected_subject=actor_id,
                    replay_evidence_reference=f"event:{event.event_id}",
                    recommended_regression_test="replay_regression::declared_belief_must_exist",
                )
            else:
                fact = snapshot.facts.get(belief.fact_id)
                if belief.contradicts_fact_id is not None or belief.belief_status == "false" or (fact is not None and fact.canonical_truth_status == "false"):
                    _append_issue_and_finding(
                        issues,
                        findings,
                        ValidationIssue("belief_conflict", "event follows a false or conflicting belief", subject_id=event.event_id, field=f"beliefs.{belief_id}"),
                        missing_prerequisite_or_overwrite_point=f"belief:{belief_id}",
                        affected_state_field=f"beliefs.{belief_id}",
                        affected_subject=belief.holder_character_id,
                        replay_evidence_reference=f"event:{event.event_id}",
                        recommended_regression_test="replay_regression::false_belief_is_not_visibility_leak",
                    )
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
                checked_visibility_decision_count += 1
                _append_issue_and_finding(
                    issues,
                    findings,
                    ValidationIssue("visibility_leak", "outcome relies on hidden knowledge", subject_id=event.event_id),
                    affected_state_field=f"events.{event.event_id}.knowledge_source",
                    affected_subject=event.event_id,
                    replay_evidence_reference=f"event:{event.event_id}",
                    recommended_regression_test="replay_regression::hidden_knowledge_blocked_in_outcome",
                )
            knowledge_fact_id = payload.get("knowledge_fact_id")
            if knowledge_fact_id is not None and actor_id not in {"narrator", "system"}:
                edge = next(
                    (
                        item
                        for item in snapshot.visibility_edges.values()
                        if item.fact_id == knowledge_fact_id and item.viewer_id == actor_id
                    ),
                    None,
                )
                if edge is not None:
                    checked_visibility_decision_count += 1
                    if edge.visibility_status != "visible":
                        _append_issue_and_finding(
                            issues,
                            findings,
                            ValidationIssue("visibility_leak", "outcome uses a fact outside actor visibility", subject_id=event.event_id, field=f"facts.{knowledge_fact_id}"),
                            missing_prerequisite_or_overwrite_point=f"fact:{knowledge_fact_id}",
                            affected_state_field=f"visibility_edges.{edge.visibility_edge_id}",
                            affected_subject=actor_id,
                            replay_evidence_reference=f"event:{event.event_id}",
                            recommended_regression_test="replay_regression::hidden_fact_edge_blocks_outcome",
                        )
            plot_thread_id = payload.get("plot_thread_id")
            if plot_thread_id is not None:
                checked_plot_obligation_count += 1
                if payload.get("resolves_plot_thread") == plot_thread_id:
                    resolution_events_by_thread.add(plot_thread_id)
                plot_thread = snapshot.plot_threads.get(plot_thread_id)
                if (
                    plot_thread is not None
                    and plot_thread.status in {"open", "active", "blocked"}
                    and payload.get("plot_obligation_due")
                    and not plot_thread.resolution_event_id
                    and payload.get("resolves_plot_thread") != plot_thread_id
                ):
                    _append_issue_and_finding(
                        issues,
                        findings,
                        ValidationIssue("plot_obligation_missed", "due plot obligation was not discharged", subject_id=event.event_id, field=f"plot_threads.{plot_thread_id}"),
                        missing_prerequisite_or_overwrite_point=f"plot_thread:{plot_thread_id}",
                        affected_state_field=f"plot_threads.{plot_thread_id}",
                        affected_subject=plot_thread_id,
                        replay_evidence_reference=f"event:{event.event_id}",
                        recommended_regression_test="replay_regression::plot_obligation_requires_payoff",
                    )
        if event.event_type == "add_memory":
            memory_id = payload.get("memory_id")
            if memory_id:
                known_memories.add(memory_id)

    for thread in snapshot.plot_threads.values():
        if thread.status not in {"open", "active", "blocked"} or not thread.required_payoff_by:
            continue
        if thread.required_payoff_by not in known_events or thread.thread_id in resolution_events_by_thread:
            continue
        checked_plot_obligation_count += 1
        _append_issue_and_finding(
            issues,
            findings,
            ValidationIssue("plot_obligation_missed", "plot obligation reached its payoff boundary without resolution", subject_id=thread.required_payoff_by, field=f"plot_threads.{thread.thread_id}"),
            missing_prerequisite_or_overwrite_point=f"plot_thread:{thread.thread_id}",
            affected_state_field=f"plot_threads.{thread.thread_id}.resolution_event_id",
            affected_subject=thread.thread_id,
            replay_evidence_reference=f"event:{thread.required_payoff_by}",
            recommended_regression_test="replay_regression::plot_obligation_deadline_requires_resolution",
        )

    return CausalValidationResult(
        ok=not issues,
        issues=tuple(issues),
        findings=tuple(findings),
        checked_outcome_count=checked_outcome_count,
        covered_outcome_count=covered_outcome_count,
        checked_rule_change_count=checked_rule_change_count,
        drift_rule_change_count=drift_rule_change_count,
        checked_visibility_decision_count=checked_visibility_decision_count,
        checked_actor_action_count=checked_actor_action_count,
        checked_plot_obligation_count=checked_plot_obligation_count,
        checked_rule_activation_count=checked_rule_activation_count,
    )
