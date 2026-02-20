import { useState } from 'react'
import TierLabel from './TierLabel'
import { X, ImageIcon } from 'lucide-react'

type Tier = 1 | 2 | 3 | 4

interface ImageFieldProps {
  label: string
  tier?: Tier
  hint?: string
  value: string
  onChange: (value: string) => void
  aspectRatio?: 'poster' | 'cover' | 'wide'
}

export default function ImageField({ label, tier, hint, value, onChange, aspectRatio = 'poster' }: ImageFieldProps) {
  const [imgError, setImgError] = useState(false)

  const previewHeight = aspectRatio === 'wide' ? 45 : 80

  return (
    <div>
      <TierLabel label={label} tier={tier} hint={hint} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, alignItems: 'start' }}>
        <div style={{ position: 'relative' }}>
          <input
            className="field-input"
            type="url"
            value={value}
            onChange={e => { onChange(e.target.value); setImgError(false) }}
            placeholder="https://..."
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >
              <X className="h-3.5 w-3.5 hover:text-red-500" />
            </button>
          )}
        </div>
        <div
          style={{
            width: 80,
            height: previewHeight,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 5,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {value && !imgError ? (
            <img
              src={value}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
              <ImageIcon className="h-4 w-4 opacity-40" />
              <span
                className="font-mono"
                style={{ fontSize: 8, textAlign: 'center', lineHeight: 1.3 }}
              >
                {label.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
