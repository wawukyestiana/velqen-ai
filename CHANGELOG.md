# Changelog

All notable changes to Velqen AI are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2026-09-30

### Added
- `velqen` primary agent + `judge` reviewer subagent.
- Skills: `self-improve` (observe → distill → reuse → refine), `make-schedule` (automatic schedules).
- Command: `/schedule`.
- Windows installer with runtime choice (existing / fresh portable / winget) + auto-install of the opencode CLI with abort-on-failure for critical steps.
- Portable `tools/` runtimes (Node 22 + Python 3.12); existing runtimes on the machine are referenced in place when found.
- npm plugin entry (`plugin/velqen-ai.js`): registers the bundled agent, skills and commands in any opencode setup via `"plugin": ["velqen-ai"]`, never overwriting user config.
- `velqen-ai` CLI via `npm install -g velqen-ai` (`doctor` auto-checks runtimes, `install` auto-installs opencode when missing).
- `velqen-ai` on PATH after full install (repo `bin/` shim + user PATH entry, no npm needed).
- Zero-click `bootstrap.ps1` one-liner (Git auto-install + clone + install).
- Approvals disabled by default (single-user); scheduled runs use `opencode run --auto`; Git auto-installs when missing.
- VELQEN banner across CLI, installer, and bootstrap entry points.
- Unified interactive `velqen-ai` menu (banner once, one CLI for setup/serve/doctor/install).
- `install.bat` hands off to the unified CLI when Node exists (runtime menu only on node-less machines); CLI also ensures Git + user PATH.
- `velqen-ai setup` wizard (Telegram token + model choice: Zen free / own key / Ollama; interactive terminal only, never overwrites).
