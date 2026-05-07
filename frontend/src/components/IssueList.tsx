import { Link } from 'react-router-dom'

import { CopyableText } from './CopyableText'

export interface IssueListItem {
  id: string
  title: string
  description?: string
  href?: string
}

export function IssueList({
  items,
  emptyMessage = 'No linked issues.',
}: {
  items: IssueListItem[]
  emptyMessage?: string
}) {
  if (items.length === 0) {
    return <p className="muted">{emptyMessage}</p>
  }

  return (
    <ul className="issue-list">
      {items.map((item) => (
        <li key={item.id} className="surface-card issue-list__item">
          <div className="card-topline">
            {item.href ? (
              <Link className="card-link" to={item.href}>
                {item.title}
              </Link>
            ) : (
              <strong>{item.title}</strong>
            )}
            <CopyableText text={item.id} label={`${item.title} id`} />
          </div>
          {item.description ? <p className="card-summary">{item.description}</p> : null}
        </li>
      ))}
    </ul>
  )
}
