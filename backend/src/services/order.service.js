import crypto from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { badRequest, forbidden, notFound, conflict, unprocessable } from '../utils/errors.js';
import { buildQuote } from './pricing.service.js';
import { consumePromo } from './promo.service.js';
import { toDecimal, toMinor } from '../utils/money.js';

/**
 * The order lifecycle.
 *
 * The original API accepted any status transition (audit finding P1-06): a
 * delivered order could be moved back to "placed", rewriting delivery
 * history. Transitions are now explicit and validated.
 */
export const ORDER_STATUS_FLOW = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
];

const ALLOWED_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/** Statuses from which a customer may still cancel their own order. */
export const CUSTOMER_CANCELLABLE = ['placed', 'confirmed'];

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

const ORDER_COLUMNS = `
  o.id, o.user_id, o.status, o.subtotal, o.delivery_fee, o.discount, o.total,
  o.promo_code_id, o.promo_code, o.delivery_address, o.delivery_notes, o.customer_phone,
  o.fulfilment_type, o.payment_method, o.payment_status, o.payment_provider,
  o.payment_reference, o.payment_channel, o.paid_at, o.refunded_at,
  o.estimated_delivery, o.cancellation_reason, o.created_at, o.updated_at
`;

/** The same columns without the "o." alias - for INSERT ... RETURNING. */
const ORDER_RETURNING = `
  id, user_id, status, subtotal, delivery_fee, discount, total,
  promo_code_id, promo_code, delivery_address, delivery_notes, customer_phone,
  fulfilment_type, payment_method, payment_status, payment_provider,
  payment_reference, payment_channel, paid_at, refunded_at,
  estimated_delivery, cancellation_reason, created_at, updated_at
`;

async function attachItems(client, orders) {
  if (!orders.length) return orders;
  const ids = orders.map((o) => o.id);
  const { rows } = await client.query(
    `SELECT id, order_id, menu_item_id, name, quantity, price, custom_options,
            special_instructions, created_at
       FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id`,
    [ids]
  );
  const byOrder = new Map();
  for (const row of rows) {
    if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, []);
    byOrder.get(row.order_id).push(row);
  }
  for (const order of orders) order.items = byOrder.get(order.id) || [];
  return orders;
}

/**
 * Create an order.
 *
 * Every price is recomputed from `menu_items` inside the transaction. The
 * client's price and name are never read (audit finding P0-03).
 */
export async function createOrder(user, input, { idempotencyKey } = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) throw badRequest('Your cart is empty.');

  const deliveryAddress = String(input.deliveryAddress ?? input.delivery_address ?? '').trim();
  if (!deliveryAddress) throw badRequest('Enter a delivery address.');
  if (deliveryAddress.length > 400) throw badRequest('That delivery address is too long.');

  const customerPhone =
    String(input.customerPhone ?? input.customer_phone ?? input.phone ?? user.phone ?? '').trim();
  if (!customerPhone) throw badRequest('Enter a phone number we can reach you on.');

  const paymentMethod = String(input.paymentMethod ?? input.payment_method ?? '').trim();
  if (!paymentMethod) throw badRequest('Choose a payment method.');

  const fulfilmentType = String(input.fulfilmentType ?? input.fulfilment_type ?? 'delivery');
  if (!['delivery', 'pickup'].includes(fulfilmentType)) {
    throw badRequest('Choose delivery or pickup.');
  }

  // Idempotency: the same key returns the same order instead of creating a
  // duplicate (the brief requires duplicate-submission protection).
  if (idempotencyKey) {
    const { rows } = await query('SELECT id FROM orders WHERE idempotency_key = $1', [
      idempotencyKey,
    ]);
    if (rows[0]) {
      const existing = await getOrderForUser(rows[0].id, user);
      return { ...existing, deduplicated: true };
    }
  }

  const result = await withTransaction(async (client) => {
    const quote = await buildQuote(client, items, {
      promoCode: input.promoCode ?? input.promo_code ?? null,
    });

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (user_id, status, subtotal, delivery_fee, discount, total,
          promo_code_id, promo_code, delivery_address, delivery_notes, customer_phone,
          fulfilment_type, payment_method, payment_status, idempotency_key, estimated_delivery)
       VALUES ($1, 'placed', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               now() + interval '45 minutes')
       RETURNING ${ORDER_RETURNING}`,
      [
        user.id,
        quote.subtotal,
        quote.delivery_fee,
        quote.discount,
        quote.total,
        quote.promo?.id ?? null,
        quote.promo?.code ?? null,
        deliveryAddress,
        input.deliveryNotes ?? input.delivery_notes ?? null,
        customerPhone,
        fulfilmentType,
        paymentMethod,
        paymentMethod === 'cash' ? 'pending_cod' : 'pending',
        idempotencyKey ?? null,
      ]
    );

    const order = orderRows[0];

    for (const line of quote.items) {
      await client.query(
        `INSERT INTO order_items
           (order_id, menu_item_id, name, quantity, price, custom_options, special_instructions)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [
          order.id,
          line.menu_item_id,
          line.name,
          line.quantity,
          line.unit_price,
          JSON.stringify(line.custom_options || []),
          line.special_instructions ?? null,
        ]
      );

      // Decrement stock where it is tracked.
      await client.query(
        `UPDATE menu_items
            SET stock_quantity = stock_quantity - $2
          WHERE id = $1 AND stock_quantity > 0`,
        [line.menu_item_id, line.quantity]
      );
    }

    await client.query(
      `INSERT INTO order_status_history (order_id, status, note) VALUES ($1, 'placed', $2)`,
      [order.id, 'Order placed successfully']
    );

    if (quote.promo) await consumePromo(client, quote.promo.id);

    await attachItems(client, [order]);
    return order;
  });

  return result;
}

/**
 * Load an order, enforcing ownership.
 *
 * The original `GET /api/orders/:id` had no ownership check (audit finding
 * P0-04): any signed-in customer could read any other customer's order,
 * including the delivery address and phone number.
 */
export async function getOrderForUser(orderId, user) {
  const id = Number(orderId);
  if (!Number.isFinite(id)) throw badRequest('Invalid order reference.');

  const { rows } = await query(
    `SELECT ${ORDER_COLUMNS},
            u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.id = $1`,
    [id]
  );
  const order = rows[0];
  if (!order) throw notFound('Order not found.');

  const isOwner = order.user_id === user.id;
  const isAdmin = user.role === 'admin';
  if (!isOwner && !isAdmin) {
    // 404 rather than 403 so the response does not confirm the order exists.
    throw notFound('Order not found.');
  }

  await attachItems({ query }, [order]);

  const { rows: history } = await query(
    `SELECT id, status, note, created_at FROM order_status_history
      WHERE order_id = $1 ORDER BY created_at ASC, id ASC`,
    [id]
  );
  order.status_history = history;

  return order;
}

export async function listMyOrders(userId, { page = 1, limit = 10, status } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const params = [userId];
  let statusSql = '';
  if (status) {
    params.push(status);
    statusSql = `AND o.status = $${params.length}`;
  }

  const { rows } = await query(
    `SELECT ${ORDER_COLUMNS},
            (SELECT count(*)::int FROM orders o2 WHERE o2.user_id = o.user_id ${statusSql}) AS total_count
       FROM orders o
      WHERE o.user_id = $1 ${statusSql}
      ORDER BY o.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, safeLimit, offset]
  );

  const total = rows.length ? Number(rows[0].total_count) : 0;
  const orders = rows.map(({ total_count: _omit, ...row }) => row);
  await attachItems({ query }, orders);

  return {
    orders,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function listAllOrders({ page = 1, limit = 20, status, search } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const params = [];
  const where = [];
  if (status) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${String(search).trim()}%`);
    where.push(
      `(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR o.delivery_address ILIKE $${params.length} OR o.id::text = $${params.length})`
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(safeLimit);
  const limitParam = params.length;
  params.push(offset);

  const { rows } = await query(
    `SELECT ${ORDER_COLUMNS},
            u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
            (SELECT count(*)::int FROM orders o2 JOIN users u2 ON u2.id = o2.user_id ${whereSql}) AS total_count
       FROM orders o JOIN users u ON u.id = o.user_id
       ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT $${limitParam} OFFSET $${params.length}`,
    params
  );

  const total = rows.length ? Number(rows[0].total_count) : 0;
  const orders = rows.map(({ total_count: _omit, ...row }) => row);
  await attachItems({ query }, orders);

  return {
    orders,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function updateOrderStatus(orderId, nextStatus, { note, actor } = {}) {
  const id = Number(orderId);
  if (!Number.isFinite(id)) throw badRequest('Invalid order reference.');

  if (!ORDER_STATUS_FLOW.includes(nextStatus) && nextStatus !== 'cancelled') {
    throw badRequest('That order status is not recognised.');
  }

  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT id, status FROM orders WHERE id = $1 FOR UPDATE', [id]);
    const order = rows[0];
    if (!order) throw notFound('Order not found.');

    if (order.status === nextStatus) {
      return { id: order.id, status: order.status, unchanged: true };
    }

    if (!canTransition(order.status, nextStatus)) {
      throw conflict(
        `An order that is "${order.status.replace('_', ' ')}" cannot be moved to "${nextStatus.replace('_', ' ')}".`
      );
    }

    await client.query('UPDATE orders SET status = $2 WHERE id = $1', [id, nextStatus]);
    await client.query(
      `INSERT INTO order_status_history (order_id, status, note) VALUES ($1, $2, $3)`,
      [id, nextStatus, note || `Status updated to ${nextStatus.replace('_', ' ')}`]
    );

    return { id, status: nextStatus, previousStatus: order.status, updatedBy: actor?.id ?? null };
  });
}

export async function cancelOrder(orderId, user, { reason } = {}) {
  const id = Number(orderId);
  if (!Number.isFinite(id)) throw badRequest('Invalid order reference.');

  const { rows } = await query('SELECT id, user_id, status FROM orders WHERE id = $1', [id]);
  const order = rows[0];
  if (!order) throw notFound('Order not found.');

  const isAdmin = user.role === 'admin';
  if (order.user_id !== user.id && !isAdmin) {
    throw notFound('Order not found.');
  }
  if (!CUSTOMER_CANCELLABLE.includes(order.status) && !isAdmin) {
    throw unprocessable(
      `An order that is already "${order.status.replace('_', ' ')}" can no longer be cancelled.`
    );
  }
  if (!canTransition(order.status, 'cancelled')) {
    throw unprocessable('This order can no longer be cancelled.');
  }

  return withTransaction(async (client) => {
    await client.query(
      'UPDATE orders SET status = $2, cancellation_reason = $3 WHERE id = $1',
      [id, 'cancelled', reason ? String(reason).slice(0, 300) : null]
    );
    await client.query(
      `INSERT INTO order_status_history (order_id, status, note) VALUES ($1, 'cancelled', $2)`,
      [id, reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer']
    );
    // Return the reserved stock.
    await client.query(
      `UPDATE menu_items mi SET stock_quantity = mi.stock_quantity + oi.quantity
         FROM order_items oi
        WHERE oi.order_id = $1 AND oi.menu_item_id = mi.id`,
      [id]
    );
    return { id, status: 'cancelled' };
  });
}

/** Generate an idempotency key for a checkout attempt. */
export const newIdempotencyKey = () => crypto.randomUUID();

export default {
  createOrder,
  getOrderForUser,
  listMyOrders,
  listAllOrders,
  updateOrderStatus,
  cancelOrder,
  canTransition,
  CUSTOMER_CANCELLABLE,
  ORDER_STATUS_FLOW,
};
