-- ---------------------------------------------------------------------------
-- 006_catalogue_reconciliation.sql
-- Bring an existing database back inside the client's five-category catalogue.
--
-- This is deliberately a *reconciliation*, not a hard-coded delete list:
--   * any category outside Banku, Fufu, Omotuo, Kokonte and Rice dishes is
--     deactivated (never deleted, so rows that old receipts point at remain);
--   * any dish that is orphaned, sits in an unrelated category, carries one of
--     the explicitly excluded standalone product names, or has no confirmed
--     positive price is removed from the ACTIVE catalogue;
--   * no menu row and no order row is deleted. Order items already carry
--     name/price snapshots, and the live dish rows are kept for reference.
--
-- The seed applies the same rules, so re-seeding cannot reintroduce an
-- unrelated product. The application services enforce them for new writes.
-- ---------------------------------------------------------------------------

UPDATE categories
   SET is_active = false
 WHERE slug <> ALL (ARRAY[
   'banku', 'fufu', 'omotuo', 'kokonte', 'rice-dishes'
 ]::text[]);

UPDATE menu_items mi
   SET is_available = false,
       is_featured  = false
 WHERE mi.category_id IS NULL
    OR mi.category_id IN (
         SELECT id FROM categories
          WHERE slug <> ALL (ARRAY[
            'banku', 'fufu', 'omotuo', 'kokonte', 'rice-dishes'
          ]::text[])
       )
    OR mi.price <= 0
    OR lower(mi.name) ~* '(kenkey|waakye|kelewele|pizza|burger|noodles?|spaghetti|sobolo|palm wine|bottled water)';

-- A dish that is not purchasable must not be advertised as featured.
UPDATE menu_items
   SET is_featured = false
 WHERE is_available = false;
