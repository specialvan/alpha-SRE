import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'

describe('App shell', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders shell navigation and operator controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /alpha-sre control plane/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /artifacts/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /replay lab/i })).toBeInTheDocument()

    const themeButton = screen.getByRole('button', { name: /theme/i })
    await user.click(themeButton)

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.getByLabelText(/data mode/i)).toHaveValue('mock')
    expect(screen.getByLabelText(/role/i)).toHaveValue('viewer')
    expect(screen.getByLabelText(/global search/i)).toBeInTheDocument()
  })

  it('routes explicit artifact and replay ref searches to the matching detail pages', async () => {
    const user = userEvent.setup()
    render(<App />)

    const search = screen.getByLabelText(/^global search$/i)

    await user.type(search, 'artifact:bundle:post-state-mismatch')
    await user.click(screen.getByRole('button', { name: /^go$/i }))

    expect(
      await screen.findByRole('heading', { name: /locked post-state mismatch/i }),
    ).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'replay:bundle:post-state-mismatch')
    await user.click(screen.getByRole('button', { name: /^go$/i }))

    expect(
      await screen.findByRole('heading', { name: /replay bundle: post-state mismatch/i }),
    ).toBeInTheDocument()
  })
})
