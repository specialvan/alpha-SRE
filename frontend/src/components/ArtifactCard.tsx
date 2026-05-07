import { Link } from 'react-router-dom'

import type { ArtifactDetail } from '../data/types'
import { StateBadge } from './StateBadge'
import { labelForArtifactKind } from '../ui/labels'

export function ArtifactCard({ artifact }: { artifact: ArtifactDetail }) {
  return (
    <article className="surface-card artifact-card">
      <div className="card-topline">
        <StateBadge label={labelForArtifactKind(artifact.kind)} tone="neutral" />
        {artifact.updatedAt ? <small className="muted">{artifact.updatedAt}</small> : null}
      </div>
      <h3 className="card-title">
        <Link className="card-link" to={`/artifacts/${artifact.ref}`}>
          {artifact.title}
        </Link>
      </h3>
      <p className="card-summary">{artifact.description}</p>
      <p className="card-meta">{artifact.ref}</p>
      {artifact.tags.length > 0 ? (
        <div className="pill-row">
          {artifact.tags.map((tag) => (
            <span key={tag} className="pill pill--muted">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}
