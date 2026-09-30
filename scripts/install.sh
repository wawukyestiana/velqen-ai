#!/usr/bin/env bash
# Velqen AI installer (Linux/macOS). Portable tools/ + opencode.
set -e
echo "█   █  █████  █       ████  █████  █   █"
echo "█   █  █      █      █   █  █      ██  █"
echo "█   █  ████   █       ████  ████   █ █ █"
echo " █ █   █      █          █  █      █  ██"
echo "  █    █████  █████      █  █████  █   █"
echo "self-improving personal assistant for OpenCode"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/tools"
mkdir -p "$TOOLS/node" "$TOOLS/python"

if ! command -v node >/dev/null; then
  echo "-- installing Node 22 via nodejs.org..."
  if command -v brew >/dev/null; then brew install node@22
  else echo "Install Node 22 LTS manually from https://nodejs.org then re-run."; exit 1; fi
fi
if ! command -v python3 >/dev/null; then echo "Install python3 first."; exit 1; fi
if ! command -v opencode >/dev/null; then
  echo "-- installing opencode..."
  curl -fsSL https://opencode.ai/install | bash
fi
npm install -g @grinev/opencode-telegram-bot 2>/dev/null || true
[ -f "$ROOT/.env" ] || cp "$ROOT/.env.example" "$ROOT/.env"
echo "DONE. Fill in .env, then: opencode auth login && opencode serve"
