-- Run in Supabase SQL Editor

-- 1. Add the column
ALTER TABLE products ADD COLUMN IF NOT EXISTS menu_added_date DATE;

-- 2. Backfill the ~45 products Jennie confirmed are new (set to today so they show for 7 days)
UPDATE products SET menu_added_date = CURRENT_DATE
WHERE name IN (
  '1937 | Durban Z | 3.5g | Flower',
  'Aeterna | Cirtrus Sap | 1g | Resin Badder',
  'Alchemy Pure | Double OG Chem | .7g | Flower',
  'Alchemy Pure | Grape Bubblegum | 3.5g | Hash Infused Flower',
  'Alchemy Pure | Island Mountain Headband | .7g | Flower',
  'Ayrloom | Sour Raspberry Lemonade 1:1:1 | 10pk Gummy | 100mg',
  'Bison Botanics | Funk Juice | 1g | Live Rosin',
  'Bison Botanics | Nana Glue  | 1g | Ice Water Hash',
  'Bison Botanics | Nana Glue | 1g | Live Rosin',
  'Bison Botanics | Ocean Fruit | 1g | Live Rosin',
  'Boukét | INDOOR | Crunch Berrys | 7g | Flower',
  'Boukét | INDOOR | Thai Orchid | 7g | Flower',
  'Dogwalkers | Classics | Lemon Fresh | .35g | 12pk | Preroll',
  'Dragonfly | Breakfast In Bed | 3.5g | Flower',
  'Dragonfly | Honeyglaze | 3.5g | Flower',
  'Dragonfly | Queen Of Diamonds | 3.5g | Flower',
  'Dragonfly | Sour Garlic | 28g | Flower',
  'Edie Parker | Good Afternoon | Lemon Watermelon | 1g | Cartridge',
  'Edie Parker | Good Morning | Le Freak | 1g | Cartridge',
  'Edie Parker | Good Night | Strawberry Crush | 1g | Cartridge',
  'Hudson Cannabis | Blue Haze | 28g | Flower',
  'Hudson Cannabis | Iced Sangria | 28g | Flower',
  'Hudson Cannabis | Snow Dog | 28g | Flower',
  'Ithaca Organics | Lilac Diesel | 3.5g | Flower',
  'Lowell Smokes | 35''s | Subway Sesh | .35g | 20pk | Prerolls',
  'MFNY | Candy Rain | Live Resin | 1g | Cartridge',
  'MFNY | Sour Tangerine x The Belafonte | 10pk Live Rosin Gummy | 100mg',
  'MFNY | UK Cheese | 1g | Live Resin Badder',
  'MFNY | UK Cheese | Live Resin | 1g | All-In-One',
  'Naka | Black Maple | 3.5g | Flower',
  'Naka | Pink Certz | 3.5g | Flower',
  'Naka | Zlushi | 3.5g | Flower',
  'Nyce | White Apple Runtz | 1g | Live Rosin',
  'Olio | Rainbow Yumbrella | 1g | Live Rosin',
  'REDO | Indoor | Cashmere Thoughts | 3.5g | Flower',
  'Rolling Green | Biscotti | 3.5g | Flower',
  'Ruby Farms | Sour Diesel | .5g | 2pk | Hash Infused Doobies',
  'Rythm | Lemon Fresh | 28g | Flower',
  'Rythm | REMIX | Maui Waui | .5g | 5pk Infused Preroll',
  'Rythm | REMIX | Pineapple Express | .5g | 5pk Infused Preroll',
  'Select Essentials | BRIQ | Cantaloupe Crush | 2g | All-In-One',
  'Select Essentials | BRIQ | Super Sour Diesel | 2g | All-In-One',
  'Select Essentials | BRIQ | Trainwreck | 2g | All-In-One',
  'THERAPY | Double Grape | .5g | 2pk | Preroll',
  'THERAPY | Honey Face | .5g | 2pk | Infused Preroll'
);
