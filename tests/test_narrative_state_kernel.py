from __future__ import annotations

import unittest

from alpha_sre.serialization import snapshot_from_dict
from alpha_sre.state import (
    BeliefState,
    CapabilityState,
    ConstraintState,
    CharacterState,
    FactState,
    MemoryState,
    NarrativeSnapshot,
    PlotThreadState,
    RelationshipState,
    VisibilityEdgeState,
    VisibilityScope,
    WorldRuleState,
)


def make_kernel_snapshot() -> NarrativeSnapshot:
    return NarrativeSnapshot(
        snapshot_id="s-kernel-1",
        state_identity="state-kernel",
        schema_version="1.0",
        policy_version="p1",
        visibility_version="v2",
        created_at="2026-05-06T00:00:00Z",
        characters={
            "c1": CharacterState(
                character_id="c1",
                role_name="detective",
                current_goal="open the sealed vault",
                emotional_state="certain",
                relationship_links=["rel-c1-c2"],
                active_constraints=["cons-c1-hidden"],
                memory_references=["m-rumor"],
                belief_ids=["b-vault-open"],
                capability_ids=["cap-teleport-blocked"],
                current_location="vault-antechamber",
                present_with_character_ids=["c2"],
                knowledge_scope=VisibilityScope.CHARACTER_LOCAL,
            ),
            "c2": CharacterState(
                character_id="c2",
                role_name="witness",
                current_goal="stay hidden",
                emotional_state="afraid",
                relationship_links=["rel-c1-c2"],
                current_location="vault-antechamber",
                present_with_character_ids=["c1"],
                knowledge_scope=VisibilityScope.CHARACTER_LOCAL,
            ),
        },
        memories={
            "m-rumor": MemoryState(
                memory_id="m-rumor",
                owning_character_id="c1",
                memory_claim="the vault was seen open yesterday",
                confidence_level=0.4,
                source_event_id="e-rumor",
                retention_status="active",
            )
        },
        world_rules={
            "r-no-teleport": WorldRuleState(
                rule_id="r-no-teleport",
                rule_text="characters cannot teleport into sealed rooms",
                domain="movement",
                enforcement_strength="hard",
                provenance_source="author bible",
                activation_status="active",
                active_from_event_id="e-rule",
                authority_mode="canonical",
            )
        },
        constraints={
            "cons-c1-hidden": ConstraintState(
                constraint_id="cons-c1-hidden",
                constraint_text="c1 must stay hidden until the vault is opened",
                authority_source="author bible",
                affected_actors=["c1", "c2"],
                enforcement_mode="hard",
            )
        },
        relationships={
            "rel-c1-c2": RelationshipState(
                subject_character_id="c1",
                object_character_id="c2",
                relation_type="ally",
                trust_value=0.7,
                last_updated_event_id="e-rel",
                visibility_scope=VisibilityScope.SYSTEM_VISIBLE,
            )
        },
        facts={
            "f-vault-sealed": FactState(
                fact_id="f-vault-sealed",
                fact_text="the vault is sealed",
                fact_type="world",
                introduced_by_event_id="e-seal",
                valid_from_event_id="e-seal",
                valid_until_event_id=None,
                canonical_truth_status="true",
                related_character_ids=["c1", "c2"],
                related_rule_ids=["r-no-teleport"],
            ),
            "f-vault-open": FactState(
                fact_id="f-vault-open",
                fact_text="the vault is open",
                fact_type="world",
                introduced_by_event_id="e-rumor",
                valid_from_event_id="e-rumor",
                valid_until_event_id=None,
                canonical_truth_status="false",
                related_character_ids=["c1"],
            ),
        },
        beliefs={
            "b-vault-open": BeliefState(
                belief_id="b-vault-open",
                holder_character_id="c1",
                fact_id="f-vault-open",
                belief_status="certain",
                confidence=0.75,
                derived_from_event_id="e-rumor",
                derived_from_memory_ids=["m-rumor"],
                contradicts_fact_id="f-vault-sealed",
            )
        },
        plot_threads={
            "pt-vault-payoff": PlotThreadState(
                thread_id="pt-vault-payoff",
                thread_type="obligation",
                status="open",
                introduced_by_event_id="e-seal",
                required_payoff_by="e-chapter-end",
                blocking_event_ids=["e-guard-arrives"],
                affected_characters=["c1", "c2"],
            )
        },
        capabilities={
            "cap-teleport-blocked": CapabilityState(
                capability_id="cap-teleport-blocked",
                character_id="c1",
                action_type="teleport",
                allowed=False,
                source_rule_id="r-no-teleport",
                source_constraint_id=None,
                valid_from_event_id="e-rule",
                valid_until_event_id=None,
            )
        },
        visibility_edges={
            "vis-c1-vault-sealed": VisibilityEdgeState(
                visibility_edge_id="vis-c1-vault-sealed",
                fact_id="f-vault-sealed",
                viewer_id="c1",
                visibility_status="hidden",
                visibility_source="sealed-room-boundary",
                valid_from_event_id="e-seal",
                valid_until_event_id=None,
            ),
            "vis-narrator-vault-sealed": VisibilityEdgeState(
                visibility_edge_id="vis-narrator-vault-sealed",
                fact_id="f-vault-sealed",
                viewer_id="narrator",
                visibility_status="narrator_only",
                visibility_source="narrative authority",
                valid_from_event_id="e-seal",
                valid_until_event_id=None,
            ),
        },
    )


class NarrativeStateKernelTests(unittest.TestCase):
    def test_snapshot_supports_fact_belief_visibility_kernel(self):
        snapshot = make_kernel_snapshot()

        result = snapshot.validate()

        self.assertTrue(result.ok)
        self.assertEqual(snapshot.facts["f-vault-sealed"].canonical_truth_status, "true")
        self.assertEqual(snapshot.beliefs["b-vault-open"].contradicts_fact_id, "f-vault-sealed")
        self.assertFalse(snapshot.capabilities["cap-teleport-blocked"].allowed)
        self.assertEqual(snapshot.plot_threads["pt-vault-payoff"].status, "open")
        self.assertEqual(snapshot.visibility_edges["vis-c1-vault-sealed"].visibility_status, "hidden")

    def test_snapshot_round_trip_preserves_kernel_fields(self):
        snapshot = make_kernel_snapshot()

        loaded = snapshot_from_dict(snapshot.to_dict())

        self.assertTrue(loaded.validate().ok)
        self.assertEqual(loaded.characters["c1"].belief_ids, ["b-vault-open"])
        self.assertEqual(loaded.characters["c1"].capability_ids, ["cap-teleport-blocked"])
        self.assertEqual(loaded.characters["c1"].current_location, "vault-antechamber")
        self.assertEqual(loaded.world_rules["r-no-teleport"].activation_status, "active")
        self.assertEqual(loaded.facts["f-vault-open"].canonical_truth_status, "false")
        self.assertEqual(loaded.beliefs["b-vault-open"].derived_from_memory_ids, ["m-rumor"])
        self.assertEqual(loaded.plot_threads["pt-vault-payoff"].required_payoff_by, "e-chapter-end")
        self.assertEqual(loaded.capabilities["cap-teleport-blocked"].source_rule_id, "r-no-teleport")
        self.assertEqual(loaded.visibility_edges["vis-narrator-vault-sealed"].viewer_id, "narrator")

    def test_snapshot_rejects_belief_pointing_to_unknown_fact(self):
        snapshot = make_kernel_snapshot()
        broken = snapshot.clone()
        broken.beliefs["b-vault-open"] = BeliefState(
            **{**broken.beliefs["b-vault-open"].__dict__, "fact_id": "f-missing"}
        )

        result = broken.validate()

        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code == "dangling_belief_fact" for issue in result.issues))

    def test_snapshot_rejects_dangling_character_surface_references(self):
        snapshot = make_kernel_snapshot()

        cases = (
            ("relationship_links", "dangling_character_relationship", {"relationship_links": ["rel-missing"]}),
            ("active_constraints", "dangling_character_constraint", {"active_constraints": ["cons-missing"]}),
            ("memory_references", "dangling_character_memory", {"memory_references": ["m-missing"]}),
        )

        for field_name, issue_code, updates in cases:
            with self.subTest(field_name=field_name):
                broken = snapshot.clone()
                broken.characters["c1"] = CharacterState(
                    **{**broken.characters["c1"].__dict__, **updates}
                )
                result = broken.validate()

                self.assertFalse(result.ok)
                self.assertTrue(any(issue.code == issue_code for issue in result.issues))

    def test_snapshot_rejects_constraint_actor_with_missing_character(self):
        snapshot = make_kernel_snapshot()
        broken = snapshot.clone()
        broken.constraints["cons-c1-hidden"] = ConstraintState(
            **{**broken.constraints["cons-c1-hidden"].__dict__, "affected_actors": ["c-missing"]}
        )

        result = broken.validate()

        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code == "dangling_constraint_actor" for issue in result.issues))

    def test_snapshot_rejects_remaining_referential_gaps(self):
        snapshot = make_kernel_snapshot()

        cases = (
            ("dangling_fact_character", lambda broken: broken.facts.__setitem__(
                "f-vault-sealed",
                FactState(**{**broken.facts["f-vault-sealed"].__dict__, "related_character_ids": ["c-missing"]}),
            )),
            ("dangling_fact_rule", lambda broken: broken.facts.__setitem__(
                "f-vault-sealed",
                FactState(**{**broken.facts["f-vault-sealed"].__dict__, "related_rule_ids": ["r-missing"]}),
            )),
            ("dangling_belief_holder", lambda broken: broken.beliefs.__setitem__(
                "b-vault-open",
                BeliefState(**{**broken.beliefs["b-vault-open"].__dict__, "holder_character_id": "c-missing"}),
            )),
            ("dangling_belief_memory", lambda broken: broken.beliefs.__setitem__(
                "b-vault-open",
                BeliefState(**{**broken.beliefs["b-vault-open"].__dict__, "derived_from_memory_ids": ["m-missing"]}),
            )),
            ("dangling_belief_contradiction", lambda broken: broken.beliefs.__setitem__(
                "b-vault-open",
                BeliefState(**{**broken.beliefs["b-vault-open"].__dict__, "contradicts_fact_id": "f-missing"}),
            )),
            ("dangling_visibility_fact", lambda broken: broken.visibility_edges.__setitem__(
                "vis-c1-vault-sealed",
                VisibilityEdgeState(**{**broken.visibility_edges["vis-c1-vault-sealed"].__dict__, "fact_id": "f-missing"}),
            )),
            ("dangling_capability_rule", lambda broken: broken.capabilities.__setitem__(
                "cap-teleport-blocked",
                CapabilityState(**{**broken.capabilities["cap-teleport-blocked"].__dict__, "source_rule_id": "r-missing"}),
            )),
            ("dangling_capability_constraint", lambda broken: broken.capabilities.__setitem__(
                "cap-teleport-blocked",
                CapabilityState(**{**broken.capabilities["cap-teleport-blocked"].__dict__, "source_constraint_id": "cons-missing"}),
            )),
        )

        for issue_code, mutate in cases:
            with self.subTest(issue_code=issue_code):
                broken = snapshot.clone()
                mutate(broken)
                result = broken.validate()

                self.assertFalse(result.ok)
                self.assertTrue(any(issue.code == issue_code for issue in result.issues))

    def test_snapshot_rejects_visibility_edge_with_unknown_actor(self):
        snapshot = make_kernel_snapshot()
        broken = snapshot.clone()
        broken.visibility_edges["vis-c1-vault-sealed"] = VisibilityEdgeState(
            **{**broken.visibility_edges["vis-c1-vault-sealed"].__dict__, "viewer_id": "c-missing"}
        )

        result = broken.validate()

        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code == "dangling_visibility_viewer" for issue in result.issues))

    def test_snapshot_rejects_capability_for_unknown_actor(self):
        snapshot = make_kernel_snapshot()
        broken = snapshot.clone()
        broken.capabilities["cap-teleport-blocked"] = CapabilityState(
            **{**broken.capabilities["cap-teleport-blocked"].__dict__, "character_id": "c-missing"}
        )

        result = broken.validate()

        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code == "dangling_capability_actor" for issue in result.issues))

    def test_snapshot_rejects_invalid_plot_obligation_state(self):
        snapshot = make_kernel_snapshot()
        broken = snapshot.clone()
        broken.plot_threads["pt-vault-payoff"] = PlotThreadState(
            **{**broken.plot_threads["pt-vault-payoff"].__dict__, "status": "forgotten"}
        )

        result = broken.validate()

        self.assertFalse(result.ok)
        self.assertTrue(any(issue.code == "invalid_plot_obligation_state" for issue in result.issues))


if __name__ == "__main__":
    unittest.main()
