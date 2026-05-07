import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { VirtualizedList } from './VirtualizedList'

describe('VirtualizedList', () => {
  it('renders short lists directly so items stay visible without layout measurement', () => {
    render(
      <VirtualizedList
        items={['finding-a', 'finding-b']}
        renderItem={(item) => <article>{item}</article>}
      />,
    )

    expect(screen.getByText('finding-a')).toBeInTheDocument()
    expect(screen.getByText('finding-b')).toBeInTheDocument()
  })

  it('does not mount every row when rendering a long list', () => {
    const items = Array.from({ length: 10000 }, (_, index) => `finding-${index}`)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(352)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(960)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      width: 960,
      height: 352,
      top: 0,
      left: 0,
      right: 960,
      bottom: 352,
      x: 0,
      y: 0,
      toJSON() {
        return {}
      },
    }))
    const { container } = render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <article>{item}</article>}
      />,
    )

    const renderedRows = container.querySelectorAll('article')
    const scrollRegion = container.querySelector('div[style*="overflow: auto"]')
    const totalSizeRegion = container.querySelector('div[style*="height: 720000px"]')

    expect(renderedRows.length).toBeLessThan(100)
    expect(scrollRegion).not.toBeNull()
    expect(totalSizeRegion).not.toBeNull()
    expect(screen.queryByText('finding-9999')).not.toBeInTheDocument()
  })
})
