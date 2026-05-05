# Execution Governance

## Core rules

- One task, one primary goal.
- Keep baseline changes small and reviewable.
- Protect the independent SRE boundary until integration is explicitly approved.
- Document every change that affects replay, metrics, gates, or incidents.
- Rollback expectations must be written before implementation starts.

## Layer rules

### Baseline
Stable and approved operational behavior only.

### Increment
Controlled improvements that do not break baseline guarantees.

### Experimental
Sandboxed work that cannot change baseline behavior.

### Archive
Removed from active execution.

## Completion rule

A task is not complete until:

- tests pass
- docs are updated
- rollback is known
- layer classification is still correct
