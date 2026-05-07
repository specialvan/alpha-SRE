import type { SeededProviderOptions, SreDataProvider } from '../provider'
import { createIndexBackedProvider } from './index-backed-provider'

export function createMockProvider(options: SeededProviderOptions): SreDataProvider {
  return createIndexBackedProvider({
    getIndex: async () => options.index,
    loadRawArtifact: async (path: string) => options.rawArtifacts?.[path] ?? null,
  })
}
