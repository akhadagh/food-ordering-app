import { toMinor, toDecimal, applyPercentage, roundMinor } from '../utils/money.js';
import { env } from '../config/env.js';
import { badRequest, unprocessable } from '../utils/errors.js';

/**
 * PRICING IS THE SERVER'S SOLE AUTHORITY.
 *
 * The original implementation trusted `price` and `name` sent by the browser
 * (audit finding P0-03): a client could order a GH 555.00 dish for GH 0.01
 * and every revenue figure in the admin reports followed. Nothing in this
 * module ever reads a price from the request.
 */

/** Load the menu rows needed to price a set of cart lines. */
export async function loadPricedItems(client, menuItemIds) {
  const ids = [...new Set(menuItemIds.map(Number).filter(Number.isFinite))];
  if (!ids.length) return new Map();

  const { rows } = await client.query(
    `SELECT id, name, slug, price, image_url, is_available, stock_quantity, custom_options
       FROM menu_items
      WHERE id = ANY($1::int[])`,
    [ids]
  );

  const map = new Map();
  for (const row of rows) map.set(row.id, row);
  return map;
}

/**
 * Validate the customisation options a client chose against the options the
 * menu item actually defines. Unknown options, invalid values and
 * disallowed option groups are rejected.
 *
 * Returns the resolved option list with its price deltas.
 */
export function resolveCustomOptions(menuItem, requested) {
  const definitions = Array.isArray(menuItem.custom_options) ? menuItem.custom_options : [];
  if (!definitions.length) {
    if (Array.isArray(requested) && requested.length) {
      throw badRequest(`"${menuItem.name}" does not offer any customisation options.`);
    }
    return [];
  }

  const chosen = new Map();
  for (const entry of Array.isArray(requested) ? requested : []) {
    if (!entry || typeof entry !== 'object') continue;
    const name = String(entry.option ?? entry.name ?? '').trim();
    const value = String(entry.value ?? '').trim();
    if (!name || !value) continue;
    chosen.set(name, value);
  }

  const resolved = [];
  for (const definition of definitions) {
    const groupName = String(definition.name || '').trim();
    if (!groupName) continue;

    const options = Array.isArray(definition.options) ? definition.options : [];
    const picked = chosen.get(groupName);

    if (!picked) {
      if (definition.required) {
        throw unprocessable(`Please choose an option for "${groupName}".`, {
          option: groupName,
        });
      }
      continue;
    }

    const match = options.find(
      (o) => String(o.label ?? o.value ?? '').trim().toLowerCase() === picked.toLowerCase()
    );
    if (!match) {
      throw unprocessable(`"${picked}" is not available for "${groupName}".`, { option: groupName });
    }

    resolved.push({
      option: groupName,
      value: String(match.label ?? match.value),
      price_delta: toDecimal(toMinor(match.price_delta ?? 0)),
    });
  }

  // Reject options the item does not define - a client cannot invent a
  // discount by naming its own option.
  for (const name of chosen.keys()) {
    const known = definitions.some((d) => String(d.name || '').trim() === name);
    if (!known) {
      throw unprocessable(`Unknown option "${name}".`, { option: name });
    }
  }

  return resolved;
}

/** The delivery fee for a given subtotal, honouring a free-delivery threshold. */
export function deliveryFeeFor(subtotalMinor) {
  const fee = toMinor(env.deliveryFee);
  if (env.freeDeliveryThreshold > 0 && subtotalMinor >= toMinor(env.freeDeliveryThreshold)) {
    return 0;
  }
  return fee;
}

/**
 * Price a set of cart lines.
 *
 * lines: [{ menuItemId, quantity, customOptions, specialInstructions }]
 *
 * Returns a price breakdown in integer minor units plus the resolved lines.
 */
export async function priceCart(client, lines, { promoCode = null } = {}) {
  if (!Array.isArray(lines) || !lines.length) {
    throw badRequest('Your cart is empty.');
  }

  const priced = [];

  for (const line of lines) {
    const menuItemId = Number(line.menuItemId ?? line.menu_item_id ?? line.id);
    const quantity = Number(line.quantity);

    if (!Number.isFinite(menuItemId)) throw badRequest('Each cart item needs a menu item.');
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      throw badRequest('Item quantity must be between 1 and 99.');
    }

    const items = await loadPricedItems(client, [menuItemId]);
    const menuItem = items.get(menuItemId);
    if (!menuItem) throw badRequest('One of the items in your cart is no longer available.');
    if (!menuItem.is_available) {
      throw unprocessable(`"${menuItem.name}" is currently unavailable.`);
    }
    if (menuItem.stock_quantity > 0 && menuItem.stock_quantity < quantity) {
      throw unprocessable(
        `Only ${menuItem.stock_quantity} × "${menuItem.name}" left in stock.`
      );
    }

    const options = resolveCustomOptions(menuItem, line.customOptions ?? line.custom_options);
    const optionsDelta = options.reduce((sum, o) => sum + toMinor(o.price_delta), 0);
    const unitMinor = toMinor(menuItem.price) + optionsDelta;

    priced.push({
      menuItemId,
      name: menuItem.name,
      image_url: menuItem.image_url,
      basePrice: toDecimal(toMinor(menuItem.price)),
      unitPrice: toDecimal(unitMinor),
      quantity,
      lineTotal: toDecimal(unitMinor * quantity),
      customOptions: options,
      specialInstructions:
        typeof (line.specialInstructions ?? line.special_instructions) === 'string'
          ? (line.specialInstructions ?? line.special_instructions).slice(0, 500)
          : null,
      stockQuantity: menuItem.stock_quantity,
    });
  }

  const subtotalMinor = priced.reduce(
    (sum, l) => sum + toMinor(l.unitPrice) * l.quantity,
    0
  );

  return { lines: priced, subtotalMinor };
}

/**
 * Apply a promo code to a subtotal. Returns the discount in minor units.
 * The promo is looked up and validated against the DATABASE - the client can
 * never state its own discount (audit finding P1-09).
 */
export async function resolvePromo(client, code, subtotalMinor) {
  if (!code || !String(code).trim()) {
    return { discountMinor: 0, promo: null };
  }

  const { rows } = await client.query(
    `SELECT id, code, discount_type, discount_value, min_order, max_discount, max_uses, used_count, is_active, expires_at
       FROM promos
      WHERE upper(code) = upper($1)
      LIMIT 1`,
    [String(code).trim()]
  );

  const promo = rows[0];
  if (!promo) throw unprocessable('That promo code is not valid.');
  if (!promo.is_active) throw unprocessable('That promo code is no longer active.');
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    throw unprocessable('That promo code has expired.');
  }
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    throw unprocessable('That promo code has reached its usage limit.');
  }
  if (subtotalMinor < toMinor(promo.min_order)) {
    throw unprocessable(
      `That promo code requires a minimum order of GH₵ ${toDecimal(toMinor(promo.min_order))}.`
    );
  }

  let discountMinor =
    promo.discount_type === 'percentage'
      ? // A percentage is a percentage, not a money amount: passing it
        // through the minor-unit conversion turned a 10% code into a 100%
        // code, which took the whole meal off the bill.
        applyPercentage(subtotalMinor, Number(promo.discount_value))
      : toMinor(promo.discount_value);

  if (promo.max_discount !== null) {
    discountMinor = Math.min(discountMinor, toMinor(promo.max_discount));
  }
  // A discount can never exceed the subtotal.
  discountMinor = Math.max(0, Math.min(discountMinor, subtotalMinor));

  return { discountMinor, promo };
}

/**
 * Full quote for a cart. This is the ONLY function that produces a total,
 * and every number in it is derived from the database.
 */
export async function buildQuote(client, lines, { promoCode = null } = {}) {
  const { lines: priced, subtotalMinor } = await priceCart(client, lines);
  const { discountMinor, promo } = await resolvePromo(client, promoCode, subtotalMinor);
  const deliveryMinor = deliveryFeeFor(subtotalMinor);
  const totalMinor = Math.max(0, subtotalMinor - discountMinor) + deliveryMinor;

  return {
    items: priced.map((l) => ({
      menu_item_id: l.menuItemId,
      name: l.name,
      image_url: l.image_url,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      line_total: l.lineTotal,
      custom_options: l.customOptions,
      special_instructions: l.specialInstructions,
    })),
    subtotal: toDecimal(subtotalMinor),
    delivery_fee: toDecimal(deliveryMinor),
    discount: toDecimal(discountMinor),
    total: toDecimal(totalMinor),
    promo: promo ? { id: promo.id, code: promo.code } : null,
    _minor: { subtotal: subtotalMinor, delivery: deliveryMinor, discount: discountMinor, total: totalMinor },
  };
}

export { roundMinor };
export default { buildQuote, priceCart, resolvePromo, resolveCustomOptions, deliveryFeeFor };
