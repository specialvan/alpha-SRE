# Codex Final Startup Prompt

## Responsibility

Use this prompt only as a fresh-entry bootstrap for Codex.

After the startup sequence is complete, rely on `codex_run_card.md` for mission guardrails and `codex_short_command_card.md` for the compact execution loop.

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

Then read only the scope-specific specs that apply to the task.

Classify the task as baseline, increment, experimental, or archive.

If the task touches replay, metrics, gating, incident analysis, or integration contracts, update the relevant spec before or alongside implementation.

Keep `alpha-SRE` independent until the operational layer is stable and reviewable.
