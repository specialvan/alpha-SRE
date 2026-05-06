# README for Codex

`alpha-SRE` is the standalone reliability and operations package for narrative generation.

## What Codex should do here

- Treat this repository as an operational control plane, not a product feature folder.
- Keep governance and specifications ahead of implementation coupling.
- Preserve the boundary between `alpha-SRE` and `alpha-autopilot`.
- Prefer explicit contracts, replay rules, incident evidence, and rollback criteria over prose-only intent.

## Read order

Use the official startup order from `CODEX_DEVELOPMENT_GOVERNANCE.md`:

1. `START_HERE.md`
2. `CODEX_DEVELOPMENT_GOVERNANCE.md`
3. `SHORT_NAV.md`
4. `package_manifest.md`
5. `package_overview.md`
6. `implementation_task_board.md`
7. `task_launch_template.md`
8. `new_requirement_intake_template.md`
9. `new_requirement_execution_flow.md`
10. `test_governance.md`
11. `execution_governance.md`

Then read only the scope-specific specs that apply to the task:

- `narrative_state_schema.md`
- `knowledge_visibility_spec.md`
- `causal_validation_spec.md`
- `replay_spec.md`
- `consistency_metric_catalog.md`
- `incident_postmortem_template.md`
- `integration_plan_alpha_autopilot.md`

## Operational rule

If a change affects replay, observability, metrics, gating, incident handling, or integration contracts, update the governing spec before or alongside the implementation work.
