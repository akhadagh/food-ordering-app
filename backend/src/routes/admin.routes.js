import { Router } from 'express';
import { z } from 'zod';
import { validate, field } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import * as admin from '../services/admin.service.js';
import * as orders from '../services/order.service.js';
import * as payment from '../services/payment.service.js';
import { badRequest, notFound } from '../utils/errors.js';

const router = Router();

// Every route in this file requires an administrator.
router.use(requireAuth, requireAdmin);

router.get('/dashboard', async (_req, res, next) => {
  try {
    res.json(await admin.dashboardStats());
  } catch (err) {
    next(err);
  }
});

router.get(
  '/orders',
  validate({
    query: z.object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      status: z.string().trim().max(40).optional(),
      search: z.string().trim().max(120).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      res.json(await orders.listAllOrders(req.validatedQuery || {}));
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/orders/:id/status',
  writeLimiter,
  validate({
    params: z.object({ id: field.id() }),
    body: z
      .object({
        status: z.enum([
          'placed',
          'confirmed',
          'preparing',
          'ready',
          'out_for_delivery',
          'delivered',
          'cancelled',
        ]),
        note: z.string().trim().max(300).optional(),
      })
      .strict(),
  }),
  async (req, res, next) => {
    try {
      const result = await orders.updateOrderStatus(req.params.id, req.body.status, {
        note: req.body.note,
        actor: req.user,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/orders/:id/stage',
  writeLimiter,
  validate({
    params: z.object({ id: field.id() }),
    body: z
      .object({
        stage: z.enum(['placed', 'preparing', 'delivered']),
        note: z.string().trim().max(300).optional(),
      })
      .strict(),
  }),
  async (req, res, next) => {
    try {
      const result = await orders.updateOrderStage(req.params.id, req.body.stage, {
        note: req.body.note,
        actor: req.user,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/orders/:id/refund',
  writeLimiter,
  validate({
    params: z.object({ id: field.id() }),
    body: z.object({ reason: z.string().trim().max(300).optional() }).strict(),
  }),
  async (req, res, next) => {
    try {
      res.json(await payment.refundPayment(req.params.id, { reason: req.body.reason }));
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/sales',
  validate({
    query: z.object({
      start_date: z.string().trim().max(40).optional(),
      end_date: z.string().trim().max(40).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const q = req.validatedQuery || {};
      res.json(await admin.salesData({ startDate: q.start_date, endDate: q.end_date }));
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/sales/export',
  validate({
    query: z.object({
      start_date: z.string().trim().max(40).optional(),
      end_date: z.string().trim().max(40).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const q = req.validatedQuery || {};
      const csv = await admin.salesCsv({ startDate: q.start_date, endDate: q.end_date });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="afia-food-hub-sales-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/users',
  validate({
    query: z.object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      search: z.string().trim().max(120).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      res.json(await admin.listUsers(req.validatedQuery || {}));
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/users/:id/role',
  writeLimiter,
  validate({
    params: z.object({ id: field.id() }),
    body: z.object({ role: z.enum(['customer', 'admin']) }).strict(),
  }),
  async (req, res, next) => {
    try {
      if (Number(req.params.id) === req.user.id) {
        throw badRequest('You cannot change your own role.');
      }
      const user = await admin.setUserRole(req.params.id, req.body.role);
      if (!user) throw notFound('User not found.');
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/users/:id/status',
  writeLimiter,
  validate({
    params: z.object({ id: field.id() }),
    body: z.object({ is_active: field.bool() }).strict(),
  }),
  async (req, res, next) => {
    try {
      if (Number(req.params.id) === req.user.id) {
        throw badRequest('You cannot deactivate your own account.');
      }
      const user = await admin.setUserActive(req.params.id, req.body.is_active);
      if (!user) throw notFound('User not found.');
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
