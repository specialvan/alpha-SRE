# Implementation Task Board

## Goal

Build the standalone narrative SRE control plane before integrating with `alpha-autopilot`.

## Work items

### T1. Define versioned narrative state schema

- Layer: baseline
- Status: complete
- Dependency: none
- Primary specs: `narrative_state_schema.md`, `knowledge_visibility_spec.md`
- Deliverable: versioned state contract for characters, relationships, memory, taboo, world rules, policy, and chapter intent
- Acceptance: role state, knowledge visibility, and schema version rules are explicit across `narrative_state_schema.md` and `knowledge_visibility_spec.md`
- Execution type: document specification hardened and paired with executable state artifacts in `alpha_sre/state.py`
- Owner: Codex

### T2. Define command / event / snapshot separation

- Layer: baseline
- Status: complete
- Dependency: T1
- Primary specs: `replay_spec.md`, `causal_validation_spec.md`
- Deliverable: operational distinction between command, event, and snapshot identities
- Acceptance: replay can reconstruct causal history without ambiguous artifacts
- Execution type: baseline contract defined first, then implemented in `alpha_sre/events.py` and `alpha_sre/replay.py`
- Owner: Codex

### T3. Define replay orchestrator

- Layer: baseline
- Status: complete
- Dependency: T1, T2
- Primary specs: `replay_spec.md`, `knowledge_visibility_spec.md`, `causal_validation_spec.md`
- Deliverable: locked-version replay session contract, causal validation rules, and failure classification
- Acceptance: replay rules, isolation rules, visibility rules, and evidence requirements are documented
- Execution type: document specification hardened and prepared for continued implementation in `alpha_sre/replay.py`
- Owner: Codex

### T4. Define consistency gate

- Layer: baseline
- Status: complete
- Dependency: T1, T3
- Primary specs: `consistency_metric_catalog.md`, `test_governance.md`, `execution_governance.md`
- Deliverable: gate intent, threshold semantics, and evidence expectations for rule drift, visibility leaks, and causality breaks
- Acceptance: hard violations, soft warnings, and operator override rules are explicit
- Execution type: document specification hardened and partially implemented in `alpha_sre/gate.py` and `alpha_sre/metrics.py`
- Owner: Codex

### T5. Define incident analysis template

- Layer: increment
- Status: complete
- Dependency: T3, test governance
- Primary specs: `incident_postmortem_template.md`, `test_governance.md`, `execution_governance.md`
- Deliverable: replay-linked incident postmortem template with regression and rollback sections
- Acceptance: mechanism-missing diagnosis and prior-incident regression evidence have a fixed place to live
- Execution type: document specification and workflow readiness; implementation follow-up remains incident-data integration
- Owner: Codex

### T6. Define alpha-autopilot integration plan

- Layer: increment
- Status: complete
- Dependency: T1, T3, T4
- Primary specs: `integration_plan_alpha_autopilot.md`, `replay_spec.md`, `consistency_metric_catalog.md`
- Deliverable: versioned read API, write-back API, gate bypass protection, replay drift handling, and contract enforcement
- Acceptance: integration preserves state ownership and gate authority
- Execution type: integration contract and implementation preparation, with partial executable bridge in `alpha_sre/integration.py` covering read, write-back, and incident export contract validation
- Owner: Codex

## Current status summary

- Baseline spec foundation: complete
- Incident and evidence chain: complete
- Integration plan hardening: complete
- Active implementation preparation: in progress through `alpha_sre/` and `tests/`
- Experimental items: not started
