import { type ChangeEvent, type ReactNode } from 'react'

import type { SortDirection } from '../data/types'

export interface FilterOption {
  value: string
  label: string
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search by ref, id, or summary',
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
          <span>Search</span>
          <input
            aria-label="Search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onSearchChange(event.target.value)
            }
          />
        </label>
        {sortOptions.length > 0 && sortBy && onSortByChange ? (
          <label className="toolbar__field">
            <span>Sort by</span>
            <select
              aria-label="Sort by"
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
            <span>Direction</span>
            <select
              aria-label="Sort direction"
              value={sortDirection}
              onChange={(event) =>
                onSortDirectionChange(event.target.value as SortDirection)
              }
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        ) : null}
        {typeof pageSize === 'number' && onPageSizeChange ? (
          <label className="toolbar__field">
            <span>Page size</span>
            <select
              aria-label="Page size"
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
        {typeof total === 'number' ? <strong>{total} results</strong> : <span />}{' '}
        {capabilities.length > 0 ? (
          <div className="pill-row" aria-label="List capabilities">
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
