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
- fact registry
- belief graph
- plot thread or obligation state
- capability and action boundaries
- persisted visibility graph

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
- belief ids
- capability ids
- current location
- present-with character ids
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
- activation status
- active from event id
- authority mode
- schema version

### Chapter intent state

Required fields:

- intent id
- scene or chapter target
- desired narrative effect
- required preconditions
- forbidden outcomes
- schema version

### Fact state

Facts are first-class narrative truth records. Visibility, belief, replay, and metrics should point to stable fact ids instead of prose-only claims.

Required fields:

- fact id
- fact text
- fact type
- introduced by event id
- valid from event id
- valid until event id
- canonical truth status
- related character ids
- related rule ids
- schema version

Allowed canonical truth statuses:

- true
- false
- unknown
- contested
- retracted

### Belief state

Beliefs model a character's subjective state separately from canonical truth.

Required fields:

- belief id
- holder character id
- fact id
- belief status
- confidence
- derived from event id
- derived from memory ids
- contradicts fact id
- schema version

Allowed belief statuses:

- certain
- suspected
- false
- retracted

Rules:

- every belief must point to a fact in the snapshot
- a false or mistaken belief may point to a canonical-false fact and may reference the canonical fact it contradicts
- belief-derived behavior must not be automatically classified as a visibility leak when the belief is present in state

### Plot thread state

Plot threads and obligations model open narrative commitments.

Required fields:

- thread id
- thread type
- status
- introduced by event id
- required payoff by
- blocking event ids
- resolution event id
- affected characters
- schema version

Allowed statuses:

- open
- active
- blocked
- resolved
- dropped

Rules:

- unresolved obligations stay visible to validation and gate logic until resolved or dropped
- resolved plot threads must name the resolution event

### Capability state

Capabilities model whether an actor can perform an action at a given narrative point.

Required fields:

- capability id
- character id
- action type
- allowed
- source rule id
- source constraint id
- valid from event id
- valid until event id
- schema version

Rules:

- capability character ids must exist in the snapshot
- source rule and constraint references must resolve when present
- observation-frame action windows must not contradict persisted capability state in semantic replay

### Visibility edge state

Visibility edges are the persisted source of truth for fact-to-viewer knowledge boundaries.

Required fields:

- visibility edge id
- fact id
- viewer id
- visibility status
- visibility source
- valid from event id
- valid until event id
- schema version

Allowed visibility statuses:

- visible
- hidden
- narrator_only
- system_only

Rules:

- every visibility edge must point to a fact
- viewer ids must be a character id, `narrator`, or `system`
- observation frames may narrow visibility for a replay step, but must remain attributable to persisted visibility edges

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
- fact, belief, visibility, capability, and plot-thread references must resolve inside the snapshot
- invalid belief, plot-thread, rule activation, and visibility statuses must be rejected
- character belief ids and capability ids must point to existing kernel records
- hidden facts, false beliefs, impossible actions, and unresolved obligations must be representable before replay consumes them
