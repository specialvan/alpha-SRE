# Test Governance

## Required test layers

- unit tests
- integration tests
- regression tests
- acceptance tests

## Rules

- Every baseline change needs at least one test update.
- Replay and consistency logic must have deterministic tests.
- Integration with `alpha-autopilot` must include compatibility tests.
- Regression tests should cover prior incidents and known failure classes.

## Test evidence

For every significant change, record:

- what was tested
- which layer was affected
- what was expected
- what failed if anything
- whether rollback was validated
