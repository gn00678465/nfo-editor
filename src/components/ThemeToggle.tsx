import { useTheme } from './ThemeProvider'
import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="no-drag h-7 w-7 rounded-md"
      style={{
        color: 'var(--text-muted)',
        background: 'transparent',
      }}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-3.5 w-3.5" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}
