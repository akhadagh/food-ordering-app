import bcrypt from 'bcrypt';
import { env } from '../config/env.js';

/**
 * Password hashing.
 *
 * Uses the NATIVE bcrypt binding. The pure-JavaScript `bcryptjs` package was
 * replaced because it hashes synchronously: at cost 12 it blocked the Node
 * event loop for the best part of a second on every sign-up, which stalls
 * every other request in the process and would exhaust a serverless
 * function's execution budget.
 *
 * The native binding verifies hashes produced by bcryptjs, so accounts
 * migrated from the previous backend keep working. Those hashes use the
 * `$2a$` prefix; the native binding writes `$2b$`. A successful sign-in
 * against a legacy hash transparently re-hashes it.
 */

export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), env.bcryptRounds);
}

export async function verifyPassword(plain, stored) {
  if (!stored) return false;
  try {
    return await bcrypt.compare(String(plain), stored);
  } catch {
    return false;
  }
}

/** True when the stored hash should be replaced with a fresh one. */
export function needsRehash(stored) {
  if (!stored) return true;
  // $2b$ is the current native prefix; $2a$ came from bcryptjs.
  return !String(stored).startsWith('$2b$');
}

/**
 * A bcrypt hash of a value that cannot be guessed, used to keep the
 * response time of a sign-in attempt the same whether or not the account
 * exists.
 */
let dummyHash = null;
export async function dummyHashValue() {
  if (!dummyHash) {
    dummyHash = await bcrypt.hash('afia-food-hub-timing-equaliser', env.bcryptRounds);
  }
  return dummyHash;
}

export default { hashPassword, verifyPassword, needsRehash, dummyHashValue };
