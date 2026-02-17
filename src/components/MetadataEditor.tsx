import { useState, useCallback } from 'react'
import type { NfoData } from '../lib/nfoParser'
import Section from './Section'
import ChipInput from './ChipInput'
import ActorsField from './ActorsField'
import UniqueIdField from './UniqueIdField'
import ImageField from './ImageField'
import RatingsField from './RatingsField'
import TierLabel from './TierLabel'

interface MetadataEditorProps {
  data: NfoData
  onChange: (data: NfoData) => void
}

type Tier = 1 | 2 | 3 | 4

function Field({
  label, tier, hint, cdataActive, children,
}: {
  label: string
  tier?: Tier
  hint?: string
  cdataActive?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <TierLabel label={label} tier={tier} hint={hint} cdataActive={cdataActive} />
      {children}
    </div>
  )
}

export default function MetadataEditor({ data, onChange }: MetadataEditorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleSection = useCallback((id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const set = useCallback(<K extends keyof NfoData>(field: K, value: NfoData[K]) => {
    onChange({ ...data, [field]: value })
  }, [data, onChange])

  const str = (f: keyof NfoData) => (data[f] as string | undefined) ?? ''

  const inputCls = 'field-input'
  const monoCls = 'field-input mono'
  const textaCls = 'field-input'

  return (
    <div
      id="editor-scroll"
      style={{
        overflowY: 'auto',
        height: '100%',
        background: 'var(--bg-surface)',
      }}
    >
      {/* §1 Core Info */}
      <Section
        num={1}
        title="Core Info"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        meta="9 fields"
        collapsed={!!collapsed['s1']}
        onToggle={() => toggleSection('s1')}
      >
        <Field label="Title" tier={1}>
          <input className={inputCls} type="text" value={str('title')} onChange={e => set('title', e.target.value)} placeholder="Movie title…" />
        </Field>
        <Field label="Original Title" tier={2}>
          <input className={inputCls} type="text" value={str('originaltitle')} onChange={e => set('originaltitle', e.target.value)} />
        </Field>
        <Field label="Sort Title" tier={2}>
          <input className={inputCls} type="text" value={str('sorttitle')} onChange={e => set('sorttitle', e.target.value)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Year" tier={2}>
            <input className={monoCls} type="number" value={str('year')} onChange={e => set('year', e.target.value)} min={1900} max={2099} />
          </Field>
          <Field label="Premiere Date" tier={1}>
            <input className={monoCls} type="date" value={str('premiered')} onChange={e => set('premiered', e.target.value)} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Runtime" tier={1}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input className={monoCls} type="number" value={str('runtime')} onChange={e => set('runtime', e.target.value)} style={{ borderRadius: '5px 0 0 5px' }} />
              <span className="input-suffix">min</span>
            </div>
          </Field>
          <Field label="MPAA Rating" tier={1}>
            <select className="field-select" value={str('mpaa')} onChange={e => set('mpaa', e.target.value)}>
              <option value="">—</option>
              <option>G</option>
              <option>PG</option>
              <option>PG-13</option>
              <option>R</option>
              <option>NC-17</option>
              <option>NR</option>
              <option>Unrated</option>
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Release Date" tier={3} hint="<releasedate>">
            <input className={monoCls} type="date" value={str('releasedate')} onChange={e => set('releasedate', e.target.value)} />
          </Field>
          <Field label="Tagline" tier={3}>
            <input className={inputCls} type="text" value={str('tagline')} onChange={e => set('tagline', e.target.value)} placeholder="Short tagline…" />
          </Field>
        </div>
      </Section>

      <div className="section-divider" />

      {/* §2 Plot & Description */}
      <Section
        num={2}
        title="Plot & Description"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
        meta="3 fields"
        collapsed={!!collapsed['s2']}
        onToggle={() => toggleSection('s2')}
      >
        <Field label="Plot" tier={1} cdataActive>
          <textarea className={textaCls} rows={5} value={str('plot')} onChange={e => set('plot', e.target.value)} placeholder="Movie plot…" />
        </Field>
        <Field label="Outline" tier={3} cdataActive>
          <textarea className={textaCls} rows={3} value={str('outline')} onChange={e => set('outline', e.target.value)} placeholder="Brief outline…" />
        </Field>
        <Field label="Original Plot" tier={4} hint="<originalplot>" cdataActive>
          <textarea className={textaCls} rows={3} value={str('originalplot')} onChange={e => set('originalplot', e.target.value)} placeholder="Original language plot…" />
        </Field>
      </Section>

      <div className="section-divider" />

      {/* §3 Classification */}
      <Section
        num={3}
        title="Classification"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}
        meta={`genres: ${data.genres.length} · tags: ${data.tags.length}`}
        collapsed={!!collapsed['s3']}
        onToggle={() => toggleSection('s3')}
      >
        <Field label="Genres" tier={1} hint="→ multiple <genre> elements">
          <ChipInput values={data.genres} onChange={v => set('genres', v)} placeholder="Add genre…" chipClass="chip-genre" />
        </Field>
        <Field label="Tags" tier={2} hint="→ multiple <tag> elements">
          <ChipInput values={data.tags} onChange={v => set('tags', v)} placeholder="Add tag…" chipClass="chip-tag" />
        </Field>
        <Field label="Countries" tier={3}>
          <ChipInput values={data.countries} onChange={v => set('countries', v)} placeholder="Add country…" chipClass="chip-country" />
        </Field>
      </Section>

      <div className="section-divider" />

      {/* §4 Credits & Cast */}
      <Section
        num={4}
        title="Credits & Cast"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        meta={`${data.actors.length} actor${data.actors.length !== 1 ? 's' : ''}`}
        collapsed={!!collapsed['s4']}
        onToggle={() => toggleSection('s4')}
      >
        <Field label="Directors" tier={3}>
          <ChipInput values={data.directors} onChange={v => set('directors', v)} placeholder="Add director…" chipClass="chip-person" />
        </Field>
        <Field label="Writers / Credits" tier={3}>
          <ChipInput values={data.writers} onChange={v => set('writers', v)} placeholder="Add writer…" chipClass="chip-person" />
        </Field>
        <Field label="Actors" tier={2}>
          <ActorsField actors={data.actors} onChange={v => set('actors', v)} />
        </Field>
      </Section>

      <div className="section-divider" />

      {/* §5 Production */}
      <Section
        num={5}
        title="Production"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
        meta="4 fields"
        collapsed={!!collapsed['s5']}
        onToggle={() => toggleSection('s5')}
      >
        <Field label="Studio" tier={1}>
          <ChipInput values={data.studios} onChange={v => set('studios', v)} placeholder="Add studio…" chipClass="chip-studio" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Maker" tier={4}>
            <input className={inputCls} type="text" value={str('maker')} onChange={e => set('maker', e.target.value)} />
          </Field>
          <Field label="Publisher" tier={4}>
            <input className={inputCls} type="text" value={str('publisher')} onChange={e => set('publisher', e.target.value)} />
          </Field>
          <Field label="Label" tier={4}>
            <input className={inputCls} type="text" value={str('label')} onChange={e => set('label', e.target.value)} />
          </Field>
        </div>
      </Section>

      <div className="section-divider" />

      {/* §6 Collection / Series */}
      <Section
        num={6}
        title="Collection / Series"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        meta="3 fields"
        collapsed={!!collapsed['s6']}
        onToggle={() => toggleSection('s6')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Set Name" tier={3} hint="<set><name>">
            <input className={inputCls} type="text" value={data.set?.name ?? ''} onChange={e => set('set', { ...data.set, name: e.target.value })} />
          </Field>
          <Field label="Series" tier={4} hint="<series>">
            <input className={inputCls} type="text" value={str('series')} onChange={e => set('series', e.target.value)} />
          </Field>
        </div>
        <Field label="Set Overview" tier={3}>
          <textarea className={textaCls} rows={2} value={data.set?.overview ?? ''} onChange={e => set('set', { ...data.set, name: data.set?.name ?? '', overview: e.target.value })} placeholder="Collection description…" />
        </Field>
      </Section>

      <div className="section-divider" />

      {/* §7 Identifiers */}
      <Section
        num={7}
        title="Identifiers"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
        meta={`${data.uniqueids.length} uniqueid${data.uniqueids.length !== 1 ? 's' : ''}`}
        collapsed={!!collapsed['s7']}
        onToggle={() => toggleSection('s7')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Video Number (num)" tier={4}>
            <input className={monoCls} type="text" value={str('num')} onChange={e => set('num', e.target.value)} />
          </Field>
          <Field label="JavDB Search ID" tier={4}>
            <input className={monoCls} type="text" value={str('javdbsearchid')} onChange={e => set('javdbsearchid', e.target.value)} />
          </Field>
        </div>
        <Field label="Unique IDs" tier={2} hint='<uniqueid type="" default="">'>
          <UniqueIdField ids={data.uniqueids} onChange={v => set('uniqueids', v)} />
        </Field>
      </Section>

      <div className="section-divider" />

      {/* §8 Media & Images */}
      <Section
        num={8}
        title="Media & Images"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
        meta="4 fields"
        collapsed={!!collapsed['s8']}
        onToggle={() => toggleSection('s8')}
      >
        <ImageField label="Poster" tier={2} hint='→ <poster> + <thumb aspect="poster">' value={str('poster')} onChange={v => set('poster', v)} aspectRatio="poster" />
        <ImageField label="Cover" tier={4} hint="<cover>" value={str('cover')} onChange={v => set('cover', v)} aspectRatio="cover" />
        <ImageField label="Fanart" tier={2} hint="<fanart><thumb>" value={str('fanart')} onChange={v => set('fanart', v)} aspectRatio="wide" />
        <Field label="Trailer URL" tier={3}>
          <input className={inputCls} type="url" value={str('trailer')} onChange={e => set('trailer', e.target.value)} placeholder="https://…" />
        </Field>
      </Section>

      <div className="section-divider" />

      {/* §9 Advanced */}
      <Section
        num={9}
        title="Advanced"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M2 12H4M20 12h2M5.34 5.34L3.93 3.93M18.66 18.66l1.41 1.41M12 2v2M12 20v2"/></svg>}
        collapsed={!!collapsed['s9']}
        onToggle={() => toggleSection('s9')}
      >
        {/* Checkboxes */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {([
            { key: 'lockdata', label: 'Lock Data' },
            { key: 'locktitle', label: 'Lock Title' },
            { key: 'watched', label: 'Watched' },
          ] as { key: keyof NfoData; label: string }[]).map(({ key, label }) => (
            <label key={String(key)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div
                onClick={() => set(key, !data[key] as NfoData[typeof key])}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: `1px solid ${data[key] ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
                  background: data[key] ? 'var(--accent-indigo)' : 'var(--bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {data[key] && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Play Count" tier={3}>
            <input className={monoCls} type="number" value={str('playcount')} onChange={e => set('playcount', e.target.value)} min={0} placeholder="0" />
          </Field>
          <Field label="User Rating (0–10)" tier={3}>
            <input className={monoCls} type="number" value={str('userrating')} onChange={e => set('userrating', e.target.value)} min={0} max={10} step={0.1} placeholder="—" />
          </Field>
          <Field label="Critic Rating" tier={3}>
            <input className={monoCls} type="number" value={str('criticrating')} onChange={e => set('criticrating', e.target.value)} min={0} max={100} placeholder="—" />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Date Added" tier={3}>
            <input className={monoCls} type="text" value={str('dateadded')} onChange={e => set('dateadded', e.target.value)} placeholder="YYYY-MM-DD HH:MM:SS" />
          </Field>
          <Field label="Custom Rating" tier={3}>
            <input className={inputCls} type="text" value={str('customrating')} onChange={e => set('customrating', e.target.value)} placeholder="NC-17" />
          </Field>
        </div>

        <Field label="Source Ratings" tier={3} hint='<ratings><rating name="">'>
          <RatingsField ratings={data.ratings} onChange={v => set('ratings', v)} />
        </Field>
      </Section>

      {/* Bottom spacer */}
      <div style={{ height: 80 }} />
    </div>
  )
}
