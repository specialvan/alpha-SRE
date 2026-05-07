import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App'

describe('overview route', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'dark'
  })

  it('shows overview KPI cards and recent activity from the active provider', async () => {
    render(<App />)

    expect(await screen.findByText(/最近一次回放/i)).toBeInTheDocument()
    expect(screen.getByText(/近期事件数/i)).toBeInTheDocument()
    expect(screen.getByText(/评审样本数/i)).toBeInTheDocument()
    expect(screen.getByText(/locked post-state mismatch/i)).toBeInTheDocument()
    const quickEntry = screen.getByRole('heading', { name: /快捷入口/i }).closest('section')

    expect(quickEntry).not.toBeNull()
    expect(
      within(quickEntry as HTMLElement).getByRole('link', { name: /质量评审/i }),
    ).toBeInTheDocument()
  })
})
