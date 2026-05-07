from __future__ import annotations

import unittest

from alpha_sre.causal_validation import validate_causality
from alpha_sre.events import Event
from alpha_sre.metrics import compute_metrics
from alpha_sre.state import CharacterState, NarrativeSnapshot, VisibilityScope


def snapshot() -> NarrativeSnapshot:
    return NarrativeSnapshot(
        snapshot_id="s-metrics",
        state_identity="state-metrics",
        schema_version="1.0",
        policy_version="p1",
        visibility_version="v2",
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


class NarrativeMetricDenominatorTests(unittest.TestCase):
    def test_causality_break_rate_uses_checked_outcomes_not_issue_volume(self):
        validation = validate_causality(
            snapshot(),
            [
                Event(
                    "e1",
                    "cmd1",
                    "chapter_outcome",
                    1,
                    "2026-05-06T00:00:01Z",
                    "1",
                    {"actor_id": "c1", "knowledge_source": "hidden"},
                )
            ],
        )

        metrics = compute_metrics([], [validation])

        self.assertEqual(validation.checked_outcome_count, 1)
        self.assertGreaterEqual(len(validation.issues), 2)
        self.assertEqual(metrics.causality_break_rate, 1.0)
        self.assertEqual(metrics.checked_outcome_count, 1)

    def test_visibility_leak_rate_uses_checked_visibility_decisions(self):
        validation = validate_causality(
            snapshot(),
            [
                Event(
                    "e1",
                    "cmd1",
                    "chapter_outcome",
                    1,
                    "2026-05-06T00:00:01Z",
                    "1",
                    {"actor_id": "c1", "knowledge_source": "hidden"},
                )
            ],
        )

        metrics = compute_metrics([], [validation])

        self.assertEqual(validation.checked_visibility_decision_count, 1)
        self.assertEqual(metrics.visibility_leak_rate, 1.0)
        self.assertEqual(metrics.checked_visibility_decision_count, 1)


if __name__ == "__main__":
    unittest.main()
