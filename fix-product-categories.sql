-- Fix product categories — run in Supabase SQL Editor
-- Fixes: prerolls in Flower, typos, singular→plural, missing categories

-- 1. Fix typo: "Accesories" → "Accessories"
UPDATE products SET category = 'Accessories' WHERE category = 'Accesories';

-- 2. Normalize singular → plural and rename Vapor
UPDATE products SET category = 'Concentrates' WHERE category = 'Concentrate';
UPDATE products SET category = 'Tinctures' WHERE category = 'Tincture';
UPDATE products SET category = 'Topicals' WHERE category = 'Topical';
UPDATE products SET category = 'Vaporizers' WHERE category = 'Vapor';

-- 3. Extract Pre-Rolls from Flower (the big one!)
UPDATE products SET category = 'Pre-Rolls'
WHERE category = 'Flower'
  AND (
    lower(name) LIKE '%preroll%'
    OR lower(name) LIKE '%pre-roll%'
    OR lower(name) LIKE '%pre roll%'
    OR lower(name) LIKE '%joint%'
    OR lower(name) LIKE '%blunt%'
    OR lower(name) LIKE '%infused roll%'
    OR lower(name) LIKE '%dog walker%'
    OR lower(name) LIKE '%cannagar%'
    OR lower(name) LIKE '%mini roll%'
    OR lower(name) LIKE '%moon rock roll%'
    OR lower(name) LIKE '%slugger%'
    OR lower(name) LIKE '% pack%'
  );

-- 4. Fix Concentrates that may be in wrong categories
UPDATE products SET category = 'Concentrates'
WHERE category NOT IN ('Concentrates', 'Pre-Rolls')
  AND (
    lower(name) LIKE '%wax%'
    OR lower(name) LIKE '%shatter%'
    OR lower(name) LIKE '%rosin%'
    OR lower(name) LIKE '%resin%'
    OR lower(name) LIKE '%badder%'
    OR lower(name) LIKE '%budder%'
    OR lower(name) LIKE '%crumble%'
    OR lower(name) LIKE '%sauce%'
    OR lower(name) LIKE '%diamond%'
    OR lower(name) LIKE '%hash%'
    OR lower(name) LIKE '%kief%'
    OR lower(name) LIKE '%dab%'
  );

-- 5. Fix Vaporizers in wrong categories
UPDATE products SET category = 'Vaporizers'
WHERE category NOT IN ('Vaporizers', 'Pre-Rolls', 'Concentrates')
  AND (
    lower(name) LIKE '%vape%'
    OR lower(name) LIKE '%cartridge%'
    OR lower(name) LIKE '%cart %'
    OR lower(name) LIKE '% pod%'
    OR lower(name) LIKE '%510%'
    OR lower(name) LIKE '%disposable%'
  );

-- 6. Fix Beverages from Edibles
UPDATE products SET category = 'Beverages'
WHERE category = 'Edibles'
  AND (
    lower(name) LIKE '%beverage%'
    OR lower(name) LIKE '%drink%'
    OR lower(name) LIKE '%soda%'
    OR lower(name) LIKE '%seltzer%'
    OR lower(name) LIKE '%sparkling%'
    OR lower(name) LIKE '%elixir%'
    OR lower(name) LIKE '%tonic%'
  );

-- 7. Fix NULLs based on name keywords
UPDATE products SET category = 'Pre-Rolls'
WHERE category IS NULL AND (lower(name) LIKE '%preroll%' OR lower(name) LIKE '%pre-roll%' OR lower(name) LIKE '%joint%' OR lower(name) LIKE '%blunt%' OR lower(name) LIKE '%slugger%');

UPDATE products SET category = 'Concentrates'
WHERE category IS NULL AND (lower(name) LIKE '%concentrate%' OR lower(name) LIKE '%wax%' OR lower(name) LIKE '%shatter%' OR lower(name) LIKE '%rosin%' OR lower(name) LIKE '%resin%' OR lower(name) LIKE '%hash%' OR lower(name) LIKE '%kief%');

UPDATE products SET category = 'Vaporizers'
WHERE category IS NULL AND (lower(name) LIKE '%vape%' OR lower(name) LIKE '%cartridge%' OR lower(name) LIKE '%cart %' OR lower(name) LIKE '%510%');

UPDATE products SET category = 'Edibles'
WHERE category IS NULL AND (lower(name) LIKE '%gummy%' OR lower(name) LIKE '%gummies%' OR lower(name) LIKE '%chocolate%' OR lower(name) LIKE '%edible%' OR lower(name) LIKE '%candy%');

UPDATE products SET category = 'Flower'
WHERE category IS NULL AND (lower(name) LIKE '%flower%' OR lower(name) LIKE '%bud%' OR lower(name) LIKE '%eighth%' OR lower(name) LIKE '%quarter%' OR lower(name) LIKE '%half oz%' OR lower(name) LIKE '%ounce%');

UPDATE products SET category = 'Tinctures'
WHERE category IS NULL AND (lower(name) LIKE '%tincture%' OR lower(name) LIKE '%rso%' OR lower(name) LIKE '%capsule%');

UPDATE products SET category = 'Topicals'
WHERE category IS NULL AND (lower(name) LIKE '%topical%' OR lower(name) LIKE '%balm%' OR lower(name) LIKE '%cream%' OR lower(name) LIKE '%lotion%' OR lower(name) LIKE '%patch%');

-- 8. Any remaining NULLs → Uncategorized
UPDATE products SET category = 'Uncategorized' WHERE category IS NULL;

-- 9. Verify results
SELECT category, count(*) as cnt FROM products WHERE is_active = true GROUP BY category ORDER BY category;
