import crypto from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { badRequest, notFound } from '../utils/errors.js';
import { buildQuote } from './pricing.service.js';

import { GUEST_CART_COOKIE } from '../middleware/cart.js';

/**
 * Server-side cart.
 *
 * The original application kept the cart only in localStorage (audit finding
 * P2-14), so it was lost across devices and never re-validated. The server
 * now owns the cart, and every price shown is produced by the pricing
 * service.
 */

async function resolveCartId({ user, guestToken }) {
  if (user?.id) {
    const { rows } = await query('SELECT id FROM carts WHERE user_id = $1', [user.id]);
    if (rows[0]) return { id: rows[0].id, guestToken: null };
    const { rows: created } = await query(
      'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
      [user.id]
    );
    return { id: created[0].id, guestToken: null };
  }

  const token = guestToken || crypto.randomUUID();
  const { rows } = await query('SELECT id FROM carts WHERE guest_token = $1', [token]);
  if (rows[0]) return { id: rows[0].id, guestToken: token };
  const { rows: created } = await query(
    'INSERT INTO carts (guest_token) VALUES ($1) RETURNING id',
    [token]
  );
  return { id: created[0].id, guestToken: token };
}


/**
 * Move a guest cart into a signed-in customer's cart.
 *
 * A customer who browses as a guest and then creates an account should not
 * lose what they had put in the cart.
 */
export async function mergeGuestCartIntoUser(guestToken, userId) {
  if (!guestToken) return 0;
  try {
    const { rows: guestCarts } = await query('SELECT id FROM carts WHERE guest_token = $1', [
      guestToken,
    ]);
    if (!guestCarts[0]) return 0;

    const { rows: userCarts } = await query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    let targetCartId;
    if (userCarts[0]) {
      targetCartId = userCarts[0].id;
    } else {
      const { rows: created } = await query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      targetCartId = created[0].id;
    }

    const { rows: items } = await query(
      'SELECT menu_item_id, quantity, custom_options, special_instructions FROM cart_items WHERE cart_id = $1',
      [guestCarts[0].id]
    );

    for (const item of items) {
      await query(
        `INSERT INTO cart_items (cart_id, menu_item_id, quantity, custom_options, special_instructions)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [
          targetCartId,
          item.menu_item_id,
          item.quantity,
          JSON.stringify(item.custom_options || []),
          item.special_instructions,
        ]
      );
    }

    await query('DELETE FROM cart_items WHERE cart_id = $1', [guestCarts[0].id]);
    await query('DELETE FROM carts WHERE id = $1', [guestCarts[0].id]);

    return items.length;
  } catch {
    // A failed merge must never block a sign-in.
    return 0;
  }
}

export async function getCart({ user, guestToken }) {
  const resolved = await resolveCartId({ user, guestToken });
  const cartId = resolved.id;

  const { rows: items } = await query(
    `SELECT ci.id, ci.menu_item_id, ci.quantity, ci.custom_options, ci.special_instructions,
            mi.name, mi.price, mi.image_url, mi.is_available, mi.stock_quantity,
            c.name AS category_name
       FROM cart_items ci
       JOIN menu_items mi ON mi.id = ci.menu_item_id
       LEFT JOIN categories c ON c.id = mi.category_id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC`,
    [cartId]
  );

  const lines = items.map((i) => ({
    id: i.id,
    menuItemId: i.menu_item_id,
    name: i.name,
    image_url: i.image_url,
    categoryName: i.category_name,
    isAvailable: i.is_available,
    quantity: i.quantity,
    customOptions: i.custom_options || [],
    specialInstructions: i.special_instructions || '',
  }));

  let quote = null;
  let issues = [];
  if (lines.length) {
    try {
      quote = await buildQuote({ query }, lines);
    } catch (err) {
      // A stale cart (an item was removed or is now unavailable) is reported
      // rather than silently priced.
      issues = [{ code: 'cart_invalid', message: err.message }];
    }
  } else {
    quote = {
      items: [],
      subtotal: '0.00',
      delivery_fee: '0.00',
      discount: '0.00',
      total: '0.00',
      promo: null,
    };
  }

  return {
    id: cartId,
    guestToken: resolved.guestToken,
    items: lines,
    quote,
    issues,
  };
}

export async function addToCart({ user, guestToken }, input) {
  const resolved = await resolveCartId({ user, guestToken });
  const cartId = resolved.id;

  const menuItemId = Number(input.menuItemId ?? input.menu_item_id);
  const quantity = Number(input.quantity ?? 1);
  if (!Number.isFinite(menuItemId)) throw badRequest('Choose a dish to add.');
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
    throw badRequest('Quantity must be between 1 and 99.');
  }

  const { rows } = await query('SELECT id, name, is_available FROM menu_items WHERE id = $1', [
    menuItemId,
  ]);
  if (!rows[0]) throw notFound('That dish is no longer on the menu.');
  if (!rows[0].is_available) throw badRequest(`"${rows[0].name}" is currently unavailable.`);

  const customOptions = input.customOptions ?? input.custom_options ?? [];
  const specialInstructions =
    input.specialInstructions ?? input.special_instructions ?? null;

  await withTransaction(async (client) => {
    // Merge identical lines (same dish and same options).
    const { rows: existing } = await client.query(
      `SELECT id, quantity FROM cart_items
        WHERE cart_id = $1 AND menu_item_id = $2
          AND custom_options = $3::jsonb
          AND COALESCE(special_instructions, '') = COALESCE($4, '')`,
      [cartId, menuItemId, JSON.stringify(customOptions), specialInstructions]
    );

    if (existing[0]) {
      await client.query('UPDATE cart_items SET quantity = quantity + $2 WHERE id = $1', [
        existing[0].id,
        quantity,
      ]);
    } else {
      await client.query(
        `INSERT INTO cart_items (cart_id, menu_item_id, quantity, custom_options, special_instructions)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [cartId, menuItemId, quantity, JSON.stringify(customOptions), specialInstructions]
      );
    }
  });

  return { cartId, guestToken: resolved.guestToken };
}

export async function updateCartItem({ user, guestToken }, itemId, input) {
  const resolved = await resolveCartId({ user, guestToken });
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) throw badRequest('Invalid quantity.');

  const { rows } = await query('SELECT id FROM cart_items WHERE id = $1 AND cart_id = $2', [
    itemId,
    resolved.id,
  ]);
  if (!rows[0]) throw notFound('That item is not in your cart.');

  if (quantity === 0) {
    await query('DELETE FROM cart_items WHERE id = $1', [itemId]);
    return;
  }
  if (quantity > 99) throw badRequest('Quantity must be between 1 and 99.');

  await query('UPDATE cart_items SET quantity = $2 WHERE id = $1', [itemId, quantity]);
}

export async function removeCartItem({ user, guestToken }, itemId) {
  const resolved = await resolveCartId({ user, guestToken });
  const { rowCount } = await query('DELETE FROM cart_items WHERE id = $1 AND cart_id = $2', [
    itemId,
    resolved.id,
  ]);
  if (!rowCount) throw notFound('That item is not in your cart.');
}

export async function clearCart({ user, guestToken }) {
  const resolved = await resolveCartId({ user, guestToken });
  await query('DELETE FROM cart_items WHERE cart_id = $1', [resolved.id]);
}

export { GUEST_CART_COOKIE };
export default {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeGuestCartIntoUser,
};
