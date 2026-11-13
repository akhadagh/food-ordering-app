import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Ensures every cart request carries a cart identifier.
 *
 * The guest cart is keyed by an opaque token in an httpOnly cookie. The
 * token must be issued on EVERY cart response, not only on the first read -
 * otherwise an item added before the cookie exists lands in a cart the
 * browser can never reach again.
 */
export const GUEST_CART_COOKIE = 'afia_guest';
const GUEST_CART_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const guestCartToken = (req, res, next) => {
  let token = req.cookies?.[GUEST_CART_COOKIE];

  if (!token) {
    token = crypto.randomUUID();
    res.cookie(GUEST_CART_COOKIE, token, {
      httpOnly: true,
      sameSite: env.cookieSameSite,
      secure: env.cookieSecure,
      path: '/',
      maxAge: GUEST_CART_MAX_AGE,
    });
  }

  req.guestCartToken = token;
  next();
};

export default { guestCartToken, GUEST_CART_COOKIE };
