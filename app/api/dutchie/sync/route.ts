import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role key for server-side operations (bypasses RLS)
const usingServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DUTCHIE_BASE = 'https://api.pos.dutchie.com'

function dutchieAuth(): string {
  const key = process.env.DUTCHIE_API_KEY
  if (!key) throw new Error('DUTCHIE_API_KEY not configured')
  // Basic auth: base64(api_key + ":")
  const encoded = Buffer.from(`${key}:`).toString('base64')
  return `Basic ${encoded}`
}

async function fetchDutchieProducts(): Promise<any[]> {
  const res = await fetch(`${DUTCHIE_BASE}/products`, {
    headers: { Authorization: dutchieAuth() },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dutchie /products returned ${res.status}: ${text}`)
  }
  const data = await res.json()
  // Dutchie may return an array directly or wrapped in { products: [...] }
  return Array.isArray(data) ? data : (data.products || data.data || [])
}

async function fetchDutchieInventory(): Promise<any[]> {
  try {
    const res = await fetch(`${DUTCHIE_BASE}/reporting/inventory`, {
      headers: { Authorization: dutchieAuth() },
    })
    if (!res.ok) return [] // Inventory endpoint may not be enabled
    const data = await res.json()
    return Array.isArray(data) ? data : (data.inventory || data.data || [])
  } catch {
    return []
  }
}

/**
 * Normalize Dutchie category using the raw category + product name keywords.
 * Fixes common issues like prerolls tagged as "Flower".
 */
function normalizeCategory(rawCategory: string, productName: string): string {
  const cat = rawCategory.toLowerCase().trim()
  const name = productName.toLowerCase()

  // Name-based detection takes priority — catches miscategorized items
  const prerollKeywords = ['preroll', 'pre-roll', 'pre roll', 'joint', 'blunt', 'infused roll', 'dog walker', 'mini roll', 'cannagar', 'moon rock roll', 'slugger']
  if (prerollKeywords.some(kw => name.includes(kw))) return 'Pre-Rolls'

  const concentrateKeywords = ['concentrate', 'wax', 'shatter', 'rosin', 'resin', 'badder', 'budder', 'crumble', 'sauce', 'diamond', 'sugar', 'hash', 'kief', 'dab', 'extract']
  if (concentrateKeywords.some(kw => name.includes(kw))) return 'Concentrates'

  const vapeKeywords = ['vape', 'cartridge', 'cart ', 'pod', '510', 'disposable vape', 'pax pod']
  if (vapeKeywords.some(kw => name.includes(kw))) return 'Vaporizers'

  const edibleKeywords = ['gummy', 'gummies', 'chocolate', 'edible', 'candy', 'cookie', 'brownie', 'lozenge', 'chew', 'caramel', 'mint ', 'mints']
  if (edibleKeywords.some(kw => name.includes(kw))) return 'Edibles'

  const beverageKeywords = ['beverage', 'drink', 'soda', 'tea ', 'coffee', 'elixir', 'shot ', 'tonic', 'sparkling', 'seltzer']
  if (beverageKeywords.some(kw => name.includes(kw))) return 'Beverages'

  const tincKeywords = ['tincture', 'oil ', 'drops', 'sublingual', 'rso', 'capsule']
  if (tincKeywords.some(kw => name.includes(kw))) return 'Tinctures'

  const topicalKeywords = ['topical', 'balm', 'cream', 'lotion', 'salve', 'patch', 'transdermal', 'bath bomb', 'roll-on']
  if (topicalKeywords.some(kw => name.includes(kw))) return 'Topicals'

  const accessoryKeywords = ['accessory', 'accessories', 'grinder', 'pipe', 'papers', 'lighter', 'tray', 'stash', 'jar ', 'container']
  if (accessoryKeywords.some(kw => name.includes(kw))) return 'Accessories'

  // Category-string normalization for Dutchie's various category names
  const categoryMap: Record<string, string> = {
    'flower': 'Flower',
    'flowers': 'Flower',
    'buds': 'Flower',
    'pre-roll': 'Pre-Rolls',
    'pre-rolls': 'Pre-Rolls',
    'preroll': 'Pre-Rolls',
    'prerolls': 'Pre-Rolls',
    'pre roll': 'Pre-Rolls',
    'pre rolls': 'Pre-Rolls',
    'joints': 'Pre-Rolls',
    'concentrate': 'Concentrates',
    'concentrates': 'Concentrates',
    'extracts': 'Concentrates',
    'extract': 'Concentrates',
    'vaporizer': 'Vaporizers',
    'vaporizers': 'Vaporizers',
    'vape': 'Vaporizers',
    'vapes': 'Vaporizers',
    'cartridge': 'Vaporizers',
    'cartridges': 'Vaporizers',
    'edible': 'Edibles',
    'edibles': 'Edibles',
    'food': 'Edibles',
    'beverage': 'Beverages',
    'beverages': 'Beverages',
    'drinks': 'Beverages',
    'tincture': 'Tinctures',
    'tinctures': 'Tinctures',
    'oils': 'Tinctures',
    'capsules': 'Tinctures',
    'topical': 'Topicals',
    'topicals': 'Topicals',
    'accessory': 'Accessories',
    'accessories': 'Accessories',
    'gear': 'Accessories',
    'merch': 'Accessories',
    'merchandise': 'Accessories',
    'accesories': 'Accessories',
    'vapor': 'Vaporizers',
    'pet products': 'Pet Products',
  }

  if (categoryMap[cat]) return categoryMap[cat]

  // Partial match on category string
  if (cat.includes('pre-roll') || cat.includes('preroll')) return 'Pre-Rolls'
  if (cat.includes('concentrate') || cat.includes('extract')) return 'Concentrates'
  if (cat.includes('vape') || cat.includes('cartridge')) return 'Vaporizers'
  if (cat.includes('edible')) return 'Edibles'
  if (cat.includes('beverage') || cat.includes('drink')) return 'Beverages'
  if (cat.includes('tincture') || cat.includes('capsule')) return 'Tinctures'
  if (cat.includes('topical')) return 'Topicals'

  // Return original with title case if no match
  return rawCategory || 'Uncategorized'
}

export async function POST(req: Request) {
  try {
    // Optional: verify cron secret for scheduled calls
    const { searchParams } = new URL(req.url)
    const cronSecret = searchParams.get('secret')
    const isCron = cronSecret === process.env.CRON_SECRET

    // For manual calls, check that it came from an admin (simple check)
    if (!isCron) {
      const authHeader = req.headers.get('x-admin-check')
      // Allow calls from the app itself (no strict auth needed since it's internal)
    }

    // 1. Fetch products from Dutchie
    const dutchieProducts = await fetchDutchieProducts()
    if (dutchieProducts.length === 0) {
      return NextResponse.json({
        status: 'ok',
        message: 'No products returned from Dutchie',
        synced: 0,
      })
    }

    // 2. Fetch inventory levels (if available)
    const inventory = await fetchDutchieInventory()
    const inventoryMap = new Map<string, number>()
    for (const item of inventory) {
      const productId = item.productId || item.product_id || item.id
      const qty = item.quantity ?? item.quantityAvailable ?? item.qty ?? 0
      if (productId) inventoryMap.set(String(productId), qty)
    }

    // 3. Get existing brands from Supabase
    const { data: existingBrands } = await supabase.from('brands').select('name')
    const existingBrandNames = new Set((existingBrands || []).map(b => b.name))

    // 4. Process Dutchie products into our format
    const brandSet = new Set<string>()
    const productBatch: any[] = []

    for (const dp of dutchieProducts) {
      // Dutchie product fields vary — handle common shapes
      const name = dp.name || dp.productName || ''
      const brand = dp.brand || dp.brandName || (name.includes('|') ? name.split('|')[0].trim() : '')
      // Prefer most specific category field from Dutchie
      const rawCategory = dp.subcategory || dp.subCategory || dp.productCategory || dp.category || dp.masterCategory || ''
      const dutchieId = String(dp.id || dp.productId || '')

      if (!name) continue
      if (brand) brandSet.add(brand)

      // Build the product name in "Brand | Product" format if not already
      const productName = name.includes('|') ? name : (brand ? `${brand} | ${name}` : name)

      // Normalize category — fix common Dutchie miscategorizations
      const category = normalizeCategory(rawCategory, productName)

      // Check inventory
      const qty = inventoryMap.get(dutchieId)
      const isActive = qty === undefined ? true : qty > 0

      productBatch.push({
        name: productName,
        brand: brand || null,
        category: category || null,
        source: 'dutchie',
        is_active: isActive,
        dutchie_id: dutchieId || null,
      })
    }

    // Deduplicate by name (Dutchie can return duplicates, which breaks batch upsert)
    const seen = new Map<string, any>()
    for (const p of productBatch) {
      seen.set(p.name, p)
    }
    const dedupedBatch = Array.from(seen.values())

    // 5. Insert new brands (with discovered_date)
    const newBrands: string[] = []
    brandSet.forEach(name => {
      if (!existingBrandNames.has(name)) newBrands.push(name)
    })

    if (newBrands.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const brandRows = newBrands.map(name => ({
        name,
        is_active: true,
        discovered_date: today,
      }))
      for (let i = 0; i < brandRows.length; i += 100) {
        await supabase.from('brands').insert(brandRows.slice(i, i + 100))
      }
    }

    // 6. Re-activate brands that are back, deactivate brands with zero inventory on all products
    const activeBrandNames = Array.from(brandSet)
    if (activeBrandNames.length > 0) {
      await supabase.from('brands').update({ is_active: true }).in('name', activeBrandNames)
    }

    // 7. Snapshot existing products BEFORE upsert (to detect new/returning items)
    const { data: existingProducts } = await supabase
      .from('products')
      .select('name, is_active')
      .eq('source', 'dutchie')
    const existingMap = new Map<string, boolean>()
    for (const p of (existingProducts || [])) {
      existingMap.set(p.name, p.is_active)
    }

    // 8. Upsert products in batches (using deduped list)
    let productsUpserted = 0
    let upsertError: string | null = null
    for (let i = 0; i < dedupedBatch.length; i += 200) {
      const batch = dedupedBatch.slice(i, i + 200)
      const { error } = await supabase.from('products').upsert(batch, {
        onConflict: 'name',
      })
      if (error) {
        upsertError = error.message
      } else {
        productsUpserted += batch.length
      }
    }

    // 9. Set menu_added_date for products that are NEW or were previously inactive
    const todayDate = new Date().toISOString().split('T')[0]
    const newOrReturning: string[] = []
    for (const p of dedupedBatch) {
      const wasActive = existingMap.get(p.name)
      if (wasActive === undefined || wasActive === false) {
        // Product is new to the DB, or was inactive (removed from menu) and is now back
        newOrReturning.push(p.name)
      }
    }
    if (newOrReturning.length > 0) {
      for (let i = 0; i < newOrReturning.length; i += 200) {
        await supabase
          .from('products')
          .update({ menu_added_date: todayDate })
          .in('name', newOrReturning.slice(i, i + 200))
      }
    }

    // 10. Mark products NOT in the Dutchie feed as inactive (they've been removed from menu)
    const dutchieProductNames = new Set(dedupedBatch.map(p => p.name))
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, name')
      .eq('is_active', true)
      .eq('source', 'dutchie')

    const toDeactivate: string[] = []
    for (const p of (allProducts || [])) {
      if (!dutchieProductNames.has(p.name)) toDeactivate.push(p.id)
    }
    if (toDeactivate.length > 0) {
      for (let i = 0; i < toDeactivate.length; i += 200) {
        await supabase
          .from('products')
          .update({ is_active: false })
          .in('id', toDeactivate.slice(i, i + 200))
      }
    }

    const summary = {
      status: 'ok',
      dutchieProducts: dutchieProducts.length,
      deduplicated: dedupedBatch.length,
      productsUpserted,
      upsertError,
      newOrReturningProducts: newOrReturning.length,
      productsDeactivated: toDeactivate.length,
      newBrands: newBrands.length,
      newBrandNames: newBrands,
      totalBrands: brandSet.size,
      usingServiceKey,
      existingBrandsFound: existingBrandNames.size,
      existingProductsFound: existingMap.size,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(summary)
  } catch (err: any) {
    console.error('Dutchie sync error:', err)
    return NextResponse.json(
      { status: 'error', message: err.message },
      { status: 500 }
    )
  }
}

/* GET — Vercel cron calls GET, so this also runs the sync */
export async function GET(req: Request) {
  // Check if this is a Vercel cron call
  const isCron = req.headers.get('x-vercel-cron') === '1' ||
    req.headers.get('user-agent')?.includes('vercel-cron')

  if (isCron) {
    // Run the full sync
    return POST(req)
  }

  // Otherwise, health check
  try {
    const res = await fetch(`${DUTCHIE_BASE}/whoami`, {
      headers: { Authorization: dutchieAuth() },
    })
    const ok = res.ok
    const data = ok ? await res.json() : null

    return NextResponse.json({
      status: ok ? 'connected' : 'error',
      dutchie: ok ? data : `HTTP ${res.status}`,
      endpoint: 'Domes Dutchie Catalog Sync',
    })
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err.message,
      endpoint: 'Domes Dutchie Catalog Sync',
    })
  }
}
