import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'

describe('detail routes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('navigates through artifact, snapshot, and replay detail routes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /制品/i }))
    await user.click(await screen.findByRole('link', { name: /locked post-state mismatch/i }))

    expect(
      await screen.findByRole('heading', { name: /locked post-state mismatch/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/artifacts\/bundles\/post-state-mismatch\.json/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /复制artifact ref/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Snapshot$/i })).toBeInTheDocument()
    const artifactSnapshotSection = screen.getByRole('heading', { name: /^snapshot$/i }).closest('details')

    expect(artifactSnapshotSection).not.toBeNull()
    await user.click(within(artifactSnapshotSection as HTMLElement).getByRole('heading', { name: /^snapshot$/i }))
    expect(await screen.findByRole('link', { name: /open snapshot detail/i })).toBeInTheDocument()
    expect(
      within(artifactSnapshotSection as HTMLElement).getAllByText(/state-v2/i).length,
    ).toBeGreaterThan(0)

    await user.click(screen.getByRole('link', { name: /^Snapshot$/i }))
    expect(await screen.findByRole('heading', { name: /snapshot s-v2-pre/i })).toBeInTheDocument()
    expect(screen.getAllByText(/state-v2/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /复制snapshot id/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /related replay/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^characters$/i })).toBeInTheDocument()
    expect(screen.getByText(/no relationships data was exported/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /validation center/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /related replay/i }))
    expect(
      await screen.findByRole('heading', { name: /locked post-state mismatch/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/characters\.c1\.current_goal/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /^observation frame$/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /validation findings/i })).toBeInTheDocument()
    expect(screen.getByText(/operator actions require at least operator role/i)).toBeInTheDocument()

    const validationFindingsSection = screen
      .getByRole('heading', { name: /validation findings/i })
      .closest('details')

    expect(validationFindingsSection).not.toBeNull()
    await user.click(
      within(validationFindingsSection as HTMLElement).getAllByRole('link', {
        name: /post_state_mismatch/i,
      })[0],
    )
    expect(await screen.findByRole('heading', { name: /^validation$/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/failure class/i)).toHaveValue('post_state_mismatch')
    expect(screen.getByText(/^2 条结果$/i)).toBeInTheDocument()
  })

  it('navigates through review and incident detail routes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /质量评审/i }))
    await user.click(await screen.findByRole('link', { name: /review-post-state/i }))

    expect(
      await screen.findByRole('heading', { name: /review-post-state/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /复制source artifact reference/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /source artifact/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /review json/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /事件/i }))
    await user.click(await screen.findByRole('link', { name: /inc-post-state/i }))

    expect(await screen.findByRole('heading', { name: /inc-post-state/i })).toBeInTheDocument()
    expect(screen.getByText('2026-05-07T16:20:00Z')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /related replay/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /related release/i })).toBeInTheDocument()
    const incidentSection = screen.getByRole('heading', { name: /inc-post-state/i }).closest('section')

    expect(incidentSection).not.toBeNull()
    expect(
      within(incidentSection as HTMLElement).getByRole('link', { name: /quality reviews/i }),
    ).toBeInTheDocument()
  })
})
