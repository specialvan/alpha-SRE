import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'

import { EmptyState } from '../../components/EmptyState'
import { IssueList } from '../../components/IssueList'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { MetricSparkline } from '../../components/MetricSparkline'
import { StateBadge } from '../../components/StateBadge'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'

export function MetricsPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const [searchParams] = useSearchParams()
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const metrics = useQuery({
    queryKey: [dataMode, 'metrics', timeRange],
    queryFn: () => provider.getMetrics({ timeRange }),
  })
  const metricsError = metrics.isError
    ? describeDataError(metrics.error, 'Metrics unavailable.')
    : null
  const requestedGateRef = searchParams.get('gateRef') ?? ''
  const primaryGateRef =
    requestedGateRef || metrics.data?.gateRefs[0] || 'gate:bundle:post-state-mismatch'
  const gate = useQuery({
    queryKey: [dataMode, 'gate', primaryGateRef],
    queryFn: () => provider.getGateResult(primaryGateRef),
    enabled: Boolean(primaryGateRef),
  })
  const gateError = gate.isError
    ? describeDataError(gate.error, 'Gate detail unavailable.')
    : null

  if (metrics.isLoading && !metrics.data) {
    return <LoadingSkeleton label="Loading metrics and gate summary..." />
  }

  if (metrics.isError && !metrics.data) {
    return (
      <EmptyState
        title={metricsError?.title ?? 'Metrics unavailable.'}
        description={metricsError?.description}
      />
    )
  }

  const gateLabel = gate.data
    ? gate.data.allowed
      ? gate.data.warnings.length > 0
        ? 'Warning'
        : 'Allowed'
      : 'Blocked'
    : 'Unavailable'
  const gateTone: 'danger' | 'success' | 'warning' =
    gate.data && gate.data.allowed
      ? gate.data.warnings.length > 0
        ? 'warning'
        : 'success'
      : 'danger'
  const validationHref = gate.data?.linkedReplayRef
    ? `/validation?replayRef=${encodeURIComponent(gate.data.linkedReplayRef)}`
    : '/validation'

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Metrics & Gate</p>
          <h2>Metrics & Gate</h2>
          <p>
            Narrative-native summary metrics, time-series slices, and the current gate reason
            chain.
          </p>
        </div>
      </header>
      {metrics.isError && metrics.data ? (
        <StatusNotice
          title="Showing cached metrics."
          description={metricsError?.description}
          tone="warning"
        />
      ) : null}
      <label className="toolbar__field">
        <span>Metric range</span>
        <select
          aria-label="Metric range"
          value={timeRange}
          onChange={(event) =>
            setTimeRange(event.target.value as '24h' | '7d' | '30d' | 'all')
          }
        >
          <option value="24h">24h</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
          <option value="all">all</option>
        </select>
      </label>
      <div className="surface-grid surface-grid--cards">
        {Object.entries(metrics.data?.summary ?? {}).map(([key, value]) => (
          <article key={key} className="surface-card">
            <p className="eyebrow">{key}</p>
            <strong className="kpi-card__value">{String(value)}</strong>
          </article>
        ))}
      </div>
      <section className="surface-grid surface-grid--cards">
        {metrics.data?.timeSeries.map((series) => (
          <MetricSparkline key={series.key} series={series} />
        ))}
      </section>
      {gate.data ? (
        <section className="surface-card">
          <h3>Gate Status</h3>
          <StateBadge label={gateLabel} tone={gateTone} />
          <p className="card-summary">{gate.data.explanation}</p>
          <div className="link-row">
            <Link className="card-link" to={validationHref}>
              Validation Center
            </Link>
            <Link className="card-link" to="/quality/reviews">
              Quality Reviews
            </Link>
          </div>
          <ul className="stat-list">
            {Object.entries(gate.data.thresholds ?? {}).map(([key, value]) => (
              <li key={key}>
                {key}: {String(value)}
              </li>
            ))}
          </ul>
          {gate.data.warnings.length > 0 ? (
            <IssueList
              items={gate.data.warnings.map((warning) => ({
                id: warning,
                title: warning,
                description: 'Gate emitted a warning while still evaluating thresholds.',
              }))}
              emptyMessage="No gate warnings."
            />
          ) : null}
        </section>
      ) : null}
      {gate.isError && !gate.data ? (
        <StatusNotice
          title={gateError?.title ?? 'Gate detail unavailable.'}
          description={gateError?.description}
          tone="warning"
        />
      ) : null}
      <IssueList
        items={(gate.data?.blockingIssues ?? []).map((issue) => ({
          id: issue,
          title: issue,
          description: gate.data?.explanation,
          href: gate.data?.linkedReplayRef ? `/replay/${gate.data.linkedReplayRef}` : undefined,
        }))}
        emptyMessage="No gate blocking issues."
      />
    </section>
  )
}
