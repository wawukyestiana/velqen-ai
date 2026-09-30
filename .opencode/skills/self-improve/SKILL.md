---
name: self-improve
description: Velqen AI learning loop like Hermes. Use when a task repeats 3+ times, when the user says make this a skill, learn this, or remember how to do this. Handles observe distill reuse refine plus skill creation and modification.
---

# Self-Improve — observe → distill → reuse → refine

## When to use
- The same task succeeded 3x with the same pattern.
- The user says: "make this a skill", "learn this", "remember how to do this".
- An old skill fails / its commands are stale → fix it, never leave it rotten.

## Procedure

### 1. Observe
Read `.opencode/run-log.json` (create it if missing) + the last 3 relevant sessions.
Note: steps, tools used, user corrections, what made it succeed.

### 2. Distill
Create `.opencode/skills/<skill-name>/SKILL.md` with frontmatter:
```
---
name: <skill-name>
description: <what + when to use, third person, lead with the user's likely keywords>
---
```
Body: numbered steps, exact commands, pitfalls, how to verify. Max one screen.
Never store secrets. Put trigger keywords up front in the description.

### 3. Reuse
Immediately try the new skill on the current task. Verify with a real tool.
Ask the judge (`judge.md`) to grade: `{"met":..., "reason":...}`.

### 4. Refine
On failure: patch SKILL.md in place (skill modification), note what changed.
If a skill is unused for 30 days / its commands are stale: mark DEPRECATED at the top.

## Limits
- Max 1 new skill per session unless the user asks for more.
- Always show the diff / skill content to the user before claiming "skill done".
