---
schema_version: 1
artifact_type: progress-log
last_updated: 2026-05-28T05:10:57Z
default_shell: bash
---

# Progress Log

## 當前已驗證狀態 (living section)

> 每輪會話更新到當下真相。讀完應該知道專案此刻能做什麼、卡在哪。

- **倉庫根目錄**: `D:/Projects/nfo-editor`
- **標準啟動路徑**:
  ```bash
  npm run dev
  ```
- **標準驗證路徑**:
  ```bash
  powershell.exe -NoProfile -File ./init.ps1
  ```
- **當前最高優先級未完成功能**: `feat-008` — Batch edit for genres / tags / studios（reuse 已驗證的 BatchEditor UX，套到 flat string array）
- **當前 blocker**: 無

---

## 會話記錄 (append-only)

### Session 1 · 2026-05-28 · NFO parser unknown-XML fix + harness bootstrap

- **本輪目標**:
  1. 修使用者回報「batch 變更演員名稱第一次儲存會清掉 XML，需要第二次儲存」bug
  2. 建立 AI agent harness 基礎設施（AGENTS.md / ARCHITECTURE.md / PRODUCT.md + state artifacts + init 腳本）

- **已完成**:
  - **Bug fix**：根因不是「需要兩次儲存」（這是誤判，第二次儲存實際上 byte-for-byte 與第一次相同），而是 `parseNfo` 不識別 `<art>` / `<fileinfo>` / `<website>` 等 Jellyfin 元素，解析時整塊丟掉，導致 round-trip 後檔案永久失去這些元素。Commit `a28d06b` 加 `KNOWN_TOP_LEVEL_KEYS` 過濾，未識別元素存進 `data.unknown` 並在 serialize 尾端 re-emit；`cloneNfoData` 同步處理；新增 5 個 round-trip 測試。
  - **Harness**：建立 `AGENTS.md`、`docs/ARCHITECTURE.md`、`docs/PRODUCT.md`、`docs/feature_list.json`、`init.ps1`；先建後又刪除 `docs/session-handoff.md` 與 `docs/progress.md`（讓 `/handoff` skill 全權管理）。

- **執行過的驗證**:
  - `npm test` — 135 passed (130 prior + 5 new in nfoParser.test.ts § "unknown XML preservation")
  - `powershell.exe -NoProfile -File ./init.ps1` — 全綠
  - 真實資料夾手動驗證: `Z:/Media/jellyfin/FC2-スレンダー/お嬢様フルート奏者/` 5 個 NFO，actor 改名 + `<art>`/`<fileinfo>`/`<website>` byte-for-byte 保留

- **已記錄證據**:
  - `src/lib/__tests__/nfoParser.test.ts` § "unknown XML preservation"（5 tests）
  - Commit `a28d06b`
  - 無 `.harness/evidence/session-1/` 目錄（本輪未蒐集需歸檔的 sample 檔案；real-world fixtures 在 user 端 `Z:` 機器，不入 repo）

- **提交記錄**:
  - `a28d06b` fix(nfo-parser): 保留未知 XML 元素避免 parse-serialize 流失
  - harness 檔案待本 entry 結束後一起 commit

- **已知風險或未解決問題**:
  - D-001 空 `<plot />` self-closing 元素 round-trip 後消失（minor，by design）
  - D-002 serializer 用固定欄位順序，原檔 field order 不被保留（minor，cosmetic）
  - D-003 整個 renderer 層（App.tsx + components/）無 E2E 測試 — 此輪 bug 就是 unit test 全綠但 user-perceived bug 存在的明證

- **Living section 變動**:
  - 初始化 living section（first-run）。`repo_root` 取自 `git rev-parse --show-toplevel`，`default_shell` 偵測為 `bash`（Windows + git-bash via Bash tool），其餘四欄首次填入。

- **下一步最佳動作**:
  - 跑 `feat-008` — Batch edit for genres / tags / studios。理由與 don't-touch list 詳見 `.harness/handoff/task-handoff.md` § 4。
  - 進入下一輪前先 `./init.ps1` 確認基線；讀 `.harness/handoff/task-handoff.md` 取 context 但 verify 過再行動（memory-as-hint 原則）。

---
