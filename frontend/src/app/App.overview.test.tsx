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

    expect(await screen.findByText(/latest replay/i)).toBeInTheDocument()
    expect(screen.getByText(/recent incidents/i)).toBeInTheDocument()
    expect(screen.getByText(/review samples/i)).toBeInTheDocument()
    expect(screen.getByText(/locked post-state mismatch/i)).toBeInTheDocument()
    const quickEntry = screen.getByRole('heading', { name: /quick entry/i }).closest('section')

    expect(quickEntry).not.toBeNull()
    expect(
      within(quickEntry as HTMLElement).getByRole('link', { name: /quality reviews/i }),
    ).toBeInTheDocument()
  })
})
