-- ---------------------------------------------------------------------------
-- 002_payment_status.sql
-- Payment state is INDEPENDENT of order state (audit finding P1-07).
--
-- An order can be confirmed but unpaid, delivered then refunded, or
-- cancelled after payment. Without these columns none of those states can be
-- represented, and revenue reporting cannot separate order volume from money
-- actually collected.
--
-- Every column is ADDITIVE - nothing is dropped or retyped.
-- ---------------------------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_provider text;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_reference text;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_channel text;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_amount numeric(12,2);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_failure_reason text;

-- Constrain the payment state. Added as a NOT VALID constraint first so it
-- can be attached to an existing table without a long table lock, then
-- validated.
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending','pending_cod','authorized','paid','failed','refunded'));

-- Partial index: the admin order list filters by status and payment_status.
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders (payment_status);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_reference_idx ON orders (payment_reference)
  WHERE payment_reference IS NOT NULL;

-- A payment reference must be unique so a provider callback can never be
-- applied to two different orders.
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_uidx
  ON orders (payment_reference)
  WHERE payment_reference IS NOT NULL;

-- menu_items ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS menu_items_category_id_idx ON menu_items (category_id);
CREATE INDEX IF NOT EXISTS menu_items_available_idx ON menu_items (is_available) WHERE is_available;
CREATE INDEX IF NOT EXISTS menu_items_featured_idx ON menu_items (is_featured) WHERE is_featured;

-- order_items --------------------------------------------------------------
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_menu_item_id_idx ON order_items (menu_item_id);

-- order_status_history -----------------------------------------------------
CREATE INDEX IF NOT EXISTS order_status_history_order_id_idx
  ON order_status_history (order_id, created_at DESC);

-- promos -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS promos_active_idx ON promos (is_active) WHERE is_active;
