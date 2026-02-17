import { useCallback } from 'react'
import type { RatingEntry } from '../lib/nfoParser'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Plus, X } from 'lucide-react'

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
          className="font-mono"
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
          <div className="flex items-center pl-2">
            <Checkbox
              checked={r.default}
              onCheckedChange={() => toggleDefault(i)}
              className="border-[var(--border-default)] data-[state=checked]:bg-[var(--accent-indigo)] data-[state=checked]:border-[var(--accent-indigo)]"
            />
          </div>
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
        Add Rating Source
      </button>
    </div>
  )
}
