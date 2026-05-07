import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { CopyableText } from '../../components/CopyableText'
import { EmptyState } from '../../components/EmptyState'
import { JsonTreeViewer } from '../../components/JsonTreeViewer'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { PermissionGate } from '../../components/PermissionGate'
import { StateBadge } from '../../components/StateBadge'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'

export function ReleaseDetailPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const role = useUiStore((state) => state.role)
  const params = useParams()
  const ref = decodeURIComponent(params.releaseRef ?? '')
  const release = useQuery({
    queryKey: [dataMode, 'release', ref],
    queryFn: () => provider.getReleaseAttempt(ref),
    enabled: Boolean(ref),
  })
  const errorState = release.isError
    ? describeDataError(release.error, 'Release detail unavailable.')
    : null

  if (release.isLoading && !release.data) {
    return <LoadingSkeleton label="Loading release attempt detail..." />
  }

  if (release.isError && !release.data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Release detail unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!release.data) {
    return (
      <EmptyState
        title="Release detail unavailable."
        description="No release attempt payload was returned."
      />
    )
  }

  const validationHref = release.data.links.replayRef
    ? `/validation?replayRef=${encodeURIComponent(release.data.links.replayRef)}`
    : '/validation'
  const gateHref = release.data.links.gateRef
    ? `/metrics?gateRef=${encodeURIComponent(release.data.links.gateRef)}`
    : '/metrics'

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Release Detail</p>
          <h2>{release.data.attemptId}</h2>
          <p>{release.data.summary}</p>
        </div>
        <div className="detail-actions">
          <StateBadge
            label={release.data.gateAllowed ? 'allowed' : 'blocked'}
            tone={release.data.gateAllowed ? 'success' : 'danger'}
          />
          <StateBadge
            label={release.data.writeBackOk ? 'write-back ok' : 'write-back failed'}
            tone={release.data.writeBackOk ? 'success' : 'warning'}
          />
          {release.data.manualRollbackPerformed ? (
            <StateBadge label="manual rollback" tone="warning" />
          ) : null}
        </div>
      </header>
      {release.isError && release.data ? (
        <StatusNotice
          title="Showing cached release detail."
          description={errorState?.description}
          tone="warning"
        />
      ) : null}
      <section className="surface-card">
        <dl className="meta-grid">
          <div>
            <dt>Triggering command</dt>
            <dd>
              <CopyableText text={release.data.triggeringCommandId} label="triggering command id" />
            </dd>
          </div>
          <div>
            <dt>Started at</dt>
            <dd>{release.data.startedAt}</dd>
          </div>
          <div>
            <dt>Source snapshot</dt>
            <dd>
              <CopyableText text={release.data.sourceSnapshotId} label="source snapshot id" />
            </dd>
          </div>
          <div>
            <dt>Source system</dt>
            <dd>{release.data.sourceSystem}</dd>
          </div>
          <div>
            <dt>Actor</dt>
            <dd>{release.data.actor}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{release.data.updatedAt ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>Drift detected</dt>
            <dd>{release.data.driftDetected ? 'yes' : 'no'}</dd>
          </div>
          <div>
            <dt>Incident id</dt>
            <dd>
              {release.data.incidentId ? (
                <CopyableText text={release.data.incidentId} label="incident id" />
              ) : (
                'n/a'
              )}
            </dd>
          </div>
          <div>
            <dt>Derived from attempt</dt>
            <dd>{release.data.derivedFromAttemptId ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>Rollback reason</dt>
            <dd>{release.data.rollbackReason ?? 'n/a'}</dd>
          </div>
        </dl>
        <div className="link-row">
          {release.data.links.snapshotRef ? (
            <Link className="card-link" to={`/snapshots/${release.data.links.snapshotRef}`}>
              Locked Snapshot
            </Link>
          ) : null}
          {release.data.links.replayRef ? (
            <Link className="card-link" to={`/replay/${release.data.links.replayRef}`}>
              Replay Evidence
            </Link>
          ) : null}
          {release.data.links.gateRef ? (
            <Link className="card-link" to={gateHref}>
              Gate Result
            </Link>
          ) : null}
          {release.data.links.replayRef ? (
            <Link className="card-link" to={validationHref}>
              Drift Evidence
            </Link>
          ) : null}
          {release.data.links.incidentRef ? (
            <Link className="card-link" to={`/incidents/${release.data.links.incidentRef}`}>
              Linked Incident
            </Link>
          ) : null}
        </div>
      </section>
      <PermissionGate
        role={role}
        minimumRole="oncall"
        fallback={<p className="muted">Rollback approval requires oncall or admin role.</p>}
      >
        <button type="button">Approve Rollback</button>
      </PermissionGate>
      {release.data.raw ? (
        <JsonTreeViewer value={release.data.raw} label="Release JSON" />
      ) : null}
    </section>
  )
}
