import { type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { Breadcrumbs } from './Breadcrumbs'
import { ModeSwitcher } from './ModeSwitcher'
import { SidebarNav } from './SidebarNav'
import type { DataMode } from '../data/types'
import type { OperatorRole, ThemeMode } from '../app/store'
import { labelForDataMode, labelForRole } from '../ui/labels'

interface AppShellProps {
  children: ReactNode
  theme: ThemeMode
  dataMode: DataMode
  role: OperatorRole
  searchQuery: string
  onToggleTheme: () => void
  onDataModeChange: (mode: DataMode) => void
  onRoleChange: (role: OperatorRole) => void
  onSearchChange: (query: string) => void
}

export function AppShell({
  children,
  theme,
  dataMode,
  role,
  searchQuery,
  onToggleTheme,
  onDataModeChange,
  onRoleChange,
  onSearchChange,
}: AppShellProps) {
  const navigate = useNavigate()

  const submitSearch = () => {
    const normalized = searchQuery.trim()
    if (!normalized) {
      return
    }

    if (normalized.startsWith('artifact:')) {
      const artifactRef = normalized.slice('artifact:'.length)
      if (artifactRef) {
        navigate(`/artifacts/${artifactRef}`)
        return
      }
    }

    if (normalized.startsWith('snapshot:')) {
      navigate(`/snapshots/${normalized}`)
      return
    }
    if (normalized.startsWith('replay:')) {
      const replayRef = normalized.slice('replay:'.length)
      if (replayRef) {
        navigate(`/replay/${replayRef}`)
        return
      }
    }
    if (normalized.startsWith('bundle:')) {
      navigate(`/replay/${normalized}`)
      return
    }
    if (normalized.startsWith('incident:')) {
      navigate(`/incidents/${normalized}`)
      return
    }
    if (normalized.startsWith('review:')) {
      navigate(`/quality/reviews/${normalized}`)
      return
    }
    if (normalized.startsWith('release:')) {
      navigate(`/releases/${normalized}`)
      return
    }

    navigate('/artifacts')
  }

  return (
    <div className="app-shell">
      <aside className="shell-sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">叙事可靠性</p>
          <h1>alpha-SRE</h1>
          <p className="muted">
            面向制品优先的控制台，用于查看回放、校验和发布证据链。
          </p>
        </div>
        <SidebarNav />
      </aside>
      <main className="shell-main">
        <header className="shell-header">
          <div>
            <p className="eyebrow">独立叙事可靠性控制台</p>
            <h2>alpha-SRE 控制台</h2>
          </div>
          <div className="shell-controls">
            <label className="control-group">
              <span>数据模式</span>
              <select
                aria-label="数据模式"
                value={dataMode}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onDataModeChange(event.target.value as DataMode)
                }
              >
                <option value="mock">{labelForDataMode('mock')}</option>
                <option value="artifact">{labelForDataMode('artifact')}</option>
              </select>
            </label>
            <label className="control-group">
              <span>角色</span>
              <select
                aria-label="角色"
                value={role}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onRoleChange(event.target.value as OperatorRole)
                }
              >
                <option value="viewer">{labelForRole('viewer')}</option>
                <option value="operator">{labelForRole('operator')}</option>
                <option value="oncall">{labelForRole('oncall')}</option>
                <option value="admin">{labelForRole('admin')}</option>
              </select>
            </label>
            <div className="search-form">
              <label className="control-group control-group--grow">
                <span>全局搜索</span>
                <input
                  aria-label="全局搜索"
                  placeholder="artifact:... / replay:... / snapshot:..."
                  value={searchQuery}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onSearchChange(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      submitSearch()
                    }
                  }}
                />
              </label>
              <button type="button" onClick={submitSearch}>
                跳转
              </button>
            </div>
            <ModeSwitcher theme={theme} onToggle={onToggleTheme} />
          </div>
        </header>
        <Breadcrumbs />
        <div className="page-container">{children}</div>
      </main>
    </div>
  )
}
