# alpha-SRE

`alpha-SRE` is a standalone SRE control plane for narrative generation systems.

It is not the story generator itself. It is the reliability layer that tries to answer questions such as:

- What narrative state was locked before generation?
- Which events changed that state?
- What did the system or POV actor know at that moment?
- Why did a consistency failure happen?
- Can that failure be replayed, gated, and turned into a regression test?

## Current status

- V1 baseline: implemented as a repo-native Python prototype plus governance/spec documents
- V2 focus: move from "prototype replay and gating" toward a real narrative kernel, semantic replay, and narrative-native metrics
- Test status at the time this README was added: `64 passed`

## What V1 has already implemented

V1 is not just a document pack anymore. The current repository already contains executable baseline capabilities in `alpha_sre/` plus verification in `tests/`.

### V1 delivered capabilities

| Area | Current status | Main files |
| --- | --- | --- |
| Versioned narrative snapshot baseline | Implemented | `alpha_sre/state.py`, `narrative_state_schema.md` |
| Command / event / snapshot separation | Implemented | `alpha_sre/events.py`, `replay_spec.md` |
| Replay engine with failure classification | Implemented | `alpha_sre/replay.py` |
| Observation frame contract | Implemented as baseline contract, partially executable | `alpha_sre/replay.py`, `knowledge_visibility_spec.md` |
| Causal validation with structured findings | Implemented | `alpha_sre/causal_validation.py`, `causal_validation_spec.md` |
| Consistency metrics | Implemented | `alpha_sre/metrics.py`, `consistency_metric_catalog.md` |
| Consistency gate | Implemented | `alpha_sre/gate.py` |
| Incident artifact and export contract | Implemented | `alpha_sre/incident.py`, `alpha_sre/integration.py`, `incident_postmortem_template.md` |
| Replay bundle / JSON artifact persistence | Implemented | `alpha_sre/artifacts.py` |
| Integration bridge for read / write-back / incident export | Implemented as pre-integration bridge | `alpha_sre/integration.py`, `integration_plan_alpha_autopilot.md` |
| Baseline tests | Implemented | `tests/` |

### What "implemented" means in this repository

In V1, the repository already supports:

- validated narrative snapshots with characters, relationships, memories, constraints, world rules, and chapter intents
- replay sessions with locked versions, evidence references, and failure classification
- causal findings such as missing preconditions, unauthorized world-rule overwrite, and visibility leaks
- gating over replay results and structured metrics
- incident reports and replay bundles that can be exported as versioned artifacts

### What V1 still does not fully solve

V1 is a real baseline, but not a finished narrative SRE system. The main remaining gaps are:

- replay does not yet verify a locked `post_state_snapshot`
- observation-frame knowledge and rule fields are not fully executable semantics
- runtime state is still too thin to express the full set of narrative invariants
- several core metrics still use ops-style aggregate denominators instead of narrative check units

These gaps are the starting point for V2.

## Repository structure

### Core code

- `alpha_sre/state.py`: baseline narrative state model and validation
- `alpha_sre/events.py`: command and event contracts
- `alpha_sre/replay.py`: replay engine, replay session, observation frame, failure classification
- `alpha_sre/causal_validation.py`: causal validation and structured findings
- `alpha_sre/metrics.py`: metric computation for replay, incidents, review records, and release attempts
- `alpha_sre/gate.py`: consistency gate thresholds and blocking semantics
- `alpha_sre/incident.py`: incident report contract and replay-linked incident generation
- `alpha_sre/integration.py`: read, write-back, drift, and incident export bridge
- `alpha_sre/artifacts.py`: JSON artifact persistence for replay bundles and reports
- `alpha_sre/serialization.py`: round-trip conversion helpers

### Specs and governance

- `START_HERE.md`: first-entry path
- `package_overview.md`: project positioning
- `implementation_task_board.md`: status of baseline and follow-up work
- `narrative_state_schema.md`: state contract
- `replay_spec.md`: replay contract
- `knowledge_visibility_spec.md`: visibility boundary contract
- `causal_validation_spec.md`: causal validation contract
- `consistency_metric_catalog.md`: metric catalog
- `integration_plan_alpha_autopilot.md`: later product integration target

### Review and roadmap material

- `codex-review/codex-cloud-review`: prior repo review
- `codex-review/V2/V2.2-pr-requirements.md`: current V2.2 PR requirement document
- `codex-review/v2-pr-requirements-narrative-kernel.md`: V2 background only

### Frontend workspace

- `frontend/`: V3.3 React SPA for artifact-first / mock-first control-plane browsing
- `frontend/public/artifacts/`: artifact-mode catalog (`CAT`) plus sample replay / incident / release / review records
- `frontend/src/mocks/`: mock-mode catalog and MSW handlers

## How this differs from traditional SRE

Traditional SRE usually treats the system of interest as a service made of requests, infrastructure, logs, metrics, traces, deploys, and error budgets.

`alpha-SRE` is different because the object being stabilized is not only service execution, but narrative correctness under evolving story state.

### Traditional SRE vs narrative SRE

| Traditional SRE focus | alpha-SRE focus |
| --- | --- |
| request success, latency, saturation | narrative consistency, causality, visibility, and replayability |
| logs / metrics / traces | versioned narrative state, event chain, observation frame, replay evidence |
| deploy rollback | narrative write-back rollback and replay-based diagnosis |
| infra incidents | story-state incidents, visibility leaks, rule drift, causal breaks |
| request replay / canary | semantic narrative replay under locked state and knowledge boundaries |
| service policy / access control | world rules, character constraints, POV knowledge boundaries |

### Why ordinary ops signals are not enough here

For a narrative generator, a system can be "healthy" at the infrastructure level and still be badly broken at the story level:

- a character may know a hidden fact too early
- a payoff may happen without a valid setup chain
- a world rule may be overwritten without authority
- a behavior may be impossible for that actor at that point in the story

Those are not classic latency or availability defects. They require narrative state, semantic replay, and explicit consistency gates.

## External GitHub project references

### Direct implementation references

At the time this README was added, this repository does **not** vendor, copy, or explicitly adapt a tracked implementation from another GitHub repository.

Verification basis:

- aside from this README audit note, the tracked repository content contains no explicit external GitHub project URL references
- the Python package is self-contained under `alpha_sre/`
- the current `pyproject.toml` only defines the local package and does not declare external runtime libraries beyond build tooling

### What that means in practice

- There is no upstream GitHub project currently listed as a code dependency for replay, gating, or incident logic.
- The current implementation is repo-native and purpose-built for `alpha-SRE`.
- If future versions adopt or benchmark against external projects, those references should be added explicitly to this README and the relevant design docs.

## V2.2: current contract

The current hardening contract is documented in [`codex-review/V2/V2.2-pr-requirements.md`](codex-review/V2/V2.2-pr-requirements.md).
The older [`codex-review/v2-pr-requirements-narrative-kernel.md`](codex-review/v2-pr-requirements-narrative-kernel.md) file remains background material only.

In plain terms, the current contract is about stabilizing:

- snapshot referential integrity and logical freezing
- locked post-state replay and observation-frame semantics
- fail-closed replay, gate, and incident evidence paths
- narrative-native metric denominators
- separation between active requirements and historical review notes

## Quick start

### Run tests

```powershell
pytest -q
```

### Run the frontend

```powershell
cd frontend
npm install
npm run test
npm run build
```

### Read the repo in the intended order

Start with:

1. `START_HERE.md`
2. `CODEX_DEVELOPMENT_GOVERNANCE.md`
3. `package_manifest.md`
4. `package_overview.md`
5. `implementation_task_board.md`

## Suggested review focus

If you are reviewing this repository, prioritize these questions:

1. Can the runtime state represent the narrative invariant being claimed?
2. Can replay prove not only lineage, but semantic equivalence to the locked run?
3. Are visibility and belief modeled as executable constraints or just metadata?
4. Do metrics and gates use narrative units, or are they still diluted by generic issue counts?
5. Does every new failure class have a reproducible golden case?

## Suggested Claude review prompt

If you want Claude to review the repo after this push, a good starting prompt is:

```text
Review this repository as a narrative SRE control plane, not as a generic Python project.
Focus on:
1. whether runtime state can express narrative invariants,
2. whether replay is semantically authoritative,
3. whether metrics/gates are narrative-native,
4. whether the V2.2 requirements in codex-review/V2/V2.2-pr-requirements.md are sufficient and correctly prioritized.

Use README.md, implementation_task_board.md, alpha_sre/, tests/, and codex-review/ as the primary review surface.
```

## Project position in one sentence

`alpha-SRE` is an attempt to treat narrative consistency like a first-class reliability problem, with versioned state, replay, causality, visibility, gating, and incident evidence as the control surface.
