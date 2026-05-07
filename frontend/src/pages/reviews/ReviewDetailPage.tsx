import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { CopyableText } from '../../components/CopyableText'
import { EmptyState } from '../../components/EmptyState'
import { IssueList } from '../../components/IssueList'
import { JsonTreeViewer } from '../../components/JsonTreeViewer'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { StatusNotice } from '../../components/StatusNotice'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'

export function ReviewDetailPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const params = useParams()
  const ref = decodeURIComponent(params.reviewRef ?? '')
  const review = useQuery({
    queryKey: [dataMode, 'review', ref],
    queryFn: () => provider.getReview(ref),
    enabled: Boolean(ref),
  })
  const errorState = review.isError
    ? describeDataError(review.error, 'Review detail unavailable.')
    : null

  if (review.isLoading && !review.data) {
    return <LoadingSkeleton label="Loading quality review detail..." />
  }

  if (review.isError && !review.data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Review detail unavailable.'}
        description={errorState?.description}
      />
    )
  }

  if (!review.data) {
    return (
      <EmptyState
        title="Review detail unavailable."
        description="No review payload was returned."
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Quality Review Detail</p>
          <h2>{review.data.reviewId}</h2>
          <p>{review.data.summary}</p>
        </div>
      </header>
      {review.isError && review.data ? (
        <StatusNotice
          title="Showing cached review detail."
          description={errorState?.description}
          tone="warning"
        />
      ) : null}
      <section className="surface-card">
        <dl className="meta-grid">
          <div>
            <dt>Source artifact</dt>
            <dd>
              <CopyableText
                text={review.data.sourceArtifactReference}
                label="source artifact reference"
              />
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{review.data.updatedAt ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>Checked segments</dt>
            <dd>{review.data.checkedSegmentCount}</dd>
          </div>
          <div>
            <dt>OOC incidents</dt>
            <dd>{review.data.oocIncidentCount}</dd>
          </div>
          <div>
            <dt>Checked scenes</dt>
            <dd>{review.data.checkedSceneCount}</dd>
          </div>
          <div>
            <dt>World-rule violations</dt>
            <dd>{review.data.worldRuleViolationCount}</dd>
          </div>
          <div>
            <dt>Introduced setup items</dt>
            <dd>{review.data.introducedSetupItemCount}</dd>
          </div>
          <div>
            <dt>Resolved setup items</dt>
            <dd>{review.data.resolvedSetupItemCount}</dd>
          </div>
        </dl>
        <div className="link-row">
          {review.data.links.artifactRef ? (
            <Link className="card-link" to={`/artifacts/${review.data.links.artifactRef}`}>
              Source Artifact
            </Link>
          ) : null}
          {review.data.links.replayRef ? (
            <Link className="card-link" to={`/replay/${review.data.links.replayRef}`}>
              Best-effort replay link
            </Link>
          ) : null}
        </div>
      </section>
      <IssueList
        items={review.data.evidenceReferences.map((reference) => ({
          id: reference,
          title: reference,
        }))}
      />
      {review.data.raw ? <JsonTreeViewer value={review.data.raw} label="Review JSON" /> : null}
    </section>
  )
}
