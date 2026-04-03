import { useState, useMemo, useCallback } from 'react'
import type { NfoFile } from '../App'
import type { Actor, NfoData } from '../lib/nfoParser'
import {
  diffActors,
  type BatchActorOps,
  type ActorDiff,
  type ApplyResult,
} from '../lib/batchOperations'
import {
  Plus, X, Edit2, RotateCcw, Users, ChevronRight,
  AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react'

// ─── Types & Constants ────────────────────────────────────────────────────────

export interface BatchEditorProps {
  selectedFiles: NfoFile[]
  loadedData: Record<string, NfoData>
  isSaving: boolean
  onApply: (ops: BatchActorOps) => Promise<ApplyResult[]>
}

export const EMPTY_OPS: BatchActorOps = { adds: [], removals: [], edits: {} }

type View = 'edit' | 'confirm' | 'result'

// ─── Shared style tokens ──────────────────────────────────────────────────────

const microHeading: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  fontFamily: "'Syne', sans-serif",
}

const labelSm: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--text-muted)',
  marginBottom: 3,
  display: 'block',
  fontFamily: "'Syne', sans-serif",
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const inputSm: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: 4,
  padding: '5px 8px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 12,
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
}

const iconBtn = (active?: boolean, danger?: boolean): React.CSSProperties => ({
  width: 24,
  height: 24,
  borderRadius: 4,
  border: `1px solid ${danger && active ? 'rgba(239,68,68,0.3)' : active ? 'rgba(99,102,241,0.3)' : 'var(--border-default)'}`,
  background: danger && active ? 'rgba(239,68,68,0.08)' : active ? 'rgba(99,102,241,0.08)' : 'transparent',
  color: danger && active ? 'var(--accent-red)' : active ? 'var(--accent-indigo)' : 'var(--text-muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
})

// ─── ActorRow ─────────────────────────────────────────────────────────────────

interface ActorRowProps {
  diff: ActorDiff
  removed: boolean
  editing: boolean
  stagedEdit: { name: string; role?: string } | undefined
  editDraft: { name: string; role: string }
  roleMode: 'preserve' | 'normalize'
  onStartEdit: () => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onClearEdit: () => void
  onToggleRemoval: () => void
  onEditDraftChange: (draft: { name: string; role: string }) => void
  onRoleModeChange: (mode: 'preserve' | 'normalize') => void
}

function ActorRow({
  diff, removed, editing, stagedEdit, editDraft, roleMode,
  onStartEdit, onCommitEdit, onCancelEdit, onClearEdit,
  onToggleRemoval, onEditDraftChange, onRoleModeChange,
}: ActorRowProps) {
  const name = diff.actor.name
  const displayName = stagedEdit?.name ?? name
  const displayRole = stagedEdit?.role ?? diff.actor.role

  return (
    <div
      style={{
        background: removed
          ? 'rgba(239,68,68,0.05)'
          : stagedEdit
          ? 'rgba(99,102,241,0.05)'
          : 'var(--bg-elevated)',
        border: `1px solid ${removed ? 'rgba(239,68,68,0.25)' : stagedEdit ? 'rgba(99,102,241,0.25)' : 'var(--border-default)'}`,
        borderRadius: 6,
        padding: '8px 10px',
        opacity: removed ? 0.55 : 1,
        transition: 'all 150ms',
      }}
    >
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelSm}>Name</label>
              <input
                style={inputSm}
                value={editDraft.name}
                onChange={e => onEditDraftChange({ ...editDraft, name: e.target.value })}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') onCommitEdit()
                  if (e.key === 'Escape') onCancelEdit()
                }}
              />
            </div>
            <div>
              <label style={labelSm}>Role</label>
              {diff.rolesDiffer ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`rolemode-${diff.actor.name}`}
                        checked={roleMode === 'preserve'}
                        onChange={() => onRoleModeChange('preserve')}
                      />
                      <span style={{ color: 'var(--text-default)' }}>Preserve existing</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`rolemode-${diff.actor.name}`}
                        checked={roleMode === 'normalize'}
                        onChange={() => onRoleModeChange('normalize')}
                      />
                      <span style={{ color: 'var(--text-default)' }}>Set one role</span>
                    </label>
                  </div>
                  {roleMode === 'normalize' && (
                    <input
                      style={inputSm}
                      value={editDraft.role}
                      placeholder="Enter role for all files"
                      onChange={e => onEditDraftChange({ ...editDraft, role: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') onCommitEdit()
                        if (e.key === 'Escape') onCancelEdit()
                      }}
                    />
                  )}
                </div>
              ) : (
                <input
                  style={inputSm}
                  value={editDraft.role}
                  onChange={e => onEditDraftChange({ ...editDraft, role: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onCommitEdit()
                    if (e.key === 'Escape') onCancelEdit()
                  }}
                />
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancelEdit}
              style={{
                padding: '4px 10px', borderRadius: 4,
                border: '1px solid var(--border-default)',
                background: 'transparent', color: 'var(--text-muted)',
                fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onCommitEdit}
              style={{
                padding: '4px 10px', borderRadius: 4,
                border: 'none', background: 'var(--accent-indigo)', color: '#fff',
                fontSize: 11, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Actor info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 13, fontWeight: 500,
                  color: removed ? 'var(--accent-red)' : 'var(--text-primary)',
                  textDecoration: removed ? 'line-through' : 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {displayName}
              </span>
              {stagedEdit && stagedEdit.name !== name && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                  ← {name}
                </span>
              )}
            </div>
            {(displayRole || diff.rolesDiffer) && (
              <div
                style={{
                  fontSize: 11, marginTop: 1,
                  color: diff.rolesDiffer && !stagedEdit
                    ? 'var(--accent-amber)'
                    : diff.rolesDiffer && stagedEdit && stagedEdit.role === undefined
                    ? 'var(--text-muted)'
                    : 'var(--text-secondary)',
                  fontStyle: diff.rolesDiffer && (!stagedEdit || stagedEdit.role === undefined) ? 'italic' : 'normal',
                }}
              >
                {diff.rolesDiffer && !stagedEdit
                  ? 'role varies across files'
                  : diff.rolesDiffer && stagedEdit && stagedEdit.role === undefined
                  ? 'preserving existing roles'
                  : displayRole}
              </div>
            )}
          </div>

          {/* File count badge */}
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: diff.fileCount < diff.totalFiles ? 'var(--accent-amber)' : 'var(--text-muted)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 3,
              padding: '1px 5px',
              flexShrink: 0,
            }}
          >
            {diff.fileCount}/{diff.totalFiles}
          </span>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {stagedEdit && (
              <button onClick={onClearEdit} title="Clear edit" style={iconBtn(true)}>
                <RotateCcw size={11} />
              </button>
            )}
            {!removed && (
              <button onClick={onStartEdit} title="Edit actor" style={iconBtn()}>
                <Edit2 size={11} />
              </button>
            )}
            <button
              onClick={onToggleRemoval}
              title={removed ? 'Undo remove' : 'Remove from all files'}
              style={iconBtn(removed, true)}
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pendingSummary(ops: BatchActorOps): string {
  const parts: string[] = []
  if (ops.adds.length > 0) parts.push(`+${ops.adds.length}`)
  if (ops.removals.length > 0) parts.push(`\u2212${ops.removals.length}`)
  if (Object.keys(ops.edits).length > 0) parts.push(`~${Object.keys(ops.edits).length}`)
  return parts.join('  ')
}

function hasPendingOps(ops: BatchActorOps): boolean {
  return ops.adds.length > 0 || ops.removals.length > 0 || Object.keys(ops.edits).length > 0
}

const stickyFooter: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '12px 32px 16px',
  background: 'linear-gradient(transparent, var(--bg-surface) 35%)',
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
}

const primaryBtn = (active: boolean, saving?: boolean): React.CSSProperties => ({
  padding: '9px 20px',
  borderRadius: 5,
  border: 'none',
  background: active && !saving ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
  color: active && !saving ? '#fff' : 'var(--text-muted)',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "'Syne', sans-serif",
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  cursor: active && !saving ? 'pointer' : 'not-allowed',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'background 150ms',
})

const secondaryBtn: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 5,
  border: '1px solid var(--border-default)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: "'Syne', sans-serif",
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
}

// ─── BatchEditor ──────────────────────────────────────────────────────────────

export default function BatchEditor({
  selectedFiles,
  loadedData,
  isSaving,
  onApply,
}: BatchEditorProps) {
  const [view, setView] = useState<View>('edit')
  const [ops, setOps] = useState<BatchActorOps>(EMPTY_OPS)
  const [results, setResults] = useState<ApplyResult[]>([])
  const [applyError, setApplyError] = useState<string | null>(null)

  // Inline edit state
  const [editingActor, setEditingActor] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', role: '' })
  const [roleMode, setRoleMode] = useState<'preserve' | 'normalize'>('preserve')

  // Add-actor form state
  const [addName, setAddName] = useState('')
  const [addRole, setAddRole] = useState('')

  const actorDiffs = useMemo(() => diffActors(loadedData), [loadedData])
  const totalFiles = selectedFiles.length

  const inAllFiles = useMemo(
    () => actorDiffs.filter(d => d.fileCount === d.totalFiles),
    [actorDiffs],
  )
  const inSomeFiles = useMemo(
    () => actorDiffs.filter(d => d.fileCount < d.totalFiles),
    [actorDiffs],
  )

  // ── Ops helpers ─────────────────────────────────────────────────────────────

  const toggleRemoval = useCallback((name: string) => {
    setOps(prev => {
      const already = prev.removals.includes(name)
      return {
        ...prev,
        removals: already ? prev.removals.filter(n => n !== name) : [...prev.removals, name],
      }
    })
  }, [])

  const startEdit = useCallback((diff: ActorDiff) => {
    const existing = ops.edits[diff.actor.name]
    setEditingActor(diff.actor.name)
    
    // Determine initial mode and role
    if (existing) {
      // Restoring a previously staged edit
      const hasRole = existing.role !== undefined
      setRoleMode(hasRole ? 'normalize' : 'preserve')
      setEditDraft({
        name: existing.name,
        role: existing.role ?? diff.actor.role ?? '',
      })
    } else if (diff.rolesDiffer) {
      // Mixed-role actor, start in preserve mode
      setRoleMode('preserve')
      setEditDraft({
        name: diff.actor.name,
        role: diff.actor.role ?? '',
      })
    } else {
      // Uniform role, start in normalize mode
      setRoleMode('normalize')
      setEditDraft({
        name: diff.actor.name,
        role: diff.actor.role ?? '',
      })
    }
  }, [ops.edits])

  const commitEdit = useCallback((originalName: string) => {
    const name = editDraft.name.trim()
    if (!name) return
    const diff = actorDiffs.find(d => d.actor.name === originalName)
    if (!diff) return
    
    // Determine if this is a no-op
    const nameUnchanged = name === originalName
    const preservingRoles = roleMode === 'preserve'
    const roleUnchanged = editDraft.role === (diff.actor.role ?? '')
    const unchanged = nameUnchanged && (preservingRoles || roleUnchanged)
    
    setOps(prev => {
      const next = { ...prev, edits: { ...prev.edits } }
      if (unchanged) {
        delete next.edits[originalName]
      } else {
        next.edits[originalName] = {
          name,
          ...(roleMode === 'normalize' && { role: editDraft.role }),
        }
      }
      return next
    })
    setEditingActor(null)
  }, [editDraft, roleMode, actorDiffs])

  const cancelEdit = useCallback(() => {
    setEditingActor(null)
  }, [])

  const clearActorEdit = useCallback((originalName: string) => {
    setOps(prev => {
      const next = { ...prev, edits: { ...prev.edits } }
      delete next.edits[originalName]
      return next
    })
  }, [])

  const addActor = useCallback(() => {
    const name = addName.trim()
    if (!name) return
    setOps(prev => ({
      ...prev,
      adds: [...prev.adds, { name, role: addRole.trim() || undefined, type: 'Actor', order: 0 }],
    }))
    setAddName('')
    setAddRole('')
  }, [addName, addRole])

  const removePendingAdd = useCallback((index: number) => {
    setOps(prev => ({ ...prev, adds: prev.adds.filter((_, i) => i !== index) }))
  }, [])

  const handleApply = useCallback(async () => {
    try {
      setApplyError(null)
      const r = await onApply(ops)
      setResults(r)
      setView('result')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setApplyError(message)
    }
  }, [ops, onApply])

  const handleReset = useCallback(() => {
    setOps(EMPTY_OPS)
    setView('edit')
    setResults([])
    setApplyError(null)
    setEditingActor(null)
    setAddName('')
    setAddRole('')
  }, [])

  // ── Shared panel wrapper ─────────────────────────────────────────────────────

  const panelHeader = (title: string, meta?: string) => (
    <div
      style={{
        padding: '14px 32px 10px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={14} style={{ color: 'var(--text-muted)' }} />
        <span className="font-title" style={microHeading}>{title}</span>
      </div>
      {meta && (
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {meta}
        </span>
      )}
    </div>
  )

  // ── Edit View ────────────────────────────────────────────────────────────────

  if (view === 'edit') {
    const pending = pendingSummary(ops)
    const hasOps = hasPendingOps(ops)
    const fileLabel = `${totalFiles} file${totalFiles !== 1 ? 's' : ''}`

    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column',
          height: '100%', position: 'relative',
          background: 'var(--bg-surface)', overflow: 'hidden',
        }}
      >
        {panelHeader('Batch Actor Edit', fileLabel)}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>

          {/* IN ALL FILES */}
          {inAllFiles.length > 0 && (
            <div style={{ padding: '18px 32px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="font-title" style={microHeading}>In all files</span>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {inAllFiles.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {inAllFiles.map(diff => (
                  <ActorRow
                    key={diff.actor.name}
                    diff={diff}
                    removed={ops.removals.includes(diff.actor.name)}
                    editing={editingActor === diff.actor.name}
                    stagedEdit={ops.edits[diff.actor.name]}
                    editDraft={editDraft}
                    roleMode={roleMode}
                    onStartEdit={() => startEdit(diff)}
                    onCommitEdit={() => commitEdit(diff.actor.name)}
                    onCancelEdit={cancelEdit}
                    onClearEdit={() => clearActorEdit(diff.actor.name)}
                    onToggleRemoval={() => toggleRemoval(diff.actor.name)}
                    onEditDraftChange={setEditDraft}
                    onRoleModeChange={setRoleMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* IN SOME FILES */}
          {inSomeFiles.length > 0 && (
            <div style={{ padding: '18px 32px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="font-title" style={microHeading}>In some files</span>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--accent-amber)' }}>
                  {inSomeFiles.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {inSomeFiles.map(diff => (
                  <ActorRow
                    key={diff.actor.name}
                    diff={diff}
                    removed={ops.removals.includes(diff.actor.name)}
                    editing={editingActor === diff.actor.name}
                    stagedEdit={ops.edits[diff.actor.name]}
                    editDraft={editDraft}
                    roleMode={roleMode}
                    onStartEdit={() => startEdit(diff)}
                    onCommitEdit={() => commitEdit(diff.actor.name)}
                    onCancelEdit={cancelEdit}
                    onClearEdit={() => clearActorEdit(diff.actor.name)}
                    onToggleRemoval={() => toggleRemoval(diff.actor.name)}
                    onEditDraftChange={setEditDraft}
                    onRoleModeChange={setRoleMode}
                  />
                ))}
              </div>
            </div>
          )}

          {actorDiffs.length === 0 && (
            <div
              style={{
                padding: '48px 32px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: 13,
              }}
            >
              No actors found in selected files.
            </div>
          )}

          {/* Divider */}
          <div style={{ margin: '8px 32px 0', borderTop: '1px solid var(--border-subtle)' }} />

          {/* PENDING ADDS */}
          <div style={{ padding: '14px 32px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: ops.adds.length > 0 ? 10 : 12 }}>
              <span className="font-title" style={microHeading}>Pending adds</span>
              {ops.adds.length > 0 && (
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10, color: 'var(--accent-green)',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 3, padding: '0 5px',
                  }}
                >
                  +{ops.adds.length}
                </span>
              )}
            </div>

            {/* Queued actor list */}
            {ops.adds.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {ops.adds.map((actor, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(16,185,129,0.05)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 6, padding: '8px 10px',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-green)', fontFamily: "'DM Sans', sans-serif" }}>
                        {actor.name}
                      </span>
                      {actor.role && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>
                          {actor.role}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removePendingAdd(i)}
                      style={iconBtn(true, true)}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add-actor form */}
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px dashed var(--border-default)',
                borderRadius: 6, padding: '10px 12px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={labelSm}>Name</label>
                  <input
                    className="field-input"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    placeholder="Actor name..."
                    onKeyDown={e => e.key === 'Enter' && addActor()}
                  />
                </div>
                <div>
                  <label style={labelSm}>Role</label>
                  <input
                    className="field-input"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                    value={addRole}
                    onChange={e => setAddRole(e.target.value)}
                    placeholder="Role / character..."
                    onKeyDown={e => e.key === 'Enter' && addActor()}
                  />
                </div>
              </div>
              <button
                className="add-btn"
                onClick={addActor}
                disabled={!addName.trim()}
                style={{ opacity: addName.trim() ? 1 : 0.5 }}
              >
                <Plus size={12} />
                Add to all files
              </button>
            </div>
          </div>
        </div>

        {/* Sticky apply footer */}
        <div style={stickyFooter}>
          <button
            onClick={() => setView('confirm')}
            disabled={!hasOps || isSaving}
            style={primaryBtn(hasOps, isSaving)}
          >
            {hasOps && (
              <span
                className="font-mono"
                style={{
                  fontSize: 11, opacity: 0.85,
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 3, padding: '1px 6px',
                }}
              >
                {pending}
              </span>
            )}
            Apply Changes
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    )
  }

  // ── Confirm View ─────────────────────────────────────────────────────────────

  if (view === 'confirm') {
    const fileLabel = `${totalFiles} file${totalFiles !== 1 ? 's' : ''}`

    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column',
          height: '100%', position: 'relative',
          background: 'var(--bg-surface)', overflow: 'hidden',
        }}
      >
        {panelHeader('Confirm Changes', fileLabel)}

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 80px' }}>

          {/* Additions */}
          {ops.adds.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span className="font-title" style={microHeading}>Additions</span>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--accent-green)' }}>
                  +{ops.adds.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ops.adds.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(16,185,129,0.05)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Plus size={11} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 500 }}>
                      {a.name}
                    </span>
                    {a.role && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.role}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removals */}
          {ops.removals.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span className="font-title" style={microHeading}>Removals</span>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--accent-red)' }}>
                  &minus;{ops.removals.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ops.removals.map(name => (
                  <div
                    key={name}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(239,68,68,0.05)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <X size={11} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--accent-red)', fontWeight: 500 }}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edits */}
          {Object.keys(ops.edits).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span className="font-title" style={microHeading}>Edits</span>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--accent-indigo)' }}>
                  ~{Object.keys(ops.edits).length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(ops.edits).map(([original, update]) => {
                  const diff = actorDiffs.find(d => d.actor.name === original)
                  const preservingRoles = update.role === undefined && diff?.rolesDiffer
                  const normalizingToEmpty = update.role === ''
                  return (
                    <div
                      key={original}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(99,102,241,0.05)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Edit2 size={11} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{original}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
                      <span style={{ fontSize: 12, color: 'var(--accent-indigo)', fontWeight: 500 }}>
                        {update.name}
                      </span>
                      {update.role !== undefined && update.role !== '' ? (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{update.role}</span>
                      ) : normalizingToEmpty ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          (clearing role)
                        </span>
                      ) : preservingRoles ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          (preserving existing roles)
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Warning */}
          <div
            style={{
              marginTop: 8, padding: '10px 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <AlertTriangle
              size={13}
              style={{ display: 'inline', marginRight: 6, color: 'var(--accent-amber)', verticalAlign: 'text-bottom' }}
            />
            These changes will be applied to all{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalFiles}</strong>{' '}
            selected files. This cannot be automatically undone.
          </div>

          {/* Error Display */}
          {applyError && (
            <div
              style={{
                marginTop: 12, padding: '12px 14px',
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 6, fontSize: 12,
                color: 'var(--accent-red)',
                lineHeight: 1.5,
              }}
            >
              <XCircle
                size={13}
                style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }}
              />
              <strong>Error:</strong> {applyError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={stickyFooter}>
          <button onClick={() => setView('edit')} style={secondaryBtn}>
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isSaving}
            style={primaryBtn(true, isSaving)}
          >
            {isSaving ? 'Applying...' : 'Apply to All Files'}
          </button>
        </div>
      </div>
    )
  }

  // ── Result View ──────────────────────────────────────────────────────────────

  const succeeded = results.filter(r => r.success && r.conflicts.length === 0)
  const conflicted = results.filter(r => r.success && r.conflicts.length > 0)
  const failed = results.filter(r => !r.success)

  const summaryCards = [
    { label: 'Succeeded', count: succeeded.length, color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    { label: 'Conflicts', count: conflicted.length, color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    { label: 'Failed', count: failed.length, color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  ]

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100%', position: 'relative',
        background: 'var(--bg-surface)', overflow: 'hidden',
      }}
    >
      {panelHeader('Apply Results', `${results.length} file${results.length !== 1 ? 's' : ''}`)}

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 80px' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {summaryCards.map(({ label, count, color, bg, border }) => (
            <div
              key={label}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 6, padding: '10px 12px', textAlign: 'center',
              }}
            >
              <div className="font-mono" style={{ fontSize: 22, fontWeight: 500, color, lineHeight: 1.2 }}>
                {count}
              </div>
              <div
                className="font-title"
                style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color, opacity: 0.75, marginTop: 3 }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Per-file breakdown */}
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {results.map(r => {
              const isOk = r.success && r.conflicts.length === 0
              const hasConflict = r.success && r.conflicts.length > 0
              const isFailed = !r.success
              const color = isOk ? 'var(--accent-green)' : hasConflict ? 'var(--accent-amber)' : 'var(--accent-red)'
              const bg = isOk ? 'rgba(16,185,129,0.04)' : hasConflict ? 'rgba(245,158,11,0.04)' : 'rgba(239,68,68,0.04)'
              const border = isOk ? 'rgba(16,185,129,0.15)' : hasConflict ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'
              const Icon = isOk ? CheckCircle2 : hasConflict ? AlertTriangle : XCircle
              const parts = r.filePath.replace(/\\/g, '/').split('/')
              const displayPath = parts.slice(-2).join(' / ')

              return (
                <div
                  key={r.filePath}
                  style={{
                    padding: '7px 10px', background: bg,
                    border: `1px solid ${border}`, borderRadius: 5,
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}
                >
                  <Icon size={13} style={{ color, flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 11, color: 'var(--text-secondary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {displayPath}
                    </div>
                    {hasConflict && (
                      <div style={{ fontSize: 11, color: 'var(--accent-amber)', marginTop: 2 }}>
                        Conflicts: {r.conflicts.join(', ')}
                      </div>
                    )}
                    {isFailed && r.error && (
                      <div style={{ fontSize: 11, color: 'var(--accent-red)', marginTop: 2 }}>
                        {r.error}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={stickyFooter}>
        <button onClick={handleReset} style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RotateCcw size={12} />
          New Batch Edit
        </button>
        <button onClick={() => setView('edit')} style={primaryBtn(true)}>
          Done
        </button>
      </div>
    </div>
  )
}
