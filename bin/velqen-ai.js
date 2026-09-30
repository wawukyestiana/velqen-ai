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

// Free models are the *-free ones (plus known free IDs like big-pickle).
// They still need a one-time provider login - there is no usable model with zero auth.
function listFreeModels() {
  try {
    const r = run("opencode", ["models"], { stdio: "pipe" });
    if (r.status !== 0 || !r.stdout) return [];
    return r.stdout
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x && (/free$/i.test(x) || /big-pickle$/i.test(x)));
  } catch {
    return [];
  }
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

function winQuote(s) {
  return /\s/.test(s) ? '"' + s + '"' : s;
}

function ensureGit() {
  const g = versionOf("git");
  if (g) {
    console.log("git: " + g);
    return;
  }
  if (process.platform !== "win32") {
    console.warn("warning: git not found. Install it for cloning (e.g. `sudo apt install git`).");
    return;
  }
  console.log("git not found, installing via winget...");
  run("winget", ["install", "--silent", "Git.Git"], { stdio: "inherit" });
  const g2 = versionOf("git");
  if (g2) console.log("git: " + g2);
  else console.warn("warning: git still not visible. Restart the terminal; if still missing, install Git manually.");
}

function ensurePath() {
  if (process.platform !== "win32") return;
  if (!existsSync(join(PKG_ROOT, "install.bat"))) return; // npm-global install: npm owns bin
  const binDir = join(PKG_ROOT, "bin");
  let cur = "";
  try {
    const r = run("reg", ["query", "HKCU\\Environment", "/v", "Path"], { stdio: "pipe" });
    const line = (r.stdout || "").split("\n").find((x) => x.includes("REG_EXPAND_SZ") || x.includes("REG_SZ"));
    if (line) {
      const m = line.match(/REG_(?:EXPAND_)?SZ\s+(.*)$/);
      if (m) cur = m[1].trim();
    }
  } catch {
    // registry unreadable, fall through to manual note
  }
  // NEVER write when the current value is unreadable - an empty read must not
  // wipe the user's PATH (lesson learned 2026-09-30).
  if (!cur) {
    console.warn("warning: could not read user PATH, skipping PATH update (nothing overwritten). Add manually: " + binDir);
    return;
  }
  if (cur.toLowerCase().split(";").includes(binDir.toLowerCase())) {
    console.log("already on user PATH: " + binDir);
    return;
  }
  const next = cur ? cur.replace(/;$/, "") + ";" + binDir : binDir;
  const r = run("reg", ["add", "HKCU\\Environment", "/v", "Path", "/t", "REG_EXPAND_SZ", "/d", next, "/f"].map(winQuote), { stdio: "pipe" });
  if (r.status === 0) console.log("added to user PATH (open a NEW terminal to use it): " + binDir);
  else console.warn("warning: could not update PATH. Add manually: " + binDir);
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
  const major = parseInt(process.version.slice(1), 10);
  if (major < 20) {
    throw new Error("Node " + process.version + " too old (needs 20+). No Node at all? Clone the repo and run install.bat for portable runtimes.");
  }
  console.log("node: " + process.version + " (" + process.execPath + ")");
  const py = versionOf("python") || versionOf("python3");
  console.log("python: " + (py || "not on PATH (some tools need it)"));
  ensureGit();
  ensureOpencode();
  prefetchBot();
  ensureFiles();
  ensurePath();
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
  if (process.stdout.isTTY) console.clear();
  console.log("Velqen AI setup");
  console.log("");
  if (!process.stdin.isTTY) {
    // Piped/redirected stdin only ever delivers the first answer on some
    // platforms, which would half-apply settings. Refuse instead.
    console.log("setup needs an interactive terminal. Run `velqen-ai setup` in a normal terminal window.");
    console.log("Manual route: copy .env.example to .env, fill TELEGRAM_BOT_TOKEN + TELEGRAM_ALLOWED_USER_ID, then `opencode auth login`.");
    return;
  }
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

    console.log("");
    console.log("AI model (a free built-in tier exists, no key needed to start):");
    console.log("  [1] Free models (one login, $0 usage)");
    console.log("  [2] My own provider key (Anthropic / OpenAI / ...)");
    console.log("  [3] Local model via Ollama (private, needs download)");
    console.log("  [4] Skip for now");
    const rawModel = await askRaw("Choose model [1/2/3/4] (default 1): ");
    const mchoice = rawModel === null ? "4" : (String(rawModel).trim() || "1");
    if (mchoice === "1") {
      if (!versionOf("opencode")) {
        console.log("opencode not found. Run `velqen-ai install` first, then `velqen-ai setup` again.");
      } else {
        let free = listFreeModels();
        if (!free.length) {
          console.log("No free models visible — login first (pick `opencode`).");
          run("opencode", ["auth", "login"], { stdio: "inherit" });
          free = listFreeModels();
        }
        if (free.length) {
          console.log("Free models on your account ($0 usage):");
          free.forEach((m, i) => console.log("  [" + (i + 1) + "] " + m));
          console.log("Pick one inside opencode with /models (exact name as above).");
        } else {
          console.log("Still none. Browse inside opencode with /models — availability depends on your provider.");
        }
      }
    } else if (mchoice === "2") {
      if (!versionOf("opencode")) {
        console.log("opencode not found. Run `velqen-ai install` first, then `velqen-ai setup` again.");
      } else {
        console.log("Launching login — pick your provider and paste the key.");
        run("opencode", ["auth", "login"], { stdio: "inherit" });
      }
    } else if (mchoice === "3") {
      if (versionOf("ollama")) {
        console.log("Ollama found. Pull a model, e.g. `ollama pull qwen3:8b`, then pick it inside opencode with /models.");
      } else {
        console.log("Ollama not found. Install it (`winget install Ollama.Ollama` or https://ollama.com), then `ollama pull qwen3:8b`, then pick it inside opencode with /models.");
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

function usage() {
  console.log("Usage: velqen-ai <command>");
  console.log("  velqen-ai doctor   check runtimes, opencode, and local files");
  console.log("  velqen-ai install  auto-install opencode if missing + scaffold .env");
  console.log("  velqen-ai setup    interactive setup: Telegram token + model choice");
  console.log("  velqen-ai serve    run `opencode serve`");
}

function help() {
  showBanner();
  usage();
}

async function mainMenu() {
  let first = true;
  for (;;) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let alive = true;
    rl.on("close", () => { alive = false; });
    const askOnce = (q) => alive
      ? Promise.race([rl.question(q), new Promise((res) => rl.once("close", () => res(null)))])
      : Promise.resolve(null);
    if (first) {
      if (process.stdout.isTTY) console.clear();
      showBanner();
      first = false;
    } else {
      console.log("");
    }
    console.log("What do you want to do?");
    console.log("  [1] Setup (Telegram token + model)");
    console.log("  [2] Serve (start opencode backend)");
    console.log("  [3] Doctor (check everything)");
    console.log("  [4] Install (fill missing pieces)");
    console.log("  [5] Exit");
    const raw = await askOnce("Choose [1/2/3/4/5]: ");
    rl.close();
    const c = String(raw || "").trim();
    if (raw === null || c === "5") break;
    console.log("");
    if (c === "1") await setup();
    else if (c === "2") serve();
    else if (c === "3") doctor();
    else if (c === "4") install();
    else { console.log("Unknown choice, try 1-5."); continue; }
    const rl2 = createInterface({ input: process.stdin, output: process.stdout });
    let alive2 = true;
    rl2.on("close", () => { alive2 = false; });
    if (alive2) await Promise.race([rl2.question("Press Enter to continue..."), new Promise((res) => rl2.once("close", () => res(null)))]);
    rl2.close();
  }
}

try {
  const arg = process.argv[2];
  const cmd = (arg || "help").toLowerCase();
  if (!arg && process.stdin.isTTY && process.stdout.isTTY) await mainMenu();
  else if (cmd === "doctor") doctor();
  else if (cmd === "install") install();
  else if (cmd === "setup") await setup();
  else if (cmd === "serve") serve();
  else help();
} catch (e) {
  console.error("error: " + (e && e.message ? e.message : e));
  process.exit(1);
}
