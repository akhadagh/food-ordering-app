import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ISSUER = 'afia-food-hub';

export function signAccessToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email, typ: 'access' },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, issuer: ISSUER, subject: String(user.id) }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, typ: 'refresh' },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn, issuer: ISSUER, subject: String(user.id) }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, { issuer: ISSUER });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret, { issuer: ISSUER });
}

/** Opaque, high-entropy token used for email verification and password reset. */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  domain: env.cookieDomain || undefined,
  path: '/',
  maxAge: maxAgeMs,
});

export const ACCESS_COOKIE = 'afia_access';
export const REFRESH_COOKIE = 'afia_refresh';

export default {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  randomToken,
  cookieOptions,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
};
