'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CatalogImportPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: teamData } = await supabase.from('team').select('*')
    let me: any = null
    ;(teamData || []).forEach((t: any) => {
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setCurrentUser(me)
    setIsAdmin(me?.role === 'Admin' || me?.role === 'Lead')

    const { data: brandsData } = await supabase
      .from('brands')
      .select('id, name, is_active, description')
      .order('name')
    setBrands(brandsData || [])
    setLoading(false)
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      // Parse CSV - handle both comma and tab delimited
      const lines = text.split('\n').map(l => l.trim()).filter(l => l)
      if (lines.length === 0) { setResult({ error: 'Empty file' }); setImporting(false); return }

      // Find header row
      const header = lines[0].includes('\t') ? lines[0].split('\t') : lines[0].split(',')
      const productIdx = header.findIndex(h => h.toLowerCase().includes('product'))
      const retiredIdx = header.findIndex(h => h.toLowerCase().includes('retired'))

      if (productIdx === -1) {
        setResult({ error: 'Could not find "Product" column. Make sure your file has a Product column header.' })
        setImporting(false)
        return
      }

      // Extract brand names from Product column (everything before first |)
      const delimiter = lines[0].includes('\t') ? '\t' : ','
      const brandSet = new Set<string>()
      const retiredBrands = new Set<string>()

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter)
        const product = cols[productIdx]?.trim()
        if (!product) continue

        const brandName = product.split('|')[0].trim()
        if (!brandName) continue

        const isRetired = retiredIdx >= 0 && cols[retiredIdx]?.trim().toLowerCase() === 'yes'
        if (isRetired) {
          retiredBrands.add(brandName)
        } else {
          brandSet.add(brandName)
        }
      }

      // Remove any brand from active set if it's also in retired
      retiredBrands.forEach(b => brandSet.delete(b))

      // Get existing brands
      const { data: existing } = await supabase.from('brands').select('name')
      const existingNames = new Set((existing || []).map(b => b.name))

      // Find new brands
      const newBrands: string[] = []
      brandSet.forEach(name => {
        if (!existingNames.has(name)) newBrands.push(name)
      })

      // Insert new brands
      if (newBrands.length > 0) {
        for (const name of newBrands) {
          await supabase.from('brands').insert({ name, is_active: true })
        }
      }

      // Mark retired brands
      for (const name of Array.from(retiredBrands)) {
        await supabase.from('brands').update({ is_active: false }).eq('name', name)
      }

      // Re-activate brands that are back
      for (const name of Array.from(brandSet)) {
        if (existingNames.has(name)) {
          await supabase.from('brands').update({ is_active: true }).eq('name', name)
        }
      }

      // Also populate products table for Staff Reviews dropdown
      const categoryIdx = header.findIndex(h => h.toLowerCase().includes('category') || h.toLowerCase().includes('mastercategory'))
      let productsAdded = 0
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter)
        const product = cols[productIdx]?.trim()
        if (!product) continue
        const isRetired = retiredIdx >= 0 && cols[retiredIdx]?.trim().toLowerCase() === 'yes'
        if (isRetired) continue
        const brand = product.split('|')[0].trim()
        const category = categoryIdx >= 0 ? cols[categoryIdx]?.trim() : ''
        const { error } = await supabase.from('products').upsert(
          { name: product, brand, category, source: 'catalog', is_active: true },
          { onConflict: 'name' }
        )
        if (!error) productsAdded++
      }

      setResult({
        totalProducts: lines.length - 1,
        activeBrands: brandSet.size,
        retiredBrands: retiredBrands.size,
        newBrands: newBrands.length,
        newBrandNames: newBrands,
        productsAdded,
      })

      // Reload brands list
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name, is_active, description')
        .order('name')
      setBrands(brandsData || [])

    } catch (err: any) {
      setResult({ error: err.message })
    }
    setImporting(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f4e6b4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#543c2d' }}>Loading...</p>
    </div>
  )

  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', background: '#f4e6b4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#543c2d' }}>Admin access required.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f4e6b4', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: '#3a7b3c', textDecoration: 'none', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14 }}>
          {'←'} Back to Dashboard
        </a>

        <h1 style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 24, color: '#543c2d', marginTop: 10 }}>
          Product Catalog Import
        </h1>
        <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#666', marginBottom: 20 }}>
          Upload your Dutchie Product Catalog (.csv) to automatically detect new brands.
          The importer looks at the Product column and extracts brand names (everything before the | symbol).
          Brands marked RETIRED will be deactivated.
        </p>

        {/* Upload Section */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={e => setFile(e.target.files?.[0] || null)}
            style={{ marginBottom: 15, fontFamily: 'Cooper Light, Georgia, serif' }}
          />
          <button
            onClick={handleImport}
            disabled={!file || importing}
            style={{
              background: !file || importing ? '#ccc' : '#3a7b3c',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px 24px', fontFamily: 'Cooper Black, Georgia, serif',
              fontSize: 15, cursor: !file || importing ? 'default' : 'pointer',
              width: '100%'
            }}
          >
            {importing ? 'Importing...' : 'Import Catalog'}
          </button>
        </div>

        {/* Results */}
        {result && !result.error && (
          <div style={{
            background: '#e8f5e9', borderRadius: 12, padding: 20, marginBottom: 20,
            border: '2px solid #3a7b3c'
          }}>
            <h3 style={{ fontFamily: 'Cooper Black, Georgia, serif', color: '#3a7b3c', margin: '0 0 10px' }}>
              Import Complete!
            </h3>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#333', margin: '4px 0' }}>
              Products scanned: {result.totalProducts}
            </p>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#333', margin: '4px 0' }}>
              Active brands found: {result.activeBrands}
            </p>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#333', margin: '4px 0' }}>
              Retired brands: {result.retiredBrands}
            </p>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#3a7b3c', margin: '4px 0', fontWeight: 'bold' }}>
              New brands added: {result.newBrands}
            </p>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#333', margin: '4px 0' }}>
              Products added to reviews: {result.productsAdded}
            </p>
            {result.newBrandNames && result.newBrandNames.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#666', margin: '0 0 5px' }}>New brands:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.newBrandNames.map((n: string) => (
                    <span key={n} style={{
                      background: '#3a7b3c', color: '#fff', borderRadius: 20,
                      padding: '3px 10px', fontSize: 12, fontFamily: 'Cooper Light, Georgia, serif'
                    }}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result?.error && (
          <div style={{
            background: '#ffebee', borderRadius: 12, padding: 20, marginBottom: 20,
            border: '2px solid #d32f2f'
          }}>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#d32f2f', margin: 0 }}>
              Error: {result.error}
            </p>
          </div>
        )}

        {/* Brand Count */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ fontFamily: 'Cooper Black, Georgia, serif', color: '#543c2d', margin: '0 0 10px' }}>
            All Brands ({brands.filter(b => b.is_active).length} active / {brands.filter(b => !b.is_active).length} retired)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {brands.map((b: any) => (
              <span key={b.id} style={{
                background: b.is_active ? (b.description ? '#3a7b3c' : '#888') : '#d32f2f',
                color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11,
                fontFamily: 'Cooper Light, Georgia, serif',
                opacity: b.is_active ? 1 : 0.6
              }}>
                {b.name}
              </span>
            ))}
          </div>
          <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 11, color: '#999', marginTop: 10 }}>
            Green = has info/talking points | Gray = needs info | Red = retired
          </p>
        </div>
      </div>
    </div>
  )
}
