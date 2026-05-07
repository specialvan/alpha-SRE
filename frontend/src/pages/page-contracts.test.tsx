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

    expect(await screen.findByRole('heading', { name: /资源未找到/i })).toBeInTheDocument()
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

    await user.type(screen.getByLabelText(/^搜索$/i), 'x')

    expect(
      await screen.findByRole('heading', { name: /正在显示缓存的制品列表/i }),
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
      listReplayBundles: vi.fn(async ({ page = 1, pageSize = 50 }) => ({
        ...replayList,
        items: page === 1 ? replayList.items.slice(0, 2) : [],
        total: 2,
        page,
        pageSize,
      })),
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

    expect(await screen.findByText(/^2 条结果$/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /复制finding id/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /复制finding summary/i })).toHaveLength(2)

    await user.selectOptions(screen.getByLabelText(/time range/i), 'all')

    expect(await screen.findByText(/^4 条结果$/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/time range/i), '24h')

    expect(await screen.findByText(/^2 条结果$/i)).toBeInTheDocument()
  })

  it('does not truncate validation findings when replay count exceeds the first page', async () => {
    const seededProvider = createSeededProvider()
    const firstReplay = await seededProvider.getReplayBundle('bundle:post-state-mismatch')
    const baseValidation = await seededProvider.getValidationForReplay(
      'bundle:post-state-mismatch',
    )
    const replayRefs = Array.from({ length: 51 }, (_, index) => `bundle:validation-${index + 1}`)
    const replayItems = replayRefs.map((ref, index) => ({
      ...firstReplay,
      ref,
      artifactRef: ref,
      title: `Replay bundle ${index + 1}`,
      commandId: `cmd-validation-${index + 1}`,
      links: {
        ...firstReplay.links,
        artifactRef: ref,
        replayRef: ref,
        validationRef: `validation:${ref}`,
      },
    }))
    const listReplayBundlesMock = vi.fn(async ({ page = 1, pageSize = 20 }) => {
      const start = (page - 1) * pageSize
      const items = replayItems.slice(start, start + pageSize)

      return {
        items,
        total: replayItems.length,
        page,
        pageSize,
        capabilities: {
          timeRange: true,
          status: true,
          replayOperatorId: true,
        },
      }
    })
    const getValidationForReplayMock = vi.fn(async (ref: string) => ({
      ...baseValidation,
      replayRef: ref,
      findings: [
        {
          ...baseValidation.findings[0],
          id: `finding:${ref}`,
          replayRef: ref,
          subjectId: ref,
          links: {
            ...baseValidation.findings[0].links,
            replayRef: ref,
          },
        },
      ],
      links: {
        ...baseValidation.links,
        replayRef: ref,
      },
      regressionTests: [`replay_regression::${ref}`],
    }))

    currentProvider = {
      ...seededProvider,
      listReplayBundles: listReplayBundlesMock,
      getValidationForReplay: getValidationForReplayMock,
    } as SreDataProvider

    renderPage(<ValidationPage />)

    expect(await screen.findByText(/^51 条结果$/i)).toBeInTheDocument()
    expect(listReplayBundlesMock).toHaveBeenCalledTimes(2)
    expect(getValidationForReplayMock).toHaveBeenCalledTimes(51)
  })

  it('labels artifact metrics preview as a global aggregate surface', async () => {
    renderRoute(
      '/artifacts/bundle:post-state-mismatch',
      '/artifacts/:artifactRef',
      <ArtifactDetailPage />,
    )

    expect(await screen.findByText(/global aggregate metrics/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /open global metrics & gate/i }),
    ).toBeInTheDocument()
  })
})
