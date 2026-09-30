#Requires -Version 5.1
<#
Velqen AI zero-click bootstrap (kept at repo root so the URL stays short).
Paste once on a fresh Windows machine (internet, nothing else required):

  powershell -c "irm https://raw.githubusercontent.com/<user>/velqen-ai/main/bootstrap.ps1 | iex"

(Already inside PowerShell? Drop the wrapper: irm https://raw.githubusercontent.com/<user>/velqen-ai/main/bootstrap.ps1 | iex)

It installs Git (via winget) when missing, clones the repo, and runs install.bat.
Optional installer flags: -InstallerArgs "-Portable" (or "-Laragon", "-System").

Trust note: this runs code from YOUR OWN repo over HTTPS - the same trust
model as any `curl | bash` installer. Verify the URL before pasting.
#>
param(
  [string]$Repo = "https://github.com/<user>/velqen-ai.git",
  [string]$Dest = "$env:USERPROFILE\velqen-ai",
  [string]$InstallerArgs = ""
)

$ErrorActionPreference = "Stop"
function Have($cmd) { $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }

if (-not (Have "git")) {
  Write-Output "-- git not found, installing via winget..."
  winget install --silent Git.Git
  $m = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
  $u = [System.Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = $m + ";" + $u
  if (-not (Have "git")) { throw "Git installed but not on PATH. Restart the terminal and re-run the bootstrap line." }
}
if (-not (Test-Path (Join-Path $Dest ".git"))) {
  Write-Output "-- cloning into $Dest ..."
  git clone $Repo $Dest
} else {
  Write-Output "-- repo already here, pulling latest..."
  git -C $Dest pull --ff-only
}
Write-Output "-- launching installer..."
if ([string]::IsNullOrWhiteSpace($InstallerArgs)) {
  & (Join-Path $Dest "install.bat")
} else {
  & (Join-Path $Dest "install.bat") $InstallerArgs.Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)
}
