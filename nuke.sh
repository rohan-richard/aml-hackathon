#!/usr/bin/env bash
# FULL RESET for end-to-end testing (macOS): removes the hackathon workspace AND any
# globally-installed Claude Code, so the next setup runs as if on a brand-new machine.
# Leaves your personal Claude config/history in ~/.claude untouched.
# Usage: curl -fsSL https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/nuke.sh | bash
set -uo pipefail

HOME_DIR="$HOME/aml-hackathon"

printf "\n\033[1;35m▸ Nuking hackathon workspace + Claude Code (fresh-start reset)…\033[0m\n"

pkill -f "$HOME_DIR" 2>/dev/null || true
lsof -ti tcp:8080 2>/dev/null | xargs kill 2>/dev/null || true
lsof -ti tcp:4747 2>/dev/null | xargs kill 2>/dev/null || true
sleep 1

rm -rf "$HOME_DIR"
# Leftover from older setups that installed Claude Code globally. Current setup keeps
# Claude inside the workspace, so this is a one-time cleanup of the old location.
rm -rf "$HOME/.local/bin/claude" "$HOME/.local/share/claude"

printf "  \033[0;32m✓\033[0m Removed %s\n" "$HOME_DIR"
printf "  \033[0;32m✓\033[0m Removed globally-installed Claude Code (~/.local/bin/claude, ~/.local/share/claude)\n"
printf "  Your personal Claude settings/history in ~/.claude were left untouched.\n"
printf "  Now run setup.sh for a clean end-to-end test.\n\n"
