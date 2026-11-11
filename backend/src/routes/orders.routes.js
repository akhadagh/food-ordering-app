import { Router } from 'express';
import { z } from 'zod';
import { validate, field } from '../middleware/validate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import * as orders from '../services/order.service.js';
import * as cart from '../services/cart.service.js';
import * as promo from '../services/promo.service.js';
import * as payment from '../services/payment.service.js';
import { buildQuote } from '../services/pricing.service.js';
import { query } from '../config/db.js';

const router = Router();

const cartLineSchema = z.object({
  menuItemId: field.id(),
  quantity: field.positiveInt(),
  customOptions: z.array(z.record(z.any())).max(20).optional(),
  specialInstructions: z.string().trim().max(500).optional(),
});

/* --------------------------------------------------------------- quotes -- */

/**
 * Price a cart without creating an order. The client never sends a price -
 * this endpoint returns the server's own calculation.
 */
router.post('/quote', optionalAuth, validate({ body: z.object({ items: z.array(cartLineSchema).min(1).max(60), promoCode: z.string().trim().max(40).optional() }).strict() }), async (req, res, next) => {
  try {
    const quote = await buildQuote({ query }, req.body.items, { promoCode: req.body.promoCode });
    res.json(quote);
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------------------- promos -- */

router.post('/validate-promo', optionalAuth, validate({ body: z.object({ code: z.string().trim().min(1).max(40), subtotal: z.coerce.number().min(0).optional() }).strict() }), async (req, res, next) => {
  try {
    const result = await promo.validatePromo(req.body.code, req.body.subtotal);
    res.json(result);
  } catch (err) {
    // An invalid code is a normal outcome, not a server error.
    if (err.status === 422) {
      return res.json({ valid: false, message: err.message });
    }
    next(err);
  }
});

/* ----------------------------------------------------------------- cart -- */

router.get('/cart', optionalAuth, async (req, res, next) => {
  try {
    const result = await cart.getCart({ user: req.user, guestToken: req.cookies?.[cart.GUEST_COOKIE] });
    if (result.guestToken && !req.cookies?.[cart.GUEST_COOKIE]) {
      res.cookie(cart.GUEST_COOKIE, result.guestToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/cart/items', optionalAuth, writeLimiter, validate({ body: z.object({ menuItemId: field.id(), quantity: field.positiveInt().optional(), customOptions: z.array(z.record(z.any())).max(20).optional(), specialInstructions: z.string().trim().max(500).optional() }).strict() }), async (req, res, next) => {
  try {
    await cart.addToCart({ user: req.user, guestToken: req.cookies?.[cart.GUEST_COOKIE] }, req.body);
    res.status(201).json({ message: 'Added to cart.' });
  } catch (err) {
    next(err);
  }
});

router.put('/cart/items/:id', optionalAuth, writeLimiter, validate({ params: z.object({ id: field.id() }), body: z.object({ quantity: z.coerce.number().int().min(0).max(99) }).strict() }), async (req, res, next) => {
  try {
    await cart.updateCartItem({ user: req.user, guestToken: req.cookies?.[cart.GUEST_COOKIE] }, req.params.id, req.body);
    res.json({ message: 'Cart updated.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/cart/items/:id', optionalAuth, writeLimiter, validate({ params: z.object({ id: field.id() }) }), async (req, res, next) => {
  try {
    await cart.removeCartItem({ user: req.user, guestToken: req.cookies?.[cart.GUEST_COOKIE] }, req.params.id);
    res.json({ message: 'Item removed.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/cart', optionalAuth, writeLimiter, async (req, res, next) => {
  try {
    await cart.clearCart({ user: req.user, guestToken: req.cookies?.[cart.GUEST_COOKIE] });
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------------------- orders -- */

const orderSchema = z
  .object({
    items: z.array(cartLineSchema).min(1).max(60),
    deliveryAddress: field.name(4, 400),
    deliveryNotes: z.string().trim().max(500).optional(),
    customerPhone: z.string().trim().min(6).max(30),
    paymentMethod: z.enum(['mtn_momo', 'telecel_cash', 'airteltigo_money', 'card', 'cash']),
    fulfilmentType: z.enum(['delivery', 'pickup']).optional(),
    promoCode: z.string().trim().max(40).optional(),
  })
  .strict();

router.post('/', requireAuth, writeLimiter, validate({ body: orderSchema }), async (req, res, next) => {
  try {
    const idempotencyKey =
      req.get('Idempotency-Key') || req.body?.idempotencyKey || orders.newIdempotencyKey();
    const order = await orders.createOrder(req.user, req.body, { idempotencyKey });
    res.status(order.deduplicated ? 200 : 201).json(order);
  } catch (err) {
    next(err);
  }
});

router.get('/my-orders', requireAuth, validate({ query: z.object({ page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(50).optional(), status: z.string().trim().max(40).optional() }) }), async (req, res, next) => {
  try {
    const q = req.validatedQuery || {};
    res.json(await orders.listMyOrders(req.user.id, q));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, validate({ params: z.object({ id: field.id() }) }), async (req, res, next) => {
  try {
    res.json(await orders.getOrderForUser(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', requireAuth, writeLimiter, validate({ params: z.object({ id: field.id() }), body: z.object({ reason: z.string().trim().max(300).optional() }).strict().optional() }), async (req, res, next) => {
  try {
    res.json(await orders.cancelOrder(req.params.id, req.user, { reason: req.body?.reason }));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/payment', requireAuth, writeLimiter, validate({ params: z.object({ id: field.id() }) }), async (req, res, next) => {
  try {
    const order = await orders.getOrderForUser(req.params.id, req.user);
    res.json(await payment.startPayment(order, req.user));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/payment/refresh', requireAuth, writeLimiter, validate({ params: z.object({ id: field.id() }) }), async (req, res, next) => {
  try {
    const order = await orders.getOrderForUser(req.params.id, req.user);
    res.json(await payment.refreshPayment(order));
  } catch (err) {
    next(err);
  }
});

export default router;
