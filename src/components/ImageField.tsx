import { useState } from 'react'
import TierLabel from './TierLabel'

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
            placeholder="https://…"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ×
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
            <span
              style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                fontFamily: "'DM Mono', monospace",
                textAlign: 'center',
                padding: 4,
                lineHeight: 1.4,
              }}
            >
              {label.toUpperCase()}<br/>PREVIEW
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
