# FAQ

## Why split alpha-SRE out from alpha-autopilot?

Because operational reliability needs its own control plane, contracts, test surface, and rollback discipline.

## What is the main source of truth?

The authoritative baseline documents listed in `CODEX_DEVELOPMENT_GOVERNANCE.md` and `package_manifest.md`.

## What is baseline vs increment vs experimental vs archive?

- Baseline: stable operating behavior required for trust.
- Increment: controlled capability growth on top of baseline.
- Experimental: isolated ideas that cannot affect the default path.
- Archive: retired or superseded material kept for traceability.

## What is replay?

Replay is deterministic reconstruction of a narrative execution using locked commands, events, snapshots, and policy versions.

## What is a metric in this package?

A metric is a versioned operational signal computed from state artifacts, replay evidence, or controlled integration records rather than prose alone.

## What is an incident in this package?

An incident is any reliability failure that requires diagnosis, replay evidence, mitigation, or rollback reasoning.

## What does integration mean here?

Integration means the reviewed contract boundary between `alpha-SRE` and `alpha-autopilot`, including versioned read paths, write-back paths, replay requests, and gate authority.

## When will integration happen?

Only after the standalone SRE package is stable, reviewable, and backed by explicit contracts.

## Can experimental ideas change baseline behavior?

No. Experimental work must stay isolated until reclassified through normal governance.

## What happens to retired documents?

They move to `archive/` and remain referenced from the package index.
