# Implementation Task Board

## Goal

Build the standalone narrative SRE control plane before integrating with `alpha-autopilot`.

## Current work items

### T1. Define versioned narrative state schema
- Layer: baseline
- Outcome: explicit state objects for characters, world, plot, memory, policy, and chapter intent

### T2. Define command / event / snapshot separation
- Layer: baseline
- Outcome: replay can reconstruct causal history

### T3. Define replay orchestrator
- Layer: baseline
- Outcome: locked-version replay sessions with state diffs

### T4. Define consistency gate
- Layer: baseline
- Outcome: block publication on hard narrative violations

### T5. Define incident analysis template
- Layer: increment
- Outcome: mechanism-missing diagnosis and replay-based validation

### T6. Define alpha-autopilot integration plan
- Layer: increment
- Outcome: boundary-safe connection path into the content generator

## Status

- Baseline structure: in progress
- Integration plan: pending
- Experimental items: not started
