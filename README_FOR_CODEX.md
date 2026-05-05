# README for Codex

`alpha-SRE` is the standalone reliability and operations package for narrative generation.

## What Codex should do here

- Treat this project as the operational control plane for narrative generation.
- Keep the package governance-first.
- Do not merge implementation details into the content-generation application until the SRE layer is stable.
- Prefer explicit schemas, replay specifications, and consistency gates over prose-only designs.

## Read order

1. `CODEX_DEVELOPMENT_GOVERNANCE.md`
2. `SHORT_NAV.md`
3. `START_HERE.md`
4. `package_manifest.md`
5. `package_overview.md`
6. `codex_run_card.md`
7. `new_requirement_intake_template.md`
8. `new_requirement_execution_flow.md`
9. `test_governance.md`
10. `execution_governance.md`

## Operational rule

If a change affects replay, observability, metrics, gating, or incident analysis, it must be documented in the governance package before or alongside implementation.
