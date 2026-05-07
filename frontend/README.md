# alpha-SRE Frontend

This workspace contains the V3.3 React SPA for the `alpha-SRE` control plane.

## Purpose

The frontend is artifact-first and mock-first:

- `mock` mode serves seeded control-plane data from `src/mocks/`
- `artifact` mode reads a repo-native catalog plus raw JSON artifacts from `public/artifacts/`

Both modes resolve through the same `SreDataProvider` interface.

## Commands

```powershell
npm install
npm run test
npm run coverage
npm run build
```

For local development:

```powershell
npm run dev
```

## Provider Modes

Use the shell `Data mode` switcher in the app header:

- `mock`: deterministic seeded fixtures for replay, validation, metrics, review, incident, and release flows
- `artifact`: reads `index.json` as the catalog (`CAT`) and materializes replay/validation/metrics/review/incident/release surfaces from the raw JSON artifacts it references

In development, mock mode is also backed by MSW so the SPA can be exercised without a backend API.
In a built preview or static deployment, mock mode falls back to the seeded in-memory provider instead of
requiring `/api/mock/*` endpoints.

## Global Search

The shell search bar supports direct ref routing:

- `artifact:<artifactRef>`
- `replay:<replayRef>`
- `snapshot:<snapshotRef>`
- `incident:<incidentRef>`
- `review:<reviewRef>`
- `release:<releaseRef>`

Bare `bundle:<bundleRef>` input still routes to replay detail because replay refs are bundle refs in V3.3.

## Artifact Layout

Artifact mode expects the catalog root at:

```text
frontend/public/artifacts/index.json
```

The seeded sample files live under:

- `frontend/public/artifacts/bundles/`
- `frontend/public/artifacts/incidents/`
- `frontend/public/artifacts/releases/`
- `frontend/public/artifacts/reviews/`

`index.json` is the catalog contract, not a front-end-only aggregate fixture. It should match the
backend `JsonArtifactStore.build_catalog()` shape:

- `catalog_version`
- `field_sources`
- `artifacts[]` with `artifact_ref`, `artifact_kind`, `relative_path`, and `native_primary_id`

If you add new artifact-mode samples, update the raw JSON artifact files first and then regenerate
`index.json` from the catalog contract instead of hand-authoring derived overview/metrics/replay lists.

## Route Surface

The SPA exposes these primary routes:

- `/`
- `/artifacts`
- `/snapshots`
- `/replay`
- `/validation`
- `/metrics`
- `/quality/reviews`
- `/incidents`
- `/releases`

Detail routes derive from the stable refs returned by the provider.
