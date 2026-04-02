# Batch Actor Edit — Design Spec

**Date:** 2026-04-03  
**Status:** Approved  
**Scope:** Multi-select NFO files, batch add / remove / edit Actors field

---

## Overview

Add a Batch Edit mode to the NFO Editor that lets users select multiple NFO files from the left panel and apply actor changes (add, remove, edit) to all selected files at once, with a preview/confirm step before writing.

---

## 1. Left Panel — Multi-select Mode

### Entry / Exit

- A **"Batch Edit"** toggle button is added below the "Select Folder" button in the left panel.
- Clicking it toggles batch mode on/off.
- Entering batch mode preserves any existing single-file dirty state (`isDirty`, `currentData`).
- Exiting batch mode clears all selections and restores the single-file editor on the right; dirty state is preserved.

### While in Batch Mode

- Each file item shows a **checkbox** on the left.
- The panel header shows **"X selected"** count.
- **"Select All"** selects only the currently visible (filtered) files. **"Clear"** deselects all.
- Selecting 0 files: right panel shows the current single-file editor (or empty state).
- Selecting ≥1 file: right panel switches to the BatchEditor component.

---

## 2. Right Panel — BatchEditor Component

Rendered when batch mode is active and ≥1 file is selected.

### Header

- Displays: `Batch editing X files`

### Actors — Differential Display

All actors across selected files are collected and split into two groups based on name (case-sensitive):

| Group | Condition | Visual Treatment |
|-------|-----------|-----------------|
| **In all files** | Present in 100% of selected files | Full opacity |
| **In some files** | Present in some but not all files | Semi-transparent + badge `X / Y files` |

**Display data:** When the same actor name appears with different roles across files, use the data from the first file encountered and show a "roles differ" indicator (e.g., a subtle `~` prefix on the role text).

### Per-Actor Actions

- **Edit** (pencil icon): Opens inline edit for `name` and `role` only. On apply, performs a **partial update** — only `name` and `role` are changed; all other Actor fields (`type`, `thumb`, `profile`, `tmdbid`, `order`) are preserved from each file's existing actor record.
- **Remove** (× icon): Marks actor as pending-removal with strikethrough. Can be undone before apply.

### Actor Edit — Name Change Identity Resolution

Actors are matched by their **original name** at the time the edit was initiated:

- `BatchActorOps.edits` maps `originalName → updated Actor` (partial: only name/role).
- During apply, each file is searched for an actor with the original name (case-sensitive).
- If found: update that actor's `name` and `role`, preserve all other fields.
- **Conflict case:** If the target file already has a different actor with the new name (after the rename), the edit is **skipped for that file** and reported as a conflict in the post-apply summary.

### Add Actor

- **"+ Add Actor"** button at the bottom expands an inline form (name + role inputs).
- Added actors are shown as pending-add (green badge).
- **Duplicate guard:** On apply, if a target file already contains an actor with the same name (case-sensitive), that file is skipped for this add and reported in the summary.
- `order` is assigned **per-file** during apply as `existingActors.length` (appended at end).

### Apply Button

- Shows a one-line pending summary: e.g., `+2 actors, −1 actor, 1 edited`
- Disabled when there are no pending changes.
- Shows an **inline confirmation panel** (within BatchEditor, no separate modal) on click.

---

## 3. Inline Confirmation & Write Flow

### Confirmation Panel (pre-write)

Replaces the BatchEditor body with a per-operation summary before writing:

```
Apply batch changes to X files?

  + Add: <name> (role: <role>)
  − Remove: <name>  (present in X/Y files)
  ✎ Edit: <old name> → <new name> (role: <new role>)

[Cancel]  [Apply to X files →]
```

Uses existing shadcn/ui `Button` and a simple `confirm` state in `BatchEditor` — no separate dialog component needed.

The **"Batch Edit" toggle button is disabled** while a write is in progress to prevent concurrent state changes.

### Write Flow (after confirmation)

1. For each selected NFO file:
   - If it is the currently loaded `selectedFile`, use `currentData` (in-memory).  
     All other files are **read fresh from disk** (no multi-file cache exists).
   - Apply pending operations: add actors (with duplicate guard), remove by name, apply partial edits (with conflict detection).
   - Call `writeFile` to persist.
2. Show inline progress: `Saving 3 / 5...`
3. On completion: show a **post-write result summary** (distinct from the pre-write confirmation): success count, skipped-due-to-conflict count, and any failed files with error messages.
4. Remove successful files from `dirtyFiles`.
5. **Stale state reconciliation:** If `selectedFile` was among the batch-written files, update `currentData` and `originalData` to reflect the post-batch state.

### Error Handling

- A single file failure does **not** abort the batch — all files are attempted.
- Failed files and conflict-skipped actors are listed after the batch completes.

---

## 4. Component & File Plan

| File | Role |
|------|------|
| `src/App.tsx` | Add `batchMode`, `batchSelectedFiles` state; pass to FileList and BatchEditor; handle stale-state reconciliation after batch write |
| `src/components/FileList.tsx` | Add batch toggle button, checkboxes, select-all (filtered)/clear |
| `src/components/BatchEditor.tsx` | New: differential actor display, pending changes, inline confirmation, apply trigger |
| `src/lib/batchOperations.ts` | New: pure functions — `diffActors`, `applyBatchActorOps` |

---

## 5. Data Model

```typescript
// Pending operations accumulated in BatchEditor state
interface BatchActorOps {
  adds: Actor[]
  removals: string[]                           // actor names to remove
  edits: Record<string, Pick<Actor, 'name' | 'role'>>  // originalName → name+role only
}

// Diff result for differential display
interface ActorDiff {
  actor: Actor          // data from first file encountered for this actor name
  rolesDiffer: boolean  // true if role differs across files that have this actor
  // Note: divergence in other fields (thumb, profile, tmdbid, etc.) is NOT surfaced —
  // those fields are out of scope for batch editing and silently vary per-file.
  fileCount: number     // how many selected files have this actor
  totalFiles: number
}

// Result of applying ops to a single file
interface ApplyResult {
  filePath: string
  success: boolean
  conflicts: string[]   // actor names skipped due to conflict
  error?: string
}
```

---

## 6. Out of Scope (this iteration)

- Batch editing of fields other than Actors (genres, tags, studios, etc.)
- Undo after a batch write
- Progress bar (inline text counter is sufficient)
- Editing Actor fields other than `name` and `role` (type, thumb, profile, tmdbid, order)
