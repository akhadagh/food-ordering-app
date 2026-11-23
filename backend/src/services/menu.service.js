import { query } from '../config/db.js';
import { badRequest, conflict, notFound, unprocessable } from '../utils/errors.js';
import {
  APPROVED_CATEGORY_NAMES,
  APPROVED_CATEGORY_SLUGS,
  findForbiddenStandaloneTerm,
  resolveApprovedCategory,
} from '../config/catalogue.js';

const CATALOGUE_RULE =
  'Afia Food Hub only offers five food categories: Banku, Fufu, Omotuo, Kokonte and Rice dishes.';

/**
 * A dish must belong to one of the five approved categories.
 *
 * There is no "no category" escape hatch: an orphan dish could otherwise be
 * published without being part of the client's catalogue. The category row
 * is read from the database rather than trusted from the request, so a
 * caller cannot pass the id of an unrelated legacy category.
 */
async function assertApprovedCategoryId(categoryId, client = { query }) {
  if (categoryId === null || categoryId === undefined || categoryId === '') {
    throw unprocessable(`${CATALOGUE_RULE} Choose a category for this dish.`);
  }
  const { rows } = await client.query('SELECT id, name, slug FROM categories WHERE id = $1', [
    categoryId,
  ]);
  if (!rows[0]) throw badRequest('Choose one of the approved food categories.');
  if (!resolveApprovedCategory({ slug: rows[0].slug, name: rows[0].name })) {
    throw unprocessable(CATALOGUE_RULE);
  }
  return rows[0];
}

/**
 * A dish may only be published when it has a confirmed positive price and an
 * approved category. Anything else stays a draft, unavailable for ordering.
 */
function assertPublishable({ price, categoryId }) {
  if (!(Number(price) > 0)) {
    throw unprocessable('Confirm the price before publishing this dish.');
  }
  if (categoryId === null || categoryId === undefined || categoryId === '') {
    throw unprocessable(`${CATALOGUE_RULE} Choose a category before publishing this dish.`);
  }
}

function assertApprovedDishName(name) {
  const forbidden = findForbiddenStandaloneTerm(name);
  if (forbidden) {
    throw unprocessable(
      `"${forbidden}" is not part of the Afia Food Hub menu. Add it as an option under one of the five approved categories instead.`
    );
  }
}

const ITEM_IMAGES_SQL = `
  COALESCE((
    SELECT json_agg(
             json_build_object(
               'id', mii.id,
               'url', mii.url,
               'alt', mii.alt,
               'sort_order', mii.sort_order,
               'is_cover', mii.is_cover
             )
             ORDER BY mii.is_cover DESC, mii.sort_order ASC, mii.id ASC
           )
      FROM menu_item_images mii
     WHERE mii.menu_item_id = mi.id
  ), '[]'::json) AS images
`;

const ITEM_COLUMNS = `
  mi.id, mi.category_id, mi.name, mi.slug, mi.description, mi.price, mi.image_url,
  mi.is_available, mi.is_featured, mi.stock_quantity, mi.custom_options,
  mi.created_at, mi.updated_at,
  c.name AS category_name, c.slug AS category_slug,
  ${ITEM_IMAGES_SQL}
`;

/**
 * Normalise the gallery for the client.
 *
 * `image_url` remains the cover URL (the denormalised column is kept for
 * older clients and for simple thumbnails), while `images` is the ordered
 * gallery the menu carousel uses.
 */
function decorateItem(row) {
  const images = Array.isArray(row.images) ? row.images : [];
  const cover = images.find((image) => image.is_cover) || images[0] || null;
  return {
    ...row,
    images,
    image_url: cover?.url || row.image_url || null,
  };
}

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
  includeInactiveCategories = false,
  includeUnavailable = false,
  limit = 60,
  offset = 0,
} = {}) {
  const params = [];
  const where = [];

  // The live catalogue is the five approved categories, full stop. Legacy
  // rows that still sit in an unrelated category can never leak into a menu
  // response even if somebody writes one into the database by hand.
  params.push(APPROVED_CATEGORY_SLUGS);
  where.push(`c.slug = ANY($${params.length}::text[]) AND mi.category_id IS NOT NULL`);

  if (!includeInactiveCategories) {
    where.push('c.is_active = true');
  }

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
  } else if (!includeUnavailable) {
    // Unpriced and unpublished drafts are never part of the public menu.
    where.push('mi.is_available = true');
  }

  params.push(Math.min(Number(limit) || 60, 200));
  const limitParam = params.length;
  params.push(Math.max(Number(offset) || 0, 0));

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT ${ITEM_COLUMNS},
            count(*) OVER()::int AS total_count
       FROM menu_items mi
       JOIN categories c ON c.id = mi.category_id
       ${whereSql}
      ORDER BY mi.is_featured DESC, c.sort_order NULLS LAST, mi.name ASC
      LIMIT $${limitParam} OFFSET $${params.length}`,
    params
  );

  const total = rows.length ? Number(rows[0].total_count) : 0;
  return {
    items: rows.map(({ total_count: _omit, ...row }) => decorateItem(row)),
    total,
    limit: Number(limit) || 60,
    offset: Math.max(Number(offset) || 0, 0),
  };
}

export async function listCategories({ includeInactive = false } = {}) {
  const params = [APPROVED_CATEGORY_SLUGS];
  const activeFilter = includeInactive ? '' : 'AND c.is_active = true';
  const { rows } = await query(
    `SELECT c.id, c.name, c.slug, c.description, c.image_url, c.sort_order, c.is_active,
            count(mi.id)::int AS item_count
       FROM categories c
       LEFT JOIN menu_items mi ON mi.category_id = c.id AND mi.is_available = true
      WHERE c.slug = ANY($1::text[]) ${activeFilter}
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC`,
    params
  );
  return rows;
}

export async function getItem(id, { includeInactive = false } = {}) {
  const { rows } = await query(
    `SELECT ${ITEM_COLUMNS}
       FROM menu_items mi
       JOIN categories c ON c.id = mi.category_id
      WHERE mi.id = $1
        AND c.slug = ANY($2::text[])
        ${includeInactive ? '' : 'AND c.is_active = true AND mi.is_available = true'}`,
    [id, APPROVED_CATEGORY_SLUGS]
  );
  if (!rows[0]) throw notFound('Menu item not found.');
  return decorateItem(rows[0]);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/* ------------------------------ images ------------------------------ */

function normaliseImageUrls(input) {
  const raw = Array.isArray(input.images) ? input.images : [];
  const urls = raw
    .map((entry) => (typeof entry === 'string' ? entry : entry?.url))
    .map((url) => String(url || '').trim())
    .filter(Boolean);
  const legacy = input.imageUrl ?? input.image_url ?? input.image;
  if (legacy) urls.unshift(String(legacy).trim());
  return [...new Set(urls)].slice(0, 20);
}

async function syncCover(client, itemId) {
  const { rows } = await client.query(
    `SELECT url FROM menu_item_images
      WHERE menu_item_id = $1
      ORDER BY is_cover DESC, sort_order ASC, id ASC
      LIMIT 1`,
    [itemId]
  );
  await client.query('UPDATE menu_items SET image_url = $2 WHERE id = $1', [
    itemId,
    rows[0]?.url ?? null,
  ]);
}

export async function addItemImages(itemId, urls, client = { query }, { makeCover = false } = {}) {
  const clean = [...new Set((urls || []).map((url) => String(url || '').trim()).filter(Boolean))].slice(
    0,
    20
  );
  if (!clean.length) return [];

  const { rows: current } = await client.query(
    `SELECT count(*)::int AS count, COALESCE(max(sort_order), -1) AS max_sort
       FROM menu_item_images WHERE menu_item_id = $1`,
    [itemId]
  );
  const hasImages = Number(current[0]?.count || 0) > 0;
  let sortOrder = Number(current[0]?.max_sort ?? -1) + 1;

  if (makeCover && hasImages) {
    await client.query('UPDATE menu_item_images SET is_cover = false WHERE menu_item_id = $1', [
      itemId,
    ]);
  }

  let coverAssigned = hasImages && !makeCover;
  const created = [];
  for (const url of clean) {
    const isCover = !coverAssigned;
    const { rows } = await client.query(
      `INSERT INTO menu_item_images (menu_item_id, url, sort_order, is_cover)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [itemId, url, sortOrder, isCover]
    );
    created.push(rows[0].id);
    sortOrder += 1;
    coverAssigned = true;
  }

  await syncCover(client, itemId);
  return created;
}

export async function replaceItemImages(itemId, urls, client = { query }) {
  const { rows } = await client.query('SELECT id FROM menu_items WHERE id = $1', [itemId]);
  if (!rows[0]) throw notFound('Menu item not found.');
  await client.query('DELETE FROM menu_item_images WHERE menu_item_id = $1', [itemId]);
  return addItemImages(itemId, urls, client, { makeCover: true });
}

export async function deleteItemImage(itemId, imageId, client = { query }) {
  const { rows } = await client.query(
    'SELECT id, is_cover FROM menu_item_images WHERE id = $1 AND menu_item_id = $2',
    [imageId, itemId]
  );
  if (!rows[0]) throw notFound('That photo is not attached to this dish.');

  await client.query('DELETE FROM menu_item_images WHERE id = $1', [imageId]);

  if (rows[0].is_cover) {
    const { rows: next } = await client.query(
      `SELECT id FROM menu_item_images WHERE menu_item_id = $1
        ORDER BY sort_order ASC, id ASC LIMIT 1`,
      [itemId]
    );
    if (next[0]) {
      await client.query('UPDATE menu_item_images SET is_cover = true WHERE id = $1', [next[0].id]);
    }
  }

  await syncCover(client, itemId);
  return { id: Number(imageId) };
}

export async function reorderItemImages(itemId, images, client = { query }) {
  if (!Array.isArray(images) || images.length > 20) {
    throw badRequest('Send the photo order as a list.');
  }
  const { rows: existing } = await client.query(
    'SELECT id FROM menu_item_images WHERE menu_item_id = $1',
    [itemId]
  );
  if (!existing.length) throw notFound('This dish has no photos to reorder.');

  const owned = new Set(existing.map((row) => row.id));
  const clean = images.map((entry, index) => {
    const id = Number(entry.id);
    if (!Number.isFinite(id) || !owned.has(id)) {
      throw badRequest('One of those photos does not belong to this dish.');
    }
    return {
      id,
      sort_order: Number.isFinite(Number(entry.sort_order)) ? Number(entry.sort_order) : index,
      is_cover: Boolean(entry.is_cover),
    };
  });
  if (!clean.length) throw badRequest('Send at least one photo.');

  const covers = clean.filter((entry) => entry.is_cover);
  if (covers.length > 1) throw badRequest('Choose one cover photo.');
  if (!covers.length) {
    clean.sort((a, b) => a.sort_order - b.sort_order);
    clean[0].is_cover = true;
  }

  await client.query('UPDATE menu_item_images SET is_cover = false WHERE menu_item_id = $1', [
    itemId,
  ]);
  for (const entry of clean) {
    await client.query(
      'UPDATE menu_item_images SET sort_order = $3, is_cover = $4 WHERE id = $1 AND menu_item_id = $2',
      [entry.id, itemId, entry.sort_order, entry.is_cover]
    );
  }

  await syncCover(client, itemId);
  return { id: Number(itemId) };
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
  assertApprovedDishName(name);

  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) throw badRequest('Enter a valid price.');

  const categoryId = input.categoryId ?? input.category_id ?? null;
  await assertApprovedCategoryId(categoryId, client);

  const requestedAvailable = input.isAvailable ?? input.is_available ?? true;
  if (requestedAvailable) assertPublishable({ price, categoryId });

  const slug = input.slug ? slugify(input.slug) : slugify(name);
  const imageUrls = normaliseImageUrls(input);

  const { rows } = await client.query(
    `INSERT INTO menu_items
       (category_id, name, slug, description, price, image_url,
        is_available, is_featured, stock_quantity, custom_options)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING id`,
    [
      categoryId,
      name,
      slug,
      input.description ? String(input.description).trim() : null,
      price.toFixed(2),
      imageUrls[0] || null,
      requestedAvailable && price > 0,
      input.isFeatured ?? input.is_featured ?? false,
      Number(input.stockQuantity ?? input.stock_quantity ?? 0) || 0,
      JSON.stringify(input.customOptions ?? input.custom_options ?? []),
    ]
  );
  if (imageUrls.length) {
    await addItemImages(rows[0].id, imageUrls, client, { makeCover: true });
  }
  return rows[0].id;
}

/**
 * Update a menu item. `is_available` and every other flag is bound
 * explicitly so it can be toggled.
 */
export async function updateItem(id, input, client = { query }) {
  const { rows } = await client.query(
    'SELECT id, price, is_available, category_id FROM menu_items WHERE id = $1',
    [id]
  );
  if (!rows[0]) throw notFound('Menu item not found.');
  const current = rows[0];

  const nextPrice = input.price !== undefined ? Number(input.price) : Number(current.price);
  if (input.price !== undefined && (!Number.isFinite(nextPrice) || nextPrice < 0)) {
    throw badRequest('Enter a valid price.');
  }

  const requestedAvailability = input.isAvailable ?? input.is_available;
  let nextAvailable =
    requestedAvailability !== undefined ? Boolean(requestedAvailability) : Boolean(current.is_available);

  const categoryProvided = input.categoryId !== undefined || input.category_id !== undefined;
  const nextCategoryId = categoryProvided
    ? input.categoryId ?? input.category_id ?? null
    : current.category_id;

  if (categoryProvided) await assertApprovedCategoryId(nextCategoryId, client);

  // A zero price is an unconfirmed draft, never a purchasable dish. Trying to
  // publish one is an error; lowering the price to zero unpublishes it.
  if (nextPrice <= 0) {
    if (requestedAvailability === true) {
      throw unprocessable('Confirm the price before publishing this dish.');
    }
    nextAvailable = false;
  }

  if (nextAvailable) {
    await assertApprovedCategoryId(nextCategoryId, client);
    assertPublishable({ price: nextPrice, categoryId: nextCategoryId });
  }

  const sets = [];
  const params = [id];
  const set = (column, value) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw badRequest('Give the dish a name.');
    assertApprovedDishName(name);
    set('name', name);
  }
  if (input.slug !== undefined) set('slug', slugify(input.slug));
  if (input.description !== undefined) {
    set('description', input.description ? String(input.description).trim() : null);
  }
  if (input.price !== undefined) set('price', nextPrice.toFixed(2));
  if (categoryProvided) set('category_id', nextCategoryId);
  const replacementImages = Array.isArray(input.images) ? normaliseImageUrls({ images: input.images }) : null;
  const imageUrl = input.imageUrl ?? input.image_url ?? input.image;
  if (replacementImages) {
    // Replaced after the row update, below.
  } else if (imageUrl !== undefined) {
    set('image_url', imageUrl || null);
  }
  if (nextAvailable !== Boolean(current.is_available)) {
    set('is_available', nextAvailable);
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

  if (!sets.length && !replacementImages) throw badRequest('Nothing to update.');
  if (sets.length) {
    await client.query(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = $1`, params);
  }

  if (replacementImages) {
    await replaceItemImages(id, replacementImages, client);
  } else if (imageUrl) {
    const { rows: currentImages } = await client.query(
      'SELECT url FROM menu_item_images WHERE menu_item_id = $1 ORDER BY is_cover DESC, id ASC',
      [id]
    );
    if (!currentImages.some((image) => image.url === imageUrl)) {
      await addItemImages(id, [imageUrl], client, { makeCover: true });
    }
  }

  return id;
}

export async function deleteItem(id, client = { query }) {
  const { rows } = await client.query('SELECT id FROM menu_items WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Menu item not found.');
  await client.query('DELETE FROM menu_items WHERE id = $1', [id]);
}

/* ---------------------------- categories ---------------------------- */

export async function createCategory(input, client = { query }) {
  const approved = resolveApprovedCategory({ name: input.name, slug: input.slug });
  if (!approved) {
    throw unprocessable(`${CATALOGUE_RULE} New categories outside this list are not allowed.`);
  }

  const { rows: existing } = await client.query('SELECT id FROM categories WHERE slug = $1', [
    approved.slug,
  ]);
  if (existing[0]) {
    throw conflict(`${approved.name} already exists.`);
  }

  const { rows } = await client.query(
    `INSERT INTO categories (name, slug, description, image_url, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      approved.name,
      approved.slug,
      input.description ? String(input.description).trim() : approved.description,
      input.imageUrl || input.image_url || approved.image,
      Number(input.sortOrder ?? input.sort_order ?? approved.sort) || approved.sort,
      input.isActive ?? input.is_active ?? true,
    ]
  );
  return rows[0].id;
}

export async function updateCategory(id, input, client = { query }) {
  const { rows } = await client.query('SELECT id, name, slug FROM categories WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Category not found.');

  const current = resolveApprovedCategory({ name: rows[0].name, slug: rows[0].slug });
  if (!current) throw unprocessable(CATALOGUE_RULE);

  if (input.name !== undefined && !resolveApprovedCategory({ name: input.name })) {
    throw unprocessable(`${CATALOGUE_RULE} Categories cannot be renamed outside that list.`);
  }
  if (input.slug !== undefined && !resolveApprovedCategory({ slug: input.slug })) {
    throw unprocessable(`${CATALOGUE_RULE} Categories cannot be renamed outside that list.`);
  }

  const requested = resolveApprovedCategory({
    name: input.name ?? rows[0].name,
    slug: input.slug ?? rows[0].slug,
  });
  if (!requested || requested.slug !== current.slug) {
    throw unprocessable(`${CATALOGUE_RULE} Categories cannot be renamed outside that list.`);
  }

  const sets = [];
  const params = [id];
  const set = (column, value) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.name !== undefined) set('name', requested.name);
  if (input.slug !== undefined) set('slug', requested.slug);
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
  const { rows } = await client.query('SELECT id, name, slug FROM categories WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Category not found.');
  // The five categories are structural: deleting one would leave the menu
  // without a required section. Deactivate it instead.
  throw unprocessable(
    `${rows[0].name} is one of the five approved categories and cannot be deleted. Set it to inactive instead.`
  );
}

export { APPROVED_CATEGORY_NAMES };

export default {
  listItems,
  listCategories,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  addItemImages,
  replaceItemImages,
  deleteItemImage,
  reorderItemImages,
  createCategory,
  updateCategory,
  deleteCategory,
};
