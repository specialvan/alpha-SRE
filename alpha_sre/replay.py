from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import List

from .causal_validation import CausalValidationResult, validate_causality
from .events import Command, Event
from .state import NarrativeSnapshot, RelationshipState, VisibilityScope
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
        elif self.narrative_state_schema_version != self.pre_state_snapshot.schema_version:
            issues.append(ValidationIssue("schema_version_mismatch", "replay session schema version does not match locked snapshot", subject_id=self.target_command.command_id))
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


def _classify_failure(issues: list[ValidationIssue]) -> str | None:
    codes = {issue.code for issue in issues}
    if not codes:
        return None
    if "visibility_leak" in codes:
        return "visibility_leak"
    if "policy_version_mismatch" in codes:
        return "policy_drift"
    if "state_identity_mismatch" in codes:
        return "state_drift"
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
        }:
            candidates.append(issue.code)
    return tuple(dict.fromkeys(candidates))


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
        for event in sorted(events, key=lambda e: e.causal_order_index):
            issues.extend(event.validate().issues)
            payload = event.payload
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
                if memory is None or getattr(memory, "memory_id", None) is None:
                    issues.append(ValidationIssue("invalid_memory_payload", "memory payload is invalid", subject_id=event.event_id))
                    continue
                owner_id = memory.owning_character_id
                if owner_id not in working.characters:
                    issues.append(ValidationIssue("missing_character", "memory write references missing owner", subject_id=event.event_id))
                    continue
                expected_write_surfaces.append((event.event_id, "state_diff", f"memories.{payload['memory_id']}", False))
                expected_write_surfaces.append(
                    (event.event_id, "state_diff", f"characters.{owner_id}.memory_references", True)
                )
                working.memories[payload["memory_id"]] = memory
                owner = working.characters[owner_id]
                owner_memory_references = list(owner.memory_references)
                if payload["memory_id"] not in owner_memory_references:
                    owner_memory_references.append(payload["memory_id"])
                working.characters[owner_id] = owner.__class__(
                    **{**owner.__dict__, "memory_references": owner_memory_references}
                )
                diffs.append(f"memory_added:{payload['memory_id']}")
                state_diff.append(f"memories.{payload['memory_id']}")
                state_diff.append(f"characters.{owner_id}.memory_references")
            elif event.event_type == "world_rule_update":
                world_rule = payload.get("world_rule")
                if world_rule is None or getattr(world_rule, "rule_id", None) is None:
                    issues.append(ValidationIssue("invalid_world_rule_payload", "world rule payload is invalid", subject_id=event.event_id))
                    continue
                expected_write_surfaces.append((event.event_id, "state_diff", f"world_rules.{payload['rule_id']}", False))
                working.world_rules[payload["rule_id"]] = world_rule
                diffs.append(f"world_rule_updated:{payload['rule_id']}")
                state_diff.append(f"world_rules.{payload['rule_id']}")
                constraint_diff.append(f"world_rules.{payload['rule_id']}")
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
                    if knowledge_fact_id is not None and knowledge_fact_id in observation_frame.hidden_fact_ids:
                        issues.append(ValidationIssue("visibility_leak", "chapter outcome relied on hidden fact", subject_id=event.event_id, field="knowledge_fact_id"))
                        visibility_diff.append(f"facts.{knowledge_fact_id}.visibility")
                        collected_evidence.append(f"fact:{knowledge_fact_id}")
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
        )

    def replay_session(self, session: ReplaySession) -> ReplayResult:
        return self.replay(
            session.target_command,
            session.pre_state_snapshot,
            list(session.ordered_event_chain),
            observation_frame=session.observation_frame,
            evidence_references=session.evidence_references,
            preflight_issues=session.validate().issues,
        )
