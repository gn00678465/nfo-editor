# AGENTS.md

NFO Metadata Editor — Electron + React desktop app for editing video NFO files used by Jellyfin/Kodi/Emby.

This file is the routing layer for AI coding agents. Read it first, then drill into the linked docs only when you need them.

## Startup Workflow

Before writing or modifying code:

1. **Read this file** — covers conventions, scope, and required artifacts.
2. **Read `docs/PRODUCT.md`** — product scope, target users, what's in/out of scope.
3. **Read `docs/ARCHITECTURE.md`** — Electron layer responsibilities, data flow, key invariants.
4. **Run `./init.ps1`** (or `npm install && npm test && npm run build` on non-Windows) — confirms the repo is in a runnable state.
5. **Read `docs/feature_list.json`** — current feature status and dependencies.
6. **Read `.harness/handoff/task-handoff.md`** — last task's snapshot (managed by `/handoff` skill, treat as hint not truth).
7. **Read `.harness/handoff/progress-log.md`** — session-level continuity, living section, recent entries.

If `init.ps1` fails, stop. Fix verification before doing anything else.

## Working Rules

- **One feature at a time.** Do not bundle unrelated changes into the same branch or PR.
- **Verification before "done".** A change is not finished until `npm test` and `npm run build` both pass. The harness's definition of done is below.
- **Touching `nfoParser` or `batchOperations` requires tests.** These are core invariants — bugs propagate silently into every NFO file the user saves. See `docs/ARCHITECTURE.md` § Invariants.
- **Preserve unknown XML.** `parseNfo` collects unrecognized top-level elements into `data.unknown`. Never drop, never reorder unrelated fields. Roundtrip tests in `nfoParser.test.ts` enforce this — keep them green.
- **Surgical changes.** Only touch what the task requires. Don't drive-by refactor adjacent code.
- **Commits in 繁體中文** following Conventional Commits, per `~/.claude/CLAUDE.md` § Superpowers Commit Discipline. Subject ≤ 50 chars; body in bullet list with imperative voice; no trailing period.
- **No `console.log` in committed code.** Use proper logging or remove before commit.

## Required Artifacts

| File | Purpose |
|------|---------|
| `AGENTS.md` (this file) | Routing layer; always read first |
| `docs/ARCHITECTURE.md` | Project structure, Electron layers, data flow |
| `docs/PRODUCT.md` | Product scope, users, current stage, non-goals |
| `docs/feature_list.json` | Feature status tracker |
| `.harness/handoff/task-handoff.md` | Task-level snapshot (written by `/handoff task`) |
| `.harness/handoff/progress-log.md` | Session log + living section (written by `/handoff log`) |
| `init.ps1` | Standard verification entry point |

## Definition of Done

A feature is done when **all** of these hold:

- [ ] Implementation complete and behaves per acceptance criteria.
- [ ] `npm test` passes (no new failures, no skipped tests added without justification).
- [ ] `npm run build` succeeds (TypeScript compiles, Vite bundles).
- [ ] If the change touches `src/lib/nfoParser.ts` or `src/lib/batchOperations.ts`: round-trip / batch-op tests added or updated.
- [ ] If the change touches UI / Electron IPC: manual verification on a real folder documented in `docs/progress.md`.
- [ ] `docs/feature_list.json` updated with new status and evidence.
- [ ] Commit message in 繁中 Conventional Commits format.

## End of Session

Before ending a session:

1. Run `/handoff log` — appends a session entry and refreshes the living section in `.harness/handoff/progress-log.md`.
2. Run `/handoff task` if a task just completed (or is being handed off mid-flight) — writes the 5-segment snapshot to `.harness/handoff/task-handoff.md`.
3. `/handoff view` for a read-only peek; `/handoff view --verify` cross-checks the living section against reality.
4. Update `docs/feature_list.json` — flip status, record evidence.
5. Commit with a descriptive message (繁中, Conventional Commits).

The `/handoff` output is a hint, not truth. The next session must still verify state (run `./init.ps1`, read the files, grep) before acting on the handoff.

## Quick Tech Reference

- **Stack:** Electron + Vite + React 18 + TypeScript + Tailwind + shadcn/ui (Radix UI primitives) + fast-xml-parser + Vitest.
- **Package manager:** npm (Bun also works for install but `package-lock.json` is the source of truth).
- **Entry points:** `electron/main.ts` (main process), `electron/preload.ts` (preload), `src/main.tsx` (renderer).
- **Build:** `vite build` → `dist/`; `electron-builder` → `release/` for distributables.
- **Tests:** `npm test` (vitest run); fixtures under `src/lib/__tests__/`.

## When You're Confused

- "Which Electron process handles X?" → `docs/ARCHITECTURE.md` § Layer Responsibilities.
- "Should I build this feature?" → `docs/PRODUCT.md` § Scope.
- "How does parser preserve unknown fields?" → `docs/ARCHITECTURE.md` § Invariants → commit `a28d06b`.
- "Where do I add a new IPC handler?" → `docs/ARCHITECTURE.md` § Data Flow.
