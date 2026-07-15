#!/usr/bin/env bash
# Builds the release bundle: patched, pre-built claudecodeui + setup + starter project.
# Run this on the build machine (Mac is fine — the shipped tree has no native modules;
# those install per-platform on the user's machine via `npm ci --omit=dev`).
set -euo pipefail

CCUI_COMMIT="038d960c75b547f111751a39f28689ac66fca76d"   # v1.36.1
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
OUT="$REPO_ROOT/dist-bundle"
STAGE="$WORK/bundle"

echo "▸ Cloning claudecodeui @ $CCUI_COMMIT"
git clone --quiet https://github.com/siteboon/claudecodeui.git "$WORK/ccui"
git -C "$WORK/ccui" checkout --quiet "$CCUI_COMMIT"

echo "▸ Applying hackathon patches"
node "$REPO_ROOT/bundle-builder/patch-claudecodeui.mjs" "$WORK/ccui"

echo "▸ Installing build deps + building (platform mode baked into client)"
# Electron is a devDep we never ship or run; skipping its ~150MB binary saves minutes.
( cd "$WORK/ccui" && ELECTRON_SKIP_BINARY_DOWNLOAD=1 HUSKY=0 npm ci --no-audit --no-fund )
( cd "$WORK/ccui" && VITE_IS_PLATFORM=true npm run build )

echo "▸ Assembling bundle"
rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE/ui" "$OUT"
# Ship the built tree without node_modules/.git; user runs `npm ci --omit=dev`.
( cd "$WORK/ccui" && \
  tar --exclude=node_modules --exclude=.git -cf - . ) | tar -xf - -C "$STAGE/ui"
# The `prepare` script runs `husky` (a dev-only git-hooks tool) on every install,
# including the user's `npm ci --omit=dev` where husky isn't present → exit 127.
# Strip it; keep `postinstall` (fix-node-pty) which the runtime needs.
node -e "const f='$STAGE/ui/package.json',p=require(f);delete p.scripts.prepare;require('fs').writeFileSync(f,JSON.stringify(p,null,2))"

cp -R "$REPO_ROOT/setup" "$STAGE/setup"
cp -R "$REPO_ROOT/project" "$STAGE/project"
# Don't ship the team's future node_modules / builds if present locally.
rm -rf "$STAGE/project/node_modules" "$STAGE/project/dist" "$STAGE/setup/node_modules"

echo "▸ Packing bundle.tar.gz"
( cd "$STAGE" && tar -czf "$OUT/bundle.tar.gz" . )
echo "✓ Bundle ready: $OUT/bundle.tar.gz ($(du -h "$OUT/bundle.tar.gz" | cut -f1))"
echo "  Upload this as the 'latest' release asset on $REPO_ROOT's GitHub repo."
rm -rf "$WORK"
