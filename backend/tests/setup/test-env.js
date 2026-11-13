/**
 * Environment for the test suite.
 *
 * This file runs before the application is imported (setupFiles), so every
 * value here is in place before `config/env.js` reads it. `dotenv` never
 * overrides a variable that is already set, so the developer `.env` cannot
 * leak into the suite.
 */
import { readState } from './db-config.js';

const { url } = readState();

Object.assign(process.env, {
  NODE_ENV: 'test',
  APP_VERSION: 'test',

  DATABASE_URL: url,
  DATABASE_URL_DIRECT: url,
  DATABASE_SSL: 'false',
  // PGlite is a single-connection database: the socket server accepts one
  // client at a time, so the pool must never hold more than one connection.
  DATABASE_POOL_MAX: '1',

  JWT_SECRET: 'test-access-secret-that-is-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-at-least-32-characters-long',
  JWT_EXPIRES_IN: '900',
  JWT_REFRESH_EXPIRES_IN: '604800',

  // Cost 4 keeps the suite fast. The production cost is 12.
  BCRYPT_ROUNDS: '4',
  PASSWORD_MIN_LENGTH: '8',

  FRONTEND_URL: 'http://localhost:3111',
  CORS_ORIGINS: 'http://localhost:3111,http://localhost:3000',
  COOKIE_SECURE: 'false',
  COOKIE_SAMESITE: 'lax',

  DELIVERY_FEE: '5',
  FREE_DELIVERY_THRESHOLD: '0',
  MIN_ORDER_VALUE: '0',

  PAYMENT_PROVIDER: 'disabled',
  UPLOAD_DRIVER: 'local',
  UPLOAD_MAX_BYTES: String(1024 * 1024),

  LOG_LEVEL: 'error',
  LOG_JSON: 'false',

  // A low threshold makes the brute-force lockout observable in a test.
  LOGIN_MAX_ATTEMPTS: '3',
  LOGIN_WINDOW_MINUTES: '15',
  LOGIN_LOCKOUT_MINUTES: '15',
  SIGNUP_MAX_ATTEMPTS_PER_HOUR: '50',

  TRUST_PROXY: '0',
  PUBLIC_APP_URL: 'http://localhost:3111',
});
