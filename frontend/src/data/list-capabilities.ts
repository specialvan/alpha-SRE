import type { ListCapabilities } from './types'

const capabilityLabels: Record<keyof ListCapabilities, string> = {
  timeRange: 'Time range',
  status: 'Status filter',
  replayOperatorId: 'Replay operator filter',
}

export function enabledCapabilityLabels(capabilities?: ListCapabilities) {
  if (!capabilities) {
    return []
  }

  return (Object.keys(capabilities) as Array<keyof ListCapabilities>)
    .filter((key) => capabilities[key])
    .map((key) => capabilityLabels[key])
}
