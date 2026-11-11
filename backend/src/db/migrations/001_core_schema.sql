-- ---------------------------------------------------------------------------
-- 001_core_schema.sql
-- Core Afia Food Hub schema.
--
-- Reconstructed from the recovered production schema (see ARCHITECTURE.md
-- §4.2) and rebuilt cleanly. Every statement is idempotent so the migration
-- can be re-run safely against a partially migrated database.
-- ---------------------------------------------------------------------------

-- users ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              serial PRIMARY KEY,
  name            text        NOT NULL,
  email           text        NOT NULL,
  phone           text,
  address         text,
  role            text        NOT NULL DEFAULT 'customer',
  password_hash   text        NOT NULL,
  email_verified  boolean     NOT NULL DEFAULT false,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness: "Kwame@x.com" and "kwame@x.com" are one user.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (lower(email));

-- categories ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          serial PRIMARY KEY,
  name        text        NOT NULL,
  slug        text        NOT NULL,
  description text,
  image_url   text,
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_uidx ON categories (slug);

-- menu_items ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_items (
  id             serial PRIMARY KEY,
  category_id    integer     REFERENCES categories (id) ON DELETE SET NULL,
  name           text        NOT NULL,
  slug           text        NOT NULL,
  description    text,
  price          numeric(12,2) NOT NULL CHECK (price >= 0),
  image_url      text,
  is_available   boolean     NOT NULL DEFAULT true,
  is_featured    boolean     NOT NULL DEFAULT false,
  stock_quantity integer     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  -- Structured customisation options:
  --   [{ "name": "Protein", "type": "single", "required": true,
  --      "options": [{ "label": "Goat meat", "price_delta": 5.00 }] }]
  custom_options jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_items_slug_uidx ON menu_items (slug);

-- promos -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promos (
  id             serial PRIMARY KEY,
  code           text        NOT NULL,
  discount_type  text        NOT NULL DEFAULT 'percentage'
                             CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value >= 0),
  min_order      numeric(12,2) NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  max_discount   numeric(12,2) CHECK (max_discount IS NULL OR max_discount >= 0),
  max_uses       integer     CHECK (max_uses IS NULL OR max_uses > 0),
  used_count     integer     NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active      boolean     NOT NULL DEFAULT true,
  expires_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS promos_code_upper_uidx ON promos (upper(code));

-- orders -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                serial PRIMARY KEY,
  user_id           integer     NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status            text        NOT NULL DEFAULT 'placed'
                                CHECK (status IN ('placed','confirmed','preparing','ready',
                                                 'out_for_delivery','delivered','cancelled')),
  subtotal          numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  delivery_fee      numeric(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  discount          numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total             numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  promo_code_id     integer     REFERENCES promos (id) ON DELETE SET NULL,
  promo_code        text,
  delivery_address  text        NOT NULL,
  delivery_notes    text,
  customer_phone    text        NOT NULL,
  fulfilment_type   text        NOT NULL DEFAULT 'delivery'
                                CHECK (fulfilment_type IN ('delivery', 'pickup')),
  payment_method    text        NOT NULL,
  estimated_delivery timestamptz,
  cancellation_reason text,
  -- A client-supplied key that makes checkout idempotent: submitting the
  -- same checkout twice returns the original order instead of creating a
  -- duplicate.
  idempotency_key   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_uidx
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- order_items --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id                   serial PRIMARY KEY,
  order_id             integer     NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  menu_item_id         integer     REFERENCES menu_items (id) ON DELETE SET NULL,
  -- Name and price are SNAPSHOTS taken from menu_items at order time, so a
  -- later menu edit never rewrites the customer's receipt.
  name                 text        NOT NULL,
  quantity             integer     NOT NULL CHECK (quantity > 0),
  price                numeric(12,2) NOT NULL CHECK (price >= 0),
  -- [{ "option": "Protein", "value": "Goat meat", "price_delta": 5.00 }]
  custom_options       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  special_instructions text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- order_status_history -----------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
  id         serial PRIMARY KEY,
  order_id   integer     NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  status     text        NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
