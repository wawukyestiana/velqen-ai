# Velqen AI — self-improving personal assistant on top of OpenCode

Chat from Telegram → runs on your machine via `opencode serve` → handles daily tasks, creates its own automatic schedules, and learns repeating patterns into new skills (Hermes-style: observe → distill → reuse → refine).

## Fresh computer? Start here

You need NOTHING except Windows + internet. Pick one line:

- **Zero-click (recommended):** paste this once, it installs Git if missing, clones, and runs the installer by itself:
  ```
  powershell -c "irm https://raw.githubusercontent.com/wawukyestiana/velqen-ai/main/bootstrap.ps1 | iex"
  ```
  (Already inside PowerShell? Drop the wrapper: `irm https://raw.githubusercontent.com/wawukyestiana/velqen-ai/main/bootstrap.ps1 | iex`.)
  (Runs code from your own repo over HTTPS — same trust as any `curl | bash` installer. Plain `git clone` can never auto-run code by design, otherwise cloning a malicious repo would hack your machine.)
- **Without git:** download this repo as ZIP from GitHub (Code → Download ZIP), extract, double-click `install.bat`. Git is not needed at all for this path.
- **With git:** the only prerequisite is Git itself (`winget install Git.Git`), then `git clone` + `install.bat`.
- **Everything else is automatic:** Node, Python, opencode CLI, Telegram bot, Git (if missing), `.env` / `USER.md` / `MEMORY.md` — all handled by the installer. Nothing to install first.

## Install via npm (no clone, no install.bat)

Needs Node 20+ already on your machine (no Node yet? use the full install below).
```
npm install -g velqen-ai
velqen-ai doctor    # auto-checks: node, python, opencode, .env
velqen-ai install   # auto-installs opencode if missing, scaffolds .env
```

`velqen-ai install` never re-downloads runtimes and never overwrites your files — it only fills what's missing. Then: fill in `.env`, `opencode auth login`, `velqen-ai serve`.

After the full install, `velqen-ai` is also on your PATH (restart the terminal once) — same `doctor`/`install`/`serve` commands, no npm needed. Run it bare (`velqen-ai`) for one interactive menu instead of separate commands.

## Install on a new machine (full, 1 command)

```bat
git clone https://github.com/wawukyestiana/velqen-ai.git
cd velqen-ai
install.bat
```

That's it. If Node 20+ is already on the machine, `install.bat` hands over straight to the unified `velqen-ai` CLI — one screen, no separate menus. Only machines without Node see the runtime question first:
- `[1] Existing runtimes` — Node 20+ and Python already on the machine (PATH, Program Files, version managers, ...) — no download.
- `[2] Fresh portable download` — Node 22 + Python 3.12 into `tools/` (needs internet).
- `[3] System packages` — via winget.

Path picking (which Node/Python folders) also lives in the CLI: `velqen-ai install` shows the paths in use and offers to change them. The `.ps1` menu stays only for machines without Node.

Then it installs the **opencode CLI** + prefetches the **Telegram bot**,
and creates `.env` from the example if missing.

Non-interactive flags (skip the menu, for automation):
- `install.bat -Existing` — force existing runtimes (fails loudly if none found).
- `install.bat -Portable` — force fresh portable download.
- `install.bat -System` — system-wide via winget, no `tools/`.
- Linux/macOS: `bash scripts/install.sh`

Autonomy: approvals are disabled by default (single-user assistant) — `edit`/`bash` are `allow` in `opencode.json` + `agent/velqen.md`. To re-enable prompts, set them back to `ask`. Scheduled runs additionally use `opencode run --auto` since nobody is there to approve.

> `tools/` holds binaries and is NOT committed to git (see `.gitignore`). A new machine = clone + install = tools/ fills itself. Only the recipe is committed.

## Install as an opencode plugin (one line)

If you only want the brain (agent + skills + commands) inside your own opencode setup, no clone needed:

```json
{ "plugin": ["velqen-ai"] }
```

or:

```
opencode plugin add velqen-ai
```

Runtimes (`tools/`), Telegram wiring and schedules stay your own business — see above for the full install.

## One-time setup (5 minutes)

1. Run `velqen-ai setup` — interactive CLI wizard: Telegram token + user ID (from `@BotFather` / `@userinfobot`) + model choice (Zen free tier, own provider key, or local Ollama) with one-key global default. No manual file editing.
2. Log in a model (`opencode auth login`, any model, e.g. Zen or your favorite provider). Switch anytime inside opencode with `/models`.
3. Run everything in ONE terminal:
   ```
   velqen serve
   ```
   - Fails fast if the Telegram token is empty (run `velqen setup` first).
   - Starts `opencode serve` in the background, waits for the port, then runs the Telegram bot in front. Ctrl+C stops both.
   - `serve-all.bat` is the Windows fallback if `velqen` is not yet on PATH.
4. From your phone, chat with your bot. It answers via the `velqen` agent.

## Daily use

- `/schedule <describe the recurring task>` — it builds the schedule via bot `/task` OR `scripts/` + Task Scheduler, then verifies it.
- Any pattern that succeeds 3x → it proposes a new skill under `.opencode/skills/` (the Hermes learning loop).

## Layout

```
opencode.json  .env.example  AGENTS.md  MEMORY.example.md  USER.example.md
(local-only, created by installer, never committed: .env  MEMORY.md  USER.md)
.opencode/agent/velqen.md (primary)  judge.md (cheap subagent)
.opencode/skills/make-schedule|self-improve/SKILL.md
.opencode/command/schedule.md
plugin/velqen-ai.js (npm entry, registers the bundled agent/skills/commands)
bootstrap.ps1 (zero-click one-liner)  install.bat
scripts/install.ps1  install.sh
tools/ (filled by the installer, never committed)
```

## Publish so others can install it

```bat
git init
git add .
git commit -m "Velqen AI initial"
git remote add origin https://github.com/wawukyestiana/velqen-ai.git
git push -u origin main
```

Others then just `git clone ...` + `install.bat`. Never commit `.env` / tokens.

## Publish the npm package

One-time: replace `wawukyestiana` in `package.json`/links, put your name in `LICENSE`, create an npm account. Then:

```
npm login
npm publish --access public
```

Bump `version` + add a `CHANGELOG.md` entry on every release.
