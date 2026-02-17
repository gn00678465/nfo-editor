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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'Syne', sans-serif",
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: 'var(--text-muted)',
          }}
        >
          {meta && <span>{meta}</span>}
          <span style={{ fontSize: 11, transition: 'transform 150ms', transform: collapsed ? 'rotate(-90deg)' : 'none' }}>
            ▾
          </span>
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
