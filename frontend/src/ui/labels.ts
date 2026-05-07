import type { OperatorRole, ThemeMode } from '../app/store'
import type { ArtifactKind, DataMode } from '../data/types'

const routeSegmentLabels: Record<string, string> = {
  artifacts: '制品',
  snapshots: '快照',
  replay: '回放',
  validation: '校验',
  metrics: '指标',
  quality: '质量',
  reviews: '评审',
  incidents: '事件',
  releases: '发布',
}

const artifactKindLabels: Record<ArtifactKind, string> = {
  replay_bundle: '回放包',
  incident_report: '事件报告',
  release_attempt_record: '发布尝试记录',
  quality_review_record: '质量评审记录',
  snapshot_bundle: '快照包',
}

const roleLabels: Record<OperatorRole, string> = {
  viewer: '查看者',
  operator: '操作员',
  oncall: '值班',
  admin: '管理员',
}

const modeLabels: Record<DataMode, string> = {
  mock: '模拟数据',
  artifact: '制品数据',
}

export function labelForRouteSegment(segment: string) {
  return routeSegmentLabels[segment] ?? segment
}

export function labelForArtifactKind(kind: ArtifactKind) {
  return artifactKindLabels[kind]
}

export function labelForRole(role: OperatorRole) {
  return roleLabels[role]
}

export function labelForDataMode(mode: DataMode) {
  return modeLabels[mode]
}

export function labelForTheme(theme: ThemeMode) {
  return theme === 'dark' ? '深色' : '浅色'
}

export function labelForSeverity(severity: string) {
  return (
    {
      high: '高',
      medium: '中',
      low: '低',
    }[severity] ?? severity
  )
}

export function labelForWorkflowStatus(status: string) {
  return (
    {
      open: '处理中',
      closed: '已关闭',
      allowed: '通过',
      blocked: '阻断',
      failed: '失败',
      ok: '成功',
      warning: '告警',
    }[status] ?? status
  )
}

export function labelForWriteBackStatus(ok: boolean) {
  return ok ? '回写成功' : '回写失败'
}

export function labelForBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return '暂无'
  }

  return value ? '是' : '否'
}
