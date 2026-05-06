from __future__ import annotations

from dataclasses import dataclass, field
from typing import Tuple

from .metrics import MetricSummary
from .replay import ReplayResult


CRITICAL_ISSUE_CODES = {
    "policy_version_mismatch",
    "schema_version_mismatch",
    "state_identity_mismatch",
    "visibility_version_mismatch",
    "write_contract_mismatch",
    "missing_events",
    "missing_precondition",
    "visibility_leak",
    "unauthorized_overwrite",
    "unsupported_event_type",
    "command_mismatch",
    "missing_character",
    "missing_current_goal",
    "invalid_memory_payload",
    "invalid_world_rule_payload",
    "impossible_action",
    "missing_state_write_back",
    "invalid_causal_order",
    "duplicate_event_id",
    "duplicate_causal_index",
    "dangling_relationship",
    "dangling_memory",
}


@dataclass(frozen=True)
class GateResult:
    allowed: bool
    blocking_issues: Tuple[str, ...] = field(default_factory=tuple)
    warnings: Tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ConsistencyGate:
    min_trace_completeness: float = 1.0
    max_causality_break_rate: float = 0.0
    max_visibility_leak_rate: float = 0.0
    min_causal_attribution_coverage: float = 1.0
    max_rule_drift_rate: float = 0.0
    min_write_back_success_rate: float = 1.0
    max_write_back_omission_rate: float = 0.0
    max_memory_omission_rate: float = 0.0
    max_same_class_failure_rate: float = 0.0
    min_replay_confirmed_regression_rate: float = 1.0
    min_version_lock_success_rate: float = 1.0
    max_alarm_trigger_rate: float = 0.0
    max_snapshot_freshness_seconds: float | None = None
    max_edit_amplitude: float | None = None
    max_plot_inconsistency_rate: float | None = None
    max_world_rule_violation_rate: float | None = None

    def evaluate(self, replay: ReplayResult, metrics: MetricSummary | None = None) -> GateResult:
        blocking: list[str] = []
        warnings: list[str] = []

        if not replay.ok:
            blocking.extend(issue.code for issue in replay.issues if issue.code in CRITICAL_ISSUE_CODES or issue.code.endswith("_mismatch"))

        if metrics is not None:
            if metrics.trace_completeness < self.min_trace_completeness:
                blocking.append("trace_completeness_below_threshold")
            if metrics.causality_break_rate > self.max_causality_break_rate:
                blocking.append("causality_break_rate_above_threshold")
            if metrics.visibility_leak_rate > self.max_visibility_leak_rate:
                blocking.append("visibility_leak_rate_above_threshold")
            if metrics.causal_attribution_coverage < self.min_causal_attribution_coverage:
                blocking.append("causal_attribution_coverage_below_threshold")
            if metrics.rule_drift_rate > self.max_rule_drift_rate:
                blocking.append("rule_drift_rate_above_threshold")
            if metrics.write_back_success_rate < self.min_write_back_success_rate:
                blocking.append("write_back_success_rate_below_threshold")
            if metrics.write_back_omission_rate > self.max_write_back_omission_rate:
                blocking.append("write_back_omission_rate_above_threshold")
            if metrics.memory_omission_rate > self.max_memory_omission_rate:
                blocking.append("memory_omission_rate_above_threshold")
            if metrics.same_class_failure_rate > self.max_same_class_failure_rate:
                blocking.append("same_class_failure_rate_above_threshold")
            if metrics.replay_confirmed_regression_rate < self.min_replay_confirmed_regression_rate:
                blocking.append("replay_confirmed_regression_rate_below_threshold")
            if metrics.version_lock_success_rate < self.min_version_lock_success_rate:
                blocking.append("version_lock_success_rate_below_threshold")
            if metrics.alarm_trigger_rate > self.max_alarm_trigger_rate:
                blocking.append("alarm_trigger_rate_above_threshold")
            if (
                self.max_snapshot_freshness_seconds is not None
                and metrics.snapshot_freshness > self.max_snapshot_freshness_seconds
            ):
                blocking.append("snapshot_freshness_above_threshold")
            if self.max_edit_amplitude is not None and metrics.edit_amplitude > self.max_edit_amplitude:
                blocking.append("edit_amplitude_above_threshold")
            if (
                self.max_plot_inconsistency_rate is not None
                and metrics.plot_inconsistency_rate > self.max_plot_inconsistency_rate
            ):
                blocking.append("plot_inconsistency_rate_above_threshold")
            if (
                self.max_world_rule_violation_rate is not None
                and metrics.world_rule_violation_rate > self.max_world_rule_violation_rate
            ):
                blocking.append("world_rule_violation_rate_above_threshold")
            if metrics.replay_availability < 1.0:
                warnings.append("replay_availability_below_perfect")

        dedup_blocking = tuple(dict.fromkeys(blocking))
        dedup_warnings = tuple(dict.fromkeys(warnings))
        return GateResult(allowed=not dedup_blocking, blocking_issues=dedup_blocking, warnings=dedup_warnings)
