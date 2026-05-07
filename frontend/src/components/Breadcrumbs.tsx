import { Link, useLocation } from 'react-router-dom'

import { labelForRouteSegment } from '../ui/labels'

export function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return (
      <p className="breadcrumbs breadcrumbs--root" aria-label="面包屑">
        总览
      </p>
    )
  }

  return (
    <nav className="breadcrumbs" aria-label="面包屑">
      <Link to="/">总览</Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`

        return (
          <span key={href}>
            {' / '}
            <Link to={href}>{labelForRouteSegment(segment)}</Link>
          </span>
        )
      })}
    </nav>
  )
}
