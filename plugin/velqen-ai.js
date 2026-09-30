// velqen-ai — opencode plugin entry.
//
// Install: add "velqen-ai" to the "plugin" array in opencode.json, or run:
//   opencode plugin add velqen-ai
//
// What it does (via the config hook, once at startup):
//   - registers this package's bundled skills (.opencode/skills/*/SKILL.md)
//   - registers the bundled agents (.opencode/agent/*.md) and commands
//     (.opencode/command/*.md) WITHOUT overwriting anything the user
//     already defined (user config always wins).
//
// Dependency-free on purpose: no build step, no install-time downloads.

import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(HERE, "..");
const SKILLS_DIR = join(PKG_ROOT, ".opencode", "skills");
const AGENTS_DIR = join(PKG_ROOT, ".opencode", "agent");
const COMMANDS_DIR = join(PKG_ROOT, ".opencode", "command");

// Minimal frontmatter parser: top-level `key: value` scalars plus one nested
// map level (used for agent `permission:`). Returns null when the file has
// no frontmatter block.
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  const data = {};
  let parent = null;
  for (const raw of m[1].split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const nested = line.match(/^ {2,}(\S[^:]*):\s*(.*)$/);
    if (nested && parent) {
      data[parent][nested[1].trim()] = nested[2].trim();
      continue;
    }
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (top) {
      parent = null;
      if (top[2] === "") {
        parent = top[1];
        data[parent] = {};
      } else {
        data[top[1]] = top[2].trim();
      }
    }
  }
  return { data, body: text.slice(m[0].length).trim() + "\n" };
}

function loadMarkdownDir(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (!f.isFile() || !f.name.endsWith(".md")) continue;
    try {
      const parsed = parseFrontmatter(readFileSync(join(dir, f.name), "utf8"));
      if (parsed) out.push([basename(f.name, ".md"), parsed]);
    } catch {
      // Unreadable file: skip it, never break opencode startup.
    }
  }
  return out;
}

function registerSkills(cfg) {
  if (!existsSync(SKILLS_DIR)) return;
  cfg.skills = cfg.skills && typeof cfg.skills === "object" ? cfg.skills : {};
  if (!Array.isArray(cfg.skills.paths)) cfg.skills.paths = [];
  if (!cfg.skills.paths.includes(SKILLS_DIR)) cfg.skills.paths.push(SKILLS_DIR);
}

function registerAgents(cfg) {
  cfg.agent = cfg.agent && typeof cfg.agent === "object" ? cfg.agent : {};
  for (const [name, { data, body }] of loadMarkdownDir(AGENTS_DIR)) {
    if (cfg.agent[name]) continue; // user config always wins
    const entry = { prompt: body };
    if (data.description) entry.description = data.description;
    if (data.mode) entry.mode = data.mode;
    if (data.model) entry.model = data.model;
    if (data.permission && Object.keys(data.permission).length > 0) entry.permission = data.permission;
    cfg.agent[name] = entry;
  }
}

function registerCommands(cfg) {
  cfg.command = cfg.command && typeof cfg.command === "object" ? cfg.command : {};
  for (const [name, { data, body }] of loadMarkdownDir(COMMANDS_DIR)) {
    if (cfg.command[name] || !body) continue; // user config always wins
    const entry = { template: body };
    if (data.description) entry.description = data.description;
    if (data.agent) entry.agent = data.agent;
    if (data.model) entry.model = data.model;
    cfg.command[name] = entry;
  }
}

async function velqenPlugin() {
  return {
    config: async (cfg) => {
      if (!cfg || typeof cfg !== "object") return;
      registerSkills(cfg);
      registerAgents(cfg);
      registerCommands(cfg);
    },
  };
}

export { velqenPlugin as velqen };
export default velqenPlugin;
