import { useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/EmptyState'
import { FilterBar } from '../../components/FilterBar'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { PaginationControls } from '../../components/PaginationControls'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { describeDataError } from '../../data/errors'
import { enabledCapabilityLabels } from '../../data/list-capabilities'
import type { SortDirection } from '../../data/types'

export function SnapshotListPage() {
  const provider = useSreProvider()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  const snapshots = useQuery({
    queryKey: ['snapshots', search, sortBy, sortDirection, pageSize, page],
    placeholderData: (previous) => previous,
    queryFn: () =>
      provider.listSnapshots({
        search,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
  })
  const lastDataRef = useRef<typeof snapshots.data>(undefined)
  const errorState = snapshots.isError
    ? describeDataError(snapshots.error, 'Snapshots unavailable.')
    : null

  if (snapshots.data) {
    lastDataRef.current = snapshots.data
  }

  const data = snapshots.data ?? lastDataRef.current

  if (snapshots.isLoading && !data) {
    return <LoadingSkeleton label="Loading snapshots..." />
  }

  if (snapshots.isError && !data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Snapshots unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Snapshots unavailable."
        description="No snapshot list payload was returned."
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Snapshot Viewer</p>
          <h2>Snapshots</h2>
          <p>View frozen narrative state, then pivot into the replay, validation, or incident chain.</p>
        </div>
      </header>
      {snapshots.isError ? (
        <StatusNotice
          title="Showing cached snapshots."
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
          { value: 'createdAt', label: 'Created at' },
          { value: 'title', label: 'Title' },
          { value: 'stateIdentity', label: 'State identity' },
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
      />
      {data.items.length === 0 ? (
        <EmptyState
          title="No snapshots match the current query."
          description="Try a different search term or sort order."
        />
      ) : (
        <>
          <ul className="card-list">
            {data.items.map((snapshot) => (
              <li key={snapshot.ref} className="surface-card">
                <h3 className="card-title">
                  <Link className="card-link" to={`/snapshots/${snapshot.ref}`}>
                    {snapshot.title}
                  </Link>
                </h3>
                <p className="card-summary">{snapshot.summary}</p>
                <p className="card-meta">
                  {snapshot.stateIdentity} / schema {snapshot.schemaVersion} / policy {snapshot.policyVersion}
                </p>
                <div className="link-row">
                  {snapshot.links.replayRef ? (
                    <Link className="card-link" to={`/replay/${snapshot.links.replayRef}`}>
                      Related Replay
                    </Link>
                  ) : null}
                  {snapshot.links.artifactRef ? (
                    <Link className="card-link" to={`/artifacts/${snapshot.links.artifactRef}`}>
                      Source Artifact
                    </Link>
                  ) : null}
                </div>
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
