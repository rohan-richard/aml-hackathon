# Test plan — compressed for an event this week

No time for the full VM matrix. Priority order below; if something must be cut, cut from
the bottom. **A Windows 11 test machine is the single scarcest resource — secure one today.**

## Gate 1 — the pinned trio works (before building anything else)

- [ ] claudecodeui v1.36.1 runs against pinned Claude Code + pinned Node on a Mac; can send
      a prompt and get a response with `ANTHROPIC_API_KEY` in the server env (API-key billing)
- [ ] Same on Windows 11 — specifically that node-pty's win32-x64 **prebuild** loads against
      our pinned Node (no compiler), and claude finds PortableGit via `CLAUDE_CODE_GIT_BASH_PATH`
- [ ] Build-time patch verified: models provider stripped to Sonnet-only → UI picker shows
      only Sonnet, `DEFAULT: 'sonnet'` used
- [ ] Build-time patch verified: `skipPermissions` default `true` → server sends the SDK
      `permissionMode: 'bypassPermissions'`, no per-action prompts in the UI
- [ ] Login screen bypass verified: setup page auto-registers + stores JWT → lands in the UI
      with no username/password prompt

If Gate 1 fails on Windows and can't be fixed same-day, decide the fallback for Windows
teams NOW (terminal + helper-driven, or pair Windows teams with a Mac) — not at the event.

## Gate 2 — the full flow, both platforms

- [ ] Fresh Mac user account: one-liner → bundle download → key page → validate → UI up →
      "✅ ready", no admin prompt at any point
- [ ] Same on Windows 11
- [ ] Wrong key → clear rejection; correct key after → success
- [ ] Re-run one-liner after success → still works (idempotent, key preserved)
- [ ] Kill the UI process, re-run one-liner → recovered
- [ ] All of the above on **office wifi** (already expected fine — confirm anyway, it's one run)
- [ ] **macOS Gatekeeper:** downloaded unsigned binaries (portable node, node-pty prebuilds,
      claude) carry a quarantine xattr → "cannot be opened, unidentified developer". `setup.sh`
      must `xattr -dr com.apple.quarantine <bundle>` after extract (no admin needed). Verify a
      truly fresh download on a Mac that has never seen these binaries doesn't prompt.
- [ ] **Windows SmartScreen:** running downloaded `.exe`s (node.exe, claude.exe) may warn.
      Confirm the PowerShell flow doesn't hit a blocking "Windows protected your PC" wall.

## Gate 3 — the event experience

- [ ] Mom test: one genuinely nontechnical colleague does the whole flow from the actual
      email text, unaided, observed silently. Fix every stumble, however small.
- [ ] Dress rehearsal: 30 min as a fake team — "build me a page that does X" — on both
      platforms. Verify: Claude starts the dev server itself, gives the URL, never asks
      the user to touch a terminal, stays on Sonnet.
- [ ] Two sessions on two different team keys simultaneously — sanity check on the workspace

## Cut line

Below here is nice-to-have given the timeline:

- [ ] Intel Mac pass (fleet says none — script should detect-and-refuse politely anyway)
- [ ] No-internet behavior message quality
- [ ] Full 12-key concurrency test
