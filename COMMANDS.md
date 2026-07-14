# Copy-paste commands

All commands are safe to re-run. Setup is idempotent (skips what's already installed);
re-running it is also the repair move.

## Set up / launch a team workspace

**Mac** — open Terminal (Cmd+Space → `Terminal`), paste, Enter:
```
curl -fsSL https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/setup.sh | bash
```

**Windows** — open PowerShell (Start → `PowerShell`), paste, Enter:
```
irm https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/setup.ps1 | iex
```

Then a browser page opens → paste the team API key → wait for **"✅ Team ready"**.

## Uninstall (remove the workspace)

Stops the workspace and deletes `~/aml-hackathon`. Leaves the shared `claude` CLI.

**Mac:**
```
curl -fsSL https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/uninstall.sh | bash
```

**Windows:**
```
irm https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/uninstall.ps1 | iex
```

## Nuke (full reset for end-to-end testing)

Bare-machine reset: removes the workspace, any globally-installed Claude Code, **and your
machine-wide Node.js and Git** (via their official uninstallers / winget / Homebrew), so the
next setup runs exactly like a brand-new laptop. Leaves your `~/.claude` config alone, and
on macOS never touches the built-in `/usr/bin/git`.

⚠️ This uninstalls your personal Node and Git — reinstall them afterward if you use them
outside the hackathon. **Open a fresh terminal before re-running setup** so PATH refreshes.

**Mac:**
```
curl -fsSL https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/nuke.sh | bash
```

**Windows:**
```
irm https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/nuke.ps1 | iex
```

## Clean restart (if a run got stuck or the port is busy)

Close the old window first, then in a fresh terminal run one of these before re-running setup.

**Mac** — stop leftover workspace processes:
```
pkill -f "$HOME/aml-hackathon"; lsof -ti tcp:8080 tcp:4747 2>/dev/null | xargs kill 2>/dev/null
```

**Windows** — stop leftover workspace processes:
```
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -like '*aml-hackathon*' } | % { Stop-Process -Id $_.ProcessId -Force }
```

## Organizer: build & publish the bundle

```
bash bundle-builder/build.sh
gh release upload v1 dist-bundle/bundle.tar.gz --clobber
```

Test the full experience locally with your own key (no download needed):
```
bash scripts/local-test.sh
```
