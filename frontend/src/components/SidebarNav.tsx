import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/artifacts', label: 'Artifacts' },
  { to: '/snapshots', label: 'Snapshots' },
  { to: '/replay', label: 'Replay Lab' },
  { to: '/validation', label: 'Validation' },
  { to: '/metrics', label: 'Metrics & Gate' },
  { to: '/quality/reviews', label: 'Quality Reviews' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/releases', label: 'Releases' },
]

export function SidebarNav() {
  return (
    <nav className="sidebar-nav" aria-label="Primary">
      <p className="eyebrow">Domains</p>
      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
