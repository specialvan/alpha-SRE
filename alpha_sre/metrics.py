from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from .causal_validation import CausalValidationResult
from .incident import IncidentReport
from .replay import ReplayResult

if TYPE_CHECKING:
    from .gate import GateResult
    from .integration import ReleaseAttemptRecord
    from .review import NarrativeQualityReviewRecord
    from .state import NarrativeSnapshot


@dataclass(frozen=True)
class MetricSummary:
    trace_completeness: float
    causality_break_rate: float
    visibility_leak_rate: float
    replay_availability: float
    causal_attribution_coverage: float = 1.0
    rule_drift_rate: float = 0.0
    write_back_success_rate: float = 1.0
    same_class_failure_rate: float = 0.0
    incident_recurrence_rate: float = 0.0
    replay_confirmed_regression_rate: float = 1.0
    version_lock_success_rate: float = 1.0
    alarm_trigger_rate: float = 0.0
    snapshot_freshness: float = 0.0
    write_back_omission_rate: float = 0.0
    memory_omission_rate: float = 0.0
    manual_rollback_rate: float = 0.0
    edit_amplitude: float = 0.0
    plot_inconsistency_rate: float = 0.0
    second_generation_rate: float = 0.0
    character_ooc_rate: float = 0.0
    world_rule_violation_rate: float = 0.0
    foreshadowing_payoff_rate: float = 1.0
    checked_outcome_count: int = 0
    checked_visibility_decision_count: int = 0
    checked_actor_action_count: int = 0
    checked_plot_obligation_count: int = 0
    checked_rule_activation_count: int = 0
    checked_post_state_surface_count: int = 0
    post_state_mismatch_rate: float = 0.0
    belief_conflict_rate: float = 0.0
    capability_violation_rate: float = 0.0
    plot_obligation_miss_rate: float = 0.0
    inactive_rule_use_rate: float = 0.0


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _compute_snapshot_freshness(
    snapshots: list["NarrativeSnapshot"] | None,
    current_time: str | None,
) -> float:
    current_timestamp = _parse_timestamp(current_time)
    if current_timestamp is None or not snapshots:
        return 0.0

    latest_valid_snapshot = None
    for snapshot in snapshots:
        if not snapshot.validate().ok:
            continue
        created_at = _parse_timestamp(snapshot.created_at)
        if created_at is None:
            continue
        if latest_valid_snapshot is None or created_at > latest_valid_snapshot:
            latest_valid_snapshot = created_at

    if latest_valid_snapshot is None:
        return 0.0
    return max((current_timestamp - latest_valid_snapshot).total_seconds(), 0.0)


def _estimate_surface_paths(snapshot: "NarrativeSnapshot") -> set[str]:
    surface_paths: set[str] = set()
    for character_id in snapshot.characters:
        surface_paths.add(f"characters.{character_id}.current_goal")
        surface_paths.add(f"characters.{character_id}.memory_references")
    for relationship_id in snapshot.relationships:
        surface_paths.add(f"relationships.{relationship_id}")
    for memory_id in snapshot.memories:
        surface_paths.add(f"memories.{memory_id}")
        surface_paths.add(f"memories.{memory_id}.visibility_scope")
    for constraint_id in snapshot.constraints:
        surface_paths.add(f"constraints.{constraint_id}")
    for rule_id in snapshot.world_rules:
        surface_paths.add(f"world_rules.{rule_id}")
    for intent_id in snapshot.chapter_intents:
        surface_paths.add(f"chapter_intents.{intent_id}")
    for fact_id in snapshot.facts:
        surface_paths.add(f"facts.{fact_id}")
    for belief_id in snapshot.beliefs:
        surface_paths.add(f"beliefs.{belief_id}")
    for thread_id in snapshot.plot_threads:
        surface_paths.add(f"plot_threads.{thread_id}")
    for capability_id in snapshot.capabilities:
        surface_paths.add(f"capabilities.{capability_id}")
    for edge_id in snapshot.visibility_edges:
        surface_paths.add(f"visibility_edges.{edge_id}")
    return surface_paths


def _issue_subjects(
    replays: list[ReplayResult],
    validations: list[CausalValidationResult],
    code: str,
) -> set[str]:
    subjects: set[str] = set()
    for replay in replays:
        for issue in replay.issues:
            if issue.code == code:
                subjects.add(issue.subject_id or issue.field or code)
    for validation in validations:
        for issue in validation.issues:
            if issue.code == code:
                subjects.add(issue.subject_id or issue.field or code)
    return subjects


def _compute_edit_amplitude(replays: list[ReplayResult]) -> float:
    if not replays:
        return 0.0

    amplitudes: list[float] = []
    for replay in replays:
        touched_paths = set(replay.state_diff) | set(replay.constraint_diff) | set(replay.visibility_diff)
        if not touched_paths:
            amplitudes.append(0.0)
            continue
        surface_paths = _estimate_surface_paths(replay.state)
        surface_size = max(len(surface_paths), 1)
        amplitudes.append(min(len(touched_paths) / surface_size, 1.0))
    return sum(amplitudes) / len(amplitudes)


def compute_metrics(
    replays: list[ReplayResult],
    validations: list[CausalValidationResult],
    write_back_successes: list[bool] | None = None,
    incident_reports: list[IncidentReport] | None = None,
    gate_results: list["GateResult"] | None = None,
    snapshots: list["NarrativeSnapshot"] | None = None,
    current_time: str | None = None,
    release_attempts: list["ReleaseAttemptRecord"] | None = None,
    review_records: list["NarrativeQualityReviewRecord"] | None = None,
) -> MetricSummary:
    total = max(len(replays), 1)
    successful = sum(1 for r in replays if r.ok)
    trace = sum(1 for r in replays if "missing_events" not in r.diffs) / total
    total_checked_outcomes = sum(v.checked_outcome_count for v in validations)
    total_covered_outcomes = sum(v.covered_outcome_count for v in validations)
    total_checked_rule_changes = sum(v.checked_rule_change_count for v in validations)
    total_drift_rule_changes = sum(v.drift_rule_change_count for v in validations)
    replay_visibility_checks = sum(r.checked_visibility_decision_count for r in replays)
    validation_visibility_checks = sum(v.checked_visibility_decision_count for v in validations)
    checked_visibility_decisions = replay_visibility_checks or validation_visibility_checks
    replay_actor_action_checks = sum(r.checked_actor_action_count for r in replays)
    validation_actor_action_checks = sum(v.checked_actor_action_count for v in validations)
    checked_actor_actions = replay_actor_action_checks or validation_actor_action_checks
    replay_plot_obligation_checks = sum(r.checked_plot_obligation_count for r in replays)
    validation_plot_obligation_checks = sum(v.checked_plot_obligation_count for v in validations)
    checked_plot_obligations = replay_plot_obligation_checks or validation_plot_obligation_checks
    replay_rule_activation_checks = sum(r.checked_rule_activation_count for r in replays)
    validation_rule_activation_checks = sum(v.checked_rule_activation_count for v in validations)
    checked_rule_activations = replay_rule_activation_checks or validation_rule_activation_checks
    checked_post_state_surfaces = sum(r.checked_post_state_surface_count for r in replays)
    mismatched_post_state_surfaces = sum(r.mismatched_post_state_surface_count for r in replays)
    total_checked_write_backs = sum(r.checked_write_back_count for r in replays)
    total_omitted_write_backs = sum(r.omitted_write_back_count for r in replays)
    total_checked_memory_references = sum(r.checked_memory_reference_count for r in replays)
    total_omitted_memory_references = sum(r.omitted_memory_reference_count for r in replays)
    plot_inconsistent_outcomes = {
        finding.offending_event_id
        for validation in validations
        for finding in validation.findings
        if finding.affected_state_field is not None and finding.affected_state_field.endswith(".prerequisite_event_id")
    }
    causality_breaks = len(_issue_subjects(replays, validations, "missing_precondition"))
    visibility_leaks = len(_issue_subjects(replays, validations, "visibility_leak"))
    belief_conflicts = len(_issue_subjects(replays, validations, "belief_conflict"))
    capability_violations = len(_issue_subjects(replays, validations, "capability_violation"))
    plot_obligation_misses = len(_issue_subjects(replays, validations, "plot_obligation_missed"))
    inactive_rule_uses = len(_issue_subjects(replays, validations, "inactive_rule_use"))
    if write_back_successes is None:
        write_back_success_rate = 1.0
    else:
        total_write_backs = max(len(write_back_successes), 1)
        write_back_success_rate = sum(1 for item in write_back_successes if item) / total_write_backs
    if replays:
        version_lock_failures = 0
        for replay in replays:
            if any(
                issue.code.endswith("_mismatch")
                or issue.code in {
                    "missing_policy_version",
                    "missing_visibility_version",
                    "missing_schema_version",
                    "missing_prompt_version",
                    "missing_replay_operator_id",
                    "missing_replay_id",
                    "input_snapshot_mismatch",
                }
                for issue in replay.issues
            ):
                version_lock_failures += 1
        version_lock_success_rate = (len(replays) - version_lock_failures) / len(replays)
    else:
        version_lock_success_rate = 1.0
    if gate_results is None:
        alarm_trigger_rate = 0.0
    else:
        total_gate_checks = max(len(gate_results), 1)
        triggered = sum(1 for item in gate_results if item.blocking_issues or item.warnings)
        alarm_trigger_rate = triggered / total_gate_checks
    snapshot_freshness = _compute_snapshot_freshness(snapshots, current_time)
    write_back_omission_rate = (
        total_omitted_write_backs / total_checked_write_backs if total_checked_write_backs else 0.0
    )
    memory_omission_rate = (
        total_omitted_memory_references / total_checked_memory_references if total_checked_memory_references else 0.0
    )
    manual_rollback_rate = (
        sum(1 for attempt in release_attempts if attempt.manual_rollback_performed) / len(release_attempts)
        if release_attempts
        else 0.0
    )
    if release_attempts:
        primary_attempt_count = sum(1 for attempt in release_attempts if attempt.derived_from_attempt_id is None)
        follow_up_attempt_count = sum(1 for attempt in release_attempts if attempt.derived_from_attempt_id is not None)
        second_generation_rate = follow_up_attempt_count / primary_attempt_count if primary_attempt_count else 0.0
    else:
        second_generation_rate = 0.0
    if review_records:
        checked_segments = sum(item.checked_segment_count for item in review_records)
        ooc_incidents = sum(item.ooc_incident_count for item in review_records)
        checked_scenes = sum(item.checked_scene_count for item in review_records)
        world_rule_violations = sum(item.world_rule_violation_count for item in review_records)
        introduced_setup_items = sum(item.introduced_setup_item_count for item in review_records)
        resolved_setup_items = sum(item.resolved_setup_item_count for item in review_records)
        character_ooc_rate = ooc_incidents / checked_segments if checked_segments else 0.0
        world_rule_violation_rate = world_rule_violations / checked_scenes if checked_scenes else 0.0
        foreshadowing_payoff_rate = (
            resolved_setup_items / introduced_setup_items if introduced_setup_items else 1.0
        )
    else:
        character_ooc_rate = 0.0
        world_rule_violation_rate = 0.0
        foreshadowing_payoff_rate = 1.0
    edit_amplitude = _compute_edit_amplitude(replays)
    plot_inconsistency_rate = len(plot_inconsistent_outcomes) / total_checked_outcomes if total_checked_outcomes else 0.0
    if incident_reports is None:
        same_class_failure_rate = 0.0
        incident_recurrence_rate = 0.0
        replay_confirmed_regression_rate = 1.0
    else:
        classified_incidents = [item.suspected_failure_classification for item in incident_reports if item.suspected_failure_classification]
        if not classified_incidents:
            same_class_failure_rate = 0.0
        else:
            counts = Counter(classified_incidents)
            repeated = sum(1 for item in classified_incidents if counts[item] > 1)
            same_class_failure_rate = repeated / len(classified_incidents)
        incident_recurrence_rate = (
            sum(1 for item in incident_reports if item.recurred_from_prior_incident) / len(incident_reports)
            if incident_reports
            else 0.0
        )
        regression_reports = [item for item in incident_reports if item.is_regression]
        replay_confirmed_regression_rate = (
            sum(1 for item in regression_reports if item.replay_confirmed_regression) / len(regression_reports)
            if regression_reports
            else 1.0
        )
    return MetricSummary(
        trace_completeness=trace,
        causality_break_rate=causality_breaks / total_checked_outcomes if total_checked_outcomes else 0.0,
        visibility_leak_rate=visibility_leaks / checked_visibility_decisions if checked_visibility_decisions else 0.0,
        replay_availability=successful / total,
        causal_attribution_coverage=1.0 if total_checked_outcomes == 0 else total_covered_outcomes / total_checked_outcomes,
        rule_drift_rate=0.0 if total_checked_rule_changes == 0 else total_drift_rule_changes / total_checked_rule_changes,
        write_back_success_rate=write_back_success_rate,
        same_class_failure_rate=same_class_failure_rate,
        incident_recurrence_rate=incident_recurrence_rate,
        replay_confirmed_regression_rate=replay_confirmed_regression_rate,
        version_lock_success_rate=version_lock_success_rate,
        alarm_trigger_rate=alarm_trigger_rate,
        snapshot_freshness=snapshot_freshness,
        write_back_omission_rate=write_back_omission_rate,
        memory_omission_rate=memory_omission_rate,
        manual_rollback_rate=manual_rollback_rate,
        edit_amplitude=edit_amplitude,
        plot_inconsistency_rate=plot_inconsistency_rate,
        second_generation_rate=second_generation_rate,
        character_ooc_rate=character_ooc_rate,
        world_rule_violation_rate=world_rule_violation_rate,
        foreshadowing_payoff_rate=foreshadowing_payoff_rate,
        checked_outcome_count=total_checked_outcomes,
        checked_visibility_decision_count=checked_visibility_decisions,
        checked_actor_action_count=checked_actor_actions,
        checked_plot_obligation_count=checked_plot_obligations,
        checked_rule_activation_count=checked_rule_activations,
        checked_post_state_surface_count=checked_post_state_surfaces,
        post_state_mismatch_rate=(
            mismatched_post_state_surfaces / checked_post_state_surfaces if checked_post_state_surfaces else 0.0
        ),
        belief_conflict_rate=belief_conflicts / checked_actor_actions if checked_actor_actions else 0.0,
        capability_violation_rate=capability_violations / checked_actor_actions if checked_actor_actions else 0.0,
        plot_obligation_miss_rate=plot_obligation_misses / checked_plot_obligations if checked_plot_obligations else 0.0,
        inactive_rule_use_rate=inactive_rule_uses / checked_rule_activations if checked_rule_activations else 0.0,
    )
