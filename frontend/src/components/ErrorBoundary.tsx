import {
  ErrorBoundary as ReactErrorBoundary,
  type FallbackProps,
} from 'react-error-boundary'
import type { PropsWithChildren } from 'react'

function Fallback({ error }: FallbackProps) {
  const message = error instanceof Error ? error.message : 'Unknown page error'

  return (
    <section className="surface-card empty-state">
      <h2>Page Error</h2>
      <p className="muted">{message}</p>
    </section>
  )
}

export function ErrorBoundary({ children }: PropsWithChildren) {
  return (
    <ReactErrorBoundary FallbackComponent={Fallback}>
      {children}
    </ReactErrorBoundary>
  )
}
