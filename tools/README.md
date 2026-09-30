# tools/ — Velqen AI runtimes (3 modes)

This folder is empty in git. The installer decides how to fill it.
With no flags it reuses what's there, else it ASKS: existing runtimes or fresh download.

- **Existing mode** (`[1]`): Node + Python already on the machine (system PATH,
  Program Files, version managers, ...) are referenced IN PLACE — nothing is downloaded
  or copied. Only `env.ps1` is written.
- **Portable mode** (fallback for machines with no runtimes): Node 22 LTS +
  Python 3.12 are downloaded into `tools/node/` + `tools/python/`.
- **System mode** (`install.bat -System`): nothing is put here, winget packages are used.

After install (Windows example):
```
tools/
  env.ps1  # puts the chosen runtimes first on PATH (generated, not committed)
  node/    # ONLY in portable mode
  python/  # ONLY in portable mode
```

Why reference instead of copy?
- A full `node.exe` is ~80 MB and a full Python is hundreds of MB —
  copying them would bloat every clone and go stale on updates.
- Every Velqen AI script (`scripts/*.ps1`) sources `tools/env.ps1` first,
  falling back to system binaries.
- If your existing runtimes move or you switch versions,
  re-run `install.bat -Existing` to re-point `env.ps1`.

Recommendation: NEVER commit tools/ contents to git (already in `.gitignore`).
