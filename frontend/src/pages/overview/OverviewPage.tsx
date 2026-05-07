import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/EmptyState'
import { KpiCard } from '../../components/KpiCard'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { StatusNotice } from '../../components/StatusNotice'
import { Timeline } from '../../components/Timeline'
import { describeDataError } from '../../data/errors'
import { useOverviewQuery } from '../../data/hooks'

function boolLabel(value: boolean | null, positive: string, negative: string) {
  if (value === null) {
    return '暂无'
  }

  return value ? positive : negative
}

export function OverviewPage() {
  const overview = useOverviewQuery()
  const errorState = overview.isError
    ? describeDataError(overview.error, '总览不可用。')
    : null

  if (overview.isLoading && !overview.data) {
    return <LoadingSkeleton label="正在加载总览..." />
  }

  if (overview.isError && !overview.data) {
    return (
      <EmptyState
        title={errorState?.title ?? '总览不可用。'}
        description={errorState?.description}
      />
    )
  }

  if (!overview.data) {
    return (
      <EmptyState
        title="总览不可用。"
        description="未返回总览数据。"
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">控制台总览</p>
          <h2>总览</h2>
          <p>
            当前叙事可靠性状态，覆盖回放、Gate、事件和评审等核心面。
          </p>
        </div>
      </header>
      {overview.isError ? (
        <StatusNotice
          title="正在显示缓存的总览数据。"
          description={errorState?.description}
          tone="warning"
        />
      ) : null}
      <div className="surface-grid surface-grid--cards">
        <KpiCard
          label="最近一次回放"
          value={boolLabel(overview.data.recentReplaySucceeded, '成功', '失败')}
          tone={overview.data.recentReplaySucceeded ? 'success' : 'danger'}
        />
        <KpiCard
          label="最近一次 Gate"
          value={boolLabel(overview.data.recentGateAllowed, '通过', '阻断')}
          tone={overview.data.recentGateAllowed ? 'success' : 'danger'}
        />
        <KpiCard label="近期事件数" value={String(overview.data.recentIncidentCount ?? 0)} />
        <KpiCard label="评审样本数" value={String(overview.data.reviewSampleCount)} />
        <KpiCard
          label="近期后置状态不一致"
          value={String(overview.data.recentPostStateMismatchCount ?? 0)}
          tone="danger"
        />
      </div>
      <section className="page-shell">
        <h3>近期活动</h3>
        <Timeline items={overview.data.activity} />
      </section>
      <section className="surface-card">
        <h3>快捷入口</h3>
        <ul className="card-list">
          <li className="surface-card">
            <Link className="card-link" to="/artifacts">
              制品浏览
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/snapshots">
              快照查看
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/replay">
              回放实验室
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/validation">
              校验中心
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/metrics">
              指标与 Gate
            </Link>
          </li>
          <li className="surface-card">
            <Link className="card-link" to="/quality/reviews">
              质量评审
            </Link>
          </li>
        </ul>
      </section>
    </section>
  )
}
