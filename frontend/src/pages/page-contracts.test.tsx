import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'

import type { SreDataProvider } from '../data/provider'
import { createMockProvider } from '../data/providers/mock-provider'
import { HttpStatusError } from '../data/errors'
import { mockIndex, mockRawArtifacts } from '../mocks/catalog'
import { ArtifactDetailPage } from './artifacts/ArtifactDetailPage'
import { ArtifactsPage } from './artifacts/ArtifactsPage'
import { ReleaseDetailPage } from './releases/ReleaseDetailPage'
import { ReviewDetailPage } from './reviews/ReviewDetailPage'
import { SnapshotDetailPage } from './snapshots/SnapshotDetailPage'
import { ValidationPage } from './validation/ValidationPage'

let currentProvider: SreDataProvider

vi.mock('../app/providers', async () => {
  const actual = await vi.importActual<typeof import('../app/providers')>('../app/providers')

  return {
    ...actual,
    useSreProvider: () => currentProvider,
  }
})

function renderRoute(path: string, routePath: string, element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderPage(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function createSeededProvider() {
  return createMockProvider({
    index: mockIndex,
    rawArtifacts: mockRawArtifacts,
  })
}

describe('page contracts', () => {
  beforeEach(() => {
    currentProvider = createSeededProvider()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it.each([
    {
      label: 'artifact detail',
      errorMessage: 'artifact bundle missing',
      path: '/artifacts/bundle:post-state-mismatch',
      routePath: '/artifacts/:artifactRef',
      element: <ArtifactDetailPage />,
      override: (provider: SreDataProvider) => ({
        ...provider,
        getArtifact: vi.fn().mockRejectedValue(new HttpStatusError(404, 'artifact bundle missing')),
      }),
    },
    {
      label: 'snapshot detail',
      errorMessage: 'snapshot export missing',
      path: '/snapshots/snapshot:s-v2-pre',
      routePath: '/snapshots/:snapshotRef',
      element: <SnapshotDetailPage />,
      override: (provider: SreDataProvider) => ({
        ...provider,
        getSnapshot: vi.fn().mockRejectedValue(new HttpStatusError(404, 'snapshot export missing')),
      }),
    },
    {
      label: 'review detail',
      errorMessage: 'review artifact missing',
      path: '/quality/reviews/review:review-post-state',
      routePath: '/quality/reviews/:reviewRef',
      element: <ReviewDetailPage />,
      override: (provider: SreDataProvider) => ({
        ...provider,
        getReview: vi.fn().mockRejectedValue(new HttpStatusError(404, 'review artifact missing')),
      }),
    },
    {
      label: 'release detail',
      errorMessage: 'release attempt missing',
      path: '/releases/release:rel-post-state',
      routePath: '/releases/:releaseRef',
      element: <ReleaseDetailPage />,
      override: (provider: SreDataProvider) => ({
        ...provider,
        getReleaseAttempt: vi
          .fn()
          .mockRejectedValue(new HttpStatusError(404, 'release attempt missing')),
      }),
    },
  ])('shows status-aware 404 messaging on $label', async ({ element, errorMessage, override, path, routePath }) => {
    currentProvider = override(createSeededProvider()) as SreDataProvider

    renderRoute(path, routePath, element)

    expect(await screen.findByRole('heading', { name: /resource not found/i })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument()
  })

  it('keeps cached artifact results visible when a refresh fails', async () => {
    const seededProvider = createSeededProvider()
    const user = userEvent.setup()

    currentProvider = {
      ...seededProvider,
      listArtifacts: vi.fn((query) =>
        query.search
          ? Promise.reject(new HttpStatusError(500, 'artifact index timeout'))
          : seededProvider.listArtifacts(query),
      ),
    }

    renderPage(<ArtifactsPage />)

    expect(await screen.findByRole('link', { name: /locked post-state mismatch/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^search$/i), 'x')

    expect(
      await screen.findByRole('heading', { name: /showing cached artifacts/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/artifact index timeout/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /locked post-state mismatch/i })).toBeInTheDocument()
  })

  it('filters validation findings by supported time range', async () => {
    const seededProvider = createSeededProvider()
    const user = userEvent.setup()
    const replayList = await seededProvider.listReplayBundles({ page: 1, pageSize: 2 })
    const latestValidation = await seededProvider.getValidationForReplay('bundle:post-state-mismatch')
    const olderValidation = await seededProvider.getValidationForReplay('bundle:visibility-leak')

    currentProvider = {
      ...seededProvider,
      listReplayBundles: vi.fn().mockResolvedValue({
        ...replayList,
        items: replayList.items.slice(0, 2),
      }),
      getValidationForReplay: vi.fn((ref: string) => {
        if (ref === 'bundle:post-state-mismatch') {
          return Promise.resolve({
            ...latestValidation,
            supportsTimeRange: true,
            findings: latestValidation.findings.map((finding) => ({
              ...finding,
              timestamp: '2026-05-07T16:00:00Z',
            })),
          })
        }

        if (ref === 'bundle:visibility-leak') {
          return Promise.resolve({
            ...olderValidation,
            supportsTimeRange: true,
            findings: olderValidation.findings.map((finding) => ({
              ...finding,
              timestamp: '2026-03-01T00:00:00Z',
            })),
          })
        }

        return seededProvider.getValidationForReplay(ref)
      }),
    }

    renderPage(<ValidationPage />)

    expect(await screen.findByText(/^1 results$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy finding id/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy finding summary/i })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/time range/i), 'all')

    expect(await screen.findByText(/^2 results$/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/time range/i), '24h')

    expect(await screen.findByText(/^1 results$/i)).toBeInTheDocument()
  })
})
