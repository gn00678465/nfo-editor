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
- Exiting batch mode clears all selections and restores the single-file editor on the right.

### While in Batch Mode

- Each file item shows a **checkbox** on the left.
- The panel header shows **"X selected"** count.
- **"Select All"** and **"Clear"** quick-action links appear next to the count.
- Selecting 0 files: right panel shows the current single-file editor (or empty state).
- Selecting ≥1 file: right panel switches to the BatchEditor component.

---

## 2. Right Panel — BatchEditor Component

Rendered when batch mode is active and ≥1 file is selected.

### Header

- Displays: `Batch editing X files`
- Designed to support additional field types in future (currently Actors only).

### Actors — Differential Display

All actors across selected files are collected and split into two groups:

| Group | Condition | Visual Treatment |
|-------|-----------|-----------------|
| **In all files** | Actor present in 100% of selected files | Full opacity, solid style |
| **In some files** | Actor present in some but not all files | Semi-transparent + badge `X / Y files` |

Actor identification is by **name** (case-sensitive).

### Per-Actor Actions

Each actor row has:
- **Edit** (pencil icon): Opens inline edit for name and role. On apply, overwrites the actor in all files that contain them.
- **Remove** (× icon): Marks actor as pending-removal. Shown with strikethrough. Can be undone before apply.

### Add Actor

- **"+ Add Actor"** button at the bottom expands an inline form (name + role inputs).
- Added actors are marked as pending-add (green badge). On apply, they are appended to all selected files.

### Apply Button

- Shows a one-line pending summary: e.g., `+2 actors, −1 actor, 1 edited`
- Disabled when there are no pending changes.
- Opens a confirmation dialog on click.

---

## 3. Confirmation Dialog & Write Flow

### Dialog Content

```
Apply batch changes to X files?

  + Add: <name> (role: <role>)
  − Remove: <name>  (present in X/Y files)
  ✎ Edit: <old name> → <new name> (role: <new role>)

[Cancel]  [Apply to X files]
```

### Write Flow (after confirmation)

1. For each selected NFO file:
   - Use cached NfoData if already loaded; otherwise **read the file first**.
   - Apply pending operations: add actors, remove by name, update edited actors.
   - Call `writeFile` to persist.
2. Show inline progress: `Saving 3 / 5...`
3. On completion: show success count and any failed files.
4. Successful files are removed from `dirtyFiles`.

### Error Handling

- A single file failure does **not** abort the batch — all files are attempted.
- Failed files are listed with their error after the batch completes.

---

## 4. Component & File Plan

| File | Role |
|------|------|
| `src/App.tsx` | Add `batchMode`, `selectedFiles` state; pass to FileList and BatchEditor |
| `src/components/FileList.tsx` | Add batch toggle button, checkboxes, select-all/clear |
| `src/components/BatchEditor.tsx` | New: differential actor display, pending changes, apply trigger |
| `src/components/BatchConfirmDialog.tsx` | New: summary dialog before write |
| `src/lib/batchOperations.ts` | New: pure functions — `diffActors`, `applyBatchActorOps` |

---

## 5. Data Model

```typescript
// Pending operations accumulated in BatchEditor state
interface BatchActorOps {
  adds: Actor[]
  removals: string[]          // actor names to remove
  edits: Map<string, Actor>   // original name → new Actor data
}

// Diff result for display
interface ActorDiff {
  actor: Actor
  fileCount: number           // how many selected files have this actor
  totalFiles: number
}
```

---

## 6. Out of Scope (this iteration)

- Batch editing of fields other than Actors (genres, tags, studios, etc.)
- Undo after a batch write
- Progress bar (inline text counter is sufficient)
