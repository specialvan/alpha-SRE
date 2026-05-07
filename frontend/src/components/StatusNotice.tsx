export function StatusNotice({
  title,
  description,
  tone = 'warning',
}: {
  title: string
  description?: string
  tone?: 'info' | 'warning' | 'danger'
}) {
  return (
    <section
      className={`surface-card status-notice status-notice--${tone}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <h3>{title}</h3>
      {description ? <p className="muted">{description}</p> : null}
    </section>
  )
}
