import { Link } from 'react-router-dom'

import type { ActivityItem } from '../data/types'

interface TimelineProps {
  items: ActivityItem[]
}

export function Timeline({ items }: TimelineProps) {
  return (
    <ul className="timeline">
      {items.map((item) => (
        <li key={item.id} className="surface-card timeline__item">
          <Link className="card-link" to={item.href}>
            {item.title}
          </Link>
          {item.timestamp ? <p className="card-meta">{item.timestamp}</p> : null}
          <p className="card-summary">{item.description}</p>
        </li>
      ))}
    </ul>
  )
}
