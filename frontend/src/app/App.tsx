import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { AppProviders } from './providers'
import { AppShell } from '../components/AppShell'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { OverviewPage } from '../pages/overview/OverviewPage'
import { ArtifactsPage } from '../pages/artifacts/ArtifactsPage'
import { ArtifactDetailPage } from '../pages/artifacts/ArtifactDetailPage'
import { SnapshotListPage } from '../pages/snapshots/SnapshotListPage'
import { SnapshotDetailPage } from '../pages/snapshots/SnapshotDetailPage'
import { ReplayListPage } from '../pages/replay/ReplayListPage'
import { ReplayDetailPage } from '../pages/replay/ReplayDetailPage'
import { ValidationPage } from '../pages/validation/ValidationPage'
import { MetricsPage } from '../pages/metrics/MetricsPage'
import { ReviewsListPage } from '../pages/reviews/ReviewsListPage'
import { ReviewDetailPage } from '../pages/reviews/ReviewDetailPage'
import { IncidentsListPage } from '../pages/incidents/IncidentsListPage'
import { IncidentDetailPage } from '../pages/incidents/IncidentDetailPage'
import { ReleasesListPage } from '../pages/releases/ReleasesListPage'
import { ReleaseDetailPage } from '../pages/releases/ReleaseDetailPage'
import { useUiStore } from './store'

export default function App() {
  const theme = useUiStore((state) => state.theme)
  const dataMode = useUiStore((state) => state.dataMode)
  const role = useUiStore((state) => state.role)
  const searchQuery = useUiStore((state) => state.searchQuery)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const setDataMode = useUiStore((state) => state.setDataMode)
  const setRole = useUiStore((state) => state.setRole)
  const setSearchQuery = useUiStore((state) => state.setSearchQuery)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <AppProviders>
      <BrowserRouter>
        <AppShell
          theme={theme}
          dataMode={dataMode}
          role={role}
          searchQuery={searchQuery}
          onToggleTheme={toggleTheme}
          onDataModeChange={setDataMode}
          onRoleChange={setRole}
          onSearchChange={setSearchQuery}
        >
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/artifacts" element={<ArtifactsPage />} />
              <Route path="/artifacts/:artifactRef" element={<ArtifactDetailPage />} />
              <Route path="/snapshots" element={<SnapshotListPage />} />
              <Route path="/snapshots/:snapshotRef" element={<SnapshotDetailPage />} />
              <Route path="/replay" element={<ReplayListPage />} />
              <Route path="/replay/:replayRef" element={<ReplayDetailPage />} />
              <Route path="/validation" element={<ValidationPage />} />
              <Route path="/metrics" element={<MetricsPage />} />
              <Route
                path="/quality/reviews"
                element={<ReviewsListPage />}
              />
              <Route
                path="/quality/reviews/:reviewRef"
                element={<ReviewDetailPage />}
              />
              <Route path="/incidents" element={<IncidentsListPage />} />
              <Route path="/incidents/:incidentRef" element={<IncidentDetailPage />} />
              <Route path="/releases" element={<ReleasesListPage />} />
              <Route path="/releases/:releaseRef" element={<ReleaseDetailPage />} />
            </Routes>
          </ErrorBoundary>
        </AppShell>
      </BrowserRouter>
    </AppProviders>
  )
}
