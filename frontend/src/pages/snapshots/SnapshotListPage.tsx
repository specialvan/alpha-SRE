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

export function SnapshotListPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  const snapshots = useQuery({
    queryKey: [dataMode, 'snapshots', search, sortBy, sortDirection, pageSize, page],
    queryFn: () =>
      provider.listSnapshots({
        search,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
  })
  const lastDataRef = useRef<Partial<Record<DataMode, typeof snapshots.data>>>({})
  const errorState = snapshots.isError
    ? describeDataError(snapshots.error, '快照列表不可用。')
    : null

  if (snapshots.data) {
    lastDataRef.current[dataMode] = snapshots.data
  }

  const data = snapshots.data ?? lastDataRef.current[dataMode]

  if (snapshots.isLoading && !data) {
    return <LoadingSkeleton label="正在加载快照..." />
  }

  if (snapshots.isError && !data) {
    return (
      <EmptyState
        title={errorState?.title ?? '快照列表不可用。'}
        description={errorState?.description}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="快照列表不可用。"
        description="未返回快照列表数据。"
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">快照查看</p>
          <h2>快照</h2>
          <p>查看冻结的叙事状态，并继续进入回放、校验或事件链路。</p>
        </div>
      </header>
      {snapshots.isError ? (
        <StatusNotice
          title="正在显示缓存的快照。"
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
          { value: 'createdAt', label: '创建时间' },
          { value: 'title', label: '标题' },
          { value: 'stateIdentity', label: '状态标识' },
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
          title="当前查询没有匹配的快照。"
          description="请调整搜索词或排序方式。"
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
                      关联回放
                    </Link>
                  ) : null}
                  {snapshot.links.artifactRef ? (
                    <Link className="card-link" to={`/artifacts/${snapshot.links.artifactRef}`}>
                      来源制品
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
