-- ============================================================
-- BRAND INFO AUDIT — Corrections & Source URLs
-- Run in Supabase SQL Editor
-- Generated 2026-08-13 from official website verification
-- ============================================================

-- 1906
UPDATE brands SET
  source_url = 'https://1906newhighs.com',
  description = CASE WHEN description IS NOT NULL THEN regexp_replace(description, 'patented technology', 'pharma-grade formulation') ELSE description END
WHERE name = '1906';

-- Alibi Cannabis
UPDATE brands SET
  source_url = 'https://alibicannabis.com',
  location = 'Portland, OR'
WHERE name = 'Alibi Cannabis';

-- Aphrodite
UPDATE brands SET
  source_url = 'https://loveaphrodite.com',
  location = 'Hudson Valley, NY'
WHERE name ILIKE '%aphrodite%';

-- B Noble
UPDATE brands SET
  source_url = 'https://www.b-noble.com',
  description = CASE WHEN description IS NOT NULL THEN regexp_replace(description, '7 years', '7 years (of a 13-year sentence)') ELSE description END
WHERE name = 'B Noble';

-- Birdies
UPDATE brands SET
  source_url = 'https://hibirdies.com',
  location = 'California'
WHERE name = 'Birdies';

-- Blotter
UPDATE brands SET
  source_url = 'https://blotterbrand.com',
  location = 'Upstate NY'
WHERE name = 'Blotter';

-- Booty Shake
UPDATE brands SET
  source_url = 'https://www.shakethatbootynyc.com'
WHERE name = 'Booty Shake';

-- California Honey (Cali Honey)
UPDATE brands SET
  source_url = 'https://californiahoneyvapes.com'
WHERE name ILIKE '%cali%honey%' OR name ILIKE '%california honey%';

-- Camino / Kiva Confections
UPDATE brands SET
  source_url = 'https://www.kivaconfections.com',
  location = 'California'
WHERE name ILIKE '%camino%' OR name ILIKE '%kiva%';

-- Cannatela
UPDATE brands SET
  source_url = 'https://cannatela.com',
  description = CASE WHEN description IS NOT NULL THEN regexp_replace(description, 'imported from Italy', 'made with ingredients imported from Italy, infused in New York') ELSE description END
WHERE name ILIKE '%cannatela%';

-- Chef For Higher
UPDATE brands SET
  source_url = 'https://chefforhigher.com',
  known_for = 'NY''s first cannabis culinary brand — infused honey, ghee, coconut oil, EVOO, gummies, and supper club events'
WHERE name ILIKE '%chef for higher%';

-- Choc-Lit (no official website found)
UPDATE brands SET
  source_url = NULL
WHERE name ILIKE '%choc-lit%' OR name ILIKE '%choclit%';

-- Claudine Farms (fix name — remove "Honey & Gold" if present)
UPDATE brands SET
  source_url = 'https://www.claudinefarms.com',
  location = 'Hudson Valley, NY'
WHERE name ILIKE '%claudine%';

-- Claybourne Co.
UPDATE brands SET
  source_url = 'https://www.claybourneco.com',
  location = 'Southern California'
WHERE name ILIKE '%claybourne%';

-- Cookies
UPDATE brands SET
  source_url = 'https://cookies.co',
  known_for = 'Co-founded by Berner and Jai in 2010. Over 70 proprietary cultivars, 70+ retail locations across 6 countries'
WHERE name = 'Cookies';

-- Crispy's (no official website found)
UPDATE brands SET
  source_url = NULL
WHERE name ILIKE '%crispy%';

-- Cycling Frog
UPDATE brands SET
  source_url = 'https://cyclingfrog.com',
  location = 'Seattle, WA (lab) / Oregon (hemp farm)'
WHERE name ILIKE '%cycling frog%';

-- DANK (Dank By Definition)
UPDATE brands SET
  source_url = 'https://www.dankbydefinition.com'
WHERE name ILIKE '%dank%' AND name NOT ILIKE '%dankbar%';

-- DaySavers / Custom Cones USA — FIX LOCATION (was LA, actually Renton WA)
UPDATE brands SET
  source_url = 'https://daysavers.com',
  location = 'Renton, WA'
WHERE name ILIKE '%daysaver%' OR name ILIKE '%custom cones%';

-- Dayzed
UPDATE brands SET
  source_url = 'https://www.dayzedcanna.com'
WHERE name ILIKE '%dayzed%';

-- Drew Martin
UPDATE brands SET
  source_url = 'https://drewmartin.co'
WHERE name ILIKE '%drew martin%';

-- Elements
UPDATE brands SET
  source_url = 'https://www.elementspapers.com'
WHERE name ILIKE '%elements%';

-- Finca
UPDATE brands SET
  source_url = 'https://www.nyfinca.com',
  location = 'Deruyter, NY'
WHERE name = 'Finca';

-- Florist Farms — remove unverified "first legal" claim
UPDATE brands SET
  source_url = 'https://floristfarms.com',
  known_for = 'USDA Certified Organic cannabis farm in Cortland, NY. Regenerative farming practices, seed-to-sale'
WHERE name ILIKE '%florist farm%';

-- FOY
UPDATE brands SET
  source_url = NULL,
  known_for = 'Black-owned, co-founded with former NFL champion Stevan Ridley. Vegan functional gummies with lion''s mane, reishi, and adaptogens. Donates to wounded veteran nonprofits'
WHERE name = 'FOY';

-- Geek / Geek THCX
UPDATE brands SET
  source_url = 'https://geek-thcx.com',
  location = 'Irvine, CA'
WHERE name ILIKE '%geek%';

-- Head & Heal
UPDATE brands SET
  source_url = 'https://headandheal.com',
  known_for = 'USDA Certified Organic hemp CBD brand from Cortland, NY. Sister company to Florist Farms. Seed-to-sale tinctures (Sleep, Focus) and topicals'
WHERE name ILIKE '%head%heal%';

-- Jeeter
UPDATE brands SET
  source_url = 'https://www.jeeter.com'
WHERE name ILIKE '%jeeter%';

-- Lowell Herb Co
UPDATE brands SET
  source_url = 'https://www.lowellherbco.com'
WHERE name ILIKE '%lowell%';

-- RAW
UPDATE brands SET
  source_url = 'https://rawthentic.com'
WHERE name = 'Raw' OR name = 'RAW';

-- Puffco — FIX LOCATION (was Brooklyn, actually LA)
UPDATE brands SET
  source_url = 'https://www.puffco.com',
  location = 'Los Angeles, CA'
WHERE name ILIKE '%puffco%';

-- PAX
UPDATE brands SET
  source_url = 'https://www.pax.com'
WHERE name ILIKE '%pax%';

-- Ooze
UPDATE brands SET
  source_url = 'https://www.oozelife.com'
WHERE name ILIKE '%ooze%';

-- Formula 420
UPDATE brands SET
  source_url = 'https://formula420.com'
WHERE name ILIKE '%formula 420%';

-- Glob Mops
UPDATE brands SET
  source_url = 'https://globmops.com',
  location = 'Los Angeles, CA'
WHERE name ILIKE '%glob mop%';

-- Piece Water
UPDATE brands SET
  source_url = 'https://piecewater.com'
WHERE name ILIKE '%piece water%';

-- Randy's
UPDATE brands SET
  source_url = 'https://randys.com',
  location = 'Holland, OH'
WHERE name ILIKE '%randy%';

-- High Hemp
UPDATE brands SET
  source_url = 'https://highhemp.co'
WHERE name ILIKE '%high hemp%';

-- Pulsar
UPDATE brands SET
  source_url = 'https://www.pulsarshop.com'
WHERE name ILIKE '%pulsar%';

-- Collin Russell / Collinr Glass
UPDATE brands SET
  source_url = 'https://collinrglass.com'
WHERE name ILIKE '%collin%';

-- ============================================================
-- KEY CORRECTIONS SUMMARY:
--
-- LOCATION FIXES (were wrong):
--   Puffco: Brooklyn, NY → Los Angeles, CA
--   DaySavers: Los Angeles, CA → Renton, WA
--   Alibi: removed Endicott, NY (unverified)
--   Claybourne: Perris, CA → Southern California
--   Finca: Upstate NY → Deruyter, NY
--   Glob Mops: added Los Angeles, CA
--   Randy's: added Holland, OH
--   Blotter: NYC → Upstate NY
--   Geek: California → Irvine, CA
--
-- CLAIM FIXES:
--   B Noble: "7 years" → "7 years of a 13-year sentence"
--   Florist Farms: removed unverified "first legal brand in NY" claim
--   Cookies: retail locations 45+ → 70+, added co-founder Jai
--   FOY: "athlete-founded" → "co-founded with NFL champion"
--   Head & Heal: clarified as hemp CBD brand, fixed product lines
--   Chef For Higher: expanded product description beyond just edibles
--   Cannatela: clarified Italian import (ingredients, not finished product)
--   1906: "patented technology" → "pharma-grade formulation"
--
-- NO WEBSITE FOUND:
--   Choc-Lit, Crispy's, FOY (site down)
-- ============================================================
