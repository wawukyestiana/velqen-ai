#Requires -Version 5.1
<#
Velqen AI installer (Windows).
  install.bat              -> smart default (no questions when possible):
                            - tools/ already filled (copy/download) -> reuse as-is
                            - else Laragon found -> ask [1] existing / [2] fresh / [3] winget
                            - else no runtimes at all -> ask [1] system / [2] fresh / [3] winget
  install.bat -Laragon     -> force Laragon runtimes (fail if not found)
  install.bat -Portable    -> force fresh portable download into tools/
  install.bat -System      -> system-wide via winget, no tools/ folder

Flags skip the menu (for automation). No flags = ask only when needed.
Model + API key are handled inside opencode itself (/models, auth login).

Result: tools/env.ps1, .env, opencode + Telegram bot ready.
Existing binaries (Laragon/system/tools-copy) are referenced in place, never copied.
Only portable mode downloads binaries into tools/node + tools/python.
#>
param([switch]$System, [switch]$Laragon, [switch]$Portable)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Root) { $Root = (Get-Location).Path }
$Tools = Join-Path $Root "tools"
$NodeVer = "v22.14.0"
$PyVer = "3.12.8"

function Have($cmd) { $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }

function Find-Laragon {
  foreach ($base in @("D:\laragon", "C:\laragon")) {
    $nodeDir = Join-Path $base "bin\nodejs"
    $pyDir = Join-Path $base "bin\python"
    $node = Get-ChildItem -LiteralPath $nodeDir -Directory -ErrorAction SilentlyContinue |
      Where-Object { Test-Path (Join-Path $_.FullName "node.exe") } |
      Sort-Object Name -Descending | Select-Object -First 1
    $py = Get-ChildItem -LiteralPath $pyDir -Directory -ErrorAction SilentlyContinue |
      Where-Object { Test-Path (Join-Path $_.FullName "python.exe") } |
      Sort-Object Name -Descending | Select-Object -First 1
    if ($node -and $py) { return @{ Node = $node.FullName; Python = $py.FullName } }
  }
  return $null
}

Write-Output "== Velqen AI install ($Root) =="

if ($System) {
  Write-Output "-- System mode: checking winget..."
  if (Have "winget") {
    winget install --silent OpenJS.NodeJS.LTS Python.Python.3.12 Git.Git 2>$null
  } else { Write-Warning "No winget found, skipping. Install node/python/git manually." }
} else {
  New-Item -ItemType Directory -Force -Path $Tools | Out-Null
  $useCopy = $false
  $useLaragon = $false
  $doPortable = $false
  $useSystem = $false
  $copyReady = (Test-Path "$Tools\node\node.exe") -and (Test-Path "$Tools\python\python.exe")
  if ($Laragon) {
    $found = Find-Laragon
    if (-not $found) { throw "Laragon runtimes not found. Install Laragon or run without -Laragon." }
    $useLaragon = $true
  } elseif ($Portable) {
    $doPortable = $true
  } elseif ($copyReady) {
    $useCopy = $true
  } else {
    $found = Find-Laragon
    Write-Output "Choose runtime source:"
    if ($found) {
      Write-Output "  [1] Existing Laragon runtimes (no download) - RECOMMENDED"
      Write-Output ("      node:   " + $found.Node)
      Write-Output ("      python: " + $found.Python)
    } else {
      Write-Output "  [1] Existing system runtimes from PATH (no download)"
    }
    Write-Output "  [2] Fresh portable download (Node 22 + Python 3.12 into tools/, needs internet)"
    Write-Output "  [3] System packages via winget"
    try { $choice = Read-Host -Prompt "Enter choice [1/2/3] (default 1)" }
    catch { $choice = "" }
    if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }
    switch ($choice.Trim()) {
      "1" { if ($found) { $useLaragon = $true } else { $useSystem = $true } }
      "2" { $doPortable = $true }
      "3" {
        Write-Output "-- System mode: checking winget..."
        if (Have "winget") {
          winget install --silent OpenJS.NodeJS.LTS Python.Python.3.12 Git.Git 2>$null
        } else { Write-Warning "No winget found, skipping. Install node/python/git manually." }
        $useSystem = $true
      }
      default {
        Write-Output "Unknown choice, using default."
        if ($found) { $useLaragon = $true } else { $useSystem = $true }
      }
    }
  }
  if ($useCopy) {
    Write-Output "-- reusing existing tools/ runtimes (no download, no changes)."
    if (Test-Path "$Tools\env.ps1") { . "$Tools\env.ps1" }
  } elseif ($useLaragon) {
    Write-Output "-- reusing Laragon runtimes (no download, no copy):"
    Write-Output ("   node:   " + $found.Node)
    Write-Output ("   python: " + $found.Python)
    $lines = @(
      '$LaragonNode = "{0}"' -f $found.Node
      '$LaragonPy = "{0}"' -f $found.Python
      '$env:Path = "$LaragonNode;$LaragonPy;" + $env:Path'
    )
    Set-Content -LiteralPath (Join-Path $Tools "env.ps1") -Value $lines
    . (Join-Path $Tools "env.ps1")
  } elseif ($doPortable) {
    New-Item -ItemType Directory -Force -Path "$Tools\node", "$Tools\python" | Out-Null
    # --- portable Node ---
    if (-not (Test-Path "$Tools\node\node.exe")) {
      Write-Output "-- downloading portable Node $NodeVer..."
      $zip = "$Tools\node.zip"
      Invoke-WebRequest -Uri "https://nodejs.org/dist/$NodeVer/node-$NodeVer-win-x64.zip" -OutFile $zip
      Expand-Archive -LiteralPath $zip -DestinationPath "$Tools\tmp-node" -Force
      Copy-Item "$Tools\tmp-node\node-$NodeVer-win-x64\*" -Destination "$Tools\node" -Recurse -Force
      Remove-Item -Recurse -Force "$Tools\tmp-node", $zip
    }
    # --- portable Python ---
    if (-not (Test-Path "$Tools\python\python.exe")) {
      Write-Output "-- downloading portable Python $PyVer..."
      $zip = "$Tools\python.zip"
      Invoke-WebRequest -Uri "https://www.python.org/ftp/python/$PyVer/python-$PyVer-embed-amd64.zip" -OutFile $zip
      Expand-Archive -LiteralPath $zip -DestinationPath "$Tools\python" -Force
      Remove-Item -Force $zip
    }
    # --- env.ps1: prefer tools/ first ---
    $lines = @(
      '$Tools = Split-Path -Parent $MyInvocation.MyCommand.Path'
      '$env:Path = "$Tools\node;$Tools\python;" + $env:Path'
    )
    Set-Content -LiteralPath (Join-Path $Tools "env.ps1") -Value $lines
    . (Join-Path $Tools "env.ps1")
  } else {
    if (-not (Have "node")) { throw "node not found on PATH. Re-run and choose [2], or install Node first." }
    if (-not (Have "python")) { throw "python not found on PATH. Re-run and choose [2], or install Python first." }
    Write-Output "-- using system runtimes from PATH (no download, no copy)."
    Set-Content -LiteralPath (Join-Path $Tools "env.ps1") -Value @("# System runtimes from PATH, nothing to prepend.")
  }
}

Write-Output "-- versions: node $(node -v 2>$null) / python $(python --version 2>&1) / npm $(npm -v 2>$null)"

# --- git (needed for clone/updates; auto-install when missing) ---
if (-not (Have "git")) {
  Write-Output "-- git not found, installing via winget..."
  if (Have "winget") { winget install --silent Git.Git } else { Write-Warning "No git and no winget. Install Git manually if you need cloning." }
} else { Write-Output ("-- git: " + (git --version 2>$null)) }

# --- opencode CLI (REQUIRED: abort the whole install if this fails) ---
# Everything downstream (bot, serve, schedules) needs opencode, so continuing
# without it would only produce a broken setup.
if (-not (Have "opencode")) {
  Write-Output "-- installing opencode (required)..."
  try { npm install -g opencode-ai }
  catch { throw ("opencode install failed: " + $_.Exception.Message + " Fix node/npm first (see versions above), then re-run install.bat.") }
}
if (-not (Have "opencode")) { throw "opencode still not found after install. Check that the npm global bin folder is on PATH, then re-run install.bat." }
Write-Output ("-- opencode: " + (opencode --version 2>$null))

# --- prefetch Telegram bot package (BEST-EFFORT: warn and continue on failure) ---
# The bot also runs via npx at runtime, so a failed prefetch must never abort the install.
# NOTE: $ErrorActionPreference is relaxed around npm because npm prints warnings
# to stderr, and PS 5.1 treats native stderr as terminating when EAP is "Stop".
Write-Output "-- prefetching telegram bot..."
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try { npm install -g @grinev/opencode-telegram-bot 2>&1 | Out-Null } catch { }
$botExit = $LASTEXITCODE
$ErrorActionPreference = $prevEAP
if ($botExit -ne 0) { Write-Warning "Telegram bot prefetch failed (network?). Continuing anyway - it will be fetched via npx on first use." }

# --- .env ---
if (-not (Test-Path "$Root\.env")) {
  Copy-Item "$Root\.env.example" "$Root\.env"
  Write-Output "-- .env created from the example. FILL IN your tokens before running."
} else { Write-Output "-- .env already exists, not overwritten." }

# --- local-only memory files (personal data, never committed, see .gitignore) ---
if (-not (Test-Path "$Root\USER.md")) { Copy-Item "$Root\USER.example.md" "$Root\USER.md" }
if (-not (Test-Path "$Root\MEMORY.md")) { Copy-Item "$Root\MEMORY.example.md" "$Root\MEMORY.md" }
Write-Output "-- USER.md / MEMORY.md ready (local-only, fill in your name)."

Write-Output ""
Write-Output "DONE. Next:"
Write-Output "  1. fill in .env (TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_USER_ID)"
Write-Output "  2. opencode auth login (or pick a model inside opencode with /models)"
Write-Output "  3. opencode serve  (then in another terminal: npx @grinev/opencode-telegram-bot@latest)"
Write-Output "NOTE: if you switch the active Node/Python version inside Laragon, re-run install.bat -Laragon."
