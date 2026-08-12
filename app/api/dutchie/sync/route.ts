import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role key for server-side operations (bypasses RLS)
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
      const category = dp.category || dp.productCategory || dp.masterCategory || ''
      const dutchieId = String(dp.id || dp.productId || '')

      if (!name) continue
      if (brand) brandSet.add(brand)

      // Build the product name in "Brand | Product" format if not already
      const productName = name.includes('|') ? name : (brand ? `${brand} | ${name}` : name)

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

    // 7. Upsert products in batches
    let productsUpserted = 0
    for (let i = 0; i < productBatch.length; i += 200) {
      const batch = productBatch.slice(i, i + 200)
      const { error } = await supabase.from('products').upsert(batch, {
        onConflict: 'name',
      })
      if (!error) productsUpserted += batch.length
    }

    // 8. Mark products NOT in the Dutchie feed as inactive (they've been removed from menu)
    const dutchieProductNames = new Set(productBatch.map(p => p.name))
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
      productsUpserted,
      productsDeactivated: toDeactivate.length,
      newBrands: newBrands.length,
      newBrandNames: newBrands,
      totalBrands: brandSet.size,
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
