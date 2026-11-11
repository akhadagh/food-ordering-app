import { Router, raw } from 'express';
import { z } from 'zod';
import { validate, field } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import * as payment from '../services/payment.service.js';
import { getProvider } from '../payments/index.js';

const router = Router();

/**
 * Provider webhook.
 *
 * The RAW body is required: the signature is computed over exactly the bytes
 * the provider sent. The signature is verified BEFORE anything is read from
 * the payload, and the payment is then confirmed against the provider's own
 * verification endpoint - the webhook body alone is never trusted to decide
 * whether money moved.
 */
router.post(
  '/:provider/webhook',
  raw({ type: 'application/json', limit: '1mb' }),
  async (req, res, next) => {
    try {
      const providerId = String(req.params.provider || '').toLowerCase();
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body ?? {}));

      const signature =
        req.get('x-paystack-signature') || req.get('x-hubtel-signature') || req.get('x-signature');

      const result = await payment.handleWebhook({ providerId, rawBody, signature });
      res.json({ received: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

/** Which provider is live right now, and what it supports. */
router.get('/provider', (_req, res) => {
  const provider = getProvider();
  res.json({
    provider: provider.id,
    onlineEnabled: provider.id !== 'disabled',
    currency: 'GHS',
  });
});

/** A customer asks the API to re-check a pending payment with the provider. */
router.post(
  '/orders/:id/refresh',
  requireAuth,
  writeLimiter,
  validate({ params: z.object({ id: field.id() }) }),
  async (req, res, next) => {
    try {
      const { getOrderForUser } = await import('../services/order.service.js');
      const order = await getOrderForUser(req.params.id, req.user);
      res.json(await payment.refreshPayment(order));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
