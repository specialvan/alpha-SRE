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

Retired material removed from active execution.

## Exit paths for a task

### Complete

Use when:

- acceptance criteria are met
- required docs are updated
- evidence exists
- rollback expectations are documented

### Continue iterating

Use when:

- the baseline is still safe
- the next scope is known
- open gaps are explicitly tracked

### Archive

Use when:

- the idea is superseded, rejected, or intentionally retired
- the reason for retirement is documented

## Completion rule

A task is not complete until:

- tests cover the changed capability
- docs are updated
- rollback trigger and path are known
- layer classification is still correct
- evidence links or artifact locations are recorded
