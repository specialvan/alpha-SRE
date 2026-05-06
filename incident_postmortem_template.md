# Incident Postmortem Template

## Incident summary

- Incident id:
- Incident export artifact reference:
- Related release attempt record:
- Derived from earlier release attempt:
- Title:
- Severity:
- Status:
- Date opened:
- Date closed:
- Incident owner:

## User or system impact

- Affected workflow:
- Observable failure:
- Scope of impact:
- Detection source:

## Timeline

| Time | Event |
| --- | --- |
|  |  |

## Trigger and failure class

- Triggering command id:
- Suspected failure classification:
- Was rollback triggered:
- Was gate bypass involved:

## Replay evidence

- Replay session id:
- Locked command id:
- Locked event chain reference:
- Pre-state snapshot id:
- Post-state snapshot id:
- Policy version:
- Replay result summary:

## State and contract analysis

- State identity involved:
- Snapshot schema version:
- Read API or write-back contract version:
- Detected state drift:
- Detected contract mismatch:

## Mechanism-missing diagnosis

Record this section whenever the incident exists because the system lacked required operational behavior.

- Missing mechanism:
- Why existing controls did not prevent the incident:
- Which baseline or increment spec should own the fix:
- Temporary operator workaround:

## Root cause

- Primary cause:
- Contributing causes:
- Why the issue escaped earlier validation:
- Was this a recurrence of a prior incident:

## Mitigation and rollback

- Immediate mitigation:
- Rollback trigger:
- Rollback action taken:
- Residual risk after mitigation:

## Regression test follow-up

- Required regression test:
- Known failure class covered:
- Was this a regression:
- Was the regression confirmed by replay:
- Evidence location:
- Pass criteria for closure:

## Structured artifact expectations

When this postmortem is exported into a structured incident artifact, preserve at least:

- incident id
- replay references
- failure classification
- required regression test
- rollback reasoning
- evidence references
- action items

## Action items

| Action | Owner | Layer | Due date | Status |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Closure criteria

Close the incident only when:

- replay evidence is attached
- root cause and failure class are explicit
- rollback reasoning is documented
- regression coverage is added or formally waived
