import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'

describe('release routes', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    cleanup()
  })

  it('supports release list filtering with explicit status controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /发布/i }))

    expect(await screen.findByRole('heading', { name: /releases/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /release status/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /每页数量/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^搜索$/i), 'missing-release')

    await waitFor(() => {
      expect(screen.getByText(/no release attempts match the current query/i)).toBeInTheDocument()
    })
  })

  it('shows release detail metadata and linked evidence routes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /发布/i }))
    await user.click(await screen.findByRole('link', { name: /rel-post-state/i }))

    expect(
      await screen.findByRole('heading', { name: /rel-post-state/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /复制triggering command id/i })).toBeInTheDocument()
    expect(screen.getByText(/2026-05-07T16:25:00Z/i)).toBeInTheDocument()
    expect(screen.getByText(/^blocked$/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /locked snapshot/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /gate result/i })).toHaveAttribute(
      'href',
      '/metrics?gateRef=gate%3Abundle%3Apost-state-mismatch',
    )
    expect(screen.getByRole('link', { name: /drift evidence/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /linked incident/i })).toBeInTheDocument()
  })

  it('uses an explicit gateRef query to show the requested gate evidence', async () => {
    window.history.pushState({}, '', '/metrics?gateRef=gate%3Abundle%3Avisibility-leak')

    render(<App />)

    expect(await screen.findByRole('heading', { name: /gate status/i })).toBeInTheDocument()
    expect(
      screen.getAllByText(/pov visibility leak requires investigation before publication/i),
    ).toHaveLength(2)
  })
})
