/**
 * Seed reference data.
 *
 *   node src/db/seed.js
 *
 * Afia Food Hub sells only five Ghanaian food categories: Banku, Fufu,
 * Omotuo, Kokonte and Rice dishes. Every other product (kenkey, waakye,
 * beans and plantain, smoked fish, palm wine, sobolo, bottled water and
 * similar standalone items) has been removed from the active catalogue and
 * must not be reintroduced here.
 *
 * Prices marked 0 are DRAFT placeholders: the client has not confirmed them,
 * and those dishes are seeded as unavailable (is_available = false) so they
 * can never be ordered until the owner supplies a real price and publishes
 * them. Published items carry prices preserved from the previous reference
 * list; the owner should confirm them before launch.
 *
 * An administrator is created from BOOTSTRAP_ADMIN_EMAIL and
 * BOOTSTRAP_ADMIN_PASSWORD. There is NO default password: a default
 * administrator credential is exactly the kind of thing that must never ship
 * (audit finding P0-07).
 */
import { hashPassword } from '../utils/password.js';
import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { BRAND } from '../config/brand.js';
import { APPROVED_CATEGORIES } from '../config/catalogue.js';

const connectionString = env.databaseUrlDirect || env.databaseUrl;
if (!connectionString) {
  logger.error('No DATABASE_URL_DIRECT or DATABASE_URL configured.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
});

const CATEGORIES = APPROVED_CATEGORIES;

const PROTEIN_OPTIONS = [
  { label: 'Chicken', price_delta: 0 },
  { label: 'Beef', price_delta: 5 },
  { label: 'Goat meat', price_delta: 6 },
  { label: 'Fish', price_delta: 0 },
];

const SOUP_PROTEIN = [
  {
    name: 'Protein',
    type: 'single',
    required: true,
    options: PROTEIN_OPTIONS,
  },
];

const MENU = [
  /* ------------------------------------------------------------ Banku --- */
  {
    name: 'Banku with Okra Soup',
    slug: 'banku-with-okra-soup',
    category: 'banku',
    price: 35,
    description:
      'Soft fermented banku served with rich okra stew and your choice of protein.',
    image: '/brand/food/banku-okra-soup.jpg',
    images: ['/brand/food/banku-okra-soup.jpg', '/brand/food/banku/banku-okra-2.jpg', '/brand/food/banku/banku-okra-3.jpg', '/brand/food/banku/banku-okra-4.jpg'],
    featured: true,
    available: true,
    options: [
      {
        name: 'Protein',
        type: 'single',
        required: true,
        options: [
          { label: 'Fish', price_delta: 0 },
          { label: 'Crab', price_delta: 10 },
          { label: 'Goat meat', price_delta: 12 },
        ],
      },
      {
        name: 'Extra banku',
        type: 'single',
        required: false,
        options: [{ label: 'Extra portion', price_delta: 8 }],
      },
    ],
  },
  {
    name: 'Banku with Grilled Tilapia',
    slug: 'banku-with-grilled-tilapia',
    category: 'banku',
    price: 45,
    description: 'Whole grilled tilapia served with banku and pepper sauce.',
    image: '/brand/food/banku-grilled-tilapia.jpg',
    images: ['/brand/food/banku-grilled-tilapia.jpg', '/brand/food/banku/banku-tilapia-2.jpg', '/brand/food/banku/banku-tilapia-3.jpg'],
    featured: true,
    available: true,
    options: [
      {
        name: 'Tilapia size',
        type: 'single',
        required: true,
        options: [
          { label: 'Medium', price_delta: 0 },
          { label: 'Large', price_delta: 10 },
        ],
      },
      {
        name: 'Spice level',
        type: 'single',
        required: false,
        options: [
          { label: 'Mild', price_delta: 0 },
          { label: 'Hot', price_delta: 0 },
        ],
      },
    ],
  },
  {
    name: 'Banku with Groundnut Soup',
    slug: 'banku-with-groundnut-soup',
    category: 'banku',
    price: 0,
    description: 'Banku served with smooth groundnut soup and your choice of protein.',
    image: '/brand/food/banku/banku-groundnut-1.jpg',
    images: ['/brand/food/banku/banku-groundnut-1.jpg', '/brand/food/banku/banku-groundnut-2.jpg'],
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Banku with Light Soup',
    slug: 'banku-with-light-soup',
    category: 'banku',
    price: 0,
    description: 'Banku served with light soup and your choice of protein.',
    image: null,
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Banku with Fish and Pepper',
    slug: 'banku-with-fish-and-pepper',
    category: 'banku',
    price: 0,
    description: 'Banku served with fish and fresh pepper sauce.',
    image: null,
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  /* ------------------------------------------------------------- Fufu --- */
  {
    name: 'Fufu with Light Soup',
    slug: 'fufu-with-light-soup',
    category: 'fufu',
    price: 40,
    description: 'Smooth fufu served with Ghanaian light soup and your choice of protein.',
    image: '/brand/food/fufu-light-soup.jpg',
    images: ['/brand/food/fufu-light-soup.jpg', '/brand/food/fufu/fufu-light-2.jpg', '/brand/food/fufu/fufu-light-3.jpg'],
    featured: true,
    available: true,
    options: [
      {
        name: 'Protein',
        type: 'single',
        required: true,
        options: [
          { label: 'Chicken', price_delta: 0 },
          { label: 'Goat meat', price_delta: 6 },
          { label: 'Snail', price_delta: 12 },
        ],
      },
      {
        name: 'Fufu type',
        type: 'single',
        required: false,
        options: [
          { label: 'Cassava', price_delta: 0 },
          { label: 'Plantain', price_delta: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fufu with Groundnut Soup',
    slug: 'fufu-with-groundnut-soup',
    category: 'fufu',
    price: 0,
    description: 'Smooth fufu served with rich groundnut soup and your choice of protein.',
    image: '/brand/food/fufu-groundnut-soup.jpg',
    images: ['/brand/food/fufu-groundnut-soup.jpg', '/brand/food/fufu/fufu-groundnut-2.jpg', '/brand/food/fufu/fufu-groundnut-3.jpg'],
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Fufu with Palm Nut Soup',
    slug: 'fufu-with-palm-nut-soup',
    category: 'fufu',
    price: 0,
    description: 'Smooth fufu served with palm nut soup and your choice of protein.',
    image: '/brand/food/fufu/fufu-palmnut-1.jpg',
    images: ['/brand/food/fufu/fufu-palmnut-1.jpg', '/brand/food/fufu/fufu-palmnut-2.jpg'],
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Fufu with Okro Soup',
    slug: 'fufu-with-okro-soup',
    category: 'fufu',
    price: 0,
    description: 'Smooth fufu served with okro soup and your choice of protein.',
    image: null,
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  /* ------------------------------------------------------------ Omotuo --- */
  {
    name: 'Omotuo with Groundnut Soup',
    slug: 'omotuo-with-groundnut-soup',
    category: 'omotuo',
    price: 0,
    description: 'Soft rice balls served with smooth groundnut soup and your choice of protein.',
    image: '/brand/food/omotuo-groundnut-soup.jpg',
    images: ['/brand/food/omotuo-groundnut-soup.jpg', '/brand/food/omotuo/omotuo-2.jpg', '/brand/food/omotuo/omotuo-3.jpg'],
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Omotuo with Palm Nut Soup',
    slug: 'omotuo-with-palm-nut-soup',
    category: 'omotuo',
    price: 0,
    description: 'Soft rice balls served with palm nut soup and your choice of protein.',
    image: null,
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Omotuo with Light Soup',
    slug: 'omotuo-with-light-soup',
    category: 'omotuo',
    price: 0,
    description: 'Soft rice balls served with light soup and your choice of protein.',
    image: null,
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  /* ------------------------------------------------------------ Kokonte --- */
  {
    name: 'Kokonte with Groundnut Soup',
    slug: 'kokonte-with-groundnut-soup',
    category: 'kokonte',
    price: 0,
    description:
      'Dried cassava flour pudding served with rich groundnut soup and your choice of protein.',
    image: '/brand/food/kokonte-groundnut-soup.jpg',
    images: ['/brand/food/kokonte-groundnut-soup.jpg', '/brand/food/kokonte/kokonte-2.jpg', '/brand/food/kokonte/kokonte-3.jpg'],
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Kokonte with Palm Nut Soup',
    slug: 'kokonte-with-palm-nut-soup',
    category: 'kokonte',
    price: 0,
    description: 'Dried cassava flour pudding served with palm nut soup and your choice of protein.',
    image: null,
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Kokonte with Light Soup',
    slug: 'kokonte-with-light-soup',
    category: 'kokonte',
    price: 0,
    description: 'Dried cassava flour pudding served with light soup and your choice of protein.',
    image: null,
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  /* ------------------------------------------------------- Rice dishes --- */
  {
    name: 'Ghanaian Jollof Rice',
    slug: 'jollof-rice',
    category: 'rice-dishes',
    price: 40,
    description: 'Smoky Ghanaian jollof rice, cooked in tomato and pepper and served hot.',
    image: '/brand/food/jollof-rice.jpg',
    images: ['/brand/food/jollof-rice.jpg', '/brand/food/rice/jollof-3.jpg', '/brand/food/rice/jollof-4.jpg'],
    featured: true,
    available: true,
    options: [
      {
        name: 'Protein',
        type: 'single',
        required: true,
        options: [
          { label: 'Chicken', price_delta: 0 },
          { label: 'Goat meat', price_delta: 10 },
          { label: 'Beef', price_delta: 5 },
        ],
      },
      {
        name: 'Portion',
        type: 'single',
        required: false,
        options: [
          { label: 'Regular', price_delta: 0 },
          { label: 'Large', price_delta: 10 },
        ],
      },
    ],
  },
  {
    name: 'Ghanaian Fried Rice',
    slug: 'fried-rice',
    category: 'rice-dishes',
    price: 0,
    description: 'Ghanaian-style fried rice with vegetables and your choice of protein.',
    image: '/brand/food/fried-rice.jpg',
    images: ['/brand/food/fried-rice.jpg', '/brand/food/rice/fried-rice-2.jpg', '/brand/food/rice/fried-rice-3.jpg'],
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Rice with Stew',
    slug: 'rice-with-stew',
    category: 'rice-dishes',
    price: 0,
    description: 'Plain rice served with tomato stew and your choice of protein.',
    image: '/brand/food/rice/rice-stew-1.jpg',
    images: ['/brand/food/rice/rice-stew-1.jpg'],
    featured: false,
    available: false,
    options: SOUP_PROTEIN,
  },
  {
    name: 'Jollof Rice with Grilled Chicken',
    slug: 'jollof-rice-with-grilled-chicken',
    category: 'rice-dishes',
    price: 0,
    description: 'Ghanaian jollof rice served with grilled chicken.',
    image: '/brand/food/rice/jollof-chicken-1.jpg',
    images: ['/brand/food/rice/jollof-chicken-1.jpg'],
    featured: false,
    available: false,
    options: [
      {
        name: 'Portion',
        type: 'single',
        required: false,
        options: [
          { label: 'Regular', price_delta: 0 },
          { label: 'Large', price_delta: 10 },
        ],
      },
    ],
  },
  {
    name: 'Jollof Rice with Grilled Fish',
    slug: 'jollof-rice-with-grilled-fish',
    category: 'rice-dishes',
    price: 0,
    description: 'Ghanaian jollof rice served with grilled fish.',
    image: '/brand/food/rice/jollof-fish-1.jpg',
    images: ['/brand/food/rice/jollof-fish-1.jpg'],
    featured: false,
    available: false,
    options: [
      {
        name: 'Portion',
        type: 'single',
        required: false,
        options: [
          { label: 'Regular', price_delta: 0 },
          { label: 'Large', price_delta: 10 },
        ],
      },
    ],
  },
];

async function seed() {
  await client.connect();
  logger.info('Seeding reference data…');

  for (const category of CATEGORIES) {
    await client.query(
      `INSERT INTO categories (name, slug, description, image_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             image_url = EXCLUDED.image_url,
             sort_order = EXCLUDED.sort_order`,
      [category.name, category.slug, category.description, category.image, category.sort]
    );
  }
  logger.info(`Seeded ${CATEGORIES.length} categories.`);

  const { rows: categoryRows } = await client.query('SELECT id, slug FROM categories');
  const categoryIds = new Map(categoryRows.map((r) => [r.slug, r.id]));

  let count = 0;
  for (const item of MENU) {
    // A dish with no confirmed price is never orderable. It stays in the
    // catalogue as an unpublished draft so the owner can review it, but the
    // customer-facing menu only shows available dishes.
    const available = item.price > 0 ? (item.available ?? item.is_available ?? true) : false;
    await client.query(
      `INSERT INTO menu_items
         (category_id, name, slug, description, price, image_url, is_available, is_featured,
          stock_quantity, custom_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9::jsonb)
       ON CONFLICT (slug) DO UPDATE
         SET category_id = EXCLUDED.category_id,
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             image_url = COALESCE(menu_items.image_url, EXCLUDED.image_url),
             is_featured = EXCLUDED.is_featured,
             custom_options = EXCLUDED.custom_options
         -- price, is_available and stock are deliberately NOT overwritten:
         -- re-seeding must never undo a price or availability change the
         -- owner has made in production.`,
      [
        categoryIds.get(item.category) ?? null,
        item.name,
        item.slug,
        item.description,
        item.price.toFixed(2),
        item.image,
        available,
        item.featured,
        JSON.stringify(item.options || []),
      ]
    );
    const { rows: itemRows } = await client.query('SELECT id FROM menu_items WHERE slug = $1', [
      item.slug,
    ]);
    const itemId = itemRows[0].id;
    const { rows: existingImages } = await client.query(
      'SELECT url, sort_order, is_cover FROM menu_item_images WHERE menu_item_id = $1 ORDER BY sort_order, id',
      [itemId]
    );
    const existingCount = existingImages.length;
    // A fresh dish gets its full gallery. A dish that already has exactly one
    // backfilled photo gets the missing gallery entries appended. A dish the
    // administrator has already curated (two or more photos) is left alone.
    if (existingCount <= 1) {
      const gallery = item.images?.length
        ? item.images
        : item.image
          ? [item.image]
          : [];
      const existingUrls = new Set(existingImages.map((image) => image.url));
      const nextOrder = existingCount
        ? Math.max(...existingImages.map((image) => Number(image.sort_order) || 0)) + 1
        : 0;
      let position = nextOrder;
      for (const url of gallery) {
        if (existingUrls.has(url)) continue;
        await client.query(
          `INSERT INTO menu_item_images (menu_item_id, url, sort_order, is_cover)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (menu_item_id, url) DO NOTHING`,
          [itemId, url, position, existingCount === 0 && position === 0]
        );
        position += 1;
      }
    }
    count += 1;
  }
  logger.info(`Seeded ${count} menu items.`);

  // ----------------------------------------------------- reconciliation ----
  // The same rules as migration 006 and the menu service. Anything outside
  // the five categories is hidden from the active catalogue, never deleted:
  // order history keeps its snapshots and the rows remain for reference.
  const { rowCount: hiddenItems } = await client.query(
    `UPDATE menu_items mi
        SET is_available = false,
            is_featured  = false
      WHERE mi.category_id IS NULL
         OR mi.category_id IN (
              SELECT id FROM categories WHERE slug <> ALL($1::text[])
            )
         OR mi.price <= 0
         OR lower(mi.name) ~* '(kenkey|waakye|kelewele|pizza|burger|noodles?|spaghetti|sobolo|palm wine|bottled water)'`,
    [APPROVED_CATEGORIES.map((c) => c.slug)]
  );
  const { rowCount: hiddenCategories } = await client.query(
    'UPDATE categories SET is_active = false WHERE slug <> ALL($1::text[])',
    [APPROVED_CATEGORIES.map((c) => c.slug)]
  );
  if (hiddenItems || hiddenCategories) {
    logger.info(
      `Reconciled catalogue: hid ${hiddenItems} dish(es) and deactivated ${hiddenCategories} non-approved category(ies).`
    );
  }

  // ------------------------------------------------------------ admin ----
  if (env.bootstrapAdminEmail && env.bootstrapAdminPassword) {
    const email = env.bootstrapAdminEmail.trim().toLowerCase();
    const hash = await hashPassword(env.bootstrapAdminPassword);
    const { rowCount } = await client.query(
      `INSERT INTO users (name, email, role, password_hash, email_verified)
       VALUES ($1, $2, 'admin', $3, true)
       ON CONFLICT (lower(email)) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
      [env.bootstrapAdminEmail.split('@')[0] || 'Administrator', email, hash]
    );
    logger.info(rowCount ? `Administrator ${email} created.` : `Administrator ${email} updated.`);
  } else {
    logger.warn(
      'BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD were not set, so no administrator was created. ' +
        'Run the seed again with both set to create the first administrator.'
    );
  }

  logger.info(`${BRAND.name} seed complete.`);
}

seed()
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error(`Seed failed: ${err.message}`);
    await client.end().catch(() => {});
    process.exit(1);
  });
