from __future__ import annotations

import unittest

from alpha_sre.events import Command, Event
from alpha_sre.gate import ConsistencyGate
from alpha_sre.metrics import MetricSummary, compute_metrics
from alpha_sre.replay import ObservationFrame, ReplayEngine, ReplaySession
from alpha_sre.state import (
    BeliefState,
    CapabilityState,
    CharacterState,
    FactState,
    MemoryState,
    NarrativeSnapshot,
    PlotThreadState,
    VisibilityEdgeState,
    VisibilityScope,
    WorldRuleState,
)


def command() -> Command:
    return Command("cmd-v2", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")


def base_snapshot(**overrides) -> NarrativeSnapshot:
    data = {
        "snapshot_id": "s-v2-pre",
        "state_identity": "state-v2",
        "schema_version": "1.0",
        "policy_version": "p1",
        "visibility_version": "v2",
        "created_at": "2026-05-06T00:00:00Z",
        "characters": {
            "c1": CharacterState(
                character_id="c1",
                role_name="protagonist",
                current_goal="find truth",
                emotional_state="focused",
                knowledge_scope=VisibilityScope.CHARACTER_LOCAL,
            )
        },
    }
    data.update(overrides)
    return NarrativeSnapshot(**data)


def frame(**overrides) -> ObservationFrame:
    data = {
        "replay_id": "replay-v2",
        "at_causal_order_index": 1,
        "pov_actor_id": "c1",
        "input_snapshot_id": "s-v2-pre",
        "visible_fact_ids": (),
        "hidden_fact_ids": (),
        "believed_fact_ids": (),
        "accessible_memory_ids": (),
        "allowed_event_types": ("update_goal", "chapter_outcome"),
        "blocked_event_types": (),
        "active_world_rule_ids": (),
        "retrieval_context_hash": "retrieval-v2",
        "prompt_context_hash": "prompt-v2",
        "write_back_decision_trace_id": "trace-v2",
    }
    data.update(overrides)
    return ObservationFrame(**data)


class ReplaySemanticTests(unittest.TestCase):
    def test_failed_replay_result_keeps_frozen_snapshot_evidence(self):
        snapshot = base_snapshot()
        result = ReplayEngine().replay(command(), snapshot, [])

        self.assertFalse(result.ok)
        self.assertEqual(result.state.characters["c1"].current_goal, "find truth")

        snapshot.characters["c1"] = CharacterState(
            **{**snapshot.characters["c1"].__dict__, "current_goal": "mutated after replay"}
        )

        self.assertEqual(result.state.characters["c1"].current_goal, "find truth")

    def test_locked_post_state_mismatch_reports_structured_diff(self):
        pre = base_snapshot()
        post = base_snapshot(
            snapshot_id="s-v2-post",
            characters={
                "c1": CharacterState(
                    character_id="c1",
                    role_name="protagonist",
                    current_goal="walk away",
                    emotional_state="focused",
                    knowledge_scope=VisibilityScope.CHARACTER_LOCAL,
                )
            },
        )
        session = ReplaySession(
            target_command=command(),
            ordered_event_chain=(
                Event("e1", "cmd-v2", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
            ),
            pre_state_snapshot=pre,
            post_state_snapshot=post,
            policy_version="p1",
            prompt_version="chapter-intent-v2",
            replay_operator_id="replay-op-1",
            visibility_snapshot_version="v2",
            narrative_state_schema_version="1.0",
            observation_frame=frame(at_causal_order_index=1),
        )

        result = ReplayEngine().replay_session(session)

        self.assertFalse(result.ok)
        self.assertEqual(result.failure_classification, "post_state_mismatch")
        self.assertTrue(any(issue.code == "post_state_mismatch" for issue in result.issues))
        self.assertIn("characters.c1.current_goal", result.post_state_diff)
        self.assertGreater(result.checked_post_state_surface_count, 0)
        self.assertEqual(result.mismatched_post_state_surface_count, len(result.post_state_diff))

    def test_hidden_fact_leak_uses_visibility_graph_and_fact_evidence(self):
        snapshot = base_snapshot(
            facts={
                "f-secret": FactState(
                    fact_id="f-secret",
                    fact_text="the heir is hidden in the archive",
                    fact_type="world",
                    introduced_by_event_id="e-secret",
                    valid_from_event_id="e-secret",
                    valid_until_event_id=None,
                    canonical_truth_status="true",
                    related_character_ids=["c1"],
                )
            },
            visibility_edges={
                "vis-secret-c1": VisibilityEdgeState(
                    visibility_edge_id="vis-secret-c1",
                    fact_id="f-secret",
                    viewer_id="c1",
                    visibility_status="hidden",
                    visibility_source="sealed archive",
                    valid_from_event_id="e-secret",
                    valid_until_event_id=None,
                )
            },
        )
        session = ReplaySession(
            target_command=command(),
            ordered_event_chain=(
                Event("e0", "cmd-v2", "update_goal", 0, "2026-05-06T00:00:00Z", "1", {"character_id": "c1", "current_goal": "search"}),
                Event("e1", "cmd-v2", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {"actor_id": "c1", "prerequisite_event_id": "e0", "knowledge_fact_id": "f-secret"}),
            ),
            pre_state_snapshot=snapshot,
            policy_version="p1",
            prompt_version="chapter-intent-v2",
            replay_operator_id="replay-op-1",
            visibility_snapshot_version="v2",
            narrative_state_schema_version="1.0",
            observation_frame=frame(hidden_fact_ids=("f-secret",)),
        )

        result = ReplayEngine().replay_session(session)

        self.assertFalse(result.ok)
        self.assertEqual(result.failure_classification, "visibility_leak")
        self.assertTrue(any(issue.code == "visibility_leak" for issue in result.issues))
        self.assertIn("fact:f-secret", result.evidence_references)

    def test_false_belief_is_not_classified_as_visibility_leak(self):
        snapshot = base_snapshot(
            facts={
                "f-door-closed": FactState("f-door-closed", "the door is closed", "world", "e0", "e0", None, "true", ["c1"], []),
                "f-door-open": FactState("f-door-open", "the door is open", "world", "e-rumor", "e-rumor", None, "false", ["c1"], []),
            },
            beliefs={
                "b-door-open": BeliefState(
                    belief_id="b-door-open",
                    holder_character_id="c1",
                    fact_id="f-door-open",
                    belief_status="certain",
                    confidence=0.8,
                    derived_from_event_id="e-rumor",
                    contradicts_fact_id="f-door-closed",
                )
            },
            visibility_edges={
                "vis-door-open-c1": VisibilityEdgeState("vis-door-open-c1", "f-door-open", "c1", "visible", "rumor", "e-rumor", None)
            },
        )
        session = ReplaySession(
            target_command=command(),
            ordered_event_chain=(
                Event("e0", "cmd-v2", "update_goal", 0, "2026-05-06T00:00:00Z", "1", {"character_id": "c1", "current_goal": "enter"}),
                Event("e1", "cmd-v2", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {"actor_id": "c1", "prerequisite_event_id": "e0", "belief_id": "b-door-open"}),
            ),
            pre_state_snapshot=snapshot,
            policy_version="p1",
            prompt_version="chapter-intent-v2",
            replay_operator_id="replay-op-1",
            visibility_snapshot_version="v2",
            narrative_state_schema_version="1.0",
            observation_frame=frame(visible_fact_ids=("f-door-open",), believed_fact_ids=("f-door-open",)),
        )

        result = ReplayEngine().replay_session(session)

        self.assertFalse(result.ok)
        self.assertEqual(result.failure_classification, "belief_conflict")
        self.assertTrue(any(issue.code == "belief_conflict" for issue in result.issues))
        self.assertFalse(any(issue.code == "visibility_leak" for issue in result.issues))

    def test_capability_violation_uses_persisted_action_boundary(self):
        snapshot = base_snapshot(
            capabilities={
                "cap-no-teleport": CapabilityState(
                    "cap-no-teleport",
                    "c1",
                    "teleport",
                    False,
                    None,
                    None,
                    "e-rule",
                    None,
                )
            }
        )
        result = ReplayEngine().replay(
            command(),
            snapshot,
            [
                Event(
                    "e1",
                    "cmd-v2",
                    "update_goal",
                    1,
                    "2026-05-06T00:00:01Z",
                    "1",
                    {"character_id": "c1", "actor_id": "c1", "action_type": "teleport", "current_goal": "cross the vault"},
                )
            ],
        )

        self.assertFalse(result.ok)
        self.assertEqual(result.failure_classification, "capability_violation")
        self.assertTrue(any(issue.code == "capability_violation" for issue in result.issues))

    def test_inactive_world_rule_use_is_rejected(self):
        snapshot = base_snapshot(
            world_rules={
                "r-phase": WorldRuleState(
                    rule_id="r-phase",
                    rule_text="phase travel is possible",
                    domain="movement",
                    enforcement_strength="soft",
                    provenance_source="draft note",
                    activation_status="inactive",
                )
            }
        )
        result = ReplayEngine().replay_session(
            ReplaySession(
                target_command=command(),
                ordered_event_chain=(
                    Event("e0", "cmd-v2", "update_goal", 0, "2026-05-06T00:00:00Z", "1", {"character_id": "c1", "current_goal": "escape"}),
                    Event("e1", "cmd-v2", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {"actor_id": "c1", "prerequisite_event_id": "e0", "required_rule_id": "r-phase"}),
                ),
                pre_state_snapshot=snapshot,
                policy_version="p1",
                prompt_version="chapter-intent-v2",
                replay_operator_id="replay-op-1",
                visibility_snapshot_version="v2",
                narrative_state_schema_version="1.0",
                observation_frame=frame(active_world_rule_ids=()),
            )
        )

        self.assertFalse(result.ok)
        self.assertEqual(result.failure_classification, "inactive_rule_use")
        self.assertTrue(any(issue.code == "inactive_rule_use" for issue in result.issues))

    def test_add_memory_accepts_payload_object_without_top_level_memory_id(self):
        snapshot = base_snapshot()
        memory = MemoryState(
            memory_id="m-direct",
            owning_character_id="c1",
            memory_claim="the vault was seen open yesterday",
            confidence_level=0.9,
            source_event_id="e-memory",
            retention_status="active",
        )

        result = ReplayEngine().replay(
            command(),
            snapshot,
            [
                Event("e1", "cmd-v2", "add_memory", 1, "2026-05-06T00:00:01Z", "1", {"memory": memory}),
            ],
        )

        self.assertTrue(result.ok)
        self.assertIn("memories.m-direct", result.state_diff)
        self.assertIn("m-direct", result.state.characters["c1"].memory_references)

    def test_world_rule_update_accepts_payload_object_without_top_level_rule_id(self):
        snapshot = base_snapshot()
        world_rule = WorldRuleState(
            rule_id="r-direct",
            rule_text="phase travel is possible",
            domain="movement",
            enforcement_strength="soft",
            provenance_source="draft note",
        )

        result = ReplayEngine().replay(
            command(),
            snapshot,
            [
                Event(
                    "e1",
                    "cmd-v2",
                    "world_rule_update",
                    1,
                    "2026-05-06T00:00:01Z",
                    "1",
                    {"authority": "authorized", "world_rule": world_rule},
                ),
            ],
        )

        self.assertTrue(result.ok)
        self.assertIn("world_rules.r-direct", result.constraint_diff)
        self.assertEqual(result.state.world_rules["r-direct"].rule_text, "phase travel is possible")

    def test_plot_obligation_created_but_not_discharged_blocks_gate(self):
        snapshot = base_snapshot(
            plot_threads={
                "pt-payoff": PlotThreadState(
                    thread_id="pt-payoff",
                    thread_type="obligation",
                    status="open",
                    introduced_by_event_id="e-setup",
                    required_payoff_by="e1",
                    affected_characters=["c1"],
                )
            }
        )
        result = ReplayEngine().replay_session(
            ReplaySession(
                target_command=command(),
                ordered_event_chain=(
                    Event("e0", "cmd-v2", "update_goal", 0, "2026-05-06T00:00:00Z", "1", {"character_id": "c1", "current_goal": "wait"}),
                    Event("e1", "cmd-v2", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {"actor_id": "c1", "prerequisite_event_id": "e0", "plot_thread_id": "pt-payoff", "plot_obligation_due": True}),
                ),
                pre_state_snapshot=snapshot,
                policy_version="p1",
                prompt_version="chapter-intent-v2",
                replay_operator_id="replay-op-1",
                visibility_snapshot_version="v2",
                narrative_state_schema_version="1.0",
                observation_frame=frame(),
            )
        )
        metrics = compute_metrics([result], [result.causal_validation])
        gate_result = ConsistencyGate().evaluate(result, metrics)

        self.assertFalse(result.ok)
        self.assertEqual(result.failure_classification, "plot_obligation_missed")
        self.assertTrue(any(issue.code == "plot_obligation_missed" for issue in result.issues))
        self.assertEqual(metrics.plot_obligation_miss_rate, 1.0)
        self.assertFalse(gate_result.allowed)
        self.assertIn("plot_obligation_miss_rate_above_threshold", gate_result.blocking_issues)

    def test_plot_obligation_miss_can_be_soft_gated(self):
        replay = ReplayEngine().replay(
            command(),
            base_snapshot(),
            [Event("e1", "cmd-v2", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "wait"})],
        )
        metrics = MetricSummary(
            trace_completeness=1.0,
            causality_break_rate=0.0,
            visibility_leak_rate=0.0,
            replay_availability=1.0,
            plot_obligation_miss_rate=1.0,
        )

        gate_result = ConsistencyGate(plot_obligation_miss_blocks=False).evaluate(replay, metrics)

        self.assertTrue(gate_result.allowed)
        self.assertIn("plot_obligation_miss_rate_above_threshold", gate_result.warnings)


if __name__ == "__main__":
    unittest.main()
