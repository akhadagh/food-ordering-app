import { verifyAccessToken, ACCESS_COOKIE, REFRESH_COOKIE } from '../utils/tokens.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { query } from '../config/db.js';

/**
 * Authentication and authorisation.
 *
 * The role is ALWAYS re-read from the database - never trusted from the
 * token - so a token minted before a role change cannot be used to escalate.
 */

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  // Cookie session (used by the browser client).
  if (req.cookies?.[ACCESS_COOKIE]) return req.cookies[ACCESS_COOKIE];
  return null;
}

async function resolveUser(req) {
  const token = extractToken(req);
  if (!token) return null;

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return null;
  }
  if (payload.typ !== 'access') return null;

  const { rows } = await query(
    'SELECT id, name, email, phone, address, role, email_verified, is_active FROM users WHERE id = $1',
    [payload.userId]
  );
  const user = rows[0];
  if (!user || !user.is_active) return null;
  return user;
}

/** Attaches req.user when a valid session is present, but never rejects. */
export const optionalAuth = async (req, _res, next) => {
  try {
    req.user = await resolveUser(req);
  } catch {
    req.user = null;
  }
  next();
};

export const requireAuth = async (req, _res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) throw unauthorized('Sign in to continue.');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin = (req, _res, next) => {
  if (!req.user) return next(unauthorized('Sign in to continue.'));
  if (req.user.role !== 'admin') {
    return next(forbidden('Access denied'));
  }
  next();
};

export { ACCESS_COOKIE, REFRESH_COOKIE };
export default { requireAuth, requireAdmin, optionalAuth };
