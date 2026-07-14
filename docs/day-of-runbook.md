# Day-of runbook (helpers)

2–3 helpers. Expect a third to half of teams to arrive without having done the setup —
that's the plan, not a failure. Budget ~15 min per cold machine at the helpers' table
during registration/coffee.

## The one repair move

The setup script is idempotent. **Almost everything is fixed by re-running the one-liner**:

```
Mac:      curl -fsSL https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/setup.sh | bash
Windows:  irm https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/setup.ps1 | iex
```

It re-downloads anything broken or missing, keeps a saved key if one exists, and relaunches
the UI. Try this before diagnosing anything.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Setup never opens a browser page | Download failed or blocked | Re-run the one-liner; check the laptop is on office wifi, not guest/VPN |
| "❌ Key invalid" on the setup page | Typo/whitespace in pasted key, or wrong team's key | Re-paste carefully; confirm against the key list |
| UI page won't load day-of | UI process not running | Re-run the one-liner — it relaunches everything |
| "Model restricted by your organization's settings" | Team tried switching models | Working as intended, nothing to fix |
| 400 error mentioning workspace usage limits | Workspace spend cap hit — affects ALL teams | Escalate to Rohan: raise the workspace limit in Console |
| Responses suddenly slow/failing for everyone | Rate limiting | Escalate to Rohan: check Console usage, per-key limits |
| Claude asks the user to run a terminal command | CLAUDE.md rails leaked | Tell the team to reply "do it yourself"; note it for the retro |
| Team's app URL (localhost:3000) shows nothing | Dev server died | Tell the team to ask Claude: "restart the dev server and give me the link" |
| Mac says the app "can't be opened" / unidentified developer | Gatekeeper on a stray double-clicked file | Users should only ever use the one-liner; re-run it |

## Fallback: UI is unusable on a machine

Plain Claude Code in the terminal, helper drives the first minutes:

1. Open Terminal / PowerShell, `cd ~/aml-hackathon/project`
2. Run the launcher in the bundle (`../claude/…` — exact path printed by setup).
3. Hand the keyboard over: "type what you want, press Enter". It's the same agent,
   just uglier. A team on this path still fully participates.

## Per-table cheat sheet (print ~15)

- Your workspace: **http://localhost:<UI_PORT>** (bookmark from setup)
- Your app: **http://localhost:3000** — Claude gives you this link when there's something to see
- Starter prompts:
  - "Build me a simple web page that [does X]. Show me as soon as there's something to look at."
  - "Change the design: [what you want different]."
  - "Something looks broken — here's what I see: [describe it]. Fix it."
- Stuck? Raise your hand. Don't close the black window if you see one.
