import { useCallback } from 'react'
import type { UniqueId } from '../lib/nfoParser'

interface UniqueIdFieldProps {
  ids: UniqueId[]
  onChange: (ids: UniqueId[]) => void
}

const ID_TYPES = ['imdb', 'tmdb', 'tvdb', 'fc2', 'javdb', 'custom']

export default function UniqueIdField({ ids, onChange }: UniqueIdFieldProps) {
  const add = useCallback(() => {
    onChange([...ids, { type: 'fc2', value: '', default: false }])
  }, [ids, onChange])

  const remove = useCallback(
    (index: number) => onChange(ids.filter((_, i) => i !== index)),
    [ids, onChange]
  )

  const update = useCallback(
    (index: number, field: keyof UniqueId, value: string | boolean) => {
      onChange(ids.map((u, i) => {
        if (i !== index) return u
        if (field === 'default' && value === true) {
          // Only one can be default
          return { ...u, [field]: value }
        }
        return { ...u, [field]: value }
      }))
    },
    [ids, onChange]
  )

  const setDefault = useCallback(
    (index: number) => {
      onChange(ids.map((u, i) => ({ ...u, default: i === index ? !u.default : false })))
    },
    [ids, onChange]
  )

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 5,
    padding: '5px 8px',
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: 'var(--text-code)',
    outline: 'none',
    letterSpacing: '0.02em',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 5,
    padding: '5px 28px 5px 8px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: 'var(--text-primary)',
    outline: 'none',
    appearance: 'none',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234E5268' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ids.map((uid, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 1fr 36px 32px',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <select
            style={selectStyle}
            value={uid.type}
            onChange={e => update(i, 'type', e.target.value)}
          >
            {ID_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input
            style={inputStyle}
            type="text"
            value={uid.value}
            onChange={e => update(i, 'value', e.target.value)}
            placeholder="ID value…"
          />
          <button
            type="button"
            onClick={() => setDefault(i)}
            title="Set as default"
            style={{
              width: 36,
              height: 30,
              borderRadius: 5,
              border: `1px solid ${uid.default ? 'var(--accent-amber)' : 'var(--border-default)'}`,
              background: uid.default ? 'rgba(245,158,11,0.1)' : 'var(--bg-input)',
              color: uid.default ? 'var(--accent-amber)' : 'var(--text-muted)',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms',
            }}
          >
            ★
          </button>
          <button
            type="button"
            onClick={() => remove(i)}
            style={{
              width: 32,
              height: 30,
              borderRadius: 5,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-input)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.borderColor = '#EF4444'
              el.style.color = '#EF4444'
              el.style.background = 'rgba(239,68,68,0.08)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.borderColor = 'var(--border-default)'
              el.style.color = 'var(--text-muted)'
              el.style.background = 'var(--bg-input)'
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button className="add-btn" onClick={add} type="button" style={{ marginTop: 2 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Unique ID
      </button>
    </div>
  )
}
