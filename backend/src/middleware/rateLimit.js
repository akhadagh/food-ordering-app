import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Rate limiting.
 *
 * The original API had no rate limiting at all: twelve rapid failed logins
 * against the administrator account returned twelve 401 responses with no
 * lockout and no delay (audit finding P1-01).
 *
 * The per-account lockout lives in the database (login_attempts) so it
 * survives a serverless restart. These limiters are the coarse IP-level
 * layer in front of it.
 */

const keyFor = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.isProd ? 300 : 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'too_many_requests', message: 'Too many requests. Please slow down.' } },
  skip: () => env.isTest,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 40 : 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: keyFor,
  message: {
    error: { code: 'too_many_requests', message: 'Too many attempts from this network. Please try again later.' },
  },
  skip: () => env.isTest,
});

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.isProd ? env.signupMaxAttemptsPerHour : 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: keyFor,
  message: {
    error: { code: 'too_many_requests', message: 'Too many accounts created from this network. Please try again later.' },
  },
  skip: () => env.isTest,
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.isProd ? 60 : 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'too_many_requests', message: 'Too many requests. Please slow down.' } },
  skip: () => env.isTest,
});

export default { generalLimiter, authLimiter, signupLimiter, writeLimiter };
