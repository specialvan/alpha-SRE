import type { FrontendArtifactIndex } from '../types'
import type { SreDataProvider } from '../provider'
import { createIndexBackedProvider } from './index-backed-provider'

export interface ArtifactProviderOptions {
  indexLoader: () => Promise<FrontendArtifactIndex>
  artifactLoader: (path: string) => Promise<unknown>
}

export function createArtifactProvider(
  options: ArtifactProviderOptions,
): SreDataProvider {
  let cachedIndex: FrontendArtifactIndex | null = null
  const rawCache = new Map<string, unknown>()

  return createIndexBackedProvider({
    getIndex: async () => {
      if (!cachedIndex) {
        cachedIndex = await options.indexLoader()
      }

      return cachedIndex
    },
    loadRawArtifact: async (path: string) => {
      if (rawCache.has(path)) {
        return rawCache.get(path)
      }

      const loaded = await options.artifactLoader(path)
      rawCache.set(path, loaded)
      return loaded
    },
  })
}
