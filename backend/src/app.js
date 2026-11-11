import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { healthCheck } from './config/db.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/orders.routes.js';
import adminRoutes from './routes/admin.routes.js';
import promoRoutes from './routes/promos.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import assistantRoutes from './routes/assistant.routes.js';

export function createApp() {
  const app = express();

  // Vercel and other proxies set X-Forwarded-For; trust it so rate limiting
  // and audit logs see the real client address.
  app.set('trust proxy', env.trustProxy || 1);
  app.disable('x-powered-by');

  // Request id - propagated into every log line.
  app.use((req, res, next) => {
    req.id = req.get('x-request-id') || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    })
  );

  /**
   * CORS.
   *
   * The original API hardcoded a single origin (http://localhost:3000) and
   * returned HTTP 500 for every other origin, which blocked any deployment to
   * a different host (audit finding P0-06). The allowlist now comes from the
   * environment and an unknown origin is refused cleanly.
   */
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests and server-to-server calls have no Origin.
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        if (env.isProd && env.corsOrigins.some((o) => o.endsWith('.vercel.app') && origin.endsWith('.vercel.app'))) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 600,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger[level]('request', {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        ms: Date.now() - started,
      });
    });
    next();
  });

  /* ------------------------------------------------------------ health -- */

  app.get('/api/health', async (_req, res) => {
    let db = { ok: false };
    try {
      db = await healthCheck();
    } catch (err) {
      db = { ok: false, error: err.message };
    }
    const healthy = db.ok;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      db: db.ok ? 'ok' : 'unavailable',
      latencyMs: db.latencyMs ?? null,
      version: env.appVersion,
      environment: env.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  app.get('/api/health/ready', async (_req, res) => {
    try {
      await healthCheck();
      res.json({ status: 'ready' });
    } catch (err) {
      res.status(503).json({ status: 'not_ready', reason: err.message });
    }
  });

  /* ------------------------------------------------------------- routes -- */

  app.use('/api', generalLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/promos', promoRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/assistant', assistantRoutes);

  app.get('/api', (_req, res) => {
    res.json({
      name: 'Afia Food Hub API',
      version: env.appVersion,
      documentation: 'See backend/README.md and DEPLOYMENT.md.',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
