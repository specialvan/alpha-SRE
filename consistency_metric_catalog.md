# Consistency Metric Catalog

## Scope

These metrics measure whether narrative state, replay, and publishing behavior remain consistent across versioned artifacts.

## System health metrics

### Trace completeness

- Purpose: measure whether the causal chain is fully recorded.
- Calculation: completed trace edges / expected trace edges.
- Input source: command, event, and snapshot logs.
- Use cases: replay readiness, audit completeness.
- Gate use: yes.
- Alarm use: yes.
- Threshold hint: alert when completeness drops below the project baseline.

### Snapshot freshness

- Purpose: measure whether snapshots are recent enough for replay and diagnosis.
- Calculation: current time minus latest valid snapshot timestamp.
- Input source: versioned snapshot metadata.
- Use cases: replay confidence, stale-state detection.
- Gate use: yes.
- Alarm use: yes.
- Threshold hint: alert when freshness exceeds the allowed replay window.

Implementation note:

- current executable evidence is exposed as `MetricSummary.snapshot_freshness` in seconds
- executable computation uses the newest snapshot whose state artifact still passes validation
- gate consumers should compare this value against an explicit freshness budget such as `ConsistencyGate.max_snapshot_freshness_seconds`

### Replay availability

- Purpose: measure whether a locked replay can be executed when requested.
- Calculation: successful replay sessions / requested replay sessions.
- Input source: replay session records.
- Use cases: incident response, regression checks.
- Gate use: yes.
- Alarm use: yes.

### Version lock success rate

- Purpose: measure whether sessions can lock required versions before execution.
- Calculation: successful version locks / lock attempts.
- Input source: replay and publish orchestration logs.
- Use cases: contract health.
- Gate use: yes.
- Alarm use: yes.

Implementation note:

- current executable evidence can be sourced from replay results that preserve version-mismatch diagnostics

### Write-back success rate

- Purpose: measure whether versioned write-back completes without contract failure.
- Calculation: successful write-backs / attempted write-backs.
- Input source: write-back API records.
- Use cases: integration readiness, rollback validation.
- Gate use: yes.
- Alarm use: yes.

Implementation note:

- current executable evidence can be sourced from structured write-back results in `alpha_sre/integration.py`

### Causal attribution coverage

- Purpose: measure whether important outcomes have a recorded cause chain.
- Calculation: outcomes with complete causal chain / checked outcomes.
- Input source: replay validation and incident records.
- Use cases: causality health.
- Gate use: yes.
- Alarm use: yes.

### Visibility leak rate

- Purpose: measure how often hidden information influences character or system decisions.
- Calculation: visibility leak cases / checked visibility decisions.
- Input source: replay validation and review findings.
- Use cases: knowledge boundary monitoring.
- Gate use: yes.
- Alarm use: yes.

### Causality break rate

- Purpose: measure broken causal chains.
- Calculation: causality breaks / checked outcomes.
- Input source: replay diff classification and causal validation.
- Use cases: regression identification.
- Gate use: yes.
- Alarm use: yes.

### Post-state mismatch rate

- Purpose: measure replay/state disagreement against locked post-state artifacts.
- Calculation: mismatched post-state surfaces / checked post-state surfaces.
- Input source: replay post-state verification.
- Use cases: locked replay audit.
- Gate use: yes.
- Alarm use: yes.

### Belief conflict rate

- Purpose: measure how often a replayed action follows a false belief that is already represented in state.
- Calculation: belief conflicts / checked actor actions.
- Input source: replay and causal validation.
- Use cases: distinguish subjective error from hidden-fact leakage.
- Gate use: optional, policy-driven.
- Alarm use: yes when recurring.

### Capability violation rate

- Purpose: measure how often an actor performs an action denied by persisted capability state.
- Calculation: capability violations / checked actor actions.
- Input source: replay and causal validation.
- Use cases: impossible-action monitoring.
- Gate use: yes.
- Alarm use: yes.

### Inactive rule use rate

- Purpose: measure how often an event depends on an inactive rule.
- Calculation: inactive rule uses / checked rule activations.
- Input source: replay and causal validation.
- Use cases: world-rule activation monitoring.
- Gate use: yes.
- Alarm use: yes.

### Plot obligation miss rate

- Purpose: measure how often a due plot thread reaches payoff without discharge.
- Calculation: plot obligation misses / checked plot obligations.
- Input source: replay and causal validation.
- Use cases: narrative obligation monitoring.
- Gate use: configurable hard or soft.
- Alarm use: yes.

## Narrative quality metrics

These metrics are increment-level signals used to diagnose quality drift.

### Character OOC rate

- Purpose: measure out-of-character behavior rate.
- Calculation: OOC incidents / checked segments.
- Input source: review labels, validation results, incident tags.
- Use cases: narrative drift analysis.
- Gate use: no by default.
- Alarm use: optional.

Implementation note:

- current executable evidence can be sourced from structured `NarrativeQualityReviewRecord` artifacts
- the current baseline audit records checked segments and OOC incidents directly rather than inferring them from prose

### World rule violation rate

- Purpose: measure violations of established world constraints.
- Calculation: rule violations / checked scenes.
- Input source: constraint validation outputs.
- Use cases: consistency analysis, regression detection.
- Gate use: yes when hard rule.
- Alarm use: yes when repeated.

Implementation note:

- current executable evidence can be sourced from structured `NarrativeQualityReviewRecord` artifacts that preserve checked scenes and world-rule violation counts
- gate consumers may bind this metric only when the review or constraint source is authoritative for the target workflow

### Rule drift rate

- Purpose: measure unauthorized or unreviewed world-rule changes.
- Calculation: rule drift events / checked rule changes.
- Input source: world rule diffs and replay validation.
- Use cases: setting integrity monitoring.
- Gate use: yes.
- Alarm use: yes.

### Plot inconsistency rate

- Purpose: measure unresolved contradictions in plot causality.
- Calculation: inconsistency count / checked story units.
- Input source: replay diffs, review findings.
- Use cases: replay diagnosis.
- Gate use: yes when hard contradiction.
- Alarm use: yes when rising.

Implementation note:

- current executable evidence can be sourced from outcome-level causal findings emitted during replay validation
- the current baseline audit counts replay-confirmed outcome inconsistencies and keeps visibility-only findings out of this metric

### Foreshadowing payoff rate

- Purpose: measure whether setup and payoff are linked.
- Calculation: resolved setup items / introduced setup items.
- Input source: narrative review corpus.
- Use cases: editorial quality tracking.
- Gate use: no by default.
- Alarm use: optional.

Implementation note:

- current executable evidence can be sourced from structured `NarrativeQualityReviewRecord` artifacts that preserve introduced and resolved setup-item counts
- when no setup items are introduced inside the measured window, the current baseline executable metric returns `1.0`

### Write-back omission rate

- Purpose: measure how often an enabled event fails to persist required state.
- Calculation: missing write-back cases / eligible state transitions.
- Input source: replay diffs and state write logs.
- Use cases: mechanism defect detection.
- Gate use: yes.
- Alarm use: yes.

Implementation note:

- current executable evidence can be sourced from replay results that expose checked and omitted write-back surfaces
- the current baseline audit treats replay-supported state mutations as eligible transitions and records omission paths in `ReplayResult.write_back_omission_diff`

### Memory omission rate

- Purpose: measure missing recalled facts that should persist across state.
- Calculation: omissions / expected memory references.
- Input source: memory-state checks and replay diffs.
- Use cases: state integrity monitoring.
- Gate use: yes when persistent.
- Alarm use: yes.

Implementation note:

- current executable evidence can be sourced from replay results that audit `add_memory` propagation into the owning character's `memory_references`
- omission paths are preserved in `ReplayResult.memory_omission_diff`

## Production governance metrics

These are operational signals used to understand incident load and rollback behavior.

### Incident recurrence rate

- Purpose: measure repeat occurrence of prior incidents.
- Calculation: repeated incidents / total incidents.
- Input source: incident records.
- Use cases: reliability trend analysis.
- Gate use: no by default.
- Alarm use: yes if recurring class rises.

Implementation note:

- current executable evidence can be sourced from structured incident artifacts that preserve `recurred_from_prior_incident`

### Same-class failure rate

- Purpose: measure repeated failures of the same classification.
- Calculation: same-class failures / total failures.
- Input source: incident taxonomy.
- Use cases: regression tracking.
- Gate use: yes for repeated hard failures.
- Alarm use: yes.

### Replay-confirmed regression rate

- Purpose: measure how often regression was confirmed by replay evidence.
- Calculation: replay-confirmed regressions / total regressions.
- Input source: incident postmortems and replay sessions.
- Use cases: validation health.
- Gate use: yes for critical failures.
- Alarm use: yes.

Implementation note:

- current executable evidence can be sourced from structured incident artifacts that preserve `is_regression` and `replay_confirmed_regression`

### Manual rollback rate

- Purpose: measure how often operators had to roll back manually.
- Calculation: manual rollbacks / release attempts.
- Input source: release and incident logs.
- Use cases: rollback policy tuning.
- Gate use: no by default.
- Alarm use: yes.

Implementation note:

- current executable evidence can be sourced from structured `ReleaseAttemptRecord` artifacts
- manual rollback should be recorded explicitly on the release attempt artifact rather than inferred from prose-only incident notes

### Edit amplitude

- Purpose: measure how large the change is relative to prior version.
- Calculation: change magnitude normalized by affected state surface.
- Input source: version diffs.
- Use cases: risk scoring.
- Gate use: yes when amplitude exceeds policy.
- Alarm use: yes.

Implementation note:

- current executable evidence can be sourced from replay diff paths recorded in `ReplayResult`
- the current baseline normalization uses unique replay diff paths divided by a canonical persisted state-surface inventory derived from the versioned snapshot

### Second-generation rate

- Purpose: measure the rate of follow-up changes caused by the first change.
- Calculation: follow-up edits / primary edits.
- Input source: change history.
- Use cases: change quality analysis.
- Gate use: no by default.
- Alarm use: optional.

Implementation note:

- current executable evidence can be sourced from structured `ReleaseAttemptRecord` artifacts that preserve `derived_from_attempt_id`
- the current baseline audit treats attempts without a parent as primary edits and attempts with `derived_from_attempt_id` as follow-up edits

### Alarm trigger rate

- Purpose: measure how often gates or monitors fire.
- Calculation: triggered alarms / monitoring checks.
- Input source: monitor records.
- Use cases: alert tuning and signal hygiene.
- Gate use: yes.
- Alarm use: yes.

Implementation note:

- current executable evidence can be sourced from `GateResult` records that preserve blocking issues or warnings

## Rules

- All metrics must be computed from versioned state artifacts, not prose alone.
- Metrics used for gates must have an explicit threshold and an owner.
- Metrics used only for observation must be labeled as non-gating.
- Baseline metrics must be stable enough to support replay and regression evidence.
