#!/usr/bin/env bash
# Local dry-run of the full team experience, using the freshly built bundle and
# your own node + claude (skips the portable-node download and GitHub fetch).
# Prereqs: `bash bundle-builder/build.sh` has been run, and `claude` is on your PATH.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="$REPO_ROOT/dist-bundle/bundle.tar.gz"
TEST_DIR="$REPO_ROOT/.localtest"

[ -f "$BUNDLE" ] || { echo "No bundle found. Run: bash bundle-builder/build.sh"; exit 1; }

echo "▸ Fresh extract to $TEST_DIR"
rm -rf "$TEST_DIR"; mkdir -p "$TEST_DIR"
tar -xzf "$BUNDLE" -C "$TEST_DIR"

echo "▸ Installing UI runtime deps (production only)…"
( cd "$TEST_DIR/ui" && npm ci --omit=dev --no-audit --no-fund )

echo "▸ Installing starter app deps…"
( cd "$TEST_DIR/project" && npm install --no-audit --no-fund )

echo "▸ Installing setup script deps…"
( cd "$TEST_DIR/setup" && npm install --no-audit --no-fund )

echo "▸ Launching — the setup page will open. Paste a REAL team API key."
cd "$TEST_DIR"
exec node setup/server.mjs
