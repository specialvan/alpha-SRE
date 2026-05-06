from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .state import VisibilityScope
from .serialization import to_jsonable
from .validation import ValidationIssue, ValidationResult


@dataclass(frozen=True)
class Command:
    command_id: str
    command_type: str
    operator_id: str
    requested_scope: str
    policy_version: str
    created_at: str

    def validate(self) -> ValidationResult:
        issues = []
        if not self.command_id:
            issues.append(ValidationIssue("missing_command_id", "command id is required"))
        if not self.policy_version:
            issues.append(ValidationIssue("missing_policy_version", "policy version is required", subject_id=self.command_id))
        return ValidationResult(not issues, tuple(issues))

    def to_dict(self) -> Dict[str, Any]:
        return to_jsonable(self)


@dataclass(frozen=True)
class Event:
    event_id: str
    parent_command_id: str
    event_type: str
    causal_order_index: int
    emitted_at: str
    producer_version: str
    payload: Dict[str, Any] = field(default_factory=dict)
    visibility_scope: VisibilityScope = VisibilityScope.SYSTEM_VISIBLE

    def validate(self) -> ValidationResult:
        issues = []
        if not self.event_id:
            issues.append(ValidationIssue("missing_event_id", "event id is required"))
        if not self.parent_command_id:
            issues.append(ValidationIssue("missing_parent_command_id", "parent command id is required", subject_id=self.event_id))
        return ValidationResult(not issues, tuple(issues))

    def payload_jsonable(self) -> Dict[str, Any]:
        return to_jsonable(self.payload)

    def to_dict(self) -> Dict[str, Any]:
        return to_jsonable(self)
