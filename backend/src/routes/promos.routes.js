import { Router } from 'express';
import { z } from 'zod';
import { validate, field } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import * as promo from '../services/promo.service.js';

const router = Router();

const promoSchema = z
  .object({
    code: z.string().trim().min(3).max(32),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    discountValue: z.coerce.number().min(0).max(100000).optional(),
    minOrder: z.coerce.number().min(0).max(100000).optional(),
    maxDiscount: z.coerce.number().min(0).max(100000).optional(),
    maxUses: z.coerce.number().int().min(1).max(1000000).optional(),
    isActive: field.bool().optional(),
    expiresAt: z.string().trim().max(40).optional(),
  })
  .strict();

router.get('/', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    res.json(await promo.listPromos({ includeInactive: true }));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireAdmin, writeLimiter, validate({ body: promoSchema }), async (req, res, next) => {
  try {
    const id = await promo.createPromo(req.body);
    res.status(201).json(await promo.getPromo(id));
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ params: z.object({ id: field.id() }), body: promoSchema.partial().strict() }),
  async (req, res, next) => {
    try {
      await promo.updatePromo(req.params.id, req.body);
      res.json(await promo.getPromo(req.params.id));
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:id', requireAuth, requireAdmin, writeLimiter, validate({ params: z.object({ id: field.id() }) }), async (req, res, next) => {
  try {
    await promo.deletePromo(req.params.id);
    res.json({ message: 'Promo code deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
