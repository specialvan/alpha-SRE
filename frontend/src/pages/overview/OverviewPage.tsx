import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/EmptyState'
import { KpiCard } from '../../components/KpiCard'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { StatusNotice } from '../../components/StatusNotice'
import { Timeline } from '../../components/Timeline'
import { describeDataError } from '../../data/errors'
import { useOverviewQuery } from '../../data/hooks'

function boolLabel(value: boolean | null, positive: string, negative: string) {
  if (value === null) {
    return 'Unavailable'
  }

  return value ? positive : negative
}

export function OverviewPage() {
  const overview = useOverviewQuery()
  const errorState = overview.isError
    ? describeDataError(overview.error, 'Overview unavailable.')
    : null

  if (overview.isLoading && !overview.data) {
    return <LoadingSkeleton label="Loading overview..." />
  }

  if (overview.isError && !overview.data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Overview unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!overview.data) {
    return (
      <EmptyState
        title="Overview unavailable."
        description="No overview payload was returned."
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Control Plane Overview</p>
          <h2>Overview</h2>
          <p>
            Current narrative reliability posture across replay, gate, incident, and review
            surfaces.
          </p>
        </div>
      </header>
      {overview.isError ? (
        <StatusNotice
          title="Showing cached overview."
          description={errorState?.description}
          tone="warning"
        />
      ) : null}
      <div className="surface-grid surface-grid--cards">
        <KpiCard
          label="Latest Replay"
          value={boolLabel(overview.data.recentReplaySucceeded, 'Succeeded', 'Failed')}
          tone={overview.data.recentReplaySucceeded ? 'success' : 'danger'}
        />
        <KpiCard
          label="Latest Gate"
          value={boolLabel(overview.data.recentGateAllowed, 'Allowed', 'Blocked')}
          tone={overview.data.recentGateAllowed ? 'success' : 'danger'}
        />
        <KpiCard label="Recent Incidents" value={String(overview.data.recentIncidentCount ?? 0)} />
        <KpiCard label="Review Samples" value={String(overview.data.reviewSampleCount)} />
        <KpiCard
          label="Recent Post-State Mismatches"
          value={String(overview.data.recentPostStateMismatchCount ?? 0)}
          tone="danger"
        />
      </div>
      <section className="page-shell">
        <h3>Recent Activity</h3>
        <Timeline items={overview.data.activity} />
      </section>
      <section className="surface-card">
        <h3>Quick Entry</h3>
        <ul className="card-list">
          <li className="surface-card">
            <Link className="card-link" to="/artifacts">
              Artifact Browser
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/snapshots">
              Snapshot Viewer
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/replay">
              Replay Lab
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/validation">
              Validation Center
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/metrics">
              Metrics & Gate
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/quality/reviews">
              Quality Reviews
            </Link>
          </li>
        </ul>
      </section>
    </section>
  )
}
