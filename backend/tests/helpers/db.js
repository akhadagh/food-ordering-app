/**
 * Database helpers for the integration suite.
 *
 * The schema and the reference menu are seeded by the real seed script; the
 * helpers here reset the mutable tables and install a small, controlled
 * fixture set so every assertion can name an exact price.
 */
import { query } from '../../src/config/db.js';
import { hashPassword } from '../../src/utils/password.js';

export const ADMIN_EMAIL = 'admin.test@afiafoodhub.test';
export const ADMIN_PASSWORD = 'Test-Admin-2026';

const MUTABLE_TABLES = [
  'order_status_history',
  'order_items',
  'cart_items',
  'carts',
  'orders',
  'promos',
  'auth_tokens',
  'login_attempts',
  'users',
  'menu_items',
  'categories',
];

export const CATEGORIES = [
  {
    id: 1,
    name: 'Banku',
    slug: 'banku',
    description: 'Fermented maize and cassava dough.',
    sort_order: 1,
  },
  {
    id: 2,
    name: 'Fufu',
    slug: 'fufu',
    description: 'Pounded cassava and plantain.',
    sort_order: 2,
  },
  {
    id: 3,
    name: 'Rice dishes',
    slug: 'rice-dishes',
    description: 'Jollof, fried rice and rice with stew.',
    sort_order: 3,
  },
  {
    id: 4,
    name: 'Omotuo',
    slug: 'omotuo',
    description: 'Rice balls with soup.',
    sort_order: 4,
  },
  {
    id: 5,
    name: 'Kokonte',
    slug: 'kokonte',
    description: 'Dried cassava flour pudding.',
    sort_order: 5,
  },
];

export const MENU_ITEMS = [
  {
    id: 1,
    category_id: 1,
    name: 'Banku with Okra Soup',
    slug: 'banku-with-okra-soup',
    description: 'Soft fermented banku with okra stew.',
    price: '35.00',
    is_available: true,
    is_featured: true,
    stock_quantity: 0,
    custom_options: [
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
    ],
  },
  {
    id: 2,
    category_id: 1,
    name: 'Banku with Grilled Tilapia',
    slug: 'banku-with-grilled-tilapia',
    description: 'Grilled tilapia with banku.',
    price: '45.00',
    is_available: true,
    is_featured: false,
    stock_quantity: 2,
    custom_options: [
      {
        name: 'Tilapia size',
        type: 'single',
        required: true,
        options: [
          { label: 'Medium', price_delta: 0 },
          { label: 'Large', price_delta: 10 },
        ],
      },
    ],
  },
  {
    id: 3,
    category_id: 2,
    name: 'Fufu with Light Soup',
    slug: 'fufu-with-light-soup',
    description: 'Fufu with light soup.',
    price: '40.00',
    is_available: true,
    is_featured: true,
    stock_quantity: 0,
    custom_options: [
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
    id: 4,
    category_id: 5,
    name: 'Kokonte with Groundnut Soup',
    slug: 'kokonte-with-groundnut-soup',
    description: 'Kokonte with groundnut soup.',
    price: '0.00',
    is_available: false,
    is_featured: false,
    stock_quantity: 0,
    custom_options: [
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
    id: 5,
    category_id: 3,
    name: 'Jollof Rice',
    slug: 'jollof-rice',
    description: 'Smoky Ghanaian jollof rice.',
    price: '40.00',
    is_available: true,
    is_featured: true,
    stock_quantity: 0,
    custom_options: [
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
    id: 6,
    category_id: 3,
    name: 'Ghanaian Fried Rice',
    slug: 'fried-rice',
    description: 'Ghanaian-style fried rice.',
    price: '10.00',
    is_available: true,
    is_featured: false,
    stock_quantity: 0,
    custom_options: [],
  },
];

/** Empty every mutable table and install the fixture menu. */
export async function resetDatabase() {
  await query(`TRUNCATE ${MUTABLE_TABLES.join(', ')} RESTART IDENTITY CASCADE`);

  for (const category of CATEGORIES) {
    await query(
      `INSERT INTO categories (id, name, slug, description, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [category.id, category.name, category.slug, category.description, category.sort_order]
    );
  }

  for (const item of MENU_ITEMS) {
    await query(
      `INSERT INTO menu_items
         (id, category_id, name, slug, description, price, image_url, is_available,
          is_featured, stock_quantity, custom_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
      [
        item.id,
        item.category_id,
        item.name,
        item.slug,
        item.description,
        item.price,
        `/brand/food/${item.slug}.jpg`,
        item.is_available,
        item.is_featured,
        item.stock_quantity,
        JSON.stringify(item.custom_options),
      ]
    );
  }

  // The administrator. The suite truncates the users table between files,
  // so the account the global setup seeded is restored here.
  await query(
    `INSERT INTO users (name, email, role, password_hash, email_verified, is_active)
     VALUES ('Test Administrator', $1, 'admin', $2, true, true)`,
    [ADMIN_EMAIL, await hashPassword(ADMIN_PASSWORD)]
  );

  // The fixtures carry explicit ids, so the sequences have to be moved past
  // them - otherwise the first dish the administrator creates collides with
  // the fixture and the API answers 500.
  await query(`SELECT setval(pg_get_serial_sequence('menu_items', 'id'), (SELECT MAX(id) FROM menu_items))`);
  await query(`SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT MAX(id) FROM categories))`);
}

/** The dish ids the assertions refer to. */
export const ITEM = {
  bankuOkra: 1,
  bankuTilapia: 2,
  fufuLight: 3,
  kokonteGroundnut: 4,
  jollof: 5,
  friedRice: 6,
};

export const price = (value) => Number(value);
