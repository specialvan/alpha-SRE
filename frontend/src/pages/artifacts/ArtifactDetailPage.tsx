import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { CopyableText } from '../../components/CopyableText'
import { EmptyState } from '../../components/EmptyState'
import { IssueList } from '../../components/IssueList'
import { JsonTreeViewer } from '../../components/JsonTreeViewer'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { SectionAccordion } from '../../components/SectionAccordion'
import { StateBadge } from '../../components/StateBadge'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'

export function ArtifactDetailPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const params = useParams()
  const ref = decodeURIComponent(params.artifactRef ?? '')
  const artifact = useQuery({
    queryKey: [dataMode, 'artifact', ref],
    queryFn: () => provider.getArtifact(ref),
    enabled: Boolean(ref),
  })
  const errorState = artifact.isError
    ? describeDataError(artifact.error, 'Artifact detail unavailable.')
    : null
  const [snapshotSection, replaySection, validationSection, metricsSection, gateSection] = useQueries(
    {
      queries: [
        {
          queryKey: [dataMode, 'artifact-section', 'snapshot', artifact.data?.links.snapshotRef],
          queryFn: () => provider.getSnapshot(artifact.data!.links.snapshotRef!),
          enabled: Boolean(artifact.data?.links.snapshotRef),
        },
        {
          queryKey: [dataMode, 'artifact-section', 'replay', artifact.data?.links.replayRef],
          queryFn: () => provider.getReplayBundle(artifact.data!.links.replayRef!),
          enabled: Boolean(artifact.data?.links.replayRef),
        },
        {
          queryKey: [dataMode, 'artifact-section', 'validation', artifact.data?.links.replayRef],
          queryFn: () => provider.getValidationForReplay(artifact.data!.links.replayRef!),
          enabled: Boolean(artifact.data?.links.replayRef),
        },
        {
          queryKey: [dataMode, 'artifact-section', 'metrics', artifact.data?.ref],
          queryFn: () => provider.getMetrics({ timeRange: '7d' }),
          enabled: Boolean(artifact.data?.sections.some((section) => section.key === 'metrics')),
        },
        {
          queryKey: [dataMode, 'artifact-section', 'gate', artifact.data?.links.gateRef],
          queryFn: () => provider.getGateResult(artifact.data!.links.gateRef!),
          enabled: Boolean(artifact.data?.links.gateRef),
        },
      ],
    },
  )

  if (artifact.isLoading && !artifact.data) {
    return <LoadingSkeleton label="Loading artifact detail..." />
  }

  if (artifact.isError && !artifact.data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Artifact detail unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!artifact.data) {
    return (
      <EmptyState
        title="Artifact detail unavailable."
        description="No artifact payload was returned."
      />
    )
  }

  const artifactData = artifact.data
  const validationHref = artifactData.links.replayRef
    ? `/validation?replayRef=${encodeURIComponent(artifactData.links.replayRef)}`
    : '/validation'

  function renderSectionContent(sectionKey: string) {
    if (sectionKey === 'snapshot') {
      if (snapshotSection.isLoading && !snapshotSection.data) {
        return <p className="muted">Loading snapshot preview...</p>
      }
      if (snapshotSection.isError) {
        return (
          <StatusNotice
            title="Snapshot preview unavailable."
            description={describeDataError(snapshotSection.error, 'Snapshot preview unavailable.')
              ?.description}
            tone="warning"
          />
        )
      }
      if (!snapshotSection.data) {
        return <p className="muted">No snapshot preview is available for this artifact.</p>
      }

      return (
        <>
          <p className="card-summary">{snapshotSection.data.summary}</p>
          <dl className="meta-grid">
            <div>
              <dt>Snapshot id</dt>
              <dd>{snapshotSection.data.snapshotId}</dd>
            </div>
            <div>
              <dt>State identity</dt>
              <dd>{snapshotSection.data.stateIdentity}</dd>
            </div>
          </dl>
          <div className="link-row">
            <Link className="card-link" to={`/snapshots/${snapshotSection.data.ref}`}>
              Open Snapshot Detail
            </Link>
          </div>
        </>
      )
    }

    if (sectionKey === 'replay') {
      if (replaySection.isLoading && !replaySection.data) {
        return <p className="muted">Loading replay preview...</p>
      }
      if (replaySection.isError) {
        return (
          <StatusNotice
            title="Replay preview unavailable."
            description={describeDataError(replaySection.error, 'Replay preview unavailable.')
              ?.description}
            tone="warning"
          />
        )
      }
      if (!replaySection.data) {
        return <p className="muted">No replay preview is available for this artifact.</p>
      }

      return (
        <>
          <div className="card-topline">
            <StateBadge
              label={replaySection.data.failureClassification ?? replaySection.data.status}
              tone={replaySection.data.status === 'failed' ? 'danger' : 'success'}
            />
            <span className="muted">{replaySection.data.eventCount} events</span>
          </div>
          <p className="card-summary">{replaySection.data.summary}</p>
          <IssueList
            items={replaySection.data.postStatePaths.map((path) => ({
              id: path,
              title: path,
            }))}
            emptyMessage="No post-state paths were exported."
          />
          <div className="link-row">
            <Link className="card-link" to={`/replay/${replaySection.data.ref}`}>
              Open Replay Detail
            </Link>
          </div>
        </>
      )
    }

    if (sectionKey === 'validation') {
      if (validationSection.isLoading && !validationSection.data) {
        return <p className="muted">Loading validation preview...</p>
      }
      if (validationSection.isError) {
        return (
          <StatusNotice
            title="Validation preview unavailable."
            description={
              describeDataError(validationSection.error, 'Validation preview unavailable.')
                ?.description
            }
            tone="warning"
          />
        )
      }
      if (!validationSection.data) {
        return <p className="muted">No validation findings were exported for this artifact.</p>
      }

      return (
        <>
          <IssueList
            items={validationSection.data.findings.map((finding) => ({
              id: finding.id,
              title: finding.failureClass,
              description: `${finding.subjectId} -> ${finding.affectedField}`,
              href: `${validationHref}&failureClass=${encodeURIComponent(finding.failureClass)}`,
            }))}
            emptyMessage="No validation findings were exported for this artifact."
          />
          <div className="link-row">
            <Link className="card-link" to={validationHref}>
              Open Validation Detail
            </Link>
          </div>
        </>
      )
    }

    if (sectionKey === 'metrics') {
      if (metricsSection.isLoading && !metricsSection.data) {
        return <p className="muted">Loading metrics preview...</p>
      }
      if (metricsSection.isError) {
        return (
          <StatusNotice
            title="Metrics preview unavailable."
            description={describeDataError(metricsSection.error, 'Metrics preview unavailable.')
              ?.description}
            tone="warning"
          />
        )
      }
      if (!metricsSection.data) {
        return <p className="muted">No metrics preview is available for this artifact.</p>
      }

      return (
        <>
          <p className="card-summary">
            This preview comes from global aggregate metrics. Replay-local metrics remain
            available in the artifact JSON.
          </p>
          <ul className="stat-list">
            {Object.entries(metricsSection.data.summary)
              .slice(0, 6)
              .map(([key, value]) => (
                <li key={key}>
                  {key}: {String(value)}
                </li>
              ))}
          </ul>
          <div className="link-row">
            <Link className="card-link" to="/metrics">
              Open Global Metrics & Gate
            </Link>
          </div>
        </>
      )
    }

    if (sectionKey === 'gate') {
      if (gateSection.isLoading && !gateSection.data) {
        return <p className="muted">Loading gate preview...</p>
      }
      if (gateSection.isError) {
        return (
          <StatusNotice
            title="Gate preview unavailable."
            description={describeDataError(gateSection.error, 'Gate preview unavailable.')
              ?.description}
            tone="warning"
          />
        )
      }
      if (!gateSection.data) {
        return <p className="muted">No gate preview is available for this artifact.</p>
      }

      return (
        <>
          <div className="card-topline">
            <StateBadge
              label={gateSection.data.allowed ? 'allowed' : 'blocked'}
              tone={gateSection.data.allowed ? 'success' : 'danger'}
            />
          </div>
          <p className="card-summary">{gateSection.data.explanation}</p>
          <IssueList
            items={gateSection.data.blockingIssues.map((issue) => ({
              id: issue,
              title: issue,
              href: artifactData.links.replayRef
                ? `/replay/${artifactData.links.replayRef}`
                : undefined,
            }))}
            emptyMessage="No gate blocking issues."
          />
          <div className="link-row">
            <Link className="card-link" to="/metrics">
              Open Gate Detail
            </Link>
          </div>
        </>
      )
    }

    return <p className="card-summary">No derived preview is available for this section.</p>
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Artifact Detail</p>
          <h2>{artifactData.title}</h2>
          <p>{artifactData.description}</p>
        </div>
        <StateBadge label={artifactData.kind} />
      </header>
      {artifact.isError && artifactData ? (
        <StatusNotice
          title="Showing cached artifact detail."
          description={errorState?.description}
          tone="warning"
        />
      ) : null}
      <section className="surface-card">
        <dl className="meta-grid">
          <div>
            <dt>Reference</dt>
            <dd>
              <CopyableText text={artifactData.ref} label="artifact ref" />
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{artifactData.updatedAt ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>Artifact path</dt>
            <dd>
              <CopyableText text={artifactData.path} label="artifact path" as="code" />
            </dd>
          </div>
          <div>
            <dt>Derived sections</dt>
            <dd>{artifactData.sections.length}</dd>
          </div>
        </dl>
        <div className="link-row">
          {artifactData.links.snapshotRef ? (
            <Link className="card-link" to={`/snapshots/${artifactData.links.snapshotRef}`}>
              Snapshot
            </Link>
          ) : null}
          {artifactData.links.replayRef ? (
            <Link className="card-link" to={`/replay/${artifactData.links.replayRef}`}>
              Replay
            </Link>
          ) : null}
          {artifactData.links.incidentRef ? (
            <Link className="card-link" to={`/incidents/${artifactData.links.incidentRef}`}>
              Incident
            </Link>
          ) : null}
          {artifactData.links.releaseRef ? (
            <Link className="card-link" to={`/releases/${artifactData.links.releaseRef}`}>
              Release
            </Link>
          ) : null}
        </div>
      </section>
      {artifactData.sections.length > 0 ? (
        artifactData.sections.map((section) => (
          <SectionAccordion key={section.key} title={section.label}>
            <p className="card-summary">{section.summary}</p>
            {renderSectionContent(section.key)}
          </SectionAccordion>
        ))
      ) : (
        <EmptyState
          title="No derived sections were exported with this artifact."
          description="This record is stored as a top-level artifact only."
        />
      )}
      {artifactData.raw ? (
        <JsonTreeViewer value={artifactData.raw} label="Artifact JSON" />
      ) : null}
    </section>
  )
}
