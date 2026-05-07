interface KpiCardProps {
  label: string
  value: string
  tone?: 'neutral' | 'danger' | 'success' | 'warning'
}

export function KpiCard({ label, value, tone = 'neutral' }: KpiCardProps) {
  return (
    <article className={`surface-card kpi-card kpi-card--${tone}`} data-tone={tone}>
      <p className="eyebrow">{label}</p>
      <strong className="kpi-card__value">{value}</strong>
    </article>
  )
}
