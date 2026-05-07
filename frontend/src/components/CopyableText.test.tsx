import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CopyableText } from './CopyableText'

describe('CopyableText', () => {
  const writeText = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    writeText.mockClear()
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    })
  })

  it('copies the provided value with an accessible control label', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    })

    render(<CopyableText text="bundle:post-state-mismatch" label="Replay ref" />)

    await user.click(screen.getByRole('button', { name: /copy replay ref/i }))

    expect(writeText).toHaveBeenCalledWith('bundle:post-state-mismatch')
    expect(screen.getByText('bundle:post-state-mismatch')).toBeInTheDocument()
  })
})
