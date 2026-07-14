#!/usr/bin/env node
// Applies the hackathon patches to a claudecodeui checkout.
// Fails loudly if any anchor is missing, so a version bump surfaces here
// instead of silently shipping an unpatched build.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const root = process.argv[2];
if (!root) {
  console.error('usage: patch-claudecodeui.mjs <claudecodeui-checkout-dir>');
  process.exit(1);
}

function replaceOnce(source, anchor, replacement, label) {
  const idx = source.indexOf(anchor);
  if (idx === -1) {
    throw new Error(`patch anchor not found (${label}). claudecodeui may have changed — review before shipping.`);
  }
  if (source.indexOf(anchor, idx + anchor.length) !== -1) {
    throw new Error(`patch anchor is ambiguous (${label}); expected exactly one match.`);
  }
  return source.slice(0, idx) + replacement + source.slice(idx + anchor.length);
}

async function patchFile(relPath, fn) {
  const abs = join(root, relPath);
  const before = await readFile(abs, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error(`no change applied to ${relPath}`);
  await writeFile(abs, after, 'utf8');
  console.log(`patched ${relPath}`);
}

// 1. Lock the model picker to Sonnet only. `getSupportedModels()` returns this
//    constant, so replacing OPTIONS + DEFAULT is the whole picker.
await patchFile('server/modules/providers/list/claude/claude-models.provider.ts', (src) => {
  const start = 'export const CLAUDE_FALLBACK_MODELS: ProviderModelsDefinition = {';
  const startIdx = src.indexOf(start);
  if (startIdx === -1) throw new Error('models: CLAUDE_FALLBACK_MODELS declaration not found');
  const endMarker = '\n};\n';
  const endIdx = src.indexOf(endMarker, startIdx);
  if (endIdx === -1) throw new Error('models: end of CLAUDE_FALLBACK_MODELS not found');
  const replacement = `export const CLAUDE_FALLBACK_MODELS: ProviderModelsDefinition = {
  OPTIONS: [
    {
      value: "sonnet",
      label: "Sonnet",
      description: "Claude Sonnet",
      effort: {
        default: 'high',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'max' },
        ],
      },
    },
  ],
  DEFAULT: 'sonnet',
}`;
  return src.slice(0, startIdx) + replacement + src.slice(endIdx + 2); // +2 keeps the trailing ";\n"
});

// 2. Force permission bypass on the server regardless of client-sent settings,
//    so no localStorage state or UI toggle can re-enable prompts. Plan mode is
//    left alone (it is intentionally read-only).
await patchFile('server/claude-sdk.js', (src) =>
  replaceOnce(
    src,
    'if (settings.skipPermissions && permissionMode !== \'plan\') {',
    'if (permissionMode !== \'plan\') { // hackathon: always bypass permission prompts',
    'claude-sdk skipPermissions',
  ),
);

console.log('all patches applied.');
