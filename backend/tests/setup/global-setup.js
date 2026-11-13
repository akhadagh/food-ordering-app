/**
 * Starts the disposable test database.
 *
 * A PostgreSQL 17 instance (PGlite) is launched on a free port, migrated
 * with the real migration runner and seeded with the real seed script, so
 * the suite exercises the same schema and the same reference data the
 * application ships with.
 *
 * The instance is torn down in global-teardown.js.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { BACKEND_ROOT, DATA_DIR, connectionUrlFor, writeState } from './db-config.js';

const ADMIN_EMAIL = 'admin.test@afiafoodhub.test';
const ADMIN_PASSWORD = 'Test-Admin-2026';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function waitForPort(port, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`The test database did not start on port ${port}.`));
          return;
        }
        setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: BACKEND_ROOT,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => {
      out += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${path.basename(command)} ${args.join(' ')} failed (${code}):\n${out}`));
    });
  });
}

export default async function globalSetup() {
  const port = await freePort();
  const url = connectionUrlFor(port);

  // A fresh database every run: the suite must never inherit state.
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const server = spawn(
    process.execPath,
    ['scripts/dev-postgres.mjs', '--port', String(port), '--data-dir', DATA_DIR],
    { cwd: BACKEND_ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true }
  );
  server.unref();

  writeState({ port, pid: server.pid });

  await waitForPort(port);

  const dbEnv = {
    DATABASE_URL: url,
    DATABASE_URL_DIRECT: url,
    DATABASE_SSL: 'false',
    DATABASE_POOL_MAX: '1',
    JWT_SECRET: 'test-access-secret-that-is-at-least-32-characters-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-at-least-32-characters-long',
    LOG_LEVEL: 'error',
    BOOTSTRAP_ADMIN_EMAIL: ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_PASSWORD: ADMIN_PASSWORD,
  };

  await run(process.execPath, ['src/db/migrate.js'], dbEnv);
  await run(process.execPath, ['src/db/seed.js'], dbEnv);

  // eslint-disable-next-line no-console
  console.log(`\n  Test database ready on port ${port}\n`);
}
