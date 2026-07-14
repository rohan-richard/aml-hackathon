# AML Hackathon — Claude Code for nontechnical teams

One-day, in-office, team-building AI showcase **this week (Jul 15–18, 2026)**. 8–12 teams,
one driver laptop per team (Apple Silicon Macs + Windows 11), 2–3 technical helpers on the
day. Not competitive — the goal is that every team ships something visible and has a "wow"
moment.

Detailed docs live in `docs/`: architecture, admin runbook, team email template,
day-of runbook, test plan.

## Decisions (settled 2026-07-14)

- **Local, per-laptop setup** (teams build web apps and need live localhost preview).
- **UI:** siteboon/claudecodeui, pinned to a tested commit, paired with a pinned Claude Code
  CLI version. Auto-update disabled everywhere.
- **One universal bundle** for all teams (not per-team folders). Keys delivered in the
  setup email (spend-capped, expiring Jul 20 — acceptable).
- **Hosting: public GitHub repo.** One-liners fetch `setup.sh`/`setup.ps1` from
  raw.githubusercontent.com; per-platform bundles (darwin-arm64, win-x64) are release
  assets. No secrets ever in the repo.
- **Portable-first, no admin rights assumed:** portable Node, PortableGit (Windows),
  Claude Code installed inside the bundle's runtime, claudecodeui with `node_modules`
  **pre-built by us** — no `npm install` ever runs on a user machine. The setup script's
  only network dependency is downloading the release asset.
- **Setup = one paste-able line** per platform, sent by email before the event. The script
  installs everything; users never install anything manually. Script is idempotent —
  re-running it is also the day-of repair tool.
- **Key flow:** after install, a local setup page opens in the browser. Team pastes their
  API key → page makes a real (tiny) API call to validate → writes key to project `.env` →
  launches claudecodeui and redirects into it → shows "✅ Team ready" success state that
  people screenshot and send to Rohan. No second command, one continuous flow.
- **Homework gap:** expect 30–50% of teams to skip the pre-event email. Helpers run the
  same one-liner at registration/coffee on office wifi. Budget ~15 min per straggler machine.
- **Permissions:** bypass mode (claudecodeui launches claude with permissions skipped),
  contained to the project folder. Deliberate risk acceptance for a supervised internal event.
- **Model:** Sonnet only, enforced via settings + workspace. Verify the exact settings key
  (`availableModels`) exists in the *pinned* CLI version during build — do not trust the guide.
- **Starter folder:** blank canvas with strong invisible rails via `CLAUDE.md`:
  - Stack pinned: Vite + React, dev server always on port 3000.
  - Claude starts/restarts the dev server itself and always tells the user the exact URL to click.
  - Claude never asks the user to run terminal commands.
  - Plain-language explanations, small incremental changes, show the result early and often
    (showcase event — visible progress beats architecture).

## Anthropic Console setup

See `docs/admin-runbook.md`. Dedicated workspace, spend limit + 80% alert, one named key
per team, expiration Jul 20. Rate-limit tier confirmed fine; office network confirmed fine
with Anthropic API (already in use, no SSL inspection issue).

## Test plan

See `docs/test-plan.md` — compressed to three gates for the this-week timeline. Scarcest
resource: a Windows 11 test machine, needed immediately.

## Day-of kit

See `docs/day-of-runbook.md` — helpers' repair move (re-run the one-liner), troubleshooting
table, terminal fallback, printed cheat sheet.

## Risks accepted / open

- Bypass permissions on user laptops (contained folder, supervised event).
- claudecodeui is third-party — pinning + terminal fallback mitigates.
- Timeline: event is days away; test plan cut to essentials, helpers path carries more weight.
- Verify during build: model-restriction settings key in the pinned CLI version; portable
  Git Bash env var on Windows; claudecodeui default port and bypass-permissions launch flag.
