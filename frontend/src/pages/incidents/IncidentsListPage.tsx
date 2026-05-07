import { useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/EmptyState'
import { FilterBar } from '../../components/FilterBar'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { PaginationControls } from '../../components/PaginationControls'
import { StateBadge } from '../../components/StateBadge'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'
import { enabledCapabilityLabels } from '../../data/list-capabilities'
import type { DataMode, SortDirection } from '../../data/types'

export function IncidentsListPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  const incidents = useQuery({
    queryKey: [
      dataMode,
      'incidents',
      search,
      severity,
      status,
      sortBy,
      sortDirection,
      pageSize,
      page,
    ],
    queryFn: () =>
      provider.listIncidents({
        search,
        severity: severity || undefined,
        status: status || undefined,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
  })
  const lastDataRef = useRef<Partial<Record<DataMode, typeof incidents.data>>>({})
  const errorState = incidents.isError
    ? describeDataError(incidents.error, 'Incidents unavailable.')
    : null

  if (incidents.data) {
    lastDataRef.current[dataMode] = incidents.data
  }

  const data = incidents.data ?? lastDataRef.current[dataMode]

  if (incidents.isLoading && !data) {
    return <LoadingSkeleton label="Loading incidents..." />
  }

  if (incidents.isError && !data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Incidents unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Incidents unavailable."
        description="No incident list payload was returned."
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Incident Queue</p>
          <h2>Incidents</h2>
          <p>On-call incident records with linked replay, validation, and release evidence.</p>
        </div>
      </header>
      {incidents.isError ? (
        <StatusNotice
          title="Showing cached incidents."
          description={errorState?.description}
          tone="warning"
        />
      ) : null}
      <FilterBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        sortBy={sortBy}
        onSortByChange={(value) => {
          setSortBy(value)
          setPage(1)
        }}
        sortOptions={[
          { value: 'updatedAt', label: 'Updated at' },
          { value: 'incidentId', label: 'Incident id' },
          { value: 'severity', label: 'Severity' },
        ]}
        sortDirection={sortDirection}
        onSortDirectionChange={(value) => {
          setSortDirection(value)
          setPage(1)
        }}
        pageSize={pageSize}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setPage(1)
        }}
        total={data.total}
        capabilities={enabledCapabilityLabels(data.capabilities)}
      >
        <label className="toolbar__field">
          <span>Severity</span>
          <select
            aria-label="Incident severity"
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value)
              setPage(1)
            }}
          >
            <option value="">all</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </label>
        <label className="toolbar__field">
          <span>Status</span>
          <select
            aria-label="Incident status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">all</option>
            <option value="open">open</option>
            <option value="closed">closed</option>
          </select>
        </label>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState
          title="No incidents match the current query."
          description="Change the severity, status, or search filters."
        />
      ) : (
        <>
          <ul className="card-list">
            {data.items.map((incident) => (
              <li key={incident.ref} className="surface-card">
                <div className="card-topline">
                  <StateBadge
                    label={incident.severity}
                    tone={incident.severity === 'high' ? 'danger' : 'warning'}
                  />
                  <StateBadge
                    label={incident.status}
                    tone={incident.status === 'open' ? 'warning' : 'success'}
                  />
                </div>
                <h3 className="card-title">
                  <Link className="card-link" to={`/incidents/${incident.ref}`}>
                    {incident.incidentId}
                  </Link>
                </h3>
                <p className="card-summary">{incident.summary}</p>
                <p className="card-meta">{incident.primaryCause}</p>
              </li>
            ))}
          </ul>
          <PaginationControls
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  )
}
