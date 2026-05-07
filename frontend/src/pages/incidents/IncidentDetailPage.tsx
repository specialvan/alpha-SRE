import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { CopyableText } from '../../components/CopyableText'
import { EmptyState } from '../../components/EmptyState'
import { IssueList } from '../../components/IssueList'
import { JsonTreeViewer } from '../../components/JsonTreeViewer'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { PermissionGate } from '../../components/PermissionGate'
import { StateBadge } from '../../components/StateBadge'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'

export function IncidentDetailPage() {
  const provider = useSreProvider()
  const role = useUiStore((state) => state.role)
  const params = useParams()
  const ref = decodeURIComponent(params.incidentRef ?? '')
  const incident = useQuery({
    queryKey: ['incident', ref],
    queryFn: () => provider.getIncident(ref),
    enabled: Boolean(ref),
  })
  const errorState = incident.isError
    ? describeDataError(incident.error, 'Incident detail unavailable.')
    : null

  if (incident.isLoading && !incident.data) {
    return <LoadingSkeleton label="Loading incident detail..." />
  }

  if (incident.isError && !incident.data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Incident detail unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!incident.data) {
    return (
      <EmptyState
        title="Incident detail unavailable."
        description="No incident payload was returned."
      />
    )
  }

  const validationHref = incident.data.links.replayRef
    ? `/validation?replayRef=${encodeURIComponent(incident.data.links.replayRef)}`
    : '/validation'

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Incident Detail</p>
          <h2>{incident.data.incidentId}</h2>
          <p>{incident.data.summary}</p>
        </div>
        <div className="detail-actions">
          <StateBadge
            label={incident.data.severity}
            tone={incident.data.severity === 'high' ? 'danger' : 'warning'}
          />
          <StateBadge
            label={incident.data.status}
            tone={incident.data.status === 'open' ? 'warning' : 'success'}
          />
        </div>
      </header>
      {incident.isError && incident.data ? (
        <StatusNotice
          title="Showing cached incident detail."
          description={errorState?.description}
          tone="warning"
        />
      ) : null}
      <section className="surface-card">
        <dl className="meta-grid">
          <div>
            <dt>Owner</dt>
            <dd>{incident.data.incidentOwner}</dd>
          </div>
          <div>
            <dt>Date opened</dt>
            <dd>{incident.data.dateOpened}</dd>
          </div>
          <div>
            <dt>Rollback triggered</dt>
            <dd>{incident.data.rollbackTriggered ? 'yes' : 'no'}</dd>
          </div>
          <div>
            <dt>Rollback action</dt>
            <dd>{incident.data.rollbackActionTaken ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>Required regression test</dt>
            <dd>
              {incident.data.requiredRegressionTest ? (
                <CopyableText
                  text={incident.data.requiredRegressionTest}
                  label="required regression test"
                  as="code"
                />
              ) : (
                'n/a'
              )}
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{incident.data.updatedAt ?? 'n/a'}</dd>
          </div>
        </dl>
        <div className="link-row">
          {incident.data.links.replayRef ? (
            <Link className="card-link" to={`/replay/${incident.data.links.replayRef}`}>
              Related Replay
            </Link>
          ) : null}
          {incident.data.links.releaseRef ? (
            <Link className="card-link" to={`/releases/${incident.data.links.releaseRef}`}>
              Related Release
            </Link>
          ) : null}
          {incident.data.links.reviewRef ? (
            <Link className="card-link" to={`/quality/reviews/${incident.data.links.reviewRef}`}>
              Quality Review
            </Link>
          ) : (
            <Link className="card-link" to="/quality/reviews">
              Quality Reviews
            </Link>
          )}
          <Link className="card-link" to={validationHref}>
            Validation Center
          </Link>
        </div>
      </section>
      <IssueList
        items={incident.data.evidenceReferences.map((reference) => ({
          id: reference,
          title: reference,
        }))}
      />
      <section className="surface-card">
        <h3>Action Items</h3>
        <ul className="card-list">
          {incident.data.actionItems.map((item, index) => (
            <li key={`${item.action}-${index}`} className="surface-card">
              <strong>{item.action}</strong>
              <p className="card-summary">
                {item.owner} / {item.layer} / {item.status}
              </p>
              {item.dueDate ? <p className="card-meta">{item.dueDate}</p> : null}
            </li>
          ))}
        </ul>
      </section>
      <PermissionGate
        role={role}
        minimumRole="oncall"
        fallback={<p className="muted">OnCall actions require oncall or admin role.</p>}
      >
        <button type="button">Acknowledge Incident</button>
      </PermissionGate>
      {incident.data.raw ? <JsonTreeViewer value={incident.data.raw} label="Incident JSON" /> : null}
    </section>
  )
}
