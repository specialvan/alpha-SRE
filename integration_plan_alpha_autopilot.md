# Integration Plan for alpha-autopilot

## Purpose

Define how `alpha-SRE` will later connect to `alpha-autopilot` without collapsing the reliability boundary.

## Integration principles

- Keep `alpha-SRE` as the operational control plane.
- Keep `alpha-autopilot` as the content generation system.
- Connect through versioned contracts, not ad hoc state sharing.
- Preserve replay determinism and consistency gates.

## Proposed integration surfaces

- narrative state read API
- write-back API
- replay request API
- metrics export API
- incident export API

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
