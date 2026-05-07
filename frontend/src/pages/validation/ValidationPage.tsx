import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'

import { CopyableText } from '../../components/CopyableText'
import { EmptyState } from '../../components/EmptyState'
import { FilterBar } from '../../components/FilterBar'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { StateBadge } from '../../components/StateBadge'
import { StatusNotice } from '../../components/StatusNotice'
import { VirtualizedList } from '../../components/VirtualizedList'
import { useSreProvider } from '../../app/providers'
import { useUiStore } from '../../app/store'
import { describeDataError } from '../../data/errors'

function getTimeRangeWindow(range: string) {
  switch (range) {
    case '24h':
      return 24 * 60 * 60 * 1000
    case '7d':
      return 7 * 24 * 60 * 60 * 1000
    case '30d':
      return 30 * 24 * 60 * 60 * 1000
    default:
      return null
  }
}

export function ValidationPage() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)
  const [searchParams] = useSearchParams()
  const replayRefFilter = searchParams.get('replayRef') ?? ''
  const [search, setSearch] = useState('')
  const [failureClass, setFailureClass] = useState(searchParams.get('failureClass') ?? '')
  const [subjectId, setSubjectId] = useState(searchParams.get('subjectId') ?? '')
  const [affectedField, setAffectedField] = useState(searchParams.get('affectedField') ?? '')
  const [timeRange, setTimeRange] = useState('7d')
  const [replayOperatorId, setReplayOperatorId] = useState(
    searchParams.get('replayOperatorId') ?? '',
  )
  const validations = useQuery({
    queryKey: [dataMode, 'validation', 'all'],
    queryFn: async () => {
      const allReplays = []
      const pageSize = 50
      let page = 1
      let total = 0

      do {
        const replays = await provider.listReplayBundles({ page, pageSize })
        allReplays.push(...replays.items)
        total = replays.total
        page += 1
      } while (allReplays.length < total)

      return Promise.all(
        allReplays.map((replay) => provider.getValidationForReplay(replay.ref)),
      )
    },
  })
  const errorState = validations.isError
    ? describeDataError(validations.error, 'Validation findings unavailable.')
    : null

  const filterCapabilities = useMemo(() => {
    const entries = validations.data ?? []
    return {
      timeRange: entries.some((entry) => entry.supportsTimeRange),
      replayOperatorId: entries.some((entry) => entry.supportsReplayOperatorFilter),
    }
  }, [validations.data])

  const options = useMemo(() => {
    const findings = validations.data?.flatMap((validation) => validation.findings) ?? []

    return {
      failureClasses: Array.from(new Set(findings.map((finding) => finding.failureClass))),
      subjectIds: Array.from(new Set(findings.map((finding) => finding.subjectId))),
      affectedFields: Array.from(new Set(findings.map((finding) => finding.affectedField))),
      replayOperatorIds: Array.from(
        new Set(
          findings
            .map((finding) => finding.replayOperatorId)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    }
  }, [validations.data])

  const latestFindingTimestamp = useMemo(() => {
    const timestamps = (validations.data ?? [])
      .flatMap((validation) => validation.findings)
      .map((finding) => finding.timestamp)
      .filter((value): value is string => Boolean(value))
      .map((value) => Date.parse(value))
      .filter((value) => Number.isFinite(value))

    return timestamps.length > 0 ? Math.max(...timestamps) : null
  }, [validations.data])

  const items = useMemo(() => {
    const timeRangeWindow = getTimeRangeWindow(timeRange)

    return (
      validations.data?.flatMap((validation) =>
        validation.findings.map((finding) => ({
          id: finding.id,
          title: finding.failureClass,
          description: `${finding.subjectId} -> ${finding.affectedField}`,
          replayHref: finding.links.replayRef ? `/replay/${finding.links.replayRef}` : undefined,
          incidentHref: finding.links.incidentRef
            ? `/incidents/${finding.links.incidentRef}`
            : undefined,
          releaseHref: finding.links.releaseRef
            ? `/releases/${finding.links.releaseRef}`
            : undefined,
          replayRef: finding.replayRef,
          replayOperatorId: finding.replayOperatorId ?? '',
          evidenceReference: finding.evidenceReference ?? '',
          timestamp: finding.timestamp,
        })),
      ) ?? []
    ).filter((item) => {
      const matchesSearch = [item.title, item.description, item.evidenceReference].some((field) =>
        field?.toLowerCase().includes(search.toLowerCase()),
      )
      const matchesFailureClass = !failureClass || item.title === failureClass
      const matchesSubject = !subjectId || item.description?.startsWith(subjectId)
      const matchesField = !affectedField || item.description?.endsWith(affectedField)
      const matchesOperator = !replayOperatorId || item.replayOperatorId === replayOperatorId
      const matchesReplayRef = !replayRefFilter || item.replayRef === replayRefFilter
      const matchesTimeRange =
        !filterCapabilities.timeRange ||
        timeRangeWindow === null ||
        latestFindingTimestamp === null
          ? true
          : item.timestamp
            ? Date.parse(item.timestamp) >= latestFindingTimestamp - timeRangeWindow
            : false

      return (
        matchesSearch &&
        matchesFailureClass &&
        matchesSubject &&
        matchesField &&
        matchesOperator &&
        matchesTimeRange &&
        matchesReplayRef
      )
    })
  }, [
    affectedField,
    failureClass,
    filterCapabilities.timeRange,
    latestFindingTimestamp,
    replayOperatorId,
    replayRefFilter,
    search,
    subjectId,
    timeRange,
    validations.data,
  ])

  const regressionTests = useMemo(() => {
    return Array.from(
      new Set(validations.data?.flatMap((validation) => validation.regressionTests) ?? []),
    )
  }, [validations.data])

  if (validations.isLoading && !validations.data) {
    return <LoadingSkeleton label="Loading validation findings..." />
  }

  if (validations.isError && !validations.data) {
    return (
      <EmptyState
        title={errorState?.title ?? 'Validation findings unavailable.'}
        description={errorState?.description}
      />
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Validation Center</p>
          <h2>Validation</h2>
          <p>
            Structured causal findings, replay-linked evidence, and reproducible regression
            suggestions.
          </p>
        </div>
      </header>
      {validations.isError && validations.data ? (
        <StatusNotice
          title="Showing cached validation results."
          description={errorState?.description}
          tone="warning"
        />
      ) : null}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search failure class, subject, field, or evidence"
        total={items.length}
        capabilities={[
          filterCapabilities.timeRange ? 'Time range' : 'Time range unavailable',
          filterCapabilities.replayOperatorId
            ? 'Replay operator'
            : 'Replay operator unavailable',
        ]}
      >
        <label className="toolbar__field">
          <span>Failure class</span>
          <select
            aria-label="Failure class"
            value={failureClass}
            onChange={(event) => setFailureClass(event.target.value)}
          >
            <option value="">all</option>
            {options.failureClasses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="toolbar__field">
          <span>Subject id</span>
          <select
            aria-label="Subject id"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            <option value="">all</option>
            {options.subjectIds.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="toolbar__field">
          <span>Affected field</span>
          <select
            aria-label="Affected field"
            value={affectedField}
            onChange={(event) => setAffectedField(event.target.value)}
          >
            <option value="">all</option>
            {options.affectedFields.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="toolbar__field">
          <span>Time range</span>
          <select
            aria-label="Time range"
            disabled={!filterCapabilities.timeRange}
            value={timeRange}
            onChange={(event) => setTimeRange(event.target.value)}
          >
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="all">all</option>
          </select>
        </label>
        <label className="toolbar__field">
          <span>Replay operator</span>
          <select
            aria-label="Replay operator"
            disabled={!filterCapabilities.replayOperatorId}
            value={replayOperatorId}
            onChange={(event) => setReplayOperatorId(event.target.value)}
          >
            <option value="">all</option>
            {options.replayOperatorIds.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      {items.length === 0 ? (
        <EmptyState
          title="No validation findings match the current filter set."
          description="Change failure class, subject, or affected field filters."
        />
      ) : null}
      <VirtualizedList
        items={items}
        renderItem={(item) => (
          <article key={item.id} className="surface-card">
            <div className="card-topline">
              <StateBadge label={item.title} tone="danger" />
              <div className="link-row">
                {item.replayOperatorId ? <span className="muted">{item.replayOperatorId}</span> : null}
                <CopyableText text={item.id} label="finding id" />
                <CopyableText
                  text={`${item.title}: ${item.description}`}
                  label="finding summary"
                />
              </div>
            </div>
            <p>{item.description}</p>
            <div className="link-row">
              {item.replayHref ? (
                <Link className="card-link" to={item.replayHref}>
                  Open Replay
                </Link>
              ) : null}
              {item.incidentHref ? (
                <Link className="card-link" to={item.incidentHref}>
                  Incident
                </Link>
              ) : null}
              {item.releaseHref ? (
                <Link className="card-link" to={item.releaseHref}>
                  Release Attempt
                </Link>
              ) : null}
              {item.evidenceReference ? <span className="muted">{item.evidenceReference}</span> : null}
            </div>
          </article>
        )}
      />
      <section className="surface-card">
        <h3>Recommended Regression Tests</h3>
        <ul className="stat-list">
          {regressionTests.map((testName) => (
            <li key={testName}>
              <CopyableText text={testName} label="regression test" as="code" />
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
