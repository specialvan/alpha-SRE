from __future__ import annotations

from dataclasses import dataclass, field

from .validation import ValidationIssue, ValidationResult


NARRATIVE_QUALITY_REVIEW_CONTRACT_VERSION = "1.0"


@dataclass(frozen=True)
class NarrativeQualityReviewRecord:
    review_id: str
    source_artifact_reference: str
    checked_segment_count: int = 0
    ooc_incident_count: int = 0
    checked_scene_count: int = 0
    world_rule_violation_count: int = 0
    introduced_setup_item_count: int = 0
    resolved_setup_item_count: int = 0
    evidence_references: tuple[str, ...] = field(default_factory=tuple)
    contract_version: str = NARRATIVE_QUALITY_REVIEW_CONTRACT_VERSION

    def validate(self) -> ValidationResult:
        issues: list[ValidationIssue] = []
        if not self.review_id:
            issues.append(ValidationIssue("missing_review_id", "quality review record requires review id", field="review_id"))
        if not self.source_artifact_reference:
            issues.append(
                ValidationIssue(
                    "missing_review_source_reference",
                    "quality review record requires source artifact reference",
                    subject_id=self.review_id,
                    field="source_artifact_reference",
                )
            )
        numeric_fields = {
            "checked_segment_count": self.checked_segment_count,
            "ooc_incident_count": self.ooc_incident_count,
            "checked_scene_count": self.checked_scene_count,
            "world_rule_violation_count": self.world_rule_violation_count,
            "introduced_setup_item_count": self.introduced_setup_item_count,
            "resolved_setup_item_count": self.resolved_setup_item_count,
        }
        for field_name, value in numeric_fields.items():
            if value < 0:
                issues.append(
                    ValidationIssue(
                        "negative_review_counter",
                        "quality review counters must be non-negative",
                        subject_id=self.review_id,
                        field=field_name,
                    )
                )
        return ValidationResult(not issues, tuple(issues))
