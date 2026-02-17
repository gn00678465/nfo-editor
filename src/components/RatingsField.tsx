import { useCallback } from 'react'
import type { RatingEntry } from '../lib/nfoParser'

interface RatingsFieldProps {
  ratings: RatingEntry[]
  onChange: (ratings: RatingEntry[]) => void
}

export default function RatingsField({ ratings, onChange }: RatingsFieldProps) {
  const add = useCallback(() => {
    onChange([...ratings, { name: '', value: '', votes: '', default: false }])
  }, [ratings, onChange])

  const remove = useCallback(
    (index: number) => onChange(ratings.filter((_, i) => i !== index)),
    [ratings, onChange]
  )

  const update = useCallback(
    (index: number, field: keyof RatingEntry, value: string | boolean) => {
      const updated = ratings.map((r, i) => i === index ? { ...r, [field]: value } : r)
      onChange(updated)
    },
    [ratings, onChange]
  )

  const toggleDefault = useCallback(
    (index: number) => {
      onChange(ratings.map((r, i) => ({ ...r, default: i === index ? !r.default : false })))
    },
    [ratings, onChange]
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
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ratings.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 80px 100px auto 32px',
            gap: 8,
            alignItems: 'center',
            padding: '0 2px',
          }}
        >
          {['SOURCE', 'VALUE /10', 'VOTES', 'DEFAULT', ''].map((h, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {h}
            </span>
          ))}
        </div>
      )}
      {ratings.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 80px 100px auto 32px',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <input
            style={inputStyle}
            type="text"
            value={r.name}
            onChange={e => update(i, 'name', e.target.value)}
            placeholder="imdb"
          />
          <input
            style={inputStyle}
            type="number"
            value={r.value}
            onChange={e => update(i, 'value', e.target.value)}
            min={0}
            max={10}
            step={0.1}
            placeholder="0.0"
          />
          <input
            style={inputStyle}
            type="number"
            value={r.votes ?? ''}
            onChange={e => update(i, 'votes', e.target.value)}
            min={0}
            placeholder="0"
          />
          <label style={{ display: 'flex', alignItems: 'center', paddingLeft: 8, cursor: 'pointer' }}>
            <div
              onClick={() => toggleDefault(i)}
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                border: `1px solid ${r.default ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
                background: r.default ? 'var(--accent-indigo)' : 'var(--bg-input)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {r.default && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </label>
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
        Add Rating Source
      </button>
    </div>
  )
}
