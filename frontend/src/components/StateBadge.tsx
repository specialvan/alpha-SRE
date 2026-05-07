interface StateBadgeProps {
  label: string
  tone?: 'neutral' | 'danger' | 'success' | 'warning'
}

export function StateBadge({ label, tone = 'neutral' }: StateBadgeProps) {
  return (
    <span className={`badge badge--${tone}`} data-tone={tone}>
      {label}
    </span>
  )
}
