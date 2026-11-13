import { Router } from 'express';
import { z } from 'zod';
import { validate, field } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, signupLimiter } from '../middleware/rateLimit.js';
import * as auth from '../services/auth.service.js';
import { query } from '../config/db.js';
import { mergeGuestCartIntoUser } from '../services/cart.service.js';
import { GUEST_CART_COOKIE } from '../middleware/cart.js';
import { env } from '../config/env.js';
import { ACCESS_COOKIE, REFRESH_COOKIE, randomToken } from '../utils/tokens.js';

const router = Router();

/* ---------------------------------------------------------------- signup -- */

const signupSchema = z
  .object({
    name: field.name(2, 120),
    email: field.email(),
    password: field.password(env.passwordMinLength),
    phone: field.phone(),
    address: z.string().trim().max(400).optional(),
  })
  .strict();

router.post('/signup', signupLimiter, validate({ body: signupSchema }), async (req, res, next) => {
  try {
    const user = await auth.register(req.body);
    // Anything the customer put in the cart before signing up comes with them.
    await mergeGuestCartIntoUser(req.cookies?.[GUEST_CART_COOKIE], user.id);
    const session = auth.issueSession(res, user);
    res.status(201).json({ user, token: session.accessToken });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------------------------- login -- */

const loginSchema = z
  .object({
    email: field.email(),
    password: z.string().min(1).max(200),
  })
  .strict();

router.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const user = await auth.authenticate({
      email: req.body.email,
      password: req.body.password,
      ip: req.ip,
    });
    await mergeGuestCartIntoUser(req.cookies?.[GUEST_CART_COOKIE], user.id);
    const session = auth.issueSession(res, user);
    res.json({ user, token: session.accessToken });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------------------- logout -- */

router.post('/logout', (req, res) => {
  auth.clearSession(res);
  res.json({ message: 'Signed out.' });
});

/* --------------------------------------------------------------- refresh -- */

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const user = await auth.rotateRefreshToken(token);
    await mergeGuestCartIntoUser(req.cookies?.[GUEST_CART_COOKIE], user.id);
    const session = auth.issueSession(res, user);
    res.json({ user, token: session.accessToken });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------------------- profile -- */

router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    res.json(await auth.findById(req.user.id));
  } catch (err) {
    next(err);
  }
});

const profileSchema = z
  .object({
    name: field.name(2, 120).optional(),
    phone: field.phone(),
    address: z.string().trim().max(400).optional(),
  })
  .strict();

router.put('/profile', requireAuth, validate({ body: profileSchema }), async (req, res, next) => {
  try {
    res.json(await auth.updateProfile(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------ change password -- */

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: field.password(env.passwordMinLength),
  })
  .strict();

router.put('/password', requireAuth, validate({ body: passwordSchema }), async (req, res, next) => {
  try {
    await auth.changePassword(req.user.id, req.body);
    res.json({ message: 'Password updated.' });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------- password reset -- */

const forgotSchema = z.object({ email: field.email() }).strict();

router.post('/password/forgot', authLimiter, validate({ body: forgotSchema }), async (req, res, next) => {
  try {
    const result = await auth.createPasswordResetToken(req.body.email);
    // The token is only returned in non-production so the flow can be tested;
    // in production it is emailed.
    res.json({
      message: 'If that email is registered, a reset link is on its way.',
      ...(env.isProd ? {} : { resetToken: result?.token ?? null }),
    });
  } catch (err) {
    next(err);
  }
});

const resetSchema = z
  .object({
    token: z.string().min(10).max(200),
    newPassword: field.password(env.passwordMinLength),
  })
  .strict();

router.post('/password/reset', authLimiter, validate({ body: resetSchema }), async (req, res, next) => {
  try {
    await auth.resetPasswordWithToken(req.body.token, req.body.newPassword);
    res.json({ message: 'Your password has been reset. Please sign in.' });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------------- availability -- */

router.get('/availability', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT id, email, role, is_active FROM users WHERE id = $1', [1]);
    res.json({ ok: true, bootstrapped: rows.length > 0 });
  } catch (err) {
    next(err);
  }
});

export default router;
export { ACCESS_COOKIE, REFRESH_COOKIE, randomToken };
