import { useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/EmptyState'
import { FilterBar } from '../../components/FilterBar'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { PaginationControls } from '../../components/PaginationControls'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'
import { enabledCapabilityLabels } from '../../data/list-capabilities'
import type { DataMode, SortDirection } from '../../data/types'

export function ReviewsListPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  const reviews = useQuery({
    queryKey: [dataMode, 'reviews', search, sortBy, sortDirection, pageSize, page],
    queryFn: () =>
      provider.listReviews({
        search,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
  })
  const lastDataRef = useRef<Partial<Record<DataMode, typeof reviews.data>>>({})
  const errorState = reviews.isError
    ? describeDataError(reviews.error, 'Quality reviews unavailable.')
    : null

  if (reviews.data) {
    lastDataRef.current[dataMode] = reviews.data
  }

  const data = reviews.data ?? lastDataRef.current[dataMode]

  if (reviews.isLoading && !data) {
    return <LoadingSkeleton label="Loading quality reviews..." />
  }

  if (reviews.isError && !data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Quality reviews unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Quality reviews unavailable."
        description="No quality review list payload was returned."
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Quality Review</p>
          <h2>Quality Reviews</h2>
          <p>Review records linked back to replay evidence and source artifacts.</p>
        </div>
      </header>
      {reviews.isError ? (
        <StatusNotice
          title="Showing cached quality reviews."
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
          { value: 'reviewId', label: 'Review id' },
          { value: 'title', label: 'Title' },
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
          title="No review records match the current query."
          description="Change the search or sort settings."
        />
      ) : (
        <>
          <ul className="card-list">
            {data.items.map((review) => (
              <li key={review.ref} className="surface-card">
                <h3 className="card-title">
                  <Link className="card-link" to={`/quality/reviews/${review.ref}`}>
                    {review.reviewId}
                  </Link>
                </h3>
                <p className="card-summary">{review.summary}</p>
                <p className="card-meta">{review.sourceArtifactReference}</p>
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
