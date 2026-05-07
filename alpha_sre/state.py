from __future__ import annotations

from dataclasses import dataclass, field, replace
import copy
from enum import Enum
from typing import Dict, List, Optional

from .serialization import to_jsonable
from .validation import ValidationIssue, ValidationResult

BELIEF_STATUSES = {"certain", "suspected", "false", "retracted"}
CANONICAL_TRUTH_STATUSES = {"true", "false", "unknown", "contested", "retracted"}
PLOT_THREAD_STATUSES = {"open", "active", "blocked", "resolved", "dropped"}
RULE_ACTIVATION_STATUSES = {"active", "inactive", "deprecated"}
RULE_AUTHORITY_MODES = {"canonical", "narrator", "system", "local_exception"}
VISIBILITY_STATUSES = {"visible", "hidden", "narrator_only", "system_only"}
EXTERNAL_ACTOR_IDS = {"narrator", "system"}


class VisibilityScope(str, Enum):
    PUBLIC = "public"
    CHARACTER_LOCAL = "character-local"
    GROUP_LOCAL = "group-local"
    NARRATOR_VISIBLE = "narrator-visible"
    SYSTEM_VISIBLE = "system-visible"
    HIDDEN = "hidden"


@dataclass(frozen=True)
class CharacterState:
    character_id: str
    role_name: str
    current_goal: str
    emotional_state: str
    relationship_links: List[str] = field(default_factory=list)
    active_constraints: List[str] = field(default_factory=list)
    memory_references: List[str] = field(default_factory=list)
    belief_ids: List[str] = field(default_factory=list)
    capability_ids: List[str] = field(default_factory=list)
    current_location: Optional[str] = None
    present_with_character_ids: List[str] = field(default_factory=list)
    knowledge_scope: VisibilityScope = VisibilityScope.CHARACTER_LOCAL
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.character_id:
            issues.append(ValidationIssue("missing_character_id", "character id is required", field="character_id"))
        if not self.role_name:
            issues.append(ValidationIssue("missing_role_name", "role name is required", subject_id=self.character_id, field="role_name"))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class RelationshipState:
    subject_character_id: str
    object_character_id: str
    relation_type: str
    trust_value: float
    last_updated_event_id: Optional[str]
    visibility_scope: VisibilityScope = VisibilityScope.SYSTEM_VISIBLE
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.subject_character_id or not self.object_character_id:
            issues.append(ValidationIssue("missing_relationship_endpoint", "relationship endpoints are required"))
        if not 0.0 <= self.trust_value <= 1.0:
            issues.append(ValidationIssue("invalid_trust_value", "trust value must be between 0 and 1"))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class MemoryState:
    memory_id: str
    owning_character_id: str
    memory_claim: str
    confidence_level: float
    source_event_id: Optional[str]
    retention_status: str
    visibility_scope: VisibilityScope = VisibilityScope.CHARACTER_LOCAL
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.memory_id:
            issues.append(ValidationIssue("missing_memory_id", "memory id is required"))
        if not self.owning_character_id:
            issues.append(ValidationIssue("missing_memory_owner", "owning character is required", subject_id=self.memory_id))
        if not 0.0 <= self.confidence_level <= 1.0:
            issues.append(ValidationIssue("invalid_confidence", "confidence level must be between 0 and 1", subject_id=self.memory_id))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class ConstraintState:
    constraint_id: str
    constraint_text: str
    authority_source: str
    affected_actors: List[str] = field(default_factory=list)
    enforcement_mode: str = "hard"
    violation_history: List[str] = field(default_factory=list)
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.constraint_id:
            issues.append(ValidationIssue("missing_constraint_id", "constraint id is required"))
        if self.enforcement_mode not in {"hard", "soft"}:
            issues.append(ValidationIssue("invalid_enforcement_mode", "enforcement mode must be hard or soft", subject_id=self.constraint_id))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class WorldRuleState:
    rule_id: str
    rule_text: str
    domain: str
    enforcement_strength: str
    allowed_exceptions: List[str] = field(default_factory=list)
    provenance_source: str = ""
    activation_status: str = "active"
    active_from_event_id: Optional[str] = None
    authority_mode: str = "canonical"
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.rule_id:
            issues.append(ValidationIssue("missing_rule_id", "rule id is required"))
        if not self.rule_text:
            issues.append(ValidationIssue("missing_rule_text", "rule text is required", subject_id=self.rule_id))
        if self.activation_status not in RULE_ACTIVATION_STATUSES:
            issues.append(ValidationIssue("invalid_rule_activation_status", "rule activation status is invalid", subject_id=self.rule_id, field="activation_status"))
        if self.authority_mode not in RULE_AUTHORITY_MODES:
            issues.append(ValidationIssue("invalid_rule_authority_mode", "rule authority mode is invalid", subject_id=self.rule_id, field="authority_mode"))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class ChapterIntentState:
    intent_id: str
    scene_target: str
    desired_narrative_effect: str
    required_preconditions: List[str] = field(default_factory=list)
    forbidden_outcomes: List[str] = field(default_factory=list)
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.intent_id:
            issues.append(ValidationIssue("missing_intent_id", "intent id is required"))
        if not self.scene_target:
            issues.append(ValidationIssue("missing_scene_target", "scene target is required", subject_id=self.intent_id))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class FactState:
    fact_id: str
    fact_text: str
    fact_type: str
    introduced_by_event_id: Optional[str]
    valid_from_event_id: Optional[str]
    valid_until_event_id: Optional[str]
    canonical_truth_status: str
    related_character_ids: List[str] = field(default_factory=list)
    related_rule_ids: List[str] = field(default_factory=list)
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.fact_id:
            issues.append(ValidationIssue("missing_fact_id", "fact id is required", field="fact_id"))
        if not self.fact_text:
            issues.append(ValidationIssue("missing_fact_text", "fact text is required", subject_id=self.fact_id, field="fact_text"))
        if not self.fact_type:
            issues.append(ValidationIssue("missing_fact_type", "fact type is required", subject_id=self.fact_id, field="fact_type"))
        if self.canonical_truth_status not in CANONICAL_TRUTH_STATUSES:
            issues.append(ValidationIssue("invalid_fact_truth_status", "canonical truth status is invalid", subject_id=self.fact_id, field="canonical_truth_status"))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class BeliefState:
    belief_id: str
    holder_character_id: str
    fact_id: str
    belief_status: str
    confidence: float
    derived_from_event_id: Optional[str]
    derived_from_memory_ids: List[str] = field(default_factory=list)
    contradicts_fact_id: Optional[str] = None
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.belief_id:
            issues.append(ValidationIssue("missing_belief_id", "belief id is required", field="belief_id"))
        if not self.holder_character_id:
            issues.append(ValidationIssue("missing_belief_holder", "belief holder is required", subject_id=self.belief_id, field="holder_character_id"))
        if not self.fact_id:
            issues.append(ValidationIssue("missing_belief_fact", "belief must point to a fact", subject_id=self.belief_id, field="fact_id"))
        if self.belief_status not in BELIEF_STATUSES:
            issues.append(ValidationIssue("invalid_belief_status", "belief status is invalid", subject_id=self.belief_id, field="belief_status"))
        if not 0.0 <= self.confidence <= 1.0:
            issues.append(ValidationIssue("invalid_belief_confidence", "belief confidence must be between 0 and 1", subject_id=self.belief_id, field="confidence"))
        if self.contradicts_fact_id is not None and self.contradicts_fact_id == self.fact_id:
            issues.append(ValidationIssue("self_contradicting_belief", "belief contradiction must point to a different fact", subject_id=self.belief_id, field="contradicts_fact_id"))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class PlotThreadState:
    thread_id: str
    thread_type: str
    status: str
    introduced_by_event_id: Optional[str]
    required_payoff_by: Optional[str] = None
    blocking_event_ids: List[str] = field(default_factory=list)
    resolution_event_id: Optional[str] = None
    affected_characters: List[str] = field(default_factory=list)
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.thread_id:
            issues.append(ValidationIssue("missing_plot_thread_id", "plot thread id is required", field="thread_id"))
        if not self.thread_type:
            issues.append(ValidationIssue("missing_plot_thread_type", "plot thread type is required", subject_id=self.thread_id, field="thread_type"))
        if self.status not in PLOT_THREAD_STATUSES:
            issues.append(ValidationIssue("invalid_plot_obligation_state", "plot thread status is invalid", subject_id=self.thread_id, field="status"))
        if self.status == "resolved" and not self.resolution_event_id:
            issues.append(ValidationIssue("missing_plot_resolution_event", "resolved plot thread requires a resolution event", subject_id=self.thread_id, field="resolution_event_id"))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class CapabilityState:
    capability_id: str
    character_id: str
    action_type: str
    allowed: bool
    source_rule_id: Optional[str]
    source_constraint_id: Optional[str]
    valid_from_event_id: Optional[str]
    valid_until_event_id: Optional[str]
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.capability_id:
            issues.append(ValidationIssue("missing_capability_id", "capability id is required", field="capability_id"))
        if not self.character_id:
            issues.append(ValidationIssue("missing_capability_actor", "capability character is required", subject_id=self.capability_id, field="character_id"))
        if not self.action_type:
            issues.append(ValidationIssue("missing_capability_action_type", "capability action type is required", subject_id=self.capability_id, field="action_type"))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class VisibilityEdgeState:
    visibility_edge_id: str
    fact_id: str
    viewer_id: str
    visibility_status: str
    visibility_source: str
    valid_from_event_id: Optional[str]
    valid_until_event_id: Optional[str]
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.visibility_edge_id:
            issues.append(ValidationIssue("missing_visibility_edge_id", "visibility edge id is required", field="visibility_edge_id"))
        if not self.fact_id:
            issues.append(ValidationIssue("missing_visibility_fact", "visibility edge must point to a fact", subject_id=self.visibility_edge_id, field="fact_id"))
        if not self.viewer_id:
            issues.append(ValidationIssue("missing_visibility_viewer", "visibility edge must name a viewer", subject_id=self.visibility_edge_id, field="viewer_id"))
        if self.visibility_status not in VISIBILITY_STATUSES:
            issues.append(ValidationIssue("invalid_visibility_status", "visibility status is invalid", subject_id=self.visibility_edge_id, field="visibility_status"))
        if not self.visibility_source:
            issues.append(ValidationIssue("missing_visibility_source", "visibility edge requires a source", subject_id=self.visibility_edge_id, field="visibility_source"))
        return ValidationResult(not issues, tuple(issues))


@dataclass(frozen=True)
class NarrativeSnapshot:
    snapshot_id: str
    state_identity: str
    schema_version: str
    policy_version: str
    visibility_version: str
    created_at: str
    characters: Dict[str, CharacterState] = field(default_factory=dict)
    relationships: Dict[str, RelationshipState] = field(default_factory=dict)
    memories: Dict[str, MemoryState] = field(default_factory=dict)
    constraints: Dict[str, ConstraintState] = field(default_factory=dict)
    world_rules: Dict[str, WorldRuleState] = field(default_factory=dict)
    chapter_intents: Dict[str, ChapterIntentState] = field(default_factory=dict)
    facts: Dict[str, FactState] = field(default_factory=dict)
    beliefs: Dict[str, BeliefState] = field(default_factory=dict)
    plot_threads: Dict[str, PlotThreadState] = field(default_factory=dict)
    capabilities: Dict[str, CapabilityState] = field(default_factory=dict)
    visibility_edges: Dict[str, VisibilityEdgeState] = field(default_factory=dict)

    def clone(self) -> "NarrativeSnapshot":
        return replace(self, **copy.deepcopy({
            "characters": self.characters,
            "relationships": self.relationships,
            "memories": self.memories,
            "constraints": self.constraints,
            "world_rules": self.world_rules,
            "chapter_intents": self.chapter_intents,
            "facts": self.facts,
            "beliefs": self.beliefs,
            "plot_threads": self.plot_threads,
            "capabilities": self.capabilities,
            "visibility_edges": self.visibility_edges,
        }))

    def validate(self) -> ValidationResult:
        issues = []
        for character in self.characters.values():
            result = character.validate()
            issues.extend(result.issues)
            for relationship_id in character.relationship_links:
                if relationship_id not in self.relationships:
                    issues.append(ValidationIssue("dangling_character_relationship", "character relationship reference missing from snapshot", subject_id=character.character_id, field="relationship_links"))
            for constraint_id in character.active_constraints:
                if constraint_id not in self.constraints:
                    issues.append(ValidationIssue("dangling_character_constraint", "character constraint reference missing from snapshot", subject_id=character.character_id, field="active_constraints"))
            for memory_id in character.memory_references:
                if memory_id not in self.memories:
                    issues.append(ValidationIssue("dangling_character_memory", "character memory reference missing from snapshot", subject_id=character.character_id, field="memory_references"))
            for belief_id in character.belief_ids:
                if belief_id not in self.beliefs:
                    issues.append(ValidationIssue("dangling_character_belief", "character belief reference missing from snapshot", subject_id=character.character_id, field="belief_ids"))
            for capability_id in character.capability_ids:
                if capability_id not in self.capabilities:
                    issues.append(ValidationIssue("dangling_character_capability", "character capability reference missing from snapshot", subject_id=character.character_id, field="capability_ids"))
            for present_with_id in character.present_with_character_ids:
                if present_with_id not in self.characters:
                    issues.append(ValidationIssue("dangling_character_presence", "present-with character missing from snapshot", subject_id=character.character_id, field="present_with_character_ids"))
        for relationship in self.relationships.values():
            result = relationship.validate()
            issues.extend(result.issues)
            if relationship.subject_character_id not in self.characters:
                issues.append(ValidationIssue("dangling_relationship", "relationship subject missing from snapshot", subject_id=relationship.subject_character_id))
            if relationship.object_character_id not in self.characters:
                issues.append(ValidationIssue("dangling_relationship", "relationship object missing from snapshot", subject_id=relationship.object_character_id))
        for memory in self.memories.values():
            result = memory.validate()
            issues.extend(result.issues)
            if memory.owning_character_id not in self.characters:
                issues.append(ValidationIssue("dangling_memory", "memory owner missing from snapshot", subject_id=memory.memory_id))
        for constraint in self.constraints.values():
            issues.extend(constraint.validate().issues)
            for actor_id in constraint.affected_actors:
                if actor_id not in self.characters and actor_id not in EXTERNAL_ACTOR_IDS:
                    issues.append(ValidationIssue("dangling_constraint_actor", "constraint references missing actor", subject_id=constraint.constraint_id, field="affected_actors"))
        for rule in self.world_rules.values():
            issues.extend(rule.validate().issues)
        for intent in self.chapter_intents.values():
            issues.extend(intent.validate().issues)
        for fact in self.facts.values():
            issues.extend(fact.validate().issues)
            for character_id in fact.related_character_ids:
                if character_id not in self.characters:
                    issues.append(ValidationIssue("dangling_fact_character", "fact references missing character", subject_id=fact.fact_id, field="related_character_ids"))
            for rule_id in fact.related_rule_ids:
                if rule_id not in self.world_rules:
                    issues.append(ValidationIssue("dangling_fact_rule", "fact references missing world rule", subject_id=fact.fact_id, field="related_rule_ids"))
        for belief in self.beliefs.values():
            issues.extend(belief.validate().issues)
            if belief.holder_character_id not in self.characters:
                issues.append(ValidationIssue("dangling_belief_holder", "belief holder missing from snapshot", subject_id=belief.belief_id, field="holder_character_id"))
            if belief.fact_id not in self.facts:
                issues.append(ValidationIssue("dangling_belief_fact", "belief fact missing from snapshot", subject_id=belief.belief_id, field="fact_id"))
            if belief.contradicts_fact_id is not None and belief.contradicts_fact_id not in self.facts:
                issues.append(ValidationIssue("dangling_belief_contradiction", "belief contradiction fact missing from snapshot", subject_id=belief.belief_id, field="contradicts_fact_id"))
            for memory_id in belief.derived_from_memory_ids:
                if memory_id not in self.memories:
                    issues.append(ValidationIssue("dangling_belief_memory", "belief source memory missing from snapshot", subject_id=belief.belief_id, field="derived_from_memory_ids"))
        for plot_thread in self.plot_threads.values():
            issues.extend(plot_thread.validate().issues)
            for character_id in plot_thread.affected_characters:
                if character_id not in self.characters:
                    issues.append(ValidationIssue("dangling_plot_thread_character", "plot thread references missing character", subject_id=plot_thread.thread_id, field="affected_characters"))
        for capability in self.capabilities.values():
            issues.extend(capability.validate().issues)
            if capability.character_id not in self.characters:
                issues.append(ValidationIssue("dangling_capability_actor", "capability references missing character", subject_id=capability.capability_id, field="character_id"))
            if capability.source_rule_id is not None and capability.source_rule_id not in self.world_rules:
                issues.append(ValidationIssue("dangling_capability_rule", "capability references missing world rule", subject_id=capability.capability_id, field="source_rule_id"))
            if capability.source_constraint_id is not None and capability.source_constraint_id not in self.constraints:
                issues.append(ValidationIssue("dangling_capability_constraint", "capability references missing constraint", subject_id=capability.capability_id, field="source_constraint_id"))
        for edge in self.visibility_edges.values():
            issues.extend(edge.validate().issues)
            if edge.fact_id not in self.facts:
                issues.append(ValidationIssue("dangling_visibility_fact", "visibility edge references missing fact", subject_id=edge.visibility_edge_id, field="fact_id"))
            if edge.viewer_id not in self.characters and edge.viewer_id not in EXTERNAL_ACTOR_IDS:
                issues.append(ValidationIssue("dangling_visibility_viewer", "visibility edge references missing viewer", subject_id=edge.visibility_edge_id, field="viewer_id"))
        if not self.snapshot_id:
            issues.append(ValidationIssue("missing_snapshot_id", "snapshot id is required", field="snapshot_id"))
        if not self.state_identity:
            issues.append(ValidationIssue("missing_state_identity", "state identity is required", field="state_identity"))
        return ValidationResult(not issues, tuple(issues))

    def to_dict(self) -> dict:
        return to_jsonable(self)


@dataclass(frozen=True)
class NarrativeState:
    snapshot: NarrativeSnapshot
