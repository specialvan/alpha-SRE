from __future__ import annotations

import unittest

from alpha_sre.causal_validation import validate_causality
from alpha_sre.events import Command, Event
from alpha_sre.gate import GateResult
from alpha_sre.incident import IncidentReport
from alpha_sre.integration import ReleaseAttemptRecord
from alpha_sre.metrics import compute_metrics
from alpha_sre.replay import ObservationFrame, ReplayEngine, ReplayResult, ReplaySession
from alpha_sre.review import NarrativeQualityReviewRecord
from alpha_sre.state import CharacterState, MemoryState, NarrativeSnapshot, RelationshipState, WorldRuleState, VisibilityScope


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
        world_rules={
            "r1": WorldRuleState(
                rule_id="r1",
                rule_text="no teleportation",
                domain="world",
                enforcement_strength="hard",
                provenance_source="author bible",
            )
        },
    )


def make_observation_frame(**overrides) -> ObservationFrame:
    base = {
        "replay_id": "replay-1",
        "at_causal_order_index": 0,
        "pov_actor_id": "c1",
        "input_snapshot_id": "s1",
        "visible_fact_ids": ("character:c1:goal",),
        "hidden_fact_ids": (),
        "believed_fact_ids": ("character:c1:goal",),
        "accessible_memory_ids": (),
        "allowed_event_types": ("update_goal", "chapter_outcome"),
        "blocked_event_types": (),
        "active_world_rule_ids": ("r1",),
        "retrieval_context_hash": "retrieval-v1",
        "prompt_context_hash": "prompt-v1",
        "write_back_decision_trace_id": "trace-1",
    }
    base.update(overrides)
    return ObservationFrame(**base)


class AlphaSreTests(unittest.TestCase):
    def test_replay_session_records_evidence_references(self):
        engine = ReplayEngine()
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
            observation_frame=make_observation_frame(at_causal_order_index=1),
            evidence_references=("bundle:replayable-1",),
        )

        result = engine.replay_session(session)
        self.assertTrue(result.ok)
        self.assertIn("bundle:replayable-1", result.evidence_references)
        self.assertIn("command:cmd1", result.evidence_references)
        self.assertIn("snapshot:s1", result.evidence_references)
        self.assertIn("event:e1", result.evidence_references)
        self.assertIn("replay:replay-1", result.evidence_references)

    def test_replay_session_blocks_hidden_memory_usage(self):
        engine = ReplayEngine()
        base = make_snapshot()
        memory = MemoryState(
            memory_id="m1",
            owning_character_id="c1",
            memory_claim="ally is hidden",
            confidence_level=0.9,
            source_event_id="e0",
            retention_status="active",
        )
        snapshot = NarrativeSnapshot(
            snapshot_id=base.snapshot_id,
            state_identity=base.state_identity,
            schema_version=base.schema_version,
            policy_version=base.policy_version,
            visibility_version=base.visibility_version,
            created_at=base.created_at,
            characters=base.characters,
            world_rules=base.world_rules,
            memories={"m1": memory},
        )
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        session = ReplaySession(
            target_command=command,
            ordered_event_chain=(
                Event("e0", "cmd1", "update_goal", 0, "2026-05-06T00:00:00Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
                Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {"prerequisite_event_id": "e0", "knowledge_memory_id": "m1"}),
            ),
            pre_state_snapshot=snapshot,
            policy_version="p1",
            prompt_version="chapter-intent-v1",
            dependency_contract_versions={"read_api": "1.0"},
            replay_operator_id="replay-op-1",
            visibility_snapshot_version="v1",
            narrative_state_schema_version="1.0",
            observation_frame=make_observation_frame(accessible_memory_ids=(), hidden_fact_ids=("memory:m1",)),
        )

        result = engine.replay_session(session)
        self.assertFalse(result.ok)
        self.assertEqual(result.failure_classification, "visibility_leak")
        self.assertTrue(any(issue.code == "visibility_leak" for issue in result.issues))

    def test_replay_session_marks_blocked_action_as_impossible(self):
        engine = ReplayEngine()
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
            observation_frame=make_observation_frame(
                at_causal_order_index=1,
                allowed_event_types=(),
                blocked_event_types=("update_goal",),
            ),
        )

        result = engine.replay_session(session)
        self.assertFalse(result.ok)
        self.assertEqual(result.failure_classification, "mechanism_missing")
        self.assertTrue(any(issue.code == "impossible_action" for issue in result.issues))

    def test_replay_updates_goal_and_detects_causality(self):
        engine = ReplayEngine()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        events = [
            Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
            Event("e2", "cmd1", "chapter_outcome", 2, "2026-05-06T00:00:02Z", "1", {"prerequisite_event_id": "e1"}),
        ]
        result = engine.replay(command, snapshot, events)
        self.assertTrue(result.ok)
        self.assertEqual(result.state.characters["c1"].current_goal, "protect ally")

    def test_replay_exposes_causal_chain_diff(self):
        engine = ReplayEngine()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        result = engine.replay(
            command,
            snapshot,
            [Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {})],
        )
        self.assertFalse(result.ok)
        self.assertIn("event:e1:missing_precondition", result.causal_chain_diff)

    def test_causal_validation_reports_structured_findings(self):
        snapshot = make_snapshot()
        result = validate_causality(
            snapshot,
            [Event("e1", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {})],
        )
        self.assertFalse(result.ok)
        finding = result.findings[0]
        self.assertEqual(finding.failure_class, "missing_precondition")
        self.assertEqual(finding.offending_event_id, "e1")
        self.assertEqual(finding.missing_prerequisite_or_overwrite_point, "missing_event")
        self.assertEqual(finding.affected_state_field, "events.e1.prerequisite_event_id")
        self.assertEqual(finding.replay_evidence_reference, "event:e1")
        self.assertEqual(
            finding.recommended_regression_test,
            "replay_regression::chapter_outcome_requires_prerequisite",
        )

    def test_visibility_leak_is_reported(self):
        snapshot = make_snapshot()
        events = [
            Event("e1", "cmd1", "reveal", 1, "2026-05-06T00:00:01Z", "1", {"memory_id": "m-missing"}, VisibilityScope.HIDDEN)
        ]
        result = validate_causality(snapshot, events)
        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code in {"missing_precondition", "visibility_leak"} for issue in result.issues))

    def test_metrics_reflect_replay_and_validation(self):
        engine = ReplayEngine()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        good = engine.replay(command, snapshot, [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})])
        bad_validation = validate_causality(snapshot, [Event("e2", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:01Z", "1", {})])
        metrics = compute_metrics([good], [bad_validation])
        self.assertGreaterEqual(metrics.replay_availability, 1.0)
        self.assertGreater(metrics.causality_break_rate, 0.0)

    def test_metrics_include_causal_attribution_coverage(self):
        engine = ReplayEngine()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        good_replay = engine.replay(
            command,
            snapshot,
            [
                Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
                Event("e2", "cmd1", "chapter_outcome", 2, "2026-05-06T00:00:02Z", "1", {"prerequisite_event_id": "e1"}),
            ],
        )
        bad_replay = engine.replay(
            command,
            snapshot,
            [Event("e3", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:03Z", "1", {})],
        )
        good_validation = validate_causality(
            snapshot,
            [
                Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
                Event("e2", "cmd1", "chapter_outcome", 2, "2026-05-06T00:00:02Z", "1", {"prerequisite_event_id": "e1"}),
            ],
        )
        bad_validation = validate_causality(
            snapshot,
            [Event("e3", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:03Z", "1", {})],
        )
        metrics = compute_metrics([good_replay, bad_replay], [good_validation, bad_validation])
        self.assertEqual(metrics.causal_attribution_coverage, 0.5)

    def test_metrics_include_rule_drift_rate(self):
        snapshot = make_snapshot()
        good_validation = validate_causality(
            snapshot,
            [
                Event(
                    "e1",
                    "cmd1",
                    "world_rule_update",
                    1,
                    "2026-05-06T00:00:01Z",
                    "1",
                    {"rule_id": "r2", "authority": "authorized"},
                )
            ],
        )
        bad_validation = validate_causality(
            snapshot,
            [
                Event(
                    "e2",
                    "cmd1",
                    "world_rule_update",
                    1,
                    "2026-05-06T00:00:02Z",
                    "1",
                    {"rule_id": "r3", "authority": "unauthorized"},
                )
            ],
        )
        metrics = compute_metrics([], [good_validation, bad_validation])
        self.assertEqual(metrics.rule_drift_rate, 0.5)

    def test_metrics_include_same_class_failure_rate(self):
        incidents = [
            IncidentReport(
                incident_id="inc-1",
                title="first mechanism incident",
                severity="medium",
                status="open",
                date_opened="2026-05-06",
                incident_owner="editor-1",
                locked_command_id="cmd1",
                pre_state_snapshot_id="s1",
                suspected_failure_classification="mechanism_missing",
                evidence_references=("event:e1",),
            ),
            IncidentReport(
                incident_id="inc-2",
                title="second mechanism incident",
                severity="medium",
                status="open",
                date_opened="2026-05-06",
                incident_owner="editor-1",
                locked_command_id="cmd2",
                pre_state_snapshot_id="s2",
                suspected_failure_classification="mechanism_missing",
                evidence_references=("event:e2",),
            ),
            IncidentReport(
                incident_id="inc-3",
                title="different incident class",
                severity="low",
                status="open",
                date_opened="2026-05-06",
                incident_owner="editor-1",
                locked_command_id="cmd3",
                pre_state_snapshot_id="s3",
                suspected_failure_classification="visibility_leak",
                evidence_references=("event:e3",),
            ),
        ]
        metrics = compute_metrics([], [], incident_reports=incidents)
        self.assertEqual(metrics.same_class_failure_rate, 2 / 3)

    def test_metrics_include_incident_recurrence_rate(self):
        incidents = [
            IncidentReport(
                incident_id="inc-1",
                title="first incident",
                severity="medium",
                status="open",
                date_opened="2026-05-06",
                incident_owner="editor-1",
                locked_command_id="cmd1",
                pre_state_snapshot_id="s1",
                evidence_references=("event:e1",),
                recurred_from_prior_incident=False,
            ),
            IncidentReport(
                incident_id="inc-2",
                title="repeat incident",
                severity="medium",
                status="open",
                date_opened="2026-05-06",
                incident_owner="editor-1",
                locked_command_id="cmd2",
                pre_state_snapshot_id="s2",
                evidence_references=("event:e2",),
                recurred_from_prior_incident=True,
            ),
            IncidentReport(
                incident_id="inc-3",
                title="another new incident",
                severity="low",
                status="open",
                date_opened="2026-05-06",
                incident_owner="editor-1",
                locked_command_id="cmd3",
                pre_state_snapshot_id="s3",
                evidence_references=("event:e3",),
                recurred_from_prior_incident=False,
            ),
        ]
        metrics = compute_metrics([], [], incident_reports=incidents)
        self.assertEqual(metrics.incident_recurrence_rate, 1 / 3)

    def test_metrics_include_replay_confirmed_regression_rate(self):
        incidents = [
            IncidentReport(
                incident_id="inc-1",
                title="confirmed regression",
                severity="high",
                status="open",
                date_opened="2026-05-06",
                incident_owner="editor-1",
                locked_command_id="cmd1",
                pre_state_snapshot_id="s1",
                evidence_references=("event:e1",),
                is_regression=True,
                replay_confirmed_regression=True,
            ),
            IncidentReport(
                incident_id="inc-2",
                title="unconfirmed regression",
                severity="high",
                status="open",
                date_opened="2026-05-06",
                incident_owner="editor-1",
                locked_command_id="cmd2",
                pre_state_snapshot_id="s2",
                evidence_references=("event:e2",),
                is_regression=True,
                replay_confirmed_regression=False,
            ),
            IncidentReport(
                incident_id="inc-3",
                title="non regression incident",
                severity="low",
                status="open",
                date_opened="2026-05-06",
                incident_owner="editor-1",
                locked_command_id="cmd3",
                pre_state_snapshot_id="s3",
                evidence_references=("event:e3",),
                is_regression=False,
            ),
        ]
        metrics = compute_metrics([], [], incident_reports=incidents)
        self.assertEqual(metrics.replay_confirmed_regression_rate, 0.5)

    def test_metrics_include_manual_rollback_rate(self):
        attempts = [
            ReleaseAttemptRecord(
                attempt_id="rel-1",
                triggering_command_id="cmd1",
                started_at="2026-05-06T00:00:00Z",
                source_snapshot_id="s1",
                source_system="alpha-autopilot",
                actor="editor-1",
                write_back_ok=False,
                gate_allowed=False,
                drift_detected=False,
                manual_rollback_performed=True,
                rollback_reason="operator reverted write-back",
                incident_id="inc-1",
            ),
            ReleaseAttemptRecord(
                attempt_id="rel-2",
                triggering_command_id="cmd2",
                started_at="2026-05-06T00:05:00Z",
                source_snapshot_id="s2",
                source_system="alpha-autopilot",
                actor="editor-1",
                write_back_ok=True,
                gate_allowed=True,
                drift_detected=False,
                manual_rollback_performed=False,
            ),
        ]
        metrics = compute_metrics([], [], release_attempts=attempts)
        self.assertEqual(metrics.manual_rollback_rate, 0.5)

    def test_metrics_include_second_generation_rate(self):
        attempts = [
            ReleaseAttemptRecord(
                attempt_id="rel-1",
                triggering_command_id="cmd1",
                started_at="2026-05-06T00:00:00Z",
                source_snapshot_id="s1",
                source_system="alpha-autopilot",
                actor="editor-1",
                write_back_ok=True,
                gate_allowed=True,
                drift_detected=False,
            ),
            ReleaseAttemptRecord(
                attempt_id="rel-2",
                triggering_command_id="cmd2",
                started_at="2026-05-06T00:05:00Z",
                source_snapshot_id="s2",
                source_system="alpha-autopilot",
                actor="editor-1",
                write_back_ok=True,
                gate_allowed=True,
                drift_detected=False,
                derived_from_attempt_id="rel-1",
            ),
            ReleaseAttemptRecord(
                attempt_id="rel-3",
                triggering_command_id="cmd3",
                started_at="2026-05-06T00:10:00Z",
                source_snapshot_id="s3",
                source_system="alpha-autopilot",
                actor="editor-1",
                write_back_ok=True,
                gate_allowed=True,
                drift_detected=False,
            ),
        ]
        metrics = compute_metrics([], [], release_attempts=attempts)
        self.assertEqual(metrics.second_generation_rate, 0.5)

    def test_metrics_include_edit_amplitude(self):
        engine = ReplayEngine()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        replay = engine.replay(
            command,
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        metrics = compute_metrics([replay], [])
        self.assertGreater(metrics.edit_amplitude, 0.0)
        self.assertLessEqual(metrics.edit_amplitude, 1.0)

    def test_metrics_include_plot_inconsistency_rate(self):
        snapshot = make_snapshot()
        good_validation = validate_causality(
            snapshot,
            [
                Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
                Event("e2", "cmd1", "chapter_outcome", 2, "2026-05-06T00:00:02Z", "1", {"prerequisite_event_id": "e1"}),
            ],
        )
        bad_validation = validate_causality(
            snapshot,
            [Event("e3", "cmd1", "chapter_outcome", 1, "2026-05-06T00:00:03Z", "1", {})],
        )
        metrics = compute_metrics([], [good_validation, bad_validation])
        self.assertEqual(metrics.plot_inconsistency_rate, 0.5)

    def test_metrics_include_review_corpus_rates(self):
        review_records = [
            NarrativeQualityReviewRecord(
                review_id="review-1",
                source_artifact_reference="reviews/review-1.json",
                checked_segment_count=4,
                ooc_incident_count=1,
                checked_scene_count=2,
                world_rule_violation_count=1,
                introduced_setup_item_count=3,
                resolved_setup_item_count=2,
                evidence_references=("event:e1",),
            ),
            NarrativeQualityReviewRecord(
                review_id="review-2",
                source_artifact_reference="reviews/review-2.json",
                checked_segment_count=2,
                ooc_incident_count=0,
                checked_scene_count=1,
                world_rule_violation_count=0,
                introduced_setup_item_count=1,
                resolved_setup_item_count=1,
                evidence_references=("event:e2",),
            ),
        ]
        metrics = compute_metrics([], [], review_records=review_records)
        self.assertEqual(metrics.character_ooc_rate, 1 / 6)
        self.assertEqual(metrics.world_rule_violation_rate, 1 / 3)
        self.assertEqual(metrics.foreshadowing_payoff_rate, 0.75)

    def test_metrics_include_version_lock_success_rate(self):
        engine = ReplayEngine()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        good_replay = engine.replay(
            command,
            snapshot,
            [Event("e1", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        mismatch_snapshot = NarrativeSnapshot(
            snapshot_id="s2",
            state_identity="state-1",
            schema_version="1.0",
            policy_version="p2",
            visibility_version="v1",
            created_at="2026-05-06T00:00:00Z",
        )
        bad_replay = engine.replay(
            command,
            mismatch_snapshot,
            [Event("e2", "cmd1", "update_goal", 1, "2026-05-06T00:00:02Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        metrics = compute_metrics([good_replay, bad_replay], [])
        self.assertEqual(metrics.version_lock_success_rate, 0.5)

    def test_metrics_include_alarm_trigger_rate(self):
        metrics = compute_metrics(
            [],
            [],
            gate_results=[
                GateResult(allowed=True, blocking_issues=(), warnings=()),
                GateResult(allowed=False, blocking_issues=("missing_precondition",), warnings=()),
            ],
        )
        self.assertEqual(metrics.alarm_trigger_rate, 0.5)

    def test_metrics_include_snapshot_freshness_from_latest_valid_snapshot(self):
        base_snapshot = make_snapshot()
        valid_latest = NarrativeSnapshot(
            snapshot_id="s2",
            state_identity="state-1",
            schema_version="1.0",
            policy_version="p1",
            visibility_version="v1",
            created_at="2026-05-06T00:05:00Z",
        )
        invalid_newer = NarrativeSnapshot(
            snapshot_id="s3",
            state_identity="",
            schema_version="1.0",
            policy_version="p1",
            visibility_version="v1",
            created_at="2026-05-06T00:06:00Z",
        )
        metrics = compute_metrics(
            [],
            [],
            snapshots=[base_snapshot, valid_latest, invalid_newer],
            current_time="2026-05-06T00:07:00Z",
        )
        self.assertEqual(metrics.snapshot_freshness, 120.0)

    def test_metrics_include_write_back_and_memory_omission_rates(self):
        replay = ReplayResult(
            ok=False,
            state=make_snapshot(),
            checked_write_back_count=4,
            omitted_write_back_count=1,
            write_back_omission_diff=("characters.c1.memory_references",),
            checked_memory_reference_count=1,
            omitted_memory_reference_count=1,
            memory_omission_diff=("characters.c1.memory_references",),
        )
        metrics = compute_metrics([replay], [])
        self.assertEqual(metrics.write_back_omission_rate, 0.25)
        self.assertEqual(metrics.memory_omission_rate, 1.0)

    def test_add_memory_updates_owner_memory_references(self):
        engine = ReplayEngine()
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
        result = engine.replay(
            command,
            snapshot,
            [
                Event("e1", "cmd1", "add_memory", 1, "2026-05-06T00:00:01Z", "1", {"memory_id": "m1", "memory": memory}),
            ],
        )
        self.assertTrue(result.ok)
        self.assertIn("characters.c1.memory_references", result.state_diff)
        self.assertIn("m1", result.state.characters["c1"].memory_references)
        self.assertEqual(result.checked_write_back_count, 2)
        self.assertEqual(result.omitted_write_back_count, 0)
        self.assertEqual(result.checked_memory_reference_count, 1)
        self.assertEqual(result.omitted_memory_reference_count, 0)

    def test_memory_added_before_reveal_is_valid(self):
        engine = ReplayEngine()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        memory = snapshot.memories.get("m1")
        if memory is None:
            memory = MemoryState(
                memory_id="m1",
                owning_character_id="c1",
                memory_claim="ally is hidden",
                confidence_level=0.9,
                source_event_id="e1",
                retention_status="active",
            )
        result = engine.replay(
            command,
            snapshot,
            [
                Event("e1", "cmd1", "add_memory", 1, "2026-05-06T00:00:01Z", "1", {"memory_id": "m1", "memory": memory}),
                Event("e2", "cmd1", "reveal", 2, "2026-05-06T00:00:02Z", "1", {"memory_id": "m1"}),
            ],
        )
        self.assertTrue(result.ok)
        self.assertIn("memory_added:m1", result.diffs)
        self.assertIn("m1", result.state.characters["c1"].memory_references)
        follow_up = ReplayEngine().replay(
            command,
            snapshot,
            [
                Event("e0", "cmd1", "update_goal", 0, "2026-05-06T00:00:00Z", "1", {"character_id": "c1", "current_goal": "protect ally"}),
                Event("e1", "cmd1", "add_memory", 1, "2026-05-06T00:00:01Z", "1", {"memory_id": "m1", "memory": memory}),
                Event("e2", "cmd1", "reveal", 2, "2026-05-06T00:00:02Z", "1", {"memory_id": "m1", "visibility_scope": VisibilityScope.PUBLIC}),
            ],
        )
        self.assertIn("characters.c1.current_goal", follow_up.state_diff)
        self.assertIn("characters.c1.memory_references", follow_up.state_diff)
        self.assertIn("memories.m1.visibility_scope", follow_up.visibility_diff)

    def test_unauthorized_world_rule_update_is_rejected(self):
        snapshot = make_snapshot()
        result = validate_causality(
            snapshot,
            [Event("e1", "cmd1", "world_rule_update", 1, "2026-05-06T00:00:01Z", "1", {"rule_id": "r2", "authority": "unauthorized"})],
        )
        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code == "unauthorized_overwrite" for issue in result.issues))

    def test_replay_tracks_constraint_diff_for_authorized_world_rule_update(self):
        engine = ReplayEngine()
        snapshot = make_snapshot()
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        world_rule = WorldRuleState(
            rule_id="r2",
            rule_text="magic requires a focus",
            domain="world",
            enforcement_strength="hard",
            provenance_source="author bible",
        )
        result = engine.replay(
            command,
            snapshot,
            [
                Event(
                    "e1",
                    "cmd1",
                    "world_rule_update",
                    1,
                    "2026-05-06T00:00:01Z",
                    "1",
                    {"rule_id": "r2", "authority": "authorized", "world_rule": world_rule},
                )
            ],
        )
        self.assertTrue(result.ok)
        self.assertIn("world_rules.r2", result.constraint_diff)

    def test_replay_rejects_policy_mismatch_and_unsupported_event(self):
        engine = ReplayEngine()
        snapshot = make_snapshot()
        bad_snapshot = NarrativeSnapshot(
            snapshot_id="s2",
            state_identity="state-1",
            schema_version="1.0",
            policy_version="p2",
            visibility_version="v1",
            created_at="2026-05-06T00:00:00Z",
        )
        command = Command("cmd1", "edit", "op1", "chapter-1", "p1", "2026-05-06T00:00:00Z")
        result = engine.replay(
            command,
            bad_snapshot,
            [Event("e0", "cmd1", "update_goal", 1, "2026-05-06T00:00:01Z", "1", {"character_id": "c1", "current_goal": "protect ally"})],
        )
        self.assertFalse(result.ok)
        self.assertEqual(result.failure_classification, "policy_drift")

        unsupported = engine.replay(
            command,
            snapshot,
            [Event("e3", "cmd1", "unknown_event", 1, "2026-05-06T00:00:01Z", "1", {})],
        )
        self.assertFalse(unsupported.ok)
        self.assertEqual(unsupported.failure_classification, "mechanism_missing")
        self.assertIn("unsupported_event_type", unsupported.missing_mechanism_candidates)

    def test_snapshot_validation_reports_dangling_state(self):
        snapshot = NarrativeSnapshot(
            snapshot_id="s3",
            state_identity="state-2",
            schema_version="1.0",
            policy_version="p1",
            visibility_version="v1",
            created_at="2026-05-06T00:00:00Z",
            memories={},
            relationships={
                "c1:c2:ally": RelationshipState(
                    subject_character_id="c1",
                    object_character_id="c2",
                    relation_type="ally",
                    trust_value=0.5,
                    last_updated_event_id=None,
                ),
            },
        )
        result = snapshot.validate()
        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code == "dangling_relationship" for issue in result.issues))

    def test_snapshot_exports_to_jsonable_dict(self):
        snapshot = make_snapshot()
        data = snapshot.to_dict()
        self.assertEqual(data["snapshot_id"], "s1")
        self.assertEqual(data["characters"]["c1"]["role_name"], "protagonist")


if __name__ == "__main__":
    unittest.main()
