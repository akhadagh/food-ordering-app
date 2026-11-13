/**
 * Closes the database pool when a test file finishes.
 *
 * PGlite accepts a single connection at a time, so every test file must
 * release its connection before the next one opens one.
 */
import { closePool } from '../../src/config/db.js';

afterAll(async () => {
  await closePool();
});
