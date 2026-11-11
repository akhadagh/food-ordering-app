import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * The global error handler.
 *
 * Only `code` and `message` ever reach the client. Database errors, stack
 * traces and constraint names stay on the server - the original API returned
 * raw PostgreSQL errors such as
 * `new row for relation "orders" violates check constraint "orders_status_check"`
 * straight to the browser (audit finding P2-07).
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: `No route matches ${req.method} ${req.path}.`,
    },
  });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  const requestId = req.id;

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'validation_failed',
        message: 'Some of the details provided are not valid.',
        details: err.issues.map((i) => ({
          field: i.path.join('.') || '(root)',
          message: i.message,
        })),
      },
    });
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error(err.message, { requestId, code: err.code, stack: err.stack });
    } else {
      logger.warn(err.message, { requestId, code: err.code });
    }
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'payload_too_large', message: 'That request was too large.' },
    });
  }

  if (err && err.code === 'ECONNREFUSED') {
    logger.error('database.unreachable', { requestId, message: err.message });
    return res.status(503).json({
      error: { code: 'service_unavailable', message: 'The service is temporarily unavailable.' },
    });
  }

  logger.error('unhandled_error', {
    requestId,
    message: err?.message,
    stack: env.isProd ? undefined : err?.stack,
  });

  return res.status(500).json({
    error: { code: 'internal_error', message: 'Something went wrong on our side. Please try again.' },
  });
};

export default { notFoundHandler, errorHandler };
