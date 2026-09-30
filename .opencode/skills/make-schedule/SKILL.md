---
name: make-schedule
description: Create an automatic recurring schedule from chat. Use when the user says create a schedule, every day, automatically, remind me every morning, or schedule this.
---

# Create Automatic Schedule

Never just promise "sure, I will remind you". Build an artifact that runs on its own + verify it.

## Options (ask the user one sentence if unclear)

### A. Bot /task (easiest, for @grinev/opencode-telegram-bot users)
Tell the user to run this in Telegram:
```
/task 07:00 <the recurring task in one sentence>
/tasklist
```
Good for: morning briefings, reminders. No coding needed.

### B. Windows Task Scheduler + opencode run (robust, runs even when Telegram is off)
1. Generate a script at `scripts/<name>.ps1`, e.g.:
```powershell
$Root = Split-Path -Parent $PSScriptRoot
if (Test-Path "$Root\tools\env.ps1") { . "$Root\tools\env.ps1" }
Set-Location -LiteralPath $Root
opencode run --agent velqen "<the task>" --format json >> "$Root\.opencode\run-log.json"
```
2. Register it via PowerShell (resolve the repo root on the user's machine first — never hardcode a path from another computer. Show the command to the user, ask for bash approval):
```powershell
$Repo = "<absolute path of this repo on this machine>"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File $Repo\scripts\<name>.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 07:00
Register-ScheduledTask -TaskName "velqen-<name>" -Action $action -Trigger $trigger
```
3. Verify: `Get-ScheduledTask -TaskName "velqen-<name>"` must exist + one test run.
4. To push results to Telegram automatically: add a send step via the bot MCP / webhook in the script, or tell the user to check via `/tasklist`.

## Rules
- Always state hour + timezone (default Asia/Jakarta).
- Always verify: show `Get-ScheduledTask` output or `/tasklist`, never a bare claim.
- Record active schedules in `.opencode/run-log.json` + offer to store the preference in MEMORY.md.
- Max 5 register-verify loops. After 2 with no progress → stop + report.
