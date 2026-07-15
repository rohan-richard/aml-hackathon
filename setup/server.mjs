import http from 'node:http';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import https from 'node:https';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UI_DIR = path.join(ROOT, 'ui');
const DATA_DIR = path.join(ROOT, 'data');
const KEY_FILE = path.join(DATA_DIR, 'key');
const COMPOSIO_KEY_FILE = path.join(DATA_DIR, 'composio-key');
const COMPOSIO_USER_ID_FILE = path.join(DATA_DIR, 'composio-user-id');
const PROJECT_MCP_FILE = path.join(ROOT, 'project', '.mcp.json');
const DB_FILE = path.join(DATA_DIR, 'auth.db');
const UI_LOG = path.join(DATA_DIR, 'ui.log');

const SETUP_PORT = Number(process.env.SETUP_PORT || 4747);
const UI_PORT = Number(process.env.UI_PORT || 8080);
const UI_URL = `http://localhost:${UI_PORT}`;

let uiProc = null;

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch {}
}

function validateKey(key) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      timeout: 20000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        // 200 = perfect. 401/403 = bad key. Any other status (400 model quirks,
        // 429 rate limit, 529 overload) still means the key authenticated fine.
        if (res.statusCode === 200) return resolve({ ok: true });
        if (res.statusCode === 401 || res.statusCode === 403) {
          return resolve({ ok: false, error: "That key wasn't accepted. Check you copied the whole thing (it starts with sk-ant-) and try again." });
        }
        let type = '';
        try { type = JSON.parse(data)?.error?.type || ''; } catch {}
        if (type === 'authentication_error' || type === 'permission_error') {
          return resolve({ ok: false, error: "That key wasn't accepted. Check you copied the whole thing and try again." });
        }
        resolve({ ok: true }); // authenticated, just a transient/non-auth response
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timed out reaching Anthropic. Check the office wifi and try again.' }); });
    req.on('error', () => resolve({ ok: false, error: "Couldn't reach Anthropic. Check the office wifi and try again." }));
    req.write(body);
    req.end();
  });
}

async function seedUser() {
  // Platform mode needs exactly one user in the DB and never checks its password.
  // Load via createRequire (not dynamic import) so the absolute path works on Windows,
  // where ESM import() rejects bare `C:\...` paths.
  const Database = require(path.join(UI_DIR, 'node_modules', 'better-sqlite3'));
  const db = new Database(DB_FILE);
  try {
    // waitForUI() only proves the UI's HTTP server accepted a connection, not that
    // its schema is committed to this exact file yet — a real Mac hit "no such
    // table: users" here on first boot. Wait for the table before touching it.
    for (let attempt = 0; !db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get(); attempt++) {
      if (attempt >= 20) throw new Error('Timed out waiting for the users table in auth.db');
      await new Promise((r) => setTimeout(r, 250));
    }
    const row = db.prepare('SELECT COUNT(*) AS n FROM users').get();
    if (row.n === 0) {
      db.prepare('INSERT INTO users (username, password_hash, has_completed_onboarding) VALUES (?, ?, 1)')
        .run('team', 'platform-mode-no-login');
    } else {
      db.prepare('UPDATE users SET has_completed_onboarding = 1').run();
    }
  } finally {
    db.close();
  }
}

function resolveClaudeBin() {
  // The agent SDK ships a full claude runtime per platform, installed by `npm ci`.
  // Use it directly so we never need a separate Claude install (no installer prompt,
  // and it lives inside ~/aml-hackathon so uninstall removes it).
  const bin = process.platform === 'win32' ? 'claude.exe' : 'claude';
  const bundled = path.join(
    UI_DIR, 'node_modules', '@anthropic-ai',
    `claude-agent-sdk-${process.platform}-${process.arch}`, bin,
  );
  if (existsSync(bundled)) return bundled;
  return process.env.CLAUDE_CLI_PATH || null; // fall back to an explicit path / PATH
}

function uiEnv(key) {
  const env = {
    ...process.env,
    ANTHROPIC_API_KEY: key,
    VITE_IS_PLATFORM: 'true',
    PORT: String(UI_PORT),
    SERVER_PORT: String(UI_PORT),
    HOST: '127.0.0.1',
    DATABASE_PATH: DB_FILE,
    DISABLE_AUTOUPDATER: '1',
    DISABLE_UPDATES: '1',
  };
  const claudeBin = resolveClaudeBin();
  if (claudeBin) env.CLAUDE_CLI_PATH = claudeBin;
  if (process.env.CLAUDE_CODE_GIT_BASH_PATH) env.CLAUDE_CODE_GIT_BASH_PATH = process.env.CLAUDE_CODE_GIT_BASH_PATH;
  return env;
}

async function startUI(key) {
  if (uiProc) return;
  const { createWriteStream } = await import('node:fs');
  const out = createWriteStream(UI_LOG, { flags: 'a' });
  uiProc = spawn(process.execPath, [path.join(UI_DIR, 'dist-server', 'server', 'index.js')], {
    cwd: UI_DIR,
    env: uiEnv(key),
  });
  uiProc.stdout.pipe(out);
  uiProc.stderr.pipe(out);
  uiProc.on('exit', (code) => {
    console.log(`UI process exited (${code}); restarting in 2s`);
    uiProc = null;
    setTimeout(() => readKey().then((k) => k && startUI(k)), 2000);
  });
}

function waitForUI(timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${UI_PORT}/`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry();
      });
      req.on('error', retry);
      req.setTimeout(3000, () => { req.destroy(); retry(); });
    };
    const retry = () => { if (Date.now() > deadline) reject(new Error('UI did not come up in time')); else setTimeout(tick, 800); };
    tick();
  });
}

async function readKey() {
  try { return (await readFile(KEY_FILE, 'utf8')).trim() || null; } catch { return null; }
}

async function readComposioKey() {
  try { return (await readFile(COMPOSIO_KEY_FILE, 'utf8')).trim() || null; } catch { return null; }
}

async function ensureComposioUserId() {
  try {
    const existing = (await readFile(COMPOSIO_USER_ID_FILE, 'utf8')).trim();
    if (existing) return existing;
  } catch {}
  const id = crypto.randomUUID();
  await writeFile(COMPOSIO_USER_ID_FILE, id);
  return id;
}

async function wireGoogleTools() {
  // Optional add-on: teams that pasted a Composio key get a live "connect your
  // Google account" prompt the first time their agent uses a Drive/Docs/Gmail
  // tool. Anything that goes wrong here must not block the core setup flow —
  // but callers still get a status back so the setup page can show it, rather
  // than a failure being visible only in this process's terminal output.
  const composioKey = await readComposioKey();
  if (!composioKey) return { status: 'skipped' };

  let config = { mcpServers: {} };
  try { config = JSON.parse(await readFile(PROJECT_MCP_FILE, 'utf8')); } catch {}
  config.mcpServers ||= {};
  if (config.mcpServers.composio) return { status: 'already-connected' }; // don't re-mint on every relaunch

  try {
    const { Composio } = await import('@composio/core');
    const composio = new Composio({ apiKey: composioKey });
    const userId = await ensureComposioUserId();
    const session = await composio.create(userId, { toolkits: ['googledrive', 'googledocs', 'gmail'] });
    config.mcpServers.composio = {
      type: 'http',
      url: session.mcp.url,
      headers: { 'x-api-key': composioKey },
    };
    await writeFile(PROJECT_MCP_FILE, JSON.stringify(config, null, 2));
    console.log('Google Drive/Docs/Gmail MCP wired for this team.');
    return { status: 'connected' };
  } catch (e) {
    console.error('Could not set up Google MCP tools (continuing without them):', e.message);
    return { status: 'failed', error: e.message };
  }
}

function registerProject() {
  // Register the starter workspace so it's the one (and, on a clean laptop, only)
  // project — claudecodeui auto-selects when exactly one exists, so the team lands
  // straight in it with nothing to choose.
  return new Promise((resolve) => {
    const body = JSON.stringify({ path: path.join(ROOT, 'project'), customName: 'Our Hackathon App' });
    const req = http.request({
      hostname: '127.0.0.1', port: UI_PORT, path: '/api/projects/create-project', method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    }, (res) => { res.resume(); res.on('end', resolve); });
    req.on('error', resolve); // already registered / non-fatal — don't block startup
    req.write(body); req.end();
  });
}

async function bringUpUI(key) {
  await mkdir(DATA_DIR, { recursive: true });
  // Start the UI first: claudecodeui owns the DB schema and creates it on boot.
  // Only then seed the platform-mode user (read per-request, so post-boot is fine).
  await startUI(key);
  await waitForUI();
  await seedUser();
  const google = await wireGoogleTools();
  await registerProject();
  return { google };
}

async function handleSetup(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  let key, composioKey;
  try {
    const parsed = JSON.parse(body);
    key = parsed.key?.trim();
    composioKey = parsed.composioKey?.trim();
  } catch {}
  if (!key) return json(res, 400, { ok: false, error: 'No key received. Paste your team key and try again.' });

  const v = await validateKey(key);
  if (!v.ok) return json(res, 200, v);

  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(KEY_FILE, key, { mode: 0o600 });
    if (composioKey) await writeFile(COMPOSIO_KEY_FILE, composioKey, { mode: 0o600 });
    const { google } = await bringUpUI(key);
    json(res, 200, { ok: true, url: UI_URL, google });
  } catch (e) {
    console.error(e);
    json(res, 200, { ok: false, error: 'Setup hit a snag starting your workspace. Please tell Rohan or a helper.' });
  }
}

function json(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(s) });
  res.end(s);
}

async function servePage(res) {
  const html = await readFile(path.join(__dirname, 'public', 'index.html'));
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/setup') return handleSetup(req, res);
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index'))) return servePage(res);
  res.writeHead(404); res.end('not found');
});

server.listen(SETUP_PORT, '127.0.0.1', async () => {
  const existing = await readKey();
  if (existing) {
    // Re-run / restart: skip key entry, relaunch the workspace, go straight in.
    console.log('Existing key found — relaunching workspace…');
    try { await bringUpUI(existing); openBrowser(UI_URL); console.log(`Workspace: ${UI_URL}`); return; }
    catch (e) { console.error('Relaunch failed, falling back to setup page', e); }
  }
  console.log(`Setup page: http://localhost:${SETUP_PORT}`);
  openBrowser(`http://localhost:${SETUP_PORT}`);
});
