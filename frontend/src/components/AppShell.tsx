import { type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { Breadcrumbs } from './Breadcrumbs'
import { ModeSwitcher } from './ModeSwitcher'
import { SidebarNav } from './SidebarNav'
import type { DataMode } from '../data/types'
import type { OperatorRole, ThemeMode } from '../app/store'

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
          <p className="eyebrow">Narrative Reliability</p>
          <h1>alpha-SRE</h1>
          <p className="muted">
            Artifact-first console for replay, validation, and release evidence.
          </p>
        </div>
        <SidebarNav />
      </aside>
      <main className="shell-main">
        <header className="shell-header">
          <div>
            <p className="eyebrow">Standalone narrative reliability console</p>
            <h2>alpha-SRE Control Plane</h2>
          </div>
          <div className="shell-controls">
            <label className="control-group">
              <span>Data mode</span>
              <select
                aria-label="Data mode"
                value={dataMode}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onDataModeChange(event.target.value as DataMode)
                }
              >
                <option value="mock">mock</option>
                <option value="artifact">artifact</option>
              </select>
            </label>
            <label className="control-group">
              <span>Role</span>
              <select
                aria-label="Role"
                value={role}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onRoleChange(event.target.value as OperatorRole)
                }
              >
                <option value="viewer">viewer</option>
                <option value="operator">operator</option>
                <option value="oncall">oncall</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <div className="search-form">
              <label className="control-group control-group--grow">
                <span>Global search</span>
                <input
                  aria-label="Global search"
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
                Go
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
