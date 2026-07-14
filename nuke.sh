#!/usr/bin/env bash
# FULL RESET for end-to-end testing (macOS). Removes:
#   - the hackathon workspace (~/aml-hackathon — includes the portable node + git we install)
#   - any globally-installed Claude Code
#   - your machine-wide Node.js and Homebrew Git
# …so the next setup runs as if on a brand-new machine.
#
# ⚠️  This uninstalls PERSONAL dev tools (Node, Homebrew git, Claude Code). You'll need to
#     reinstall them if you use them outside this hackathon. It never touches macOS's
#     built-in /usr/bin/git or your ~/.claude config.
#
# Usage: curl -fsSL https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/nuke.sh | bash
set -uo pipefail

HOME_DIR="$HOME/aml-hackathon"

printf "\n\033[1;35m▸ NUKE: workspace + Claude Code + Node + Git (fresh-start reset)…\033[0m\n"

# 1. Stop and remove the workspace (this alone removes the PORTABLE node/git we install).
pkill -f "$HOME_DIR" 2>/dev/null || true
lsof -ti tcp:8080 2>/dev/null | xargs kill 2>/dev/null || true
lsof -ti tcp:4747 2>/dev/null | xargs kill 2>/dev/null || true
sleep 1
rm -rf "$HOME_DIR"
printf "  \033[0;32m✓\033[0m Removed workspace (%s)\n" "$HOME_DIR"

# 2. Globally-installed Claude Code (leftover from older setups).
rm -rf "$HOME/.local/bin/claude" "$HOME/.local/share/claude"
printf "  \033[0;32m✓\033[0m Removed globally-installed Claude Code\n"

# 3. Machine-wide Node.js and Git — only what's user-owned and safe to remove.
if command -v brew >/dev/null 2>&1; then
  if brew list node >/dev/null 2>&1; then brew uninstall --ignore-dependencies node >/dev/null 2>&1 && printf "  \033[0;32m✓\033[0m Removed Homebrew Node\n"; fi
  if brew list git  >/dev/null 2>&1; then brew uninstall --ignore-dependencies git  >/dev/null 2>&1 && printf "  \033[0;32m✓\033[0m Removed Homebrew Git\n"; fi
fi
if [ -d "$HOME/.nvm" ]; then rm -rf "$HOME/.nvm" && printf "  \033[0;32m✓\033[0m Removed nvm\n"; fi

printf "\n  Left intact: macOS built-in git (/usr/bin/git) and your ~/.claude config.\n"
printf "  If Node came from a .pkg installer (/usr/local/bin/node), remove it manually — it needs sudo.\n"
printf "  Open a NEW terminal before re-running setup so PATH refreshes.\n\n"
