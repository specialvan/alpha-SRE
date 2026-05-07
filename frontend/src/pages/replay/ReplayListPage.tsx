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

const replayFailureOptions = [
  'post_state_mismatch',
  'visibility_leak',
  'belief_conflict',
  'capability_violation',
  'inactive_rule_use',
  'plot_obligation_missed',
  'policy_drift',
  'state_drift',
  'contract_mismatch',
  'mechanism_missing',
]

export function ReplayListPage() {
  const provider = useSreProvider()
  const [search, setSearch] = useState('')
  const [failureClass, setFailureClass] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  const replays = useQuery({
    queryKey: ['replays', search, failureClass, sortBy, sortDirection, pageSize, page],
    placeholderData: (previous) => previous,
    queryFn: () =>
      provider.listReplayBundles({
        search,
        failureClass: failureClass || undefined,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
  })
  const lastDataRef = useRef<typeof replays.data>(undefined)
  const errorState = replays.isError
    ? describeDataError(replays.error, 'Replay bundles unavailable.')
    : null

  if (replays.data) {
    lastDataRef.current = replays.data
  }

  const data = replays.data ?? lastDataRef.current

  if (replays.isLoading && !data) {
    return <LoadingSkeleton label="Loading replay bundles..." />
  }

  if (replays.isError && !data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Replay bundles unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Replay bundles unavailable."
        description="No replay list payload was returned."
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Replay Lab</p>
          <h2>Replay Lab</h2>
          <p>Locked replay sessions with explicit failure classes, observation frames, and evidence trails.</p>
        </div>
      </header>
      {replays.isError ? (
        <StatusNotice
          title="Showing cached replay bundles."
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
          { value: 'title', label: 'Title' },
          { value: 'commandId', label: 'Command id' },
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
          <span>Failure class</span>
          <select
            aria-label="Replay failure class"
            value={failureClass}
            onChange={(event) => {
              setFailureClass(event.target.value)
              setPage(1)
            }}
          >
            <option value="">all</option>
            {replayFailureOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState
          title="No replay bundles match the current query."
          description="Change the search text, failure class, or page size."
        />
      ) : (
        <>
          <ul className="card-list">
            {data.items.map((replay) => (
              <li key={replay.ref} className="surface-card">
                <div className="card-topline">
                  <StateBadge
                    label={replay.failureClassification ?? replay.status}
                    tone={replay.status === 'failed' ? 'danger' : 'success'}
                  />
                  <small className="muted">{replay.updatedAt}</small>
                </div>
                <h3 className="card-title">
                  <Link className="card-link" to={`/replay/${replay.ref}`}>
                    {replay.title}
                  </Link>
                </h3>
                <p className="card-summary">{replay.summary}</p>
                <p className="card-meta">
                  {replay.commandId} / {replay.promptVersion} / {replay.policyVersion}
                </p>
                <div className="link-row">
                  {replay.links.snapshotRef ? (
                    <Link className="card-link" to={`/snapshots/${replay.links.snapshotRef}`}>
                      Pre-state Snapshot
                    </Link>
                  ) : null}
                  <span className="muted">{replay.issueCodes.length} issue codes</span>
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
