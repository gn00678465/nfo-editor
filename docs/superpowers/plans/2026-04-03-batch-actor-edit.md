# Batch Actor Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Batch Edit mode that lets users multi-select NFO files and apply actor changes (add/remove/edit) across all selected files at once, with a pre-write confirmation and post-write result summary.

**Architecture:** Pure business logic lives in `src/lib/batchOperations.ts` (testable with no React/Electron dependencies). `BatchEditor.tsx` handles UI state (pending ops, confirm/result views). `App.tsx` owns file I/O and state reconciliation. `FileList.tsx` gets new props for the batch toggle and checkboxes.

**Tech Stack:** React 18, TypeScript, Vitest (test runner), shadcn/ui (Button, ScrollArea, Separator already present), Lucide icons (already present)

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/lib/batchOperations.ts` | Pure types + functions: `diffActors`, `applyBatchActorOps` |
| Create | `src/lib/__tests__/batchOperations.test.ts` | Unit tests for pure functions |
| Modify | `src/App.tsx` | Add `batchMode`, `batchSelectedFiles`, `isBatchWriting` state; `handleBatchApply`; render `BatchEditor` |
| Modify | `src/components/FileList.tsx` | Add batch toggle button, per-file checkboxes, select-all/clear |
| Create | `src/components/BatchEditor.tsx` | Differential actor display, pending ops, confirm panel, result panel |

---

## Task 1: Pure functions — `batchOperations.ts`

**Files:**
- Create: `src/lib/batchOperations.ts`
- Create: `src/lib/__tests__/batchOperations.test.ts`

### Step 1.1: Write failing tests for `diffActors`

- [ ] Create `src/lib/__tests__/batchOperations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { diffActors, applyBatchActorOps } from '../batchOperations'
import type { NfoData } from '../nfoParser'

function makeNfoData(actors: { name: string; role?: string }[]): NfoData {
  return {
    genres: [], tags: [], countries: [], directors: [], writers: [],
    actors: actors.map(a => ({ name: a.name, role: a.role })),
    studios: [], uniqueids: [], ratings: [],
  }
}

describe('diffActors', () => {
  it('returns empty array for empty selection', () => {
    expect(diffActors({})).toEqual([])
  })

  it('marks actor as in all files when present in every file', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
    }
    const result = diffActors(data)
    expect(result).toHaveLength(1)
    expect(result[0].actor.name).toBe('Alice')
    expect(result[0].fileCount).toBe(2)
    expect(result[0].totalFiles).toBe(2)
    expect(result[0].rolesDiffer).toBe(false)
  })

  it('marks actor as in some files when not in all files', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice' }]),
      'b.nfo': makeNfoData([{ name: 'Bob' }]),
    }
    const result = diffActors(data)
    expect(result).toHaveLength(2)
    const alice = result.find(r => r.actor.name === 'Alice')!
    expect(alice.fileCount).toBe(1)
    expect(alice.totalFiles).toBe(2)
  })

  it('sets rolesDiffer=true when same name has different roles across files', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Support' }]),
    }
    const result = diffActors(data)
    expect(result[0].rolesDiffer).toBe(true)
  })

  it('uses first-file data for display actor', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice', role: 'First' }]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Second' }]),
    }
    const result = diffActors(data)
    expect(result[0].actor.role).toBe('First')
  })

  it('sorts: in-all-files actors first, then in-some-files', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice' }, { name: 'Bob' }]),
      'b.nfo': makeNfoData([{ name: 'Alice' }]),
    }
    const result = diffActors(data)
    expect(result[0].actor.name).toBe('Alice') // in all files
    expect(result[1].actor.name).toBe('Bob')   // in some files
  })
})

describe('applyBatchActorOps', () => {
  it('adds a new actor to the file', () => {
    const data = makeNfoData([{ name: 'Alice' }])
    const ops = { adds: [{ name: 'Bob', role: 'Support' }], removals: [], edits: {} }
    const { data: result, conflicts } = applyBatchActorOps(data, ops)
    expect(result.actors).toHaveLength(2)
    expect(result.actors[1].name).toBe('Bob')
    expect(result.actors[1].order).toBe(1) // existingActors.length before add
    expect(conflicts).toEqual([])
  })

  it('skips add if actor name already exists in file (duplicate guard)', () => {
    const data = makeNfoData([{ name: 'Alice' }])
    const ops = { adds: [{ name: 'Alice', role: 'Other' }], removals: [], edits: {} }
    const { data: result, conflicts } = applyBatchActorOps(data, ops)
    expect(result.actors).toHaveLength(1)
    expect(conflicts).toContain('Alice')
  })

  it('removes an actor by name', () => {
    const data = makeNfoData([{ name: 'Alice' }, { name: 'Bob' }])
    const ops = { adds: [], removals: ['Bob'], edits: {} }
    const { data: result } = applyBatchActorOps(data, ops)
    expect(result.actors).toHaveLength(1)
    expect(result.actors[0].name).toBe('Alice')
  })

  it('skips removal silently if actor not in file', () => {
    const data = makeNfoData([{ name: 'Alice' }])
    const ops = { adds: [], removals: ['Bob'], edits: {} }
    const { data: result, conflicts } = applyBatchActorOps(data, ops)
    expect(result.actors).toHaveLength(1)
    expect(conflicts).toEqual([])
  })

  it('edits actor name and role while preserving other fields', () => {
    const data: NfoData = {
      ...makeNfoData([]),
      actors: [{ name: 'Alice', role: 'Lead', thumb: 'http://img', order: 0, tmdbid: '123' }],
    }
    const ops = { adds: [], removals: [], edits: { Alice: { name: 'Alicia', role: 'Star' } } }
    const { data: result } = applyBatchActorOps(data, ops)
    expect(result.actors[0].name).toBe('Alicia')
    expect(result.actors[0].role).toBe('Star')
    expect(result.actors[0].thumb).toBe('http://img')   // preserved
    expect(result.actors[0].tmdbid).toBe('123')          // preserved
    expect(result.actors[0].order).toBe(0)               // preserved
  })

  it('skips edit and reports conflict if target name already exists in file', () => {
    const data = makeNfoData([{ name: 'Alice' }, { name: 'Alicia' }])
    const ops = { adds: [], removals: [], edits: { Alice: { name: 'Alicia', role: 'Star' } } }
    const { data: result, conflicts } = applyBatchActorOps(data, ops)
    expect(result.actors[0].name).toBe('Alice') // unchanged
    expect(conflicts).toContain('Alice')
  })

  it('does not mutate the input NfoData', () => {
    const data = makeNfoData([{ name: 'Alice' }])
    const original = JSON.stringify(data)
    const ops = { adds: [{ name: 'Bob' }], removals: [], edits: {} }
    applyBatchActorOps(data, ops)
    expect(JSON.stringify(data)).toBe(original)
  })
})
```

### Step 1.2: Run tests — expect all to fail

- [ ] Run: `npx vitest run src/lib/__tests__/batchOperations.test.ts`
- Expected: FAIL — module not found

### Step 1.3: Implement `src/lib/batchOperations.ts`

- [ ] Create `src/lib/batchOperations.ts`:

```typescript
import type { Actor, NfoData } from './nfoParser'

export interface BatchActorOps {
  adds: Actor[]
  removals: string[]
  edits: Record<string, Pick<Actor, 'name' | 'role'>>
}

export interface ActorDiff {
  actor: Actor
  rolesDiffer: boolean
  fileCount: number
  totalFiles: number
}

export interface ApplyResult {
  filePath: string
  success: boolean
  conflicts: string[]
  error?: string
}

/**
 * Computes a differential actor list across all loaded NFO files.
 * loadedData: { [filePath]: NfoData }
 * Returns actors sorted: in-all-files first, then in-some-files.
 */
export function diffActors(loadedData: Record<string, NfoData>): ActorDiff[] {
  const filePaths = Object.keys(loadedData)
  const totalFiles = filePaths.length
  if (totalFiles === 0) return []

  // Collect actor data per name: track first-seen actor and count of files + roles
  const actorMap = new Map<string, { actor: Actor; roles: Set<string>; count: number }>()

  for (const filePath of filePaths) {
    const actors = loadedData[filePath].actors
    for (const actor of actors) {
      const existing = actorMap.get(actor.name)
      if (existing) {
        existing.count += 1
        existing.roles.add(actor.role ?? '')
      } else {
        actorMap.set(actor.name, {
          actor,
          roles: new Set([actor.role ?? '']),
          count: 1,
        })
      }
    }
  }

  const diffs: ActorDiff[] = Array.from(actorMap.values()).map(({ actor, roles, count }) => ({
    actor,
    rolesDiffer: roles.size > 1,
    fileCount: count,
    totalFiles,
  }))

  // Sort: in-all-files first, then by name
  return diffs.sort((a, b) => {
    const aAll = a.fileCount === a.totalFiles ? 0 : 1
    const bAll = b.fileCount === b.totalFiles ? 0 : 1
    if (aAll !== bAll) return aAll - bAll
    return a.actor.name.localeCompare(b.actor.name)
  })
}

/**
 * Applies batch actor operations to a single NfoData record.
 * Returns a new NfoData (immutable) and a list of conflict actor names.
 */
export function applyBatchActorOps(
  data: NfoData,
  ops: BatchActorOps,
): { data: NfoData; conflicts: string[] } {
  const conflicts: string[] = []
  let actors = [...data.actors]

  // 1. Apply removals
  if (ops.removals.length > 0) {
    const removalSet = new Set(ops.removals)
    actors = actors.filter(a => !removalSet.has(a.name))
  }

  // 2. Apply edits (partial: name + role only, preserve other fields)
  if (Object.keys(ops.edits).length > 0) {
    actors = actors.map(actor => {
      const edit = ops.edits[actor.name]
      if (!edit) return actor
      // Conflict check: if new name already exists elsewhere in this file
      const nameChanged = edit.name !== actor.name
      if (nameChanged && actors.some(a => a !== actor && a.name === edit.name)) {
        conflicts.push(actor.name)
        return actor
      }
      return { ...actor, name: edit.name, role: edit.role }
    })
  }

  // 3. Apply adds (with duplicate guard)
  for (const add of ops.adds) {
    if (actors.some(a => a.name === add.name)) {
      conflicts.push(add.name)
      continue
    }
    actors = [...actors, { ...add, order: actors.length }]
  }

  return { data: { ...data, actors }, conflicts }
}
```

### Step 1.4: Run tests — expect all to pass

- [ ] Run: `npx vitest run src/lib/__tests__/batchOperations.test.ts`
- Expected: all 12 tests PASS

### Step 1.5: Commit

- [ ] `git add src/lib/batchOperations.ts src/lib/__tests__/batchOperations.test.ts`
- [ ] `git commit -m "feat: add batchOperations pure functions with tests"`

---

## Task 2: Modify `FileList.tsx` — batch toggle + checkboxes

**Files:**
- Modify: `src/components/FileList.tsx`

### Step 2.1: Add new props to FileList interface and render batch controls

- [ ] Open `src/components/FileList.tsx` and extend the `FileListProps` interface:

```typescript
interface FileListProps {
  // ...existing props...
  batchMode: boolean
  batchSelectedFiles: Set<string>
  isBatchWriting: boolean
  onBatchToggle: () => void
  onBatchSelectFile: (filePath: string, selected: boolean) => void | Promise<void>
  onBatchSelectAll: () => void
  onBatchClear: () => void
}
```

- [ ] Add the "Batch Edit" toggle button below the "Select Folder" button (inside the header `<div>`):

```tsx
{allFiles.length > 0 && (
  <Button
    variant="outline"
    onClick={onBatchToggle}
    disabled={isBatchWriting}
    className="no-drag w-full justify-center gap-2 font-ui"
    style={{
      background: batchMode ? 'var(--bg-elevated)' : 'transparent',
      border: `1px solid ${batchMode ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
      color: batchMode ? 'var(--accent-indigo)' : 'var(--text-muted)',
      borderRadius: 5,
      fontSize: 12,
      fontWeight: 500,
      height: 34,
      padding: '0 12px',
    }}
  >
    <CheckSquare className="h-3.5 w-3.5 shrink-0" />
    <span className="leading-none">{batchMode ? 'Exit Batch Edit' : 'Batch Edit'}</span>
  </Button>
)}
```

- [ ] Add `CheckSquare` to the lucide-react import.

- [ ] Below the file count row, when `batchMode` is true, add the select-all/clear + count row:

```tsx
{batchMode && (
  <div
    className="font-mono flex items-center justify-between"
    style={{
      padding: '4px 12px',
      fontSize: 11,
      color: 'var(--text-muted)',
      borderBottom: '1px solid var(--border-subtle)',
    }}
  >
    <span>{batchSelectedFiles.size} selected</span>
    <div className="flex gap-3">
      <button
        onClick={onBatchSelectAll}
        style={{ fontSize: 11, color: 'var(--accent-indigo)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        All
      </button>
      <button
        onClick={onBatchClear}
        style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        Clear
      </button>
    </div>
  </div>
)}
```

- [ ] In the file list items, when `batchMode` is true, prepend a checkbox. Replace the existing `<button>` render with:

```tsx
{files.map(file => {
  const isSelected = selectedFile?.filePath === file.filePath
  const isDirtyFile = dirtyFiles.has(file.filePath)
  const isBatchChecked = batchSelectedFiles.has(file.filePath)
  return (
    <button
      key={file.filePath}
      onClick={() => batchMode ? onBatchSelectFile(file.filePath, !isBatchChecked) : onSelectFile(file)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        paddingLeft: batchMode ? 8 : 12,
        background: isBatchChecked
          ? 'var(--bg-elevated)'
          : isSelected ? 'var(--bg-elevated)' : 'transparent',
        borderLeft: isBatchChecked
          ? '3px solid var(--accent-indigo)'
          : isSelected ? '3px solid var(--accent-amber)' : '3px solid transparent',
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
        transition: 'background 100ms',
      }}
      onMouseEnter={e => {
        if (!isBatchChecked && !isSelected)
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={e => {
        if (!isBatchChecked && !isSelected)
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {batchMode && (
        <span
          style={{
            width: 14, height: 14, flexShrink: 0,
            border: `1.5px solid ${isBatchChecked ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
            borderRadius: 3,
            background: isBatchChecked ? 'var(--accent-indigo)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isBatchChecked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!batchMode && isDirtyFile && (
          <span
            style={{
              position: 'absolute', top: 12, right: 10,
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent-amber)',
            }}
          />
        )}
        <div
          className="font-mono"
          style={{
            fontSize: 13, fontWeight: 500,
            color: isBatchChecked ? 'var(--accent-indigo)' : isSelected ? 'var(--accent-amber)' : 'var(--text-primary)',
            letterSpacing: '0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {file.folderName}
        </div>
        <div
          className="font-ui"
          style={{
            fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
          title={file.filePath}
        >
          {file.filePath}
        </div>
      </div>
    </button>
  )
})}
```

### Step 2.2: Build check

- [ ] Run: `npx tsc --noEmit`
- Expected: no errors (or only pre-existing errors unrelated to this change)

### Step 2.3: Commit

- [ ] `git add src/components/FileList.tsx`
- [ ] `git commit -m "feat(FileList): add batch mode toggle and per-file checkboxes"`

---

## Task 3: Create `BatchEditor.tsx`

**Files:**
- Create: `src/components/BatchEditor.tsx`

This component owns the pending-ops state, differential actor view, confirmation panel, and result panel. It receives loaded data and an `onApply` callback from App.

### Step 3.1: Create `src/components/BatchEditor.tsx`

- [ ] Create the file:

```typescript
import { useState, useMemo, useCallback } from 'react'
import type { NfoFile } from '../App'
import type { NfoData } from '../lib/nfoParser'
import {
  diffActors,
  type BatchActorOps,
  type ActorDiff,
  type ApplyResult,
} from '../lib/batchOperations'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Pencil, X, Check, Plus } from 'lucide-react'

interface BatchEditorProps {
  selectedFiles: NfoFile[]
  loadedData: Record<string, NfoData>
  isSaving: boolean
  onApply: (ops: BatchActorOps) => Promise<ApplyResult[]>
}

type View = 'edit' | 'confirm' | 'result'

const EMPTY_OPS: BatchActorOps = { adds: [], removals: [], edits: {} }

export default function BatchEditor({
  selectedFiles,
  loadedData,
  isSaving,
  onApply,
}: BatchEditorProps) {
  const [ops, setOps] = useState<BatchActorOps>(EMPTY_OPS)
  const [view, setView] = useState<View>('edit')
  const [results, setResults] = useState<ApplyResult[]>([])
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; role: string }>({ name: '', role: '' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<{ name: string; role: string }>({ name: '', role: '' })

  const actorDiffs = useMemo(
    () => diffActors(loadedData),
    [loadedData],
  )

  const hasPendingOps =
    ops.adds.length > 0 || ops.removals.length > 0 || Object.keys(ops.edits).length > 0

  const pendingSummary = [
    ops.adds.length > 0 ? `+${ops.adds.length} actor${ops.adds.length > 1 ? 's' : ''}` : '',
    ops.removals.length > 0 ? `−${ops.removals.length} actor${ops.removals.length > 1 ? 's' : ''}` : '',
    Object.keys(ops.edits).length > 0
      ? `${Object.keys(ops.edits).length} edited`
      : '',
  ]
    .filter(Boolean)
    .join(', ')

  // --- Actor action handlers ---

  const handleStartEdit = useCallback((diff: ActorDiff) => {
    const currentEdit = ops.edits[diff.actor.name]
    setEditingName(diff.actor.name)
    setEditForm({
      name: currentEdit?.name ?? diff.actor.name,
      role: currentEdit?.role ?? diff.actor.role ?? '',
    })
  }, [ops.edits])

  const handleConfirmEdit = useCallback(() => {
    if (!editingName) return
    setOps(prev => ({
      ...prev,
      edits: { ...prev.edits, [editingName]: { name: editForm.name, role: editForm.role } },
    }))
    setEditingName(null)
  }, [editingName, editForm])

  const handleCancelEdit = useCallback(() => setEditingName(null), [])

  const handleToggleRemove = useCallback((name: string) => {
    setOps(prev => {
      const already = prev.removals.includes(name)
      return {
        ...prev,
        removals: already ? prev.removals.filter(r => r !== name) : [...prev.removals, name],
      }
    })
  }, [])

  const handleUndoEdit = useCallback((originalName: string) => {
    setOps(prev => {
      const { [originalName]: _removed, ...rest } = prev.edits
      return { ...prev, edits: rest }
    })
  }, [])

  const handleAddActor = useCallback(() => {
    if (!addForm.name.trim()) return
    setOps(prev => ({
      ...prev,
      adds: [...prev.adds, { name: addForm.name.trim(), role: addForm.role.trim() || undefined }],
    }))
    setAddForm({ name: '', role: '' })
    setShowAddForm(false)
  }, [addForm])

  const handleRemovePendingAdd = useCallback((name: string) => {
    setOps(prev => ({ ...prev, adds: prev.adds.filter(a => a.name !== name) }))
  }, [])

  const handleApply = useCallback(async () => {
    const applyResults = await onApply(ops)
    setResults(applyResults)
    setOps(EMPTY_OPS)
    setView('result')
  }, [ops, onApply])

  const handleReset = useCallback(() => {
    setOps(EMPTY_OPS)
    setView('edit')
    setResults([])
  }, [])

  // --- Render helpers ---

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 12,
    color: 'var(--text-primary)',
    width: '100%',
  }

  function renderActorRow(diff: ActorDiff) {
    const { actor, fileCount, totalFiles, rolesDiffer } = diff
    const isPendingRemoval = ops.removals.includes(actor.name)
    const pendingEdit = ops.edits[actor.name]
    const isEditing = editingName === actor.name
    const displayName = pendingEdit?.name ?? actor.name
    const displayRole = pendingEdit?.role ?? actor.role ?? ''

    return (
      <div
        key={actor.name}
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          opacity: isPendingRemoval ? 0.4 : 1,
          background: isPendingRemoval ? 'var(--bg-base)' : 'transparent',
        }}
      >
        {isEditing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              autoFocus
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={editForm.role}
              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
              placeholder="Role"
            />
            <button onClick={handleConfirmEdit} style={{ color: 'var(--accent-green)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Check className="h-4 w-4" />
            </button>
            <button onClick={handleCancelEdit} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                className="font-mono"
                style={{
                  fontSize: 13, fontWeight: 500,
                  color: pendingEdit ? 'var(--accent-indigo)' : 'var(--text-primary)',
                  textDecoration: isPendingRemoval ? 'line-through' : 'none',
                }}
              >
                {displayName}
              </span>
              {displayRole && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                  {rolesDiffer && !pendingEdit ? '~' : ''}{displayRole}
                </span>
              )}
              {fileCount < totalFiles && (
                <span
                  style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-elevated)',
                    borderRadius: 3, padding: '1px 5px',
                  }}
                >
                  {fileCount}/{totalFiles}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {!isPendingRemoval && (
                <button
                  onClick={() => handleStartEdit(diff)}
                  title="Edit"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {pendingEdit && (
                <button
                  onClick={() => handleUndoEdit(actor.name)}
                  title="Undo edit"
                  style={{ color: 'var(--accent-amber)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 10 }}
                >
                  ↩
                </button>
              )}
              <button
                onClick={() => handleToggleRemove(actor.name)}
                title={isPendingRemoval ? 'Undo remove' : 'Remove'}
                style={{ color: isPendingRemoval ? 'var(--accent-amber)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- Views ----

  if (view === 'confirm') {
    return (
      <div style={{ padding: 24, height: '100%', overflowY: 'auto', background: 'var(--bg-surface)' }}>
        <h2 className="font-title" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Apply batch changes to {selectedFiles.length} files?
        </h2>
        <div style={{ marginBottom: 24 }}>
          {ops.adds.map(a => (
            <div key={a.name} style={{ fontSize: 12, color: 'var(--accent-green)', marginBottom: 4 }}>
              + Add: {a.name}{a.role ? ` (role: ${a.role})` : ''}
            </div>
          ))}
          {ops.removals.map(name => {
            const diff = actorDiffs.find(d => d.actor.name === name)
            return (
              <div key={name} style={{ fontSize: 12, color: 'var(--accent-red, #f87171)', marginBottom: 4 }}>
                − Remove: {name}{diff ? ` (present in ${diff.fileCount}/${diff.totalFiles} files)` : ''}
              </div>
            )
          })}
          {Object.entries(ops.edits).map(([orig, updated]) => (
            <div key={orig} style={{ fontSize: 12, color: 'var(--accent-indigo)', marginBottom: 4 }}>
              ✎ Edit: {orig} → {updated.name}{updated.role ? ` (role: ${updated.role})` : ''}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            variant="outline"
            onClick={() => setView('edit')}
            className="font-title"
            style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isSaving}
            className="font-title"
            style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              background: 'var(--accent-amber)', color: '#1A1000', border: 'none',
            }}
          >
            {isSaving ? 'Saving...' : `Apply to ${selectedFiles.length} files →`}
          </Button>
        </div>
      </div>
    )
  }

  if (view === 'result') {
    const succeeded = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const withConflicts = results.filter(r => r.conflicts.length > 0)
    return (
      <div style={{ padding: 24, height: '100%', overflowY: 'auto', background: 'var(--bg-surface)' }}>
        <h2 className="font-title" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Batch complete
        </h2>
        <div style={{ fontSize: 12, marginBottom: 8, color: 'var(--accent-green)' }}>
          ✓ {succeeded.length} file{succeeded.length !== 1 ? 's' : ''} updated
        </div>
        {withConflicts.length > 0 && (
          <div style={{ fontSize: 12, marginBottom: 8, color: 'var(--accent-amber)' }}>
            ⚠ {withConflicts.length} file{withConflicts.length !== 1 ? 's' : ''} had conflicts (skipped actors: {withConflicts.flatMap(r => r.conflicts).join(', ')})
          </div>
        )}
        {failed.length > 0 && (
          <div style={{ fontSize: 12, marginBottom: 8, color: 'var(--accent-red, #f87171)' }}>
            ✕ {failed.length} file{failed.length !== 1 ? 's' : ''} failed:
            {failed.map(r => (
              <div key={r.filePath} style={{ paddingLeft: 12, opacity: 0.7 }}>
                {r.filePath}: {r.error}
              </div>
            ))}
          </div>
        )}
        <Button
          onClick={handleReset}
          variant="outline"
          className="font-title"
          style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 16 }}
        >
          Done
        </Button>
      </div>
    )
  }

  // Default: edit view
  const inAllFiles = actorDiffs.filter(d => d.fileCount === d.totalFiles)
  const inSomeFiles = actorDiffs.filter(d => d.fileCount < d.totalFiles)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-base)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span className="font-title" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Batch editing {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
        </span>
        {hasPendingOps && (
          <Button
            onClick={() => setView('confirm')}
            className="font-title"
            style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              background: 'var(--accent-amber)', color: '#1A1000', border: 'none',
              padding: '5px 12px', height: 'auto', borderRadius: 5,
            }}
          >
            Apply · {pendingSummary}
          </Button>
        )}
      </div>

      <ScrollArea style={{ flex: 1 }}>
        {/* Section: In all files */}
        {inAllFiles.length > 0 && (
          <>
            <div style={{ padding: '6px 16px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              In all files
            </div>
            {inAllFiles.map(d => renderActorRow(d))}
          </>
        )}

        {/* Section: In some files */}
        {inSomeFiles.length > 0 && (
          <>
            <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              In some files
            </div>
            {inSomeFiles.map(d => renderActorRow(d))}
          </>
        )}

        {actorDiffs.length === 0 && (
          <div style={{ padding: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            No actors found in selected files.
          </div>
        )}

        {/* Pending adds */}
        {ops.adds.length > 0 && (
          <>
            <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-green)' }}>
              Pending adds
            </div>
            {ops.adds.map(a => (
              <div key={a.name} style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="font-mono" style={{ fontSize: 13, flex: 1, color: 'var(--accent-green)' }}>{a.name}</span>
                {a.role && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.role}</span>}
                <button onClick={() => handleRemovePendingAdd(a.name)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </>
        )}

        {/* Add actor form */}
        <div style={{ padding: '12px 16px' }}>
          {showAddForm ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Actor name"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddActor()}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                placeholder="Role (optional)"
                onKeyDown={e => e.key === 'Enter' && handleAddActor()}
              />
              <button onClick={handleAddActor} style={{ color: 'var(--accent-green)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setShowAddForm(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Actor
            </button>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
```

### Step 3.2: Build check

- [ ] Run: `npx tsc --noEmit`
- Expected: no errors

### Step 3.3: Commit

- [ ] `git add src/components/BatchEditor.tsx`
- [ ] `git commit -m "feat: add BatchEditor component"`

---

## Task 4: Wire everything into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

This task adds the batch state, the `handleBatchApply` write function, and renders `BatchEditor` in the right panel.

### Step 4.1: Add batch state and handlers to `App.tsx`

- [ ] Add the following state variables inside `App()` (after existing state):

```typescript
const [batchMode, setBatchMode] = useState(false)
const [batchSelectedFiles, setBatchSelectedFiles] = useState<Set<string>>(new Set())
const [isBatchWriting, setIsBatchWriting] = useState(false)
```

- [ ] Add the batch handlers:

```typescript
const handleBatchToggle = useCallback(() => {
  setBatchMode(prev => {
    if (prev) setBatchSelectedFiles(new Set())
    return !prev
  })
}, [])

const handleBatchSelectFile = useCallback((filePath: string, selected: boolean) => {
  setBatchSelectedFiles(prev => {
    const next = new Set(prev)
    if (selected) next.add(filePath)
    else next.delete(filePath)
    return next
  })
}, [])

const handleBatchSelectAll = useCallback(async () => {
  const paths = filteredFiles.map(f => f.filePath)
  setBatchSelectedFiles(new Set(paths))
  // Pre-load data for all newly selected files
  for (const file of filteredFiles) {
    if (batchLoadedData[file.filePath]) continue
    if (selectedFile?.filePath === file.filePath && currentData) {
      setBatchLoadedData(prev => ({ ...prev, [file.filePath]: currentData }))
      continue
    }
    try {
      let content: string | undefined
      if (isElectron) {
        const r = await window.electronAPI!.readFile(file.filePath)
        content = r.success ? r.content : undefined
      } else {
        const handle = fileHandles.current.get(file.filePath)
        if (handle) content = await (await handle.getFile()).text()
      }
      if (content) setBatchLoadedData(prev => ({ ...prev, [file.filePath]: parseNfo(content!) }))
    } catch { /* silently skip */ }
  }
}, [filteredFiles, batchLoadedData, selectedFile, currentData])

const handleBatchClear = useCallback(() => {
  setBatchSelectedFiles(new Set())
}, [])
```

- [ ] Add the `handleBatchApply` function (place after `handleBatchClear`):

```typescript
const handleBatchApply = useCallback(async (ops: BatchActorOps): Promise<ApplyResult[]> => {
  setIsBatchWriting(true)
  const targetFiles = nfoFiles.filter(f => batchSelectedFiles.has(f.filePath))
  const results: ApplyResult[] = []

  for (const file of targetFiles) {
    try {
      // Use in-memory data for the currently selected file; read others from disk
      let fileData: NfoData
      if (selectedFile?.filePath === file.filePath && currentData) {
        fileData = currentData
      } else {
        let content: string | undefined
        if (isElectron) {
          const r = await window.electronAPI!.readFile(file.filePath)
          content = r.success ? r.content : undefined
        } else {
          const handle = fileHandles.current.get(file.filePath)
          if (handle) content = await (await handle.getFile()).text()
        }
        if (!content) {
          results.push({ filePath: file.filePath, success: false, conflicts: [], error: 'Could not read file' })
          continue
        }
        try {
          fileData = parseNfo(content)
        } catch {
          results.push({ filePath: file.filePath, success: false, conflicts: [], error: 'Parse error' })
          continue
        }
      }

      const { data: updatedData, conflicts } = applyBatchActorOps(fileData, ops)
      const xml = serializeNfo(updatedData)

      let writeSuccess = false
      if (isElectron) {
        const r = await window.electronAPI!.writeFile(file.filePath, xml)
        writeSuccess = r.success
      } else {
        const handle = fileHandles.current.get(file.filePath)
        if (handle) {
          const writable = await handle.createWritable()
          await writable.write(xml)
          await writable.close()
          writeSuccess = true
        }
      }

      if (writeSuccess) {
        results.push({ filePath: file.filePath, success: true, conflicts })
        // Stale-state reconciliation: update in-memory data if this was the active file
        if (selectedFile?.filePath === file.filePath) {
          setCurrentData(updatedData)
          setOriginalData(updatedData)
          setIsDirty(false)
        }
        setDirtyFiles(prev => {
          const next = new Set(prev)
          next.delete(file.filePath)
          return next
        })
      } else {
        results.push({ filePath: file.filePath, success: false, conflicts, error: 'Write failed' })
      }
    } catch (err) {
      results.push({ filePath: file.filePath, success: false, conflicts: [], error: String(err) })
    }
  }

  setIsBatchWriting(false)
  return results
}, [nfoFiles, batchSelectedFiles, selectedFile, currentData])
```

- [ ] Add missing imports at the top of `App.tsx`:

```typescript
import { applyBatchActorOps, type BatchActorOps, type ApplyResult } from './lib/batchOperations'
import BatchEditor from './components/BatchEditor'
```

### Step 4.2: Pass new props to `FileList` and render `BatchEditor`

- [ ] Update the `<FileList>` JSX to pass the new props:

```tsx
<FileList
  files={filteredFiles}
  allFiles={nfoFiles}
  selectedFile={selectedFile}
  dirtyFiles={dirtyFiles}
  filterText={filterText}
  onFilterChange={setFilterText}
  onSelectFile={handleSelectFile}
  onOpenFolder={handleOpenFolder}
  folderPath={folderPath}
  appVersion={appVersion}
  batchMode={batchMode}
  batchSelectedFiles={batchSelectedFiles}
  isBatchWriting={isBatchWriting}
  onBatchToggle={handleBatchToggle}
  onBatchSelectFile={handleBatchSelectFile}
  onBatchSelectAll={handleBatchSelectAll}
  onBatchClear={handleBatchClear}
/>
```

- [ ] In the right panel's editor content area, replace the existing `{currentData ? ... : ...}` block with:

```tsx
{batchMode && batchSelectedFiles.size > 0 ? (
  <BatchEditor
    selectedFiles={nfoFiles.filter(f => batchSelectedFiles.has(f.filePath))}
    loadedData={{}}
    isSaving={isBatchWriting}
    onApply={handleBatchApply}
  />
) : currentData ? (
  // Note: loadedData={} is intentional here — Task 5 will replace it with batchLoadedData
  <MetadataEditor data={currentData} onChange={handleDataChange} />
) : (
  <div
    className="flex flex-col items-center justify-center h-full gap-3"
    style={{ color: 'var(--text-muted)' }}
  >
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
    <p style={{ fontSize: 14 }}>Open a folder to get started</p>
    <p style={{ fontSize: 12, opacity: 0.6 }}>Select a directory containing NFO files</p>
  </div>
)}
```

**Note about `loadedData`:** In this initial implementation, `BatchEditor` only has the currently selected file's data pre-loaded. The differential display will only show actors from files whose data is in memory. A future enhancement could pre-load all selected files on selection. For now, users should click a file to load it before batch-selecting — or the diff will be partial. This limitation is acceptable for the first iteration.

### Step 4.3: Build check

- [ ] Run: `npx tsc --noEmit`
- Expected: no errors

### Step 4.4: Run all tests

- [ ] Run: `npx vitest run`
- Expected: all tests PASS

### Step 4.5: Commit

- [ ] `git add src/App.tsx`
- [ ] `git commit -m "feat: wire batch actor edit into App with state and apply handler"`

---

## Task 5: Pre-load batch selected files data

**Context:** The `BatchEditor` needs `loadedData` for all selected files to compute the diff. Currently `App.tsx` only provides `currentData` for `selectedFile`. This task loads NFO data for each file as it gets batch-selected.

**Files:**
- Modify: `src/App.tsx`

### Step 5.1: Add `batchLoadedData` state and load-on-select logic

- [ ] Add state in `App.tsx`:

```typescript
const [batchLoadedData, setBatchLoadedData] = useState<Record<string, NfoData>>({})
```

- [ ] Update `handleBatchSelectFile` to load file data when a file is selected:

```typescript
const handleBatchSelectFile = useCallback(async (filePath: string, selected: boolean) => {
  setBatchSelectedFiles(prev => {
    const next = new Set(prev)
    if (selected) next.add(filePath)
    else next.delete(filePath)
    return next
  })

  if (selected && !batchLoadedData[filePath]) {
    // Load from memory if it's the current file, otherwise read from disk
    if (selectedFile?.filePath === filePath && currentData) {
      setBatchLoadedData(prev => ({ ...prev, [filePath]: currentData }))
      return
    }
    try {
      let content: string | undefined
      if (isElectron) {
        const r = await window.electronAPI!.readFile(filePath)
        content = r.success ? r.content : undefined
      } else {
        const handle = fileHandles.current.get(filePath)
        if (handle) content = await (await handle.getFile()).text()
      }
      if (content) {
        setBatchLoadedData(prev => ({ ...prev, [filePath]: parseNfo(content!) }))
      }
    } catch {
      // silently skip — diff will just not include this file's actors
    }
  }
}, [batchLoadedData, selectedFile, currentData])
```

- [ ] Clear `batchLoadedData` when exiting batch mode (in `handleBatchToggle`):

```typescript
const handleBatchToggle = useCallback(() => {
  setBatchMode(prev => {
    if (prev) {
      setBatchSelectedFiles(new Set())
      setBatchLoadedData({})
    }
    return !prev
  })
}, [])
```

- [ ] Update the `<BatchEditor>` JSX to use `batchLoadedData`:

```tsx
<BatchEditor
  selectedFiles={nfoFiles.filter(f => batchSelectedFiles.has(f.filePath))}
  loadedData={batchLoadedData}
  isSaving={isBatchWriting}
  onApply={handleBatchApply}
/>
```

### Step 5.2: Build check + final test run

- [ ] Run: `npx tsc --noEmit`
- [ ] Run: `npx vitest run`
- Expected: all PASS

### Step 5.3: Final commit

- [ ] `git add src/App.tsx`
- [ ] `git commit -m "feat: pre-load NFO data for batch-selected files"`

---

## Done

All tasks complete. The feature is now functional:
1. Click **Batch Edit** in the left panel
2. Check any number of NFO files
3. View differential actor list (in all / in some files)
4. Add, remove, or edit actors
5. Click **Apply**, review the confirmation summary, confirm
6. See the post-write result summary
