import { useCallback } from 'react'
import type { Actor } from '../lib/nfoParser'

interface ActorsFieldProps {
  actors: Actor[]
  onChange: (actors: Actor[]) => void
}

export default function ActorsField({ actors, onChange }: ActorsFieldProps) {
  const add = useCallback(() => {
    onChange([...actors, { name: '', type: 'Actor', order: actors.length }])
  }, [actors, onChange])

  const remove = useCallback(
    (index: number) => onChange(actors.filter((_, i) => i !== index)),
    [actors, onChange]
  )

  const update = useCallback(
    (index: number, field: keyof Actor, value: string | number) => {
      onChange(actors.map((a, i) => i === index ? { ...a, [field]: value || undefined } : a))
    },
    [actors, onChange]
  )

  const inputSm = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 4,
    padding: '4px 8px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: 'var(--text-primary)',
    outline: 'none',
  } as React.CSSProperties

  const labelSm = {
    fontSize: 10,
    color: 'var(--text-muted)',
    marginBottom: 3,
    display: 'block',
  } as React.CSSProperties

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {actors.map((actor, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            gap: 12,
            position: 'relative',
          }}
        >
          {/* Delete button */}
          <button
            onClick={() => remove(i)}
            type="button"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 20,
              height: 20,
              borderRadius: 4,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              transition: 'background 150ms, color 150ms',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.background = 'rgba(239,68,68,0.15)'
              el.style.color = '#EF4444'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.background = 'transparent'
              el.style.color = 'var(--text-muted)'
            }}
          >
            ×
          </button>

          {/* Thumb */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 6,
              background: '#1A1D28',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {actor.thumb ? (
              <img
                src={actor.thumb}
                alt={actor.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4E5268" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </div>

          {/* Fields */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingRight: 20 }}>
            <div>
              <label style={labelSm}>Name</label>
              <input
                style={inputSm}
                type="text"
                value={actor.name}
                onChange={e => update(i, 'name', e.target.value)}
                placeholder="Actor name"
              />
            </div>
            <div>
              <label style={labelSm}>Role</label>
              <input
                style={inputSm}
                type="text"
                value={actor.role ?? ''}
                onChange={e => update(i, 'role', e.target.value)}
                placeholder="Character/role…"
              />
            </div>
            <div>
              <label style={labelSm}>Order</label>
              <input
                style={{ ...inputSm, fontFamily: "'DM Mono', monospace", fontSize: 11 }}
                type="number"
                value={actor.order ?? 0}
                onChange={e => update(i, 'order', Number(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <label style={labelSm}>Type</label>
              <select
                style={{
                  ...inputSm,
                  appearance: 'none',
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234E5268' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  paddingRight: 28,
                }}
                value={actor.type ?? 'Actor'}
                onChange={e => update(i, 'type', e.target.value)}
              >
                <option>Actor</option>
                <option>Director</option>
                <option>Writer</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelSm}>Thumb URL</label>
              <input
                style={inputSm}
                type="url"
                value={actor.thumb ?? ''}
                onChange={e => update(i, 'thumb', e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
        </div>
      ))}

      <button className="add-btn" onClick={add} type="button">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Actor
      </button>
    </div>
  )
}
