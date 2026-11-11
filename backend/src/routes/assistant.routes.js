import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimit.js';
import * as assistant from '../services/assistant.service.js';

const router = Router();

/**
 * The customer assistant.
 *
 * Answers are generated from live menu, delivery and payment data and from
 * the signed-in customer's own orders. The assistant never states an order
 * status or a payment outcome that it has not read from the database.
 */
router.post(
  '/message',
  generalLimiter,
  optionalAuth,
  validate({
    body: z
      .object({
        message: z.string().trim().min(1).max(500),
        sessionId: z.string().trim().max(80).optional(),
      })
      .strict(),
  }),
  async (req, res, next) => {
    try {
      const reply = await assistant.answer(req.body.message, req.user);
      res.json({ reply });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
