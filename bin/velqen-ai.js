#!/usr/bin/env node
// velqen-ai CLI. After `npm install -g velqen-ai`:
//   velqen-ai doctor   -> check what's present (node, python, opencode, .env)
//   velqen-ai install  -> fill what's missing (opencode auto-install included)
//   velqen-ai serve    -> run `opencode serve`
// No dependencies. Never overwrites your files, only fills gaps.

import { spawnSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const GLYPHS = {
  V: ["█   █", "█   █", "█   █", " █ █ ", "  █  "],
  E: ["█████", "█    ", "████ ", "█    ", "█████"],
  L: ["█    ", "█    ", "█    ", "█    ", "█████"],
  Q: [" ████", "█   █", " ████", "    █", "    █"],
  N: ["█   █", "██  █", "█ █ █", "█  ██", "█   █"]
};
const BANNER = [0, 1, 2, 3, 4]
  .map((r) => "VELQEN".split("").map((ch) => GLYPHS[ch][r]).join("  "))
  .join("\n");

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));
    if (pkg && pkg.version) return "v" + pkg.version;
  } catch {
    // no version, no problem
  }
  return "";
}

function showBanner() {
  console.log(BANNER);
  const v = getVersion();
  console.log("self-improving personal assistant for OpenCode" + (v ? " " + v : ""));
  console.log("");
}

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
  showBanner();
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
  showBanner();
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
  console.log("  1. velqen-ai setup (Telegram token + model login, interactive)");
  console.log("  2. velqen-ai serve  (then: npx @grinev/opencode-telegram-bot@latest)");
}

function serve() {
  if (!versionOf("opencode")) throw new Error("opencode not found. Run `velqen-ai install` first.");
  run("opencode", ["serve"], { stdio: "inherit" });
}

function readEnvLines() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    const ex = findExample(".env");
    if (!ex) throw new Error("no .env or template found. Run this inside your velqen-ai folder.");
    copyFileSync(ex, envPath);
    console.log(".env created from example.");
  }
  return { envPath, lines: readFileSync(envPath, "utf8").split("\n") };
}

function envGet(lines, key) {
  const l = lines.find((x) => x.startsWith(key + "="));
  return l ? l.slice(key.length + 1).trim() : "";
}

function envSet(lines, key, value) {
  const i = lines.findIndex((x) => x.startsWith(key + "="));
  if (i >= 0) lines[i] = key + "=" + value;
  else lines.push(key + "=" + value);
}

async function setup() {
  showBanner();
  const { envPath, lines } = readEnvLines();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let alive = true;
  rl.on("close", () => { alive = false; });
  // askRaw resolves null when stdin dies (EOF/pipe closed) instead of hanging.
  const askRaw = (q) => {
    if (!alive) return Promise.resolve(null);
    return Promise.race([
      rl.question(q),
      new Promise((res) => rl.once("close", () => res(null))),
    ]);
  };
  try {
    const ask = async (question, current, secret) => {
      const shown = current ? (secret ? current.slice(0, 6) + "..." : current) : "(empty)";
      const ans = String(await askRaw(question + " [" + shown + "]: ") || "").trim();
      return ans || current; // empty (or dead stdin) keeps existing
    };

    console.log("Telegram bot (get the token from @BotFather, your ID from @userinfobot).");
    console.log("Empty answer keeps the current value.");
    const token = await ask("Bot token", envGet(lines, "TELEGRAM_BOT_TOKEN"), true);
    if (token && !token.includes(":")) {
      console.warn("warning: that does not look like a bot token (expected digits:secret). Saved anyway.");
    }
    const userId = await ask("Allowed user ID", envGet(lines, "TELEGRAM_ALLOWED_USER_ID"), false);
    if (userId && !/^[0-9]+$/.test(userId)) {
      console.warn("warning: user ID is usually digits only. Saved anyway.");
    }
    envSet(lines, "TELEGRAM_BOT_TOKEN", token);
    envSet(lines, "TELEGRAM_ALLOWED_USER_ID", userId);
    writeFileSync(envPath, lines.join("\n"));
    console.log("saved to .env (never committed to git).");

    const loginDefault = process.stdin.isTTY ? "Y" : "n";
    const rawLogin = await askRaw("Login AI model now via opencode? [Y/n] (default " + loginDefault + "): ");
    const login = String(rawLogin || "").trim() || loginDefault;
    if (/^y/i.test(login)) {
      if (!versionOf("opencode")) {
        console.log("opencode not found. Run `velqen-ai install` first, then `velqen-ai setup` again.");
      } else {
        run("opencode", ["auth", "login"], { stdio: "inherit" });
      }
    } else {
      console.log("skipped. Later: `opencode auth login` (or pick a model inside opencode with /models).");
    }
  } finally {
    rl.close();
  }
  console.log("");
  console.log("DONE. Next: velqen-ai serve  (then: npx @grinev/opencode-telegram-bot@latest)");
}

function help() {
  showBanner();
  console.log("Usage: velqen-ai <command>");
  console.log("  velqen-ai doctor   check runtimes, opencode, and local files");
  console.log("  velqen-ai install  auto-install opencode if missing + scaffold .env");
  console.log("  velqen-ai setup    interactive setup: Telegram token + model login");
  console.log("  velqen-ai serve    run `opencode serve`");
}

try {
  const cmd = (process.argv[2] || "help").toLowerCase();
  if (cmd === "doctor") doctor();
  else if (cmd === "install") install();
  else if (cmd === "setup") await setup();
  else if (cmd === "serve") serve();
  else help();
} catch (e) {
  console.error("error: " + (e && e.message ? e.message : e));
  process.exit(1);
}
