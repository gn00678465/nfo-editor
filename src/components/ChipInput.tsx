import { useState, useCallback, useRef, useEffect } from 'react'
import { X, LayoutGrid, AlignLeft, Copy, Check } from 'lucide-react'
import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'

interface ChipInputProps {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  chipClass?: string
  /** Enable tag/text mode toggle */
  enableTextMode?: boolean
}

export default function ChipInput({
  values,
  onChange,
  placeholder = 'Add...',
  chipClass = 'chip-tag',
  enableTextMode = false,
}: ChipInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [mode, setMode] = useState<'chip' | 'text'>('chip')
  const [textValue, setTextValue] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync text value when switching to text mode or when values change externally (e.g. file switch)
  useEffect(() => {
    if (mode === 'text') {
      setTextValue(values.join(', '))
    }
  }, [mode, values])

  const addValue = useCallback(
    (val: string) => {
      const trimmed = val.trim()
      if (trimmed && !values.includes(trimmed)) {
        onChange([...values, trimmed])
      }
    },
    [values, onChange]
  )

  const addValues = useCallback(
    (vals: string[]) => {
      const newVals = [...new Set(vals.map(v => v.trim()).filter(v => v !== '' && !values.includes(v)))]
      if (newVals.length > 0) onChange([...values, ...newVals])
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
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.includes(',')) {
        addValues(inputValue.split(',').map(s => s.trim()).filter(s => s !== ''))
      } else {
        addValue(inputValue)
      }
      setInputValue('')
    } else if (e.key === ',') {
      e.preventDefault()
      addValue(inputValue)
      setInputValue('')
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      removeValue(values.length - 1)
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      if (inputValue.includes(',')) {
        addValues(inputValue.split(',').map(s => s.trim()).filter(s => s !== ''))
      } else {
        addValue(inputValue)
      }
      setInputValue('')
    }
  }

  const handleTextCommit = useCallback(() => {
    const parsed = textValue
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
    // Deduplicate
    const unique = [...new Set(parsed)]
    // Only call onChange if values actually changed to avoid false dirty state
    if (unique.length !== values.length || unique.some((v, i) => v !== values[i])) {
      onChange(unique)
    }
  }, [textValue, values, onChange])

  const switchToChip = useCallback(() => {
    handleTextCommit()
    setMode('chip')
  }, [handleTextCommit])

  const switchToText = useCallback(() => {
    setMode('text')
  }, [])

  const handleCopy = useCallback(async () => {
    const text = values.join(', ')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [values])

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter to commit and switch back
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      switchToChip()
    }
  }

  // ── Toggle buttons ──
  const modeToggle = enableTextMode && (
    <TooltipProvider delay={300}>
      <div
        className="inline-flex items-center rounded-md p-0.5 gap-0"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={switchToChip}
              className="inline-flex items-center justify-center rounded-sm transition-all duration-150"
              style={{
                width: 22,
                height: 20,
                background: mode === 'chip' ? 'var(--bg-surface)' : 'transparent',
                color: mode === 'chip' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: mode === 'chip' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              <LayoutGrid className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-ui text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
            Tag mode
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={switchToText}
              className="inline-flex items-center justify-center rounded-sm transition-all duration-150"
              style={{
                width: 22,
                height: 20,
                background: mode === 'text' ? 'var(--bg-surface)' : 'transparent',
                color: mode === 'text' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: mode === 'text' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              <AlignLeft className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-ui text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
            Text mode — comma separated
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )

  // ── Text mode view ──
  if (mode === 'text' && enableTextMode) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {modeToggle}
            <TooltipProvider delay={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center justify-center rounded-md transition-all duration-150"
                    style={{
                      width: 24,
                      height: 22,
                      background: 'transparent',
                      border: '1px solid var(--border-default)',
                      color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="font-ui text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                  {copied ? 'Copied!' : 'Copy all'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            &#8984;Enter to apply
          </span>
        </div>
        <textarea
          ref={textareaRef}
          className="field-input"
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          onBlur={handleTextCommit}
          onKeyDown={handleTextKeyDown}
          rows={2}
          placeholder="genre1, genre2, genre3..."
          style={{ minHeight: 48, lineHeight: 1.6, fontSize: 12 }}
        />
      </div>
    )
  }

  // ── Chip mode view (default) ──
  return (
    <div className="flex flex-col gap-1.5">
      {enableTextMode && (
        <div className="flex items-center gap-2">
          {modeToggle}
        </div>
      )}
      <div
        className="tag-input-wrap"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v, i) => (
          <span key={i} className={`chip ${chipClass}`}>
            {v}
            <button
              onClick={e => { e.stopPropagation(); removeValue(i) }}
              className="inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'inherit',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              type="button"
            >
              <X className="h-2.5 w-2.5" />
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
    </div>
  )
}
