-- Consolidate the Exhibition Hub's product categories down to the six
-- canonical groups used for exhibitor onboarding and the hub's category
-- dropdown/filter. The legacy granular taxonomy (Cement & Concrete,
-- Reinforcement & Steel, etc.) is renamed into the six groups and the
-- surplus terms are deactivated (kept, not deleted, so artwork survives).
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0056_product_category_consolidation.sql
-- Run statement-by-statement.

UPDATE taxonomy_term SET name = 'Building Materials', sort_order = 0
WHERE kind = 'product_category' AND name = 'Cement & Concrete';

UPDATE taxonomy_term SET name = 'Construction Equipment & Machinery', sort_order = 1
WHERE kind = 'product_category' AND name = 'Paints & Finishes';

UPDATE taxonomy_term SET name = 'Tools & Hardware', sort_order = 2
WHERE kind = 'product_category' AND name = 'Tools & Hardware';

UPDATE taxonomy_term SET name = 'Safety (PPE)', sort_order = 3
WHERE kind = 'product_category' AND name = 'Safety & PPE';

UPDATE taxonomy_term SET name = 'Building Services (Electrical, Plumbing, HVAC, Fire Protection)', sort_order = 4
WHERE kind = 'product_category' AND name = 'Electrical & Lighting';

UPDATE taxonomy_term SET name = 'Interior, Exterior & Landscaping', sort_order = 5
WHERE kind = 'product_category' AND name = 'Tiles & Flooring';

UPDATE taxonomy_term SET active = false
WHERE kind = 'product_category'
  AND name IN (
    'Reinforcement & Steel',
    'Blocks & Bricks',
    'Roofing & Waterproofing',
    'Doors, Windows & Glazing',
    'Plumbing & Water Systems',
    'HVAC'
  );