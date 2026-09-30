#!/usr/bin/env node
// velqen-ai CLI. After `npm install -g velqen-ai`:
//   velqen-ai doctor   -> check what's present (node, python, opencode, .env)
//   velqen-ai install  -> fill what's missing (opencode auto-install included)
//   velqen-ai serve    -> run `opencode serve`
// No dependencies. Never overwrites your files, only fills gaps.

import { spawnSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IS_WIN = process.platform === "win32";

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", shell: IS_WIN, ...opts });
}

function versionOf(cmd, verArgs = ["--version"]) {
  try {
    const r = run(cmd, verArgs, { stdio: "pipe" });
    if (r.status === 0 && r.stdout) return r.stdout.trim().split("\n")[0];
  } catch {
    // not found
  }
  return null;
}

function bundledTool(rel) {
  const p = join(process.cwd(), rel);
  if (existsSync(p)) return "bundled at " + p + " (load tools/env.ps1)";
  return null;
}

function exampleName(name) {
  if (name.endsWith(".md")) return name.slice(0, -3) + ".example.md";
  return name + ".example";
}

function findExample(name) {
  const ex = exampleName(name);
  if (existsSync(join(process.cwd(), ex))) return join(process.cwd(), ex);
  if (existsSync(join(PKG_ROOT, ex))) return join(PKG_ROOT, ex);
  return null;
}

function ensureOpencode() {
  let v = versionOf("opencode");
  if (v) {
    console.log("opencode: " + v);
    return;
  }
  console.log("opencode not found, installing (required)...");
  run("npm", ["install", "-g", "opencode-ai"], { stdio: "inherit" });
  v = versionOf("opencode");
  if (!v) throw new Error("opencode install failed. Fix node/npm, then re-run `velqen-ai install`.");
  console.log("opencode: " + v);
}

function prefetchBot() {
  console.log("prefetching telegram bot (best-effort)...");
  const r = run("npm", ["install", "-g", "@grinev/opencode-telegram-bot"], { stdio: "pipe" });
  if (r.status !== 0) {
    console.warn("warning: bot prefetch failed (network?). Continuing - it will be fetched via npx on first use.");
  } else {
    console.log("telegram bot ready.");
  }
}

function ensureFiles() {
  for (const name of [".env", "USER.md", "MEMORY.md"]) {
    const target = join(process.cwd(), name);
    if (existsSync(target)) {
      console.log(name + " exists, not overwritten.");
      continue;
    }
    const ex = findExample(name);
    if (!ex) {
      console.warn("warning: template for " + name + " not found, skipping.");
      continue;
    }
    copyFileSync(ex, target);
    console.log(name + " created from example. Fill it in!");
  }
}

function doctor() {
  console.log("== velqen-ai doctor ==");
  const major = parseInt(process.version.slice(1), 10);
  console.log("node: " + process.version + (major >= 20 ? " (ok)" : " (NEEDS >= 20, use install.bat for portable node)"));
  console.log("npm: " + (versionOf("npm") || "MISSING"));
  console.log("python: " + (versionOf("python") || versionOf("python3") || bundledTool(join("tools", "python", "python.exe")) || "MISSING (warn-only, some tools need it)"));
  console.log("opencode: " + (versionOf("opencode") || bundledTool(join("tools", "node", "opencode.cmd")) || "MISSING (run `velqen-ai install`)"));
  console.log("telegram bot: " + (versionOf("opencode-telegram") || "not checked (fetched via npx on first use)"));
  console.log(".env: " + (existsSync(join(process.cwd(), ".env")) ? "present" : "MISSING (run `velqen-ai install`)"));
  console.log("USER.md: " + (existsSync(join(process.cwd(), "USER.md")) ? "present" : "missing"));
  console.log("MEMORY.md: " + (existsSync(join(process.cwd(), "MEMORY.md")) ? "present" : "missing"));
}

function install() {
  console.log("== velqen-ai install ==");
  const major = parseInt(process.version.slice(1), 10);
  if (major < 20) {
    throw new Error("Node " + process.version + " too old (needs 20+). No Node at all? Clone the repo and run install.bat for portable runtimes.");
  }
  if (!versionOf("python") && !versionOf("python3") && !existsSync(join(process.cwd(), "tools", "python", "python.exe"))) {
    console.warn("warning: no python found (some tools need it). Continuing anyway.");
  }
  ensureOpencode();
  prefetchBot();
  ensureFiles();
  console.log("");
  console.log("DONE. Next:");
  console.log("  1. fill in .env (TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_USER_ID)");
  console.log("  2. opencode auth login (or pick a model inside opencode with /models)");
  console.log("  3. velqen-ai serve  (then: npx @grinev/opencode-telegram-bot@latest)");
}

function serve() {
  if (!versionOf("opencode")) throw new Error("opencode not found. Run `velqen-ai install` first.");
  run("opencode", ["serve"], { stdio: "inherit" });
}

function help() {
  console.log("velqen-ai — self-improving personal assistant for OpenCode");
  console.log("  velqen-ai doctor   check runtimes, opencode, and local files");
  console.log("  velqen-ai install  auto-install opencode if missing + scaffold .env");
  console.log("  velqen-ai serve    run `opencode serve`");
}

try {
  const cmd = (process.argv[2] || "help").toLowerCase();
  if (cmd === "doctor") doctor();
  else if (cmd === "install") install();
  else if (cmd === "serve") serve();
  else help();
} catch (e) {
  console.error("error: " + (e && e.message ? e.message : e));
  process.exit(1);
}
