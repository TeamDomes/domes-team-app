'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DUTCHIE_NAME_MAP: Record<string, string> = {
  'Audrey M.': 'audrey',
  'Brenda Merlo Baca': 'brenda',
  'Brian W.': 'brian',
  'Craig P.': 'craig',
  'Eric C.': 'eric',
  'Jerome S.': 'jerome',
  'Lucas S.': 'lucas',
  'Mallory K.': 'mallory',
  'Nakoa Z.': 'nakoa',
  'David T.': 'david',
  'Amanda S.': 'amanda',
  'Samaria M.': 'samaria',
}

function parseCSV(text: string): string[][] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  return lines.map(l => {
    const cols: string[] = []
    let cur = ''
    let inQuote = false
    for (const ch of l) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())
    return cols
  })
}

export default function StatsImportPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aovFile, setAovFile] = useState<File | null>(null)
  const [upsellFile, setUpsellFile] = useState<File | null>(null)
  const [weekEnding, setWeekEnding] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [existingStats, setExistingStats] = useState<any[]>([])

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
    setIsAdmin(me?.role === 'Admin' || me?.role === 'Lead')

    const { data: stats } = await supabase
      .from('weekly_stats')
      .select('*, team(full_name, role, type)')
      .order('week_ending', { ascending: false })
      .limit(50)
    setExistingStats(stats || [])
    setLoading(false)
  }

  async function handleImport() {
    if (!aovFile || !upsellFile || !weekEnding) {
      alert('Please select both CSV files and a week ending date.')
      return
    }

    setImporting(true)
    try {
      const aovText = await aovFile.text()
      const upsellText = await upsellFile.text()

      const aovRows = parseCSV(aovText)
      const upsellRows = parseCSV(upsellText)

      // Find header rows (look for "Budtender Name" or "Budtender")
      let aovHeaderIdx = aovRows.findIndex(r => r[0]?.includes('Budtender'))
      let upsellHeaderIdx = upsellRows.findIndex(r => r[0]?.includes('Budtender'))
      if (aovHeaderIdx < 0) aovHeaderIdx = 5
      if (upsellHeaderIdx < 0) upsellHeaderIdx = 5

      const aovHeader = aovRows[aovHeaderIdx]
      const upsellHeader = upsellRows[upsellHeaderIdx]

      // Parse AOV data: Budtender Name, Net Sales, Net AOV, Total Orders
      const aovData: Record<string, { netSales: number; netAOV: number; orders: number }> = {}
      for (let i = aovHeaderIdx + 1; i < aovRows.length; i++) {
        const row = aovRows[i]
        if (!row[0] || row[0] === '') continue
        const name = row[0]
        const memberId = DUTCHIE_NAME_MAP[name]
        if (!memberId) continue

        const netSalesIdx = aovHeader.findIndex((h: string) => h === 'Net Sales')
        const netAOVIdx = aovHeader.findIndex((h: string) => h === 'Net AOV')
        const ordersIdx = aovHeader.findIndex((h: string) => h === 'Total Orders')

        const netSales = parseFloat(row[netSalesIdx] || '0') || 0
        const netAOV = parseFloat(row[netAOVIdx] || '0') || 0
        const orders = parseInt(row[ordersIdx] || '0') || 0

        if (aovData[memberId]) {
          aovData[memberId].netSales += netSales
          aovData[memberId].orders += orders
          // Recalculate weighted AOV
          aovData[memberId].netAOV = aovData[memberId].netSales / aovData[memberId].orders
        } else {
          aovData[memberId] = { netSales, netAOV, orders }
        }
      }

      // Parse Upsell data: Budtender, Transactions, Upsell Transactions
      const upsellData: Record<string, { transactions: number; upsellTx: number }> = {}
      for (let i = upsellHeaderIdx + 1; i < upsellRows.length; i++) {
        const row = upsellRows[i]
        if (!row[0] || row[0] === '') continue
        const name = row[0]
        const memberId = DUTCHIE_NAME_MAP[name]
        if (!memberId) continue

        const txIdx = upsellHeader.findIndex((h: string) => h === 'Transactions')
        const upsellTxIdx = upsellHeader.findIndex((h: string) => h.includes('Upsell Transactions'))

        const transactions = parseInt(row[txIdx] || '0') || 0
        const upsellTx = parseInt(row[upsellTxIdx] || '0') || 0

        upsellData[memberId] = { transactions, upsellTx }
      }

      // Combine and upsert
      const allMembers = new Set([...Object.keys(aovData), ...Object.keys(upsellData)])
      let imported = 0

      for (const memberId of allMembers) {
        const aov = aovData[memberId] || { netSales: 0, netAOV: 0, orders: 0 }
        const upsell = upsellData[memberId] || { transactions: 0, upsellTx: 0 }
        const upsellRate = upsell.transactions > 0
          ? Math.round((upsell.upsellTx / upsell.transactions) * 10000) / 100
          : 0

        // Delete existing row for this member+week, then insert
        await supabase
          .from('weekly_stats')
          .delete()
          .eq('team_member_id', memberId)
          .eq('week_ending', weekEnding)

        await supabase.from('weekly_stats').insert({
          team_member_id: memberId,
          week_ending: weekEnding,
          avg_basket: aov.netAOV,
          total_net_sales: aov.netSales,
          total_orders: aov.orders,
          upsell_transactions: upsell.upsellTx,
          upsell_rate: upsellRate,
        })
        imported++
      }

      setResult({ imported, members: [...allMembers] })
      await loadData()
    } catch (err: any) {
      alert('Error importing: ' + err.message)
    }
    setImporting(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#3a7b3c', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div>
  )

  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#888', fontSize: 16, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Admin access required.</p>
    </div>
  )

  // Group existing stats by week
  const statsByWeek: Record<string, any[]> = {}
  existingStats.forEach(s => {
    const w = s.week_ending
    if (!statsByWeek[w]) statsByWeek[w] = []
    statsByWeek[w].push(s)
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: 0 }}>
            Weekly Stats Import
          </h1>
          <a href="/dashboard" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>
            {'<-'} Dashboard
          </a>
        </div>

        {/* Import Form */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 18, margin: '0 0 16px' }}>
            Import Dutchie Reports
          </h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Download the AOV report and Fulfillment Upsell report from Dutchie, then upload both CSVs below.
          </p>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                Week Ending Date
              </label>
              <input
                type="date"
                value={weekEnding}
                onChange={e => setWeekEnding(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 8, border: '2px solid #e0d9c8', fontSize: 14, fontFamily: 'Cooper Light, system-ui, sans-serif' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                AOV Report (CSV)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={e => setAovFile(e.target.files?.[0] || null)}
                style={{ fontSize: 13 }}
              />
              <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Dutchie: Reports {'>'} Average Order Value</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                Fulfillment Upsell Report (CSV)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={e => setUpsellFile(e.target.files?.[0] || null)}
                style={{ fontSize: 13 }}
              />
              <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Dutchie: Reports {'>'} Fulfillment Upsell</p>
            </div>

            <button
              onClick={handleImport}
              disabled={importing || !aovFile || !upsellFile || !weekEnding}
              style={{
                background: (!aovFile || !upsellFile || !weekEnding) ? '#ccc' : '#3a7b3c',
                color: 'white', border: 'none', borderRadius: 10, padding: '14px 20px',
                fontFamily: 'Cooper Black, serif', fontSize: 16,
                cursor: (!aovFile || !upsellFile || !weekEnding) ? 'default' : 'pointer',
              }}
            >
              {importing ? 'Importing...' : 'Import Stats'}
            </button>
          </div>

          {result && (
            <div style={{ marginTop: 16, background: '#e8f5e9', borderRadius: 8, padding: 16 }}>
              <p style={{ margin: 0, fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 16 }}>
                Imported stats for {result.imported} team members
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666' }}>
                {result.members.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Existing Stats */}
        {Object.keys(statsByWeek).length > 0 && (
          <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 18, margin: '0 0 16px' }}>
              Past Imports
            </h2>
            {Object.entries(statsByWeek).map(([week, stats]) => (
              <div key={week} style={{ marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 15, margin: '0 0 8px' }}>
                  Week ending {new Date(week + 'T12:00:00').toLocaleDateString()}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e0d9c8' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#666' }}>Name</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Avg Basket</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Net Sales</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Orders</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Upsell %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((s: any) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 12px', color: '#333' }}>{s.team?.full_name || s.team_member_id}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>${Number(s.avg_basket).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>${Number(s.total_net_sales).toLocaleString()}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>{s.total_orders}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>{Number(s.upsell_rate).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
