import { query } from '../config/db.js';
import { badRequest, notFound } from '../utils/errors.js';

const ITEM_COLUMNS = `
  mi.id, mi.category_id, mi.name, mi.slug, mi.description, mi.price, mi.image_url,
  mi.is_available, mi.is_featured, mi.stock_quantity, mi.custom_options,
  mi.created_at, mi.updated_at,
  c.name AS category_name, c.slug AS category_slug
`;

/**
 * List menu items.
 *
 * The original API ignored the `search` parameter entirely (audit finding
 * P1-04) - `?search=zzzznotfound` returned the whole menu. Search is now
 * bound into a parameterised ILIKE query.
 */
export async function listItems({
  search = '',
  categoryId = null,
  categorySlug = '',
  featured = null,
  available = null,
  limit = 60,
  offset = 0,
} = {}) {
  const params = [];
  const where = [];

  const term = String(search || '').trim();
  if (term) {
    params.push(`%${term}%`);
    where.push(`(mi.name ILIKE $${params.length} OR mi.description ILIKE $${params.length})`);
  }

  if (categoryId) {
    params.push(Number(categoryId));
    where.push(`mi.category_id = $${params.length}`);
  }

  if (categorySlug) {
    params.push(String(categorySlug));
    where.push(`c.slug = $${params.length}`);
  }

  if (featured !== null && featured !== undefined) {
    params.push(Boolean(featured));
    where.push(`mi.is_featured = $${params.length}`);
  }

  if (available !== null && available !== undefined) {
    params.push(Boolean(available));
    where.push(`mi.is_available = $${params.length}`);
  }

  params.push(Math.min(Number(limit) || 60, 200));
  const limitParam = params.length;
  params.push(Math.max(Number(offset) || 0, 0));

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT ${ITEM_COLUMNS},
            (SELECT count(*)::int FROM menu_items) AS total_count
       FROM menu_items mi
       LEFT JOIN categories c ON c.id = mi.category_id
       ${whereSql}
      ORDER BY mi.is_featured DESC, c.sort_order NULLS LAST, mi.name ASC
      LIMIT $${limitParam} OFFSET $${params.length}`,
    params
  );

  const total = rows.length ? Number(rows[0].total_count) : 0;
  return {
    items: rows.map(({ total_count: _omit, ...row }) => row),
    total,
    limit: Number(limit) || 60,
    offset: Math.max(Number(offset) || 0, 0),
  };
}

export async function listCategories({ includeInactive = false } = {}) {
  const { rows } = await query(
    `SELECT c.id, c.name, c.slug, c.description, c.image_url, c.sort_order,
            count(mi.id)::int AS item_count
       FROM categories c
       LEFT JOIN menu_items mi ON mi.category_id = c.id AND mi.is_available = true
      ${includeInactive ? '' : 'WHERE c.is_active = true'}
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC`
  );
  return rows;
}

export async function getItem(id) {
  const { rows } = await query(
    `SELECT ${ITEM_COLUMNS} FROM menu_items mi LEFT JOIN categories c ON c.id = mi.category_id WHERE mi.id = $1`,
    [id]
  );
  if (!rows[0]) throw notFound('Menu item not found.');
  return rows[0];
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Create a menu item.
 *
 * Every writable field is bound explicitly - the original endpoint silently
 * ignored `is_available` on create (audit finding P1-03), so an item could
 * never be created in an unavailable state.
 */
export async function createItem(input, client = { query }) {
  const name = String(input.name || '').trim();
  if (!name) throw badRequest('Give the dish a name.');

  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) throw badRequest('Enter a valid price.');

  const slug = input.slug ? slugify(input.slug) : slugify(name);

  const { rows } = await client.query(
    `INSERT INTO menu_items
       (category_id, name, slug, description, price, image_url,
        is_available, is_featured, stock_quantity, custom_options)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING id`,
    [
      input.categoryId || input.category_id || null,
      name,
      slug,
      input.description ? String(input.description).trim() : null,
      price.toFixed(2),
      input.imageUrl || input.image_url || input.image || null,
      input.isAvailable ?? input.is_available ?? true,
      input.isFeatured ?? input.is_featured ?? false,
      Number(input.stockQuantity ?? input.stock_quantity ?? 0) || 0,
      JSON.stringify(input.customOptions ?? input.custom_options ?? []),
    ]
  );
  return rows[0].id;
}

/**
 * Update a menu item. `is_available` and every other flag is bound
 * explicitly so it can be toggled.
 */
export async function updateItem(id, input, client = { query }) {
  const { rows } = await client.query('SELECT id FROM menu_items WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Menu item not found.');

  const sets = [];
  const params = [id];
  const set = (column, value) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw badRequest('Give the dish a name.');
    set('name', name);
  }
  if (input.slug !== undefined) set('slug', slugify(input.slug));
  if (input.description !== undefined) {
    set('description', input.description ? String(input.description).trim() : null);
  }
  if (input.price !== undefined) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) throw badRequest('Enter a valid price.');
    set('price', price.toFixed(2));
  }
  if (input.categoryId !== undefined || input.category_id !== undefined) {
    set('category_id', input.categoryId ?? input.category_id ?? null);
  }
  if (input.imageUrl !== undefined || input.image_url !== undefined || input.image !== undefined) {
    set('image_url', input.imageUrl ?? input.image_url ?? input.image ?? null);
  }
  if (input.isAvailable !== undefined || input.is_available !== undefined) {
    set('is_available', Boolean(input.isAvailable ?? input.is_available));
  }
  if (input.isFeatured !== undefined || input.is_featured !== undefined) {
    set('is_featured', Boolean(input.isFeatured ?? input.is_featured));
  }
  if (input.stockQuantity !== undefined || input.stock_quantity !== undefined) {
    set('stock_quantity', Number(input.stockQuantity ?? input.stock_quantity) || 0);
  }
  if (input.customOptions !== undefined || input.custom_options !== undefined) {
    set(
      'custom_options',
      JSON.stringify(input.customOptions ?? input.custom_options ?? [])
    );
  }

  if (!sets.length) throw badRequest('Nothing to update.');
  await client.query(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = $1`, params);
  return id;
}

export async function deleteItem(id, client = { query }) {
  const { rows } = await client.query('SELECT id FROM menu_items WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Menu item not found.');
  await client.query('DELETE FROM menu_items WHERE id = $1', [id]);
}

/* ---------------------------- categories ---------------------------- */

export async function createCategory(input, client = { query }) {
  const name = String(input.name || '').trim();
  if (!name) throw badRequest('Give the category a name.');
  const { rows } = await client.query(
    `INSERT INTO categories (name, slug, description, image_url, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      name,
      slugify(input.slug || name),
      input.description ? String(input.description).trim() : null,
      input.imageUrl || input.image_url || null,
      Number(input.sortOrder ?? input.sort_order ?? 0) || 0,
      input.isActive ?? input.is_active ?? true,
    ]
  );
  return rows[0].id;
}

export async function updateCategory(id, input, client = { query }) {
  const { rows } = await client.query('SELECT id FROM categories WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Category not found.');

  const sets = [];
  const params = [id];
  const set = (column, value) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.name !== undefined) set('name', String(input.name).trim());
  if (input.slug !== undefined) set('slug', slugify(input.slug));
  if (input.description !== undefined) set('description', input.description || null);
  if (input.imageUrl !== undefined || input.image_url !== undefined) {
    set('image_url', input.imageUrl ?? input.image_url ?? null);
  }
  if (input.sortOrder !== undefined || input.sort_order !== undefined) {
    set('sort_order', Number(input.sortOrder ?? input.sort_order) || 0);
  }
  if (input.isActive !== undefined || input.is_active !== undefined) {
    set('is_active', Boolean(input.isActive ?? input.is_active));
  }

  if (!sets.length) throw badRequest('Nothing to update.');
  await client.query(`UPDATE categories SET ${sets.join(', ')} WHERE id = $1`, params);
  return id;
}

export async function deleteCategory(id, client = { query }) {
  const { rows } = await client.query('SELECT id FROM categories WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Category not found.');
  // menu_items.category_id is ON DELETE SET NULL, so dishes are kept.
  await client.query('DELETE FROM categories WHERE id = $1', [id]);
}

export default {
  listItems,
  listCategories,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  createCategory,
  updateCategory,
  deleteCategory,
};
