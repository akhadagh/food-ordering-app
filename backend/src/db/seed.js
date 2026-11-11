/**
 * Seed reference data.
 *
 *   node src/db/seed.js
 *
 * The menu below is the dish list and price list that the project's own
 * README documented before the transformation. It is preserved rather than
 * invented - the owner should confirm the prices before launch.
 *
 * An administrator is created from BOOTSTRAP_ADMIN_EMAIL and
 * BOOTSTRAP_ADMIN_PASSWORD. There is NO default password: a default
 * administrator credential is exactly the kind of thing that must never ship
 * (audit finding P0-07).
 */
import bcrypt from 'bcryptjs';
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
    name: 'Local Favourites',
    slug: 'local-favourites',
    description: 'The Ghanaian classics people come back for.',
    image: '/brand/banners/category-local-800x800.jpg',
    sort: 1,
  },
  {
    name: 'Rice Dishes',
    slug: 'rice-dishes',
    description: 'Jollof, waakye and rice bowls cooked to order.',
    image: '/brand/banners/category-rice-800x800.jpg',
    sort: 2,
  },
  {
    name: 'Soups & Banku',
    slug: 'soups-and-banku',
    description: 'Light soup, okra stew and banku the way it is served at home.',
    image: '/brand/banners/category-banku-800x800.jpg',
    sort: 3,
  },
  {
    name: 'Drinks',
    slug: 'drinks',
    description: 'Cool off with something from the cooler.',
    image: '/brand/banners/category-drinks-800x800.jpg',
    sort: 4,
  },
  {
    name: 'Sides & Extras',
    slug: 'sides-and-extras',
    description: 'Gari, beans, fried plantain and everything to go with it.',
    image: '/brand/banners/category-sides-800x800.jpg',
    sort: 5,
  },
];

const MENU = [
  {
    name: 'Banku with Okra Soup',
    slug: 'banku-with-okra-soup',
    category: 'soups-and-banku',
    price: 35,
    description: 'Soft fermented banku with a rich okra stew and your choice of protein.',
    image: '/brand/food/banku-okra-soup.jpg',
    featured: true,
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
    name: 'Banku with Tilapia',
    slug: 'banku-with-tilapia',
    category: 'soups-and-banku',
    price: 45,
    description: 'Whole grilled tilapia served with banku and pepper sauce.',
    image: '/brand/food/banku.jpg',
    featured: true,
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
  {
    name: 'Fufu with Light Soup',
    slug: 'fufu-with-light-soup',
    category: 'soups-and-banku',
    price: 40,
    description: 'Smooth fufu with Ghanaian light soup and a generous portion of meat.',
    image: '/brand/food/fufu-light-soup.jpg',
    featured: true,
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
    name: 'Jollof Rice',
    slug: 'jollof-rice',
    category: 'rice-dishes',
    price: 40,
    description: 'Smoky Ghanaian jollof rice, cooked in tomato and pepper and served hot.',
    image: '/brand/food/jollof-rice.jpg',
    featured: true,
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
    name: 'Waakye and Stew',
    slug: 'waakye-and-stew',
    category: 'rice-dishes',
    price: 35,
    description: 'Rice and beans with waakye leaves, served with stew and boiled egg.',
    image: '/brand/food/waakye.jpg',
    featured: false,
    options: [
      { name: 'Extras', type: 'multiple', required: false, options: [{ label: 'Boiled egg', price_delta: 3 }, { label: 'Gari', price_delta: 0 }, { label: 'Spaghetti', price_delta: 0 }] },
      { name: 'Protein', type: 'single', required: false, options: [{ label: 'Chicken', price_delta: 0 }, { label: 'Beef', price_delta: 6 }, { label: 'Fish', price_delta: 0 }] },
    ],
  },
  {
    name: 'Waakye Special',
    slug: 'waakye-special',
    category: 'rice-dishes',
    price: 45,
    description: 'Waakye and stew served in a leaf with fried plantain, egg and shito.',
    image: '/brand/food/waakye-leaf.jpg',
    featured: true,
    options: [],
  },
  {
    name: 'Rice Ball with Groundnut Soup',
    slug: 'rice-ball-with-groundnut-soup',
    category: 'rice-dishes',
    price: 38,
    description: 'A hand-formed rice ball with smooth groundnut soup.',
    image: '/brand/food/jollof-rice-stew.jpg',
    featured: false,
    options: [
      {
        name: 'Protein',
        type: 'single',
        required: false,
        options: [{ label: 'Chicken', price_delta: 0 }, { label: 'Goat meat', price_delta: 7 }],
      },
    ],
  },
  {
    name: 'Kenkey with Fried Fish',
    slug: 'kenkey-with-fried-fish',
    category: 'local-favourites',
    price: 30,
    description: 'Soft Fante kenkey with fried fish, pepper and onion.',
    image: '/brand/food/kenkey.jpg',
    featured: true,
    options: [
      { name: 'Fish', type: 'single', required: false, options: [{ label: 'Tilapia', price_delta: 0 }, { label: 'Mackerel', price_delta: 0 }] },
    ],
  },
  {
    name: 'Jollof Rice with Grilled Fish',
    slug: 'jollof-rice-with-grilled-fish',
    category: 'local-favourites',
    price: 48,
    description: 'Jollof rice served with grilled tilapia and fresh vegetables.',
    image: '/brand/food/jollof-rice-bowl.jpg',
    featured: true,
    options: [],
  },
  {
    name: 'Beans, Plantain and Gari',
    slug: 'beans-plantain-and-gari',
    category: 'sides-and-extras',
    price: 22,
    description: 'Red-red: beans, fried ripe plantain and gari in palm oil.',
    image: '/brand/food/beans-plantain-gari.jpg',
    featured: false,
    options: [],
  },
  {
    name: 'Smoked Fish',
    slug: 'smoked-fish',
    category: 'sides-and-extras',
    price: 28,
    description: 'Smoked fish with pepper sauce — add it to any dish.',
    image: '/brand/food/smoked-fish.jpg',
    featured: false,
    options: [],
  },
  {
    name: 'Palm Wine',
    slug: 'palm-wine',
    category: 'drinks',
    price: 10,
    description: 'Naturally fermented palm wine, served cold.',
    image: '/brand/food/palm-wine.jpg',
    featured: false,
    options: [],
  },
  {
    name: 'Sobolo',
    slug: 'sobolo',
    category: 'drinks',
    price: 12,
    description: 'Hibiscus drink, sweetened and served chilled.',
    image: '/brand/banners/category-drinks-800x800.jpg',
    featured: false,
    options: [],
  },
  {
    name: 'Water',
    slug: 'water',
    category: 'drinks',
    price: 5,
    description: 'A 500ml bottle of still water.',
    image: '/brand/banners/category-drinks-800x800.jpg',
    featured: false,
    options: [],
  },
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
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, 0, $8::jsonb)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             price = EXCLUDED.price,
             image_url = EXCLUDED.image_url,
             is_featured = EXCLUDED.is_featured,
             custom_options = EXCLUDED.custom_options`,
      [
        categoryIds.get(item.category) ?? null,
        item.name,
        item.slug,
        item.description,
        item.price.toFixed(2),
        item.image,
        item.featured,
        JSON.stringify(item.options || []),
      ]
    );
    count += 1;
  }
  logger.info(`Seeded ${count} menu items.`);

  // ------------------------------------------------------------ admin ----
  if (env.bootstrapAdminEmail && env.bootstrapAdminPassword) {
    const email = env.bootstrapAdminEmail.trim().toLowerCase();
    const hash = await bcrypt.hash(env.bootstrapAdminPassword, env.bcryptRounds);
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
