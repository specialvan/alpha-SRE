# Knowledge Visibility Specification

## Purpose

Define the baseline contract that prevents characters, agents, or replay sessions from acting on facts outside the valid visibility boundary.

## Scope

This specification governs:

- POV-bound knowledge during replay
- hidden versus visible fact handling
- persisted fact-to-viewer visibility edges
- accessible memory constraints
- allowed and blocked action windows
- visibility-linked failure classification
- evidence requirements for visibility incidents

## Core entities

### Visibility rule

Required fields:

- fact id
- visibility source
- visible actors
- hidden actors
- valid from event id
- confidence mode

### Visibility edge state

The V2 narrative kernel persists visibility as graph edges in `NarrativeSnapshot.visibility_edges`.

Required fields:

- visibility edge id
- fact id
- viewer id
- visibility status
- visibility source
- valid from event id
- valid until event id

Allowed visibility statuses:

- visible
- hidden
- narrator_only
- system_only

Rules:

- every visibility edge fact id must resolve to `NarrativeSnapshot.facts`
- viewer ids must resolve to a character id, `narrator`, or `system`
- observation frames are replay-local views and must be explainable from the persisted visibility graph
- false belief state is represented in `NarrativeSnapshot.beliefs` and must stay distinct from hidden fact leakage

Allowed visibility sources:

- witnessed
- told_by_actor
- inferred_with_evidence
- public_knowledge
- narrator_only
- system_only

Allowed confidence modes:

- certain
- suspected
- false_belief

### Observation frame

The replay observation frame is the executable visibility boundary for a specific replay step.

Required fields:

- replay id
- POV actor id or `narrator` / `system`
- input snapshot id
- visible fact ids
- hidden fact ids
- believed fact ids
- accessible memory ids
- allowed event or action types
- blocked event or action types
- retrieval context hash
- prompt context hash

Rules:

- the POV actor must exist in the locked snapshot unless the actor is `narrator` or `system`
- a fact cannot be both visible and hidden in the same frame
- inaccessible memory cannot justify a chapter outcome or behavior change
- blocked action types must be treated as impossible actions during replay diagnosis

## Violation types

- `knows_hidden_fact`: an actor is modeled as knowing a hidden fact
- `acts_on_hidden_fact`: an event outcome depends on a hidden fact
- `uses_inaccessible_memory`: an outcome depends on memory outside the observation frame
- `narrator_leak_into_character_pov`: narrator-only information enters a character decision path
- `future_knowledge_leak`: later information is used to justify earlier behavior
- `impossible_action`: the observation frame blocks the action but the event still occurs

## Replay integration requirements

- replay must validate the observation frame before applying events
- replay must classify hidden-fact or inaccessible-memory use as `visibility_leak`
- replay evidence references must include replay id, snapshot reference, command reference, and relevant event ids
- visibility diagnostics must remain separate from general plot inconsistency

## Gate requirements

- any hard visibility violation blocks publication or write-back
- visibility leak rate is a baseline gating metric
- repeated visibility violations of the same class must be treated as regression candidates

## Evidence requirements

Every confirmed visibility incident must record:

- offending event id
- violated fact id or memory id
- POV actor
- locked snapshot id
- replay id
- supporting evidence references
- recommended regression test

## Acceptance criteria

- a replay session can point to the exact event that crossed the visibility boundary
- inaccessible-memory use is distinguishable from generic causal failure
- hidden-fact use is distinguishable from generic plot inconsistency
- visibility violations can be gated and replayed deterministically

## Required test examples

- replay rejects a chapter outcome that depends on hidden memory outside the observation frame
- replay rejects a blocked action type in the active observation frame
- replay records stable evidence references for visibility failures
