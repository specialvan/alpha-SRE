import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import type { SreDataProvider } from '../data/provider'
import { HttpStatusError } from '../data/errors'
import { createMockProvider } from '../data/providers/mock-provider'
import { mockIndex, mockRawArtifacts } from '../mocks/catalog'
import { useUiStore } from './store'

let mockModeProvider: SreDataProvider
let artifactModeProvider: SreDataProvider

vi.mock('../data/providers/provider-registry', () => ({
  getRuntimeProvider: (mode: 'mock' | 'artifact') =>
    mode === 'artifact' ? artifactModeProvider : mockModeProvider,
}))

function createSeededProvider() {
  return createMockProvider({
    index: mockIndex,
    rawArtifacts: mockRawArtifacts,
  })
}

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear()
    useUiStore.setState({
      theme: 'dark',
      dataMode: 'mock',
      role: 'viewer',
      searchQuery: '',
    })
    mockModeProvider = createSeededProvider()
    artifactModeProvider = createSeededProvider()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders shell navigation and operator controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /alpha-sre 控制台/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /制品/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /回放实验室/i })).toBeInTheDocument()

    const themeButton = screen.getByRole('button', { name: /主题切换/i })
    await user.click(themeButton)

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.getByLabelText(/数据模式/i)).toHaveValue('mock')
    expect(screen.getByLabelText(/角色/i)).toHaveValue('viewer')
    expect(screen.getByLabelText(/全局搜索/i)).toBeInTheDocument()
  })

  it('routes explicit artifact and replay ref searches to the matching detail pages', async () => {
    const user = userEvent.setup()
    render(<App />)

    const search = screen.getByLabelText(/^全局搜索$/i)

    await user.type(search, 'artifact:bundle:post-state-mismatch')
    await user.click(screen.getByRole('button', { name: /^跳转$/i }))

    expect(
      await screen.findByRole('heading', { name: /locked post-state mismatch/i }),
    ).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'replay:bundle:post-state-mismatch')
    await user.click(screen.getByRole('button', { name: /^跳转$/i }))

    expect(
      await screen.findByRole('heading', { name: /locked post-state mismatch/i }),
    ).toBeInTheDocument()
  })

  it('does not reuse mock artifact cache after switching to artifact mode', async () => {
    const seededProvider = createSeededProvider()
    const user = userEvent.setup()

    mockModeProvider = seededProvider
    artifactModeProvider = {
      ...seededProvider,
      listArtifacts: vi.fn().mockRejectedValue(
        new HttpStatusError(500, 'artifact catalog unavailable'),
      ),
    }

    render(<App />)

    await user.click(screen.getByRole('link', { name: /制品/i }))

    expect(
      await screen.findByRole('link', { name: /locked post-state mismatch/i }),
    ).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/数据模式/i), 'artifact')

    expect(await screen.findByText(/artifact catalog unavailable/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /showing cached artifacts/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /locked post-state mismatch/i }),
    ).not.toBeInTheDocument()
  })
})
