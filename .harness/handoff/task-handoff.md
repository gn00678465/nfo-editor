---
schema_version: 1
artifact_type: task-handoff
last_updated: 2026-05-28T05:10:57Z
last_writer: claude-opus-4-7[1m]
task_id: harness-bootstrap
---

# Task Handoff · Harness bootstrap + NFO parser unknown-XML fix

## 1. 當前已驗證

- nfo-parser unknown XML preservation: `npm test` 135 passed (130 prior + 5 new)
  - evidence: `src/lib/__tests__/nfoParser.test.ts` § "unknown XML preservation"
- Harness 驗證入口: `./init.ps1` 全綠（npm install + npm test + npm run build）
  - evidence: 本輪實機跑過；stdout 結尾 "Verification complete · Repo is in a runnable state"
- 真實資料夾批次套用: `Z:/Media/jellyfin/FC2-スレンダー/お嬢様フルート奏者/` 共 5 個 NFO
  - 5/5 actor 改名為「お嬢様フルート奏者」
  - 5/5 `<art><poster>絕對路徑</poster></art>` 完整保留
  - 5/5 `<fileinfo><streamdetails>` 內 codec/bitrate/width/height/framerate/duration/samplingrate/channels 逐行 byte-for-byte 一致
  - 5/5 `<website>` URL 保留
  - evidence: 本輪 session 對話內含 hash 與 grep 對照（未歸檔到 `.harness/evidence/`，real-world 檔案在 user 機器 `Z:` 上，不入 repo）

## 2. 本輪改動

### Code 改動

- `src/lib/nfoParser.ts`: 新增 `KNOWN_TOP_LEVEL_KEYS` set；`parseNfo` 將不識別的頂層元素收集進 `data.unknown`；`serializeNfo` 在輸出尾端 re-emit。`NfoData` 介面新增 `unknown?: Record<string, unknown>`
- `src/lib/batchOperations.ts`: `cloneNfoData` 一併 clone `unknown` 欄位
- `src/lib/__tests__/nfoParser.test.ts`: 新增 describe block「unknown XML preservation」共 5 個 round-trip 測試

### Infra / config / env 改動

- `AGENTS.md`（新檔）: 路由層，startup workflow / working rules / definition of done / end-of-session
- `docs/ARCHITECTURE.md`（新檔）: Electron 三層職責、資料流、6 個 invariant、gotchas、test strategy
- `docs/PRODUCT.md`（新檔）: 產品範圍、目標用戶、in/out scope、1.2.0 現況、next-milestone 候選
- `docs/feature_list.json`（新檔）: 11 feature 追蹤（7 done + 4 planned）
- `init.ps1`（新檔）: PowerShell 驗證入口，包裝 install/test/build
- `docs/session-handoff.md` 刪除（由 `/handoff` skill 取代）
- `docs/progress.md` 刪除（由 `.harness/handoff/progress-log.md` 取代）
- `.harness/handoff/` 目錄建立

## 3. 仍損壞或未驗證

### D-001

- component_type: middleware_failure
- severity: MINOR
- where: `src/lib/nfoParser.ts` § `getString()` + serializer 的 `setIfDef`
- reproduce: 開啟含 `<plot />` 的 NFO，做任何 round-trip → `<plot />` 從輸出消失
- 已知 / 推測原因: `getString('')` 回傳 `undefined`；`setIfDef` 跳過 undefined 與空字串。設計上把「空欄位」視為「未設定」，所以空 self-closing 不會 round-trip。已知 limitation，非 regression。

### D-002

- component_type: middleware_failure
- severity: MINOR
- where: `src/lib/nfoParser.ts` § `serializeNfo`
- reproduce: 任何含完整欄位的 NFO round-trip → 欄位順序與原檔不同
- 已知 / 推測原因: serializer 用固定欄位順序輸出，未保留原始 input 順序。對使用者無功能影響，但 git diff 雜訊大。

### D-003

- component_type: missing_skill
- severity: MAJOR
- where: 整個 `src/` 渲染層（App.tsx、components/）
- reproduce: 無 E2E 測試覆蓋 select-edit-save 流程或批次套用 UI
- 已知 / 推測原因: 從未加 Playwright；本輪 a28d06b 的 bug 也是 user 在實機才發現（unit test 全綠但 user-perceived bug 存在）。是 testing gap。

## 4. 下一步最佳動作

### 建議的 next task

`feat-008` — Batch edit for genres / tags / studios（per `docs/feature_list.json`）。

理由：
- 重用 `feat-006` 已驗證的 BatchEditor UX 與資料流（preload、session token、stale reconciliation guard）
- 資料結構比 actor 簡單（flat string array vs. `Actor[]` 加 role/order/type），bug surface 小
- 直接擴展 `applyBatchActorOps` 的 pattern → `applyBatchListOps`，pure function 可直接寫 unit test

### Don't touch list

- `src/lib/nfoParser.ts:KNOWN_TOP_LEVEL_KEYS`: 不要新增 entry 除非同時新增該欄位的 parser/serializer 支援。新增 entry 會讓對應元素從「unknown 保留」轉成「parser 認得但會被 strip」——這正是 a28d06b 修掉的問題。
- `src/lib/batchOperations.ts:applyBatchActorOps` 內 fixpoint 改名衝突偵測（行 142-210 附近）: 邏輯已通過 38 個測試含三向 swap / circular rename / 多對一衝突。不要簡化成 first-match-wins 或單輪檢查。
- `src/App.tsx:handleBatchApply` 內 capturedSelectedPath / capturedCurrentData 的 stale reconciliation guard: 過去多次 fix（a4e8ceb / 6030385 / 7e4c055）才到目前形態，移除會讓「儲存中切檔」回歸。

### Blockers

無。

## 5. 命令

**Shell**: bash

### Start

```bash
# 啟動 vite dev server（renderer hot reload，Electron main 不重建）
npm run dev
```

### Verify

```bash
# 跑完整驗證（install + test + build）。Windows 推薦。
powershell.exe -NoProfile -File ./init.ps1

# 跨平台等價，bash 直接跑
npm install && npm test && npm run build

# 跑局部驗證（單測試檔）
npx vitest run src/lib/__tests__/nfoParser.test.ts
npx vitest run src/lib/__tests__/batchOperations.test.ts
```

### Debug

```bash
# Reproduce 「批次套用清掉未知 XML」回歸（修復前的場景）
# 1. 開啟一個有 <art>/<fileinfo>/<website> 的 NFO（Jellyfin 寫出的標準格式）
# 2. parseNfo → serializeNfo → diff
node -e "const{parseNfo,serializeNfo}=require('./dist/lib/nfoParser.js');const fs=require('fs');const x=fs.readFileSync(process.argv[1],'utf8');console.log(serializeNfo(parseNfo(x)));" path/to/sample.nfo
```
