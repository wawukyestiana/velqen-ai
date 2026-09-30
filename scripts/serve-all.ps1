#Requires -Version 5.1
<#
Velqen AI one-terminal launcher: opencode serve (background job) + Telegram bot
(foreground). Run from anywhere - it cds to the repo. Ctrl+C stops both.

  serve-all.bat            (double-click)
  powershell -File scripts\serve-all.ps1 [-Port 4096]

Fails fast with a clear message when the Telegram token is missing
(run `velqen-ai setup` first). Reuses the port when serve already runs.
Custom ports need OPENCODE_API_URL set in .env (bot defaults to 4096).
#>
param([int]$Port = 4096)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Root) { $Root = (Get-Location).Path }
if (Test-Path "$Root\tools\env.ps1") { . "$Root\tools\env.ps1" }
Set-Location -LiteralPath $Root

function Test-ServePort($port) {
  try {
    $c = New-Object Net.Sockets.TcpClient
    $iar = $c.BeginConnect("127.0.0.1", $port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(1000)
    $c.Close()
    return $ok
  } catch { return $false }
}

# --- pre-flight: bot token must exist (bot reads .env from this folder) ---
$botToken = ""
$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
  $m = Select-String -Pattern "^TELEGRAM_BOT_TOKEN=(.+)$" -LiteralPath $envFile | Select-Object -First 1
  if ($m) { $botToken = $m.Matches[0].Groups[1].Value.Trim() }
}
if ([string]::IsNullOrWhiteSpace($botToken)) {
  throw "TELEGRAM_BOT_TOKEN is empty in $envFile. Run velqen-ai setup first (or fill .env), then re-run."
}

$job = $null
if (-not (Test-ServePort $Port)) {
  Write-Output "-- starting opencode serve --port $Port (background)..."
  $job = Start-Job -Name velqen-serve -ScriptBlock { Set-Location $using:Root; opencode serve --port $using:Port }
  $deadline = (Get-Date).AddSeconds(60)
  while (-not (Test-ServePort $Port)) {
    if ((Get-Date) -gt $deadline) {
      $log = Receive-Job $job 2>&1 | Out-String
      Stop-Job $job -ErrorAction SilentlyContinue
      Remove-Job $job -Force -ErrorAction SilentlyContinue
      throw "opencode serve did not open port $Port in 60s. Server output: $log"
    }
    Start-Sleep -Seconds 2
  }
  Write-Output "-- serve is up on port $Port."
} else {
  Write-Output "-- port $Port already serving, reusing it."
}

# Resolve bot launcher: global shim first, npx fallback (downloads on first use).
$botCmd = Get-Command opencode-telegram -ErrorAction SilentlyContinue
try {
  Write-Output "-- starting Telegram bot (foreground, Ctrl+C stops everything)..."
  if ($botCmd) { opencode-telegram start }
  else { npx -y @grinev/opencode-telegram-bot@latest start }
} finally {
  if ($job) {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    Write-Output "-- serve stopped."
  }
}
