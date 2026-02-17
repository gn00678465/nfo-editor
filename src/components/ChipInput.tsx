import { useState, useCallback, useRef } from 'react'

interface ChipInputProps {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  chipClass?: string
}

export default function ChipInput({
  values,
  onChange,
  placeholder = 'Add…',
  chipClass = 'chip-tag',
}: ChipInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addValue = useCallback(
    (val: string) => {
      const trimmed = val.trim()
      if (trimmed && !values.includes(trimmed)) {
        onChange([...values, trimmed])
      }
    },
    [values, onChange]
  )

  const removeValue = useCallback(
    (index: number) => {
      onChange(values.filter((_, i) => i !== index))
    },
    [values, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addValue(inputValue.replace(/,$/, ''))
      setInputValue('')
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      removeValue(values.length - 1)
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      addValue(inputValue)
      setInputValue('')
    }
  }

  return (
    <div
      className="tag-input-wrap"
      onClick={() => inputRef.current?.focus()}
    >
      {values.map((v, i) => (
        <span key={i} className={`chip ${chipClass}`}>
          {v}
          <button
            onClick={e => { e.stopPropagation(); removeValue(i) }}
            style={{
              fontSize: 11,
              lineHeight: 1,
              opacity: 0.6,
              cursor: 'pointer',
              fontWeight: 400,
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
            type="button"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="tag-ghost-input"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={values.length === 0 ? placeholder : ''}
      />
    </div>
  )
}
