import type {
  ArtifactDetail,
  ArtifactSummary,
  FrontendArtifactIndex,
  GateDetail,
  IncidentDetail,
  IncidentQuery,
  ListCapabilities,
  ListResponse,
  ReleaseAttemptDetail,
  ReleaseAttemptQuery,
  ReplayQuery,
  ReviewDetail,
  ReviewQuery,
  SnapshotQuery,
  JsonValue,
} from '../types'
import type { ArtifactQuery, MetricDetail, MetricQuery } from '../types'
import type { SreDataProvider } from '../provider'

interface IndexBackedProviderOptions {
  getIndex: () => Promise<FrontendArtifactIndex>
  loadRawArtifact: (path: string) => Promise<unknown>
}

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

async function loadArtifactDetail(
  index: FrontendArtifactIndex,
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
  index: FrontendArtifactIndex,
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
  return {
    async getOverview() {
      const index = await getIndex()
      return clone(index.overview)
    },

    async listSnapshots(query: SnapshotQuery) {
      const index = await getIndex()
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
      const index = await getIndex()
      const snapshot = index.snapshots.find((item) => item.ref === ref)
      if (!snapshot) {
        return notFound('snapshot', ref)
      }

      return clone(snapshot)
    },

    async listArtifacts(query: ArtifactQuery) {
      const index = await getIndex()
      const filtered = index.artifacts.filter((artifact) => {
        if (query.kind && artifact.kind !== query.kind) {
          return false
        }

        return includesSearch(query.search, [
          artifact.ref,
          artifact.title,
          artifact.description,
          artifact.tags.join(' '),
        ])
      })
      const sorted = sortByKey(
        filtered,
        query.sortBy ?? 'updatedAt',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(
        sorted.map(artifactListItem),
        page,
        pageSize,
        {
          timeRange: true,
          status: false,
          replayOperatorId: false,
        },
      )
    },

    async getArtifact(ref: string) {
      const index = await getIndex()
      return loadArtifactDetail(index, ref, loadRawArtifact)
    },

    async listReplayBundles(query: ReplayQuery) {
      const index = await getIndex()
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
      const index = await getIndex()
      const replay = index.replays.find((item) => item.ref === ref)
      if (!replay) {
        return notFound('replay bundle', ref)
      }

      const raw = (await loadRawArtifact(replay.artifactPath)) as JsonValue | null

      return {
        ...clone(replay),
        raw: raw ?? null,
      }
    },

    async getValidationForReplay(ref: string) {
      const index = await getIndex()
      const validation = index.validations.find((item) => item.replayRef === ref)
      if (!validation) {
        return notFound('validation', ref)
      }

      return clone(validation)
    },

    async getMetrics(_query: MetricQuery): Promise<MetricDetail> {
      const index = await getIndex()
      const metrics = clone(index.metrics)

      return {
        ...metrics,
        timeSeries: metrics.timeSeries.map((series) => ({
          ...series,
          points: sliceMetricSeries(series.points, _query.timeRange),
        })),
      }
    },

    async getGateResult(ref: string): Promise<GateDetail> {
      const index = await getIndex()
      const gate = index.gates.find((item) => item.ref === ref)
      if (!gate) {
        return notFound('gate', ref)
      }

      return clone(gate)
    },

    async listReviews(query: ReviewQuery) {
      const index = await getIndex()
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
        query.sortBy ?? 'updatedAt',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(sorted.map(clone), page, pageSize, {
        timeRange: filtered.every((item) => Boolean(item.updatedAt)),
        status: false,
        replayOperatorId: false,
      })
    },

    async getReview(ref: string): Promise<ReviewDetail> {
      const index = await getIndex()
      const review = index.reviews.find((item) => item.ref === ref)
      if (!review) {
        return notFound('review', ref)
      }

      return attachRawByRef(index, review, loadRawArtifact)
    },

    async listIncidents(query: IncidentQuery) {
      const index = await getIndex()
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
        query.sortBy ?? 'updatedAt',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(sorted.map(clone), page, pageSize, {
        timeRange: true,
        status: true,
        replayOperatorId: false,
      })
    },

    async getIncident(ref: string): Promise<IncidentDetail> {
      const index = await getIndex()
      const incident = index.incidents.find((item) => item.ref === ref)
      if (!incident) {
        return notFound('incident', ref)
      }

      return attachRawByRef(index, incident, loadRawArtifact)
    },

    async listReleaseAttempts(query: ReleaseAttemptQuery) {
      const index = await getIndex()
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
        query.sortBy ?? 'updatedAt',
        query.sortDirection ?? 'desc',
      )
      const { page, pageSize } = normalizePagination(query)

      return toListResponse(sorted.map(clone), page, pageSize, {
        timeRange: true,
        status: true,
        replayOperatorId: false,
      })
    },

    async getReleaseAttempt(ref: string): Promise<ReleaseAttemptDetail> {
      const index = await getIndex()
      const release = index.releases.find((item) => item.ref === ref)
      if (!release) {
        return notFound('release attempt', ref)
      }

      return attachRawByRef(index, release, loadRawArtifact)
    },
  }
}
