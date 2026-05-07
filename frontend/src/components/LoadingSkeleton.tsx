export function LoadingSkeleton({ label }: { label: string }) {
  return (
    <section className="surface-card loading-skeleton" aria-busy="true">
      <p className="eyebrow">{label}</p>
      <div className="loading-skeleton__bar" />
      <div className="loading-skeleton__bar loading-skeleton__bar--short" />
    </section>
  )
}
