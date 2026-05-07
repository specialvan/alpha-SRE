# Causal Validation Specification

## Purpose

Validate that narrative outcomes follow from recorded causes, not from hidden state drift or unexplained overrides.

## Validation goals

- identify which prior event enabled a scene outcome
- detect missing write-back or missing propagation
- detect unauthorized world-rule changes
- distinguish content defects from mechanism defects
- support replay-based regression analysis

## Causal chain model

Each narrative outcome must map to:

- prerequisite events
- state transitions
- authority source
- visibility conditions
- resulting effect

## Validation rules

- a cause must precede its effect in recorded causal order
- every major outcome must have at least one recorded enabling event
- a change in character behavior must be explainable by visible state or an explicit reveal
- a change in world rules must come from an authorized rule event
- a missing prerequisite is a validation failure, not a stylistic issue
- a false belief that is present in state must be diagnosed separately from a hidden-fact leak
- a denied capability must be diagnosed as a capability violation, not as generic causality failure
- an inactive world rule must be diagnosed as inactive rule use
- a due plot obligation without payoff must be diagnosed as plot obligation missed

## Failure classes

- missing precondition
- missing state write-back
- unauthorized overwrite
- visibility leak
- belief conflict
- capability violation
- inactive rule use
- plot obligation missed
- post-state mismatch
- rule drift
- contradictory event chain
- untraceable outcome

## Knowledge visibility checks

Validation must detect when:

- a character acts on information it should not know
- a hidden rule becomes visible too early
- the system uses future knowledge to justify past behavior
- a reveal event is missing but the effect depends on it
- a belief is present but conflicts with canonical truth
- an event depends on a capability that is denied in state
- an event depends on a rule that is present but inactive
- a plot thread reaches its payoff boundary without resolution

## Output

Validation must report:

- offending event id
- missing prerequisite or overwrite point
- affected state field
- affected character or rule
- replay evidence reference
- recommended regression test

### Executable finding contract

The validation layer should emit one structured finding per causal failure.

Minimum fields:

- failure class
- offending event id
- missing prerequisite or overwrite point when applicable
- affected state field
- affected subject
- replay evidence reference
- recommended regression test
- checked outcome count
- checked visibility decision count
- checked actor action count
- checked plot obligation count
- checked rule activation count

Output rules:

- each finding must map to a concrete failure class from this specification
- replay evidence reference must point to the replay event or locked artifact that anchors the diagnosis
- recommended regression test must be stable enough to reuse in incident follow-up
- replay-facing causal chain diffs may be derived from these findings, but must not contradict them

## Acceptance criteria

- causal failures can be pointed to a specific event or missing event
- replay and validation agree on the failure class
- visibility violations are separated from general plot inconsistency
- at least one known failure class can be reproduced from a locked replay
