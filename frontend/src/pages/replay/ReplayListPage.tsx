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
  const dataMode = useUiStore((state) => state.dataMode)
  const [search, setSearch] = useState('')
  const [failureClass, setFailureClass] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  const replays = useQuery({
    queryKey: [dataMode, 'replays', search, failureClass, sortBy, sortDirection, pageSize, page],
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
  const lastDataRef = useRef<Partial<Record<DataMode, typeof replays.data>>>({})
  const errorState = replays.isError
    ? describeDataError(replays.error, '回放包列表不可用。')
    : null

  if (replays.data) {
    lastDataRef.current[dataMode] = replays.data
  }

  const data = replays.data ?? lastDataRef.current[dataMode]

  if (replays.isLoading && !data) {
    return <LoadingSkeleton label="正在加载回放包..." />
  }

  if (replays.isError && !data) {
    return (
      <EmptyState
        title={errorState?.title ?? '回放包列表不可用。'}
        description={errorState?.description}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="回放包列表不可用。"
        description="未返回回放列表数据。"
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">回放实验室</p>
          <h2>回放实验室</h2>
          <p>查看带锁定上下文的回放会话、失败分类、观测帧和证据链。</p>
        </div>
      </header>
      {replays.isError ? (
        <StatusNotice
          title="正在显示缓存的回放包。"
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
          { value: 'commandId', label: '命令 ID' },
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
          <span>失败分类</span>
          <select
            aria-label="回放失败分类"
            value={failureClass}
            onChange={(event) => {
              setFailureClass(event.target.value)
              setPage(1)
            }}
          >
            <option value="">全部</option>
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
          title="当前查询没有匹配的回放包。"
          description="请调整搜索词、失败分类或每页数量。"
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
                      前置快照
                    </Link>
                  ) : null}
                  <span className="muted">{replay.issueCodes.length} 个问题码</span>
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
