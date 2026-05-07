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
        / 共 <strong>{total}</strong> 条
      </div>
      <div className="pagination__buttons">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          上一页
        </button>
        <span>
          第 {page} / {totalPages} 页
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </button>
      </div>
    </footer>
  )
}
