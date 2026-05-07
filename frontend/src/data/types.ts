export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type DataMode = 'mock' | 'artifact'

export type ArtifactKind =
  | 'replay_bundle'
  | 'incident_report'
  | 'release_attempt_record'
  | 'quality_review_record'
  | 'snapshot_bundle'

export type ArtifactSectionKey =
  | 'snapshot'
  | 'replay'
  | 'validation'
  | 'metrics'
  | 'gate'

export type TimeRange = '24h' | '7d' | '30d' | 'all'

export type SortDirection = 'asc' | 'desc'

export interface RelatedRefs {
  artifactRef?: string
  snapshotRef?: string
  replayRef?: string
  validationRef?: string
  gateRef?: string
  incidentRef?: string
  reviewRef?: string
  releaseRef?: string
}

export interface ListCapabilities {
  timeRange: boolean
  status: boolean
  replayOperatorId: boolean
}

export interface BaseQuery {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDirection?: SortDirection
  timeRange?: TimeRange
  status?: string
}

export interface ArtifactQuery extends BaseQuery {
  kind?: ArtifactKind
}

export interface SnapshotQuery extends BaseQuery {}

export interface ReplayQuery extends BaseQuery {
  failureClass?: string
}

export interface ReviewQuery extends BaseQuery {}

export interface IncidentQuery extends BaseQuery {
  severity?: string
}

export interface ReleaseAttemptQuery extends BaseQuery {}

export interface MetricQuery {
  timeRange?: TimeRange
}

export interface ValidationQuery extends BaseQuery {
  failureClass?: string
  subjectId?: string
  affectedField?: string
  replayOperatorId?: string
}

export interface ListResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  capabilities: ListCapabilities
}

export interface SectionInfo {
  key: ArtifactSectionKey
  label: string
  summary: string
}

export interface ArtifactSummary {
  ref: string
  kind: ArtifactKind
  title: string
  description: string
  updatedAt?: string
  path: string
  tags: string[]
  sections: SectionInfo[]
  links: RelatedRefs
}

export interface ArtifactDetail extends ArtifactSummary {
  raw: JsonValue | null
}

export interface ArtifactCatalogEntry {
  ref?: string
  artifact_ref?: string
  kind?: ArtifactKind
  artifact_kind?: ArtifactKind
  title?: string
  display_title?: string
  description?: string
  updatedAt?: string
  catalog_time?: string
  path?: string
  relative_path?: string
  tags?: string[]
  sections?: SectionInfo[]
  links?: RelatedRefs
  nativePrimaryId?: string
  native_primary_id?: string
}

export interface SnapshotDetail {
  ref: string
  snapshotId: string
  artifactRef: string
  title: string
  createdAt: string
  stateIdentity: string
  schemaVersion: string
  policyVersion: string
  visibilityVersion: string
  summary: string
  links: RelatedRefs
  raw: JsonValue
}

export interface ReplayBundleDetail {
  ref: string
  artifactRef: string
  artifactPath: string
  title: string
  updatedAt: string
  commandId: string
  commandType: string
  snapshotRef: string
  status: 'ok' | 'failed'
  failureClassification?: string
  eventCount: number
  policyVersion: string
  promptVersion: string
  visibilityVersion: string
  schemaVersion: string
  replayOperatorId?: string
  issueCodes: string[]
  evidenceReferences: string[]
  postStatePaths: string[]
  observationFrame?: JsonValue
  summary: string
  links: RelatedRefs
  raw?: JsonValue | null
}

export interface ValidationFinding {
  id: string
  replayRef: string
  failureClass: string
  subjectId: string
  affectedField: string
  source: 'causal_finding' | 'replay_issue' | 'drift_reason'
  evidenceReference?: string
  recommendedRegressionTest?: string
  replayOperatorId?: string
  timestamp?: string
  links: RelatedRefs
}

export interface ValidationDetail {
  replayRef: string
  title: string
  findings: ValidationFinding[]
  regressionTests: string[]
  supportsTimeRange: boolean
  supportsReplayOperatorFilter: boolean
  links: RelatedRefs
}

export interface MetricSeries {
  key: string
  label: string
  points: number[]
}

export interface MetricDetail {
  summary: Record<string, number>
  timeSeries: MetricSeries[]
  gateRefs: string[]
  supportsTimeRange: boolean
}

export interface GateDetail {
  ref: string
  sourceArtifactRef: string
  linkedReplayRef: string
  allowed: boolean
  blockingIssues: string[]
  warnings: string[]
  explanation: string
  thresholds?: Record<string, number | boolean | null>
}

export interface ReviewDetail {
  ref: string
  title: string
  updatedAt?: string
  reviewId: string
  sourceArtifactReference: string
  evidenceReferences: string[]
  checkedSegmentCount: number
  oocIncidentCount: number
  checkedSceneCount: number
  worldRuleViolationCount: number
  introducedSetupItemCount: number
  resolvedSetupItemCount: number
  summary: string
  links: RelatedRefs
  raw?: JsonValue | null
}

export interface IncidentActionItem {
  action: string
  owner: string
  layer: string
  dueDate?: string | null
  status: string
}

export interface IncidentDetail {
  ref: string
  title: string
  updatedAt?: string
  incidentId: string
  severity: string
  status: string
  dateOpened: string
  incidentOwner: string
  primaryCause: string
  rollbackTriggered?: boolean | null
  rollbackActionTaken?: string
  requiredRegressionTest?: string
  evidenceReferences: string[]
  actionItems: IncidentActionItem[]
  summary: string
  links: RelatedRefs
  raw?: JsonValue | null
}

export interface ReleaseAttemptDetail {
  ref: string
  title: string
  updatedAt?: string
  attemptId: string
  triggeringCommandId: string
  startedAt: string
  sourceSnapshotId: string
  sourceSystem: string
  actor: string
  writeBackOk: boolean
  gateAllowed: boolean
  driftDetected: boolean
  manualRollbackPerformed: boolean
  rollbackReason?: string
  incidentId?: string | null
  derivedFromAttemptId?: string | null
  summary: string
  links: RelatedRefs
  raw?: JsonValue | null
}

export interface ActivityItem {
  id: string
  kind: ArtifactKind | 'snapshot' | 'validation' | 'metrics' | 'gate'
  title: string
  timestamp?: string
  description: string
  href: string
}

export interface OverviewSummary {
  recentReplaySucceeded: boolean | null
  recentGateAllowed: boolean | null
  recentIncidentCount: number | null
  reviewSampleCount: number
  recentPostStateMismatchCount: number | null
  supportsReviewTimeline: boolean
  activity: ActivityItem[]
}

export interface FrontendArtifactIndex {
  generatedAt?: string
  catalog_version?: string
  field_sources?: Record<string, string>
  overview?: OverviewSummary
  metrics?: MetricDetail
  artifacts: ArtifactCatalogEntry[]
  snapshots?: SnapshotDetail[]
  replays?: ReplayBundleDetail[]
  validations?: ValidationDetail[]
  gates?: GateDetail[]
  reviews?: ReviewDetail[]
  incidents?: IncidentDetail[]
  releases?: ReleaseAttemptDetail[]
}
