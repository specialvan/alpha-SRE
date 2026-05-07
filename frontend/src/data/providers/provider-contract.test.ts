import { describe, expect, it } from 'vitest'

import type { FrontendArtifactIndex } from '../types'
import { createArtifactProvider } from './artifact-provider'
import { createMockProvider } from './mock-provider'

const seededIndex: FrontendArtifactIndex = {
  generatedAt: '2026-05-07T18:00:00Z',
  overview: {
    recentReplaySucceeded: false,
    recentGateAllowed: false,
    recentIncidentCount: 1,
    reviewSampleCount: 1,
    recentPostStateMismatchCount: 1,
    supportsReviewTimeline: true,
    activity: [
      {
        id: 'activity-bundle-post-state',
        kind: 'replay_bundle',
        title: 'Locked post-state mismatch',
        timestamp: '2026-05-07T16:00:00Z',
        description: 'Replay bundle blocked by locked post-state divergence.',
        href: '/replay/bundle:post-state-mismatch',
      },
    ],
  },
  metrics: {
    summary: {
      trace_completeness: 1,
      replay_availability: 0,
      checked_post_state_surface_count: 1,
      post_state_mismatch_rate: 1,
      checked_outcome_count: 2,
      visibility_leak_rate: 0,
      belief_conflict_rate: 0,
      capability_violation_rate: 0,
      inactive_rule_use_rate: 0,
      plot_obligation_miss_rate: 0,
    },
    timeSeries: [
      {
        key: 'post_state_mismatch_rate',
        label: 'Post-state mismatch rate',
        points: [0, 0.5, 1],
      },
    ],
    gateRefs: ['gate:bundle:post-state-mismatch'],
    supportsTimeRange: true,
  },
  artifacts: [
    {
      ref: 'bundle:post-state-mismatch',
      kind: 'replay_bundle',
      title: 'Locked post-state mismatch',
      description: 'Replay bundle with explicit locked post-state failure.',
      updatedAt: '2026-05-07T16:00:00Z',
      path: 'artifacts/bundles/post-state-mismatch.json',
      tags: ['post_state_mismatch', 'replay'],
      sections: [
        { key: 'snapshot', label: 'Snapshot', summary: 'Locked pre-state snapshot.' },
        { key: 'replay', label: 'Replay', summary: 'Replay result and event chain.' },
        { key: 'validation', label: 'Validation', summary: 'Structured finding list.' },
        { key: 'metrics', label: 'Metrics', summary: 'Replay-scoped metrics.' },
        { key: 'gate', label: 'Gate', summary: 'Blocking gate evidence.' },
      ],
      links: {
        snapshotRef: 'snapshot:s-v2-pre',
        replayRef: 'bundle:post-state-mismatch',
        validationRef: 'validation:bundle:post-state-mismatch',
        gateRef: 'gate:bundle:post-state-mismatch',
        incidentRef: 'incident:inc-post-state',
        releaseRef: 'release:rel-post-state',
      },
    },
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
        replayRef: 'bundle:post-state-mismatch',
        validationRef: 'validation:bundle:post-state-mismatch',
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
        snapshotRef: 'snapshot:s-v2-pre',
        replayRef: 'bundle:post-state-mismatch',
        gateRef: 'gate:bundle:post-state-mismatch',
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
        artifactRef: 'bundle:post-state-mismatch',
        replayRef: 'bundle:post-state-mismatch',
      },
    },
  ],
  snapshots: [
    {
      ref: 'snapshot:s-v2-pre',
      snapshotId: 's-v2-pre',
      artifactRef: 'bundle:post-state-mismatch',
      title: 'Snapshot s-v2-pre',
      createdAt: '2026-05-07T15:59:00Z',
      stateIdentity: 'state-v2',
      schemaVersion: '1.0',
      policyVersion: 'p1',
      visibilityVersion: 'v2',
      summary: 'Locked pre-state with protagonist goal before replay.',
      links: {
        artifactRef: 'bundle:post-state-mismatch',
        replayRef: 'bundle:post-state-mismatch',
        incidentRef: 'incident:inc-post-state',
      },
      raw: {
        snapshot_id: 's-v2-pre',
        state_identity: 'state-v2',
        schema_version: '1.0',
        policy_version: 'p1',
        visibility_version: 'v2',
        characters: {
          c1: {
            current_goal: 'find truth',
          },
        },
      },
    },
  ],
  replays: [
    {
      ref: 'bundle:post-state-mismatch',
      artifactRef: 'bundle:post-state-mismatch',
      artifactPath: 'artifacts/bundles/post-state-mismatch.json',
      title: 'Replay bundle: post-state mismatch',
      updatedAt: '2026-05-07T16:00:00Z',
      commandId: 'cmd-v2',
      commandType: 'edit',
      snapshotRef: 'snapshot:s-v2-pre',
      status: 'failed',
      failureClassification: 'post_state_mismatch',
      eventCount: 1,
      policyVersion: 'p1',
      promptVersion: 'chapter-intent-v2',
      visibilityVersion: 'v2',
      schemaVersion: '1.0',
      replayOperatorId: 'replay-op-1',
      issueCodes: ['post_state_mismatch'],
      evidenceReferences: ['command:cmd-v2', 'snapshot:s-v2-pre', 'event:e1'],
      postStatePaths: ['characters.c1.current_goal'],
      observationFrame: {
        replay_id: 'replay-v2',
      },
      summary: 'Replay diverged from the locked post-state surface.',
      links: {
        artifactRef: 'bundle:post-state-mismatch',
        snapshotRef: 'snapshot:s-v2-pre',
        validationRef: 'validation:bundle:post-state-mismatch',
        gateRef: 'gate:bundle:post-state-mismatch',
        incidentRef: 'incident:inc-post-state',
        releaseRef: 'release:rel-post-state',
      },
    },
  ],
  validations: [
    {
      replayRef: 'bundle:post-state-mismatch',
      title: 'Validation for post-state mismatch replay',
      findings: [
        {
          id: 'finding-post-state-mismatch',
          replayRef: 'bundle:post-state-mismatch',
          failureClass: 'post_state_mismatch',
          subjectId: 'cmd-v2',
          affectedField: 'characters.c1.current_goal',
          source: 'replay_issue',
          evidenceReference: 'event:e1',
          recommendedRegressionTest:
            'replay_regression::locked_post_state_mismatch_visible',
          replayOperatorId: 'replay-op-1',
          timestamp: '2026-05-07T16:00:00Z',
          links: {
            replayRef: 'bundle:post-state-mismatch',
            snapshotRef: 'snapshot:s-v2-pre',
            incidentRef: 'incident:inc-post-state',
          },
        },
      ],
      regressionTests: ['replay_regression::locked_post_state_mismatch_visible'],
      supportsTimeRange: true,
      supportsReplayOperatorFilter: true,
      links: {
        replayRef: 'bundle:post-state-mismatch',
        snapshotRef: 'snapshot:s-v2-pre',
        incidentRef: 'incident:inc-post-state',
      },
    },
  ],
  gates: [
    {
      ref: 'gate:bundle:post-state-mismatch',
      sourceArtifactRef: 'bundle:post-state-mismatch',
      linkedReplayRef: 'bundle:post-state-mismatch',
      allowed: false,
      blockingIssues: ['post_state_mismatch'],
      warnings: [],
      explanation:
        'Locked post-state replay drifted on a required surface path.',
      thresholds: {
        max_post_state_mismatch_rate: 0,
      },
    },
  ],
  reviews: [
    {
      ref: 'review:review-post-state',
      title: 'Quality review: post-state case',
      updatedAt: '2026-05-07T17:00:00Z',
      reviewId: 'review-post-state',
      sourceArtifactReference: 'bundle:post-state-mismatch',
      evidenceReferences: ['event:e1'],
      checkedSegmentCount: 4,
      oocIncidentCount: 1,
      checkedSceneCount: 2,
      worldRuleViolationCount: 0,
      introducedSetupItemCount: 2,
      resolvedSetupItemCount: 1,
      summary: 'Review sample linked to the replay artifact.',
      links: {
        artifactRef: 'bundle:post-state-mismatch',
        replayRef: 'bundle:post-state-mismatch',
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
      requiredRegressionTest:
        'replay_regression::locked_post_state_mismatch_visible',
      evidenceReferences: ['event:e1', 'snapshot:s-v2-pre'],
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
        replayRef: 'bundle:post-state-mismatch',
        validationRef: 'validation:bundle:post-state-mismatch',
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
      triggeringCommandId: 'cmd-v2',
      startedAt: '2026-05-07T16:05:00Z',
      sourceSnapshotId: 's-v2-pre',
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
        snapshotRef: 'snapshot:s-v2-pre',
        replayRef: 'bundle:post-state-mismatch',
        gateRef: 'gate:bundle:post-state-mismatch',
        incidentRef: 'incident:inc-post-state',
      },
    },
  ],
}

const rawArtifacts: Record<string, unknown> = {
  'artifacts/bundles/post-state-mismatch.json': {
    bundle_version: '1.0',
    snapshot: {
      snapshot_id: 's-v2-pre',
    },
    replay: {
      failure_classification: 'post_state_mismatch',
      post_state_diff: ['characters.c1.current_goal'],
    },
    metrics: {
      checked_post_state_surface_count: 1,
      post_state_mismatch_rate: 1,
    },
    gate: {
      allowed: false,
      blocking_issues: ['post_state_mismatch'],
      warnings: [],
    },
  },
  'artifacts/incidents/inc-post-state.json': {
    incident_id: 'inc-post-state',
    evidence_references: ['event:e1'],
  },
  'artifacts/releases/rel-post-state.json': {
    attempt_id: 'rel-post-state',
    gate_allowed: false,
  },
  'artifacts/reviews/review-post-state.json': {
    review_id: 'review-post-state',
    evidence_references: ['event:e1'],
  },
}

describe('provider contract', () => {
  it('mock provider lists top-level artifacts and exposes derived sections', async () => {
    const provider = createMockProvider({
      index: seededIndex,
      rawArtifacts,
    })

    const artifacts = await provider.listArtifacts({
      page: 1,
      pageSize: 10,
    })

    expect(artifacts.total).toBe(4)
    expect(artifacts.items.map((item) => item.kind)).toEqual(
      expect.arrayContaining([
        'replay_bundle',
        'incident_report',
        'release_attempt_record',
        'quality_review_record',
      ]),
    )

    const detail = await provider.getArtifact('bundle:post-state-mismatch')

    expect(detail.sections.map((section) => section.key)).toEqual(
      expect.arrayContaining([
        'snapshot',
        'replay',
        'validation',
        'metrics',
        'gate',
      ]),
    )
    expect(detail.links.validationRef).toBe('validation:bundle:post-state-mismatch')
  })

  it('artifact provider derives snapshots, replay details, validation, and metrics from the seeded index', async () => {
    const provider = createArtifactProvider({
      indexLoader: async () => seededIndex,
      artifactLoader: async (path: string) => rawArtifacts[path],
    })

    const snapshots = await provider.listSnapshots({
      page: 1,
      pageSize: 10,
    })
    expect(snapshots.items[0].snapshotId).toBe('s-v2-pre')

    const replay = await provider.getReplayBundle('bundle:post-state-mismatch')
    expect(replay.failureClassification).toBe('post_state_mismatch')
    expect(replay.postStatePaths).toContain('characters.c1.current_goal')

    const validation = await provider.getValidationForReplay(
      'bundle:post-state-mismatch',
    )
    expect(validation.findings[0].failureClass).toBe('post_state_mismatch')
    expect(validation.regressionTests[0]).toMatch(/locked_post_state_mismatch/)

    const metrics = await provider.getMetrics({ timeRange: '7d' })
    expect(metrics.summary.post_state_mismatch_rate).toBe(1)
    expect(metrics.summary.checked_post_state_surface_count).toBe(1)
    expect(metrics.timeSeries[0].points).toEqual([0.5, 1])

    const compactMetrics = await provider.getMetrics({ timeRange: '24h' })
    expect(compactMetrics.timeSeries[0].points).toEqual([1])
  })

  it('both providers expose incident, review, and release evidence links', async () => {
    const mockProvider = createMockProvider({
      index: seededIndex,
      rawArtifacts,
    })

    const incident = await mockProvider.getIncident('incident:inc-post-state')
    expect(incident.links.releaseRef).toBe('release:rel-post-state')

    const release = await mockProvider.getReleaseAttempt(
      'release:rel-post-state',
    )
    expect(release.links.gateRef).toBe('gate:bundle:post-state-mismatch')

    const review = await mockProvider.getReview('review:review-post-state')
    expect(review.evidenceReferences).toContain('event:e1')
  })
})
