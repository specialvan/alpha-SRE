import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createContext,
  type PropsWithChildren,
  useEffect,
  useContext,
  useMemo,
} from 'react'

import type { SreDataProvider } from '../data/provider'
import { getRuntimeProvider } from '../data/providers/provider-registry'
import { useUiStore } from './store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
const SreProviderContext = createContext<SreDataProvider | null>(null)

export function AppProviders({ children }: PropsWithChildren) {
  const dataMode = useUiStore((state) => state.dataMode)
  const provider = useMemo(() => getRuntimeProvider(dataMode), [dataMode])

  useEffect(() => {
    void queryClient.invalidateQueries()
  }, [dataMode])

  return (
    <QueryClientProvider client={queryClient}>
      <SreProviderContext.Provider value={provider}>
        {children}
      </SreProviderContext.Provider>
    </QueryClientProvider>
  )
}

export function useSreProvider() {
  const provider = useContext(SreProviderContext)
  if (!provider) {
    throw new Error('Sre provider is not available')
  }

  return provider
}
