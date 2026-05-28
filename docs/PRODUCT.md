# Product

## What

NFO Metadata Editor is a desktop application for viewing and editing `.nfo` metadata files used by Jellyfin, Kodi, Emby, and compatible media servers.

It is **not** a media manager, scraper, or library indexer. It is the tool you reach for when scraped metadata is wrong and you want to fix it — one file, or hundreds at a time — without hand-editing XML.

## Why

NFO files are XML sidecars that media servers consume to populate movie/show details. They are written by scrapers (TMDb, IMDb, custom scripts) and frequently contain mistakes: wrong actor names, inconsistent casing, scraped-but-unwanted fields, mis-attributed studios.

The realistic alternatives are:

1. **Edit XML by hand** — fragile, error-prone, doesn't scale beyond a few files.
2. **Re-scrape** — destroys manual corrections, may not even fix the underlying mistake.
3. **Library-wide scripts** — high risk, no preview, hard to revert.

This tool exists for the middle ground: a fast UI for safe, scoped edits across many files, with a parser that respects fields it doesn't understand.

## Target Users

- **Media library curators** maintaining personal Jellyfin/Kodi/Emby installations with hundreds-to-thousands of titles.
- **Power users** who scrape from non-mainstream sources where scrapers produce inconsistent metadata.
- **Self-hosters** who care that "John Doe" and "John  Doe" (two spaces) are the same actor.

Assumed comfort level: moderate technical user. Comfortable with folder navigation, knows what NFO is, doesn't expect cloud sync.

## In Scope

### Currently shipped

- **Folder open** — pick a directory; recursive `.nfo` scan with system-folder skip (`node_modules`, `.git`, etc.).
- **Single-file editor** — categorized fields (Core Info, Plot, Classification, Credits, Production, Identifiers, Media, Advanced) with proper types (date pickers, chip inputs for tags/genres, rating tables).
- **Actor editor** — name, role, type, order, thumbnail URL per actor.
- **Batch actor editor** — across N selected files, perform combined remove / rename / add operations atomically per file with conflict detection (fixpoint algorithm for circular renames).
- **Cross-platform shell** — Electron on Windows / macOS / Linux; Chromium-based browser fallback via File System Access API.
- **Dark/light theme** with persistent preference.
- **NFO format fidelity** — preserves CDATA blocks, ratings structure, unique IDs, sets, and (as of `a28d06b`) unknown top-level elements (`<art>`, `<fileinfo>`, `<website>`, etc.) so Jellyfin-specific fields survive round-trip.

### Planned / candidates (not yet committed)

- Batch edits for genres / tags / studios (analogous to batch actor).
- Filter / search files by metadata field.
- Multi-file undo (across saves).
- Field-level locks to prevent accidental overwrite.

## Out of Scope (Non-Goals)

These are explicit non-goals. Do not add them.

- **Video playback or transcoding.** This is not a media player.
- **Metadata scraping** (TMDb / IMDb / TVDb integration). User brings their own scraped NFOs.
- **Image / poster editing or generation.** NFO references images by path/URL; we don't edit the binary.
- **Database integration with Jellyfin/Kodi.** We edit files on disk. Media servers re-index on their own schedule.
- **Mobile or web SaaS.** Desktop / local-folder workflow only.
- **NFO format extensions or new schemas.** We round-trip what's there, including unknown elements; we don't invent new tags.
- **Multi-user / collaborative editing.** Single-user, local files.

## Current Stage

**Version 1.2.0** — Batch actor edit shipped (PR #6, merged). Recent stability work focused on:

- Batch preload race conditions (commits `5d21f1e`, `8f2dacd`, `4b7489e`, `6cf6a43`).
- Save / reconciliation correctness when switching files mid-write (`ee72b0c`, `7e4c055`, `6030385`, `a4e8ceb`).
- Atomic rename conflict detection — fixpoint algorithm replaces earlier per-file checks (`fdf208f` and lineage).
- **NFO fidelity:** unknown XML preservation (`a28d06b`). Resolves issue where Jellyfin's `<art>`, `<fileinfo>`, `<website>` blocks were silently dropped on every save.

## Next-Milestone Candidates

Decision pending — none committed yet. Order is provisional.

1. **Extend batch editing to genres / tags / studios.** Same UX pattern; fewer edge cases since these are flat string lists.
2. **Filter/search across loaded files** by any metadata field — needed once batch edits scale past 50 files.
3. **Per-field lock indicators** based on `lockdata` flag — currently parsed but not surfaced in UI.
4. **E2E coverage** of the renderer (Playwright) — `App.tsx` and batch flows have no automated tests.

When picking the next feature, weight by: (a) frequency of user complaints in real workflows, (b) risk surface (parser/IPC changes > UI), (c) test coverage already in place.

## Success Signals

We will know the product is working when:

- A user can correct one mis-named actor across 100 NFOs in under a minute with zero hand-editing of XML.
- A round-trip save preserves every byte of meaningful content (excluding cosmetic ordering / whitespace) from the original NFO.
- Switching files mid-save does not corrupt either the file being saved or the new file's editor state.

## Anti-Success Signals

We will know we drifted if:

- The parser silently drops fields the user cares about (the `a28d06b` regression class).
- Batch operations leave files in inconsistent states (some applied, some not, no clear feedback).
- The app starts requiring users to understand internal concepts ("session token", "dirty state") to use it correctly.
