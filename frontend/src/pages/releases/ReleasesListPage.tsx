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
import { describeDataError } from '../../data/errors'
import { enabledCapabilityLabels } from '../../data/list-capabilities'
import type { SortDirection } from '../../data/types'

export function ReleasesListPage() {
  const provider = useSreProvider()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  const releases = useQuery({
    queryKey: ['releases', search, status, sortBy, sortDirection, pageSize, page],
    placeholderData: (previous) => previous,
    queryFn: () =>
      provider.listReleaseAttempts({
        search,
        status: status || undefined,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
  })
  const lastDataRef = useRef<typeof releases.data>(undefined)
  const errorState = releases.isError
    ? describeDataError(releases.error, 'Release attempts unavailable.')
    : null

  if (releases.data) {
    lastDataRef.current = releases.data
  }

  const data = releases.data ?? lastDataRef.current

  if (releases.isLoading && !data) {
    return <LoadingSkeleton label="Loading release attempts..." />
  }

  if (releases.isError && !data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Release attempts unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Release attempts unavailable."
        description="No release list payload was returned."
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Release Control</p>
          <h2>Releases</h2>
          <p>Promotion attempts, rollback posture, and linked replay or incident evidence.</p>
        </div>
      </header>
      {releases.isError ? (
        <StatusNotice
          title="Showing cached release attempts."
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
          { value: 'attemptId', label: 'Attempt id' },
          { value: 'startedAt', label: 'Started at' },
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
          <span>Release status</span>
          <select
            aria-label="Release status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">all</option>
            <option value="blocked">blocked</option>
            <option value="allowed">allowed</option>
          </select>
        </label>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState
          title="No release attempts match the current query."
          description="Change the search term, status filter, or sort order."
        />
      ) : (
        <>
          <ul className="card-list">
            {data.items.map((release) => (
              <li key={release.ref} className="surface-card">
                <div className="card-topline">
                  <StateBadge
                    label={release.gateAllowed ? 'allowed' : 'blocked'}
                    tone={release.gateAllowed ? 'success' : 'danger'}
                  />
                  <StateBadge
                    label={release.writeBackOk ? 'write-back ok' : 'write-back failed'}
                    tone={release.writeBackOk ? 'success' : 'warning'}
                  />
                  {release.manualRollbackPerformed ? (
                    <StateBadge label="manual rollback" tone="warning" />
                  ) : null}
                </div>
                <h3 className="card-title">
                  <Link className="card-link" to={`/releases/${release.ref}`}>
                    {release.attemptId}
                  </Link>
                </h3>
                <p className="card-summary">{release.summary}</p>
                <p className="card-meta">
                  {release.sourceSystem} / {release.triggeringCommandId} / {release.actor}
                </p>
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
