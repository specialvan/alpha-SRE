from __future__ import annotations

from dataclasses import dataclass, field, replace
import copy
from enum import Enum
from typing import Dict, List, Optional

from .serialization import to_jsonable
from .validation import ValidationIssue, ValidationResult

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
    schema_version: str = "1.0"

    def validate(self) -> ValidationResult:
        issues = []
        if not self.rule_id:
            issues.append(ValidationIssue("missing_rule_id", "rule id is required"))
        if not self.rule_text:
            issues.append(ValidationIssue("missing_rule_text", "rule text is required", subject_id=self.rule_id))
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

    def clone(self) -> "NarrativeSnapshot":
        return replace(self, **copy.deepcopy({
            "characters": self.characters,
            "relationships": self.relationships,
            "memories": self.memories,
            "constraints": self.constraints,
            "world_rules": self.world_rules,
            "chapter_intents": self.chapter_intents,
        }))

    def validate(self) -> ValidationResult:
        issues = []
        for character in self.characters.values():
            result = character.validate()
            issues.extend(result.issues)
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
        for rule in self.world_rules.values():
            issues.extend(rule.validate().issues)
        for intent in self.chapter_intents.values():
            issues.extend(intent.validate().issues)
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
