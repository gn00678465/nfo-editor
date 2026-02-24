import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'

type Tier = 1 | 2 | 3 | 4

const TIER_COLORS: Record<Tier, string> = {
  1: '#10B981',
  2: '#EAB308',
  3: '#6B7280',
  4: '#8B5CF6',
}
const TIER_LABELS: Record<Tier, string> = {
  1: 'Tier 1 — Essential',
  2: 'Tier 2 — Recommended',
  3: 'Tier 3 — Optional',
  4: 'Tier 4 — Domain-specific',
}

interface TierLabelProps {
  label: string
  tier?: Tier
  hint?: string
  cdataActive?: boolean
}

export default function TierLabel({ label, tier, hint, cdataActive }: TierLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11.5,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          letterSpacing: '0.01em',
        }}
      >
        {tier && (
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: TIER_COLORS[tier],
                    flexShrink: 0,
                    display: 'inline-block',
                    cursor: 'help',
                  }}
                />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="font-ui text-xs"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                {TIER_LABELS[tier]}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {label}
        {hint && (
          <span
            className="font-mono"
            style={{
              fontSize: 9,
              color: 'var(--text-muted)',
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {cdataActive && (
        <span className="cdata-pill">CDATA &#10003;</span>
      )}
    </div>
  )
}
