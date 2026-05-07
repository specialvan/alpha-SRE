import { type ChangeEvent, type ReactNode } from 'react'

import type { SortDirection } from '../data/types'

export interface FilterOption {
  value: string
  label: string
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = '按 ref、id 或摘要搜索',
  sortBy,
  onSortByChange,
  sortOptions = [],
  sortDirection,
  onSortDirectionChange,
  pageSize,
  onPageSizeChange,
  total,
  capabilities = [],
  children,
}: {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  sortBy?: string
  onSortByChange?: (value: string) => void
  sortOptions?: FilterOption[]
  sortDirection?: SortDirection
  onSortDirectionChange?: (value: SortDirection) => void
  pageSize?: number
  onPageSizeChange?: (value: number) => void
  total?: number
  capabilities?: string[]
  children?: ReactNode
}) {
  return (
    <section className="toolbar">
      <div className="toolbar__row">
        <label className="toolbar__field toolbar__field--grow">
          <span>搜索</span>
          <input
            aria-label="搜索"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onSearchChange(event.target.value)
            }
          />
        </label>
        {sortOptions.length > 0 && sortBy && onSortByChange ? (
          <label className="toolbar__field">
            <span>排序字段</span>
            <select
              aria-label="排序字段"
              value={sortBy}
              onChange={(event) => onSortByChange(event.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {sortDirection && onSortDirectionChange ? (
          <label className="toolbar__field">
            <span>排序方向</span>
            <select
              aria-label="排序方向"
              value={sortDirection}
              onChange={(event) =>
                onSortDirectionChange(event.target.value as SortDirection)
              }
            >
              <option value="desc">最新优先</option>
              <option value="asc">最早优先</option>
            </select>
          </label>
        ) : null}
        {typeof pageSize === 'number' && onPageSizeChange ? (
          <label className="toolbar__field">
            <span>每页数量</span>
            <select
              aria-label="每页数量"
              value={String(pageSize)}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {children ? <div className="toolbar__row">{children}</div> : null}
      <div className="toolbar__meta">
        {typeof total === 'number' ? <strong>{total} 条结果</strong> : <span />}{' '}
        {capabilities.length > 0 ? (
          <div className="pill-row" aria-label="列表能力">
            {capabilities.map((capability) => (
              <span key={capability} className="pill">
                {capability}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
