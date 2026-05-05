# Replay Specification

## Purpose

Provide deterministic replay for narrative generation outputs under locked versions.

## Replay inputs

- command sequence
- event chain
- versioned snapshots
- policy state
- chapter intent

## Replay outputs

- output diff
- state diff
- constraint diff
- causal chain diff
- failure classification

## Replay rules

- lock versions before replay
- isolate side effects
- compare state before comparing prose
- classify failure by mechanism, not by style alone

## Replay success criteria

- the same locked inputs yield the same structural diagnosis
- critical divergence is explainable
- missing mechanism candidates are surfaced
