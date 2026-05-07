import type {
  ArtifactDetail,
  ArtifactQuery,
  FrontendArtifactIndex,
  IncidentDetail,
  IncidentQuery,
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
  SnapshotDetail,
  SnapshotQuery,
  ValidationDetail,
} from './types'

export interface SreDataProvider {
  getOverview(): Promise<OverviewSummary>
  listSnapshots(query: SnapshotQuery): Promise<ListResponse<SnapshotDetail>>
  getSnapshot(ref: string): Promise<SnapshotDetail>
  listArtifacts(query: ArtifactQuery): Promise<ListResponse<ArtifactDetail>>
  getArtifact(ref: string): Promise<ArtifactDetail>
  listReplayBundles(query: ReplayQuery): Promise<ListResponse<ReplayBundleDetail>>
  getReplayBundle(ref: string): Promise<ReplayBundleDetail>
  getValidationForReplay(ref: string): Promise<ValidationDetail>
  getMetrics(query: MetricQuery): Promise<MetricDetail>
  getGateResult(ref: string): Promise<import('./types').GateDetail>
  listReviews(query: ReviewQuery): Promise<ListResponse<ReviewDetail>>
  getReview(ref: string): Promise<ReviewDetail>
  listIncidents(query: IncidentQuery): Promise<ListResponse<IncidentDetail>>
  getIncident(ref: string): Promise<IncidentDetail>
  listReleaseAttempts(
    query: ReleaseAttemptQuery,
  ): Promise<ListResponse<ReleaseAttemptDetail>>
  getReleaseAttempt(ref: string): Promise<ReleaseAttemptDetail>
}

export interface SeededProviderOptions {
  index: FrontendArtifactIndex
  rawArtifacts?: Record<string, unknown>
}
