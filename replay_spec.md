# Replay Specification

## Purpose

Provide deterministic replay for narrative generation behavior under locked inputs, locked contracts, locked visibility, and isolated side effects.

## Core entities

### Command

A versioned request that asks the system to perform work.

Required fields:

- command id
- command type
- operator or caller identity
- requested chapter or scope
- policy version
- created timestamp

### Event

An immutable record of what actually happened while processing a command.

Required fields:

- event id
- parent command id
- event type
- causal order index
- emitted timestamp
- producer version

### Snapshot

A versioned capture of narrative state used for replay and diagnosis.

Required fields:

- snapshot id
- state identity
- snapshot schema version
- source event boundary
- created timestamp
- artifact references

## Replay session input contract

A replay session must declare:

- target command id
- ordered event chain
- pre-state snapshot id
- post-state snapshot id when available
- policy version
- prompt or chapter intent version
- dependency contract versions
- replay operator id
- visibility snapshot version
- narrative state schema version
- observation frame when actor-visible behavior is being replayed
- seed evidence references when replay depends on external trace artifacts

Replay is invalid if any required version is unknown or mixed ad hoc.

### Observation frame contract

An observation frame records what the system or POV actor could see, believe, and do at a specific replay step.

Required fields:

- replay id
- causal order index or replay tick
- POV actor id or `narrator` / `system`
- input snapshot id
- visible fact ids
- hidden fact ids
- believed fact ids
- accessible memory ids
- allowed event or action types
- blocked event or action types
- active world rule ids
- retrieval context hash
- prompt context hash
- write-back decision trace id when original execution included a write-back decision

Validation rules:

- the POV actor must exist in the locked snapshot unless the actor is `narrator` or `system`
- the same fact must not appear in both the visible and hidden sets
- the input snapshot id must match the locked pre-state snapshot
- an event or outcome that depends on memory outside `accessible memory ids` is a visibility leak
- an event or outcome that depends on a fact inside `hidden fact ids` is a visibility leak
- a false belief is distinct from a hidden-fact leak and must remain visible as its own diagnosis
- blocked event or action types must be treated as impossible actions during replay diagnosis

### Semantic replay contract

Replay must consume the narrative kernel as executable state, not passive storage.

Required semantic checks:

- hidden facts must be checked against the observation frame and the persisted visibility graph
- believed facts must resolve to persisted belief state when a replayed outcome claims subjective knowledge
- denied capabilities must block the action that relied on them
- inactive world rules must not authorize an event or outcome
- plot obligations must be checked against thread state and deadline or payoff expectations
- when a locked post-state snapshot is present, replay must compare the replayed state to the locked post-state and surface a structured post-state diff

## Identity and versioning rules

- `snapshot id` identifies a concrete stored artifact.
- `state identity` identifies the logical narrative state lineage.
- `policy version` identifies the decision rules used during execution.
- `visibility snapshot version` identifies the knowledge boundary in effect during execution.
- A replay session must lock all three before execution starts.
- State comparisons are only valid when snapshot schema versions are compatible under the schema evolution policy.

## Ordering rules

- Events must be replayed in recorded causal order.
- Missing events must be treated as a replay integrity failure, not silently skipped.
- Time is evidence, not authority. Causal order wins over wall-clock ties.
- A later reveal cannot rewrite what a character or actor knew at an earlier step.

## Side-effect isolation rules

Replay must not:

- publish content
- mutate production state
- emit write-back calls to `alpha-autopilot`
- overwrite source artifacts

Replay may:

- read locked artifacts
- produce replay-only diagnostics
- write isolated test or evidence outputs

## Replay outputs

- output diff
- state diff
- constraint diff
- causal chain diff
- visibility diff
- write-back omission diff
- memory omission diff
- post-state diff
- checked visibility decision count
- checked actor action count
- checked plot obligation count
- checked rule activation count
- checked post-state surface count
- failure classification
- missing mechanism candidates
- evidence references

Evidence references must be stable enough to point an operator back to the locked replay evidence set.

Replay-supported state mutations must be auditable against their expected write surfaces.

- if replay applies an event but the required persisted field is absent from the recorded replay write surfaces, the result must emit `missing_state_write_back`
- memory persistence audits must cover both the memory artifact itself and the owning character's `memory references` when the event adds memory state

Minimum evidence references:

- command reference
- pre-state snapshot reference
- event references for the replayed chain
- replay id when an observation frame exists
- write-back trace reference when the replay depends on write-back evidence

## Failure classification

Every replay result must classify the dominant failure mode:

- `input_mismatch`: locked inputs were not actually identical
- `contract_mismatch`: schema or API versions diverged
- `state_drift`: state lineage or snapshot content diverged
- `policy_drift`: policy version or policy behavior changed
- `side_effect_leak`: replay was influenced by external mutable state
- `mechanism_missing`: behavior failed because required operational logic did not exist
- `visibility_leak`: replay shows a character acted on hidden information
- `belief_conflict`: replay shows a character acted on a false belief that is present in state
- `capability_violation`: replay shows an actor performed an action denied by persisted capability state
- `inactive_rule_use`: replay shows an outcome depended on an inactive rule
- `plot_obligation_missed`: replay shows a due plot obligation was not discharged
- `post_state_mismatch`: replayed state does not match the locked post-state snapshot
- `unknown`: divergence exists but evidence is insufficient

Classification guidance:

- `input_mismatch` covers missing event chains, mismatched locked snapshot ids, or other replay-session input breaks
- `contract_mismatch` covers schema, visibility, prompt, or observation-frame contract divergence
- `state_drift` covers logical state-lineage breaks between locked pre-state and post-state artifacts
- `policy_drift` covers policy version divergence across the locked session
- `mechanism_missing` covers unsupported replay behavior, missing write-back logic, or impossible actions that the system cannot explain structurally
- `visibility_leak` covers use of hidden facts, inaccessible memories, or actor knowledge outside the observation frame
- `belief_conflict` covers a recorded false belief that is present in state and explains the outcome without implying a hidden-fact leak
- `capability_violation` covers actions that exceed persisted capability state
- `inactive_rule_use` covers outcomes that depend on inactive world-rule state
- `plot_obligation_missed` covers unresolved obligations that passed their payoff boundary
- `post_state_mismatch` covers replayed state that disagrees with the locked post-state snapshot

## Success criteria

Replay succeeds when:

- the locked session can be reconstructed end to end
- the same locked inputs yield the same structural diagnosis
- any critical divergence is explainable by evidence
- missing mechanism candidates are surfaced when applicable

## Minimum verification evidence

Replay work must include evidence for:

- deterministic replay on identical locked inputs
- failure on missing or incompatible versions
- side-effect isolation
- visibility boundary preservation
- incident regression reproduction for at least one known failure class

## Test examples required by governance

- happy path replay with identical command, events, and snapshots
- replay rejection for mixed schema versions
- replay rejection for missing event boundaries
- replay rejection for visibility leaks
- replay rejection for false belief conflict without hidden-fact leak
- replay rejection for capability violation
- replay rejection for inactive world-rule use
- replay rejection for locked post-state mismatch
- mechanism-missing diagnosis from a reproduced incident
- rollback-safe replay after a reverted policy version
