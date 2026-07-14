# AML Hackathon — Claude Code, no terminal required

Gives non-technical teams a real Claude Code coding agent through a friendly web UI.
One command installs everything; a browser page takes their API key; they land straight
in a chat where Claude builds web apps for them and hands them a link to look at.

Built on [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) (pinned v1.36.1),
patched and pre-built into a downloadable bundle.

## What a team does

1. Paste one line into Terminal (Mac) / PowerShell (Windows) — from their invite email.
2. A page opens; they paste their team key; it validates and everything starts.
3. They land in **their workspace**, already selected, and just talk to Claude.
   Claude runs the app and gives them **http://localhost:3000** to see it.

No login, no model picker, no permission prompts, no second command.

## How it works

- **UI:** claudecodeui, run in **platform mode** (`VITE_IS_PLATFORM=true`) so there's no
  login/onboarding screen — it drops straight into the app. A single throwaway user is
  seeded in its SQLite DB (platform mode needs one; its password is never checked).
- **Auth to Anthropic:** the setup server starts the UI with `ANTHROPIC_API_KEY` in its
  environment; claudecodeui's agent-SDK subprocess inherits it → API-key billing, no login.
- **Sonnet only:** the model picker's source list is patched to Sonnet-only at build time —
  the UI physically can't offer anything else.
- **No permission prompts:** patched server-side (`claude-sdk.js`) to always use
  `bypassPermissions` for non-plan runs, so no client state can re-enable prompts.
- **Auto-land in the workspace:** setup registers the starter project via the UI's
  `create-project` API. claudecodeui auto-selects when exactly one project exists, so a
  clean laptop lands the team right in it.
- **Rails:** `project/CLAUDE.md` makes Claude do all technical work, never ask the user for
  a terminal, pin the stack to Vite+React on port 3000, and always give a clickable URL.

## Repo layout

```
setup.sh / setup.ps1        the one-liners teams paste (Mac / Windows)
setup/server.mjs            master process: key page → validate → seed → launch UI → hand off
setup/public/index.html     the key-entry / "✅ Team ready" page
project/                    the starter workspace teams edit (Vite+React + CLAUDE.md + settings)
bundle-builder/
  patch-claudecodeui.mjs    the two build-time patches (Sonnet lock, permission bypass)
  build.sh                  clone@pin → patch → build → pack dist-bundle/bundle.tar.gz
scripts/local-test.sh       run the full experience locally with your own key (no GitHub needed)
docs/                       architecture, admin runbook, team email, day-of runbook, test plan
```

## Ports

| Port | What | When |
|---|---|---|
| 4747 | setup / key page | during setup only |
| 8080 | the claudecodeui workspace | all day |
| 3000 | the team's app dev server | when Claude is showing something |

## Build & ship (you, before the event)

```bash
bash bundle-builder/build.sh          # produces dist-bundle/bundle.tar.gz (~7 MB)
```

Then: create the public repo `rohan-richard/aml-hackathon`, push, and upload
`bundle.tar.gz` as the **latest release** asset. The one-liners fetch it from there.
Anthropic Console setup (workspace, spend cap, per-team keys) is in `docs/admin-runbook.md`.

## Test locally right now (no GitHub, no release)

```bash
bash bundle-builder/build.sh
bash scripts/local-test.sh            # extracts, installs, launches; paste a REAL key
```

This exercises everything except the portable-Node download and the GitHub fetch
(both pure distribution mechanics). See `docs/test-plan.md` for the full gate list,
including the Windows pass.

## Known constraints

- **Online install.** User machines run `npm ci --omit=dev` (~763 packages, a few minutes
  on office wifi). Native modules (better-sqlite3, node-pty) resolve via prebuilds — no
  compiler needed. node-pty ships win32-x64/arm64 prebuilds, so Windows is covered.
- **Terminal stays open.** The launcher supervises the UI; closing the window stops it.
  Re-running the one-liner is the repair move (idempotent; keeps the saved key).
- **Third-party UI, pinned.** If claudecodeui changes shape, `patch-claudecodeui.mjs` fails
  loudly rather than shipping an unpatched build. Fallback is plain `claude` in a terminal.
