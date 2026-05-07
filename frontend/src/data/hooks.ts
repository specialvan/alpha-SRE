import { useQuery } from '@tanstack/react-query'

import { useSreProvider } from '../app/providers'
import { useUiStore } from '../app/store'

export function useOverviewQuery() {
  const provider = useSreProvider()
  const dataMode = useUiStore((state) => state.dataMode)

  return useQuery({
    queryKey: ['overview', dataMode],
    queryFn: () => provider.getOverview(),
  })
}
