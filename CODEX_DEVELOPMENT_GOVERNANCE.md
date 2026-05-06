# alpha-SRE Development Governance

## 1. Project purpose

`alpha-SRE` is the standalone operations and reliability package for narrative generation. It exists to define replay, observability, consistency validation, incident diagnosis, and rollback-safe operational controls before any tight product integration.

## 2. Operating stance

- Keep `alpha-SRE` independent from `alpha-autopilot` until contracts are explicit and reviewable.
- Define operational contracts before implementation details depend on them.
- Treat replay, metrics, gates, and incidents as auditable system behavior, not informal process.

## 3. Document classes

### 3.1 Authoritative baseline documents

These define project rules, execution order, or required operating behavior.

- `START_HERE.md`
- `CODEX_DEVELOPMENT_GOVERNANCE.md`
- `SHORT_NAV.md`
- `package_manifest.md`
- `package_overview.md`
- `task_launch_template.md`
- `new_requirement_intake_template.md`
- `new_requirement_execution_flow.md`
- `test_governance.md`
- `execution_governance.md`
- `FAQ.md`

### 3.2 Increment specifications

These define controlled capability expansion on top of the baseline and may evolve faster.

- `implementation_task_board.md`
- `narrative_state_schema.md`
- `knowledge_visibility_spec.md`
- `causal_validation_spec.md`
- `replay_spec.md`
- `consistency_metric_catalog.md`
- `incident_postmortem_template.md`
- `integration_plan_alpha_autopilot.md`

### 3.3 Supportive navigation documents

These help onboarding and quick execution but do not override authoritative rules.

- `README_FOR_CODEX.md`
- `final_document_index.md`
- `codex_run_card.md`
- `codex_short_command_card.md`
- `codex_final_startup_prompt.md`
- `archive_structure.md`

## 4. Layer model

### 4.1 Baseline

Stable operational behavior required for any trustworthy rollout:

- versioned narrative state contracts
- command / event / snapshot separation
- deterministic replay orchestration
- consistency gates with explicit evidence
- incident analysis with rollback expectations

### 4.2 Increment

Controlled improvement that extends baseline without redefining it:

- richer narrative quality metrics
- better failure classification
- stronger alert routing or operator tooling
- integration adapters for `alpha-autopilot`

### 4.3 Experimental

Sandboxed ideas that cannot change default baseline behavior:

- alternative replay heuristics
- unproven metrics
- draft diagnosis models
- workflow UI concepts

### 4.4 Archive

Retired or superseded material kept only for traceability.

## 5. Official startup order

Every entry document should point to this same sequence.

1. Read `START_HERE.md`.
2. Read `CODEX_DEVELOPMENT_GOVERNANCE.md`.
3. Read `SHORT_NAV.md`.
4. Read `package_manifest.md`.
5. Read `package_overview.md`.
6. Read `implementation_task_board.md`.
7. Read `task_launch_template.md`.
8. Read `new_requirement_intake_template.md`.
9. Read `new_requirement_execution_flow.md`.
10. Read `test_governance.md`.
11. Read `execution_governance.md`.
12. Read only the scope-specific specs that apply to the task.

## 6. Core governance rules

- One task, one primary goal.
- Every change must be classified as baseline, increment, experimental, or archive.
- Any change to replay, metrics, gates, or incident handling must update the relevant spec in the same change set.
- Rollback expectation must be written before implementation starts.
- Read paths and write-back paths must be versioned.
- Tests and evidence must match the claimed capability, not just the file that changed.

## 7. Integration stance

When `alpha-SRE` later connects to `alpha-autopilot`, integration must preserve:

- clear narrative state ownership precedence
- versioned read and write-back contracts
- replay determinism within locked inputs
- consistency gate authority
- auditable rollback and incident history

## 8. Acceptance rule

A change is accepted only when:

- the target layer is explicit
- the affected docs are updated
- validation evidence exists for the affected capability
- rollback trigger and rollback path are documented
- package indexes still match the real filesystem
