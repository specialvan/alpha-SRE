import type { FrontendArtifactIndex } from '../data/types'

interface ReplayCaseSeed {
  slug: string
  failureClass: string
  artifactTitle: string
  replayTitle: string
  description: string
  summary: string
  activityDescription: string
  commandId: string
  snapshotId: string
  stateIdentity: string
  povActorId: string
  subjectId: string
  affectedField: string
  eventId: string
  eventType: string
  targetId: string
  updatedAt: string
  snapshotCreatedAt: string
  replayOperatorId: string
  gateThresholdKey: string
  regressionTest: string
  snapshotRaw: Record<string, unknown>
  eventPayload: Record<string, unknown>
  rawMetrics: Record<string, number>
}

const replayCaseSeeds: ReplayCaseSeed[] = [
  {
    slug: 'post-state-mismatch',
    failureClass: 'post_state_mismatch',
    artifactTitle: 'Locked post-state mismatch',
    replayTitle: 'Replay bundle: post-state mismatch',
    description: 'Replay bundle with explicit locked post-state failure.',
    summary: 'Replay diverged from the locked post-state surface.',
    activityDescription: 'Replay bundle blocked by locked post-state divergence.',
    commandId: 'cmd-v2',
    snapshotId: 's-v2-pre',
    stateIdentity: 'state-v2',
    povActorId: 'c1',
    subjectId: 'cmd-v2',
    affectedField: 'characters.c1.current_goal',
    eventId: 'e1',
    eventType: 'update_goal',
    targetId: 'chapter-1',
    updatedAt: '2026-05-07T16:00:00Z',
    snapshotCreatedAt: '2026-05-07T15:59:00Z',
    replayOperatorId: 'replay-op-1',
    gateThresholdKey: 'max_post_state_mismatch_rate',
    regressionTest: 'replay_regression::locked_post_state_mismatch_visible',
    snapshotRaw: {
      characters: {
        c1: {
          character_id: 'c1',
          role_name: 'protagonist',
          current_goal: 'find truth',
          emotional_state: 'focused',
          knowledge_scope: 'character_local',
        },
      },
    },
    eventPayload: {
      character_id: 'c1',
      current_goal: 'protect ally',
    },
    rawMetrics: {
      checked_post_state_surface_count: 1,
      post_state_mismatch_rate: 1,
    },
  },
  {
    slug: 'visibility-leak',
    failureClass: 'visibility_leak',
    artifactTitle: 'POV visibility leak',
    replayTitle: 'Replay bundle: visibility leak',
    description: 'Replay bundle with unauthorized POV knowledge exposure.',
    summary: 'A hidden fact became visible outside the observation frame.',
    activityDescription: 'Validation flagged a POV knowledge leak.',
    commandId: 'cmd-vis-1',
    snapshotId: 's-vis-pre',
    stateIdentity: 'state-vis',
    povActorId: 'c2',
    subjectId: 'cmd-vis-1',
    affectedField: 'visibility_edges.c2.hidden_map',
    eventId: 'e-vis-1',
    eventType: 'leak_hidden_fact',
    targetId: 'scene-4',
    updatedAt: '2026-05-07T15:40:00Z',
    snapshotCreatedAt: '2026-05-07T15:39:00Z',
    replayOperatorId: 'replay-op-2',
    gateThresholdKey: 'max_visibility_leak_rate',
    regressionTest: 'replay_regression::visibility_leak_guard',
    snapshotRaw: {
      visibility_edges: {
        c2: ['public_square'],
        c4: ['hidden_map'],
      },
      beliefs: {
        c2: {
          hidden_map: false,
        },
      },
    },
    eventPayload: {
      actor_id: 'c2',
      leaked_fact: 'hidden_map',
      source_actor_id: 'c4',
    },
    rawMetrics: {
      checked_visibility_decision_count: 3,
      visibility_leak_rate: 1,
    },
  },
  {
    slug: 'belief-conflict',
    failureClass: 'belief_conflict',
    artifactTitle: 'Belief conflict after witness update',
    replayTitle: 'Replay bundle: belief conflict',
    description: 'Replay bundle with contradictory belief overwrite.',
    summary: 'The replay wrote a belief that conflicted with locked witness evidence.',
    activityDescription: 'Consistency review caught a belief contradiction.',
    commandId: 'cmd-belief-1',
    snapshotId: 's-belief-pre',
    stateIdentity: 'state-belief',
    povActorId: 'c3',
    subjectId: 'cmd-belief-1',
    affectedField: 'beliefs.c3.crown_heir',
    eventId: 'e-belief-1',
    eventType: 'overwrite_belief',
    targetId: 'chapter-6',
    updatedAt: '2026-05-07T15:20:00Z',
    snapshotCreatedAt: '2026-05-07T15:19:00Z',
    replayOperatorId: 'replay-op-3',
    gateThresholdKey: 'max_belief_conflict_rate',
    regressionTest: 'replay_regression::belief_conflict_guard',
    snapshotRaw: {
      beliefs: {
        c3: {
          crown_heir: 'ally',
        },
      },
      memories: {
        c3: ['testimony from chapter 6'],
      },
    },
    eventPayload: {
      actor_id: 'c3',
      belief_key: 'crown_heir',
      belief_value: 'enemy',
    },
    rawMetrics: {
      checked_outcome_count: 2,
      belief_conflict_rate: 1,
    },
  },
  {
    slug: 'capability-violation',
    failureClass: 'capability_violation',
    artifactTitle: 'Capability violation on locked door action',
    replayTitle: 'Replay bundle: capability violation',
    description: 'Replay bundle with an actor performing a forbidden action.',
    summary: 'The actor attempted an action outside the locked capability set.',
    activityDescription: 'Operator replay failed on actor capability enforcement.',
    commandId: 'cmd-cap-1',
    snapshotId: 's-cap-pre',
    stateIdentity: 'state-cap',
    povActorId: 'c4',
    subjectId: 'cmd-cap-1',
    affectedField: 'capabilities.c4.override_locked_door',
    eventId: 'e-cap-1',
    eventType: 'perform_forbidden_action',
    targetId: 'scene-9',
    updatedAt: '2026-05-07T15:00:00Z',
    snapshotCreatedAt: '2026-05-07T14:59:00Z',
    replayOperatorId: 'replay-op-4',
    gateThresholdKey: 'max_capability_violation_rate',
    regressionTest: 'replay_regression::capability_violation_guard',
    snapshotRaw: {
      capabilities: {
        c4: ['negotiate', 'observe'],
      },
      constraints: {
        c4: {
          cannot: 'override_locked_door',
        },
      },
    },
    eventPayload: {
      actor_id: 'c4',
      action: 'override_locked_door',
    },
    rawMetrics: {
      checked_actor_action_count: 2,
      capability_violation_rate: 1,
    },
  },
  {
    slug: 'inactive-rule-use',
    failureClass: 'inactive_rule_use',
    artifactTitle: 'Inactive rule activation',
    replayTitle: 'Replay bundle: inactive rule use',
    description: 'Replay bundle with a retired world rule invoked as active.',
    summary: 'The replay used a world rule that was locked inactive in the snapshot.',
    activityDescription: 'Rule activation drift surfaced during replay review.',
    commandId: 'cmd-rule-1',
    snapshotId: 's-rule-pre',
    stateIdentity: 'state-rule',
    povActorId: 'c5',
    subjectId: 'cmd-rule-1',
    affectedField: 'world_rules.warding_oath.active',
    eventId: 'e-rule-1',
    eventType: 'invoke_inactive_rule',
    targetId: 'chapter-10',
    updatedAt: '2026-05-07T14:40:00Z',
    snapshotCreatedAt: '2026-05-07T14:39:00Z',
    replayOperatorId: 'replay-op-5',
    gateThresholdKey: 'max_inactive_rule_use_rate',
    regressionTest: 'replay_regression::inactive_rule_use_guard',
    snapshotRaw: {
      world_rules: {
        warding_oath: {
          active: false,
          authority: 'chapter_pact',
        },
      },
    },
    eventPayload: {
      actor_id: 'c5',
      rule_id: 'warding_oath',
    },
    rawMetrics: {
      checked_rule_activation_count: 2,
      inactive_rule_use_rate: 1,
    },
  },
  {
    slug: 'plot-obligation-missed',
    failureClass: 'plot_obligation_missed',
    artifactTitle: 'Missed plot obligation payoff',
    replayTitle: 'Replay bundle: plot obligation missed',
    description: 'Replay bundle with a required payoff omitted from the event chain.',
    summary: 'A setup obligation stayed unresolved past its locked payoff point.',
    activityDescription: 'Plot thread monitoring found a missed payoff obligation.',
    commandId: 'cmd-plot-1',
    snapshotId: 's-plot-pre',
    stateIdentity: 'state-plot',
    povActorId: 'c6',
    subjectId: 'cmd-plot-1',
    affectedField: 'plot_threads.oath_return.payoff',
    eventId: 'e-plot-1',
    eventType: 'skip_obligation',
    targetId: 'chapter-12',
    updatedAt: '2026-05-07T14:20:00Z',
    snapshotCreatedAt: '2026-05-07T14:19:00Z',
    replayOperatorId: 'replay-op-6',
    gateThresholdKey: 'max_plot_obligation_miss_rate',
    regressionTest: 'replay_regression::plot_obligation_guard',
    snapshotRaw: {
      plot_threads: {
        oath_return: {
          setup: 'chapter 2 oath',
          payoff_due: 'chapter 8',
        },
      },
    },
    eventPayload: {
      thread_id: 'oath_return',
      missed_payoff: 'chapter 8',
    },
    rawMetrics: {
      checked_plot_obligation_count: 3,
      plot_obligation_miss_rate: 1,
    },
  },
  {
    slug: 'policy-drift',
    failureClass: 'policy_drift',
    artifactTitle: 'Policy drift between locked run and replay',
    replayTitle: 'Replay bundle: policy drift',
    description: 'Replay bundle with a policy version mismatch in the locked session.',
    summary: 'Replay inputs drifted onto a different policy surface than the locked run.',
    activityDescription: 'Policy drift blocked replay promotion.',
    commandId: 'cmd-policy-1',
    snapshotId: 's-policy-pre',
    stateIdentity: 'state-policy',
    povActorId: 'c7',
    subjectId: 'cmd-policy-1',
    affectedField: 'policy_version',
    eventId: 'e-policy-1',
    eventType: 'policy_override',
    targetId: 'chapter-14',
    updatedAt: '2026-05-07T14:00:00Z',
    snapshotCreatedAt: '2026-05-07T13:59:00Z',
    replayOperatorId: 'replay-op-7',
    gateThresholdKey: 'max_policy_drift_rate',
    regressionTest: 'replay_regression::policy_drift_guard',
    snapshotRaw: {
      chapter_intents: {
        chapter_14: 'negotiate ceasefire',
      },
    },
    eventPayload: {
      expected_policy: 'p1',
      actual_policy: 'p1-hotfix',
    },
    rawMetrics: {
      policy_drift_rate: 1,
    },
  },
  {
    slug: 'state-drift',
    failureClass: 'state_drift',
    artifactTitle: 'State drift on relationship trust',
    replayTitle: 'Replay bundle: state drift',
    description: 'Replay bundle with stale relationship state applied during replay.',
    summary: 'The replay mutated a state surface from an out-of-date relationship baseline.',
    activityDescription: 'State drift evidence pointed to a stale write-back input.',
    commandId: 'cmd-state-1',
    snapshotId: 's-state-pre',
    stateIdentity: 'state-drift',
    povActorId: 'c8',
    subjectId: 'cmd-state-1',
    affectedField: 'relationships.c7.c8.trust',
    eventId: 'e-state-1',
    eventType: 'apply_stale_state',
    targetId: 'chapter-15',
    updatedAt: '2026-05-07T13:40:00Z',
    snapshotCreatedAt: '2026-05-07T13:39:00Z',
    replayOperatorId: 'replay-op-8',
    gateThresholdKey: 'max_state_drift_rate',
    regressionTest: 'replay_regression::state_drift_guard',
    snapshotRaw: {
      relationships: {
        c7: {
          c8: {
            trust: 'wary',
          },
        },
      },
      memories: {
        c7: ['oath witnessed'],
      },
    },
    eventPayload: {
      relationship: 'c7.c8',
      expected: 'wary',
      actual: 'trusting',
    },
    rawMetrics: {
      state_drift_rate: 1,
    },
  },
  {
    slug: 'contract-mismatch',
    failureClass: 'contract_mismatch',
    artifactTitle: 'Contract mismatch in replay export',
    replayTitle: 'Replay bundle: contract mismatch',
    description: 'Replay bundle with an export contract mismatch against the locked schema.',
    summary: 'A required bundle field was missing from the exported replay contract.',
    activityDescription: 'Contract validation caught a replay export mismatch.',
    commandId: 'cmd-contract-1',
    snapshotId: 's-contract-pre',
    stateIdentity: 'state-contract',
    povActorId: 'c9',
    subjectId: 'cmd-contract-1',
    affectedField: 'integration.contract.replay_bundle.v2_2',
    eventId: 'e-contract-1',
    eventType: 'emit_contract_violation',
    targetId: 'chapter-16',
    updatedAt: '2026-05-07T13:20:00Z',
    snapshotCreatedAt: '2026-05-07T13:19:00Z',
    replayOperatorId: 'replay-op-9',
    gateThresholdKey: 'max_contract_mismatch_rate',
    regressionTest: 'replay_regression::contract_mismatch_guard',
    snapshotRaw: {
      constraints: {
        integration_contract: 'replay_bundle.v2.2',
      },
    },
    eventPayload: {
      contract: 'replay_bundle.v2.2',
      missing_field: 'evidence_references',
    },
    rawMetrics: {
      contract_mismatch_rate: 1,
    },
  },
  {
    slug: 'mechanism-missing',
    failureClass: 'mechanism_missing',
    artifactTitle: 'Missing narrative mechanism',
    replayTitle: 'Replay bundle: mechanism missing',
    description: 'Replay bundle with a required narrative mechanism absent from execution.',
    summary: 'The replay lacked a supporting mechanism needed to verify the intended payoff.',
    activityDescription: 'Mechanism coverage check failed for the replay pipeline.',
    commandId: 'cmd-mechanism-1',
    snapshotId: 's-mechanism-pre',
    stateIdentity: 'state-mechanism',
    povActorId: 'c10',
    subjectId: 'cmd-mechanism-1',
    affectedField: 'mechanisms.foreshadowing_tracker',
    eventId: 'e-mechanism-1',
    eventType: 'missing_mechanism',
    targetId: 'chapter-17',
    updatedAt: '2026-05-07T13:00:00Z',
    snapshotCreatedAt: '2026-05-07T12:59:00Z',
    replayOperatorId: 'replay-op-10',
    gateThresholdKey: 'max_mechanism_missing_rate',
    regressionTest: 'replay_regression::mechanism_missing_guard',
    snapshotRaw: {
      chapter_intents: {
        chapter_17: 'deliver payoff',
      },
      mechanisms: {
        foreshadowing_tracker: false,
      },
    },
    eventPayload: {
      mechanism: 'foreshadowing_tracker',
      effect: 'payoff verification skipped',
    },
    rawMetrics: {
      mechanism_missing_rate: 1,
    },
  },
]

function buildReplayCase(seed: ReplayCaseSeed) {
  const ref = `bundle:${seed.slug}`
  const snapshotRef = `snapshot:${seed.snapshotId}`
  const validationRef = `validation:${ref}`
  const gateRef = `gate:${ref}`
  const artifactPath = `artifacts/bundles/${seed.slug}.json`

  return {
    artifact: {
      ref,
      kind: 'replay_bundle' as const,
      title: seed.artifactTitle,
      description: seed.description,
      updatedAt: seed.updatedAt,
      path: artifactPath,
      tags: [seed.failureClass, 'replay'],
      sections: [
        { key: 'snapshot' as const, label: 'Snapshot', summary: `Locked snapshot ${seed.snapshotId}.` },
        { key: 'replay' as const, label: 'Replay', summary: 'Replay result and event chain.' },
        { key: 'validation' as const, label: 'Validation', summary: 'Structured finding list.' },
        {
          key: 'metrics' as const,
          label: 'Metrics',
          summary: 'Global aggregate metrics preview; replay-local metrics remain in artifact JSON.',
        },
        { key: 'gate' as const, label: 'Gate', summary: 'Blocking gate evidence.' },
      ],
      links: {
        snapshotRef,
        replayRef: ref,
        validationRef,
        gateRef,
      },
    },
    snapshot: {
      ref: snapshotRef,
      snapshotId: seed.snapshotId,
      artifactRef: ref,
      title: `Snapshot ${seed.snapshotId}`,
      createdAt: seed.snapshotCreatedAt,
      stateIdentity: seed.stateIdentity,
      schemaVersion: '1.0',
      policyVersion: 'p1',
      visibilityVersion: 'v2',
      summary: `${seed.artifactTitle} locked pre-state.`,
      links: {
        artifactRef: ref,
        replayRef: ref,
      },
      raw: {
        snapshot_id: seed.snapshotId,
        state_identity: seed.stateIdentity,
        schema_version: '1.0',
        policy_version: 'p1',
        visibility_version: 'v2',
        ...seed.snapshotRaw,
      },
    },
    replay: {
      ref,
      artifactRef: ref,
      artifactPath,
      title: seed.replayTitle,
      updatedAt: seed.updatedAt,
      commandId: seed.commandId,
      commandType: 'edit',
      snapshotRef,
      status: 'failed' as const,
      failureClassification: seed.failureClass,
      eventCount: 1,
      policyVersion: 'p1',
      promptVersion: 'chapter-intent-v2',
      visibilityVersion: 'v2',
      schemaVersion: '1.0',
      replayOperatorId: seed.replayOperatorId,
      issueCodes: [seed.failureClass],
      evidenceReferences: [
        `command:${seed.commandId}`,
        snapshotRef,
        `event:${seed.eventId}`,
      ],
      postStatePaths: [seed.affectedField],
      observationFrame: {
        replay_id: `replay-${seed.slug}`,
        at_causal_order_index: 1,
        pov_actor_id: seed.povActorId,
        input_snapshot_id: seed.snapshotId,
      },
      summary: seed.summary,
      links: {
        artifactRef: ref,
        snapshotRef,
        validationRef,
        gateRef,
      },
    },
    validation: {
      replayRef: ref,
      title: `Validation for ${seed.failureClass} replay`,
      findings: [
        {
          id: `finding-${seed.slug}`,
          replayRef: ref,
          failureClass: seed.failureClass,
          subjectId: seed.subjectId,
          affectedField: seed.affectedField,
          source: 'replay_issue' as const,
          evidenceReference: `event:${seed.eventId}`,
          recommendedRegressionTest: seed.regressionTest,
          replayOperatorId: seed.replayOperatorId,
          timestamp: seed.updatedAt,
          links: {
            replayRef: ref,
            snapshotRef,
          },
        },
      ],
      regressionTests: [seed.regressionTest],
      supportsTimeRange: true,
      supportsReplayOperatorFilter: true,
      links: {
        replayRef: ref,
        snapshotRef,
      },
    },
    gate: {
      ref: gateRef,
      sourceArtifactRef: ref,
      linkedReplayRef: ref,
      allowed: false,
      blockingIssues: [seed.failureClass],
      warnings: [],
      explanation: `${seed.artifactTitle} requires investigation before publication.`,
      thresholds: {
        [seed.gateThresholdKey]: 0,
      },
    },
    rawBundle: {
      bundle_version: '1.0',
      command: {
        command_id: seed.commandId,
        command_type: 'edit',
        operator_id: seed.replayOperatorId,
        target_id: seed.targetId,
        policy_version: 'p1',
        created_at: seed.updatedAt,
      },
      snapshot: {
        snapshot_id: seed.snapshotId,
        state_identity: seed.stateIdentity,
        schema_version: '1.0',
        policy_version: 'p1',
        visibility_version: 'v2',
        created_at: seed.snapshotCreatedAt,
        ...seed.snapshotRaw,
      },
      events: [
        {
          event_id: seed.eventId,
          command_id: seed.commandId,
          event_type: seed.eventType,
          causal_order_index: 1,
          created_at: seed.updatedAt,
          policy_version: 'p1',
          payload: seed.eventPayload,
        },
      ],
      replay: {
        ok: false,
        failure_classification: seed.failureClass,
        evidence_references: [
          `command:${seed.commandId}`,
          snapshotRef,
          `event:${seed.eventId}`,
        ],
        issues: [
          {
            code: seed.failureClass,
            message: `${seed.failureClass} detected during locked replay verification`,
            subject_id: seed.subjectId,
            field: seed.affectedField,
          },
        ],
        post_state_diff: [seed.affectedField],
      },
      metrics: {
        trace_completeness: 1,
        replay_availability: 0,
        ...seed.rawMetrics,
      },
      gate: {
        allowed: false,
        blocking_issues: [seed.failureClass],
        warnings: [],
      },
      drift_report: {
        drifted: seed.failureClass === 'state_drift' || seed.failureClass === 'policy_drift',
        reasons: [seed.failureClass],
        source_signature: {},
        replay_signature: {},
      },
      session: {
        policy_version: 'p1',
        prompt_version: 'chapter-intent-v2',
        replay_operator_id: seed.replayOperatorId,
        visibility_snapshot_version: 'v2',
        narrative_state_schema_version: '1.0',
        evidence_references: [ref],
        observation_frame: {
          replay_id: `replay-${seed.slug}`,
          at_causal_order_index: 1,
          pov_actor_id: seed.povActorId,
          input_snapshot_id: seed.snapshotId,
        },
      },
    },
    activity: {
      id: `activity-${seed.slug}`,
      kind: 'replay_bundle' as const,
      title: seed.artifactTitle,
      timestamp: seed.updatedAt,
      description: seed.activityDescription,
      href: `/replay/${ref}`,
    },
  }
}

const replayCases = replayCaseSeeds.map(buildReplayCase)
const primaryReplay = replayCases[0]

export const mockIndex: FrontendArtifactIndex = {
  generatedAt: '2026-05-07T18:30:00Z',
  overview: {
    recentReplaySucceeded: false,
    recentGateAllowed: false,
    recentIncidentCount: 1,
    reviewSampleCount: 1,
    recentPostStateMismatchCount: 1,
    supportsReviewTimeline: true,
    activity: replayCases.slice(0, 6).map((item) => item.activity),
  },
  metrics: {
    summary: {
      trace_completeness: 0.96,
      causality_break_rate: 0.2,
      visibility_leak_rate: 0.1,
      replay_availability: 0.9,
      causal_attribution_coverage: 0.88,
      rule_drift_rate: 0.1,
      write_back_success_rate: 0.72,
      same_class_failure_rate: 0.3,
      incident_recurrence_rate: 0.14,
      replay_confirmed_regression_rate: 0.67,
      version_lock_success_rate: 0.93,
      alarm_trigger_rate: 0.18,
      snapshot_freshness: 0.91,
      write_back_omission_rate: 0.08,
      memory_omission_rate: 0.12,
      manual_rollback_rate: 0.2,
      edit_amplitude: 0.44,
      plot_inconsistency_rate: 0.11,
      second_generation_rate: 0.17,
      character_ooc_rate: 0.09,
      world_rule_violation_rate: 0.07,
      foreshadowing_payoff_rate: 0.74,
      checked_outcome_count: 16,
      checked_visibility_decision_count: 12,
      checked_actor_action_count: 9,
      checked_plot_obligation_count: 7,
      checked_rule_activation_count: 8,
      checked_post_state_surface_count: 11,
      post_state_mismatch_rate: 0.09,
      belief_conflict_rate: 0.12,
      capability_violation_rate: 0.11,
      plot_obligation_miss_rate: 0.14,
      inactive_rule_use_rate: 0.1,
    },
    timeSeries: [
      {
        key: 'post_state_mismatch_rate',
        label: 'Post-state mismatch rate',
        points: [0.04, 0.06, 0.09],
      },
      {
        key: 'visibility_leak_rate',
        label: 'Visibility leak rate',
        points: [0.18, 0.12, 0.1],
      },
      {
        key: 'belief_conflict_rate',
        label: 'Belief conflict rate',
        points: [0.2, 0.16, 0.12],
      },
      {
        key: 'capability_violation_rate',
        label: 'Capability violation rate',
        points: [0.08, 0.13, 0.11],
      },
      {
        key: 'plot_obligation_miss_rate',
        label: 'Plot obligation miss rate',
        points: [0.22, 0.18, 0.14],
      },
    ],
    gateRefs: replayCases.slice(0, 6).map((item) => item.gate.ref),
    supportsTimeRange: true,
  },
  artifacts: [
    ...replayCases.map((item) => item.artifact),
    {
      ref: 'incident:inc-post-state',
      kind: 'incident_report',
      title: 'Post-state mismatch incident',
      description: 'Incident exported from the failing replay bundle.',
      updatedAt: '2026-05-07T16:20:00Z',
      path: 'artifacts/incidents/inc-post-state.json',
      tags: ['incident', 'post_state_mismatch'],
      sections: [],
      links: {
        replayRef: primaryReplay.replay.ref,
        validationRef: `validation:${primaryReplay.replay.ref}`,
        releaseRef: 'release:rel-post-state',
      },
    },
    {
      ref: 'release:rel-post-state',
      kind: 'release_attempt_record',
      title: 'Release rel-post-state',
      description: 'Blocked release attempt linked to the failing replay.',
      updatedAt: '2026-05-07T16:25:00Z',
      path: 'artifacts/releases/rel-post-state.json',
      tags: ['release', 'blocked'],
      sections: [],
      links: {
        snapshotRef: primaryReplay.snapshot.ref,
        replayRef: primaryReplay.replay.ref,
        gateRef: primaryReplay.gate.ref,
        incidentRef: 'incident:inc-post-state',
      },
    },
    {
      ref: 'review:review-post-state',
      kind: 'quality_review_record',
      title: 'Review review-post-state',
      description: 'Quality review linked back to the replay artifact.',
      updatedAt: '2026-05-07T17:00:00Z',
      path: 'artifacts/reviews/review-post-state.json',
      tags: ['review'],
      sections: [],
      links: {
        artifactRef: primaryReplay.artifact.ref,
        replayRef: primaryReplay.replay.ref,
      },
    },
  ],
  snapshots: replayCases.map((item) => item.snapshot),
  replays: replayCases.map((item) => item.replay),
  validations: replayCases.map((item) => item.validation),
  gates: replayCases.map((item) => item.gate),
  reviews: [
    {
      ref: 'review:review-post-state',
      title: 'Quality review: post-state case',
      updatedAt: '2026-05-07T17:00:00Z',
      reviewId: 'review-post-state',
      sourceArtifactReference: primaryReplay.artifact.ref,
      evidenceReferences: ['event:e1'],
      checkedSegmentCount: 4,
      oocIncidentCount: 1,
      checkedSceneCount: 2,
      worldRuleViolationCount: 0,
      introducedSetupItemCount: 2,
      resolvedSetupItemCount: 1,
      summary: 'Review sample linked to the replay artifact.',
      links: {
        artifactRef: primaryReplay.artifact.ref,
        replayRef: primaryReplay.replay.ref,
      },
    },
  ],
  incidents: [
    {
      ref: 'incident:inc-post-state',
      title: 'Post-state mismatch incident',
      updatedAt: '2026-05-07T16:20:00Z',
      incidentId: 'inc-post-state',
      severity: 'high',
      status: 'open',
      dateOpened: '2026-05-07',
      incidentOwner: 'oncall-1',
      primaryCause: 'Locked post-state surface diverged.',
      rollbackTriggered: true,
      rollbackActionTaken: 'blocked pending write-back',
      requiredRegressionTest: primaryReplay.validation.regressionTests[0],
      evidenceReferences: ['event:e1', primaryReplay.snapshot.ref],
      actionItems: [
        {
          action: 'Add regression coverage',
          owner: 'frontend',
          layer: 'experimental',
          dueDate: '2026-05-08',
          status: 'open',
        },
      ],
      summary: 'Incident linked to replay, validation, and release attempt.',
      links: {
        replayRef: primaryReplay.replay.ref,
        validationRef: `validation:${primaryReplay.replay.ref}`,
        releaseRef: 'release:rel-post-state',
      },
    },
  ],
  releases: [
    {
      ref: 'release:rel-post-state',
      title: 'Release attempt rel-post-state',
      updatedAt: '2026-05-07T16:25:00Z',
      attemptId: 'rel-post-state',
      triggeringCommandId: primaryReplay.replay.commandId,
      startedAt: '2026-05-07T16:05:00Z',
      sourceSnapshotId: primaryReplay.snapshot.snapshotId,
      sourceSystem: 'alpha-autopilot',
      actor: 'operator-1',
      writeBackOk: false,
      gateAllowed: false,
      driftDetected: false,
      manualRollbackPerformed: true,
      rollbackReason: 'operator reverted pending publish',
      incidentId: 'inc-post-state',
      derivedFromAttemptId: null,
      summary: 'Release attempt blocked by gate evidence.',
      links: {
        snapshotRef: primaryReplay.snapshot.ref,
        replayRef: primaryReplay.replay.ref,
        gateRef: primaryReplay.gate.ref,
        incidentRef: 'incident:inc-post-state',
      },
    },
  ],
}

export const mockRawArtifacts: Record<string, unknown> = Object.fromEntries([
  ...replayCases.map((item) => [item.replay.artifactPath, item.rawBundle]),
  [
    'artifacts/incidents/inc-post-state.json',
    {
      incident_id: 'inc-post-state',
      evidence_references: ['event:e1'],
    },
  ],
  [
    'artifacts/releases/rel-post-state.json',
    {
      attempt_id: 'rel-post-state',
      gate_allowed: false,
    },
  ],
  [
    'artifacts/reviews/review-post-state.json',
    {
      review_id: 'review-post-state',
      evidence_references: ['event:e1'],
    },
  ],
])
