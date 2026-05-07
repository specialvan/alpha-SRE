import {
  ErrorBoundary as ReactErrorBoundary,
  type FallbackProps,
} from 'react-error-boundary'
import type { PropsWithChildren } from 'react'

function Fallback({ error }: FallbackProps) {
  const message = error instanceof Error ? error.message : '未知页面错误'

  return (
    <section className="surface-card empty-state">
      <h2>页面错误</h2>
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
