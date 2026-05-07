import type { PropsWithChildren } from 'react'

import type { OperatorRole } from '../app/store'

const roleRank: Record<OperatorRole, number> = {
  viewer: 0,
  operator: 1,
  oncall: 2,
  admin: 3,
}

export function PermissionGate({
  role,
  minimumRole,
  fallback,
  children,
}: PropsWithChildren<{
  role: OperatorRole
  minimumRole: OperatorRole
  fallback: React.ReactNode
}>) {
  if (roleRank[role] < roleRank[minimumRole]) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
