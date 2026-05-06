# Narrative State Schema

## Purpose

Define the versioned narrative state that replay, validation, and incident analysis operate on.

## Scope

The state model must support:

- role state
- plot state
- world rules
- memory state
- knowledge visibility
- chapter intent

## Core entities

### Character state

Required fields:

- character id
- role name
- current goal
- current emotional state
- relationship links
- active constraints
- memory references
- knowledge scope
- schema version

### Relationship state

Required fields:

- subject character id
- object character id
- relation type
- trust value or relation weight
- last updated event id
- visibility scope
- schema version

### Memory state

Required fields:

- memory id
- owning character id
- memory claim
- confidence level
- source event id
- retention status
- visibility scope
- schema version

### Taboo or constraint state

Required fields:

- constraint id
- constraint text
- authority source
- affected actors
- enforcement mode
- violation history
- schema version

### World rule state

Required fields:

- rule id
- rule text
- domain
- enforcement strength
- allowed exceptions
- provenance source
- schema version

### Chapter intent state

Required fields:

- intent id
- scene or chapter target
- desired narrative effect
- required preconditions
- forbidden outcomes
- schema version

## Knowledge visibility model

Every state fact must declare who can know it.

Visibility scopes:

- public
- character-local
- group-local
- narrator-visible
- system-visible
- hidden

Rules:

- a character may only act on facts inside its visibility scope
- hidden facts may affect the system but must not leak into character decisions
- replay must preserve the visibility boundary at the time of the event
- a later reveal does not retroactively grant earlier knowledge

## State identity rules

- each snapshot must carry a state identity
- state identity is preserved across compatible versions unless a lineage break is declared
- incompatible schema upgrades must be explicit
- the same state identity must not represent two conflicting world-rule sets

## Mutation rules

- state changes occur only through versioned events
- direct silent mutation is not allowed
- every write must indicate the fields changed and the reason
- every write must preserve old values for replay comparison
- persisted memory writes must keep `memories.<memory_id>` aligned with the owning character's `memory references`

## Replay use

Replay reads this schema to reconstruct:

- what the system knew
- what each character knew
- what each actor was allowed to do
- whether a rule or taboo was violated

## Validation requirements

- every snapshot must validate against the schema version
- every character decision must reference visible facts only
- every relationship change must have a causal event
- every world rule change must be attributable to an authorized source
