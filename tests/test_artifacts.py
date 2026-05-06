from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from alpha_sre.artifacts import JsonArtifactStore, ReplayBundle
from alpha_sre.events import Command, Event
from alpha_sre.incident import IncidentActionItem, IncidentReport
from alpha_sre.integration import IntegrationBridge, WriteBackRequest
from alpha_sre.metrics import MetricSummary
from alpha_sre.replay import ObservationFrame, ReplayEngine, ReplaySession
from alpha_sre.review import NarrativeQualityReviewRecord
from alpha_sre.state import CharacterState, MemoryState, NarrativeSnapshot, VisibilityScope


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


class ArtifactStoreTests(unittest.TestCase):
    def test_incident_report_from_replay_bundle_captures_replay_evidence(self):
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        replay_result = ReplayEngine().replay(
            command,
            snapshot,
            [Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {})],
        )
        bundle = ReplayBundle(
            command=command,
            snapshot=snapshot,
            events=(Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {}),),
            replay=replay_result,
            gate=IntegrationBridge()._gate.evaluate(replay_result),
            metrics=IntegrationBridge().write_back(
                WriteBackRequest(
                    command=command,
                    snapshot=snapshot,
                    events=(Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {}),),
                    source_system="alpha-autopilot",
                    actor="editor-1",
                    expected_policy_version="p1",
                    expected_visibility_version="v1",
                    expected_schema_version="1.0",
                )
            ).metrics,
            drift_report=IntegrationBridge().build_drift_report(snapshot, replay_result),
        )

        report = IncidentReport.from_replay_bundle(
            incident_id="inc-1",
            title="chapter outcome missing prerequisite",
            severity="high",
            status="open",
            date_opened="2026-05-06",
            incident_owner="editor-1",
            replay_bundle_reference="replays/inc-1-bundle.json",
            bundle=bundle,
            affected_workflow="publication",
            observable_failure="chapter outcome was generated without a prerequisite",
            detection_source="gate",
            rollback_triggered=True,
            rollback_trigger="missing_precondition",
            rollback_action_taken="reverted pending write-back",
            primary_cause="causal prerequisite was absent",
        )

        self.assertEqual(report.suspected_failure_classification, "mechanism_missing")
        self.assertEqual(report.required_regression_test, "replay_regression::chapter_outcome_requires_prerequisite")
        self.assertEqual(report.evidence_location, "replays/inc-1-bundle.json")
        self.assertIn("event:e1", report.evidence_references)
        self.assertTrue(report.validate().ok)

    def test_bundle_round_trip_preserves_replay_session(self):
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        session = ReplaySession(
            target_command=command,
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
                allowed_event_types=("update_goal",),
                blocked_event_types=(),
                active_world_rule_ids=(),
                retrieval_context_hash="retrieval-v1",
                prompt_context_hash="prompt-v1",
                write_back_decision_trace_id="trace-1",
            ),
            evidence_references=("bundle:session-1",),
        )
        replay_result = ReplayEngine().replay_session(session)
        bundle = ReplayBundle(
            command=command,
            snapshot=snapshot,
            events=session.ordered_event_chain,
            replay=replay_result,
            gate=IntegrationBridge()._gate.evaluate(replay_result),
            metrics=IntegrationBridge().write_back(
                WriteBackRequest(
                    command=command,
                    snapshot=snapshot,
                    events=session.ordered_event_chain,
                    source_system="alpha-autopilot",
                    actor="editor-1",
                    expected_policy_version="p1",
                    expected_visibility_version="v1",
                    expected_schema_version="1.0",
                )
            ).metrics,
            drift_report=IntegrationBridge().build_drift_report(snapshot, replay_result),
            session=session,
        )

        with tempfile.TemporaryDirectory(dir="D:/tmp") as tmp:
            store = JsonArtifactStore(Path(tmp))
            store.save_bundle("replays/session_bundle.json", bundle)
            loaded = store.load_bundle("replays/session_bundle.json")

        self.assertIsNotNone(loaded.session)
        self.assertEqual(loaded.session.observation_frame.replay_id, "replay-1")
        rerun = ReplayEngine().replay_session(loaded.session)
        self.assertTrue(rerun.ok)
        self.assertIn("replay:replay-1", rerun.evidence_references)

    def test_bundle_round_trip_preserves_causal_findings(self):
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        replay_result = ReplayEngine().replay(
            command,
            snapshot,
            [Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {})],
        )
        bundle = ReplayBundle(
            command=command,
            snapshot=snapshot,
            events=(Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {}),),
            replay=replay_result,
            gate=IntegrationBridge()._gate.evaluate(replay_result),
            metrics=IntegrationBridge().write_back(
                WriteBackRequest(
                    command=command,
                    snapshot=snapshot,
                    events=(Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {}),),
                    source_system="alpha-autopilot",
                    actor="editor-1",
                    expected_policy_version="p1",
                    expected_visibility_version="v1",
                    expected_schema_version="1.0",
                )
            ).metrics,
            drift_report=IntegrationBridge().build_drift_report(snapshot, replay_result),
        )

        with tempfile.TemporaryDirectory(dir="D:/tmp") as tmp:
            store = JsonArtifactStore(Path(tmp))
            store.save_bundle("replays/causal_findings_bundle.json", bundle)
            loaded = store.load_bundle("replays/causal_findings_bundle.json")

        self.assertFalse(loaded.replay.ok)
        self.assertEqual(loaded.replay.causal_validation.findings[0].failure_class, "missing_precondition")
        self.assertEqual(
            loaded.replay.causal_validation.findings[0].recommended_regression_test,
            "replay_regression::chapter_outcome_requires_prerequisite",
        )

    def test_store_round_trip_preserves_incident_report(self):
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        replay_result = ReplayEngine().replay(
            command,
            snapshot,
            [Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {})],
        )
        bundle = ReplayBundle(
            command=command,
            snapshot=snapshot,
            events=(Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {}),),
            replay=replay_result,
            gate=IntegrationBridge()._gate.evaluate(replay_result),
            metrics=IntegrationBridge().write_back(
                WriteBackRequest(
                    command=command,
                    snapshot=snapshot,
                    events=(Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {}),),
                    source_system="alpha-autopilot",
                    actor="editor-1",
                    expected_policy_version="p1",
                    expected_visibility_version="v1",
                    expected_schema_version="1.0",
                )
            ).metrics,
            drift_report=IntegrationBridge().build_drift_report(snapshot, replay_result),
        )
        report = IncidentReport.from_replay_bundle(
            incident_id="inc-2",
            title="incident export round-trip",
            severity="medium",
            status="open",
            date_opened="2026-05-06",
            incident_owner="editor-1",
            replay_bundle_reference="replays/inc-2-bundle.json",
            bundle=bundle,
            action_items=(
                IncidentActionItem(
                    action="add regression test",
                    owner="Codex",
                    layer="baseline",
                    due_date="2026-05-07",
                    status="open",
                ),
            ),
        )

        with tempfile.TemporaryDirectory(dir="D:/tmp") as tmp:
            store = JsonArtifactStore(Path(tmp))
            saved = store.save_incident_report("incidents/inc-2.json", report)
            loaded = store.load_incident_report("incidents/inc-2.json")
            self.assertTrue(saved.exists())

        self.assertEqual(loaded.incident_id, "inc-2")
        self.assertEqual(loaded.required_regression_test, "replay_regression::chapter_outcome_requires_prerequisite")
        self.assertEqual(loaded.action_items[0].action, "add regression test")
        self.assertTrue(loaded.validate().ok)

    def test_bundle_round_trip_preserves_extended_metric_fields(self):
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        replay_result = ReplayEngine().replay(
            command,
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        bundle = ReplayBundle(
            command=command,
            snapshot=snapshot,
            events=(Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),),
            replay=replay_result,
            gate=IntegrationBridge()._gate.evaluate(replay_result),
            metrics=MetricSummary(
                trace_completeness=1.0,
                causality_break_rate=0.0,
                visibility_leak_rate=0.0,
                replay_availability=1.0,
                causal_attribution_coverage=1.0,
                rule_drift_rate=0.0,
                write_back_success_rate=1.0,
                same_class_failure_rate=0.0,
                incident_recurrence_rate=0.25,
                replay_confirmed_regression_rate=0.5,
                version_lock_success_rate=0.75,
                alarm_trigger_rate=0.25,
                snapshot_freshness=300.0,
                write_back_omission_rate=0.125,
                memory_omission_rate=0.25,
                manual_rollback_rate=0.5,
                edit_amplitude=0.75,
                plot_inconsistency_rate=0.125,
                second_generation_rate=0.4,
                character_ooc_rate=0.2,
                world_rule_violation_rate=0.3,
                foreshadowing_payoff_rate=0.8,
            ),
            drift_report=IntegrationBridge().build_drift_report(snapshot, replay_result),
        )
        with tempfile.TemporaryDirectory(dir="D:/tmp") as tmp:
            store = JsonArtifactStore(Path(tmp))
            store.save_bundle("replays/metric_bundle.json", bundle)
            loaded = store.load_bundle("replays/metric_bundle.json")
        self.assertEqual(loaded.metrics.version_lock_success_rate, 0.75)
        self.assertEqual(loaded.metrics.alarm_trigger_rate, 0.25)
        self.assertEqual(loaded.metrics.snapshot_freshness, 300.0)
        self.assertEqual(loaded.metrics.write_back_omission_rate, 0.125)
        self.assertEqual(loaded.metrics.memory_omission_rate, 0.25)
        self.assertEqual(loaded.metrics.manual_rollback_rate, 0.5)
        self.assertEqual(loaded.metrics.edit_amplitude, 0.75)
        self.assertEqual(loaded.metrics.plot_inconsistency_rate, 0.125)
        self.assertEqual(loaded.metrics.second_generation_rate, 0.4)
        self.assertEqual(loaded.metrics.character_ooc_rate, 0.2)
        self.assertEqual(loaded.metrics.world_rule_violation_rate, 0.3)
        self.assertEqual(loaded.metrics.foreshadowing_payoff_rate, 0.8)

    def test_bundle_round_trip(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        result = bridge.write_back(
            WriteBackRequest(
                command=command,
                snapshot=snapshot,
                events=(Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),),
                source_system="alpha-autopilot",
                actor="editor-1",
                expected_policy_version="p1",
                expected_visibility_version="v1",
                expected_schema_version="1.0",
            )
        )
        bundle = ReplayBundle(
            command=command,
            snapshot=snapshot,
            events=(
                Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
            ),
            replay=result.replay,
            gate=result.gate,
            metrics=result.metrics,
            drift_report=result.drift_report,
        )
        with tempfile.TemporaryDirectory(dir="D:/tmp") as tmp:
            store = JsonArtifactStore(Path(tmp))
            saved = store.save_bundle("replays/bundle.json", bundle)
            loaded = store.load_bundle("replays/bundle.json")
            self.assertTrue(saved.exists())
        self.assertEqual(loaded.command.command_id, "cmd1")
        self.assertEqual(loaded.replay.state.characters["c1"].current_goal, "protect ally")
        self.assertFalse(loaded.drift_report.drifted)

    def test_store_rejects_path_escape(self):
        with tempfile.TemporaryDirectory(dir="D:/tmp") as tmp:
            store = JsonArtifactStore(Path(tmp))
            replay_result = IntegrationBridge().write_back(
                WriteBackRequest(
                    command=Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
                    snapshot=make_snapshot(),
                    events=(),
                    source_system="alpha-autopilot",
                    actor="editor-1",
                    expected_policy_version="p1",
                    expected_visibility_version="v1",
                    expected_schema_version="1.0",
                )
            )
            with self.assertRaises(ValueError):
                store.save_bundle("../escape.json", ReplayBundle(
                    command=Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
                    snapshot=make_snapshot(),
                    events=(),
                    replay=replay_result.replay,
                    gate=replay_result.gate,
                    metrics=replay_result.metrics,
                    drift_report=replay_result.drift_report,
                ))

    def test_loaded_bundle_events_can_be_replayed_again(self):
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        memory = MemoryState(
            memory_id="m1",
            owning_character_id="c1",
            memory_claim="ally is hidden",
            confidence_level=0.9,
            source_event_id="e1",
            retention_status="active",
        )
        events = (
            Event("e1", "cmd1", "add_memory", 1, "2026-05-06T00:00:01Z", "1", {"memory_id": "m1", "memory": memory}),
            Event("e2", "cmd1", "reveal", 2, "2026-05-06T00:00:02Z", "1", {"memory_id": "m1"}),
        )
        replay_result = ReplayEngine().replay(command, snapshot, list(events))
        bundle = ReplayBundle(
            command=command,
            snapshot=snapshot,
            events=events,
            replay=replay_result,
            gate=IntegrationBridge()._gate.evaluate(replay_result),
            metrics=IntegrationBridge().write_back(
                WriteBackRequest(
                    command=command,
                    snapshot=snapshot,
                    events=events,
                    source_system="alpha-autopilot",
                    actor="editor-1",
                    expected_policy_version="p1",
                    expected_visibility_version="v1",
                    expected_schema_version="1.0",
                )
            ).metrics,
            drift_report=IntegrationBridge().build_drift_report(snapshot, replay_result),
        )

        with tempfile.TemporaryDirectory(dir="D:/tmp") as tmp:
            store = JsonArtifactStore(Path(tmp))
            store.save_bundle("replays/replayable_bundle.json", bundle)
            loaded = store.load_bundle("replays/replayable_bundle.json")

        self.assertEqual(loaded.replay.checked_write_back_count, 3)
        self.assertEqual(loaded.replay.omitted_write_back_count, 0)
        self.assertEqual(loaded.replay.checked_memory_reference_count, 1)
        self.assertEqual(loaded.replay.omitted_memory_reference_count, 0)
        rerun = ReplayEngine().replay(loaded.command, loaded.snapshot, list(loaded.events))
        self.assertTrue(rerun.ok)
        self.assertIn("memory_added:m1", rerun.diffs)

    def test_store_round_trip_preserves_release_attempt_record(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        request = WriteBackRequest(
            command=command,
            snapshot=snapshot,
            events=(Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {}),),
            source_system="alpha-autopilot",
            actor="editor-1",
            expected_policy_version="p1",
            expected_visibility_version="v1",
            expected_schema_version="1.0",
        )
        result = bridge.write_back(request)
        attempt = bridge.build_release_attempt_record(
            request,
            result,
            attempt_id="rel-1",
            manual_rollback_performed=True,
            rollback_reason="operator reverted pending publish",
            incident_id="inc-1",
            derived_from_attempt_id="rel-0",
        )

        with tempfile.TemporaryDirectory(dir="D:/tmp") as tmp:
            store = JsonArtifactStore(Path(tmp))
            saved = store.save_release_attempt_record("releases/rel-1.json", attempt)
            loaded = store.load_release_attempt_record("releases/rel-1.json")
            self.assertTrue(saved.exists())

        self.assertEqual(loaded.attempt_id, "rel-1")
        self.assertTrue(loaded.manual_rollback_performed)
        self.assertEqual(loaded.rollback_reason, "operator reverted pending publish")
        self.assertEqual(loaded.incident_id, "inc-1")
        self.assertEqual(loaded.derived_from_attempt_id, "rel-0")

    def test_store_round_trip_preserves_quality_review_record(self):
        review = NarrativeQualityReviewRecord(
            review_id="review-1",
            source_artifact_reference="reviews/review-1.json",
            checked_segment_count=4,
            ooc_incident_count=1,
            checked_scene_count=2,
            world_rule_violation_count=1,
            introduced_setup_item_count=3,
            resolved_setup_item_count=2,
            evidence_references=("event:e1",),
        )

        with tempfile.TemporaryDirectory(dir="D:/tmp") as tmp:
            store = JsonArtifactStore(Path(tmp))
            saved = store.save_quality_review_record("reviews/review-1.json", review)
            loaded = store.load_quality_review_record("reviews/review-1.json")
            self.assertTrue(saved.exists())

        self.assertEqual(loaded.review_id, "review-1")
        self.assertEqual(loaded.checked_segment_count, 4)
        self.assertEqual(loaded.world_rule_violation_count, 1)
        self.assertEqual(loaded.resolved_setup_item_count, 2)


if __name__ == "__main__":
    unittest.main()
