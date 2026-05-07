import { labelForTheme } from '../ui/labels'

interface ModeSwitcherProps {
  theme: 'dark' | 'light'
  onToggle: () => void
}

export function ModeSwitcher({ theme, onToggle }: ModeSwitcherProps) {
  return (
    <button className="theme-toggle" type="button" aria-label="主题切换" onClick={onToggle}>
      主题
      <span>{labelForTheme(theme)}</span>
    </button>
  )
}
