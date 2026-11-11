import { query, withTransaction } from '../config/db.js';
import { badRequest, notFound, conflict } from '../utils/errors.js';

const PROMO_COLUMNS = `
  id, code, discount_type, discount_value, min_order, max_discount,
  max_uses, used_count, is_active, expires_at, created_at, updated_at
`;

export async function listPromos({ includeInactive = false } = {}) {
  const { rows } = await query(
    `SELECT ${PROMO_COLUMNS} FROM promos
      ${includeInactive ? '' : 'WHERE is_active = true'}
      ORDER BY created_at DESC`
  );
  return rows;
}

export async function getPromo(id) {
  const { rows } = await query(`SELECT ${PROMO_COLUMNS} FROM promos WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound('Promo code not found.');
  return rows[0];
}

export async function findByCode(code) {
  const { rows } = await query(
    `SELECT ${PROMO_COLUMNS} FROM promos WHERE upper(code) = upper($1) LIMIT 1`,
    [String(code || '').trim()]
  );
  return rows[0] || null;
}

export async function createPromo(input, client = { query }) {
  const code = String(input.code || '').trim().toUpperCase();
  if (!code) throw badRequest('Give the promo code a name.');
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw badRequest('Use 3–32 characters: letters, numbers, dash or underscore.');
  }

  const discountType = input.discountType ?? input.discount_type ?? 'percentage';
  if (!['percentage', 'fixed'].includes(discountType)) {
    throw badRequest('Discount type must be "percentage" or "fixed".');
  }

  const discountValue = Number(input.discountValue ?? input.discount_value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw badRequest('Enter a discount value greater than zero.');
  }
  if (discountType === 'percentage' && discountValue > 100) {
    throw badRequest('A percentage discount cannot exceed 100%.');
  }

  const existing = await client.query('SELECT id FROM promos WHERE upper(code) = $1', [code]);
  if (existing.rowCount) throw conflict('A promo code with that name already exists.');

  const { rows } = await client.query(
    `INSERT INTO promos
       (code, discount_type, discount_value, min_order, max_discount, max_uses, is_active, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      code,
      discountType,
      discountValue.toFixed(2),
      Number(input.minOrder ?? input.min_order ?? 0).toFixed(2),
      input.maxDiscount ?? input.max_discount ?? null,
      input.maxUses ?? input.max_uses ?? null,
      input.isActive ?? input.is_active ?? true,
      input.expiresAt ?? input.expires_at ?? null,
    ]
  );
  return rows[0].id;
}

export async function updatePromo(id, input, client = { query }) {
  const { rows } = await client.query('SELECT id FROM promos WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Promo code not found.');

  const sets = [];
  const params = [id];
  const set = (column, value) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.code !== undefined) {
    const code = String(input.code).trim().toUpperCase();
    if (!code) throw badRequest('Give the promo code a name.');
    set('code', code);
  }
  if (input.discountType !== undefined || input.discount_type !== undefined) {
    set('discount_type', input.discountType ?? input.discount_type);
  }
  if (input.discountValue !== undefined || input.discount_value !== undefined) {
    const v = Number(input.discountValue ?? input.discount_value);
    if (!Number.isFinite(v) || v <= 0) throw badRequest('Enter a discount value greater than zero.');
    set('discount_value', v.toFixed(2));
  }
  if (input.minOrder !== undefined || input.min_order !== undefined) {
    set('min_order', Number(input.minOrder ?? input.min_order ?? 0).toFixed(2));
  }
  if (input.maxDiscount !== undefined || input.max_discount !== undefined) {
    set('max_discount', input.maxDiscount ?? input.max_discount ?? null);
  }
  if (input.maxUses !== undefined || input.max_uses !== undefined) {
    set('max_uses', input.maxUses ?? input.max_uses ?? null);
  }
  if (input.isActive !== undefined || input.is_active !== undefined) {
    set('is_active', Boolean(input.isActive ?? input.is_active));
  }
  if (input.expiresAt !== undefined || input.expires_at !== undefined) {
    set('expires_at', input.expiresAt ?? input.expires_at ?? null);
  }

  if (!sets.length) throw badRequest('Nothing to update.');
  await client.query(`UPDATE promos SET ${sets.join(', ')} WHERE id = $1`, params);
  return id;
}

export async function deletePromo(id, client = { query }) {
  const { rows } = await client.query('SELECT id FROM promos WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Promo code not found.');
  await client.query('DELETE FROM promos WHERE id = $1', [id]);
}

/** Increment the usage counter when a promo is actually redeemed. */
export async function consumePromo(client, promoId) {
  if (!promoId) return;
  await client.query(
    `UPDATE promos SET used_count = used_count + 1
      WHERE id = $1 AND (max_uses IS NULL OR used_count < max_uses)`,
    [promoId]
  );
}

/**
 * Validate a promo code against a subtotal without creating an order.
 * The discount is computed by the server from the database (P1-09).
 */
export async function validatePromo(code, subtotal) {
  const { resolvePromo } = await import('./pricing.service.js');
  const { discountMinor, promo } = await resolvePromo(
    { query },
    code,
    Math.round(Number(subtotal || 0) * 100)
  );
  return {
    valid: true,
    code: promo.code,
    discount: (discountMinor / 100).toFixed(2),
    discount_type: promo.discount_type,
  };
}

export default {
  listPromos,
  getPromo,
  findByCode,
  createPromo,
  updatePromo,
  deletePromo,
  consumePromo,
  validatePromo,
};
