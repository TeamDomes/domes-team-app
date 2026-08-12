-- Bulk brand profile updates for Domes Dispensary
-- Paste this entire block into Supabase SQL Editor and run it

-- 1906
UPDATE brands SET
  description = 'Named for the last year cannabis was widely accepted as medicine. 1906 makes fast-acting drops and pills using patented technology that activates within 20 minutes — the fastest edibles in the world.',
  location = 'Boulder, CO',
  known_for = 'Fast-acting cannabis drops and pills that activate in 20 minutes',
  product_types = 'Drops, pills, pouches',
  talking_points = ARRAY['Every product activates within 20 minutes using patented rapid-onset technology', 'All drops are calorie-free, gluten-free, and vegan — designed for swallowing, not chewing', 'Named for 1906, the last year cannabis was broadly accepted as beneficial medicine', 'Great for customers who want precise microdosing without the sugar of gummies']
WHERE name = '1906 Boost Pouch' AND (description IS NULL OR description = '');

-- Alibi
UPDATE brands SET
  description = 'Award-winning, woman-owned craft cannabis brand founded by cancer survivor Marianne Cursetjee in Portland, OR. Now grown in New York through a partnership with Nanticoke greenhouses in Endicott, NY.',
  location = 'Portland, OR / Endicott, NY',
  known_for = 'High-potency infused pre-rolls and all-in-one vapes',
  product_types = 'Infused pre-rolls, vapes, pre-roll variety packs',
  talking_points = ARRAY['Woman-owned brand founded by a cancer survivor who turned to cannabis for relief', 'Carried in over 50 dispensaries across New York', 'Known for bold flavors like peach, watermelon, and raspberry lemonade vapes', 'Strains include Cherry Diesel, Caramel Cream, and Dream Star']
WHERE name = 'Alibi' AND (description IS NULL OR description = '');

-- B Noble
UPDATE brands SET
  description = 'A cause-based cannabis brand created in collaboration with hip-hop legend Fab 5 Freddy and Bernard Noble, who spent 7 years in prison for possessing two joints. 10% of proceeds go to organizations advancing social equity.',
  location = 'New York, NY',
  known_for = 'Social equity mission — profits fund cannabis justice reform',
  product_types = 'Pre-rolls, flower',
  talking_points = ARRAY['Named after Bernard Noble, who was sentenced to 13 years for two joints worth of cannabis', 'Fab 5 Freddy, NYC filmmaker and hip-hop pioneer, is a co-founder', '10% of all sales go to local organizations fighting for cannabis justice', 'Partnered with The Bronx Defenders with a $25,000 donation for legal aid']
WHERE name = 'B Noble' AND (description IS NULL OR description = '');

-- Birdies
UPDATE brands SET
  description = 'Premium pre-roll brand from Santa Monica, California, now licensed in New York and Arizona. Founded by passionate cannabis connoisseurs focused on excellence and consistency.',
  location = 'Santa Monica, CA',
  known_for = 'Premium pre-rolls in indica, sativa, hybrid, and high-CBD varieties',
  product_types = 'Pre-rolls, flower',
  talking_points = ARRAY['Available in indica, sativa, hybrid, and light (high CBD) varieties', 'Top seller is the Sativa Classic Pre-Roll 10-Pack', 'Ranked in the top 15 pre-roll brands in California', 'Now licensed and available in New York']
WHERE name = 'Birdies' AND (description IS NULL OR description = '');

-- Blotter
UPDATE brands SET
  description = 'New York''s first homegrown legal cannabis concentrate brand. Inspired by underground psychedelia, crafted with precision.',
  location = 'New York, NY',
  known_for = 'Being NY''s first legal concentrate brand — curated cannabis concentrates',
  product_types = 'Concentrates, vapes, pre-rolls',
  talking_points = ARRAY['The first cannabis concentrate brand born in New York''s legal market', 'Consistently ranked in the top 10 concentrate brands in NY', 'Aesthetic inspired by underground psychedelia and counterculture', 'Great recommendation for customers looking for NY-made concentrates']
WHERE name = 'Blotter' AND (description IS NULL OR description = '');

-- Booty Shake
UPDATE brands SET
  description = 'New York''s favorite no-frills pre-roll brand. Disco-inspired cannabis at budget-friendly prices — big energy without the markup.',
  location = 'New York, NY',
  known_for = 'Budget-friendly, disco-inspired pre-rolls and pre-ground flower',
  product_types = 'Pre-rolls, pre-ground flower',
  talking_points = ARRAY['Great value option — high quality NY-made joints without the premium price', 'Also offers 14g pre-ground flower bags in strains like Ice Cream Swirl and Do Si Do', 'Fun disco-inspired branding that stands out on the shelf', 'Perfect recommendation for price-conscious customers who still want quality']
WHERE name = 'Booty Shake' AND (description IS NULL OR description = '');

-- Cali Honey
UPDATE brands SET
  description = 'Legacy vape brand dating back to 2014 that set the gold standard in cannabis culture. Uses natural cannabis-derived terpenes — never synthetic flavoring. Now based in NYC.',
  location = 'New York, NY (originally California)',
  known_for = 'Live resin and distillate vapes with natural cannabis terpenes',
  product_types = 'Disposable vapes, cartridges',
  talking_points = ARRAY['One of the original legacy cannabis vape brands, established 2014', 'Uses only natural cannabis-derived terpenes — no synthetic or food-grade flavorings', 'Free from fillers, PG/VG, and Vitamin E Acetate', 'Great beginner-friendly option for flavor-seekers']
WHERE name = 'Cali Honey' AND (description IS NULL OR description = '');

-- Camino
UPDATE brands SET
  description = 'Terpene-tailored gummies by Kiva Confections, one of the most trusted names in cannabis edibles. Each flavor is designed for a specific effect using natural terpene and cannabinoid blends.',
  location = 'Oakland, CA',
  known_for = 'Effect-driven gummies tailored with natural terpenes for specific experiences',
  product_types = 'Gummies, edibles',
  talking_points = ARRAY['Made by Kiva Confections, a leader in cannabis edibles since 2010', 'Each flavor uses a unique terpene blend designed for a specific mood or effect', 'Available in sativa, hybrid, and indica varieties with consistent dosing', 'One of the best-selling edible brands in the country']
WHERE name = 'Camino' AND (description IS NULL OR description = '');

-- Camino Chews
UPDATE brands SET
  description = 'Chewy taffy-style cannabis edibles by Kiva Confections. Individually wrapped with bold fruit flavors and terpene-tailored effects.',
  location = 'Oakland, CA',
  known_for = 'Taffy-style cannabis chews with fruit flavors and tailored effects',
  product_types = 'Chews, edibles',
  talking_points = ARRAY['Individually wrapped taffy-like pieces — convenient and discreet', 'Same terpene-tailoring technology as Camino gummies', 'Great texture alternative for customers who don''t love gummies', 'Made by Kiva Confections with consistent, reliable dosing']
WHERE name = 'Camino Chews' AND (description IS NULL OR description = '');

-- Camino Recovery
UPDATE brands SET
  description = 'Recovery-focused cannabis edibles by Kiva Confections, formulated to support rest and recuperation with targeted cannabinoid and terpene blends.',
  location = 'Oakland, CA',
  known_for = 'Recovery and rest-focused cannabis edibles',
  product_types = 'Gummies, edibles',
  talking_points = ARRAY['Designed specifically for post-activity recovery and restful sleep', 'Part of the Camino family by Kiva Confections', 'Uses targeted terpene blends for specific wellness effects', 'Great recommendation for active customers or those with sleep issues']
WHERE name = 'Camino Recovery' AND (description IS NULL OR description = '');

-- Camino Social
UPDATE brands SET
  description = 'Social-occasion cannabis gummies by Kiva Confections, designed with uplifting terpene blends perfect for hanging out and socializing.',
  location = 'Oakland, CA',
  known_for = 'Uplifting, social-occasion cannabis gummies',
  product_types = 'Gummies, edibles',
  talking_points = ARRAY['Formulated with uplifting terpenes for social settings', 'Lower dose options available for a mellow, functional high', 'Part of the trusted Camino line by Kiva Confections', 'Perfect recommendation for parties, gatherings, or a night out']
WHERE name = 'Camino Social' AND (description IS NULL OR description = '');

-- Camino Sours
UPDATE brands SET
  description = 'Sour gummies by Kiva Confections with 10mg THC per piece. Bright, tart flavors combined with terpene-tailored effects.',
  location = 'Oakland, CA',
  known_for = 'Sour-flavored cannabis gummies with terpene-tailored effects',
  product_types = 'Sour gummies, edibles',
  talking_points = ARRAY['10mg THC per piece with a bright, tart sour coating', 'Same trusted Kiva quality and consistent dosing', 'Great for customers who love sour candy', 'Available in multiple terpene-tailored effect profiles']
WHERE name = 'Camino Sours' AND (description IS NULL OR description = '');

-- Cannatela
UPDATE brands SET
  description = 'The first-ever cannabis-infused hazelnut-cocoa spread, imported from Italy and infused in Warwick, NY. Think Nutella meets cannabis — a culinary edible experience.',
  location = 'Warwick, NY (imported from Italy)',
  known_for = 'Cannabis-infused hazelnut-cocoa spread — the first of its kind',
  product_types = 'Infused spreads, edibles',
  talking_points = ARRAY['Hazelnut-cocoa spread imported from Ponte San Marco, Italy and infused in Warwick, NY', 'Each jar has 100mg THC balanced with equal parts CBD and CBG', 'Amazing on ice cream, French toast, crepes, strawberries, or straight from the jar', 'Available in 185+ dispensaries across New York State']
WHERE name = 'Cannatela' AND (description IS NULL OR description = '');

-- Chef For Higher
UPDATE brands SET
  description = 'Premium cannabis edibles brand focused on chef-crafted, gourmet infused products made with quality culinary ingredients.',
  location = 'New York, NY',
  known_for = 'Chef-crafted gourmet cannabis edibles',
  product_types = 'Edibles, baked goods',
  talking_points = ARRAY['Made with real culinary ingredients — not your typical cannabis edible', 'Founded by an actual chef who brings restaurant-quality to cannabis', 'Great gift option for foodies who enjoy cannabis', 'Focuses on flavor and quality over just potency']
WHERE name = 'Chef For Higher' AND (description IS NULL OR description = '');

-- Choc-Lit
UPDATE brands SET
  description = 'New York-made artisan cannabis chocolate bars with precise dosing and smooth texture. Farm-produced cannabis extract combined with locally made chocolate.',
  location = 'New York, NY',
  known_for = 'Artisan cannabis-infused chocolate bars made in New York',
  product_types = 'Chocolate bars, edibles',
  talking_points = ARRAY['100% produced in New York — both the cannabis extract and chocolate', 'Lab-tested for consistent dosing in every square', 'Great alternative for customers who prefer chocolate over gummies', 'Smooth texture and clean flavor in every bite']
WHERE name = 'Choc-Lit' AND (description IS NULL OR description = '');

-- Claybourne Co
UPDATE brands SET
  description = 'California-born premium flower brand founded by three childhood friends from Riverside. Ranked as one of the top cannabis companies in California, known for 100% indoor-grown, top-shelf flower.',
  location = 'Perris, CA',
  known_for = 'Ultra-premium indoor-grown flower and infused pre-rolls',
  product_types = 'Flower, infused pre-rolls, vapes',
  talking_points = ARRAY['100% indoor grown with full cannabinoid and terpene profiles on every package', 'Founded by three childhood friends from Riverside, CA in 2017', 'Claybourne Flyers are strain-specific 0.5g pre-rolls known for quality', 'Top 3 cannabis company in California — serious craft cannabis']
WHERE name = 'Claybourne Co.' AND (description IS NULL OR description = '');

-- Cookies
UPDATE brands SET
  description = 'The most globally recognized cannabis brand, founded in 2010 by rapper Berner and Bay Area breeder Jai. Creator of legendary strains like Girl Scout Cookies, Gelato, and Snowman. Over 70 retail locations across 6 countries.',
  location = 'San Francisco, CA',
  known_for = 'Creating iconic strains like GSC, Gelato, and Snowman — global cannabis culture brand',
  product_types = 'Flower, pre-rolls, vapes, edibles, apparel',
  talking_points = ARRAY['Founded by rapper Berner — first cannabis exec ever on the Forbes cover', 'Created legendary strains: Girl Scout Cookies, Gelato, Snowman', 'Over 70 retail locations in 6 countries — the biggest cannabis brand in the world', 'Also a global streetwear brand — cannabis meets culture']
WHERE name = 'Cookies' AND (description IS NULL OR description = '');

-- Dank
UPDATE brands SET
  description = 'The #1 ranked flower brand in New York State since September 2025. Founded by cannabis and hospitality professionals, focused on dense, trichome-heavy flower with loud terpene profiles.',
  location = 'New York, NY',
  known_for = '#1 flower brand in New York — premium craft flower',
  product_types = 'Flower, pre-rolls',
  talking_points = ARRAY['Ranked #1 flower brand in New York State since September 2025', 'Consistently tests 20-30% THC with rich terpene profiles', 'Popular strains include Randy Marsh, Maui Wowie, and Alaskan Thunderfuck', 'Pre-rolls use organic hemp papers and burn evenly']
WHERE name = 'Dank' AND (description IS NULL OR description = '');

-- DaySavers
UPDATE brands SET
  description = 'Premium pre-rolled cones and smoking accessories by Custom Cones USA. Made with ultra-fine European rolling papers, FSC certified, and tested for heavy metals, microbials, and pesticides.',
  location = 'Los Angeles, CA',
  known_for = 'Premium pre-rolled cones and tubes with ultra-fine European papers',
  product_types = 'Pre-rolled cones, tubes, accessories',
  talking_points = ARRAY['Made with ultra-fine European rolling papers for a smooth, slow burn', 'Tested for heavy metals, microbials, and pesticides — same standards as regulated cannabis', 'FSC certified and spiral paper filter keeps particles out', 'Perfect Pack 2 machine lets you fill a cone perfectly in seconds']
WHERE name = 'DaySavers' AND (description IS NULL OR description = '');

-- Dayzed
UPDATE brands SET
  description = 'Micro-license cultivator based in Schoharie, NY using indoor living soil techniques to bring out the full genetic potential of every strain. Also makes THC/CBD seltzers.',
  location = 'Schoharie, NY',
  known_for = 'Small-batch indoor living soil cultivation and cannabis seltzers',
  product_types = 'Flower, seltzers, beverages',
  talking_points = ARRAY['Local New York micro-license grower from Schoharie, in the Catskills region', 'Uses indoor living soil techniques for maximum terpene and cannabinoid expression', 'Also makes cannabis seltzers in multiple dose levels', 'True craft cannabis — small batch, quality focused']
WHERE name = 'Dayzed' AND (description IS NULL OR description = '');

-- Drew Martin
UPDATE brands SET
  description = 'Botanical cannabis pre-rolls that blend sun-grown flower with herbal pairings like rose petals, lavender, chamomile, and peppermint. Founded by a certified herbalist and James Beard award-winning mixologist. Queer-owned.',
  location = 'Los Angeles, CA / New York',
  known_for = 'Herbal-blended pre-rolls designed for specific occasions and moods',
  product_types = 'Botanical pre-rolls',
  talking_points = ARRAY['Each blend pairs cannabis with specific herbs — rose + peppermint, lavender + passionflower, chamomile + calendula', 'Founded by a certified herbalist and James Beard award-winning mixologist', 'Deliberately low-dose — designed to keep you lifted yet present', 'Queer-owned brand that brings herbalism back to cannabis']
WHERE name = 'Drew Martin' AND (description IS NULL OR description = '');

-- Elements
UPDATE brands SET
  description = 'Ultra-thin rice rolling papers made in Alcoy, Spain by the makers of RAW. Made from rice and sugar with zero additives — no flax, no pulp. 100% windmill powered production.',
  location = 'Alcoy, Spain',
  known_for = 'Ultra-thin rice rolling papers with zero ash and pure flavor',
  product_types = 'Rolling papers, cones, accessories',
  talking_points = ARRAY['Made from pure rice with sugar gum — absolutely no additives or chemicals', 'Criss-cross watermark pattern ensures even burn with no runs', 'By the makers of RAW — backed by decades of rolling paper expertise', '100% windmill powered production — eco-friendly manufacturing']
WHERE name = 'Elements' AND (description IS NULL OR description = '');

-- Finca
UPDATE brands SET
  description = 'New York-based cannabis brand rooted in Latin American culture. Merges traditional Latin flavors like guava, mango, and passion fruit with expert cannabis craftsmanship on their upstate NY finca (farm).',
  location = 'Upstate New York',
  known_for = 'Latin-inspired cannabis gummies and vapes with bold tropical flavors',
  product_types = 'Gummies, vapes',
  talking_points = ARRAY['"Finca" means "farm" in Spanish — a tribute to cultivation traditions', 'Flavors include guava, mango, and passion fruit — inspired by Latin culture', 'Nano-enhanced cannabinoids for quicker absorption', '100% biodegradable packaging — eco-conscious from the start']
WHERE name = 'Finca' AND (description IS NULL OR description = '');

-- Flaunt
UPDATE brands SET
  description = 'Cannabis brand available in New York dispensaries, offering a range of flower and pre-roll products.',
  location = 'New York, NY',
  known_for = 'Flower and pre-roll products',
  product_types = 'Flower, pre-rolls',
  talking_points = ARRAY['Available at licensed New York dispensaries', 'Offers a variety of strains for different preferences']
WHERE name = 'Flaunt' AND (description IS NULL OR description = '');

-- Florist Farms
UPDATE brands SET
  description = 'Started as a small backyard garden in 2010, now the leading cannabis brand in New York. Sustainable farm in Cortland, NY using organic compost, crop rotation, and cover cropping. Fully solar-powered since 2022.',
  location = 'Cortland, NY',
  known_for = 'NY''s leading cannabis brand — organic, solar-powered, sustainable cultivation',
  product_types = 'Flower, gummies, pre-rolls, vapes',
  talking_points = ARRAY['Started as a backyard garden in 2010 — now NY''s top cannabis brand', 'Uses organic-only compost, crop rotation, and living soil full of beneficial microbes', 'Entire facility including extraction room has been solar-powered since 2022', 'Rotating lineup of strains that vary by season — always something new']
WHERE name = 'Florist Farms' AND (description IS NULL OR description = '');

-- FOY
UPDATE brands SET
  description = 'Black-owned, athlete-founded cannabis brand from upstate NY. Makes wellness-focused vegan gummies with adaptogens like lion''s mane and reishi mushrooms. Donates monthly to support veterans.',
  location = 'Upstate New York',
  known_for = 'Wellness-focused vegan gummies with adaptogens and functional mushrooms',
  product_types = 'Gummies, edibles',
  talking_points = ARRAY['Founded by brothers Yon and Moose Haile plus former NFL player Stevan Ridley', 'Daytime Chews have lion''s mane + cordyceps; Nighttime Chews have reishi + valerian root', 'Grown in organic soil with seed-to-sale quality control at their upstate NY farm', 'Donates monthly to support wounded and disabled military veterans']
WHERE name = 'FOY' AND (description IS NULL OR description = '');

-- Head & Heal
UPDATE brands SET
  description = 'USDA Certified Organic CBD and cannabis brand grown and extracted in Cortland, NY. One of the first licensed hemp growers in New York State, now the leading THC tincture brand in NY dispensaries.',
  location = 'Cortland, NY',
  known_for = 'USDA Certified Organic CBD and seed-to-sale THC tinctures',
  product_types = 'Tinctures, CBD oils, capsules, topicals, pet products',
  talking_points = ARRAY['One of the first licensed hemp growers in New York State', 'USDA Certified Organic — one of very few cannabis brands with this certification', 'Leading THC tincture brand in NY adult-use dispensaries', 'Originally an organic vegetable farm that pivoted to hemp in 2018']
WHERE name = 'Head & Heal' AND (description IS NULL OR description = '');

-- Jeeter
UPDATE brands SET
  description = 'America''s best-selling pre-roll brand with over 40% of California''s market share. The name "Jeeter" was coined in Florida in 2004 as slang for a joint. Now available in multiple states including NY.',
  location = 'Desert Hot Springs, CA',
  known_for = 'Best-selling pre-roll in America — infused joints and vapes',
  product_types = 'Pre-rolls, infused pre-rolls, vapes',
  talking_points = ARRAY['The #1 best-selling pre-roll brand in the entire country', 'Over 40% market share in California''s pre-roll category', 'Baby Jeeters, 1g Jeeters, and Jeeter XL offer different sizes', 'Produces nearly 1.5 million pre-rolled joints in California alone']
WHERE name = 'Jeeter' AND (description IS NULL OR description = '');

-- Jeeter XL
UPDATE brands SET
  description = 'The extra-large format from Jeeter, America''s #1 pre-roll brand. Bigger joints for those who want more.',
  location = 'Desert Hot Springs, CA',
  known_for = 'Extra-large premium infused pre-rolls',
  product_types = 'XL pre-rolls',
  talking_points = ARRAY['The XL format from America''s best-selling pre-roll brand', 'Same top-shelf quality as regular Jeeters in a larger format', 'Perfect for sharing or extended sessions', 'Available in a variety of popular strains']
WHERE name = 'Jeeter XL' AND (description IS NULL OR description = '');

-- Lowell Herb Co
UPDATE brands SET
  description = 'America''s #1 pre-roll brand since 2017. Born in Southern California at the dawn of legalization. Uses only organic fertilizer with no synthetic pesticides, packaged in iconic packs.',
  location = 'Southern California',
  known_for = 'America''s favorite pre-roll — organic, no solvents, no additives',
  product_types = 'Pre-rolls, flower',
  talking_points = ARRAY['The #1 pre-roll brand in California since 2017 — selling more than any other brand', 'Only natural materials, organic fertilizer, no synthetic pesticides', 'Lowell Smokes and Lowell Quicks come in 7-pack and 14-pack options', 'Available at 262 dispensaries across 9 states']
WHERE name = 'Lowell Herb Co' AND (description IS NULL OR description = '');

-- Puffco
UPDATE brands SET
  description = 'Brooklyn-based innovator of high-tech cannabis concentrate vaporizers. Created the Puffco Peak, the first smart e-rig combining water filtration and preset heat settings in a portable device.',
  location = 'Brooklyn, NY',
  known_for = 'Smart dab rigs and premium concentrate vaporizers',
  product_types = 'Vaporizers, dab rigs, accessories',
  talking_points = ARRAY['Headquartered right here in Brooklyn, NY', 'The Puffco Peak revolutionized concentrate consumption when it launched in 2018', 'Puffco Proxy is the first modular vaporizer with swappable glass', 'Designed exclusively for concentrates — wax, shatter, live resin, rosin']
WHERE name = 'Puffco' AND (description IS NULL OR description = '');

-- RAW
UPDATE brands SET
  description = 'The world''s most popular rolling paper brand, founded by Josh Kesselman. Made in Alcoy, Spain from unbleached, unrefined plant fibers with natural tree sap gum. A true icon of cannabis culture.',
  location = 'Alcoy, Spain',
  known_for = 'Unbleached, unrefined natural rolling papers — the industry standard',
  product_types = 'Rolling papers, cones, tips, trays, accessories',
  talking_points = ARRAY['The world''s most recognizable rolling paper brand', 'Made from unbleached, unrefined plant fibers — no chlorine or chemicals', 'Natural tree sap gumline for a clean, even burn', 'Founded by Josh Kesselman, a lifelong advocate for natural smoking products']
WHERE name = 'Raw' AND (description IS NULL OR description = '');

-- Select
UPDATE brands SET
  description = 'Leading national cannabis vape brand founded in 2015 and now part of Curaleaf. Known for precision-dosing vapes, live resin cartridges, and innovative hardware like the Select Briq.',
  location = 'Portland, OR (now national via Curaleaf)',
  known_for = 'Premium cannabis vapes with precision dosing and innovative hardware',
  product_types = 'Vape cartridges, disposable vapes, pods',
  talking_points = ARRAY['Available at over 900 retailers nationwide', 'Select Briq 2 features Flavor Protection Technology for better taste', 'Select Fresh line combines THC distillate with natural botanical terpenes', 'One of the most trusted vape brands in the cannabis industry']
WHERE name = 'Select' AND (description IS NULL OR description = '');

-- Select Essentials
UPDATE brands SET
  description = 'The essentials line from Select by Curaleaf. Accessible, everyday cannabis vape products with consistent quality at a value price point.',
  location = 'Portland, OR (national via Curaleaf)',
  known_for = 'Everyday cannabis vapes at accessible price points',
  product_types = 'Vape cartridges, disposables',
  talking_points = ARRAY['The value line from Select — same quality standards at a friendlier price', 'Great entry point for customers new to vaping', 'Consistent, reliable dosing backed by Curaleaf''s quality control', 'Available in popular strain profiles']
WHERE name = 'Select Essentials' AND (description IS NULL OR description = '');

-- Select Legacy
UPDATE brands SET
  description = 'The premium, legacy-tier line from Select by Curaleaf. High-potency, top-shelf vape products for experienced consumers.',
  location = 'Portland, OR (national via Curaleaf)',
  known_for = 'Premium, high-potency cannabis vapes for experienced users',
  product_types = 'Vape cartridges, live resin vapes',
  talking_points = ARRAY['The top-shelf tier of the Select brand — maximum potency and flavor', 'Features live resin and full-spectrum formulations', 'For experienced customers who want the best Select has to offer', 'Part of the trusted Select family by Curaleaf']
WHERE name = 'Select Legacy' AND (description IS NULL OR description = '');

-- Sluggers
UPDATE brands SET
  description = 'Premium pre-roll brand with a fun baseball-inspired aesthetic, including collectible trading cards in every pack. Triple infusion process combines flower with kief and liquid diamonds.',
  location = 'California',
  known_for = 'Baseball-themed infused pre-rolls with collectible trading cards',
  product_types = 'Infused pre-rolls, flower',
  talking_points = ARRAY['Triple infusion: premium flower + kief + liquid diamonds', 'Every pack includes collectible trading cards — customers love collecting them', 'Five-pack tins wrapped in metallic mylar bags like sports card packs', '5th best-selling pre-roll brand in California, producing 1.2 million joints a month']
WHERE name = 'Sluggers' AND (description IS NULL OR description = '');

-- The Botanist
UPDATE brands SET
  description = 'Retail and product brand by Acreage Holdings, rooted in health, wellness, and the holistic power of cannabis. Dispensaries designed like 19th century botanist laboratories.',
  location = 'New York, NY (multi-state)',
  known_for = 'Wellness-focused cannabis products with a science-meets-nature approach',
  product_types = 'Flower, vapes, edibles, tinctures',
  talking_points = ARRAY['Dispensaries in 5 states including New York, designed like botanist labs', 'Focuses on the holistic, wellness side of cannabis', 'Known for knowledgeable staff and personalized service', 'One of the largest vertically integrated operators in the US']
WHERE name = 'The Botanist' AND (description IS NULL OR description = '');

-- Vireo
UPDATE brands SET
  description = 'Physician-led cannabis company and pioneer in New York''s medical cannabis industry since 2014. Cultivates in eco-friendly greenhouses and produces pharmaceutical-grade extracts.',
  location = 'White Plains, NY',
  known_for = 'Physician-led, pharmaceutical-grade medical cannabis since 2014',
  product_types = 'Flower, vapes, tinctures, capsules',
  talking_points = ARRAY['One of the original medical cannabis operators in New York since 2014', 'Physician-led company focused on evidence-based cannabis products', 'Pharmaceutical-grade extracts produced in state-of-the-art labs', 'Eco-friendly greenhouse cultivation']
WHERE name = 'Vireo' AND (description IS NULL OR description = '');

-- Camino Uplifting
UPDATE brands SET
  description = 'The uplifting, energizing variety from the Camino line by Kiva Confections. Sativa-forward terpene blend designed for daytime creativity and focus.',
  location = 'Oakland, CA',
  known_for = 'Uplifting sativa-forward cannabis gummies for daytime use',
  product_types = 'Gummies, edibles',
  talking_points = ARRAY['Part of the trusted Camino line by Kiva Confections', 'Sativa-forward terpene blend designed for energy and creativity', 'Great daytime option for customers who want to stay active', 'Consistent dosing and quality from one of the top edible brands']
WHERE name = 'Camino Uplifting' AND (description IS NULL OR description = '');

-- PAX Era Go
UPDATE brands SET
  description = 'Sleek, portable cannabis vaporizer by PAX Labs, designed for use with strain-specific THC pods. App-connected with precise temperature control for the best flavor.',
  location = 'San Francisco, CA',
  known_for = 'Premium, app-connected cannabis vaporizer pods with temp control',
  product_types = 'Vaporizer devices, THC pods',
  talking_points = ARRAY['Slim, discreet design that fits in a pocket — looks like a tech device, not a vape', 'Strain-specific pods from top brands for curated experiences', 'Bluetooth app lets you dial in exact temperature for best flavor', 'One of the most recognized vaporizer brands in cannabis']
WHERE name = 'PAX Era Go' AND (description IS NULL OR description = '');

-- Yocan
UPDATE brands SET
  description = 'Leading manufacturer of portable cannabis vaporizers and dab pens. Known for affordable, user-friendly devices for both flower and concentrates.',
  location = 'Shenzhen, China',
  known_for = 'Affordable, reliable portable vaporizers and dab pens',
  product_types = 'Vaporizers, dab pens, batteries, accessories',
  talking_points = ARRAY['One of the most popular budget-friendly vaporizer brands', 'Makes devices for both dry herb and concentrates', 'Known for reliability and ease of use — great for beginners', 'Wide range from simple pens to advanced devices']
WHERE name = 'Yocan' AND (description IS NULL OR description = '');

-- Collin Russell Glassworks
UPDATE brands SET
  description = 'Artisan glass pipe and accessories maker. Handcrafted, functional glass art for cannabis consumption.',
  location = 'New York',
  known_for = 'Handcrafted artisan glass pipes and accessories',
  product_types = 'Glass pipes, accessories',
  talking_points = ARRAY['Handmade artisan glass — each piece is unique', 'Functional art that doubles as premium smoking accessories', 'Great gift option for customers who appreciate craftsmanship']
WHERE name = 'Collin Russell Glassworks' AND (description IS NULL OR description = '');

-- Cycling Frog
UPDATE brands SET
  description = 'Hemp-derived THC seltzers and gummies made with simple, natural ingredients. Known for refreshing, low-dose beverages perfect for casual social occasions.',
  location = 'Seattle, WA',
  known_for = 'Hemp-derived THC seltzers and low-dose gummies',
  product_types = 'Seltzers, gummies, beverages',
  talking_points = ARRAY['Refreshing THC seltzers perfect as an alcohol alternative', 'Low-dose options great for beginners or microdosing', 'Made with simple, natural ingredients', 'Fun, approachable branding that appeals to the canna-curious']
WHERE name = 'Cycling Frog' AND (description IS NULL OR description = '');

-- Pulsar
UPDATE brands SET
  description = 'Cannabis accessories brand offering vaporizers, dab rigs, grinders, and storage solutions. Known for colorful designs and functional innovation.',
  location = 'United States',
  known_for = 'Colorful, innovative cannabis accessories and vaporizers',
  product_types = 'Vaporizers, dab rigs, grinders, accessories',
  talking_points = ARRAY['Wide range of accessories from vaporizers to grinders to storage', 'Known for eye-catching, colorful designs', 'Good mid-range option between budget and premium accessories', 'Functional innovation with user-friendly designs']
WHERE name = 'Pulsar' AND (description IS NULL OR description = '');

-- Piece Water
UPDATE brands SET
  description = 'All-natural water alternative for bongs and water pipes that prevents resin buildup. Made from natural mineral, vegetable, and fruit extracts.',
  location = 'United States',
  known_for = 'Natural bong water alternative that keeps glass clean',
  product_types = 'Bong water solution, cleaning products',
  talking_points = ARRAY['Prevents resin and tar from sticking to glass — keeps pieces clean', 'Made from 100% natural ingredients: mineral, vegetable, and fruit extracts', 'Just pour it in instead of regular water — no scrubbing needed later', 'Great add-on sale for any customer buying a water pipe']
WHERE name = 'Piece Water' AND (description IS NULL OR description = '');

-- Randy's
UPDATE brands SET
  description = 'Classic wired rolling papers brand, known for the built-in wire that acts as a handle so you can smoke your joint down to the very end without burning your fingers.',
  location = 'United States',
  known_for = 'Rolling papers with a built-in wire handle',
  product_types = 'Rolling papers, accessories',
  talking_points = ARRAY['The original wired rolling paper — a built-in wire lets you smoke to the very end', 'No need for a roach clip — the wire is your handle', 'A classic brand that''s been around for decades', 'Great conversation starter and unique gift item']
WHERE name = 'Randy''s' AND (description IS NULL OR description = '');

-- Illuminated Leaf
UPDATE brands SET
  description = 'Cannabis brand available in New York dispensaries.',
  location = 'New York',
  known_for = 'Cannabis products in the New York market',
  product_types = 'Flower, pre-rolls',
  talking_points = ARRAY['Available at licensed New York dispensaries']
WHERE name = 'Illuminated Leaf' AND (description IS NULL OR description = '');

-- Cannabis Leaf
UPDATE brands SET
  description = 'Cannabis accessories and smoking supplies brand.',
  location = 'United States',
  known_for = 'Cannabis accessories and supplies',
  product_types = 'Accessories, supplies',
  talking_points = ARRAY['Offers a range of cannabis accessories and smoking supplies']
WHERE name = 'Cannabis Leaf' AND (description IS NULL OR description = '');

-- Formula 420
UPDATE brands SET
  description = 'Industry-leading glass and pipe cleaning solution. The original all-natural cleaner that works in seconds — just shake and rinse.',
  location = 'United States',
  known_for = 'Fast-acting glass and pipe cleaning solution',
  product_types = 'Cleaning solutions, accessories',
  talking_points = ARRAY['The original formula — just shake and rinse, works in under a minute', 'All-natural, biodegradable cleaning solution', 'Works on glass, ceramic, and metal pieces', 'Essential add-on for any customer buying glassware']
WHERE name = 'Formula 420' AND (description IS NULL OR description = '');

-- Glob Mops
UPDATE brands SET
  description = 'Premium cotton swabs designed specifically for cleaning dab rigs and bangers. Pointed tips and extra absorbent cotton for keeping quartz bangers pristine.',
  location = 'United States',
  known_for = 'Premium cotton swabs designed for dab rig maintenance',
  product_types = 'Cotton swabs, cleaning accessories',
  talking_points = ARRAY['Designed specifically for dabbing — pointed tips reach every corner of a banger', 'Extra absorbent cotton soaks up residual concentrate', 'Essential accessory for anyone using a dab rig or e-rig', 'Great impulse add-on sale at the register']
WHERE name = 'Glob Mops' AND (description IS NULL OR description = '');

-- High Hemp Wraps
UPDATE brands SET
  description = 'Organic hemp wraps made with no tobacco and no nicotine. A natural, healthier alternative to traditional blunt wraps.',
  location = 'United States',
  known_for = 'Organic, tobacco-free hemp wraps',
  product_types = 'Hemp wraps, cones',
  talking_points = ARRAY['Zero tobacco, zero nicotine — made from organic hemp', 'Slow burning and smooth — a natural alternative to blunt wraps', 'Available in multiple flavors', 'Each pack includes a filter tip']
WHERE name = 'High Hemp Wraps' AND (description IS NULL OR description = '');

-- Stache
UPDATE brands SET
  description = 'Cannabis accessories brand specializing in innovative dab tools, rigs, and consumption devices. Known for creative, functional designs.',
  location = 'United States',
  known_for = 'Innovative dab tools and cannabis accessories',
  product_types = 'Dab rigs, tools, accessories',
  talking_points = ARRAY['Creative, functional designs for concentrate consumption', 'Known for innovative dab tools and portable rigs', 'Good mid-range accessory brand with unique products']
WHERE name = 'Stache' AND (description IS NULL OR description = '');

-- Ooze
UPDATE brands SET
  description = 'Popular cannabis accessories brand known for affordable, colorful vape batteries, dab pens, and smoking accessories. A go-to for budget-friendly devices.',
  location = 'Detroit, MI',
  known_for = 'Affordable, colorful vape batteries and cannabis accessories',
  product_types = 'Vape batteries, dab pens, accessories',
  talking_points = ARRAY['One of the most recognizable accessory brands in dispensaries', 'Known for the Twist battery — adjustable voltage in fun colors', 'Great budget-friendly option for customers who need a reliable battery', 'Wide range from simple pens to advanced devices']
WHERE name = 'Ooze' AND (description IS NULL OR description = '');
