import { useCallback } from 'react'
import type { Actor } from '../lib/nfoParser'
import { Button } from './ui/button'
import { Plus, X, User } from 'lucide-react'

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            type="button"
            className="absolute top-2 right-2 h-5 w-5 rounded hover:bg-red-500/15 hover:text-red-500"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-3 w-3" />
          </Button>

          {/* Thumb */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 6,
              background: 'var(--bg-surface)',
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
              <User className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
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
                placeholder="Character/role..."
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
                className="field-select"
                style={{ ...inputSm, appearance: 'none', paddingRight: 28 }}
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
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      ))}

      <button className="add-btn" onClick={add} type="button">
        <Plus className="h-3 w-3" />
        Add Actor
      </button>
    </div>
  )
}
