from __future__ import annotations

import unittest

from alpha_sre.events import Command, Event
from alpha_sre.incident import IncidentActionItem, IncidentReport
from alpha_sre.integration import IntegrationBridge, ReadRequest, WriteBackRequest
from alpha_sre.replay import ReplayEngine, ReplaySession
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


class IntegrationBridgeTests(unittest.TestCase):
    def test_export_incident_accepts_valid_report(self):
        bridge = IntegrationBridge()
        report = IncidentReport(
            incident_id="inc-1",
            title="valid incident export",
            severity="medium",
            status="open",
            date_opened="2026-05-06",
            incident_owner="editor-1",
            locked_command_id="cmd1",
            pre_state_snapshot_id="s1",
            suspected_failure_classification="mechanism_missing",
            required_regression_test="replay_regression::chapter_outcome_requires_prerequisite",
            evidence_location="replays/inc-1-bundle.json",
            evidence_references=("event:e1", "command:cmd1"),
            action_items=(
                IncidentActionItem(
                    action="add regression test",
                    owner="Codex",
                    layer="baseline",
                    status="open",
                ),
            ),
        )
        result = bridge.export_incident(
            bridge.incident_export_request_cls(
                report=report,
                artifact_reference="incidents/inc-1.json",
                source_system="alpha-sre",
            )
        )
        self.assertTrue(result.ok)
        self.assertEqual(result.incident_id, "inc-1")
        self.assertEqual(result.failure_classification, "mechanism_missing")
        self.assertIn("event:e1", result.replay_references)

    def test_export_incident_rejects_invalid_report(self):
        bridge = IntegrationBridge()
        report = IncidentReport(
            incident_id="inc-2",
            title="invalid incident export",
            severity="high",
            status="open",
            date_opened="2026-05-06",
            incident_owner="editor-1",
            locked_command_id="",
            pre_state_snapshot_id="",
            evidence_references=(),
        )
        result = bridge.export_incident(
            bridge.incident_export_request_cls(
                report=report,
                artifact_reference="incidents/inc-2.json",
                source_system="alpha-sre",
            )
        )
        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code == "missing_locked_command_id" for issue in result.issues))

    def test_read_snapshot_validates_versions(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        ok = bridge.read_snapshot(ReadRequest(expected_state_identity="state-1", expected_schema_version="1.0", expected_visibility_version="v1"), snapshot)
        self.assertTrue(ok.ok)
        self.assertIsNotNone(ok.snapshot)

        mismatch = bridge.read_snapshot(ReadRequest(expected_schema_version="2.0"), snapshot)
        self.assertFalse(mismatch.ok)
        self.assertTrue(any(issue.code == "schema_version_mismatch" for issue in mismatch.issues))

    def test_read_snapshot_accepts_minor_schema_upgrade(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        upgraded = NarrativeSnapshot(
            snapshot_id=snapshot.snapshot_id,
            state_identity=snapshot.state_identity,
            schema_version="1.1",
            policy_version=snapshot.policy_version,
            visibility_version=snapshot.visibility_version,
            created_at=snapshot.created_at,
            characters=snapshot.characters,
        )
        ok = bridge.read_snapshot(ReadRequest(expected_schema_version="1.0"), upgraded)
        self.assertTrue(ok.ok)

    def test_read_snapshot_returns_defensive_copy(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()

        result = bridge.read_snapshot(ReadRequest(expected_schema_version="1.0"), snapshot)

        self.assertTrue(result.ok)
        self.assertIsNotNone(result.snapshot)
        self.assertEqual(result.snapshot.characters["c1"].current_goal, "find truth")

        snapshot.characters["c1"] = CharacterState(
            **{**snapshot.characters["c1"].__dict__, "current_goal": "mutated after read"}
        )

        self.assertEqual(result.snapshot.characters["c1"].current_goal, "find truth")

    def test_read_snapshot_rejects_older_schema_than_expected(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        mismatch = bridge.read_snapshot(ReadRequest(expected_schema_version="1.1"), snapshot)
        self.assertFalse(mismatch.ok)
        self.assertTrue(any(issue.code == "schema_version_mismatch" for issue in mismatch.issues))

    def test_read_snapshot_rejects_snapshot_with_dangling_reference(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        broken = snapshot.clone()
        broken.characters["c1"] = CharacterState(
            **{**broken.characters["c1"].__dict__, "relationship_links": ["rel-missing"]}
        )

        mismatch = bridge.read_snapshot(ReadRequest(expected_schema_version="1.0"), broken)

        self.assertFalse(mismatch.ok)
        self.assertTrue(any(issue.code == "dangling_character_relationship" for issue in mismatch.issues))

    def test_write_back_allows_authorized_update(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        events = (
            Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
        )
        result = bridge.write_back(
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
        )
        self.assertTrue(result.ok)
        self.assertTrue(result.gate.allowed)
        self.assertEqual(result.replay.state.characters["c1"].current_goal, "protect ally")
        self.assertEqual(result.metrics.write_back_success_rate, 1.0)
        self.assertEqual(result.metrics.write_back_omission_rate, 0.0)
        self.assertEqual(result.metrics.memory_omission_rate, 0.0)
        self.assertGreater(result.metrics.edit_amplitude, 0.0)
        self.assertEqual(result.metrics.plot_inconsistency_rate, 0.0)
        self.assertEqual(result.metrics.world_rule_violation_rate, 0.0)

    def test_write_back_accepts_minor_schema_upgrade(self):
        bridge = IntegrationBridge()
        snapshot = NarrativeSnapshot(
            snapshot_id="s1",
            state_identity="state-1",
            schema_version="1.1",
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
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        result = bridge.write_back(
            WriteBackRequest(
                command=command,
                snapshot=snapshot,
                events=(
                    Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
                ),
                source_system="alpha-autopilot",
                actor="editor-1",
                expected_policy_version="p1",
                expected_visibility_version="v1",
                expected_schema_version="1.0",
            )
        )
        self.assertTrue(result.ok)
        self.assertEqual(result.replay.state.characters["c1"].current_goal, "protect ally")

    def test_write_back_metrics_include_snapshot_freshness(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:02:00Z")
        result = bridge.write_back(
            WriteBackRequest(
                command=command,
                snapshot=snapshot,
                events=(
                    Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:02:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
                ),
                source_system="alpha-autopilot",
                actor="editor-1",
                expected_policy_version="p1",
                expected_visibility_version="v1",
                expected_schema_version="1.0",
            )
        )
        self.assertEqual(result.metrics.snapshot_freshness, 120.0)

    def test_write_back_blocks_contract_mismatch(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        result = bridge.write_back(
            WriteBackRequest(
                command=command,
                snapshot=snapshot,
                events=(),
                source_system="alpha-autopilot",
                actor="editor-1",
                expected_policy_version="p2",
                expected_visibility_version="v1",
                expected_schema_version="1.0",
            )
        )
        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code == "policy_version_mismatch" for issue in result.issues))

    def test_write_back_blocks_gate_violation(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        result = bridge.write_back(
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
        )
        self.assertFalse(result.ok)
        self.assertFalse(result.gate.allowed)
        self.assertTrue(any(code == "missing_precondition" for code in result.gate.blocking_issues))
        self.assertEqual(result.metrics.write_back_success_rate, 0.0)

    def test_build_release_attempt_record_captures_manual_rollback(self):
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
        self.assertEqual(attempt.attempt_id, "rel-1")
        self.assertEqual(attempt.triggering_command_id, "cmd1")
        self.assertFalse(attempt.write_back_ok)
        self.assertTrue(attempt.manual_rollback_performed)
        self.assertEqual(attempt.rollback_reason, "operator reverted pending publish")
        self.assertEqual(attempt.incident_id, "inc-1")
        self.assertEqual(attempt.derived_from_attempt_id, "rel-0")

    def test_replay_session_accepts_compatible_schema_version(self):
        snapshot = NarrativeSnapshot(
            snapshot_id="s1",
            state_identity="state-1",
            schema_version="1.1",
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
        session = ReplaySession(
            target_command=Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            ordered_event_chain=(
                Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
            ),
            pre_state_snapshot=snapshot,
            policy_version="p1",
            prompt_version="chapter-intent-v1",
            replay_operator_id="replay-op-1",
            visibility_snapshot_version="v1",
            narrative_state_schema_version="1.0",
        )
        result = ReplayEngine().replay_session(session)
        self.assertTrue(result.ok)

    def test_drift_report_ignores_intended_state_change(self):
        bridge = IntegrationBridge()
        snapshot = make_snapshot()
        replay = ReplayEngine().replay(
            Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z"),
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        drift = bridge.build_drift_report(snapshot, replay)
        self.assertFalse(drift.drifted)


if __name__ == "__main__":
    unittest.main()
