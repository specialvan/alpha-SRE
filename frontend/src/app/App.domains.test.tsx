import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App'

describe('core domain routes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('navigates across artifact, replay, validation, metrics, review, incident, and release pages', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /制品/i }))
    expect(await screen.findByText(/locked post-state mismatch/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /快照/i }))
    expect(await screen.findByText(/snapshot s-v2-pre/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /回放实验室/i }))
    expect(await screen.findByText(/locked post-state mismatch/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /校验中心/i }))
    expect(
      await screen.findByRole('heading', {
        name: /recommended regression tests/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/cmd-v2 .* characters\.c1\.current_goal/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('link', { name: /gate/i }))
    expect(
      await screen.findByRole('heading', { name: /gate status/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/^blocked$/i)).toBeInTheDocument()

    const gateSection = screen.getByRole('heading', { name: /gate status/i }).closest('section')

    expect(gateSection).not.toBeNull()
    await user.click(
      within(gateSection as HTMLElement).getByRole('link', { name: /quality reviews/i }),
    )
    expect(await screen.findByText(/review-post-state/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /事件/i }))
    expect(await screen.findByText(/inc-post-state/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /发布/i }))
    expect(await screen.findByText(/rel-post-state/i)).toBeInTheDocument()
  })
})
