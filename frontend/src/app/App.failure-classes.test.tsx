import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App'

describe('failure class coverage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('surfaces the named replay and validation failure classes from the seeded provider', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /回放实验室/i }))
    expect((await screen.findAllByText(/visibility_leak/i)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/belief_conflict/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/capability_violation/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/inactive_rule_use/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/plot_obligation_missed/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('link', { name: /校验中心/i }))
    const failureClassSelect = await screen.findByRole('combobox', {
      name: /failure class/i,
    })
    expect(failureClassSelect).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'post_state_mismatch' })).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'visibility_leak' })).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'belief_conflict' })).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'capability_violation' })).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'inactive_rule_use' })).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'plot_obligation_missed' })).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'policy_drift' })).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'state_drift' })).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'contract_mismatch' })).toBeInTheDocument()
    expect(within(failureClassSelect).getByRole('option', { name: 'mechanism_missing' })).toBeInTheDocument()
  })
})
