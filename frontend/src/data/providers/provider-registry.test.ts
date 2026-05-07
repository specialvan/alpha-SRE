import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('provider registry', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads backend catalog relative paths from the /artifacts/ root in artifact mode', async () => {
    const fetchJsonOrThrow = vi.fn(async (path: string) => {
      if (path === '/artifacts/index.json') {
        return {
          catalog_version: '1.0',
          field_sources: {
            artifact_ref: 'catalog_metadata',
            artifact_kind: 'catalog_metadata',
            relative_path: 'catalog_metadata',
            native_primary_id: 'native_artifact',
          },
          artifacts: [
            {
              artifact_ref: 'bundle:post-state-mismatch',
              artifact_kind: 'replay_bundle',
              relative_path: 'bundles/post-state-mismatch.json',
              native_primary_id: 'cmd-v2',
            },
          ],
        }
      }

      if (path === '/artifacts/bundles/post-state-mismatch.json') {
        return {
          bundle_version: '1.0',
          command: {
            command_id: 'cmd-v2',
            command_type: 'edit',
            operator_id: 'replay-op-1',
            target_id: 'chapter-1',
            policy_version: 'p1',
            created_at: '2026-05-07T16:00:00Z',
          },
          snapshot: {
            snapshot_id: 's-v2-pre',
            state_identity: 'state-v2',
            schema_version: '1.0',
            policy_version: 'p1',
            visibility_version: 'v2',
            created_at: '2026-05-07T15:59:00Z',
          },
          events: [],
          replay: {
            ok: false,
            failure_classification: 'post_state_mismatch',
            evidence_references: ['command:cmd-v2'],
            issues: [],
            post_state_diff: ['characters.c1.current_goal'],
          },
          metrics: {
            checked_post_state_surface_count: 1,
            post_state_mismatch_rate: 1,
          },
          gate: {
            allowed: false,
            blocking_issues: ['post_state_mismatch'],
            warnings: [],
          },
          drift_report: {
            drifted: false,
            reasons: [],
            source_signature: {},
            replay_signature: {},
          },
          session: {
            policy_version: 'p1',
            prompt_version: 'chapter-intent-v2',
            replay_operator_id: 'replay-op-1',
            visibility_snapshot_version: 'v2',
            narrative_state_schema_version: '1.0',
          },
        }
      }

      throw new Error(`unexpected fetch path: ${path}`)
    })

    vi.doMock('../errors', () => ({
      fetchJsonOrThrow,
    }))

    const { getRuntimeProvider } = await import('./provider-registry')
    const provider = getRuntimeProvider('artifact', {
      dev: false,
      mode: 'production',
    })

    const artifacts = await provider.listArtifacts({ page: 1, pageSize: 10 })

    expect(artifacts.total).toBe(1)
    expect(fetchJsonOrThrow).toHaveBeenNthCalledWith(1, '/artifacts/index.json')
    expect(fetchJsonOrThrow).toHaveBeenNthCalledWith(
      2,
      '/artifacts/bundles/post-state-mismatch.json',
    )
  })
})
