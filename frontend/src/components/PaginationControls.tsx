interface PaginationControlsProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = total === 0 ? 0 : Math.min(total, page * pageSize)

  return (
    <footer className="pagination">
      <div className="pagination__summary">
        <strong>
          {start}-{end}
        </strong>{' '}
        of <strong>{total}</strong> items
      </div>
      <div className="pagination__buttons">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </footer>
  )
}
