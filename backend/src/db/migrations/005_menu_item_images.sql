-- ---------------------------------------------------------------------------
-- 005_menu_item_images.sql
-- Multiple photographs per dish.
--
-- A dish can have a gallery of images with an explicit order and one cover
-- image. The legacy `menu_items.image_url` column is kept as a denormalised
-- cover URL so existing queries and historical clients keep working; the
-- gallery table is the source of truth for the customer carousel and the
-- administration screen.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS menu_item_images (
  id           serial PRIMARY KEY,
  menu_item_id integer     NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
  url          text        NOT NULL,
  alt          text,
  sort_order   integer     NOT NULL DEFAULT 0,
  is_cover     boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_item_images_item_idx
  ON menu_item_images (menu_item_id, sort_order, id);
CREATE UNIQUE INDEX IF NOT EXISTS menu_item_images_item_url_uidx
  ON menu_item_images (menu_item_id, url);

-- At most one cover per dish.
CREATE UNIQUE INDEX IF NOT EXISTS menu_item_images_cover_uidx
  ON menu_item_images (menu_item_id)
  WHERE is_cover;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'menu_item_images_set_updated_at') THEN
    CREATE TRIGGER menu_item_images_set_updated_at BEFORE UPDATE ON menu_item_images
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Backfill the existing single photograph as the first cover image.
INSERT INTO menu_item_images (menu_item_id, url, alt, sort_order, is_cover)
SELECT mi.id, mi.image_url, mi.name, 0, true
  FROM menu_items mi
 WHERE mi.image_url IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM menu_item_images mii WHERE mii.menu_item_id = mi.id
   );
