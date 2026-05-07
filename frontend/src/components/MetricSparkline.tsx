import type { MetricSeries } from '../data/types'

export function MetricSparkline({ series }: { series: MetricSeries }) {
  return (
    <article className="surface-card sparkline-card">
      <strong>{series.label}</strong>
      <p className="card-summary">{series.points.join(' / ')}</p>
    </article>
  )
}
