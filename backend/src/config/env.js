import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(ROOT, '.env') });

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const str = (key, fallback = '') => {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
};

const num = (key, fallback) => {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (key, fallback = false) => {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const list = (key, fallback = []) => {
  const v = process.env[key];
  if (!v) return fallback;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const DEV_PLACEHOLDER_SECRET = 'development-only-insecure-secret-change-me';

export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  isProd,
  isTest,
  port: num('PORT', 5000),
  trustProxy: num('TRUST_PROXY', 0),

  databaseUrl: str('DATABASE_URL'),
  databaseUrlDirect: str('DATABASE_URL_DIRECT'),
  databaseSsl: bool('DATABASE_SSL', true),
  databasePoolMax: num('DATABASE_POOL_MAX', isProd ? 5 : 10),

  jwtSecret: str('JWT_SECRET'),
  jwtRefreshSecret: str('JWT_REFRESH_SECRET'),
  jwtExpiresIn: num('JWT_EXPIRES_IN', 900),
  jwtRefreshExpiresIn: num('JWT_REFRESH_EXPIRES_IN', 604800),
  bcryptRounds: num('BCRYPT_ROUNDS', 12),
  passwordMinLength: num('PASSWORD_MIN_LENGTH', 8),

  frontendUrl: str('FRONTEND_URL', 'http://localhost:3000'),
  corsOrigins: list('CORS_ORIGINS', list('FRONTEND_URL', ['http://localhost:3000'])),

  cookieDomain: str('COOKIE_DOMAIN', ''),
  cookieSecure: bool('COOKIE_SECURE', isProd),
  cookieSameSite: str('COOKIE_SAMESITE', 'lax'),

  loginMaxAttempts: num('LOGIN_MAX_ATTEMPTS', 10),
  loginWindowMinutes: num('LOGIN_WINDOW_MINUTES', 15),
  loginLockoutMinutes: num('LOGIN_LOCKOUT_MINUTES', 15),
  signupMaxAttemptsPerHour: num('SIGNUP_MAX_ATTEMPTS_PER_HOUR', 5),

  currency: str('CURRENCY', 'GHS'),
  deliveryFee: num('DELIVERY_FEE', 5),
  freeDeliveryThreshold: num('FREE_DELIVERY_THRESHOLD', 0),
  minOrderValue: num('MIN_ORDER_VALUE', 0),
  deliveryZones: list('DELIVERY_ZONES', []),

  uploadDriver: str('UPLOAD_DRIVER', 'local'),
  uploadBucket: str('UPLOAD_BUCKET', 'afia-food-hub-assets'),
  uploadPublicUrl: str('UPLOAD_PUBLIC_URL'),
  uploadMaxBytes: num('UPLOAD_MAX_BYTES', 5 * 1024 * 1024),

  paymentProvider: str('PAYMENT_PROVIDER', 'disabled'),
  paystackSecretKey: str('PAYSTACK_SECRET_KEY'),
  paystackPublicKey: str('PAYSTACK_PUBLIC_KEY'),
  paystackWebhookSecret: str('PAYSTACK_WEBHOOK_SECRET'),
  paystackApiBase: str('PAYSTACK_API_BASE', 'https://api.paystack.co'),
  hubtelClientId: str('HUBTEL_CLIENT_ID'),
  hubtelClientSecret: str('HUBTEL_CLIENT_SECRET'),
  hubtelMerchantId: str('HUBTEL_MERCHANT_ID'),
  hubtelApiBase: str('HUBTEL_API_BASE', 'https://api.hubtel.com'),
  paymentMerchantName: str('PAYMENT_MERCHANT_NAME', 'Afia Food Hub'),
  paymentMerchantPhone: str('PAYMENT_MERCHANT_PHONE'),

  emailProvider: str('EMAIL_PROVIDER', 'none'),
  emailFrom: str('EMAIL_FROM', 'Afia Food Hub <no-reply@example.com>'),
  resendApiKey: str('RESEND_API_KEY'),
  smtpHost: str('SMTP_HOST'),
  smtpPort: num('SMTP_PORT', 587),
  smtpUser: str('SMTP_USER'),
  smtpPass: str('SMTP_PASS'),

  aiProvider: str('AI_PROVIDER', 'none'),
  aiModel: str('AI_MODEL'),
  aiApiKey: str('AI_API_KEY'),
  aiApiBase: str('AI_API_BASE'),

  logLevel: str('LOG_LEVEL', 'info'),
  logJson: bool('LOG_JSON', isProd),

  appVersion: str('APP_VERSION', '1.0.0'),
  publicAppUrl: str('PUBLIC_APP_URL', 'http://localhost:3000'),
  supportPhone: str('SUPPORT_PHONE'),
  supportEmail: str('SUPPORT_EMAIL'),
  businessAddress: str('BUSINESS_ADDRESS'),
  businessHours: str('BUSINESS_HOURS'),

  bootstrapAdminEmail: str('BOOTSTRAP_ADMIN_EMAIL'),
  bootstrapAdminPassword: str('BOOTSTRAP_ADMIN_PASSWORD'),
};

const PROBLEMS = [];

/**
 * Validate the environment. In production a missing or insecure value is a
 * hard failure - the process must not start with a broken configuration.
 */
export function validateEnv({ strict = env.isProd } = {}) {
  PROBLEMS.length = 0;

  if (!env.databaseUrl) {
    PROBLEMS.push('DATABASE_URL is required (Neon pooled connection string).');
  }
  if (strict && !env.databaseUrlDirect) {
    PROBLEMS.push('DATABASE_URL_DIRECT is required in production (used for migrations).');
  }

  if (!env.jwtSecret) {
    PROBLEMS.push('JWT_SECRET is required.');
  } else if (env.jwtSecret.length < 32) {
    PROBLEMS.push('JWT_SECRET must be at least 32 characters.');
  } else if (strict && env.jwtSecret === DEV_PLACEHOLDER_SECRET) {
    PROBLEMS.push('JWT_SECRET is still the development placeholder.');
  }

  if (!env.jwtRefreshSecret) {
    PROBLEMS.push('JWT_REFRESH_SECRET is required.');
  } else if (env.jwtRefreshSecret.length < 32) {
    PROBLEMS.push('JWT_REFRESH_SECRET must be at least 32 characters.');
  } else if (env.jwtRefreshSecret === env.jwtSecret) {
    PROBLEMS.push('JWT_REFRESH_SECRET must differ from JWT_SECRET.');
  }

  if (!env.corsOrigins.length) {
    PROBLEMS.push('FRONTEND_URL (or CORS_ORIGINS) must list at least one allowed origin.');
  }
  if (env.corsOrigins.includes('*')) {
    PROBLEMS.push('CORS_ORIGINS must not be "*" when credentials are used.');
  }

  if (env.paymentProvider === 'paystack' && !env.paystackSecretKey) {
    PROBLEMS.push('PAYSTACK_SECRET_KEY is required when PAYMENT_PROVIDER=paystack.');
  }
  if (env.paymentProvider === 'paystack' && !env.paystackWebhookSecret) {
    PROBLEMS.push('PAYSTACK_WEBHOOK_SECRET is required to verify payment callbacks.');
  }
  if (env.paymentProvider === 'hubtel' && !env.hubtelClientId) {
    PROBLEMS.push('HUBTEL_CLIENT_ID is required when PAYMENT_PROVIDER=hubtel.');
  }

  if (env.uploadDriver === 'local' && strict) {
    PROBLEMS.push('UPLOAD_DRIVER=local is not valid in production (the filesystem is ephemeral).');
  }

  if (strict) {
    const weak = ['admin123', 'password123', 'password', 'secret', 'changeme'];
    if (weak.includes(env.bootstrapAdminPassword)) {
      PROBLEMS.push('BOOTSTRAP_ADMIN_PASSWORD is a known weak value.');
    }
  }

  return { ok: PROBLEMS.length === 0, problems: [...PROBLEMS] };
}

export function assertEnv() {
  const { ok, problems } = validateEnv();
  if (!ok) {
    const message = [
      'Invalid environment configuration:',
      ...problems.map((p) => `  - ${p}`),
      '',
      'See .env.example for the full list of required variables.',
    ].join('\n');
    throw new Error(message);
  }
}

export default env;
