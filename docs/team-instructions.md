# Team setup instructions (email template)

Send as soon as bundles are tested. One email per team, with their key inline.
Replace `[N]` (team number) and the key placeholder before sending.

---

Subject: **Hackathon setup — 5 minutes, do this before Thursday Jul 16**

Hi Team [N],

Before Thursday Jul 16, one person on your team (whoever's laptop you'll use on the day)
needs to run a quick setup. It takes about 5 minutes and one copy-paste.

**Your team key** (you'll paste this when a page asks for it):

```
sk-ant-████████ (team [N]'s key here)
```

**On a Mac:**
1. Press Cmd+Space, type `Terminal`, press Enter.
2. Copy this whole line, paste it into the window, press Enter:
```
curl -fsSL https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/setup.sh | bash
```

**On Windows:**
1. Open the Start menu, type `PowerShell`, press Enter.
2. Copy this whole line, paste it into the window, press Enter:
```
irm https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/setup.ps1 | iex
```

**Then (both):**
3. Wait a few minutes — text will scroll by, that's normal.
4. A browser page will open asking for your team key. Paste it in.
5. When you see **"✅ Team ready"**, take a screenshot and send it to Rohan.

That's the whole thing. If anything looks wrong, don't troubleshoot — just message Rohan,
or bring the laptop to the helpers' table when you arrive and we'll sort it in minutes.

See you Thursday Jul 16!

---

## Notes for us (not in the email)

- Keep the email to exactly this. Every extra sentence is something to misread.
- Track screenshots against the team list — teams that haven't sent one by the evening
  before get a nudge, and are first in line at the helpers' table.
- The key is in the email on purpose: it's spend-capped, expires Jul 20, and the
  alternative (separate delivery) adds a failure mode for zero real risk reduction.
