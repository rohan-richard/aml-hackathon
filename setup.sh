#!/usr/bin/env bash
# One-command hackathon setup for macOS.
# Usage (what teams paste): curl -fsSL <raw-url>/setup.sh | bash
set -euo pipefail

REPO="rohan-richard/aml-hackathon"
NODE_VERSION="20.18.1"
HOME_DIR="$HOME/aml-hackathon"
BRANCH="main"

say()  { printf "\n\033[1;35m▸ %s\033[0m\n" "$1"; }
ok()   { printf "  \033[0;32m✓\033[0m %s\n" "$1"; }
die()  { printf "\n\033[0;31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

trap 'die "Something went wrong. Take a screenshot of this window and send it to Rohan — no need to fix it yourself."' ERR

say "Setting up your hackathon workspace (this takes a few minutes)…"
ARCH="$(uname -m)"
[ "$ARCH" = "arm64" ] || die "This Mac isn't an Apple Silicon Mac ($ARCH). Please bring it to the helpers' table."

mkdir -p "$HOME_DIR"
cd "$HOME_DIR"

# --- 1. Portable Node (pinned; no admin, never touches system Node) ---
NODE_DIR="$HOME_DIR/.node/node-v${NODE_VERSION}-darwin-arm64"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  say "Installing a private copy of Node ${NODE_VERSION}…"
  mkdir -p "$HOME_DIR/.node"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz" \
    | tar -xz -C "$HOME_DIR/.node"
fi
export PATH="$NODE_DIR/bin:$PATH"
ok "Node ready ($("$NODE_DIR/bin/node" -v))"

# Claude Code itself ships inside the UI's dependencies (installed in step 3) —
# no separate install, no installer prompts.

# --- 2. Download the app bundle (pre-built UI + setup + starter project) ---
say "Downloading the workspace…"
curl -fsSL "https://github.com/${REPO}/releases/latest/download/bundle.tar.gz" -o bundle.tar.gz \
  || die "Could not download the workspace. Check you're on the office wifi, then try again."
tar -xzf bundle.tar.gz
rm -f bundle.tar.gz
# Downloaded binaries carry a quarantine flag; strip it so nothing prompts on first run.
xattr -dr com.apple.quarantine "$HOME_DIR" >/dev/null 2>&1 || true
ok "Workspace downloaded"

# --- 3. Install runtime dependencies (production only; prebuilt native modules,
#        plus the bundled Claude Code runtime) ---
say "Installing components (the longest step)…"
( cd "$HOME_DIR/ui" && npm ci --omit=dev --no-audit --no-fund >/dev/null 2>&1 ) \
  || die "Dependency install failed. Check the office wifi and re-run, or see a helper."
( cd "$HOME_DIR/project" && npm install --no-audit --no-fund >/dev/null 2>&1 ) || true
( cd "$HOME_DIR/setup" && npm install --no-audit --no-fund >/dev/null 2>&1 ) || true
ok "Components installed"

# --- 4. Launch ---
say "Starting your workspace…"
exec "$NODE_DIR/bin/node" "$HOME_DIR/setup/server.mjs"
