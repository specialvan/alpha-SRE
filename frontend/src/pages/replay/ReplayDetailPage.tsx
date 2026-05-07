import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { CopyableText } from '../../components/CopyableText'
import { DiffViewer } from '../../components/DiffViewer'
import { EmptyState } from '../../components/EmptyState'
import { IssueList } from '../../components/IssueList'
import { JsonTreeViewer } from '../../components/JsonTreeViewer'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { PermissionGate } from '../../components/PermissionGate'
import { SectionAccordion } from '../../components/SectionAccordion'
import { StateBadge } from '../../components/StateBadge'
import { StatusNotice } from '../../components/StatusNotice'
import { VirtualizedList } from '../../components/VirtualizedList'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'

function buildValidationHref(replayRef: string, failureClass?: string) {
  const params = new URLSearchParams({
    replayRef,
  })

  if (failureClass) {
    params.set('failureClass', failureClass)
  }

  return `/validation?${params.toString()}`
}

export function ReplayDetailPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const role = useUiStore((state) => state.role)
  const params = useParams()
  const ref = decodeURIComponent(params.replayRef ?? '')
  const replay = useQuery({
    queryKey: [dataMode, 'replay', ref],
    queryFn: () => provider.getReplayBundle(ref),
    enabled: Boolean(ref),
  })
  const validation = useQuery({
    queryKey: [dataMode, 'validation', ref],
    queryFn: () => provider.getValidationForReplay(ref),
    enabled: Boolean(ref),
  })
  const replayError = replay.isError
    ? describeDataError(replay.error, 'Replay detail unavailable.')
    : null
  const validationError = validation.isError
    ? describeDataError(validation.error, 'Validation detail unavailable.')
    : null

  if (replay.isLoading && !replay.data) {
    return <LoadingSkeleton label="Loading replay detail..." />
  }

  if (replay.isError && !replay.data) {
    return (
      <EmptyState
        title={replayError?.title ?? 'Replay detail unavailable.'}
        description={replayError?.description}
      />
    )
  }

  if (!replay.data) {
    return (
      <EmptyState
        title="Replay detail unavailable."
        description="No replay payload was returned."
      />
    )
  }

  const eventChain =
    replay.data.raw &&
    typeof replay.data.raw === 'object' &&
    !Array.isArray(replay.data.raw) &&
    'events' in replay.data.raw &&
    Array.isArray(replay.data.raw.events)
      ? replay.data.raw.events
      : []

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Replay Detail</p>
          <h2>{replay.data.title}</h2>
          <p>{replay.data.summary}</p>
        </div>
        <StateBadge
          label={replay.data.failureClassification ?? replay.data.status}
          tone={replay.data.status === 'failed' ? 'danger' : 'success'}
        />
      </header>
      {replay.isError && replay.data ? (
        <StatusNotice
          title="Showing cached replay detail."
          description={replayError?.description}
          tone="warning"
        />
      ) : null}
      <section className="surface-card">
        <dl className="meta-grid">
          <div>
            <dt>Replay ref</dt>
            <dd>
              <CopyableText text={replay.data.ref} label="replay ref" />
            </dd>
          </div>
          <div>
            <dt>Command</dt>
            <dd>
              <CopyableText text={replay.data.commandId} label="command id" />
            </dd>
          </div>
          <div>
            <dt>Prompt version</dt>
            <dd>{replay.data.promptVersion}</dd>
          </div>
          <div>
            <dt>Policy version</dt>
            <dd>{replay.data.policyVersion}</dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>{replay.data.visibilityVersion}</dd>
          </div>
          <div>
            <dt>Operator</dt>
            <dd>
              {replay.data.replayOperatorId ? (
                <CopyableText text={replay.data.replayOperatorId} label="replay operator id" />
              ) : (
                'n/a'
              )}
            </dd>
          </div>
        </dl>
        <div className="link-row">
          {replay.data.links.snapshotRef ? (
            <Link className="card-link" to={`/snapshots/${replay.data.links.snapshotRef}`}>
              Locked Snapshot
            </Link>
          ) : null}
          {replay.data.links.incidentRef ? (
            <Link className="card-link" to={`/incidents/${replay.data.links.incidentRef}`}>
              Incident
            </Link>
          ) : null}
          {replay.data.links.releaseRef ? (
            <Link className="card-link" to={`/releases/${replay.data.links.releaseRef}`}>
              Release Attempt
            </Link>
          ) : null}
          <Link
            className="card-link"
            to={buildValidationHref(
              replay.data.ref,
              replay.data.failureClassification,
            )}
          >
            Validation Center
          </Link>
        </div>
      </section>
      <IssueList
        items={replay.data.issueCodes.map((code) => ({
          id: code,
          title: code,
          description: replay.data.failureClassification,
          href: buildValidationHref(replay.data.ref, code),
        }))}
      />
      <SectionAccordion title="Event Chain" defaultOpen>
        <VirtualizedList
          items={eventChain}
          renderItem={(item, index) => {
            const event =
              item && typeof item === 'object' && !Array.isArray(item) ? item : {}

            return (
              <article key={String(index)} className="surface-card">
                <CopyableText
                  text={String((event as Record<string, unknown>).event_id ?? index)}
                  label="event id"
                />
                <p className="card-summary">
                  {String((event as Record<string, unknown>).event_type ?? 'unknown_event')}
                </p>
              </article>
            )
          }}
        />
      </SectionAccordion>
      <SectionAccordion title="Locked Post-State Paths" defaultOpen>
        <DiffViewer paths={replay.data.postStatePaths} />
      </SectionAccordion>
      {replay.data.observationFrame ? (
        <SectionAccordion title="Observation Frame" defaultOpen>
          <JsonTreeViewer value={replay.data.observationFrame} label="Observation Frame JSON" />
        </SectionAccordion>
      ) : null}
      <SectionAccordion title="Validation Findings" defaultOpen>
        {validation.isLoading && !validation.data ? (
          <p className="muted">Loading validation findings...</p>
        ) : null}
        {validation.data ? (
          <>
            {validation.isError ? (
              <StatusNotice
                title="Showing cached validation findings."
                description={validationError?.description}
                tone="warning"
              />
            ) : null}
            <IssueList
              items={validation.data.findings.map((finding) => ({
                id: finding.id,
                title: finding.failureClass,
                description: `${finding.subjectId} -> ${finding.affectedField}`,
                href: buildValidationHref(finding.replayRef, finding.failureClass),
              }))}
              emptyMessage="No validation findings were exported for this replay."
            />
          </>
        ) : null}
        {validation.isError && !validation.data ? (
          <StatusNotice
            title={validationError?.title ?? 'Validation detail unavailable.'}
            description={validationError?.description}
            tone="warning"
          />
        ) : null}
        {!validation.isLoading && !validation.isError && !validation.data ? (
          <p className="muted">No validation findings were exported for this replay.</p>
        ) : null}
      </SectionAccordion>
      <PermissionGate
        role={role}
        minimumRole="operator"
        fallback={<p className="muted">Operator actions require at least operator role.</p>}
      >
        <button type="button">Re-run Replay</button>
      </PermissionGate>
      <SectionAccordion title="Evidence References">
        <IssueList
          items={replay.data.evidenceReferences.map((reference) => ({
            id: reference,
            title: reference,
          }))}
        />
      </SectionAccordion>
      {replay.data.raw ? <JsonTreeViewer value={replay.data.raw} label="Replay Bundle JSON" /> : null}
    </section>
  )
}
