import { useCallback } from 'react'
import type { UniqueId } from '../lib/nfoParser'
import { Button } from './ui/button'
import { Plus, X, Star } from 'lucide-react'

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
            className="field-select"
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
            placeholder="ID value..."
          />
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={() => setDefault(i)}
            title="Set as default"
            className="h-[30px] w-9 rounded-md"
            style={{
              border: `1px solid ${uid.default ? 'var(--accent-amber)' : 'var(--border-default)'}`,
              background: uid.default ? 'rgba(245,158,11,0.1)' : 'var(--bg-input)',
              color: uid.default ? 'var(--accent-amber)' : 'var(--text-muted)',
              transition: 'all 150ms',
            }}
          >
            <Star className="h-3.5 w-3.5" fill={uid.default ? 'currentColor' : 'none'} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={() => remove(i)}
            className="h-[30px] w-8 rounded-md hover:border-red-500 hover:text-red-500 hover:bg-red-500/10"
            style={{
              border: '1px solid var(--border-default)',
              background: 'var(--bg-input)',
              color: 'var(--text-muted)',
              transition: 'all 150ms',
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <button className="add-btn" onClick={add} type="button" style={{ marginTop: 2 }}>
        <Plus className="h-3 w-3" />
        Add Unique ID
      </button>
    </div>
  )
}
