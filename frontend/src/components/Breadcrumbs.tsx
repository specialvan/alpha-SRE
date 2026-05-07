import { Link, useLocation } from 'react-router-dom'

function segmentLabel(segment: string) {
  return segment
    .replace(/[-:]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return (
      <p className="breadcrumbs breadcrumbs--root" aria-label="Breadcrumbs">
        Overview
      </p>
    )
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumbs">
      <Link to="/">Overview</Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`

        return (
          <span key={href}>
            {' / '}
            <Link to={href}>{segmentLabel(segment)}</Link>
          </span>
        )
      })}
    </nav>
  )
}
