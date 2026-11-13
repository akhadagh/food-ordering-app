/**
 * Destroys the disposable test database.
 */
import fs from 'node:fs';
import { readState, clearState, DATA_DIR } from './db-config.js';

export default async function globalTeardown() {
  const { pid } = readState();

  if (pid) {
    try {
      // The server runs in its own process group (detached), so the whole
      // group is signalled and no orphan is left holding the port.
      process.kill(-pid, 'SIGTERM');
    } catch {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        /* already gone */
      }
    }
  }

  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  clearState();
}
