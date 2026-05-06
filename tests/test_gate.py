from __future__ import annotations

import unittest

from alpha_sre.events import Command, Event
from alpha_sre.gate import ConsistencyGate
from alpha_sre.metrics import MetricSummary
from alpha_sre.replay import ObservationFrame, ReplayEngine, ReplaySession
from alpha_sre.state import CharacterState, NarrativeSnapshot, VisibilityScope


def make_snapshot() -> NarrativeSnapshot:
    return NarrativeSnapshot(
        snapshot_id="s1",
        state_identity="state-1",
        schema_version="1.0",
        policy_version="p1",
        visibility_version="v1",
        created_at="2026-05-06T00:00:00Z",
        characters={
            "c1": CharacterState(
                character_id="c1",
                role_name="protagonist",
                current_goal="find truth",
                emotional_state="focused",
                knowledge_scope=VisibilityScope.CHARACTER_LOCAL,
            )
        },
    )


class GateTests(unittest.TestCase):
    def test_gate_allows_clean_replay(self):
        snapshot = make_snapshot()
        engine = ReplayEngine()
        replay = engine.replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(replay, MetricSummary(1.0, 0.0, 0.0, 1.0))
        self.assertTrue(result.allowed)

    def test_gate_blocks_causal_break(self):
        snapshot = make_snapshot()
        engine = ReplayEngine()
        replay = engine.replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(replay, MetricSummary(0.5, 1.0, 0.0, 0.0))
        self.assertFalse(result.allowed)
        self.assertTrue(result.blocking_issues)

    def test_gate_blocks_impossible_action_from_observation_frame(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay_session(
            ReplaySession(
                target_command=Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
                ordered_event_chain=(
                    Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
                ),
                pre_state_snapshot=snapshot,
                policy_version="p1",
                prompt_version="chapter-intent-v1",
                dependency_contract_versions={"read_api": "1.0"},
                replay_operator_id="replay-op-1",
                visibility_snapshot_version="v1",
                narrative_state_schema_version="1.0",
                observation_frame=ObservationFrame(
                    replay_id="replay-1",
                    at_causal_order_index=1,
                    pov_actor_id="c1",
                    input_snapshot_id="s1",
                    visible_fact_ids=("character:c1:goal",),
                    hidden_fact_ids=(),
                    believed_fact_ids=("character:c1:goal",),
                    accessible_memory_ids=(),
                    allowed_event_types=(),
                    blocked_event_types=("update_goal",),
                    active_world_rule_ids=(),
                    retrieval_context_hash="retrieval-v1",
                    prompt_context_hash="prompt-v1",
                    write_back_decision_trace_id="trace-1",
                ),
            )
        )
        gate = ConsistencyGate()
        result = gate.evaluate(replay, MetricSummary(1.0, 0.0, 0.0, 0.0))
        self.assertFalse(result.allowed)
        self.assertIn("impossible_action", result.blocking_issues)

    def test_gate_blocks_low_causal_attribution_coverage(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(replay, MetricSummary(1.0, 0.0, 0.0, 1.0, 0.5))
        self.assertFalse(result.allowed)
        self.assertIn("causal_attribution_coverage_below_threshold", result.blocking_issues)

    def test_gate_blocks_rule_drift_rate_above_threshold(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(replay, MetricSummary(1.0, 0.0, 0.0, 1.0, 1.0, 0.5))
        self.assertFalse(result.allowed)
        self.assertIn("rule_drift_rate_above_threshold", result.blocking_issues)

    def test_gate_blocks_low_write_back_success_rate(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(replay, MetricSummary(1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.5))
        self.assertFalse(result.allowed)
        self.assertIn("write_back_success_rate_below_threshold", result.blocking_issues)

    def test_gate_blocks_high_write_back_omission_rate(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(
            replay,
            MetricSummary(
                trace_completeness=1.0,
                causality_break_rate=0.0,
                visibility_leak_rate=0.0,
                replay_availability=1.0,
                causal_attribution_coverage=1.0,
                rule_drift_rate=0.0,
                write_back_success_rate=1.0,
                write_back_omission_rate=0.5,
            ),
        )
        self.assertFalse(result.allowed)
        self.assertIn("write_back_omission_rate_above_threshold", result.blocking_issues)

    def test_gate_blocks_high_memory_omission_rate(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(
            replay,
            MetricSummary(
                trace_completeness=1.0,
                causality_break_rate=0.0,
                visibility_leak_rate=0.0,
                replay_availability=1.0,
                causal_attribution_coverage=1.0,
                rule_drift_rate=0.0,
                write_back_success_rate=1.0,
                memory_omission_rate=0.5,
            ),
        )
        self.assertFalse(result.allowed)
        self.assertIn("memory_omission_rate_above_threshold", result.blocking_issues)

    def test_gate_blocks_same_class_failure_rate_above_threshold(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(replay, MetricSummary(1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.5))
        self.assertFalse(result.allowed)
        self.assertIn("same_class_failure_rate_above_threshold", result.blocking_issues)

    def test_gate_blocks_low_replay_confirmed_regression_rate(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(replay, MetricSummary(1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.5, 0.4))
        self.assertFalse(result.allowed)
        self.assertIn("replay_confirmed_regression_rate_below_threshold", result.blocking_issues)

    def test_gate_blocks_low_version_lock_success_rate(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(replay, MetricSummary(1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.5, 1.0, 0.5, 0.0))
        self.assertFalse(result.allowed)
        self.assertIn("version_lock_success_rate_below_threshold", result.blocking_issues)

    def test_gate_blocks_high_alarm_trigger_rate(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate()
        result = gate.evaluate(
            replay,
            MetricSummary(
                trace_completeness=1.0,
                causality_break_rate=0.0,
                visibility_leak_rate=0.0,
                replay_availability=1.0,
                causal_attribution_coverage=1.0,
                rule_drift_rate=0.0,
                write_back_success_rate=1.0,
                same_class_failure_rate=0.0,
                incident_recurrence_rate=0.0,
                replay_confirmed_regression_rate=1.0,
                version_lock_success_rate=1.0,
                alarm_trigger_rate=0.5,
            ),
        )
        self.assertFalse(result.allowed)
        self.assertIn("alarm_trigger_rate_above_threshold", result.blocking_issues)

    def test_gate_blocks_stale_snapshot_freshness(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate(max_snapshot_freshness_seconds=60.0)
        result = gate.evaluate(
            replay,
            MetricSummary(
                trace_completeness=1.0,
                causality_break_rate=0.0,
                visibility_leak_rate=0.0,
                replay_availability=1.0,
                causal_attribution_coverage=1.0,
                rule_drift_rate=0.0,
                write_back_success_rate=1.0,
                same_class_failure_rate=0.0,
                incident_recurrence_rate=0.0,
                replay_confirmed_regression_rate=1.0,
                version_lock_success_rate=1.0,
                alarm_trigger_rate=0.0,
                snapshot_freshness=120.0,
            ),
        )
        self.assertFalse(result.allowed)
        self.assertIn("snapshot_freshness_above_threshold", result.blocking_issues)

    def test_gate_blocks_high_edit_amplitude(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate(max_edit_amplitude=0.2)
        result = gate.evaluate(
            replay,
            MetricSummary(
                trace_completeness=1.0,
                causality_break_rate=0.0,
                visibility_leak_rate=0.0,
                replay_availability=1.0,
                edit_amplitude=0.5,
            ),
        )
        self.assertFalse(result.allowed)
        self.assertIn("edit_amplitude_above_threshold", result.blocking_issues)

    def test_gate_blocks_high_plot_inconsistency_rate(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate(max_plot_inconsistency_rate=0.0)
        result = gate.evaluate(
            replay,
            MetricSummary(
                trace_completeness=1.0,
                causality_break_rate=0.0,
                visibility_leak_rate=0.0,
                replay_availability=1.0,
                plot_inconsistency_rate=0.5,
            ),
        )
        self.assertFalse(result.allowed)
        self.assertIn("plot_inconsistency_rate_above_threshold", result.blocking_issues)

    def test_gate_blocks_high_world_rule_violation_rate(self):
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        gate = ConsistencyGate(max_world_rule_violation_rate=0.0)
        result = gate.evaluate(
            replay,
            MetricSummary(
                trace_completeness=1.0,
                causality_break_rate=0.0,
                visibility_leak_rate=0.0,
                replay_availability=1.0,
                world_rule_violation_rate=0.5,
            ),
        )
        self.assertFalse(result.allowed)
        self.assertIn("world_rule_violation_rate_above_threshold", result.blocking_issues)


if __name__ == "__main__":
    unittest.main()
