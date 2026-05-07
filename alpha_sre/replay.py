from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import List

from .causal_validation import CausalValidationResult, validate_causality
from .events import Command, Event
from .serialization import to_jsonable
from .state import NarrativeSnapshot, RelationshipState, VisibilityScope
from .versioning import schema_versions_compatible
from .validation import ValidationIssue, ValidationResult


@dataclass(frozen=True)
class ObservationFrame:
    replay_id: str
    at_causal_order_index: int
    pov_actor_id: str
    input_snapshot_id: str
    visible_fact_ids: tuple[str, ...] = field(default_factory=tuple)
    hidden_fact_ids: tuple[str, ...] = field(default_factory=tuple)
    believed_fact_ids: tuple[str, ...] = field(default_factory=tuple)
    accessible_memory_ids: tuple[str, ...] = field(default_factory=tuple)
    allowed_event_types: tuple[str, ...] = field(default_factory=tuple)
    blocked_event_types: tuple[str, ...] = field(default_factory=tuple)
    active_world_rule_ids: tuple[str, ...] = field(default_factory=tuple)
    retrieval_context_hash: str = ""
    prompt_context_hash: str = ""
    write_back_decision_trace_id: str | None = None

    def validate(self, snapshot: NarrativeSnapshot) -> ValidationResult:
        issues = []
        if not self.replay_id:
            issues.append(ValidationIssue("missing_replay_id", "observation frame requires replay id"))
        if self.at_causal_order_index < 0:
            issues.append(ValidationIssue("invalid_observation_index", "observation frame causal order index must be non-negative", subject_id=self.replay_id))
        if not self.pov_actor_id:
            issues.append(ValidationIssue("missing_pov_actor_id", "observation frame requires POV actor", subject_id=self.replay_id))
        elif self.pov_actor_id not in snapshot.characters and self.pov_actor_id not in {"narrator", "system"}:
            issues.append(ValidationIssue("unknown_pov_actor", "observation frame POV actor is unknown", subject_id=self.pov_actor_id))
        if not self.input_snapshot_id:
            issues.append(ValidationIssue("missing_input_snapshot_id", "observation frame requires input snapshot id", subject_id=self.replay_id))
        elif self.input_snapshot_id != snapshot.snapshot_id:
            issues.append(ValidationIssue("input_snapshot_mismatch", "observation frame snapshot id does not match replay snapshot", subject_id=self.replay_id))
        if set(self.visible_fact_ids) & set(self.hidden_fact_ids):
            issues.append(ValidationIssue("visibility_scope_conflict", "the same fact cannot be both visible and hidden", subject_id=self.replay_id))
        if set(self.allowed_event_types) & set(self.blocked_event_types):
            issues.append(ValidationIssue("contradictory_action_window", "an event type cannot be both allowed and blocked", subject_id=self.replay_id))
        if snapshot.facts:
            for fact_id in self.visible_fact_ids + self.hidden_fact_ids + self.believed_fact_ids:
                if fact_id not in snapshot.facts:
                    issues.append(ValidationIssue("unknown_observation_fact", "observation frame references an unknown fact", subject_id=self.replay_id, field=fact_id))
        for rule_id in self.active_world_rule_ids:
            if rule_id not in snapshot.world_rules:
                issues.append(ValidationIssue("unknown_observation_rule", "observation frame references an unknown world rule", subject_id=self.replay_id, field=rule_id))
        for edge in snapshot.visibility_edges.values():
            if edge.viewer_id != self.pov_actor_id:
                continue
            if edge.visibility_status == "visible" and edge.fact_id in self.hidden_fact_ids:
                issues.append(ValidationIssue("visibility_graph_mismatch", "observation frame hides a fact visible in the persisted visibility graph", subject_id=self.replay_id, field=edge.fact_id))
            if edge.visibility_status in {"hidden", "narrator_only", "system_only"} and edge.fact_id in self.visible_fact_ids:
                issues.append(ValidationIssue("visibility_graph_mismatch", "observation frame exposes a fact hidden in the persisted visibility graph", subject_id=self.replay_id, field=edge.fact_id))
        if self.pov_actor_id in snapshot.characters:
            for capability in snapshot.capabilities.values():
                if capability.character_id != self.pov_actor_id:
                    continue
                if capability.allowed and capability.action_type in self.blocked_event_types:
                    issues.append(ValidationIssue("capability_window_mismatch", "observation frame blocks an action allowed by persisted capability state", subject_id=self.replay_id, field=capability.action_type))
                if not capability.allowed and capability.action_type in self.allowed_event_types:
                    issues.append(ValidationIssue("capability_window_mismatch", "observation frame allows an action denied by persisted capability state", subject_id=self.replay_id, field=capability.action_type))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class ReplaySession:
    target_command: Command
    ordered_event_chain: tuple[Event, ...]
    pre_state_snapshot: NarrativeSnapshot
    policy_version: str
    prompt_version: str
    dependency_contract_versions: dict[str, str] = field(default_factory=dict)
    replay_operator_id: str = ""
    visibility_snapshot_version: str = ""
    narrative_state_schema_version: str = ""
    observation_frame: ObservationFrame | None = None
    evidence_references: tuple[str, ...] = field(default_factory=tuple)
    post_state_snapshot: NarrativeSnapshot | None = None

    def validate(self) -> ValidationResult:
        issues = []
        if not self.policy_version:
            issues.append(ValidationIssue("missing_policy_version", "replay session requires policy version", subject_id=self.target_command.command_id))
        elif self.policy_version != self.target_command.policy_version or self.policy_version != self.pre_state_snapshot.policy_version:
            issues.append(ValidationIssue("policy_version_mismatch", "replay session policy version does not match locked artifacts", subject_id=self.target_command.command_id))
        if not self.prompt_version:
            issues.append(ValidationIssue("missing_prompt_version", "replay session requires prompt version", subject_id=self.target_command.command_id))
        if not self.replay_operator_id:
            issues.append(ValidationIssue("missing_replay_operator_id", "replay session requires replay operator id", subject_id=self.target_command.command_id))
        if not self.visibility_snapshot_version:
            issues.append(ValidationIssue("missing_visibility_version", "replay session requires visibility snapshot version", subject_id=self.target_command.command_id))
        elif self.visibility_snapshot_version != self.pre_state_snapshot.visibility_version:
            issues.append(ValidationIssue("visibility_version_mismatch", "replay session visibility version does not match locked snapshot", subject_id=self.target_command.command_id))
        if not self.narrative_state_schema_version:
            issues.append(ValidationIssue("missing_schema_version", "replay session requires narrative state schema version", subject_id=self.target_command.command_id))
        elif not schema_versions_compatible(self.narrative_state_schema_version, self.pre_state_snapshot.schema_version):
            issues.append(ValidationIssue("schema_version_mismatch", "replay session schema version is not compatible with locked snapshot", subject_id=self.target_command.command_id))
        if not self.ordered_event_chain:
            issues.append(ValidationIssue("missing_events", "replay session requires an ordered event chain", subject_id=self.target_command.command_id))
        if self.observation_frame is not None:
            issues.extend(self.observation_frame.validate(self.pre_state_snapshot).issues)
        if self.post_state_snapshot is not None and self.post_state_snapshot.state_identity != self.pre_state_snapshot.state_identity:
            issues.append(ValidationIssue("state_identity_mismatch", "replay session post-state must stay on the same logical state lineage", subject_id=self.target_command.command_id))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class ReplayResult:
    ok: bool
    state: NarrativeSnapshot
    diffs: List[str] = field(default_factory=list)
    state_diff: tuple[str, ...] = field(default_factory=tuple)
    constraint_diff: tuple[str, ...] = field(default_factory=tuple)
    visibility_diff: tuple[str, ...] = field(default_factory=tuple)
    causal_chain_diff: tuple[str, ...] = field(default_factory=tuple)
    causal_validation: CausalValidationResult | None = None
    issues: tuple[ValidationIssue, ...] = field(default_factory=tuple)
    applied_event_ids: tuple[str, ...] = field(default_factory=tuple)
    failure_classification: str | None = None
    missing_mechanism_candidates: tuple[str, ...] = field(default_factory=tuple)
    evidence_references: tuple[str, ...] = field(default_factory=tuple)
    checked_write_back_count: int = 0
    omitted_write_back_count: int = 0
    write_back_omission_diff: tuple[str, ...] = field(default_factory=tuple)
    checked_memory_reference_count: int = 0
    omitted_memory_reference_count: int = 0
    memory_omission_diff: tuple[str, ...] = field(default_factory=tuple)
    checked_visibility_decision_count: int = 0
    checked_actor_action_count: int = 0
    checked_plot_obligation_count: int = 0
    checked_rule_activation_count: int = 0
    checked_post_state_surface_count: int = 0
    mismatched_post_state_surface_count: int = 0
    post_state_diff: tuple[str, ...] = field(default_factory=tuple)


def _dedupe_issues(issues: list[ValidationIssue]) -> list[ValidationIssue]:
    seen = set()
    deduped = []
    for issue in issues:
        key = (issue.code, issue.message, issue.subject_id, issue.field)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(issue)
    return deduped


def _build_evidence_references(
    command: Command,
    snapshot: NarrativeSnapshot,
    events: list[Event],
    observation_frame: ObservationFrame | None,
    provided: tuple[str, ...],
) -> list[str]:
    references = list(provided)
    references.append(f"command:{command.command_id}")
    references.append(f"snapshot:{snapshot.snapshot_id}")
    for event in events:
        references.append(f"event:{event.event_id}")
    if observation_frame is not None:
        references.append(f"replay:{observation_frame.replay_id}")
        references.append(f"pov:{observation_frame.pov_actor_id}")
        if observation_frame.write_back_decision_trace_id:
            references.append(f"trace:{observation_frame.write_back_decision_trace_id}")
        if observation_frame.retrieval_context_hash:
            references.append(f"retrieval:{observation_frame.retrieval_context_hash}")
        if observation_frame.prompt_context_hash:
            references.append(f"prompt:{observation_frame.prompt_context_hash}")
    return list(dict.fromkeys(references))


def _is_privileged_pov(pov_actor_id: str | None) -> bool:
    return pov_actor_id in {"narrator", "system"}


def _visibility_status_for(snapshot: NarrativeSnapshot, fact_id: str, viewer_id: str | None) -> str | None:
    if viewer_id is None:
        return None
    for edge in snapshot.visibility_edges.values():
        if edge.fact_id == fact_id and edge.viewer_id == viewer_id:
            return edge.visibility_status
    return None


def _is_fact_visible_to_frame(snapshot: NarrativeSnapshot, fact_id: str, observation_frame: ObservationFrame | None) -> bool:
    if observation_frame is None or _is_privileged_pov(observation_frame.pov_actor_id):
        return True
    if fact_id in observation_frame.hidden_fact_ids:
        return False
    if fact_id in observation_frame.visible_fact_ids:
        return True
    status = _visibility_status_for(snapshot, fact_id, observation_frame.pov_actor_id)
    if status is None:
        return not snapshot.visibility_edges
    return status == "visible"


def _actor_for_event(event, observation_frame: ObservationFrame | None) -> str | None:
    return event.payload.get("actor_id") or event.payload.get("character_id") or (
        observation_frame.pov_actor_id if observation_frame is not None else None
    )


def _action_type_for_event(event) -> str:
    return event.payload.get("action_type") or event.event_type


def _has_allowed_capability(snapshot: NarrativeSnapshot, actor_id: str | None, action_type: str) -> bool:
    return any(
        capability.character_id == actor_id
        and capability.action_type == action_type
        and capability.allowed
        and capability.valid_until_event_id is None
        for capability in snapshot.capabilities.values()
    )


def _denied_capabilities(snapshot: NarrativeSnapshot, actor_id: str | None, action_type: str):
    return [
        capability
        for capability in snapshot.capabilities.values()
        if capability.character_id == actor_id
        and capability.action_type == action_type
        and not capability.allowed
        and capability.valid_until_event_id is None
    ]


def _diff_snapshot_values(expected, actual, path: str) -> tuple[int, list[str]]:
    if isinstance(expected, dict) and isinstance(actual, dict):
        checked = 0
        diffs: list[str] = []
        for key in sorted(set(expected) | set(actual)):
            child_path = f"{path}.{key}" if path else str(key)
            if key not in expected or key not in actual:
                checked += 1
                diffs.append(child_path)
                continue
            child_checked, child_diffs = _diff_snapshot_values(expected[key], actual[key], child_path)
            checked += child_checked
            diffs.extend(child_diffs)
        return checked, diffs
    if isinstance(expected, list) and isinstance(actual, list):
        return 1, [] if expected == actual else [path]
    return 1, [] if expected == actual else [path]


def _compare_post_state(expected: NarrativeSnapshot, actual: NarrativeSnapshot) -> tuple[int, tuple[str, ...]]:
    expected_data = to_jsonable(expected)
    actual_data = to_jsonable(actual)
    surface_keys = (
        "state_identity",
        "characters",
        "relationships",
        "memories",
        "constraints",
        "world_rules",
        "chapter_intents",
        "facts",
        "beliefs",
        "plot_threads",
        "capabilities",
        "visibility_edges",
    )
    checked = 0
    diffs: list[str] = []
    for key in surface_keys:
        child_checked, child_diffs = _diff_snapshot_values(expected_data.get(key), actual_data.get(key), key)
        checked += child_checked
        diffs.extend(child_diffs)
    return checked, tuple(dict.fromkeys(diffs))


def _classify_failure(issues: list[ValidationIssue]) -> str | None:
    codes = {issue.code for issue in issues}
    if not codes:
        return None
    if "post_state_mismatch" in codes:
        return "post_state_mismatch"
    if "visibility_leak" in codes:
        return "visibility_leak"
    if "belief_conflict" in codes:
        return "belief_conflict"
    if "capability_violation" in codes:
        return "capability_violation"
    if "inactive_rule_use" in codes:
        return "inactive_rule_use"
    if "plot_obligation_missed" in codes:
        return "plot_obligation_missed"
    if "policy_version_mismatch" in codes:
        return "policy_drift"
    if "state_identity_mismatch" in codes:
        return "state_drift"
    if any(_is_snapshot_contract_issue(code) for code in codes):
        return "contract_mismatch"
    if any(
        code in codes
        for code in {
            "schema_version_mismatch",
            "visibility_version_mismatch",
            "write_contract_mismatch",
            "replay_contract_mismatch",
            "missing_prompt_version",
            "missing_replay_operator_id",
            "missing_visibility_version",
            "missing_schema_version",
            "missing_replay_id",
            "missing_pov_actor_id",
            "unknown_pov_actor",
            "visibility_scope_conflict",
            "contradictory_action_window",
            "invalid_observation_index",
            "unknown_observation_fact",
            "unknown_observation_rule",
            "visibility_graph_mismatch",
            "capability_window_mismatch",
        }
    ):
        return "contract_mismatch"
    if any(code in codes for code in {"missing_events", "command_mismatch", "duplicate_event_id", "duplicate_causal_index", "input_snapshot_mismatch"}):
        return "input_mismatch"
    if any(
        code in codes
        for code in {
            "missing_precondition",
            "missing_state_write_back",
            "unsupported_event_type",
            "missing_character",
            "missing_current_goal",
            "invalid_memory_payload",
            "invalid_world_rule_payload",
            "impossible_action",
            "belief_construction_gap",
        }
    ):
        return "mechanism_missing"
    return "unknown"


def _missing_mechanism_candidates(issues: list[ValidationIssue]) -> tuple[str, ...]:
    candidates = []
    for issue in issues:
        if issue.code in {
            "missing_precondition",
            "missing_state_write_back",
            "unsupported_event_type",
            "missing_character",
            "missing_current_goal",
            "invalid_memory_payload",
            "invalid_world_rule_payload",
            "impossible_action",
            "belief_construction_gap",
        }:
            candidates.append(issue.code)
    return tuple(dict.fromkeys(candidates))


def _is_snapshot_contract_issue(code: str) -> bool:
    return code.startswith("dangling_") or code in {
        "missing_snapshot_id",
        "missing_state_identity",
        "memory_payload_id_mismatch",
        "world_rule_payload_id_mismatch",
    }


class ReplayEngine:
    def replay(
        self,
        command: Command,
        snapshot: NarrativeSnapshot,
        events: list[Event],
        observation_frame: ObservationFrame | None = None,
        evidence_references: tuple[str, ...] = (),
        preflight_issues: tuple[ValidationIssue, ...] = (),
    ) -> ReplayResult:
        issues: list[ValidationIssue] = list(preflight_issues)
        issues.extend(command.validate().issues)
        issues.extend(snapshot.validate().issues)
        collected_evidence = _build_evidence_references(command, snapshot, events, observation_frame, evidence_references)
        if command.policy_version != snapshot.policy_version:
            issues.append(ValidationIssue("policy_version_mismatch", "command and snapshot policy versions differ", subject_id=command.command_id))
        if not events:
            issues.append(ValidationIssue("missing_events", "replay requires at least one event", subject_id=command.command_id))
        issues = _dedupe_issues(issues)
        if issues:
            return ReplayResult(
                False,
                snapshot,
                [issue.code for issue in issues],
                issues=tuple(issues),
                failure_classification=_classify_failure(issues),
                missing_mechanism_candidates=_missing_mechanism_candidates(issues),
                evidence_references=tuple(collected_evidence),
            )

        working = snapshot.clone()
        diffs: list[str] = []
        state_diff: list[str] = []
        constraint_diff: list[str] = []
        visibility_diff: list[str] = []
        causal_chain_diff: list[str] = []
        applied_event_ids: list[str] = []
        expected_write_surfaces: list[tuple[str, str, str, bool]] = []
        expected_parent = command.command_id
        checked_visibility_decision_count = 0
        checked_actor_action_count = 0
        checked_plot_obligation_count = 0
        checked_rule_activation_count = 0
        for event in sorted(events, key=lambda e: e.causal_order_index):
            issues.extend(event.validate().issues)
            payload = event.payload
            actor_id = _actor_for_event(event, observation_frame)
            action_type = _action_type_for_event(event)
            checked_actor_action_count += 1
            if event.parent_command_id != expected_parent:
                issues.append(
                    ValidationIssue("command_mismatch", "event does not belong to the replayed command", subject_id=event.event_id)
                )
            if event.causal_order_index < 0:
                issues.append(ValidationIssue("invalid_causal_order", "causal order index must be non-negative", subject_id=event.event_id))
            if event.visibility_scope == VisibilityScope.HIDDEN and event.event_type != "system_event":
                issues.append(ValidationIssue("visibility_leak", "hidden event affected replay chain", subject_id=event.event_id))
            if observation_frame is not None and event.event_type in observation_frame.blocked_event_types:
                issues.append(ValidationIssue("impossible_action", "observation frame blocked this event type", subject_id=event.event_id))
            if (
                observation_frame is not None
                and observation_frame.allowed_event_types
                and event.event_type not in observation_frame.allowed_event_types
            ):
                issues.append(ValidationIssue("impossible_action", "observation frame did not allow this event type", subject_id=event.event_id))
            for capability in _denied_capabilities(working, actor_id, action_type):
                issues.append(
                    ValidationIssue(
                        "capability_violation",
                        "event performed an action denied by persisted capability state",
                        subject_id=event.event_id,
                        field=f"capabilities.{capability.capability_id}",
                    )
                )
            if payload.get("requires_capability") and not _has_allowed_capability(working, actor_id, action_type):
                issues.append(
                    ValidationIssue(
                        "capability_violation",
                        "event required an allowed capability that was absent from state",
                        subject_id=event.event_id,
                        field=action_type,
                    )
                )
            required_rule_id = payload.get("required_rule_id") or payload.get("active_rule_id")
            if required_rule_id is not None:
                checked_rule_activation_count += 1
                rule = working.world_rules.get(required_rule_id)
                if rule is None or rule.activation_status != "active":
                    issues.append(
                        ValidationIssue(
                            "inactive_rule_use",
                            "event depended on a world rule that was not active",
                            subject_id=event.event_id,
                            field=f"world_rules.{required_rule_id}",
                        )
                    )
                elif observation_frame is not None and observation_frame.active_world_rule_ids and required_rule_id not in observation_frame.active_world_rule_ids:
                    issues.append(
                        ValidationIssue(
                            "inactive_rule_use",
                            "event depended on a world rule outside the active observation frame",
                            subject_id=event.event_id,
                            field=f"world_rules.{required_rule_id}",
                        )
                    )
            if event.event_type == "update_goal":
                character_id = payload.get("character_id")
                if character_id not in working.characters:
                    issues.append(ValidationIssue("missing_character", "goal update references missing character", subject_id=event.event_id))
                    continue
                current_goal = payload.get("current_goal")
                if not current_goal:
                    issues.append(ValidationIssue("missing_current_goal", "goal update requires current_goal", subject_id=event.event_id))
                    continue
                char = working.characters[character_id]
                expected_write_surfaces.append(
                    (event.event_id, "state_diff", f"characters.{payload['character_id']}.current_goal", False)
                )
                working.characters[payload["character_id"]] = char.__class__(
                    **{**char.__dict__, "current_goal": payload["current_goal"]}
                )
                diffs.append(f"goal_updated:{payload['character_id']}")
                state_diff.append(f"characters.{payload['character_id']}.current_goal")
            elif event.event_type == "update_relationship":
                subject = payload.get("subject_character_id")
                obj = payload.get("object_character_id")
                if subject not in working.characters or obj not in working.characters:
                    issues.append(ValidationIssue("missing_character", "relationship update references missing characters", subject_id=event.event_id))
                    continue
                rel = RelationshipState(
                    subject_character_id=subject,
                    object_character_id=obj,
                    relation_type=payload["relation_type"],
                    trust_value=float(payload["trust_value"]),
                    last_updated_event_id=event.event_id,
                    visibility_scope=payload.get("visibility_scope", VisibilityScope.SYSTEM_VISIBLE),
                    schema_version=working.schema_version,
                )
                key = f"{rel.subject_character_id}:{rel.object_character_id}:{rel.relation_type}"
                expected_write_surfaces.append((event.event_id, "state_diff", f"relationships.{key}", False))
                working.relationships[key] = rel
                diffs.append(f"relationship_updated:{key}")
                state_diff.append(f"relationships.{key}")
            elif event.event_type == "add_memory":
                memory = payload.get("memory")
                memory_id = payload.get("memory_id")
                if memory is None or getattr(memory, "memory_id", None) is None:
                    issues.append(ValidationIssue("invalid_memory_payload", "memory payload is invalid", subject_id=event.event_id))
                    continue
                owner_id = memory.owning_character_id
                if memory_id is not None and memory_id != memory.memory_id:
                    issues.append(
                        ValidationIssue(
                            "memory_payload_id_mismatch",
                            "memory payload id does not match embedded memory",
                            subject_id=event.event_id,
                            field="memory_id",
                        )
                    )
                    continue
                memory_id = memory_id or memory.memory_id
                if owner_id not in working.characters:
                    issues.append(ValidationIssue("missing_character", "memory write references missing owner", subject_id=event.event_id))
                    continue
                expected_write_surfaces.append((event.event_id, "state_diff", f"memories.{memory_id}", False))
                expected_write_surfaces.append(
                    (event.event_id, "state_diff", f"characters.{owner_id}.memory_references", True)
                )
                working.memories[memory_id] = memory
                owner = working.characters[owner_id]
                owner_memory_references = list(owner.memory_references)
                if memory_id not in owner_memory_references:
                    owner_memory_references.append(memory_id)
                working.characters[owner_id] = owner.__class__(
                    **{**owner.__dict__, "memory_references": owner_memory_references}
                )
                diffs.append(f"memory_added:{memory_id}")
                state_diff.append(f"memories.{memory_id}")
                state_diff.append(f"characters.{owner_id}.memory_references")
            elif event.event_type == "world_rule_update":
                world_rule = payload.get("world_rule")
                rule_id = payload.get("rule_id")
                if world_rule is None or getattr(world_rule, "rule_id", None) is None:
                    issues.append(ValidationIssue("invalid_world_rule_payload", "world rule payload is invalid", subject_id=event.event_id))
                    continue
                if rule_id is not None and rule_id != world_rule.rule_id:
                    issues.append(
                        ValidationIssue(
                            "world_rule_payload_id_mismatch",
                            "world rule payload id does not match embedded world rule",
                            subject_id=event.event_id,
                            field="rule_id",
                        )
                    )
                    continue
                rule_id = rule_id or world_rule.rule_id
                expected_write_surfaces.append((event.event_id, "state_diff", f"world_rules.{rule_id}", False))
                working.world_rules[rule_id] = world_rule
                diffs.append(f"world_rule_updated:{rule_id}")
                state_diff.append(f"world_rules.{rule_id}")
                constraint_diff.append(f"world_rules.{rule_id}")
            elif event.event_type == "chapter_outcome":
                if payload.get("prerequisite_event_id") is None:
                    diffs.append(f"causal_break:{event.event_id}")
                    causal_chain_diff.append(f"event:{event.event_id}:missing_precondition")
                    issues.append(ValidationIssue("missing_precondition", "chapter outcome lacks prerequisite", subject_id=event.event_id))
                if observation_frame is not None:
                    knowledge_memory_id = payload.get("knowledge_memory_id")
                    if knowledge_memory_id is not None and knowledge_memory_id not in observation_frame.accessible_memory_ids:
                        issues.append(ValidationIssue("visibility_leak", "chapter outcome relied on memory outside the observation frame", subject_id=event.event_id, field="knowledge_memory_id"))
                        visibility_diff.append(f"memories.{knowledge_memory_id}.knowledge_access")
                        collected_evidence.append(f"memory:{knowledge_memory_id}")
                    knowledge_fact_id = payload.get("knowledge_fact_id")
                    if knowledge_fact_id is not None:
                        checked_visibility_decision_count += 1
                        if not _is_fact_visible_to_frame(working, knowledge_fact_id, observation_frame):
                            issues.append(ValidationIssue("visibility_leak", "chapter outcome relied on hidden fact", subject_id=event.event_id, field="knowledge_fact_id"))
                            visibility_diff.append(f"facts.{knowledge_fact_id}.visibility")
                            collected_evidence.append(f"fact:{knowledge_fact_id}")
                    belief_id = payload.get("belief_id")
                    belief_fact_id = payload.get("belief_fact_id")
                    if belief_id is not None:
                        belief = working.beliefs.get(belief_id)
                        if belief is None:
                            issues.append(ValidationIssue("belief_construction_gap", "chapter outcome relied on belief absent from state", subject_id=event.event_id, field=f"beliefs.{belief_id}"))
                        elif actor_id is not None and belief.holder_character_id != actor_id:
                            issues.append(ValidationIssue("belief_construction_gap", "chapter outcome relied on another actor's belief", subject_id=event.event_id, field=f"beliefs.{belief_id}.holder_character_id"))
                        else:
                            fact = working.facts.get(belief.fact_id)
                            if belief.contradicts_fact_id is not None or belief.belief_status == "false" or (fact is not None and fact.canonical_truth_status == "false"):
                                issues.append(ValidationIssue("belief_conflict", "chapter outcome followed a false or conflicting belief rather than hidden fact leakage", subject_id=event.event_id, field=f"beliefs.{belief_id}"))
                                collected_evidence.append(f"belief:{belief_id}")
                    if belief_fact_id is not None and actor_id is not None:
                        has_belief = any(
                            belief.holder_character_id == actor_id and belief.fact_id == belief_fact_id
                            for belief in working.beliefs.values()
                        )
                        if not has_belief:
                            issues.append(ValidationIssue("belief_construction_gap", "chapter outcome declared a belief fact absent from belief state", subject_id=event.event_id, field=f"facts.{belief_fact_id}"))
                    plot_thread_id = payload.get("plot_thread_id")
                    if plot_thread_id is not None:
                        checked_plot_obligation_count += 1
                        plot_thread = working.plot_threads.get(plot_thread_id)
                        resolves_thread = payload.get("resolves_plot_thread") == plot_thread_id
                        if (
                            plot_thread is not None
                            and plot_thread.status in {"open", "active", "blocked"}
                            and payload.get("plot_obligation_due")
                            and not plot_thread.resolution_event_id
                            and not resolves_thread
                        ):
                            issues.append(ValidationIssue("plot_obligation_missed", "chapter outcome passed a due plot obligation without resolution", subject_id=event.event_id, field=f"plot_threads.{plot_thread_id}"))
            elif event.event_type == "reveal":
                memory_id = payload.get("memory_id")
                if memory_id not in working.memories:
                    issues.append(ValidationIssue("missing_precondition", "reveal references missing memory", subject_id=event.event_id))
                    continue
                memory = working.memories[memory_id]
                new_visibility = payload.get("visibility_scope", memory.visibility_scope)
                expected_write_surfaces.append((event.event_id, "visibility_diff", f"memories.{memory_id}.visibility_scope", False))
                working.memories[memory_id] = replace(memory, visibility_scope=new_visibility)
                diffs.append(f"memory_revealed:{memory_id}")
                visibility_diff.append(f"memories.{memory_id}.visibility_scope")
            else:
                issues.append(ValidationIssue("unsupported_event_type", "event type is not supported by replay engine", subject_id=event.event_id))
            applied_event_ids.append(event.event_id)

        actual_diff_index = {
            "state_diff": set(state_diff),
            "constraint_diff": set(constraint_diff),
            "visibility_diff": set(visibility_diff),
        }
        write_back_omission_diff: list[str] = []
        memory_omission_diff: list[str] = []
        checked_write_back_count = len(expected_write_surfaces)
        checked_memory_reference_count = sum(1 for _, _, _, is_memory_reference in expected_write_surfaces if is_memory_reference)
        for event_id, diff_kind, path, is_memory_reference in expected_write_surfaces:
            if path in actual_diff_index[diff_kind]:
                continue
            issues.append(
                ValidationIssue(
                    "missing_state_write_back",
                    "replay did not persist an expected state write",
                    subject_id=event_id,
                    field=path,
                )
            )
            write_back_omission_diff.append(path)
            if is_memory_reference:
                memory_omission_diff.append(path)

        causal_validation = validate_causality(snapshot, events)
        issues.extend(causal_validation.issues)
        for finding in causal_validation.findings:
            causal_chain_diff.append(f"event:{finding.offending_event_id}:{finding.failure_class}")
        issues = _dedupe_issues(issues)
        return ReplayResult(
            ok=not issues,
            state=working,
            diffs=diffs,
            state_diff=tuple(state_diff),
            constraint_diff=tuple(constraint_diff),
            visibility_diff=tuple(visibility_diff),
            causal_chain_diff=tuple(dict.fromkeys(causal_chain_diff)),
            causal_validation=causal_validation,
            issues=tuple(issues),
            applied_event_ids=tuple(applied_event_ids),
            failure_classification=_classify_failure(issues),
            missing_mechanism_candidates=_missing_mechanism_candidates(issues),
            evidence_references=tuple(dict.fromkeys(collected_evidence)),
            checked_write_back_count=checked_write_back_count,
            omitted_write_back_count=len(write_back_omission_diff),
            write_back_omission_diff=tuple(write_back_omission_diff),
            checked_memory_reference_count=checked_memory_reference_count,
            omitted_memory_reference_count=len(memory_omission_diff),
            memory_omission_diff=tuple(memory_omission_diff),
            checked_visibility_decision_count=checked_visibility_decision_count,
            checked_actor_action_count=checked_actor_action_count,
            checked_plot_obligation_count=checked_plot_obligation_count,
            checked_rule_activation_count=checked_rule_activation_count,
        )

    def replay_session(self, session: ReplaySession) -> ReplayResult:
        result = self.replay(
            session.target_command,
            session.pre_state_snapshot,
            list(session.ordered_event_chain),
            observation_frame=session.observation_frame,
            evidence_references=session.evidence_references,
            preflight_issues=session.validate().issues,
        )
        if session.post_state_snapshot is None:
            return result

        checked_count, post_state_diff = _compare_post_state(session.post_state_snapshot, result.state)
        if not post_state_diff:
            return replace(
                result,
                checked_post_state_surface_count=checked_count,
                mismatched_post_state_surface_count=0,
                post_state_diff=(),
            )

        issues = _dedupe_issues(
            list(result.issues)
            + [
                ValidationIssue(
                    "post_state_mismatch",
                    "replayed post-state does not match the locked post-state snapshot",
                    subject_id=session.post_state_snapshot.snapshot_id,
                    field=post_state_diff[0],
                )
            ]
        )
        return replace(
            result,
            ok=False,
            issues=tuple(issues),
            failure_classification=_classify_failure(issues),
            checked_post_state_surface_count=checked_count,
            mismatched_post_state_surface_count=len(post_state_diff),
            post_state_diff=post_state_diff,
        )
