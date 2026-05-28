#!/usr/bin/env pwsh
# init.ps1 — Harness verification entry point for nfo-editor.
#
# Runs the standard sequence the harness considers "is the repo healthy":
#   1. Install dependencies
#   2. Run unit tests (vitest)
#   3. Build (vite — also TypeScript-checks via vite-plugin-react)
#
# Exit non-zero on any failure. Agents: if this fails, stop and fix it
# before doing anything else. Do not bundle "fix init" with unrelated work.

$ErrorActionPreference = 'Stop'

function Run-Step {
    param(
        [string]$Label,
        [scriptblock]$Block
    )
    Write-Host ""
    Write-Host "=== $Label ===" -ForegroundColor Cyan
    & $Block
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $Label (exit $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Push-Location $PSScriptRoot
try {
    Run-Step "Install dependencies" { npm install }
    Run-Step "Unit tests"            { npm test }
    Run-Step "Build"                 { npm run build }

    Write-Host ""
    Write-Host "=== Verification complete ===" -ForegroundColor Green
    Write-Host "Repo is in a runnable state." -ForegroundColor Green
}
finally {
    Pop-Location
}
