import { useRef } from 'react'

import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualizedList<T>({
  items,
  estimateSize = 72,
  renderItem,
}: {
  items: T[]
  estimateSize?: number
  renderItem: (item: T, index: number) => React.ReactNode
}) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 4,
  })

  if (items.length <= 20) {
    return (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {items.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      style={{ maxHeight: '22rem', overflow: 'auto', position: 'relative' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
          width: '100%',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
