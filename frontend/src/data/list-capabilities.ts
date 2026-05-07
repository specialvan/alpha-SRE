import type { ListCapabilities } from './types'

const capabilityLabels: Record<keyof ListCapabilities, string> = {
  timeRange: '时间范围',
  status: '状态筛选',
  replayOperatorId: '回放操作员筛选',
}

export function enabledCapabilityLabels(capabilities?: ListCapabilities) {
  if (!capabilities) {
    return []
  }

  return (Object.keys(capabilities) as Array<keyof ListCapabilities>)
    .filter((key) => capabilities[key])
    .map((key) => capabilityLabels[key])
}
