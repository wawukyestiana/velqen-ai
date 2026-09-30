# Changelog

All notable changes to Velqen AI are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2026-09-30

### Added
- `velqen` primary agent + `judge` reviewer subagent.
- Skills: `self-improve` (observe → distill → reuse → refine), `make-schedule` (automatic schedules).
- Command: `/schedule`.
- Windows installer with runtime choice (existing Laragon/system, fresh portable download, winget) + auto-install of the opencode CLI with abort-on-failure for critical steps.
- Portable `tools/` runtimes (Node 22 + Python 3.12), referenced in place when Laragon is found.
- npm plugin entry (`plugin/velqen-ai.js`): registers the bundled agent, skills and commands in any opencode setup via `"plugin": ["velqen-ai"]`, never overwriting user config.
- `velqen-ai` CLI via `npm install -g velqen-ai` (`doctor` auto-checks runtimes, `install` auto-installs opencode when missing).
- Zero-click `bootstrap.ps1` one-liner (Git auto-install + clone + install).
- Git auto-install when missing (via winget).
