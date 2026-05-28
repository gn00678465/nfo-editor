# Architecture

## Stack

- **Desktop shell:** Electron (main + preload + renderer)
- **Renderer framework:** React 18 + Vite
- **Language:** TypeScript strict mode
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI primitives)
- **XML:** `fast-xml-parser` (parser + builder)
- **Testing:** Vitest
- **Distribution:** `electron-builder` (nsis/portable on Windows, dmg on macOS, AppImage on Linux)

## Repository Layout

```
nfo-editor/
├── electron/
│   ├── main.ts              # Electron main process (Node, full FS access)
│   └── preload.ts           # contextBridge — exposes window.electronAPI
├── src/                     # Renderer (browser sandbox)
│   ├── main.tsx             # React mount
│   ├── App.tsx              # Top-level state machine
│   ├── components/          # UI
│   │   ├── FileList.tsx
│   │   ├── MetadataEditor.tsx
│   │   ├── BatchEditor.tsx
│   │   ├── ActorsField.tsx
│   │   ├── ChipInput.tsx
│   │   ├── RatingsField.tsx
│   │   ├── UniqueIdField.tsx
│   │   ├── ImageField.tsx
│   │   ├── Section.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── TierLabel.tsx
│   │   └── ui/              # shadcn/ui primitives
│   ├── lib/
│   │   ├── nfoParser.ts     # parse/serialize NFO XML (PURE)
│   │   ├── batchOperations.ts  # batch actor ops (PURE)
│   │   ├── utils.ts
│   │   └── __tests__/       # Vitest specs + fixture NFO
│   ├── electron.d.ts        # window.electronAPI type declarations
│   └── index.css
├── docs/                    # Harness state + design docs
├── build/                   # App icons for electron-builder
├── dist/                    # Vite build output (renderer)
├── dist-electron/           # Built main/preload
├── release/                 # electron-builder output
├── AGENTS.md                # Harness routing layer (start here)
├── init.ps1                 # Verification entry point
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tailwind.config.js
└── components.json          # shadcn/ui config
```

## Electron Layer Responsibilities

### 1. Main Process (`electron/main.ts`)

Runs in Node.js with full filesystem access. Owns:

- **Window lifecycle** — creates `BrowserWindow`, handles activate / window-all-closed.
- **Application menu** — File / Help menus, About dialog with version.
- **IPC handlers** — every privileged operation the renderer can request:
  - `app:getVersion` → returns `app.getVersion()`
  - `dialog:openFolder` → shows native folder picker
  - `fs:scanNfoFiles` → recursive `.nfo` scan with SKIP_DIRS filter
  - `fs:readFile` → returns `{ success, content? }`
  - `fs:writeFile` → returns `{ success }`

**Invariant:** all FS access stays in the main process. The renderer is sandboxed (no `nodeIntegration`, `contextIsolation: true`).

### 2. Preload (`electron/preload.ts`)

Tiny bridge that runs before the renderer loads. Uses `contextBridge.exposeInMainWorld('electronAPI', { … })` to expose only the IPC channels above as typed functions. Nothing else from Node is reachable from the renderer.

The TypeScript signature lives in `src/electron.d.ts`:

```ts
window.electronAPI?: {
  openFolder: () => Promise<string | null>
  scanNfoFiles: (folderPath: string) => Promise<string[]>
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string }>
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>
  getAppVersion: () => Promise<string>
}
```

### 3. Renderer (`src/`)

Pure browser context. Two execution modes:

- **Electron mode** (`window.electronAPI` exists): use IPC for FS ops.
- **Browser fallback** (`window.electronAPI` undefined): use the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API). Requires Chrome/Edge. File handles are kept in a `Map<filePath, FileSystemFileHandle>` ref inside `App.tsx`.

The `isElectron = !!window.electronAPI` check gates every FS call. See `App.tsx::readNfoContent`.

## Module Responsibilities

### `src/lib/nfoParser.ts` (pure)

Two functions:

- `parseNfo(xml: string): NfoData` — fast-xml-parser → typed `NfoData`. **Preserves unrecognized top-level elements into `data.unknown: Record<string, unknown>`** (see Invariants).
- `serializeNfo(data: NfoData): string` — typed data → XML. Re-emits `data.unknown` at the tail. Wraps `plot`/`outline`/`originalplot` in `CDATA`.

Also exposes `emptyNfoData()` for new/empty files.

### `src/lib/batchOperations.ts` (pure)

- `diffActors(loadedData)` — across selected files, produces `ActorDiff[]` showing each unique actor's `fileCount / totalFiles` and `rolesDiffer` flag.
- `applyBatchActorOps(data, ops)` — pure transformation. Performs (in order):
  1. **Removals** — filter actors whose name is in `ops.removals`.
  2. **Renames** — fixpoint algorithm to detect conflicting renames (e.g. `A→B, B→C` is fine; `A→B` when `B` exists and is not being renamed is rejected).
  3. **Adds** — append `ops.adds`, conflicting on existing actor names.
- `isNoOpActorEdit` — used by `BatchEditor` to detect when an edit changes nothing and skip staging it.

Returns `{ data: nextNfoData, conflicts: string[] }`. Does not write to disk.

### `src/App.tsx` (orchestration)

Single top-level component holding all state. Key state machines:

- **File selection** — `selectedFile`, `currentData`, `originalData`, `isDirty`, `dirtyFiles`. Async load is guarded by `latestSelectRequestRef` to drop stale responses.
- **Save flow** — `handleSave` captures `selectedFile.filePath` and `currentData` *before* the async write, then only commits UI state if both still match after the write.
- **Batch mode** — `batchMode`, `batchSelectedFiles`, `batchLoadedData`, `batchPreloadErrors`. Preloads selected files in the background via `batchSessionRef` token to invalidate stale loads.
- **Batch apply** — `handleBatchApply` iterates `batchSelectedFiles` sequentially. For the active file it reuses `currentData`; for others it reads from disk. Writes through main-process IPC (or `FileSystemFileHandle.createWritable` in browser mode).

## Data Flow

### Opening a folder

```
User clicks Open
  → App.handleOpenFolder
    Electron:  window.electronAPI.openFolder → window.electronAPI.scanNfoFiles
    Browser:   window.showDirectoryPicker → scanNfoFilesFromDir → fileHandles ref
  → setNfoFiles([{filePath, folderName, fileName}, …])
  → FileList renders the list
```

### Editing a single file

```
User clicks file in FileList
  → App.handleSelectFile
    → readNfoContent → parseNfo
    → setCurrentData / setOriginalData
  → MetadataEditor renders fields from currentData
User edits a field
  → onChange → App.handleDataChange
    → setCurrentData(next)
    → setDirtyFiles add filePath
    → if file is also in batchSelectedFiles: setBatchLoadedData sync
User clicks Save (or Ctrl/Cmd+S)
  → App.handleSave
    → serializeNfo(currentData) → writeFile
    → setOriginalData = currentData; clear dirty
```

### Batch actor edit

```
User toggles batch mode + selects files
  → preload kicks off per file (batchSessionRef gates stale results)
  → batchLoadedData populated
BatchEditor renders
  → diffActors(batchLoadedData) → ActorDiff[]
User stages edits/removals/adds → ops: BatchActorOps
User confirms apply
  → App.handleBatchApply
    For each filePath in batchSelectedFiles:
      data = (active file ? currentData : readNfoContent + parseNfo)
      { data: updated, conflicts } = applyBatchActorOps(data, ops)
      writeFile(serializeNfo(updated))
      reconcile in-memory state if still safe to do so
    → results: ApplyResult[]
  → BatchEditor shows result view
```

## Invariants

These are load-bearing — break them and bugs surface silently across every NFO file the user edits.

1. **Preserve unknown XML.** `parseNfo` collects every top-level key not in `KNOWN_TOP_LEVEL_KEYS` into `data.unknown`. `serializeNfo` re-emits them. `cloneNfoData` (in `batchOperations.ts`) deep-clones `unknown`. Round-trip tests under `nfoParser.test.ts § "unknown XML preservation"` enforce this. Fixed in commit `a28d06b`.

2. **`parseNfo` filters empty actor names.** `<actor>` blocks with empty `<name>` are dropped during parse. Treat this as deliberate.

3. **Save guards against stale reconciliation.** `handleSave` and `handleBatchApply` capture path + data before the async write and check `selectedFileRef.current?.filePath` / `currentDataRef.current` afterwards before mutating UI state. Without this, switching files mid-save corrupts editor state.

4. **Batch preload uses a session token.** `batchSessionRef.current` is incremented on any state-invalidating action. Async preload results only apply when the captured token still matches. Skip this and you race the user.

5. **Non-active dirty files are skipped during batch apply.** Their in-memory edits would either be silently overwritten or merged inconsistently. The user must save / discard before batch ops touch those files.

6. **Renames use fixpoint conflict detection.** Two-way swaps and circular renames are valid; renaming onto a name that's not being renamed away is a conflict. Logic in `applyBatchActorOps`. Don't shortcut to "first-match-wins".

## Gotchas Worth Knowing

- `serializeNfo` writes known fields in a **fixed order**. Field order in the original NFO will change after a save. Content is preserved; ordering is not.
- The `<set>` element parses both `<set>Name</set>` and `<set><name>Name</name></set>` forms but always serializes the nested form.
- Empty optional fields (`<plot />`) are dropped — `getString('')` returns `undefined`. Only `unknown` elements survive emptiness because they're passed through as-is.
- Browser fallback requires Chrome/Edge (File System Access API). Firefox/Safari fall through with a helpful alert.
- The Electron preload script is built to `dist-electron/preload.js`. If `window.electronAPI` is undefined inside Electron, the preload build/path is broken — not the renderer.

## Test Strategy

- **`src/lib/__tests__/nfoParser.test.ts`** — every parse / serialize / round-trip case. Uses real fixture (`FC2-4615505.nfo`) plus inline XML.
- **`src/lib/__tests__/batchOperations.test.ts`** — pure `applyBatchActorOps` cases: simple renames, swaps, circular, conflict rejection, removals + adds.
- Currently **no UI/E2E tests** for `App.tsx` or React components. Manual verification on real folders is documented in `docs/progress.md`.

## Build & Distribute

```bash
npm install
npm test                # vitest run
npm run build           # vite build → dist/
npm run electron:win    # vite build + electron-builder --win → release/
```

`electron-builder` config lives in `package.json § build`. Icons in `build/icon.ico` / `icon.icns` / `256x256.png`.
