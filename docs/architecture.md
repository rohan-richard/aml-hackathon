# Architecture

Event: this week (Jul 15–18, 2026), in-office, 8–12 teams, one driver laptop per team.
Fleet: Apple Silicon Macs + Windows 11. Admin rights unknown → **everything is portable,
nothing installs system-wide**. All artifacts live in a public GitHub repo; the one-liner
pulls from raw.githubusercontent.com so no auth is ever needed.

## User-visible flow

1. Team gets an email: one paste-able line + their team API key.
2. They paste the line into Terminal (Mac) or PowerShell (Windows).
3. Script downloads the platform bundle, extracts to `~/aml-hackathon`, launches the setup page.
4. Browser opens → they paste their key → live API call validates it → key saved →
   claudecodeui launches → "✅ Team ready" state. They screenshot it and send to Rohan.
5. Day-of, they open the same UI and talk to Claude. Claude runs the dev server and gives
   them a clickable localhost URL to see their app.

One line, one key paste. Users never install anything, never see a second command.

## Components

```
GitHub repo (public)
├── setup.sh / setup.ps1        one-liners fetch these via raw.githubusercontent
└── Release assets (built by us, per platform)
    ├── bundle-darwin-arm64.tar.gz
    └── bundle-win-x64.zip
        Each contains:
        ├── runtime/            portable Node 20 (+ PortableGit on Windows)
        ├── claude/             pinned Claude Code, installed into runtime (no system install)
        ├── ui/                 claudecodeui @ pinned commit, node_modules pre-installed
        ├── setup-page/         tiny local server: key entry + validation + handoff
        └── project/            team workspace: CLAUDE.md rails + .claude/settings.json
```

Pre-building the bundles on our machines means **no `npm install` ever runs on a user
laptop** — no node-pty compiles, no registry flakiness at kickoff. The setup script's only
network dependency is downloading the release asset.

## Technical findings (verified 2026-07-14 by reading claudecodeui @ v1.36.1 + CC docs)

The original guide assumed we drive the raw `claude` CLI and lock it via `.claude/settings.json`.
Reading the actual code, claudecodeui works differently — corrections below. All are good news
(the real levers are build-time patches to a pinned copy, which are *more* robust than settings):

1. **It spawns Claude via `@anthropic-ai/claude-agent-sdk` (v0.3.165), not the raw CLI.**
   The SDK still needs the `claude` executable on disk (resolved from `CLAUDE_CLI_PATH` /
   PATH), so we still install Claude Code. But model + permissions are set as *SDK options*
   the UI passes, from its own pickers — NOT read from `.claude/settings.json availableModels`.

2. **Model lock = build-time patch, not settings.json.** The picker's model list lives in
   `server/modules/providers/list/claude/claude-models.provider.ts` (offers default/fable/
   sonnet/sonnet[1m]/opus/opus[1m]/haiku, `DEFAULT: 'default'`). At build we patch it to
   Sonnet-only and set `DEFAULT: 'sonnet'`. The UI then physically cannot offer anything else.
   (Drop the `availableModels` settings.json approach — it targets the raw CLI, not this path.)

3. **Permission bypass = build-time patch of the UI default.** `skipPermissions` defaults to
   `false` in `src/components/settings/constants/constants.ts` + `useSettingsController.ts`
   (stored in browser localStorage `claude-settings`). Patch both defaults to `true` so bypass
   is on out of the box and survives a cleared localStorage. When true the server sets the SDK
   `permissionMode: 'bypassPermissions'` (confirmed in `server/claude-sdk.js`).

4. **Anthropic key flows through the server's process env.** `claude-sdk.js` does
   `sdkOptions.env = { ...process.env }`, so the spawned claude inherits whatever env the
   claudecodeui *server* was started with. Our launcher must start the UI server with
   `ANTHROPIC_API_KEY=<team key>` in its environment. No login, no `apiKeyHelper` needed
   (CC docs confirm: key in env → API-key billing, no interactive login).

5. **OSS mode has a username/password login screen we must hide.** Two options: (a) the setup
   page auto-calls `/api/auth/register` with fixed creds and stores the JWT, then redirects in
   (version-stable, chosen); or (b) run with `VITE_IS_PLATFORM=true`, which bypasses JWT and
   returns the first user. Going with (a) — doesn't depend on undocumented platform-mode
   frontend behavior.

6. **node-pty ^1.2.0-beta.12 ships prebuilds** (`node_modules/node-pty/prebuilds/<platform>`),
   and the postinstall `fix-node-pty.js` only chmods on macOS. So no C++ compiler on user
   machines — but the win32-x64 prebuild resolving against our pinned Node is still Gate 1's
   #1 thing to prove on a real Windows box.

7. **Windows Git Bash:** env var `CLAUDE_CODE_GIT_BASH_PATH` → absolute path to PortableGit's
   `bash.exe`. Set it in the launcher's env.

8. **Bonus:** claudecodeui ships `scripts/release/build-server-bundle.js` and an Electron
   desktop build (`desktop:dist:mac`/`win`). The desktop app is a possible alternative to the
   browser flow (double-click icon vs. terminal one-liner) — flagged as a fork, not chosen.

## Pins (freeze after first successful end-to-end test, then never touch)

| Thing | Pin | Notes |
|---|---|---|
| Node | 20.x LTS portable build | darwin-arm64 + win-x64 |
| Claude Code | latest stable at build; `bash install.sh -s <ver>` pins it | disable updates: `DISABLE_AUTOUPDATER=1` (+ `DISABLE_UPDATES=1` for full lock) |
| claudecodeui | v1.36.1 (commit 038d960) | patched: sonnet-only models, skipPermissions=true default |
| claude-agent-sdk | ^0.3.165 (as shipped by claudecodeui) | bundled in its node_modules |
| Starter stack | Vite + React | dev server fixed on port 3000 |

Env the launcher must set when starting the UI server:
- `ANTHROPIC_API_KEY=<team key>`
- `DISABLE_AUTOUPDATER=1`, `DISABLE_UPDATES=1`
- `CLAUDE_CLI_PATH=<bundle>/claude/...` (point the SDK at our pinned binary)
- Windows: `CLAUDE_CODE_GIT_BASH_PATH=<bundle>/PortableGit/bin/bash.exe`

## Ports

| Port | What |
|---|---|
| 4747 | setup/key page (only during setup) |
| claudecodeui default (verify) | the UI teams use all day |
| 3000 | team's app dev server (pinned in CLAUDE.md) |

## Key handling

Key is pasted once into the setup page, validated with a minimal real API call
(`max_tokens: 1`), written to `project/.env`, and passed as env to the spawned claude
processes. Keys are never in the repo or bundle — that's what makes the repo safe to be
public. Keys expire right after the event (see admin runbook).

## Permissions and model

- claudecodeui launches claude with permissions bypassed — deliberate choice for a
  supervised internal event; blast radius is the laptop, mitigated by the contained folder.
- Sonnet only, enforced via `.claude/settings.json` in the project folder plus workspace-level
  spend caps as the real backstop.
