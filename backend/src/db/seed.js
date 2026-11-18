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

const connectionString = env.databaseUrlDirect || env.databaseUrl;
if (!connectionString) {
  logger.error('No DATABASE_URL_DIRECT or DATABASE_URL configured.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
});

const CATEGORIES = [
  {
    name: 'Banku',
    slug: 'banku',
    description: 'Fermented maize and cassava dough, served with okra stew, grilled fish and pepper sauces.',
    image: '/brand/banners/category-banku.jpg',
    sort: 1,
  },
  {
    name: 'Fufu',
    slug: 'fufu',
    description: 'Pounded cassava and plantain, served with light, groundnut and palm nut soups.',
    image: '/brand/banners/category-fufu.jpg',
    sort: 2,
  },
  {
    name: 'Omotuo',
    slug: 'omotuo',
    description: 'Soft rice balls served with groundnut or palm nut soup.',
    image: '/brand/banners/category-omotuo.jpg',
    sort: 3,
  },
  {
    name: 'Kokonte',
    slug: 'kokonte',
    description: 'Dried cassava flour pudding served with groundnut or palm nut soup.',
    image: '/brand/banners/category-kokonte.jpg',
    sort: 4,
  },
  {
    name: 'Rice dishes',
    slug: 'rice-dishes',
    description: 'Ghanaian jollof, fried rice and rice with stew, cooked to order.',
    image: '/brand/banners/category-rice-dishes.jpg',
    sort: 5,
  },
];

const MENU = [
  /* ------------------------------------------------------------ Banku --- */
  {
    name: 'Banku with Okra Soup',
    slug: 'banku-with-okra-soup',
    category: 'banku',
    price: 35,
    description: 'Soft fermented banku served with a rich okra stew and your choice of protein.',
    image: '/brand/food/banku-okra-soup.jpg',
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
      { name: 'Extra banku', type: 'single', required: false, options: [{ label: 'Extra portion', price_delta: 8 }] },
    ],
  },
  {
    name: 'Banku with Grilled Tilapia',
    slug: 'banku-with-grilled-tilapia',
    category: 'banku',
    price: 45,
    description: 'Whole grilled tilapia served with banku and pepper sauce.',
    image: '/brand/food/banku-grilled-tilapia.jpg',
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
      { name: 'Spice level', type: 'single', required: false, options: [{ label: 'Mild', price_delta: 0 }, { label: 'Hot', price_delta: 0 }] },
    ],
  },
  /* ------------------------------------------------------------- Fufu --- */
  {
    name: 'Fufu with Light Soup',
    slug: 'fufu-with-light-soup',
    category: 'fufu',
    price: 40,
    description: 'Smooth fufu served with Ghanaian light soup and your choice of protein.',
    image: '/brand/food/fufu-light-soup.jpg',
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
      { name: 'Fufu type', type: 'single', required: false, options: [{ label: 'Cassava', price_delta: 0 }, { label: 'Plantain', price_delta: 0 }] },
    ],
  },
  {
    name: 'Fufu with Groundnut Soup',
    slug: 'fufu-with-groundnut-soup',
    category: 'fufu',
    price: 0,
    description: 'Smooth fufu served with rich groundnut soup and your choice of protein.',
    image: '/brand/food/fufu-groundnut-soup.jpg',
    featured: false,
    available: false,
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
    ],
  },
  /* ------------------------------------------------------------ Omotuo --- */
  {
    name: 'Omotuo with Groundnut Soup',
    slug: 'omotuo-with-groundnut-soup',
    category: 'omotuo',
    price: 0,
    description: 'Soft rice balls served with smooth groundnut soup and your choice of protein.',
    image: '/brand/food/omotuo-groundnut-soup.jpg',
    featured: false,
    available: false,
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
    ],
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
    ],
  },
  /* ------------------------------------------------------------ Kokonte --- */
  {
    name: 'Kokonte with Groundnut Soup',
    slug: 'kokonte-with-groundnut-soup',
    category: 'kokonte',
    price: 0,
    description: 'Dried cassava flour pudding served with rich groundnut soup and your choice of protein.',
    image: '/brand/food/kokonte-groundnut-soup.jpg',
    featured: false,
    available: false,
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
    ],
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
    ],
  },
  /* ------------------------------------------------------- Rice dishes --- */
  {
    name: 'Ghanaian Jollof Rice',
    slug: 'jollof-rice',
    category: 'rice-dishes',
    price: 40,
    description: 'Smoky Ghanaian jollof rice, cooked in tomato and pepper and served hot.',
    image: '/brand/food/jollof-rice.jpg',
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
      { name: 'Portion', type: 'single', required: false, options: [{ label: 'Regular', price_delta: 0 }, { label: 'Large', price_delta: 10 }] },
    ],
  },
  {
    name: 'Ghanaian Fried Rice',
    slug: 'fried-rice',
    category: 'rice-dishes',
    price: 0,
    description: 'Ghanaian-style fried rice with vegetables and your choice of protein.',
    image: '/brand/food/fried-rice.jpg',
    featured: false,
    available: false,
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
    ],
  },
  {
    name: 'Rice with Stew',
    slug: 'rice-with-stew',
    category: 'rice-dishes',
    price: 0,
    description: 'Plain rice served with tomato stew and your choice of protein.',
    image: null,
    featured: false,
    available: false,
    options: [
      {
        name: 'Protein',
        type: 'single',
        required: true,
        options: [
          { label: 'Chicken', price_delta: 0 },
          { label: 'Goat meat', price_delta: 6 },
          { label: 'Fish', price_delta: 0 },
        ],
      },
    ],
  },
];

/**
 * Slugs shipped by the previous catalogue. They are removed on every seed so
 * that re-seeding an existing database drops the old dishes and categories
 * instead of leaving them orderable next to the new ones. Order history keeps
 * its name/price snapshots; only the live catalogue rows are deleted.
 */
const LEGACY_MENU_SLUGS = [
  'banku-with-tilapia',
  'waakye-and-stew',
  'waakye-special',
  'rice-ball-with-groundnut-soup',
  'kenkey-with-fried-fish',
  'jollof-rice-with-grilled-fish',
  'beans-plantain-and-gari',
  'smoked-fish',
  'palm-wine',
  'sobolo',
  'water',
];

const LEGACY_CATEGORY_SLUGS = [
  'local-favourites',
  'soups-and-banku',
  'drinks',
  'sides-and-extras',
];

async function seed() {
  await client.connect();
  logger.info('Seeding reference data…');

  for (const category of CATEGORIES) {
    await client.query(
      `INSERT INTO categories (name, slug, description, image_url, sort_order)
       VALUES ($1, $2, $3, $4, $5)
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
    await client.query(
       `INSERT INTO menu_items
          (category_id, name, slug, description, price, image_url, is_available, is_featured,
           stock_quantity, custom_options)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9::jsonb)
        ON CONFLICT (slug) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              price = EXCLUDED.price,
              image_url = EXCLUDED.image_url,
              is_available = EXCLUDED.is_available,
              is_featured = EXCLUDED.is_featured,
              custom_options = EXCLUDED.custom_options`,
        [
          categoryIds.get(item.category) ?? null,
          item.name,
          item.slug,
          item.description,
          item.price.toFixed(2),
          item.image,
          item.available ?? item.is_available ?? true,
          item.featured,
          JSON.stringify(item.options || []),
        ]
    );
    count += 1;
  }
  logger.info(`Seeded ${count} menu items.`);

  // ----------------------------------------------------- legacy cleanup ----
  const { rowCount: removedItems } = await client.query(
    `DELETE FROM menu_items
      WHERE slug = ANY($1::text[])
         OR category_id IN (SELECT id FROM categories WHERE slug = ANY($2::text[]))`,
    [LEGACY_MENU_SLUGS, LEGACY_CATEGORY_SLUGS]
  );
  const { rowCount: removedCategories } = await client.query(
    'DELETE FROM categories WHERE slug = ANY($1::text[])',
    [LEGACY_CATEGORY_SLUGS]
  );
  if (removedItems || removedCategories) {
    logger.info(
      `Removed ${removedItems} legacy menu item(s) and ${removedCategories} legacy category(ies).`
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
