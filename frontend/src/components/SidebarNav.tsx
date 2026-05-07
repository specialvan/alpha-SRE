import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: '总览', end: true },
  { to: '/artifacts', label: '制品' },
  { to: '/snapshots', label: '快照' },
  { to: '/replay', label: '回放实验室' },
  { to: '/validation', label: '校验中心' },
  { to: '/metrics', label: '指标与 Gate' },
  { to: '/quality/reviews', label: '质量评审' },
  { to: '/incidents', label: '事件' },
  { to: '/releases', label: '发布' },
]

export function SidebarNav() {
  return (
    <nav className="sidebar-nav" aria-label="主导航">
      <p className="eyebrow">领域</p>
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
