import { useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { ArtifactCard } from '../../components/ArtifactCard'
import { EmptyState } from '../../components/EmptyState'
import { FilterBar } from '../../components/FilterBar'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { PaginationControls } from '../../components/PaginationControls'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'
import { enabledCapabilityLabels } from '../../data/list-capabilities'
import type { ArtifactKind, DataMode, SortDirection } from '../../data/types'

export function ArtifactsPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<ArtifactKind | ''>('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  const artifacts = useQuery({
    queryKey: [dataMode, 'artifacts', search, kind, sortBy, sortDirection, pageSize, page],
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
  const lastDataRef = useRef<Partial<Record<DataMode, typeof artifacts.data>>>({})
  const errorState = artifacts.isError
    ? describeDataError(artifacts.error, '制品列表不可用。')
    : null

  if (artifacts.data) {
    lastDataRef.current[dataMode] = artifacts.data
  }

  const data = artifacts.data ?? lastDataRef.current[dataMode]

  if (artifacts.isLoading && !data) {
    return <LoadingSkeleton label="正在加载制品列表..." />
  }

  if (artifacts.isError && !data) {
    return (
      <EmptyState
        title={errorState?.title ?? '制品列表不可用。'}
        description={errorState?.description}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="制品列表不可用。"
        description="未返回制品列表数据。"
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">制品浏览</p>
          <h2>制品</h2>
          <p>这里只展示顶层导出记录，包内派生分节保留在详情页中查看。</p>
        </div>
      </header>
      {artifacts.isError ? (
        <StatusNotice
          title="正在显示缓存的制品列表。"
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
          { value: 'updatedAt', label: '更新时间' },
          { value: 'title', label: '标题' },
          { value: 'kind', label: '类型' },
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
          <span>制品类型</span>
          <select
            aria-label="制品类型"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as ArtifactKind | '')
              setPage(1)
            }}
          >
            <option value="">全部</option>
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
          title="当前查询没有匹配的制品。"
          description="请调整制品类型、搜索词或排序方式。"
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
