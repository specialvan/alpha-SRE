# Integration Plan for alpha-autopilot

## Purpose

Define how `alpha-SRE` will later connect to `alpha-autopilot` without collapsing the reliability boundary.

## Integration principles

- Keep `alpha-SRE` as the operational control plane.
- Keep `alpha-autopilot` as the content generation system.
- Connect through versioned contracts, not ad hoc state sharing.
- Preserve replay determinism and consistency gates.
- Prefer read-only observation paths before any write-back path.

## State ownership precedence

1. `alpha-SRE` owns the versioned reliability contract.
2. `alpha-autopilot` owns generation behavior.
3. Shared state must be represented by explicit versioned artifacts.
4. If contracts conflict, the reliability boundary wins until a reviewed change updates it.

## Proposed integration surfaces

- narrative state read API
- write-back API
- replay request API
- metrics export API
- incident export API

## Contract outline by surface

### Narrative state read API

Minimum request contract:

- state identity
- schema version
- visibility version
- caller identity

Minimum response contract:

- locked snapshot id
- state identity
- schema version
- visibility version
- artifact reference
- snapshot payload returned as a defensive copy or equivalent logically frozen artifact

Rejection rules:

- reject on schema version mismatch
- reject on visibility version mismatch
- reject when requested state identity is unknown

### Write-back API

Minimum request contract:

- command reference
- source snapshot id
- expected schema version
- expected policy version
- expected visibility version
- expected replay contract version
- source system identity
- actor identity
- ordered event chain

Minimum response contract:

- write-back status
- replay result reference
- gate result
- drift report
- metric summary, including omission-rate signals when replay audited eligible write surfaces
- contract version

Rejection rules:

- reject before write-back on any version mismatch
- reject when the replay result fails the consistency gate
- reject when drift is detected across locked state lineage or policy version

Audit expectation:

- operators should persist a release-attempt record for each write-back attempt when rollback-rate metrics or manual rollback evidence are required
- when change-history metrics are required, the release-attempt record should preserve whether the attempt derives from a prior attempt

### Replay request API

Minimum request contract:

- target command id
- locked pre-state snapshot id
- policy version
- visibility snapshot version
- replay operator id
- observation frame when actor-visible behavior is being replayed

Minimum response contract:

- replay id
- failure classification
- causal chain diff
- evidence references

### Metrics export API

Minimum contract:

- metric name
- metric value
- state artifact reference
- computation window or request scope
- contract version

### Incident export API

Minimum contract:

- incident id
- incident export artifact reference
- replay references
- failure classification
- regression test reference
- rollback reasoning
- evidence references
- action items
- contract version

Rejection rules:

- reject when the incident artifact omits replay references or evidence references
- reject when the incident export contract version is unsupported
- reject when the incident report does not preserve locked command or snapshot references

## Version contract requirements

- every read surface must declare a schema version
- every write-back surface must declare compatible target, schema, policy, visibility, and replay contract versions
- replay requests must name the locked command, snapshot, and policy versions
- metrics export must include the state artifact version used for computation
- incident export must preserve replay references and failure classification

## Drift and bypass handling

- replay drift must be detected by comparing locked snapshots and policy versions
- gate bypass must be treated as an explicit override event with audit evidence
- fallback behavior must be versioned and documented
- if fallback changes consistency guarantees, it must be treated as a separate reviewed contract

### Gate bypass contract

Any bypass must record:

- override event id
- operator identity
- reason code
- affected command or snapshot reference
- expiration or review condition
- incident follow-up requirement

Bypass rules:

- a bypass cannot silently downgrade the replay or gate contract version
- a bypass must remain visible in incident export and audit artifacts
- repeated bypasses of the same class should be tracked as a regression signal

### Fallback behavior contract

Fallback behavior must declare:

- triggering failure class
- fallback mode identifier
- weakened guarantees if any
- whether write-back remains allowed
- rollback trigger if fallback mode is later deemed unsafe

## Integration risks

- duplicated state ownership
- mismatch in versioning
- replay drift
- gate bypass
- undocumented fallback behavior

## Integration acceptance criteria

- state contracts are versioned
- replay works against locked snapshots
- consistency gates remain authoritative
- rollbacks are visible and auditable
- fallback behavior is explicit and reviewable
- bridge contracts reject version mismatches before write-back
