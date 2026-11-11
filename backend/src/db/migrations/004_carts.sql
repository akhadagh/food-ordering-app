-- ---------------------------------------------------------------------------
-- 004_carts.sql
-- Server-side carts.
--
-- The original application kept the cart in localStorage only, so it was lost
-- across devices and never validated against live menu prices (audit finding
-- P1-10 / P2-14). The server now owns the cart and every price in it.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS carts (
  id         serial PRIMARY KEY,
  user_id    integer     REFERENCES users (id) ON DELETE CASCADE,
  -- A guest cart is identified by an opaque token in an httpOnly cookie.
  guest_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One open cart per signed-in user, one per guest token.
CREATE UNIQUE INDEX IF NOT EXISTS carts_user_id_uidx ON carts (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS carts_guest_token_uidx ON carts (guest_token) WHERE guest_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS cart_items (
  id                   serial PRIMARY KEY,
  cart_id              integer     NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  menu_item_id         integer     NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
  quantity             integer     NOT NULL CHECK (quantity > 0),
  custom_options       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  special_instructions text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON cart_items (cart_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'carts_set_updated_at') THEN
    CREATE TRIGGER carts_set_updated_at BEFORE UPDATE ON carts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'cart_items_set_updated_at') THEN
    CREATE TRIGGER cart_items_set_updated_at BEFORE UPDATE ON cart_items
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
