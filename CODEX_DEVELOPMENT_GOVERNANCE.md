# alpha-SRE Development Governance

## 1. Project purpose

`alpha-SRE` is the standalone operations and reliability system for novel content generation. It is designed to provide world-state replay, narrative observability, consistency validation, incident diagnosis, and controlled rollout support before the capabilities are integrated into `alpha-autopilot`.

## 2. Why this project exists

The SRE layer must be separated from the content-generation application so that reliability concerns can be designed, tested, and evolved independently. This avoids coupling operational mechanics to the writing product and makes replay, observability, and incident analysis reusable across future narrative systems.

## 3. Source of truth

Authoritative sources for this project are:

- `CODEX_DEVELOPMENT_GOVERNANCE.md`
- `README_FOR_CODEX.md`
- `START_HERE.md`
- `SHORT_NAV.md`
- `package_manifest.md`
- `package_overview.md`
- `new_requirement_intake_template.md`
- `new_requirement_execution_flow.md`
- `execution_governance.md`
- `test_governance.md`

## 4. Layer model

### 4.1 Baseline

Baseline contains the stable, approved operational control plane:

- world-state schema
- command / event / snapshot separation
- replay orchestration
- consistency gates
- incident analysis
- production metrics

### 4.2 Increment

Increment contains controlled improvements that build on the baseline:

- richer narrative quality metrics
- improved diff classification
- better rollback policies
- alert routing refinements
- integration adapters for `alpha-autopilot`

### 4.3 Experimental

Experimental contains ideas that must not affect the default operational path:

- alternative replay heuristics
- novel metric proposals
- sandboxed diagnosis models
- UI ideas for operator workflows

### 4.4 Archive

Archive contains deprecated or superseded documents, rejected designs, and retired experiments.

## 5. Governance rules

- One task, one primary goal.
- Every change must be classified into baseline, increment, experimental, or archive.
- Any change to replay, gating, or incident logic must include a rollback expectation.
- Metrics must be defined before they are enforced.
- Read paths and write-back paths must be versioned.
- Integration into `alpha-autopilot` is a later step and must not weaken the standalone reliability layer.

## 6. Integration stance

`alpha-SRE` is intentionally independent at first. When it later connects to `alpha-autopilot`, it should act as a reliability subsystem, not as a replacement for the existing content generator. Integration must preserve:

- narrative state ownership
- replay determinism within locked versions
- published consistency gates
- auditable incident history

## 7. Startup order for agents

1. Read governance
2. Read short navigation
3. Read task board
4. Read intake template
5. Read execution flow
6. Read testing governance
7. Read execution governance

## 8. Exit condition

A change is considered accepted only when:

- the intended layer is clear
- tests pass
- rollback impact is documented
- the change is reflected in the package index
