import { useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { ArtifactCard } from '../../components/ArtifactCard'
import { EmptyState } from '../../components/EmptyState'
import { FilterBar } from '../../components/FilterBar'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { PaginationControls } from '../../components/PaginationControls'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { describeDataError } from '../../data/errors'
import { enabledCapabilityLabels } from '../../data/list-capabilities'
import type { ArtifactKind, SortDirection } from '../../data/types'

export function ArtifactsPage() {
  const provider = useSreProvider()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<ArtifactKind | ''>('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  const artifacts = useQuery({
    queryKey: ['artifacts', search, kind, sortBy, sortDirection, pageSize, page],
    placeholderData: (previous) => previous,
    queryFn: () =>
      provider.listArtifacts({
        search,
        kind: kind || undefined,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
  })
  const lastDataRef = useRef<typeof artifacts.data>(undefined)
  const errorState = artifacts.isError
    ? describeDataError(artifacts.error, 'Artifacts unavailable.')
    : null

  if (artifacts.data) {
    lastDataRef.current = artifacts.data
  }

  const data = artifacts.data ?? lastDataRef.current

  if (artifacts.isLoading && !data) {
    return <LoadingSkeleton label="Loading artifacts..." />
  }

  if (artifacts.isError && !data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Artifacts unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Artifacts unavailable."
        description="No artifact list payload was returned."
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Artifact Browser</p>
          <h2>Artifacts</h2>
          <p>Top-level exported records only. Bundle-derived sections stay nested in detail views.</p>
        </div>
      </header>
      {artifacts.isError ? (
        <StatusNotice
          title="Showing cached artifacts."
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
          { value: 'kind', label: 'Kind' },
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
          <span>Artifact kind</span>
          <select
            aria-label="Artifact kind"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as ArtifactKind | '')
              setPage(1)
            }}
          >
            <option value="">all</option>
            <option value="replay_bundle">replay_bundle</option>
            <option value="incident_report">incident_report</option>
            <option value="release_attempt_record">release_attempt_record</option>
            <option value="quality_review_record">quality_review_record</option>
            <option value="snapshot_bundle">snapshot_bundle</option>
          </select>
        </label>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState
          title="No artifacts match the current query."
          description="Change the artifact kind, search term, or sort order."
        />
      ) : (
        <>
          <div className="card-list">
            {data.items.map((artifact) => (
              <ArtifactCard key={artifact.ref} artifact={artifact} />
            ))}
          </div>
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
