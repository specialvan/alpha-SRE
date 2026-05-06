from __future__ import annotations

from dataclasses import dataclass, field
from typing import Tuple


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    message: str
    subject_id: str | None = None
    field: str | None = None


@dataclass(frozen=True)
class ValidationResult:
    ok: bool
    issues: Tuple[ValidationIssue, ...] = field(default_factory=tuple)

    @staticmethod
    def success() -> "ValidationResult":
        return ValidationResult(True, ())

    @staticmethod
    def failure(*issues: ValidationIssue) -> "ValidationResult":
        return ValidationResult(False, issues)
