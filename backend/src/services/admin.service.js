import { query } from '../config/db.js';
import { toDecimal, toMinor } from '../utils/money.js';

/**
 * Administration reporting.
 *
 * Every figure comes from the database. Revenue is reported three ways so
 * an operator can see the difference between money that was booked and money
 * that was actually collected - a distinction the original dashboard could
 * not make because it had no payment state at all (audit finding P1-07).
 */

const CANCELLED = `'cancelled'`;

export async function dashboardStats() {
  const { rows } = await query(`
    SELECT
      (SELECT count(*)::int FROM orders)                                  AS total_orders,
      (SELECT count(*)::int FROM orders WHERE status = 'placed')           AS pending_orders,
      (SELECT count(*)::int FROM orders WHERE status = 'confirmed')        AS confirmed_orders,
      (SELECT count(*)::int FROM orders WHERE status = 'preparing')        AS preparing_orders,
      (SELECT count(*)::int FROM orders WHERE status = 'ready')            AS ready_orders,
      (SELECT count(*)::int FROM orders WHERE status = 'out_for_delivery') AS out_for_delivery_orders,
      (SELECT count(*)::int FROM orders WHERE status = 'delivered')        AS delivered_orders,
      (SELECT count(*)::int FROM orders WHERE status = 'cancelled')        AS cancelled_orders,
      (SELECT count(*)::int FROM users)                                    AS total_users,
      (SELECT count(*)::int FROM users WHERE role = 'customer')            AS total_customers,
      (SELECT count(*)::int FROM menu_items)                               AS total_menu_items,
      (SELECT count(*)::int FROM menu_items WHERE is_available)           AS available_menu_items,
      (SELECT COALESCE(sum(total), 0) FROM orders WHERE status <> ${CANCELLED})  AS booked_revenue,
      (SELECT COALESCE(sum(total), 0) FROM orders
        WHERE status <> ${CANCELLED} AND payment_status = 'paid')           AS collected_revenue,
      (SELECT COALESCE(sum(total), 0) FROM orders
        WHERE status <> ${CANCELLED}
          AND payment_status IN ('pending','pending_cod','authorized'))    AS outstanding_revenue,
      (SELECT COALESCE(sum(discount), 0) FROM orders WHERE status <> ${CANCELLED}) AS total_discounts,
      (SELECT COALESCE(sum(total), 0) FROM orders
        WHERE status <> ${CANCELLED} AND created_at >= date_trunc('day', now())) AS today_revenue
  `);

  const s = rows[0];
  const num = (v) => Number(v || 0);

  return {
    totalOrders: num(s.total_orders),
    pendingOrders: num(s.pending_orders),
    confirmedOrders: num(s.confirmed_orders),
    preparingOrders: num(s.preparing_orders),
    readyOrders: num(s.ready_orders),
    outForDeliveryOrders: num(s.out_for_delivery_orders),
    deliveredOrders: num(s.delivered_orders),
    cancelledOrders: num(s.cancelled_orders),
    totalUsers: num(s.total_users),
    totalCustomers: num(s.total_customers),
    totalMenuItems: num(s.total_menu_items),
    availableMenuItems: num(s.available_menu_items),
    totalRevenue: num(s.booked_revenue),
    collectedRevenue: num(s.collected_revenue),
    outstandingRevenue: num(s.outstanding_revenue),
    totalDiscounts: num(s.total_discounts),
    todayRevenue: num(s.today_revenue),
  };
}

/**
 * Sales reporting.
 *
 * `net_sales` is the revenue actually booked (total = subtotal + delivery fee
 * - discount). The collected figure is reported separately.
 */
export async function salesData({ startDate, endDate } = {}) {
  const params = [];
  const where = [`status <> ${CANCELLED}`];
  if (startDate) {
    params.push(startDate);
    where.push(`created_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    where.push(`created_at < ($${params.length}::date + interval '1 day')`);
  }
  const whereSql = where.join(' AND ');

  const [daily, popular, payments] = await Promise.all([
    query(
      `SELECT date_trunc('day', created_at)::date AS day,
              count(*)::int                                  AS order_count,
              COALESCE(sum(subtotal), 0)                    AS gross_sales,
              COALESCE(sum(discount), 0)                    AS total_discounts,
              COALESCE(sum(delivery_fee), 0)                AS delivery_fees,
              COALESCE(sum(total), 0)                       AS net_sales,
              COALESCE(sum(total) FILTER (WHERE payment_status = 'paid'), 0) AS collected_sales,
              COALESCE(avg(total), 0)                       AS avg_order_value
         FROM orders
        WHERE ${whereSql}
        GROUP BY 1
        ORDER BY 1 DESC`,
      params
    ),
    query(
      `SELECT oi.name,
              sum(oi.quantity)::int                AS total_quantity,
              sum(oi.price * oi.quantity)          AS total_revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE ${whereSql.replace(/status/g, 'o.status').replace(/created_at/g, 'o.created_at')}
        GROUP BY oi.name
        ORDER BY total_quantity DESC, total_revenue DESC
        LIMIT 20`,
      params
    ),
    query(
      `SELECT payment_method,
              payment_status,
              count(*)::int            AS count,
              COALESCE(sum(total), 0)  AS total
         FROM orders
        WHERE ${whereSql}
        GROUP BY payment_method, payment_status
        ORDER BY count DESC`,
      params
    ),
  ]);

  return {
    salesStats: daily.rows.map((r) => ({
      date: r.day,
      order_count: r.order_count,
      gross_sales: toDecimal(toMinor(r.gross_sales)),
      total_discounts: toDecimal(toMinor(r.total_discounts)),
      delivery_fees: toDecimal(toMinor(r.delivery_fees)),
      net_sales: toDecimal(toMinor(r.net_sales)),
      collected_sales: toDecimal(toMinor(r.collected_sales)),
      avg_order_value: toDecimal(toMinor(Math.round(Number(r.avg_order_value || 0) * 100))),
    })),
    popularItems: popular.rows.map((r) => ({
      name: r.name,
      total_quantity: r.total_quantity,
      total_revenue: toDecimal(toMinor(r.total_revenue)),
    })),
    paymentBreakdown: payments.rows.map((r) => ({
      payment_method: r.payment_method,
      payment_status: r.payment_status,
      count: r.count,
      total: toDecimal(toMinor(r.total)),
    })),
  };
}

/** The same figures as `salesData`, rendered as CSV. */
export async function salesCsv({ startDate, endDate } = {}) {
  const data = await salesData({ startDate, endDate });

  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [];
  lines.push('Date,Orders,Gross Sales (GHS),Discounts (GHS),Delivery Fees (GHS),Net Sales (GHS),Collected (GHS),Avg Order Value (GHS)');
  for (const row of data.salesStats) {
    lines.push(
      [
        escape(row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date),
        row.order_count,
        row.gross_sales,
        row.total_discounts,
        row.delivery_fees,
        row.net_sales,
        row.collected_sales,
        row.avg_order_value,
      ].join(',')
    );
  }

  lines.push('');
  lines.push('Popular Items');
  lines.push('Item,Quantity Sold,Revenue (GHS)');
  for (const item of data.popularItems) {
    lines.push([escape(item.name), item.total_quantity, item.total_revenue].join(','));
  }

  lines.push('');
  lines.push('Payment Methods');
  lines.push('Method,Payment Status,Orders,Total (GHS)');
  for (const row of data.paymentBreakdown) {
    lines.push(
      [
        escape(row.payment_method),
        escape(row.payment_status),
        row.count,
        row.total,
      ].join(',')
    );
  }

  const totals = data.salesStats.reduce(
    (acc, r) => ({
      orders: acc.orders + r.order_count,
      net: acc.net + Number(r.net_sales),
      collected: acc.collected + Number(r.collected_sales),
    }),
    { orders: 0, net: 0, collected: 0 }
  );

  lines.push('');
  lines.push('Summary');
  lines.push(`Total Orders,${totals.orders}`);
  lines.push(`Total Revenue (GHS),${totals.net.toFixed(2)}`);
  lines.push(`Total Collected (GHS),${totals.collected.toFixed(2)}`);

  return lines.join('\n');
}

export async function listUsers({ page = 1, limit = 25, search } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const params = [];
  const where = [];
  if (search) {
    params.push(`%${String(search).trim()}%`);
    where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(safeLimit);
  const limitParam = params.length;
  params.push(offset);

  const { rows } = await query(
    `SELECT id, name, email, phone, address, role, email_verified, is_active, created_at, updated_at,
            (SELECT count(*)::int FROM orders o WHERE o.user_id = users.id) AS order_count,
            (SELECT COALESCE(sum(total), 0) FROM orders o
              WHERE o.user_id = users.id AND o.status <> 'cancelled') AS lifetime_value
       FROM users
       ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${limitParam} OFFSET $${params.length}`,
    params
  );

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS total FROM users ${whereSql}`,
    params.slice(0, params.length - 2)
  );

  const total = countRows[0]?.total || 0;
  return {
    users: rows.map((u) => ({ ...u, lifetime_value: toDecimal(toMinor(u.lifetime_value)) })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function setUserRole(userId, role) {
  if (!['customer', 'admin'].includes(role)) {
    throw new Error('Invalid role.');
  }
  const { rows } = await query(
    'UPDATE users SET role = $2 WHERE id = $1 RETURNING id, name, email, role',
    [userId, role]
  );
  return rows[0] || null;
}

export async function setUserActive(userId, isActive) {
  const { rows } = await query(
    'UPDATE users SET is_active = $2 WHERE id = $1 RETURNING id, name, email, role, is_active',
    [userId, Boolean(isActive)]
  );
  return rows[0] || null;
}

export default {
  dashboardStats,
  salesData,
  salesCsv,
  listUsers,
  setUserRole,
  setUserActive,
};
