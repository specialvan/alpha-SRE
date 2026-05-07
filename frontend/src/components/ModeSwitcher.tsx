interface ModeSwitcherProps {
  theme: 'dark' | 'light'
  onToggle: () => void
}

export function ModeSwitcher({ theme, onToggle }: ModeSwitcherProps) {
  return (
    <button className="theme-toggle" type="button" aria-label="Theme switcher" onClick={onToggle}>
      Theme
      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
