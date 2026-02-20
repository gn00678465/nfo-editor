import { ChevronDown } from 'lucide-react'

interface SectionProps {
  num: number
  title: string
  icon?: React.ReactNode
  meta?: string
  collapsed: boolean
  onToggle: () => void
  children: React.ReactNode
}

export default function Section({ num, title, icon, meta, collapsed, onToggle, children }: SectionProps) {
  return (
    <div>
      {/* Header */}
      <div
        className="section-header"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 32px 10px',
          cursor: 'pointer',
          userSelect: 'none',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'linear-gradient(var(--bg-surface), var(--bg-surface) 90%, transparent)',
        }}
      >
        <div
          className="font-title"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          <span className="section-num">{num}</span>
          {icon && (
            <span style={{ width: 16, height: 16, opacity: 0.5, display: 'flex', alignItems: 'center' }}>
              {icon}
            </span>
          )}
          {title}
        </div>
        <div
          className="font-mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 10,
            color: 'var(--text-muted)',
          }}
        >
          {meta && <span>{meta}</span>}
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform duration-150"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'none' }}
          />
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div
          style={{
            padding: '4px 32px 24px',
            display: 'grid',
            gap: 14,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
