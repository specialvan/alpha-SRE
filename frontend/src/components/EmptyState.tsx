export function EmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <section className="surface-card empty-state">
      <h3>{title}</h3>
      {description ? <p className="muted">{description}</p> : null}
    </section>
  )
}
