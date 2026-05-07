import type { DataMode, FrontendArtifactIndex } from '../types'
import type { SreDataProvider } from '../provider'
import { fetchJsonOrThrow } from '../errors'
import { createArtifactProvider } from './artifact-provider'
import { createMockProvider } from './mock-provider'
import { mockIndex, mockRawArtifacts } from '../../mocks/catalog'

const seededMockProvider = createMockProvider({
  index: mockIndex,
  rawArtifacts: mockRawArtifacts,
})

const artifactProvider = createArtifactProvider({
  indexLoader: () => fetchJsonOrThrow<FrontendArtifactIndex>('/artifacts/index.json'),
  artifactLoader: (path: string) => {
    const normalizedPath = path.replace(/^\/+/, '')
    const publicPath = normalizedPath.startsWith('artifacts/')
      ? `/${normalizedPath}`
      : `/artifacts/${normalizedPath}`

    return fetchJsonOrThrow(publicPath)
  },
})

interface RuntimeEnv {
  dev?: boolean
  mode?: string
}

export function getRuntimeProvider(mode: DataMode, runtimeEnv: RuntimeEnv = {}): SreDataProvider {
  const runtimeMode = runtimeEnv.mode ?? import.meta.env.MODE
  const isDev = runtimeEnv.dev ?? import.meta.env.DEV

  if (runtimeMode === 'test') {
    return seededMockProvider
  }

  if (mode === 'artifact') {
    return artifactProvider
  }

  if (!isDev) {
    return seededMockProvider
  }

  return createArtifactProvider({
    indexLoader: () => fetchJsonOrThrow<FrontendArtifactIndex>('/api/mock/index'),
    artifactLoader: (path: string) =>
      fetchJsonOrThrow(`/api/mock/artifact?path=${encodeURIComponent(path)}`),
  })
}
