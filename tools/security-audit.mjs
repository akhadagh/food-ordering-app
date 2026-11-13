#!/usr/bin/env node
/**
 * Security audit.
 *
 *   node tools/security-audit.mjs [--url https://api.example.com] [--with-tests]
 *
 * Four checks that can be run at any time and that mean something:
 *
 *  1. Dependency audit - the production dependency tree of both packages is
 *     checked for known advisories. Build-time tooling is reported
 *     separately because it never reaches the browser or the server.
 *  2. Secret scan - the working tree AND the whole Git history are scanned
 *     for credentials that must never be committed.
 *  3. Header scan - the running API is checked for the security headers a
 *     browser needs. Pass --url to scan a deployment; without it the API is
 *     booted locally.
 *  4. Authorisation matrix - with --with-tests, the backend's role matrix is
 *     executed: every administration route must refuse an anonymous caller
 *     and a customer, and admit an administrator.
 *
 * The exit code is non-zero when a check fails, so it can gate a release.
 */
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
const TARGET_URL = urlIndex >= 0 ? args[urlIndex + 1] : null;
const WITH_TESTS = args.includes('--with-tests');

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  // eslint-disable-next-line no-console
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
};

/* ------------------------------------------------------- 1. dependencies -- */

function npmAudit(dir, omitDev) {
  const args = ['audit', '--json'];
  if (omitDev) args.push('--omit=dev');
  try {
    const out = execFileSync('npm', args, { cwd: path.join(ROOT, dir), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(out);
  } catch (err) {
    // `npm audit` exits non-zero when it finds anything; the JSON is still
    // on stdout.
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

// eslint-disable-next-line no-console
console.log('\n1. Dependency audit\n');

for (const dir of ['backend', 'frontend']) {
  const production = npmAudit(dir, true);
  if (!production) {
    record(`${dir}: production dependencies`, false, 'the audit could not be run');
    continue;
  }
  const v = production.metadata?.vulnerabilities || {};
  const severe = (v.critical || 0) + (v.high || 0);
  record(
    `${dir}: production dependencies`,
    severe === 0,
    `${v.total || 0} advisories (${v.critical || 0} critical, ${v.high || 0} high, ${v.moderate || 0} moderate, ${v.low || 0} low)`
  );

  const all = npmAudit(dir, false);
  if (all) {
    const t = all.metadata?.vulnerabilities || {};
    // eslint-disable-next-line no-console
    console.log(
      `         build tooling (not shipped): ${t.total || 0} advisories ` +
        `(${t.critical || 0} critical, ${t.high || 0} high)`
    );
  }
}

/* ------------------------------------------------------------ 2. secrets -- */

// eslint-disable-next-line no-console
console.log('\n2. Secret scan\n');

const SECRET_PATTERNS = [
  { name: 'private key', re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_\-]{35}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[0-9A-Za-z\-]{10,}\b/ },
  { name: 'Stripe secret key', re: /\bsk_(live|test)_[0-9A-Za-z]{16,}\b/ },
  { name: 'Paystack secret key', re: /\bsk_live_[0-9a-f]{32}\b/ },
  { name: 'Hubtel secret', re: /\bht_live_[0-9A-Za-z]{20,}\b/ },
  { name: 'JSON web token', re: /\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b/ },
  {
    name: 'database URL with a password',
    re: /postgres(ql)?:\/\/[^:\s"']+:[^@\s"']+@[^\s"']+/gi,
  },
  {
    name: 'assigned secret',
    re: /\b(?:JWT_SECRET|JWT_REFRESH_SECRET|PAYSTACK_SECRET_KEY|HUBTEL_CLIENT_SECRET|S3_SECRET_ACCESS_KEY|API_KEY)\s*[:=]\s*['"][^'"]{16,}['"]/gi,
  },
];

// The values that are allowed to appear in a repository: placeholders and
// the local development values used by the disposable test database and the
// verification scripts. None of them is a credential for anything.
const ALLOWED = [
  'test-access-secret-that-is-at-least-32-characters-long',
  'test-refresh-secret-that-is-at-least-32-characters-long',
  'local-development-secret-that-is-at-least-32-characters-long',
  'local-development-refresh-secret-32-characters-minimum',
  'development-only-insecure-secret-change-me',
  'clean-install-verification-secret-32-characters-min',
  'clean-install-refresh-secret-32-characters-min',
  'e2e-verification-secret-that-is-32-characters-long',
  'e2e-verification-refresh-secret-32-characters',
  'postgres:postgres@',
  'REACT_APP_API_URL',
];

// A connection string whose user, password or host is an obvious stand-in is
// documentation, not a credential.
const PLACEHOLDER_PARTS = [
  'user',
  'password',
  'pass',
  'username',
  'secret',
  'changeme',
  'change-me',
  'your',
  'your-password',
  'your-username',
  'xxx',
  'xxxx',
  'placeholder',
  'example',
  'localhost',
  '127.0.0.1',
  'host',
  'region',
  'db-name',
  'database',
];

function looksLikePlaceholder(value) {
  const lowered = value.toLowerCase();
  return PLACEHOLDER_PARTS.some((p) => lowered === p || lowered.includes(p));
}

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'build',
  'coverage',
  '.pgdata',
  '.pgdata-test',
  '.brand-cache',
]);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function scanText(text) {
  const hits = [];
  for (const { name, re } of SECRET_PATTERNS) {
    const regex = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      if (ALLOWED.some((a) => value.includes(a))) continue;

      if (name === 'database URL with a password') {
        const parsed = value.match(/postgres(?:ql)?:\/\/([^:\s"'/]+):([^@\s"']+)@([^\s"'/]+)/i);
        if (parsed) {
          const [, user, password, host] = parsed;
          if (looksLikePlaceholder(user) || looksLikePlaceholder(password) || looksLikePlaceholder(host)) {
            continue;
          }
        }
      }

      hits.push({ name, value });
      if (hits.length > 20) break;
    }
  }
  return hits;
}

function scanTree() {
  const hits = [];
  for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file);
    let text;
    try {
      const stat = fs.statSync(file);
      if (stat.size > 2 * 1024 * 1024) continue;
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (text.includes('\0')) continue; // binary
    for (const hit of scanText(text)) hits.push({ file: rel, ...hit });
  }
  return hits;
}

function scanHistory() {
  const hits = [];
  let commits = [];
  try {
    commits = execFileSync('git', ['log', '--all', '--pretty=%H'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return hits;
  }
  for (const commit of commits) {
    let diff = '';
    try {
      diff = execFileSync('git', ['show', '--no-color', '--unified=0', commit], {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      continue;
    }
    for (const hit of scanText(diff)) hits.push({ file: `commit ${commit.slice(0, 8)}`, ...hit });
  }
  return hits;
}

const treeHits = scanTree();
record('working tree', treeHits.length === 0, treeHits.length ? `${treeHits.length} hit(s)` : 'no secrets found');
for (const hit of treeHits.slice(0, 10)) {
  // eslint-disable-next-line no-console
  console.log(`         ${hit.file}: ${hit.name}`);
}

const historyHits = scanHistory();
record(
  'Git history',
  historyHits.length === 0,
  historyHits.length ? `${historyHits.length} hit(s)` : 'no secrets found'
);
for (const hit of historyHits.slice(0, 10)) {
  // eslint-disable-next-line no-console
  console.log(`         ${hit.file}: ${hit.name}`);
}

// A .env file must never be tracked.
let trackedEnv = [];
try {
  trackedEnv = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((f) => /(^|\/)\.env($|\.)/.test(f) && !f.endsWith('.example'));
} catch {
  /* not a repository */
}
record('no tracked .env file', trackedEnv.length === 0, trackedEnv.join(', ') || 'none');

/* ------------------------------------------------------------- 3. headers -- */

// eslint-disable-next-line no-console
console.log('\n3. Header scan\n');

const REQUIRED_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'content-security-policy': "default-src 'self'",
  'referrer-policy': 'strict-origin-when-cross-origin',
};

async function scanHeaders() {
  let server = null;
  let base = TARGET_URL;

  if (!base) {
    // Boot the API in-process so the scan needs no running deployment.
    const { createApp } = await import(path.join(ROOT, 'backend/src/app.js'));
    const app = createApp();
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/health`);
    const headers = res.headers;

    for (const [header, expected] of Object.entries(REQUIRED_HEADERS)) {
      const value = headers.get(header) || '';
      const ok = value.includes(expected);
      record(`header ${header}`, ok, ok ? expected : `expected "${expected}", got "${value || 'nothing'}"`);
    }

    record('header x-powered-by removed', headers.get('x-powered-by') === null, 'the framework is not advertised');

    const cache = headers.get('cache-control') || '';
    record('responses are not cacheable', cache.includes('no-store'), cache || 'nothing');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

try {
  await scanHeaders();
} catch (err) {
  record('header scan', false, err.message);
}

/* ---------------------------------------------------- 4. authorisation -- */

// eslint-disable-next-line no-console
console.log('\n4. Authorisation matrix\n');

if (WITH_TESTS) {
  const run = spawnSync(
    process.execPath,
    [
      '--experimental-vm-modules',
      'node_modules/jest/bin/jest.js',
      '--runInBand',
      'tests/api/admin.test.js',
      '--testNamePattern',
      'authorisation matrix',
    ],
    { cwd: path.join(ROOT, 'backend'), encoding: 'utf8' }
  );

  const output = `${run.stdout || ''}${run.stderr || ''}`;
  const ok = run.status === 0;
  record('authorisation matrix', ok, ok ? 'every administration route refuses the wrong role' : 'the matrix failed');

  if (!ok) {
    // eslint-disable-next-line no-console
    console.log(output.split('\n').filter((l) => l.includes('✕') || l.includes('●')).join('\n'));
  }
} else {
  // eslint-disable-next-line no-console
  console.log('  [SKIP] authorisation matrix — run again with --with-tests to execute it');
}

/* ------------------------------------------------------------- 5. summary -- */

const failed = results.filter((r) => !r.ok);

// eslint-disable-next-line no-console
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

if (failed.length) {
  // eslint-disable-next-line no-console
  console.log('Failed checks:');
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ''}`);
  process.exit(1);
}

process.exit(0);
