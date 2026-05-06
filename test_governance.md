# Test Governance

## Required test layers

- unit tests
- integration tests
- regression tests
- acceptance tests

## Capability-to-evidence matrix

| Capability | Required layers | Minimum evidence |
| --- | --- | --- |
| Deterministic replay | unit, regression | locked-input replay result is stable and explainable |
| Consistency gate | unit, acceptance | hard violations block publication with recorded reason |
| Incident regression | regression | prior incident can be reproduced and then prevented |
| Rollback behavior | integration or acceptance | rollback trigger and rollback path are validated |
| `alpha-autopilot` integration contract | integration | version compatibility and gate authority are preserved |

## Current executable evidence anchors

| Capability | Evidence anchor | Current location |
| --- | --- | --- |
| Deterministic replay | replay session, causal chain diff, evidence references | `alpha_sre/replay.py`, `tests/test_alpha_sre.py` |
| Consistency gate | blocking issue codes, metric thresholds, gate result | `alpha_sre/gate.py`, `tests/test_gate.py` |
| Operational metrics | metric summary, snapshot freshness, write-back omission rate, memory omission rate, manual rollback rate, edit amplitude, plot inconsistency rate, second-generation rate, rule drift rate, write-back success rate, same-class failure rate | `alpha_sre/metrics.py`, `tests/test_alpha_sre.py`, `tests/test_integration.py`, `tests/test_gate.py`, `tests/test_artifacts.py` |
| Narrative review metrics | quality review record, OOC rate, world-rule violation rate, foreshadowing payoff rate | `alpha_sre/review.py`, `alpha_sre/metrics.py`, `tests/test_alpha_sre.py`, `tests/test_gate.py`, `tests/test_artifacts.py` |
| Incident regression | structured causal findings, incident report artifact, required regression test reference | `alpha_sre/causal_validation.py`, `alpha_sre/incident.py`, `tests/test_artifacts.py` |
| Integration contract | read/write-back/incident export validation | `alpha_sre/integration.py`, `tests/test_integration.py` |
| Artifact persistence | replay bundle and incident report round-trip | `alpha_sre/artifacts.py`, `tests/test_artifacts.py` |

## Baseline vs increment coverage

### Baseline changes

Must include:

- at least one direct test update
- explicit evidence for the affected capability
- rollback validation or a justified rollback simulation
- deterministic replay or gate evidence when replay, metrics, or visibility behavior changed

### Increment changes

Must include:

- compatibility evidence against the baseline contract
- proof that baseline guarantees were not weakened
- incident export or integration evidence when bridge-facing contracts changed

### Experimental changes

Must include:

- isolation proof showing no baseline behavior changed

## Rules

- Replay and consistency logic must have deterministic tests.
- Regression tests must cover prior incidents and known failure classes.
- Tests must validate the claimed system behavior, not just helper functions.
- A passing test suite is insufficient if it does not cover the changed capability.

## Required evidence record

For every significant change, record:

- what capability was tested
- which test layer was used
- which document or contract was affected
- what passed
- what failed or remained uncovered
- whether rollback was validated
- where the evidence artifact lives

For replay and incident work, prefer evidence locations that point to:

- replay bundle paths
- incident report artifact paths
- named regression tests
- gate result or metric outputs tied to the changed capability
