# Admin runbook (Rohan — do this before sending the email)

## Anthropic Console (~20 min, do today)

1. **Workspace**: console.anthropic.com → Settings → Workspaces → Add Workspace.
   Name: `Hackathon - July 2026`. All event keys live here so usage stays isolated.
2. **Spend limit**: workspace → Limits tab. Set a monthly limit (~$250–300).
   Add an email notification at 80%. This is the real safety net — hard, server-enforced.
   (Rate-limit tier already confirmed fine for 12 concurrent sessions.)
3. **Keys**: workspace → API Keys → Create Key, one per team, named `team-1` … `team-N`.
   **Expiration: Jul 20, 2026** (day after the latest possible event day).
   **Copy each key immediately** — the console never shows it again. Store them in a
   local note/password manager, not in this repo (repo is public).
4. Distribute: each team's key goes in their setup email, or on a printed card handed
   out at the event. Either is fine for a spend-capped, expiring key.

## GitHub

1. Create the public repo `rohan-richard/aml-hackathon`, push this project.
2. In `docs/team-instructions.md`, replace the `[N]` team-number and key placeholders per team.
3. Cut a release with the two bundle assets once built and tested.

## Mid-event

- Console → Usage / Cost Reports, filter by workspace or key, for per-team burn.
- If the workspace spend limit is hit, **every** team's key stops working — the fix is
  raising the workspace limit in Settings, not debugging individual keys.
- A team hammering rate limits shows up as slow/failed responses for others → set a
  per-key rate limit in the workspace Limits tab if one team is starving the rest.

## After

Let the keys expire (Jul 20), then archive the workspace — keeps historical usage data,
leaves no live keys around.
