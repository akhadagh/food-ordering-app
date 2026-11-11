-- ---------------------------------------------------------------------------
-- 003_auth_hardening.sql
-- Brute-force protection and account lifecycle (audit findings P1-01, P1-05).
-- ---------------------------------------------------------------------------

-- Track failed sign-in attempts per account so the lockout survives a
-- serverless restart (an in-memory counter would not).
CREATE TABLE IF NOT EXISTS login_attempts (
  id           serial PRIMARY KEY,
  identifier   text        NOT NULL,
  ip_address   text,
  successful   boolean     NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx
  ON login_attempts (identifier, attempted_at DESC);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx
  ON login_attempts (ip_address, attempted_at DESC);

-- Single-use tokens for email verification and password reset.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         serial PRIMARY KEY,
  user_id    integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text        NOT NULL,
  purpose    text        NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_token_hash_uidx ON auth_tokens (token_hash);
CREATE INDEX IF NOT EXISTS auth_tokens_user_purpose_idx ON auth_tokens (user_id, purpose);

-- The users table in the recovered production schema had no role constraint,
-- so a client-supplied role could be written directly. Add one.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin'));

-- Guarantee updated_at is maintained by the database.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_set_updated_at') THEN
    CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'menu_items_set_updated_at') THEN
    CREATE TRIGGER menu_items_set_updated_at BEFORE UPDATE ON menu_items
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orders_set_updated_at') THEN
    CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'categories_set_updated_at') THEN
    CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'promos_set_updated_at') THEN
    CREATE TRIGGER promos_set_updated_at BEFORE UPDATE ON promos
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
