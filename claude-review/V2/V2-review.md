# V2 PR Review — Narrative Kernel SRE System

## Review Conclusion

This V2 PR is directionally correct and necessary. It upgrades the system from a structurally-replayed prototype into a narrative-native control plane, but the current codebase does not yet satisfy the requirements as written. The main gap is that the implementation still models event replay and validation more than it models narrative truth.

## Executive Summary

The existing repository already has the right scaffolding:

- `NarrativeSnapshot`
- `ReplayEngine`
- `CausalValidationResult`
- `MetricSummary`
- `ConsistencyGate`
- integration bridge for read/write/drift/incident export

However, these pieces still operate mostly as a V1 skeleton. The V2 PR requires a stronger semantic kernel with first-class narrative entities and stricter state-level verification.

The most important missing capabilities are:

1. First-class narrative primitives such as fact state, belief graph, plot obligations, capability boundaries, and visibility edges.
2. Locked post-state verification after replay.
3. Narrative-native failure taxonomy, especially for hidden fact leakage, false belief conflict, capability violation, and unresolved plot obligations.
4. Metric denominators based on checked narrative units rather than raw validation issues.
5. Gate logic that blocks on narrative-native consistency failures rather than only legacy issue codes.

## What the Current Codebase Already Does Well

### 1. The state model is clean and extensible

`alpha_sre/state.py` already uses immutable dataclasses and validation methods, which is a good base for versioned narrative state. Serialization is also structured enough to support a larger schema.

### 2. Replay and validation are already separated from integration

The system has a decent layering:

- state and serialization
- causal validation
- replay
- gate and metrics
- integration bridge

That separation will make the V2 transition much easier than if everything were intertwined.

### 3. There is already a release/drift/incident control loop

`alpha_sre/integration.py` already captures read/write drift, release attempts, and incident export. This is a strong foundation for the SRE aspect of the system.

## Major Gaps Against the V2 Requirements

### Gap 1 — Narrative kernel is not yet complete

The PR calls for first-class semantic entities such as:

- facts
- beliefs
- plot threads or obligations
- capabilities or action boundaries
- visibility edges / graph

The current `NarrativeSnapshot` still centers on characters, relationships, memories, constraints, rules, and intents. That is not enough to represent the story logic required by V2.

#### Impact

Without these primitives, the system cannot reliably express:

- who knows what
- what is visible to whom
- whether an action is possible for a character
- whether a plot obligation has been fulfilled or missed
- whether a scene outcome is a consequence of the locked narrative state

### Gap 2 — Replay is structural, not semantic

The replay pipeline checks version compatibility and applies events, but it does not yet verify that the resulting post-state matches a locked expected state. Observation-frame semantics are also only partially consumed.

#### Impact

Replay can still succeed even when the narrative meaning is wrong. That undermines the central purpose of the V2 system: proving that the generated fiction is consistent with the intended narrative state.

### Gap 3 — Causal validation is still event-centric

The current causal validation catches useful failures such as duplicate event IDs, duplicate causal indices, hidden-reveal leakage, and unauthorized rule updates. But the PR requires a richer explanation layer that distinguishes narrative-level failures.

Examples of missing failure classes:

- hidden fact leak
- false belief conflict
- capability missing
- inactive rule misuse
- unresolved plot obligation
- replay/post-state mismatch attribution

#### Impact

The incident and regression model will stay too coarse if causal validation does not evolve into narrative-state reasoning.

### Gap 4 — Metrics use the wrong denominators in key places

The current implementation still computes some key rates against total validation issues. The PR explicitly rejects that approach and asks for denominators based on checked narrative units, such as outcomes, visibility decisions, actions, or post-state checks.

#### Impact

Issue-count denominators make metrics noisy and unstable. They dilute severe narrative defects and make gate thresholds less meaningful.

### Gap 5 — Gate logic is not yet narrative-native

The gate currently blocks on a combination of critical issue codes and metric thresholds. That is useful, but it does not yet reflect the V2 requirement for explicit blocking on narrative-native failures.

#### Impact

A gate that only understands legacy issue codes will miss the deeper semantic failures this system is meant to catch.

## File-by-File Assessment

### `alpha_sre/state.py`

Strengths:

- immutable dataclass design
- validation on each state object
- consistent schema versioning pattern

Weaknesses:

- missing fact, belief, plot, capability, and visibility-edge state
- `WorldRuleState` lacks active semantic lifecycle
- `NarrativeSnapshot` does not expose the narrative surfaces needed for V2

### `alpha_sre/serialization.py`

Strengths:

- round-trip support is already in place
- serializer design is easy to extend

Weaknesses:

- new semantic entities will require a broad set of new conversion helpers
- no compatibility strategy yet for schema evolution beyond the current structure

### `alpha_sre/causal_validation.py`

Strengths:

- produces structured findings
- already supports recommended regression test references
- catches a meaningful first layer of causal issues

Weaknesses:

- not yet narrative-state aware
- does not classify belief conflict or capability failure
- cannot explain replay/post-state divergence

### `alpha_sre/metrics.py`

Strengths:

- metric container is extensible
- already tracks several useful SRE-style dimensions

Weaknesses:

- some rates still use issue counts as denominators
- checked-unit counters are incomplete for V2
- narrative fidelity cannot yet be measured cleanly

### `alpha_sre/gate.py`

Strengths:

- clear gating abstraction
- deduplicated blocking and warning output

Weaknesses:

- still anchored to issue-code filtering
- lacks first-class narrative failure categories
- hard/soft semantics for plot and belief failures are not yet modeled

### `alpha_sre/integration.py`

Strengths:

- read/write/drift/incident flow is well organized
- a release attempt record already exists
- drift reporting is a strong control-plane primitive

Weaknesses:

- drift signatures do not yet include the new narrative surfaces
- quality of drift detection depends on replay post-state correctness
- incident export inherits the same semantic gaps as upstream validation

## Risk Assessment

### Risk 1 — Scope explosion

This PR touches nearly every layer of the system at once. Without phased implementation, it is easy to end up with partial consistency where some layers are upgraded and others remain legacy.

#### Mitigation

Split the work into phased milestones with explicit acceptance criteria per layer.

### Risk 2 — Test matrix growth

Adding first-class narrative entities increases state combinations sharply.

#### Mitigation

Use targeted golden-path and failure-class tests rather than trying to brute-force every combination.

### Risk 3 — Schema drift between layers

If the new kernel schema is not stabilized early, the state, replay, metrics, and gate layers can drift apart.

#### Mitigation

Define the schema contract first, then implement the engine layers against it.

## Recommended Implementation Order

### P0 — Foundation

1. Extend `NarrativeSnapshot`.
2. Add first-class narrative primitives.
3. Update serialization round-trip support.
4. Extend validation to cover the new entities.

### P1 — Semantic replay

5. Make replay consume the new narrative kernel.
6. Add locked post-state verification.
7. Distinguish hidden fact leak, false belief conflict, capability violation, and rule misuse.

### P2 — Metrics and gate hardening

8. Move key metric denominators to checked narrative units.
9. Expand causal findings into narrative-native failure classes.
10. Update gate logic to block on the new semantic failures.

### P3 — Integration and regression control

11. Update drift signatures and release attempt records.
12. Add golden-case tests and regression coverage.
13. Align documentation and review artifacts with the new semantics.

## Final Recommendation

I would approve this PR directionally, but not as a shallow additive change. The V2 design is sound, yet the current codebase must undergo a real semantic upgrade before it can claim compliance.

### Must-fix items before merge

- first-class narrative kernel
- post-state verification
- narrative-native causal classification
- metric denominator migration
- gate semantics upgrade

If those are not completed, the system will remain a structurally sound prototype but not a narrative SRE system in the sense the PR describes.

## Response to Codex Counter-Review

Codex’s response is useful and mostly aligned with the deeper diagnosis, but it corrects one important overstatement: the repository is **not** an empty skeleton. It is a working V1 event-centric baseline with real replay, causal validation, metrics, gating, and integration control flow.

### What I agree with in the Codex response

- The 4 core blockers are real:
  - missing narrative-native state kernel
  - missing locked post-state verification
  - observation frame not yet fully executable
  - metrics denominators still issue-volume based
- The recommended progression is right:
  - P0 state kernel
  - P1 semantic replay
  - P2 metrics and gate hardening
  - P3 integration and artifact hardening
- `causal_validation.py`, `gate.py`, and `integration.py` should be treated as V1 baseline layers that need semantic upgrade, not as inert placeholders.

### What I would revise in the original review wording

- Replace “only a skeleton” or “empty implementation” with “a working V1 baseline that is not yet narrative-native.”
- Replace “gate only sees legacy codes” with “gate still relies primarily on V1 issue taxonomy and V1 metric semantics.”
- Replace “causal validation is absent” with “causal validation exists, but it is still event-centric rather than narrative-state-centric.”

### Final combined position

The most accurate summary is:

> The repository already contains an executable V1 control loop, but V2 requires a semantic upgrade from event-centric replay/validation to narrative-state-centric replay/validation. The main blockers are real and must be fixed before merge, but the current code should be treated as a functioning baseline rather than a hollow scaffold.

## Requirement-to-Code Gap Matrix

| V2 Requirement | Current Status | Evidence in Code | Review Verdict |
| --- | --- | --- | --- |
| First-class `FactState` / `BeliefState` / `PlotThreadState` / `CapabilityState` / `VisibilityEdgeState` | Missing | `alpha_sre/state.py` only defines characters, relationships, memories, constraints, rules, and intents | Blocker |
| Snapshot validates narrative surfaces, not just object integrity | Partial | `NarrativeSnapshot.validate()` checks dangling relationships/memories and basic fields, but not narrative semantics | Blocker |
| Replay verifies locked post-state | Missing | `alpha_sre/replay.py` does not perform post-state equivalence against an expected terminal snapshot | Blocker |
| Observation frame drives semantic replay | Partial | `ObservationFrame` exists, but most fields are not consumed by replay logic | High priority gap |
| Hidden fact leak vs false belief conflict are distinguished | Missing | `alpha_sre/causal_validation.py` only checks hidden reveal and hidden knowledge usage | Blocker |
| Capability / action boundary violations are modeled | Missing | No capability state or capability validation exists in the current kernel | Blocker |
| Plot obligation lifecycle is modeled | Missing | No plot-thread or obligation state exists | Blocker |
| Metrics use checked narrative units as denominators | Missing | `alpha_sre/metrics.py` still uses `total_issues` for core rates | Blocker |
| Gate blocks on narrative-native consistency failures | Partial | `alpha_sre/gate.py` blocks on issue codes and metric thresholds, but not on dedicated narrative failure classes | High priority gap |
| Drift report covers all narrative surfaces | Missing | `alpha_sre/integration.py` compares only snapshot identity, schema, policy, and visibility versions | High priority gap |
| Incident export and release records preserve narrative failure class lineage | Partial | The bridge exists, but lineage is only as rich as upstream replay/validation outputs | Medium priority gap |

## Reviewer Notes for the PR Author

1. Do not treat this as a serialization-only change. The kernel itself must change first.
2. Do not add metrics before the checked-unit counters exist, or the numbers will be misleading.
3. Do not widen the gate rules without first separating narrative failure classes from generic validation issues.
4. Do not call the replay layer complete until locked post-state verification is present.
5. Keep the schema contract stable across `state`, `serialization`, `replay`, `metrics`, `gate`, and `integration` in the same milestone.

## Suggested Approval Bar

I would recommend merging V2 only when all of the following are true:

- the narrative kernel has first-class fact/belief/capability/plot/visibility state
- replay validates against a locked post-state
- causal findings distinguish semantic failure classes
- metrics are re-based onto narrative check units
- the gate can fail fast on the new semantic classes

Until then, the right reviewer posture is: **directionally approve the architecture, but request changes on the semantic kernel and verification model**.
