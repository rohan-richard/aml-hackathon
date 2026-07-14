#!/usr/bin/env bash
# Removes the hackathon workspace on macOS.
# Usage: curl -fsSL https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/uninstall.sh | bash
set -uo pipefail

HOME_DIR="$HOME/aml-hackathon"

printf "\n\033[1;35m▸ Removing the hackathon workspace…\033[0m\n"

# Stop the running workspace (parent supervisor + the UI it spawned).
pkill -f "$HOME_DIR" 2>/dev/null || true
lsof -ti tcp:8080 2>/dev/null | xargs kill 2>/dev/null || true
lsof -ti tcp:4747 2>/dev/null | xargs kill 2>/dev/null || true
sleep 1

rm -rf "$HOME_DIR"

printf "  \033[0;32m✓\033[0m Removed %s\n" "$HOME_DIR"
printf "  Claude Code itself was left in ~/.local/bin (it's shared). Remove it yourself if you want:\n"
printf "    rm -rf ~/.local/bin/claude ~/.local/share/claude\n\n"
