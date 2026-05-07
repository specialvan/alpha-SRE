import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { CopyableText } from '../../components/CopyableText'
import { EmptyState } from '../../components/EmptyState'
import { JsonTreeViewer } from '../../components/JsonTreeViewer'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { SectionAccordion } from '../../components/SectionAccordion'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { describeDataError } from '../../data/errors'
import type { JsonValue } from '../../data/types'

const snapshotSections = [
  { key: 'characters', label: 'Characters' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'memories', label: 'Memories' },
  { key: 'constraints', label: 'Constraints' },
  { key: 'world_rules', label: 'World Rules' },
  { key: 'chapter_intents', label: 'Chapter Intents' },
  { key: 'facts', label: 'Facts' },
  { key: 'beliefs', label: 'Beliefs' },
  { key: 'plot_threads', label: 'Plot Threads' },
  { key: 'capabilities', label: 'Capabilities' },
  { key: 'visibility_edges', label: 'Visibility Edges' },
] as const

export function SnapshotDetailPage() {
  const provider = useSreProvider()
  const params = useParams()
  const ref = decodeURIComponent(params.snapshotRef ?? '')
  const snapshot = useQuery({
    queryKey: ['snapshot', ref],
    queryFn: () => provider.getSnapshot(ref),
    enabled: Boolean(ref),
  })
  const errorState = snapshot.isError
    ? describeDataError(snapshot.error, 'Snapshot detail unavailable.')
    : null

  if (snapshot.isLoading && !snapshot.data) {
    return <LoadingSkeleton label="Loading snapshot detail..." />
  }

  if (snapshot.isError && !snapshot.data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Snapshot detail unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!snapshot.data) {
    return (
      <EmptyState
        title="Snapshot detail unavailable."
        description="No snapshot payload was returned."
      />
    )
  }

  const rawRecord =
    snapshot.data.raw && typeof snapshot.data.raw === 'object' && !Array.isArray(snapshot.data.raw)
      ? (snapshot.data.raw as Record<string, JsonValue>)
      : null

  const validationHref = snapshot.data.links.replayRef
    ? `/validation?replayRef=${encodeURIComponent(snapshot.data.links.replayRef)}`
    : '/validation'

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Snapshot Detail</p>
          <h2>{snapshot.data.title}</h2>
          <p>{snapshot.data.summary}</p>
        </div>
      </header>
      {snapshot.isError && snapshot.data ? (
        <StatusNotice
          title="Showing cached snapshot detail."
          description={errorState?.description}
          tone="warning"
        />
      ) : null}
      <section className="surface-card">
        <dl className="meta-grid">
          <div>
            <dt>Snapshot id</dt>
            <dd>
              <CopyableText text={snapshot.data.snapshotId} label="snapshot id" />
            </dd>
          </div>
          <div>
            <dt>State identity</dt>
            <dd>
              <CopyableText text={snapshot.data.stateIdentity} label="state identity" />
            </dd>
          </div>
          <div>
            <dt>Schema</dt>
            <dd>{snapshot.data.schemaVersion}</dd>
          </div>
          <div>
            <dt>Policy</dt>
            <dd>{snapshot.data.policyVersion}</dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>{snapshot.data.visibilityVersion}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{snapshot.data.createdAt}</dd>
          </div>
        </dl>
        <div className="link-row">
          {snapshot.data.links.artifactRef ? (
            <Link className="card-link" to={`/artifacts/${snapshot.data.links.artifactRef}`}>
              Source Artifact
            </Link>
          ) : null}
          {snapshot.data.links.replayRef ? (
            <Link className="card-link" to={`/replay/${snapshot.data.links.replayRef}`}>
              Related Replay
            </Link>
          ) : null}
          <Link className="card-link" to={validationHref}>
            Validation Center
          </Link>
          {snapshot.data.links.incidentRef ? (
            <Link className="card-link" to={`/incidents/${snapshot.data.links.incidentRef}`}>
              Incident
            </Link>
          ) : null}
        </div>
      </section>
      {snapshotSections.map((section) => {
        const value = rawRecord?.[section.key]

        return (
          <SectionAccordion key={section.key} title={section.label}>
            {value !== undefined ? (
              <JsonTreeViewer value={value} label={`${section.label} JSON`} />
            ) : (
              <p className="muted">{`No ${section.label.toLowerCase()} data was exported.`}</p>
            )}
          </SectionAccordion>
        )
      })}
      <JsonTreeViewer value={snapshot.data.raw} label="Snapshot JSON" />
    </section>
  )
}
