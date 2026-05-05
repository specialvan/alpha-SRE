# FAQ

## Why split alpha-SRE out from alpha-autopilot?

Because operational reliability needs its own control plane, test surface, and governance path.

## When will integration happen?

Only after the standalone SRE package is stable and reviewable.

## What is the main source of truth?

The governance documents in the root of `alpha-SRE`.

## Can experimental ideas change baseline behavior?

No. Experimental work must stay isolated.

## What happens to retired documents?

They move to `archive/` and are referenced from the index.
