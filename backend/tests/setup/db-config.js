/**
 * Shared configuration for the test database.
 *
 * The suite runs against a disposable PostgreSQL 17 (PGlite) instance that
 * is started, migrated, seeded and destroyed by the harness. Nothing in the
 * suite touches a developer database.
 *
 * global-setup writes the resolved port into `.test-db.json` so the test
 * workers - which are separate processes - connect to the same instance.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
export const STATE_FILE = path.join(BACKEND_ROOT, '.test-db.json');
export const DATA_DIR = path.join(BACKEND_ROOT, '.pgdata-test');
export const DEFAULT_PORT = Number(process.env.TEST_PG_PORT || 55433);

export const connectionUrlFor = (port) =>
  `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;

export function readState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return { port: Number(raw.port), url: connectionUrlFor(Number(raw.port)), pid: raw.pid ?? null };
  } catch {
    return { port: DEFAULT_PORT, url: connectionUrlFor(DEFAULT_PORT), pid: null };
  }
}

export function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function clearState() {
  try {
    fs.unlinkSync(STATE_FILE);
  } catch {
    /* nothing to clear */
  }
}
