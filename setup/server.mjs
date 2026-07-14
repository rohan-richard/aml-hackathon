import http from 'node:http';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UI_DIR = path.join(ROOT, 'ui');
const DATA_DIR = path.join(ROOT, 'data');
const KEY_FILE = path.join(DATA_DIR, 'key');
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
  const { default: Database } = await import(path.join(UI_DIR, 'node_modules', 'better-sqlite3', 'lib', 'index.js'));
  const db = new Database(DB_FILE);
  try {
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
  if (process.env.CLAUDE_CLI_PATH) env.CLAUDE_CLI_PATH = process.env.CLAUDE_CLI_PATH;
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
  await registerProject();
}

async function handleSetup(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  let key;
  try { key = JSON.parse(body).key?.trim(); } catch {}
  if (!key) return json(res, 400, { ok: false, error: 'No key received. Paste your team key and try again.' });

  const v = await validateKey(key);
  if (!v.ok) return json(res, 200, v);

  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(KEY_FILE, key, { mode: 0o600 });
    await bringUpUI(key);
    json(res, 200, { ok: true, url: UI_URL });
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
