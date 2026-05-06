# Start Here

This package is the standalone SRE system for narrative generation.

## Official quick path

Follow this exact order on first entry:

1. `CODEX_DEVELOPMENT_GOVERNANCE.md`
2. `SHORT_NAV.md`
3. `package_manifest.md`
4. `package_overview.md`
5. `implementation_task_board.md`
6. `task_launch_template.md`
7. `new_requirement_intake_template.md`
8. `new_requirement_execution_flow.md`
9. `test_governance.md`
10. `execution_governance.md`

## What this package controls

- versioned narrative state and replay
- narrative observability
- consistency validation and gating
- incident analysis and rollback evidence
- future integration into `alpha-autopilot`

## What this package is not

- It is not the story generator itself.
- It is not the primary writing application.
- It is not a loose document dump.

## First decision for any task

Classify the task as one of:

- baseline
- increment
- experimental
- archive

Then identify the required evidence:

- specification update
- test layer
- rollback trigger
- index or manifest impact
