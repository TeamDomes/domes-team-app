'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export default function CatalogImportPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [dutchieStatus, setDutchieStatus] = useState<string>('')

  useEffect(() => { loadData(); checkDutchie() }, [])

  async function checkDutchie() {
    try {
      const res = await fetch('/api/dutchie/sync')
      const data = await res.json()
      setDutchieStatus(data.status === 'connected' ? 'connected' : 'not connected')
    } catch {
      setDutchieStatus('not connected')
    }
  }

  async function handleDutchieSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/dutchie/sync', { method: 'POST' })
      const data = await res.json()
      setSyncResult(data)
      // Reload brands list
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name, is_active, description')
        .order('name')
      setBrands(brandsData || [])
    } catch (err: any) {
      setSyncResult({ status: 'error', message: err.message })
    }
    setSyncing(false)
  }

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
      // Parse file into rows (array of string arrays)
      let rows: string[][] = []
      const isExcel = file.name.match(/\.xlsx?$/i)

      if (isExcel) {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        rows = raw.map(r => r.map((c: any) => String(c ?? '').trim()))
      } else {
        const text = await file.text()
        const lines = text.split('\n').map(l => l.trim()).filter(l => l)
        const delimiter = lines[0]?.includes('\t') ? '\t' : ','
        rows = lines.map(l => l.split(delimiter).map(c => c.trim()))
      }

      if (rows.length === 0) { setResult({ error: 'Empty file' }); setImporting(false); return }

      // Find the header row (scan for a row containing "Product")
      let headerRowIdx = -1
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        if (rows[i].some(c => c.toLowerCase() === 'product')) {
          headerRowIdx = i
          break
        }
      }

      if (headerRowIdx === -1) {
        setResult({ error: 'Could not find "Product" column. Make sure your file has a Product column header.' })
        setImporting(false)
        return
      }

      const header = rows[headerRowIdx]
      const productIdx = header.findIndex(h => h.toLowerCase() === 'product')
      const retiredIdx = header.findIndex(h => h.toLowerCase().includes('retired'))
      const dataRows = rows.slice(headerRowIdx + 1)

      // Extract brand names from Product column (everything before first |)
      const brandSet = new Set<string>()
      const retiredBrands = new Set<string>()

      for (const cols of dataRows) {
        const product = cols[productIdx]
        if (!product) continue

        const brandName = product.split('|')[0].trim()
        if (!brandName) continue

        const isRetired = retiredIdx >= 0 && cols[retiredIdx]?.toLowerCase() === 'yes'
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

      // Insert new brands in batches (with discovered_date so dashboard can show them)
      if (newBrands.length > 0) {
        const today = new Date().toISOString().split('T')[0]
        const brandRows = newBrands.map(name => ({ name, is_active: true, discovered_date: today }))
        for (let i = 0; i < brandRows.length; i += 100) {
          await supabase.from('brands').insert(brandRows.slice(i, i + 100))
        }
      }

      // Mark retired brands
      const retiredArr = Array.from(retiredBrands)
      if (retiredArr.length > 0) {
        await supabase.from('brands').update({ is_active: false }).in('name', retiredArr)
      }

      // Re-activate brands that are back
      const reactivate = Array.from(brandSet).filter(n => existingNames.has(n))
      if (reactivate.length > 0) {
        await supabase.from('brands').update({ is_active: true }).in('name', reactivate)
      }

      // Also populate products table for Staff Reviews dropdown (batched)
      const categoryIdx = header.findIndex(h => h.toLowerCase().includes('category') || h.toLowerCase().includes('mastercategory'))
      const productBatch: any[] = []
      for (const cols of dataRows) {
        const product = cols[productIdx]
        if (!product) continue
        const isRetired = retiredIdx >= 0 && cols[retiredIdx]?.toLowerCase() === 'yes'
        if (isRetired) continue
        const brand = product.split('|')[0].trim()
        const category = categoryIdx >= 0 ? (cols[categoryIdx] || '') : ''
        productBatch.push({ name: product, brand, category, source: 'catalog', is_active: true })
      }
      let productsAdded = 0
      for (let i = 0; i < productBatch.length; i += 200) {
        const { error } = await supabase.from('products').upsert(
          productBatch.slice(i, i + 200),
          { onConflict: 'name' }
        )
        if (!error) productsAdded += Math.min(200, productBatch.length - i)
      }

      setResult({
        totalProducts: dataRows.length,
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
        <div style={{ textAlign: 'right', marginBottom: 10 }}>
          <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block' }}>
            {'←'} Dashboard
          </a>
        </div>

        <h1 style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 24, color: '#543c2d', marginTop: 10 }}>
          Product Catalog Import
        </h1>
        <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#666', marginBottom: 20 }}>
          Upload your Dutchie Product Catalog (.csv or .xlsx) to automatically detect new brands.
          The importer looks at the Product column and extracts brand names (everything before the | symbol).
          Brands marked RETIRED will be deactivated.
        </p>

        {/* Dutchie Sync Section */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #3a7b3c',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 16, color: '#3a7b3c', margin: 0 }}>
              Dutchie POS Sync
            </h3>
            <span style={{
              fontSize: 11, fontFamily: 'Cooper Light, Georgia, serif',
              padding: '3px 10px', borderRadius: 20,
              background: dutchieStatus === 'connected' ? '#e8f5e9' : '#fff3cd',
              color: dutchieStatus === 'connected' ? '#3a7b3c' : '#856404',
            }}>
              {dutchieStatus === 'connected' ? 'Connected' : dutchieStatus === 'not connected' ? 'Not Connected' : 'Checking...'}
            </span>
          </div>
          <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#666', margin: '0 0 15px' }}>
            Pull the latest product catalog and inventory levels directly from Dutchie. Runs automatically every morning at 7am.
          </p>
          <button
            onClick={handleDutchieSync}
            disabled={syncing || dutchieStatus !== 'connected'}
            style={{
              background: syncing || dutchieStatus !== 'connected' ? '#ccc' : '#3a7b3c',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px 24px', fontFamily: 'Cooper Black, Georgia, serif',
              fontSize: 15, cursor: syncing || dutchieStatus !== 'connected' ? 'default' : 'pointer',
              width: '100%',
            }}
          >
            {syncing ? 'Syncing from Dutchie...' : 'Sync from Dutchie'}
          </button>
        </div>

        {/* Dutchie Sync Results */}
        {syncResult && syncResult.status === 'ok' && (
          <div style={{
            background: '#e8f5e9', borderRadius: 12, padding: 20, marginBottom: 20,
            border: '2px solid #3a7b3c',
          }}>
            <h3 style={{ fontFamily: 'Cooper Black, Georgia, serif', color: '#3a7b3c', margin: '0 0 10px' }}>
              Dutchie Sync Complete!
            </h3>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#333', margin: '4px 0' }}>
              Products from Dutchie: {syncResult.dutchieProducts}
            </p>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#333', margin: '4px 0' }}>
              Products synced: {syncResult.productsUpserted}
            </p>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#333', margin: '4px 0' }}>
              Products deactivated (removed from menu): {syncResult.productsDeactivated}
            </p>
            {syncResult.upsertError && (
              <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#d32f2f', margin: '4px 0', fontWeight: 'bold' }}>
                Product sync error: {syncResult.upsertError}
              </p>
            )}
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#3a7b3c', margin: '4px 0', fontWeight: 'bold' }}>
              New brands discovered: {syncResult.newBrands}
            </p>
            {syncResult.newBrandNames && syncResult.newBrandNames.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#666', margin: '0 0 5px' }}>New brands:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {syncResult.newBrandNames.map((n: string) => (
                    <span key={n} style={{
                      background: '#3a7b3c', color: '#fff', borderRadius: 20,
                      padding: '3px 10px', fontSize: 12, fontFamily: 'Cooper Light, Georgia, serif',
                    }}>{n}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {syncResult?.status === 'error' && (
          <div style={{
            background: '#ffebee', borderRadius: 12, padding: 20, marginBottom: 20,
            border: '2px solid #d32f2f',
          }}>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#d32f2f', margin: 0 }}>
              Dutchie sync error: {syncResult.message}
            </p>
          </div>
        )}

        {/* Manual Upload Section */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <input
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
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
            Active Brands ({brands.filter(b => b.is_active).length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {brands.filter(b => b.is_active).map((b: any) => (
              <span key={b.id} style={{
                background: b.description ? '#3a7b3c' : '#888',
                color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11,
                fontFamily: 'Cooper Light, Georgia, serif',
              }}>
                {b.name}
              </span>
            ))}
          </div>
          <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 11, color: '#999', marginTop: 10 }}>
            Green = has info/talking points | Gray = needs info
          </p>
        </div>
      </div>
    </div>
  )
}
