import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { badRequest, unauthorized, conflict, notFound, tooManyRequests } from '../utils/errors.js';
import {
  signAccessToken,
  signRefreshToken,
  randomToken,
  cookieOptions,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from '../utils/tokens.js';

const PUBLIC_FIELDS = `
  id, name, email, phone, address, role, email_verified, is_active, created_at, updated_at
`;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ghanaPhonePattern = /^\+?233\d{9}$|^0\d{9}$/;

export function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function validatePassword(password) {
  const value = String(password || '');
  if (value.length < env.passwordMinLength) {
    throw badRequest(`Password must be at least ${env.passwordMinLength} characters.`);
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    throw badRequest('Password must contain both letters and numbers.');
  }
  return value;
}

export function validatePhone(phone) {
  if (phone === undefined || phone === null || phone === '') return null;
  const value = String(phone).trim();
  if (!ghanaPhonePattern.test(value.replace(/\s/g, ''))) {
    throw badRequest('Enter a valid Ghanaian phone number, e.g. +233 24 123 4567.');
  }
  return value;
}

/* ------------------------------------------------------------------ *
 * Brute-force protection (P1-01)
 * ------------------------------------------------------------------ */

export async function recordAttempt(identifier, ip, successful) {
  await query(
    `INSERT INTO login_attempts (identifier, ip_address, successful) VALUES ($1, $2, $3)`,
    [identifier, ip || null, successful]
  );
}

export async function assertLoginAllowed(identifier, ip) {
  const windowMs = env.loginWindowMinutes * 60 * 1000;

  const { rows } = await query(
    `SELECT count(*)::int AS failures
       FROM login_attempts
      WHERE identifier = $1
        AND successful = false
        AND attempted_at > now() - ($2 || ' milliseconds')::interval`,
    [identifier, String(windowMs)]
  );

  if ((rows[0]?.failures || 0) >= env.loginMaxAttempts) {
    const { rows: last } = await query(
      `SELECT attempted_at FROM login_attempts
        WHERE identifier = $1 AND successful = false
        ORDER BY attempted_at DESC LIMIT 1`,
      [identifier]
    );
    const lastAttempt = last[0]?.attempted_at ? new Date(lastAttemptSafe(last[0].attempted_at)) : null;
    const unlockAt = lastAttempt
      ? new Date(lastAttempt.getTime() + env.loginLockoutMinutes * 60 * 1000)
      : new Date();
    throw tooManyRequests(
      `Too many failed attempts. Try again in ${Math.max(1, Math.ceil((unlockAt - Date.now()) / 60000))} minute(s).`
    );
  }

  if (ip) {
    const { rows: ipRows } = await query(
      `SELECT count(*)::int AS failures
         FROM login_attempts
        WHERE ip_address = $1
          AND successful = false
          AND attempted_at > now() - ($2 || ' milliseconds')::interval`,
      [ip, String(windowMs)]
    );
    if ((ipRows[0]?.failures || 0) >= env.loginMaxAttempts * 3) {
      throw tooManyRequests('Too many failed attempts from this network. Please try again later.');
    }
  }
}

function lastAttemptSafe(value) {
  return value instanceof Date ? value : new Date(value);
}

export async function clearAttempts(identifier) {
  await query('DELETE FROM login_attempts WHERE identifier = $1', [identifier]);
}

/* ------------------------------------------------------------------ *
 * Registration
 * ------------------------------------------------------------------ */

/**
 * Register a customer.
 *
 * The role is NEVER taken from the request body - audit finding P0-02.
 * A signup body containing "role": "admin" produces a customer.
 */
export async function register({ name, email, password, phone, address }) {
  const cleanEmail = normaliseEmail(email);
  if (!emailPattern.test(cleanEmail)) throw badRequest('Enter a valid email address.');
  if (!String(name || '').trim()) throw badRequest('Enter your name.');

  const validPassword = validatePassword(password);
  const validPhone = validatePhone(phone);

  const existing = await query('SELECT id FROM users WHERE lower(email) = $1', [cleanEmail]);
  if (existing.rowCount) {
    throw conflict('An account with that email already exists.');
  }

  const hash = await bcrypt.hash(validPassword, env.bcryptRounds);
  const { rows } = await query(
    `INSERT INTO users (name, email, phone, address, role, password_hash)
     VALUES ($1, $2, $3, $4, 'customer', $5)
     RETURNING ${PUBLIC_FIELDS}`,
    [String(name).trim(), cleanEmail, validPhone, address ? String(address).trim() : null, hash]
  );

  return rows[0];
}

/* ------------------------------------------------------------------ *
 * Login
 * ------------------------------------------------------------------ */

export async function authenticate({ email, password, ip }) {
  const cleanEmail = normaliseEmail(email);
  await assertLoginAllowed(cleanEmail, ip);

  const { rows } = await query(
    'SELECT id, name, email, phone, address, role, password_hash, email_verified, is_active FROM users WHERE lower(email) = $1',
    [cleanEmail]
  );
  const user = rows[0];

  // Compare against a dummy hash when the user does not exist so the
  // response time does not reveal whether the email is registered.
  const hash = user ? user.password_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';
  const ok = await bcrypt.compare(String(password || ''), hash);

  if (!user || !ok) {
    await recordAttempt(cleanEmail, ip, false);
    throw unauthorized('Invalid email or password.');
  }
  if (!user.is_active) {
    throw unauthorized('This account has been deactivated. Contact support.');
  }

  await recordAttempt(cleanEmail, ip, true);
  await clearAttempts(cleanEmail);

  const { password_hash: _omit, ...safe } = user;
  return safe;
}

export async function findById(id) {
  const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound('User not found.');
  return rows[0];
}

export async function updateProfile(userId, { name, phone, address }) {
  if (name !== undefined && !String(name || '').trim()) {
    throw badRequest('Enter your name.');
  }
  const validPhone = phone !== undefined ? validatePhone(phone) : undefined;

  const { rows } = await query(
    `UPDATE users
        SET name = COALESCE($2, name),
            phone = CASE WHEN $3::boolean THEN $4 ELSE phone END,
            address = CASE WHEN $5::boolean THEN $6 ELSE address END
      WHERE id = $1
      RETURNING ${PUBLIC_FIELDS}`,
    [
      userId,
      name !== undefined ? String(name).trim() : null,
      phone !== undefined,
      validPhone,
      address !== undefined,
      address !== undefined ? String(address || '').trim() || null : null,
    ]
  );
  if (!rows[0]) throw notFound('User not found.');
  return rows[0];
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!rows[0]) throw notFound('User not found.');

  const ok = await bcrypt.compare(String(currentPassword || ''), rows[0].password_hash);
  if (!ok) throw badRequest('Your current password is incorrect.');

  const valid = validatePassword(newPassword);
  const hash = await bcrypt.hash(valid, env.bcryptRounds);
  await query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, hash]);
}

/* ------------------------------------------------------------------ *
 * Tokens and cookies
 * ------------------------------------------------------------------ */

export function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(env.jwtExpiresIn * 1000));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(env.jwtRefreshExpiresIn * 1000));

  return { accessToken, refreshToken };
}

export function clearSession(res) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

export async function rotateRefreshToken(token) {
  if (!token) throw unauthorized('Session expired. Please sign in again.');
  const { verifyRefreshToken } = await import('../utils/tokens.js');
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw unauthorized('Session expired. Please sign in again.');
  }
  if (payload.typ !== 'refresh') throw unauthorized('Invalid token.');
  const user = await findById(payload.userId);
  if (!user.is_active) throw unauthorized('This account has been deactivated.');
  return user;
}

/* ------------------------------------------------------------------ *
 * Password reset
 * ------------------------------------------------------------------ */

export async function createPasswordResetToken(email) {
  const cleanEmail = normaliseEmail(email);
  const { rows } = await query('SELECT id FROM users WHERE lower(email) = $1', [cleanEmail]);
  if (!rows[0]) return null; // Do not reveal whether the address exists.

  const token = randomToken();
  const hash = await bcrypt.hash(token, 10);
  await query(
    `INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, 'reset_password', now() + interval '1 hour')`,
    [rows[0].id, hash]
  );
  return { userId: rows[0].id, token };
}

export async function resetPasswordWithToken(token, newPassword) {
  const hash = await bcrypt.hash(String(token || ''), 10);
  const { rows } = await query(
    `SELECT id, user_id FROM auth_tokens
      WHERE token_hash = $1 AND purpose = 'reset_password' AND used_at IS NULL AND expires_at > now()`,
    [hash]
  );
  if (!rows[0]) throw badRequest('That reset link is invalid or has expired.');

  const valid = validatePassword(newPassword);
  const newHash = await bcrypt.hash(valid, env.bcryptRounds);

  await withTransaction(async (client) => {
    await client.query('UPDATE users SET password_hash = $2 WHERE id = $1', [rows[0].user_id, newHash]);
    await client.query('UPDATE auth_tokens SET used_at = now() WHERE id = $1', [rows[0].id]);
    await client.query('DELETE FROM login_attempts WHERE identifier = (SELECT email FROM users WHERE id = $1)', [
      rows[0].user_id,
    ]);
  });
}

export default {
  register,
  authenticate,
  findById,
  updateProfile,
  changePassword,
  issueSession,
  clearSession,
  rotateRefreshToken,
  createPasswordResetToken,
  resetPasswordWithToken,
};
