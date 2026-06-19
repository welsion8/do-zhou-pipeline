import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggleTheme: () => void } | null>(null)

function getInitial(defaultTheme: Theme): Theme {
  const stored = localStorage.getItem('do-zhou-theme')
  if (stored === 'dark' || stored === 'light') return stored
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  return defaultTheme
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: { children: ReactNode; defaultTheme?: Theme }): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>(() => getInitial(defaultTheme))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('do-zhou-theme', theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggleTheme = useCallback(() => setThemeState((p) => (p === 'dark' ? 'light' : 'dark')), [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
