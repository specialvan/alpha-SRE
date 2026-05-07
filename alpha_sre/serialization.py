from __future__ import annotations

from dataclasses import asdict
from enum import Enum
from typing import Any, TypeVar


def _normalize(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {k: _normalize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize(v) for v in value]
    if hasattr(value, "__dataclass_fields__"):
        return _normalize(asdict(value))
    return value


T = TypeVar("T")


def to_jsonable(value: T) -> T:
    return _normalize(value)


def validation_issue_from_dict(data: dict[str, Any]):
    from .validation import ValidationIssue

    return ValidationIssue(**data)


def validation_result_from_dict(data: dict[str, Any]):
    from .validation import ValidationResult

    issues = tuple(validation_issue_from_dict(item) for item in data.get("issues", ()))
    return ValidationResult(bool(data.get("ok", False)), issues)


def character_state_from_dict(data: dict[str, Any]):
    from .state import CharacterState, VisibilityScope

    return CharacterState(
        character_id=data["character_id"],
        role_name=data["role_name"],
        current_goal=data["current_goal"],
        emotional_state=data["emotional_state"],
        relationship_links=list(data.get("relationship_links", [])),
        active_constraints=list(data.get("active_constraints", [])),
        memory_references=list(data.get("memory_references", [])),
        belief_ids=list(data.get("belief_ids", [])),
        capability_ids=list(data.get("capability_ids", [])),
        current_location=data.get("current_location"),
        present_with_character_ids=list(data.get("present_with_character_ids", [])),
        knowledge_scope=VisibilityScope(data.get("knowledge_scope", VisibilityScope.CHARACTER_LOCAL.value)),
        schema_version=data.get("schema_version", "1.0"),
    )


def relationship_state_from_dict(data: dict[str, Any]):
    from .state import RelationshipState, VisibilityScope

    return RelationshipState(
        subject_character_id=data["subject_character_id"],
        object_character_id=data["object_character_id"],
        relation_type=data["relation_type"],
        trust_value=float(data["trust_value"]),
        last_updated_event_id=data.get("last_updated_event_id"),
        visibility_scope=VisibilityScope(data.get("visibility_scope", VisibilityScope.SYSTEM_VISIBLE.value)),
        schema_version=data.get("schema_version", "1.0"),
    )


def memory_state_from_dict(data: dict[str, Any]):
    from .state import MemoryState, VisibilityScope

    return MemoryState(
        memory_id=data["memory_id"],
        owning_character_id=data["owning_character_id"],
        memory_claim=data["memory_claim"],
        confidence_level=float(data["confidence_level"]),
        source_event_id=data.get("source_event_id"),
        retention_status=data.get("retention_status", "active"),
        visibility_scope=VisibilityScope(data.get("visibility_scope", VisibilityScope.CHARACTER_LOCAL.value)),
        schema_version=data.get("schema_version", "1.0"),
    )


def constraint_state_from_dict(data: dict[str, Any]):
    from .state import ConstraintState

    return ConstraintState(
        constraint_id=data["constraint_id"],
        constraint_text=data["constraint_text"],
        authority_source=data["authority_source"],
        affected_actors=list(data.get("affected_actors", [])),
        enforcement_mode=data.get("enforcement_mode", "hard"),
        violation_history=list(data.get("violation_history", [])),
        schema_version=data.get("schema_version", "1.0"),
    )


def world_rule_state_from_dict(data: dict[str, Any]):
    from .state import WorldRuleState

    return WorldRuleState(
        rule_id=data["rule_id"],
        rule_text=data["rule_text"],
        domain=data["domain"],
        enforcement_strength=data["enforcement_strength"],
        allowed_exceptions=list(data.get("allowed_exceptions", [])),
        provenance_source=data.get("provenance_source", ""),
        activation_status=data.get("activation_status", "active"),
        active_from_event_id=data.get("active_from_event_id"),
        authority_mode=data.get("authority_mode", "canonical"),
        schema_version=data.get("schema_version", "1.0"),
    )


def chapter_intent_state_from_dict(data: dict[str, Any]):
    from .state import ChapterIntentState

    return ChapterIntentState(
        intent_id=data["intent_id"],
        scene_target=data["scene_target"],
        desired_narrative_effect=data["desired_narrative_effect"],
        required_preconditions=list(data.get("required_preconditions", [])),
        forbidden_outcomes=list(data.get("forbidden_outcomes", [])),
        schema_version=data.get("schema_version", "1.0"),
    )


def fact_state_from_dict(data: dict[str, Any]):
    from .state import FactState

    return FactState(
        fact_id=data["fact_id"],
        fact_text=data["fact_text"],
        fact_type=data["fact_type"],
        introduced_by_event_id=data.get("introduced_by_event_id"),
        valid_from_event_id=data.get("valid_from_event_id"),
        valid_until_event_id=data.get("valid_until_event_id"),
        canonical_truth_status=data["canonical_truth_status"],
        related_character_ids=list(data.get("related_character_ids", [])),
        related_rule_ids=list(data.get("related_rule_ids", [])),
        schema_version=data.get("schema_version", "1.0"),
    )


def belief_state_from_dict(data: dict[str, Any]):
    from .state import BeliefState

    return BeliefState(
        belief_id=data["belief_id"],
        holder_character_id=data["holder_character_id"],
        fact_id=data["fact_id"],
        belief_status=data["belief_status"],
        confidence=float(data["confidence"]),
        derived_from_event_id=data.get("derived_from_event_id"),
        derived_from_memory_ids=list(data.get("derived_from_memory_ids", [])),
        contradicts_fact_id=data.get("contradicts_fact_id"),
        schema_version=data.get("schema_version", "1.0"),
    )


def plot_thread_state_from_dict(data: dict[str, Any]):
    from .state import PlotThreadState

    return PlotThreadState(
        thread_id=data["thread_id"],
        thread_type=data["thread_type"],
        status=data["status"],
        introduced_by_event_id=data.get("introduced_by_event_id"),
        required_payoff_by=data.get("required_payoff_by"),
        blocking_event_ids=list(data.get("blocking_event_ids", [])),
        resolution_event_id=data.get("resolution_event_id"),
        affected_characters=list(data.get("affected_characters", [])),
        schema_version=data.get("schema_version", "1.0"),
    )


def capability_state_from_dict(data: dict[str, Any]):
    from .state import CapabilityState

    return CapabilityState(
        capability_id=data["capability_id"],
        character_id=data["character_id"],
        action_type=data["action_type"],
        allowed=bool(data["allowed"]),
        source_rule_id=data.get("source_rule_id"),
        source_constraint_id=data.get("source_constraint_id"),
        valid_from_event_id=data.get("valid_from_event_id"),
        valid_until_event_id=data.get("valid_until_event_id"),
        schema_version=data.get("schema_version", "1.0"),
    )


def visibility_edge_state_from_dict(data: dict[str, Any]):
    from .state import VisibilityEdgeState

    return VisibilityEdgeState(
        visibility_edge_id=data["visibility_edge_id"],
        fact_id=data["fact_id"],
        viewer_id=data["viewer_id"],
        visibility_status=data["visibility_status"],
        visibility_source=data["visibility_source"],
        valid_from_event_id=data.get("valid_from_event_id"),
        valid_until_event_id=data.get("valid_until_event_id"),
        schema_version=data.get("schema_version", "1.0"),
    )


def snapshot_from_dict(data: dict[str, Any]):
    from .state import NarrativeSnapshot

    return NarrativeSnapshot(
        snapshot_id=data["snapshot_id"],
        state_identity=data["state_identity"],
        schema_version=data.get("schema_version", "1.0"),
        policy_version=data["policy_version"],
        visibility_version=data["visibility_version"],
        created_at=data["created_at"],
        characters={key: character_state_from_dict(value) for key, value in data.get("characters", {}).items()},
        relationships={key: relationship_state_from_dict(value) for key, value in data.get("relationships", {}).items()},
        memories={key: memory_state_from_dict(value) for key, value in data.get("memories", {}).items()},
        constraints={key: constraint_state_from_dict(value) for key, value in data.get("constraints", {}).items()},
        world_rules={key: world_rule_state_from_dict(value) for key, value in data.get("world_rules", {}).items()},
        chapter_intents={key: chapter_intent_state_from_dict(value) for key, value in data.get("chapter_intents", {}).items()},
        facts={key: fact_state_from_dict(value) for key, value in data.get("facts", {}).items()},
        beliefs={key: belief_state_from_dict(value) for key, value in data.get("beliefs", {}).items()},
        plot_threads={key: plot_thread_state_from_dict(value) for key, value in data.get("plot_threads", {}).items()},
        capabilities={key: capability_state_from_dict(value) for key, value in data.get("capabilities", {}).items()},
        visibility_edges={key: visibility_edge_state_from_dict(value) for key, value in data.get("visibility_edges", {}).items()},
    )


def command_from_dict(data: dict[str, Any]):
    from .events import Command

    return Command(
        command_id=data["command_id"],
        command_type=data["command_type"],
        operator_id=data["operator_id"],
        requested_scope=data["requested_scope"],
        policy_version=data["policy_version"],
        created_at=data["created_at"],
    )


def _event_payload_from_dict(event_type: str, data: dict[str, Any]) -> dict[str, Any]:
    from .state import VisibilityScope

    payload = dict(data)
    if "visibility_scope" in payload and isinstance(payload["visibility_scope"], str):
        payload["visibility_scope"] = VisibilityScope(payload["visibility_scope"])
    if event_type == "add_memory" and isinstance(payload.get("memory"), dict):
        payload["memory"] = memory_state_from_dict(payload["memory"])
    if event_type == "world_rule_update" and isinstance(payload.get("world_rule"), dict):
        payload["world_rule"] = world_rule_state_from_dict(payload["world_rule"])
    return payload


def event_from_dict(data: dict[str, Any]):
    from .events import Event
    from .state import VisibilityScope

    return Event(
        event_id=data["event_id"],
        parent_command_id=data["parent_command_id"],
        event_type=data["event_type"],
        causal_order_index=int(data["causal_order_index"]),
        emitted_at=data["emitted_at"],
        producer_version=data["producer_version"],
        payload=_event_payload_from_dict(data["event_type"], data.get("payload", {})),
        visibility_scope=VisibilityScope(data.get("visibility_scope", VisibilityScope.SYSTEM_VISIBLE.value)),
    )


def causal_finding_from_dict(data: dict[str, Any]):
    from .causal_validation import CausalFinding

    return CausalFinding(
        failure_class=data["failure_class"],
        offending_event_id=data["offending_event_id"],
        missing_prerequisite_or_overwrite_point=data.get("missing_prerequisite_or_overwrite_point"),
        affected_state_field=data.get("affected_state_field"),
        affected_subject=data.get("affected_subject"),
        replay_evidence_reference=data.get("replay_evidence_reference"),
        recommended_regression_test=data.get("recommended_regression_test"),
    )


def incident_action_item_from_dict(data: dict[str, Any]):
    from .incident import IncidentActionItem

    return IncidentActionItem(
        action=data["action"],
        owner=data["owner"],
        layer=data["layer"],
        due_date=data.get("due_date"),
        status=data.get("status", "open"),
    )


def incident_report_from_dict(data: dict[str, Any]):
    from .incident import IncidentReport

    return IncidentReport(
        incident_id=data["incident_id"],
        title=data["title"],
        severity=data["severity"],
        status=data["status"],
        date_opened=data["date_opened"],
        incident_owner=data["incident_owner"],
        affected_workflow=data.get("affected_workflow", ""),
        observable_failure=data.get("observable_failure", ""),
        scope_of_impact=data.get("scope_of_impact", ""),
        detection_source=data.get("detection_source", ""),
        triggering_command_id=data.get("triggering_command_id"),
        suspected_failure_classification=data.get("suspected_failure_classification"),
        rollback_triggered=data.get("rollback_triggered"),
        gate_bypass_involved=data.get("gate_bypass_involved"),
        replay_session_id=data.get("replay_session_id"),
        locked_command_id=data.get("locked_command_id"),
        locked_event_chain_reference=data.get("locked_event_chain_reference"),
        pre_state_snapshot_id=data.get("pre_state_snapshot_id"),
        post_state_snapshot_id=data.get("post_state_snapshot_id"),
        policy_version=data.get("policy_version"),
        replay_result_summary=data.get("replay_result_summary", ""),
        state_identity=data.get("state_identity"),
        snapshot_schema_version=data.get("snapshot_schema_version"),
        contract_version_reference=data.get("contract_version_reference"),
        detected_state_drift=tuple(data.get("detected_state_drift", ())),
        detected_contract_mismatch=tuple(data.get("detected_contract_mismatch", ())),
        missing_mechanism=data.get("missing_mechanism"),
        existing_control_gap=data.get("existing_control_gap"),
        owning_spec=data.get("owning_spec"),
        temporary_workaround=data.get("temporary_workaround"),
        primary_cause=data.get("primary_cause", ""),
        contributing_causes=tuple(data.get("contributing_causes", ())),
        validation_escape_reason=data.get("validation_escape_reason", ""),
        immediate_mitigation=data.get("immediate_mitigation", ""),
        rollback_trigger=data.get("rollback_trigger", ""),
        rollback_action_taken=data.get("rollback_action_taken", ""),
        residual_risk=data.get("residual_risk", ""),
        required_regression_test=data.get("required_regression_test"),
        known_failure_class_covered=data.get("known_failure_class_covered"),
        recurred_from_prior_incident=data.get("recurred_from_prior_incident"),
        is_regression=data.get("is_regression"),
        replay_confirmed_regression=data.get("replay_confirmed_regression"),
        evidence_location=data.get("evidence_location"),
        pass_criteria_for_closure=data.get("pass_criteria_for_closure", ""),
        evidence_references=tuple(data.get("evidence_references", ())),
        action_items=tuple(incident_action_item_from_dict(item) for item in data.get("action_items", ())),
        artifact_version=data.get("artifact_version", "1.0"),
    )


def release_attempt_record_from_dict(data: dict[str, Any]):
    from .integration import ReleaseAttemptRecord

    return ReleaseAttemptRecord(
        attempt_id=data["attempt_id"],
        triggering_command_id=data["triggering_command_id"],
        started_at=data["started_at"],
        source_snapshot_id=data["source_snapshot_id"],
        source_system=data["source_system"],
        actor=data["actor"],
        write_back_ok=bool(data.get("write_back_ok", False)),
        gate_allowed=bool(data.get("gate_allowed", False)),
        drift_detected=bool(data.get("drift_detected", False)),
        manual_rollback_performed=bool(data.get("manual_rollback_performed", False)),
        rollback_reason=data.get("rollback_reason", ""),
        incident_id=data.get("incident_id"),
        derived_from_attempt_id=data.get("derived_from_attempt_id"),
        contract_version=data.get("contract_version", "1.0"),
    )


def narrative_quality_review_record_from_dict(data: dict[str, Any]):
    from .review import NarrativeQualityReviewRecord

    return NarrativeQualityReviewRecord(
        review_id=data["review_id"],
        source_artifact_reference=data["source_artifact_reference"],
        checked_segment_count=int(data.get("checked_segment_count", 0)),
        ooc_incident_count=int(data.get("ooc_incident_count", 0)),
        checked_scene_count=int(data.get("checked_scene_count", 0)),
        world_rule_violation_count=int(data.get("world_rule_violation_count", 0)),
        introduced_setup_item_count=int(data.get("introduced_setup_item_count", 0)),
        resolved_setup_item_count=int(data.get("resolved_setup_item_count", 0)),
        evidence_references=tuple(data.get("evidence_references", ())),
        contract_version=data.get("contract_version", "1.0"),
    )


def observation_frame_from_dict(data: dict[str, Any]):
    from .replay import ObservationFrame

    return ObservationFrame(
        replay_id=data["replay_id"],
        at_causal_order_index=int(data.get("at_causal_order_index", 0)),
        pov_actor_id=data["pov_actor_id"],
        input_snapshot_id=data["input_snapshot_id"],
        visible_fact_ids=tuple(data.get("visible_fact_ids", ())),
        hidden_fact_ids=tuple(data.get("hidden_fact_ids", ())),
        believed_fact_ids=tuple(data.get("believed_fact_ids", ())),
        accessible_memory_ids=tuple(data.get("accessible_memory_ids", ())),
        allowed_event_types=tuple(data.get("allowed_event_types", ())),
        blocked_event_types=tuple(data.get("blocked_event_types", ())),
        active_world_rule_ids=tuple(data.get("active_world_rule_ids", ())),
        retrieval_context_hash=data.get("retrieval_context_hash", ""),
        prompt_context_hash=data.get("prompt_context_hash", ""),
        write_back_decision_trace_id=data.get("write_back_decision_trace_id"),
    )


def replay_session_from_dict(data: dict[str, Any]):
    from .replay import ReplaySession

    observation_frame = data.get("observation_frame")
    return ReplaySession(
        target_command=command_from_dict(data["target_command"]),
        ordered_event_chain=tuple(event_from_dict(item) for item in data.get("ordered_event_chain", ())),
        pre_state_snapshot=snapshot_from_dict(data["pre_state_snapshot"]),
        policy_version=data["policy_version"],
        prompt_version=data["prompt_version"],
        dependency_contract_versions=dict(data.get("dependency_contract_versions", {})),
        replay_operator_id=data.get("replay_operator_id", ""),
        visibility_snapshot_version=data.get("visibility_snapshot_version", ""),
        narrative_state_schema_version=data.get("narrative_state_schema_version", ""),
        observation_frame=observation_frame_from_dict(observation_frame) if observation_frame is not None else None,
        evidence_references=tuple(data.get("evidence_references", ())),
        post_state_snapshot=snapshot_from_dict(data["post_state_snapshot"]) if data.get("post_state_snapshot") is not None else None,
    )


def causal_validation_result_from_dict(data: dict[str, Any]):
    from .causal_validation import CausalValidationResult

    issues = tuple(validation_issue_from_dict(item) for item in data.get("issues", ()))
    findings = tuple(causal_finding_from_dict(item) for item in data.get("findings", ()))
    return CausalValidationResult(
        bool(data.get("ok", False)),
        issues,
        findings,
        int(data.get("checked_outcome_count", 0)),
        int(data.get("covered_outcome_count", 0)),
        int(data.get("checked_rule_change_count", 0)),
        int(data.get("drift_rule_change_count", 0)),
        int(data.get("checked_visibility_decision_count", 0)),
        int(data.get("checked_actor_action_count", 0)),
        int(data.get("checked_plot_obligation_count", 0)),
        int(data.get("checked_rule_activation_count", 0)),
        int(data.get("checked_post_state_surface_count", 0)),
    )


def replay_result_from_dict(data: dict[str, Any]):
    from .replay import ReplayResult

    state = snapshot_from_dict(data["state"])
    causal_validation = (
        causal_validation_result_from_dict(data["causal_validation"])
        if data.get("causal_validation") is not None
        else None
    )
    issues = tuple(validation_issue_from_dict(item) for item in data.get("issues", ()))
    applied_event_ids = tuple(data.get("applied_event_ids", ()))
    diffs = list(data.get("diffs", []))
    return ReplayResult(
        ok=bool(data.get("ok", False)),
        state=state,
        diffs=diffs,
        state_diff=tuple(data.get("state_diff", ())),
        constraint_diff=tuple(data.get("constraint_diff", ())),
        visibility_diff=tuple(data.get("visibility_diff", ())),
        causal_chain_diff=tuple(data.get("causal_chain_diff", ())),
        causal_validation=causal_validation,
        issues=issues,
        applied_event_ids=applied_event_ids,
        failure_classification=data.get("failure_classification"),
        missing_mechanism_candidates=tuple(data.get("missing_mechanism_candidates", ())),
        evidence_references=tuple(data.get("evidence_references", ())),
        checked_write_back_count=int(data.get("checked_write_back_count", 0)),
        omitted_write_back_count=int(data.get("omitted_write_back_count", 0)),
        write_back_omission_diff=tuple(data.get("write_back_omission_diff", ())),
        checked_memory_reference_count=int(data.get("checked_memory_reference_count", 0)),
        omitted_memory_reference_count=int(data.get("omitted_memory_reference_count", 0)),
        memory_omission_diff=tuple(data.get("memory_omission_diff", ())),
        checked_visibility_decision_count=int(data.get("checked_visibility_decision_count", 0)),
        checked_actor_action_count=int(data.get("checked_actor_action_count", 0)),
        checked_plot_obligation_count=int(data.get("checked_plot_obligation_count", 0)),
        checked_rule_activation_count=int(data.get("checked_rule_activation_count", 0)),
        checked_post_state_surface_count=int(data.get("checked_post_state_surface_count", 0)),
        mismatched_post_state_surface_count=int(data.get("mismatched_post_state_surface_count", 0)),
        post_state_diff=tuple(data.get("post_state_diff", ())),
    )


def gate_result_from_dict(data: dict[str, Any]):
    from .gate import GateResult

    return GateResult(
        allowed=bool(data.get("allowed", False)),
        blocking_issues=tuple(data.get("blocking_issues", ())),
        warnings=tuple(data.get("warnings", ())),
    )


def metric_summary_from_dict(data: dict[str, Any]):
    from .metrics import MetricSummary

    return MetricSummary(
        trace_completeness=float(data.get("trace_completeness", 0.0)),
        causality_break_rate=float(data.get("causality_break_rate", 0.0)),
        visibility_leak_rate=float(data.get("visibility_leak_rate", 0.0)),
        replay_availability=float(data.get("replay_availability", 0.0)),
        causal_attribution_coverage=float(data.get("causal_attribution_coverage", 1.0)),
        rule_drift_rate=float(data.get("rule_drift_rate", 0.0)),
        write_back_success_rate=float(data.get("write_back_success_rate", 1.0)),
        same_class_failure_rate=float(data.get("same_class_failure_rate", 0.0)),
        incident_recurrence_rate=float(data.get("incident_recurrence_rate", 0.0)),
        replay_confirmed_regression_rate=float(data.get("replay_confirmed_regression_rate", 1.0)),
        version_lock_success_rate=float(data.get("version_lock_success_rate", 1.0)),
        alarm_trigger_rate=float(data.get("alarm_trigger_rate", 0.0)),
        snapshot_freshness=float(data.get("snapshot_freshness", 0.0)),
        write_back_omission_rate=float(data.get("write_back_omission_rate", 0.0)),
        memory_omission_rate=float(data.get("memory_omission_rate", 0.0)),
        manual_rollback_rate=float(data.get("manual_rollback_rate", 0.0)),
        edit_amplitude=float(data.get("edit_amplitude", 0.0)),
        plot_inconsistency_rate=float(data.get("plot_inconsistency_rate", 0.0)),
        second_generation_rate=float(data.get("second_generation_rate", 0.0)),
        character_ooc_rate=float(data.get("character_ooc_rate", 0.0)),
        world_rule_violation_rate=float(data.get("world_rule_violation_rate", 0.0)),
        foreshadowing_payoff_rate=float(data.get("foreshadowing_payoff_rate", 1.0)),
        checked_outcome_count=int(data.get("checked_outcome_count", 0)),
        checked_visibility_decision_count=int(data.get("checked_visibility_decision_count", 0)),
        checked_actor_action_count=int(data.get("checked_actor_action_count", 0)),
        checked_plot_obligation_count=int(data.get("checked_plot_obligation_count", 0)),
        checked_rule_activation_count=int(data.get("checked_rule_activation_count", 0)),
        checked_post_state_surface_count=int(data.get("checked_post_state_surface_count", 0)),
        post_state_mismatch_rate=float(data.get("post_state_mismatch_rate", 0.0)),
        belief_conflict_rate=float(data.get("belief_conflict_rate", 0.0)),
        capability_violation_rate=float(data.get("capability_violation_rate", 0.0)),
        plot_obligation_miss_rate=float(data.get("plot_obligation_miss_rate", 0.0)),
        inactive_rule_use_rate=float(data.get("inactive_rule_use_rate", 0.0)),
    )
