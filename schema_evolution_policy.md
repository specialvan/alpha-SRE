# Schema Evolution Policy

## Purpose

Define how narrative state schema versions may evolve without making replay or write-back ambiguous.

## Compatibility rule

- schema versions are compatible only when they share the same major version
- newer minor or patch versions may be read when they remain structurally additive
- older schema versions are not assumed to satisfy newer expected contracts
- malformed version strings are incompatible

## Enforcement rule

- `read_snapshot` may accept a compatible snapshot schema version
- `write_back` may accept a compatible snapshot schema version
- replay sessions may execute only when the locked snapshot schema is compatible with the session contract
- incompatible upgrades must be explicit and must fail validation, not silently downgrade

## Operational rule

- compatibility never overrides policy version, visibility version, or locked post-state checks
- compatibility only governs schema shape, not narrative authority

## Artifact read policy

- replay bundle, incident report, release attempt, and quality review artifacts must carry their own artifact or contract version field
- missing or unsupported artifact versions must fail explicitly during load; they must not silently downgrade to a default version
- future artifact upgrades must choose one explicit strategy per loader: compatible read, explicit migration, or explicit failure
