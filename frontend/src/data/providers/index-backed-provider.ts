import type {
  ArtifactDetail,
  ArtifactKind,
  ArtifactQuery,
  ArtifactSummary,
  FrontendArtifactIndex,
  GateDetail,
  IncidentDetail,
  IncidentQuery,
  JsonValue,
  ListCapabilities,
  ListResponse,
  MetricDetail,
  MetricQuery,
  OverviewSummary,
  ReleaseAttemptDetail,
  ReleaseAttemptQuery,
  ReplayBundleDetail,
  ReplayQuery,
  ReviewDetail,
  ReviewQuery,
  SectionInfo,
  SnapshotDetail,
  SnapshotQuery,
  ValidationDetail,
  ValidationFinding,
} from '../types'
import type { SreDataProvider } from '../provider'

interface IndexBackedProviderOptions {
  getIndex: () => Promise<FrontendArtifactIndex>
  loadRawArtifact: (path: string) => Promise<unknown>
}

interface NormalizedArtifactEntry {
  ref: string
  kind: ArtifactKind
  path: string
  title?: string
  description?: string
  updatedAt?: string
  tags: string[]
  sections: SectionInfo[]
  links: ArtifactSummary['links']
  nativePrimaryId?: string
}

interface MaterializedIndex {
  overview: OverviewSummary
  metrics: MetricDetail
  artifacts: ArtifactSummary[]
  snapshots: SnapshotDetail[]
  replays: ReplayBundleDetail[]
  validations: ValidationDetail[]
  gates: GateDetail[]
  reviews: ReviewDetail[]
  incidents: IncidentDetail[]
  releases: ReleaseAttemptDetail[]
}

const REPLAY_SECTIONS: SectionInfo[] = [
  { key: 'snapshot', label: 'Snapshot', summary: 'Locked pre-state snapshot.' },
  { key: 'replay', label: 'Replay', summary: 'Replay result and event chain.' },
  { key: 'validation', label: 'Validation', summary: 'Structured finding list.' },
  {
    key: 'metrics',
    label: 'Metrics',
    summary: 'Global aggregate metrics preview; replay-local metrics remain in artifact JSON.',
  },
  { key: 'gate', label: 'Gate', summary: 'Blocking gate evidence.' },
]

const METRIC_SERIES_KEYS = [
  'post_state_mismatch_rate',
  'visibility_leak_rate',
  'belief_conflict_rate',
  'capability_violation_rate',
  'plot_obligation_miss_rate',
]

function clone<T>(value: T): T {
  return structuredClone(value)
}

function notFound(entity: string, ref: string): never {
  throw new Error(`${entity} not found: ${ref}`)
}

function toListResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  capabilities: ListCapabilities,
): ListResponse<T> {
  const total = items.length
  const start = (page - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    capabilities,
  }
}

function normalizePagination(query: { page?: number; pageSize?: number }) {
  return {
    page: Math.max(query.page ?? 1, 1),
    pageSize: Math.max(query.pageSize ?? 20, 1),
  }
}

function includesSearch(search: string | undefined, fields: Array<string | undefined>) {
  const needle = search?.trim().toLowerCase()
  if (!needle) {
    return true
  }

  return fields.some((field) => field?.toLowerCase().includes(needle))
}

function compareValues(
  left: string | number | undefined,
  right: string | number | undefined,
) {
  if (left === right) {
    return 0
  }

  if (left === undefined) {
    return 1
  }

  if (right === undefined) {
    return -1
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  return String(left).localeCompare(String(right))
}

function sortByKey<T>(
  items: T[],
  sortBy: string | undefined,
  direction: 'asc' | 'desc' | undefined,
) {
  const key = (sortBy ?? 'updatedAt') as keyof T
  const multiplier = direction === 'asc' ? 1 : -1

  return [...items].sort((left, right) => {
    const result = compareValues(
      left[key] as string | number | undefined,
      right[key] as string | number | undefined,
    )

    return result * multiplier
  })
}

function sliceMetricSeries(points: number[], timeRange?: MetricQuery['timeRange']) {
  switch (timeRange) {
    case '24h':
      return points.slice(-1)
    case '7d':
      return points.slice(-2)
    default:
      return points
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
    : []
}

function mergeRelatedRefs(...values: Array<ArtifactSummary['links'] | undefined>) {
  const merged: ArtifactSummary['links'] = {}

  for (const value of values) {
    if (!value) {
      continue
    }

    for (const [key, ref] of Object.entries(value)) {
      if (typeof ref === 'string' && ref.trim()) {
        ;(merged as Record<string, string>)[key] = ref
      }
    }
  }

  return merged
}

function snapshotRefFromId(snapshotId: string | undefined) {
  return snapshotId ? `snapshot:${snapshotId}` : ''
}

function validationRefFromReplayRef(replayRef: string) {
  return `validation:${replayRef}`
}

function gateRefFromReplayRef(replayRef: string) {
  return `gate:${replayRef}`
}

function failureClassLabel(value: string | undefined) {
  return value?.replaceAll('_', ' ') ?? 'artifact'
}

function titleFromKind(
  kind: ArtifactKind,
  ref: string,
  nativePrimaryId: string | undefined,
  raw: Record<string, unknown> | null,
) {
  if (kind === 'replay_bundle') {
    const replay = asRecord(raw?.replay)
    return (
      asString((raw as Record<string, unknown> | null)?.title) ??
      `Replay bundle: ${failureClassLabel(asString(replay?.failure_classification))}`
    )
  }

  if (kind === 'incident_report') {
    return asString(raw?.title) ?? nativePrimaryId ?? ref
  }

  if (kind === 'release_attempt_record') {
    return nativePrimaryId ? `Release attempt ${nativePrimaryId}` : ref
  }

  if (kind === 'quality_review_record') {
    return nativePrimaryId ? `Review ${nativePrimaryId}` : ref
  }

  return nativePrimaryId ?? ref
}

function descriptionFromKind(
  kind: ArtifactKind,
  raw: Record<string, unknown> | null,
  replay: Record<string, unknown> | null,
) {
  if (kind === 'replay_bundle') {
    return (
      asString(replay?.summary) ??
      asString(replay?.failure_classification)?.replaceAll('_', ' ') ??
      'Replay bundle artifact.'
    )
  }

  if (kind === 'incident_report') {
    return asString(raw?.primary_cause) ?? 'Incident artifact.'
  }

  if (kind === 'release_attempt_record') {
    return asString(raw?.rollback_reason) ?? 'Release attempt artifact.'
  }

  if (kind === 'quality_review_record') {
    return 'Narrative quality review artifact.'
  }

  return 'Artifact record.'
}

function defaultSections(kind: ArtifactKind) {
  return kind === 'replay_bundle' ? REPLAY_SECTIONS : []
}

function defaultLinks(entry: NormalizedArtifactEntry, raw: Record<string, unknown> | null) {
  if (entry.kind !== 'replay_bundle') {
    return entry.links
  }

  const snapshot = asRecord(raw?.snapshot)
  const snapshotId = asString(snapshot?.snapshot_id)
  const replayRef = entry.ref

  return {
    ...entry.links,
    artifactRef: entry.ref,
    snapshotRef: entry.links.snapshotRef ?? snapshotRefFromId(snapshotId),
    replayRef: entry.links.replayRef ?? replayRef,
    validationRef: entry.links.validationRef ?? validationRefFromReplayRef(replayRef),
    gateRef: entry.links.gateRef ?? gateRefFromReplayRef(replayRef),
  }
}

function normalizeArtifactEntry(value: unknown): NormalizedArtifactEntry | null {
  const entry = asRecord(value)
  if (!entry) {
    return null
  }

  const ref = asString(entry.ref) ?? asString(entry.artifact_ref)
  const kind = (asString(entry.kind) ?? asString(entry.artifact_kind)) as ArtifactKind | undefined
  const path = asString(entry.path) ?? asString(entry.relative_path)
  if (!ref || !kind || !path) {
    return null
  }

  const links = asRecord(entry.links) ?? {}
  const sections = asRecordArray(entry.sections)
    .map((section) => {
      const key = asString(section.key)
      const label = asString(section.label)
      const summary = asString(section.summary)
      if (!key || !label || !summary) {
        return null
      }

      return {
        key: key as SectionInfo['key'],
        label,
        summary,
      }
    })
    .filter((section): section is SectionInfo => Boolean(section))

  return {
    ref,
    kind,
    path,
    title: asString(entry.title) ?? asString(entry.display_title),
    description: asString(entry.description),
    updatedAt: asString(entry.updatedAt) ?? asString(entry.catalog_time),
    tags: asStringArray(entry.tags),
    sections,
    links: {
      artifactRef: asString(links.artifactRef),
      snapshotRef: asString(links.snapshotRef),
      replayRef: asString(links.replayRef),
      validationRef: asString(links.validationRef),
      gateRef: asString(links.gateRef),
      incidentRef: asString(links.incidentRef),
      reviewRef: asString(links.reviewRef),
      releaseRef: asString(links.releaseRef),
    },
    nativePrimaryId: asString(entry.nativePrimaryId) ?? asString(entry.native_primary_id),
  }
}

function aggregateReplayMetrics(replays: ReplayBundleDetail[], rawMetrics: Record<string, number>[]) {
  const summary: Record<string, number> = {}
  const rateKeys = new Set<string>()

  for (const metrics of rawMetrics) {
    for (const [key, value] of Object.entries(metrics)) {
      if (!Number.isFinite(value)) {
        continue
      }

      if (key.endsWith('_rate')) {
        rateKeys.add(key)
      }

      summary[key] = (summary[key] ?? 0) + value
    }
  }

  for (const key of rateKeys) {
    summary[key] = replays.length > 0 ? summary[key] / replays.length : 0
  }

  return summary
}

async function materializeIndex(
  index: FrontendArtifactIndex,
  loadRawArtifact: (path: string) => Promise<unknown>,
): Promise<MaterializedIndex> {
  const normalizedArtifacts = (Array.isArray(index.artifacts) ? index.artifacts : [])
    .map((entry) => normalizeArtifactEntry(entry))
    .filter((entry): entry is NormalizedArtifactEntry => Boolean(entry))

  const rawByRef = new Map<string, JsonValue | null>()
  await Promise.all(
    normalizedArtifacts.map(async (entry) => {
      const raw = (await loadRawArtifact(entry.path)) as JsonValue | null
      rawByRef.set(entry.ref, raw ?? null)
    }),
  )

  const artifacts: ArtifactSummary[] = []
  const snapshots: SnapshotDetail[] = []
  const replays: ReplayBundleDetail[] = []
  const validations: ValidationDetail[] = []
  const gates: GateDetail[] = []
  const reviews: ReviewDetail[] = []
  const incidents: IncidentDetail[] = []
  const releases: ReleaseAttemptDetail[] = []
  const rawMetricSummaries: Record<string, number>[] = []

  for (const entry of normalizedArtifacts) {
    const raw = asRecord(rawByRef.get(entry.ref))
    const replay = asRecord(raw?.replay)
    const snapshot = asRecord(raw?.snapshot)
    const session = asRecord(raw?.session)
    const gate = asRecord(raw?.gate)
    const metrics = asRecord(raw?.metrics)
    const links = defaultLinks(entry, raw)
    const title = entry.title ?? titleFromKind(entry.kind, entry.ref, entry.nativePrimaryId, raw)
    const description =
      entry.description ?? descriptionFromKind(entry.kind, raw, replay)
    const updatedAt =
      entry.updatedAt ??
      asString(asRecord(raw?.command)?.created_at) ??
      asString(raw?.date_opened) ??
      asString(raw?.started_at)

    artifacts.push({
      ref: entry.ref,
      kind: entry.kind,
      title,
      description,
      updatedAt,
      path: entry.path,
      tags: entry.tags.length > 0 ? entry.tags : asStringArray(replay?.issues).slice(0, 3),
      sections: entry.sections.length > 0 ? entry.sections : defaultSections(entry.kind),
      links,
    })

    if (entry.kind === 'replay_bundle' && replay && snapshot) {
      const snapshotId = asString(snapshot.snapshot_id) ?? ''
      const snapshotRef = links.snapshotRef ?? snapshotRefFromId(snapshotId)
      const command = asRecord(raw?.command)
      const replayUpdatedAt = asString(command?.created_at) ?? updatedAt ?? ''
      const replayOperatorId =
        asString(session?.replay_operator_id) ?? asString(command?.operator_id)
      const issueRecords = asRecordArray(replay.issues)
      const issueCodes = issueRecords
        .map((issue) => asString(issue.code))
        .filter((value): value is string => Boolean(value))
      const evidenceReferences = asStringArray(replay.evidence_references)
      const postStatePaths = asStringArray(replay.post_state_diff)
      const failureClassification = asString(replay.failure_classification)
      const replayRef = entry.ref

      snapshots.push({
        ref: snapshotRef,
        snapshotId,
        artifactRef: entry.ref,
        title: `Snapshot ${snapshotId}`,
        createdAt: asString(snapshot.created_at) ?? replayUpdatedAt,
        stateIdentity: asString(snapshot.state_identity) ?? 'unknown',
        schemaVersion: asString(snapshot.schema_version) ?? 'unknown',
        policyVersion: asString(snapshot.policy_version) ?? 'unknown',
        visibilityVersion: asString(snapshot.visibility_version) ?? 'unknown',
        summary: `${title} locked pre-state.`,
        links: {
          artifactRef: entry.ref,
          replayRef,
          incidentRef: links.incidentRef,
        },
        raw: rawByRef.get(entry.ref) ? clone(snapshot as JsonValue) : ({} as JsonValue),
      })

      replays.push({
        ref: replayRef,
        artifactRef: entry.ref,
        artifactPath: entry.path,
        title,
        updatedAt: replayUpdatedAt,
        commandId: asString(command?.command_id) ?? entry.nativePrimaryId ?? replayRef,
        commandType: asString(command?.command_type) ?? 'unknown',
        snapshotRef,
        status: asBoolean(replay.ok) ? 'ok' : 'failed',
        failureClassification,
        eventCount: asRecordArray(raw?.events).length,
        policyVersion:
          asString(session?.policy_version) ??
          asString(snapshot.policy_version) ??
          asString(command?.policy_version) ??
          'unknown',
        promptVersion: asString(session?.prompt_version) ?? 'unknown',
        visibilityVersion:
          asString(session?.visibility_snapshot_version) ??
          asString(snapshot.visibility_version) ??
          'unknown',
        schemaVersion:
          asString(session?.narrative_state_schema_version) ??
          asString(snapshot.schema_version) ??
          'unknown',
        replayOperatorId,
        issueCodes,
        evidenceReferences,
        postStatePaths,
        observationFrame: asRecord(session?.observation_frame)
          ? clone(session?.observation_frame as JsonValue)
          : undefined,
        summary: description,
        links,
        raw: rawByRef.get(entry.ref) ? clone(rawByRef.get(entry.ref) as JsonValue) : null,
      })

      const findings: ValidationFinding[] = issueRecords.map((issue, index) => ({
        id:
          asString(issue.id) ??
          `finding:${replayRef}:${asString(issue.code) ?? 'issue'}:${index + 1}`,
        replayRef,
        failureClass: asString(issue.code) ?? 'unknown_issue',
        subjectId: asString(issue.subject_id) ?? replayRef,
        affectedField: asString(issue.field) ?? 'unknown_field',
        source: 'replay_issue',
        evidenceReference: evidenceReferences[index] ?? evidenceReferences[0],
        recommendedRegressionTest: asString(issue.recommended_regression_test),
        replayOperatorId,
        timestamp: replayUpdatedAt || undefined,
        links: {
          replayRef,
          snapshotRef,
          incidentRef: links.incidentRef,
          releaseRef: links.releaseRef,
        },
      }))

      const causalValidation = asRecord(replay.causal_validation)
      for (const finding of asRecordArray(causalValidation?.findings)) {
        findings.push({
          id:
            asString(finding.id) ??
            `finding:${replayRef}:${asString(finding.failure_class) ?? 'causal'}:${findings.length + 1}`,
          replayRef,
          failureClass: asString(finding.failure_class) ?? 'unknown_causal_failure',
          subjectId: asString(finding.affected_subject) ?? replayRef,
          affectedField:
            asString(finding.affected_state_field) ??
            asString(finding.missing_prerequisite_or_overwrite_point) ??
            'unknown_field',
          source: 'causal_finding',
          evidenceReference: asString(finding.replay_evidence_reference),
          recommendedRegressionTest: asString(finding.recommended_regression_test),
          replayOperatorId,
          timestamp: replayUpdatedAt || undefined,
          links: {
            replayRef,
            snapshotRef,
            incidentRef: links.incidentRef,
            releaseRef: links.releaseRef,
          },
        })
      }

      const driftReport = asRecord(raw?.drift_report)
      for (const reason of asStringArray(driftReport?.reasons)) {
        findings.push({
          id: `finding:${replayRef}:drift:${reason}:${findings.length + 1}`,
          replayRef,
          failureClass: reason,
          subjectId: replayRef,
          affectedField: reason,
          source: 'drift_reason',
          replayOperatorId,
          timestamp: replayUpdatedAt || undefined,
          links: {
            replayRef,
            snapshotRef,
            incidentRef: links.incidentRef,
            releaseRef: links.releaseRef,
          },
        })
      }

      const regressionTests = Array.from(
        new Set(
          findings
            .map((finding) => finding.recommendedRegressionTest)
            .filter((value): value is string => Boolean(value)),
        ),
      )

      validations.push({
        replayRef,
        title: `Validation for ${failureClassification ?? replayRef} replay`,
        findings,
        regressionTests,
        supportsTimeRange: Boolean(replayUpdatedAt),
        supportsReplayOperatorFilter: Boolean(replayOperatorId),
        links: {
          replayRef,
          snapshotRef,
          incidentRef: links.incidentRef,
        },
      })

      gates.push({
        ref: links.gateRef ?? gateRefFromReplayRef(replayRef),
        sourceArtifactRef: entry.ref,
        linkedReplayRef: replayRef,
        allowed: Boolean(asBoolean(gate?.allowed)),
        blockingIssues: asStringArray(gate?.blocking_issues),
        warnings: asStringArray(gate?.warnings),
        explanation: `${title} requires investigation before publication.`,
        thresholds: metrics
          ? Object.fromEntries(
              Object.entries(metrics)
                .filter(([key]) => key.endsWith('_rate'))
                .map(([key, value]) => [key, value as number]),
            )
          : undefined,
      })

      const numericMetrics = Object.fromEntries(
        Object.entries(metrics ?? {}).flatMap(([key, value]) => {
          const numericValue = asNumber(value)
          return numericValue === undefined ? [] : [[key, numericValue]]
        }),
      )
      rawMetricSummaries.push(numericMetrics)
    }

    if (entry.kind === 'quality_review_record' && raw) {
      reviews.push({
        ref: entry.ref,
        title,
        updatedAt,
        reviewId: asString(raw.review_id) ?? entry.nativePrimaryId ?? entry.ref,
        sourceArtifactReference:
          asString(raw.source_artifact_reference) ?? entry.links.artifactRef ?? '',
        evidenceReferences: asStringArray(raw.evidence_references),
        checkedSegmentCount: asNumber(raw.checked_segment_count) ?? 0,
        oocIncidentCount: asNumber(raw.ooc_incident_count) ?? 0,
        checkedSceneCount: asNumber(raw.checked_scene_count) ?? 0,
        worldRuleViolationCount: asNumber(raw.world_rule_violation_count) ?? 0,
        introducedSetupItemCount: asNumber(raw.introduced_setup_item_count) ?? 0,
        resolvedSetupItemCount: asNumber(raw.resolved_setup_item_count) ?? 0,
        summary: description,
        links: entry.links,
        raw: rawByRef.get(entry.ref) ? clone(rawByRef.get(entry.ref) as JsonValue) : null,
      })
    }

    if (entry.kind === 'incident_report' && raw) {
      incidents.push({
        ref: entry.ref,
        title,
        updatedAt,
        incidentId: asString(raw.incident_id) ?? entry.nativePrimaryId ?? entry.ref,
        severity: asString(raw.severity) ?? 'unknown',
        status: asString(raw.status) ?? 'unknown',
        dateOpened: asString(raw.date_opened) ?? '',
        incidentOwner: asString(raw.incident_owner) ?? 'unknown',
        primaryCause: asString(raw.primary_cause) ?? description,
        rollbackTriggered: asBoolean(raw.rollback_triggered),
        rollbackActionTaken: asString(raw.rollback_action_taken),
        requiredRegressionTest: asString(raw.required_regression_test),
        evidenceReferences: asStringArray(raw.evidence_references),
        actionItems: asRecordArray(raw.action_items).map((item) => ({
          action: asString(item.action) ?? 'unknown_action',
          owner: asString(item.owner) ?? 'unknown_owner',
          layer: asString(item.layer) ?? 'unknown_layer',
          dueDate: asString(item.due_date) ?? null,
          status: asString(item.status) ?? 'open',
        })),
        summary: description,
        links: entry.links,
        raw: rawByRef.get(entry.ref) ? clone(rawByRef.get(entry.ref) as JsonValue) : null,
      })
    }

    if (entry.kind === 'release_attempt_record' && raw) {
      releases.push({
        ref: entry.ref,
        title,
        updatedAt,
        attemptId: asString(raw.attempt_id) ?? entry.nativePrimaryId ?? entry.ref,
        triggeringCommandId: asString(raw.triggering_command_id) ?? '',
        startedAt: asString(raw.started_at) ?? '',
        sourceSnapshotId: asString(raw.source_snapshot_id) ?? '',
        sourceSystem: asString(raw.source_system) ?? '',
        actor: asString(raw.actor) ?? '',
        writeBackOk: Boolean(asBoolean(raw.write_back_ok)),
        gateAllowed: Boolean(asBoolean(raw.gate_allowed)),
        driftDetected: Boolean(asBoolean(raw.drift_detected)),
        manualRollbackPerformed: Boolean(asBoolean(raw.manual_rollback_performed)),
        rollbackReason: asString(raw.rollback_reason),
        incidentId: asString(raw.incident_id) ?? null,
        derivedFromAttemptId: asString(raw.derived_from_attempt_id) ?? null,
        summary: description,
        links: entry.links,
        raw: rawByRef.get(entry.ref) ? clone(rawByRef.get(entry.ref) as JsonValue) : null,
      })
    }
  }

  const sortedReplays = sortByKey(replays, 'updatedAt', 'desc')
  const replayRefByCommandId = new Map(replays.map((replay) => [replay.commandId, replay.ref]))
  const replayRefByArtifactRef = new Map(replays.map((replay) => [replay.artifactRef, replay.ref]))
  const snapshotRefById = new Map(snapshots.map((snapshot) => [snapshot.snapshotId, snapshot.ref]))
  const gateRefByReplayRef = new Map(gates.map((gate) => [gate.linkedReplayRef, gate.ref]))
  const incidentRefById = new Map(incidents.map((incident) => [incident.incidentId, incident.ref]))

  const enrichedReleases = releases.map((release) => {
    const raw = asRecord(rawByRef.get(release.ref))
    const snapshotId = asString(raw?.source_snapshot_id) ?? release.sourceSnapshotId
    const snapshotRef = release.links.snapshotRef ?? snapshotRefById.get(snapshotId)
    const replayRef =
      release.links.replayRef ??
      replayRefByCommandId.get(asString(raw?.triggering_command_id) ?? release.triggeringCommandId) ??
      replays.find((replay) => replay.snapshotRef === snapshotRef)?.ref
    const gateRef =
      release.links.gateRef ??
      (replayRef ? gateRefByReplayRef.get(replayRef) ?? gateRefFromReplayRef(replayRef) : undefined)
    const incidentRef =
      release.links.incidentRef ??
      (release.incidentId ? incidentRefById.get(release.incidentId) : undefined)

    return {
      ...release,
      links: mergeRelatedRefs(release.links, {
        snapshotRef,
        replayRef,
        gateRef,
        incidentRef,
      }),
    }
  })

  const releaseRefByIncidentId = new Map(
    enrichedReleases
      .filter((release) => Boolean(release.incidentId))
      .map((release) => [release.incidentId as string, release.ref]),
  )

  const enrichedIncidents = incidents.map((incident) => {
    const raw = asRecord(rawByRef.get(incident.ref))
    const replayRef =
      incident.links.replayRef ??
      asString(raw?.locked_event_chain_reference) ??
      replayRefByCommandId.get(asString(raw?.locked_command_id) ?? '')
    const snapshotRef =
      incident.links.snapshotRef ??
      snapshotRefById.get(asString(raw?.pre_state_snapshot_id) ?? '')
    const releaseRef =
      incident.links.releaseRef ?? releaseRefByIncidentId.get(incident.incidentId)

    return {
      ...incident,
      links: mergeRelatedRefs(incident.links, {
        replayRef,
        snapshotRef,
        validationRef:
          incident.links.validationRef ??
          (replayRef ? validationRefFromReplayRef(replayRef) : undefined),
        releaseRef,
      }),
    }
  })

  const enrichedReviews = reviews.map((review) => {
    const raw = asRecord(rawByRef.get(review.ref))
    const sourceArtifactReference =
      asString(raw?.source_artifact_reference) ?? review.sourceArtifactReference
    const replayRef =
      review.links.replayRef ??
      (sourceArtifactReference
        ? replayRefByArtifactRef.get(sourceArtifactReference) ??
          (sourceArtifactReference.startsWith('bundle:') ? sourceArtifactReference : undefined)
        : undefined)

    return {
      ...review,
      sourceArtifactReference,
      links: mergeRelatedRefs(review.links, {
        artifactRef: review.links.artifactRef ?? sourceArtifactReference,
        replayRef,
      }),
    }
  })

  const linksByArtifactRef = new Map<string, ArtifactSummary['links']>()
  for (const replay of replays) {
    linksByArtifactRef.set(replay.ref, replay.links)
  }
  for (const incident of enrichedIncidents) {
    linksByArtifactRef.set(incident.ref, incident.links)
  }
  for (const release of enrichedReleases) {
    linksByArtifactRef.set(release.ref, release.links)
  }
  for (const review of enrichedReviews) {
    linksByArtifactRef.set(review.ref, review.links)
  }

  const enrichedArtifacts = artifacts.map((artifact) => ({
    ...artifact,
    links: mergeRelatedRefs(artifact.links, linksByArtifactRef.get(artifact.ref)),
  }))

  const summary = aggregateReplayMetrics(sortedReplays, rawMetricSummaries)
  const timeSeries = METRIC_SERIES_KEYS.map((key) => {
    let runningTotal = 0
    const points = sortedReplays
      .slice()
      .reverse()
      .map((replay, index) => {
        const artifactRaw = asRecord(rawByRef.get(replay.ref))
        const metrics = asRecord(artifactRaw?.metrics)
        runningTotal += asNumber(metrics?.[key]) ?? 0
        return Number((runningTotal / (index + 1)).toFixed(4))
      })

    return {
      key,
      label: key.replaceAll('_', ' '),
      points,
    }
  }).filter((series) => series.points.length > 0)

  const activity = [
    ...sortedReplays.map((replay) => ({
      id: `activity:${replay.ref}`,
      kind: 'replay_bundle' as const,
      title: replay.title,
      timestamp: replay.updatedAt,
      description: replay.summary,
      href: `/replay/${replay.ref}`,
    })),
    ...sortByKey(enrichedIncidents, 'dateOpened', 'desc').map((incident) => ({
      id: `activity:${incident.ref}`,
      kind: 'incident_report' as const,
      title: incident.title,
      timestamp: incident.dateOpened,
      description: incident.primaryCause,
      href: `/incidents/${incident.ref}`,
    })),
  ].slice(0, 10)

  return {
    overview: {
      recentReplaySucceeded:
        sortedReplays.length > 0 ? sortedReplays[0].status === 'ok' : null,
      recentGateAllowed: gates.length > 0 ? gates[0].allowed : null,
      recentIncidentCount: enrichedIncidents.length,
      reviewSampleCount: enrichedReviews.length,
      recentPostStateMismatchCount: sortedReplays.filter(
        (replay) => replay.failureClassification === 'post_state_mismatch',
      ).length,
      supportsReviewTimeline: enrichedReviews.some((review) => Boolean(review.updatedAt)),
      activity,
    },
    metrics: {
      summary,
      timeSeries,
      gateRefs: gates.map((gate) => gate.ref),
      supportsTimeRange: timeSeries.length > 0,
    },
    artifacts: enrichedArtifacts,
    snapshots,
    replays,
    validations,
    gates,
    reviews: enrichedReviews,
    incidents: enrichedIncidents,
    releases: enrichedReleases,
  }
}

async function loadArtifactDetail(
  index: MaterializedIndex,
  ref: string,
  loadRawArtifact: (path: string) => Promise<unknown>,
): Promise<ArtifactDetail> {
  const artifact = index.artifacts.find((item) => item.ref === ref)
  if (!artifact) {
    return notFound('artifact', ref)
  }

  const raw = (await loadRawArtifact(artifact.path)) as JsonValue | null

  return {
    ...clone(artifact),
    raw: raw ?? null,
  }
}

async function attachRawByRef<T extends { ref: string; raw?: JsonValue | null }>(
  index: MaterializedIndex,
  item: T,
  loadRawArtifact: (path: string) => Promise<unknown>,
): Promise<T> {
  const artifact = index.artifacts.find((candidate) => candidate.ref === item.ref)
  if (!artifact) {
    return clone(item)
  }

  const raw = (await loadRawArtifact(artifact.path)) as JsonValue | null

  return {
    ...clone(item),
    raw: raw ?? null,
  }
}

function artifactListItem(artifact: ArtifactSummary): ArtifactDetail {
  return {
    ...clone(artifact),
    raw: null,
  }
}

export function createIndexBackedProvider({
  getIndex,
  loadRawArtifact,
}: IndexBackedProviderOptions): SreDataProvider {
  let cachedMaterializedIndex: Promise<MaterializedIndex> | null = null

  const getMaterializedIndex = async () => {
    if (!cachedMaterializedIndex) {
      cachedMaterializedIndex = getIndex().then((index) =>
        materializeIndex(index, loadRawArtifact),
      )
    }

    return cachedMaterializedIndex
  }

  return {
    async getOverview() {
      const index = await getMaterializedIndex()
      return clone(index.overview)
    },

    async listSnapshots(query: SnapshotQuery) {
      const index = await getMaterializedIndex()
      const filtered = index.snapshots.filter((snapshot) =>
        includesSearch(query.search, [
          snapshot.ref,
          snapshot.title,
          snapshot.snapshotId,
          snapshot.stateIdentity,
        ]),
      )
      const sorted = sortByKey(
        filtered,
        query.sortBy ?? 'createdAt',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(sorted.map(clone), page, pageSize, {
        timeRange: false,
        status: false,
        replayOperatorId: false,
      })
    },

    async getSnapshot(ref: string) {
      const index = await getMaterializedIndex()
      const snapshot = index.snapshots.find((item) => item.ref === ref)
      if (!snapshot) {
        return notFound('snapshot', ref)
      }

      return clone(snapshot)
    },

    async listArtifacts(query: ArtifactQuery) {
      const index = await getMaterializedIndex()
      const filtered = index.artifacts.filter((artifact) => {
        if (query.kind && artifact.kind !== query.kind) {
          return false
        }

        return includesSearch(query.search, [
          artifact.ref,
          artifact.title,
          artifact.description,
          artifact.tags.join(' '),
          artifact.path,
        ])
      })
      const sorted = sortByKey(
        filtered,
        query.sortBy ?? 'path',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(sorted.map(artifactListItem), page, pageSize, {
        timeRange: false,
        status: false,
        replayOperatorId: false,
      })
    },

    async getArtifact(ref: string) {
      const index = await getMaterializedIndex()
      return loadArtifactDetail(index, ref, loadRawArtifact)
    },

    async listReplayBundles(query: ReplayQuery) {
      const index = await getMaterializedIndex()
      const filtered = index.replays.filter((replay) => {
        if (query.failureClass && replay.failureClassification !== query.failureClass) {
          return false
        }

        return includesSearch(query.search, [
          replay.ref,
          replay.title,
          replay.commandId,
          replay.failureClassification,
        ])
      })
      const sorted = sortByKey(
        filtered,
        query.sortBy ?? 'updatedAt',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(sorted.map(clone), page, pageSize, {
        timeRange: true,
        status: true,
        replayOperatorId: true,
      })
    },

    async getReplayBundle(ref: string) {
      const index = await getMaterializedIndex()
      const replay = index.replays.find((item) => item.ref === ref)
      if (!replay) {
        return notFound('replay bundle', ref)
      }

      return attachRawByRef(index, replay, loadRawArtifact)
    },

    async getValidationForReplay(ref: string) {
      const index = await getMaterializedIndex()
      const validation = index.validations.find((item) => item.replayRef === ref)
      if (!validation) {
        return notFound('validation', ref)
      }

      return clone(validation)
    },

    async getMetrics(query: MetricQuery): Promise<MetricDetail> {
      const index = await getMaterializedIndex()
      const metrics = clone(index.metrics)

      return {
        ...metrics,
        timeSeries: metrics.timeSeries.map((series) => ({
          ...series,
          points: sliceMetricSeries(series.points, query.timeRange),
        })),
      }
    },

    async getGateResult(ref: string): Promise<GateDetail> {
      const index = await getMaterializedIndex()
      const gate = index.gates.find((item) => item.ref === ref)
      if (!gate) {
        return notFound('gate', ref)
      }

      return clone(gate)
    },

    async listReviews(query: ReviewQuery) {
      const index = await getMaterializedIndex()
      const filtered = index.reviews.filter((review) =>
        includesSearch(query.search, [
          review.ref,
          review.title,
          review.reviewId,
          review.sourceArtifactReference,
        ]),
      )
      const sorted = sortByKey(
        filtered,
        query.sortBy ?? 'reviewId',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(sorted.map(clone), page, pageSize, {
        timeRange: false,
        status: false,
        replayOperatorId: false,
      })
    },

    async getReview(ref: string): Promise<ReviewDetail> {
      const index = await getMaterializedIndex()
      const review = index.reviews.find((item) => item.ref === ref)
      if (!review) {
        return notFound('review', ref)
      }

      return attachRawByRef(index, review, loadRawArtifact)
    },

    async listIncidents(query: IncidentQuery) {
      const index = await getMaterializedIndex()
      const filtered = index.incidents.filter((incident) => {
        if (query.severity && incident.severity !== query.severity) {
          return false
        }

        if (query.status && incident.status !== query.status) {
          return false
        }

        return includesSearch(query.search, [
          incident.ref,
          incident.title,
          incident.incidentId,
          incident.primaryCause,
        ])
      })
      const sorted = sortByKey(
        filtered,
        query.sortBy ?? 'dateOpened',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(sorted.map(clone), page, pageSize, {
        timeRange: false,
        status: true,
        replayOperatorId: false,
      })
    },

    async getIncident(ref: string): Promise<IncidentDetail> {
      const index = await getMaterializedIndex()
      const incident = index.incidents.find((item) => item.ref === ref)
      if (!incident) {
        return notFound('incident', ref)
      }

      return attachRawByRef(index, incident, loadRawArtifact)
    },

    async listReleaseAttempts(query: ReleaseAttemptQuery) {
      const index = await getMaterializedIndex()
      const filtered = index.releases.filter((release) => {
        if (query.status) {
          const normalizedStatus = release.gateAllowed ? 'allowed' : 'blocked'
          if (query.status !== normalizedStatus) {
            return false
          }
        }

        return includesSearch(query.search, [
          release.ref,
          release.title,
          release.attemptId,
          release.triggeringCommandId,
        ])
      })
      const sorted = sortByKey(
        filtered,
        query.sortBy ?? 'startedAt',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(sorted.map(clone), page, pageSize, {
        timeRange: false,
        status: true,
        replayOperatorId: false,
      })
    },

    async getReleaseAttempt(ref: string): Promise<ReleaseAttemptDetail> {
      const index = await getMaterializedIndex()
      const release = index.releases.find((item) => item.ref === ref)
      if (!release) {
        return notFound('release attempt', ref)
      }

      return attachRawByRef(index, release, loadRawArtifact)
    },
  }
}
