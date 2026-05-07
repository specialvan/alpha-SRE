import type { ReactNode } from 'react'

export function SectionAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details className="surface-card accordion" open={defaultOpen}>
      <summary>
        <span className="accordion__title" role="heading" aria-level={3}>
          {title}
        </span>
      </summary>
      <div className="accordion__body">{children}</div>
    </details>
  )
}
