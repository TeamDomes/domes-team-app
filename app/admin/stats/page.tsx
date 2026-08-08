'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

const BIG_BASKET_THRESHOLD = 100

// Match a report name to a team member by first name
function findMember(reportName: string, team: any[]): any | null {
  if (!reportName) return null
  const rLow = reportName.toLowerCase().trim()
  // Try exact full_name match first
  for (const t of team) {
    if (t.full_name?.toLowerCase() === rLow) return t
  }
  // Try first-name match (handles "Aud M.", "Craig P.", "Amanda Perez", etc.)
  const rFirst = rLow.split(/[\s.]/)[0]
  for (const t of team) {
    const dbFirst = (t.first_name || t.full_name?.split(' ')[0] || '').toLowerCase()
    if (dbFirst === rFirst || dbFirst.startsWith(rFirst) || rFirst.startsWith(dbFirst)) return t
  }
  return null
}

// For shared cash drawers like "Nakoa/Brian" — returns array of members
function findCashMembers(empName: string, team: any[]): any[] {
  if (!empName || empName === 'Lead' || empName === 'n/a' || empName === 'All') return []
  const parts = empName.split('/')
  const members: any[] = []
  for (const part of parts) {
    const m = findMember(part.trim(), team)
    if (m) members.push(m)
  }
  return members
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

async function parseFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    return rows.map(r => r.map(c => String(c).trim()))
  }
  const text = await file.text()
  return parseCSV(text)
}

async function parseCashReconSheets(file: File): Promise<string[][][]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const allSheets: string[][][] = []
  for (const name of workbook.SheetNames) {
    if (name === 'Summary') continue
    const sheet = workbook.Sheets[name]
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    allSheets.push(rows.map(r => r.map(c => String(c).trim())))
  }
  return allSheets
}

export default function StatsImportPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [aovFile, setAovFile] = useState<File | null>(null)
  const [upsellFile, setUpsellFile] = useState<File | null>(null)
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null)
  const [cashReconFile, setCashReconFile] = useState<File | null>(null)
  const [salesRawFile, setSalesRawFile] = useState<File | null>(null)
  const [weekEnding, setWeekEnding] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [existingStats, setExistingStats] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: teamData } = await supabase.from('team').select('*')
    setTeamMembers(teamData || [])
    let me: any = null
    ;(teamData || []).forEach((t: any) => {
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setIsAdmin(me?.role === 'Admin' || me?.role === 'Lead')

    const { data: stats } = await supabase
      .from('weekly_stats')
      .select('*')
      .order('week_ending', { ascending: false })
      .limit(50)
    setExistingStats(stats || [])
    setLoading(false)
  }

  async function handleImport() {
    if (!aovFile || !upsellFile || !weekEnding) {
      alert('Please select the AOV and Upsell files plus a week ending date.')
      return
    }

    setImporting(true)
    try {
      const team = teamMembers

      // ── 1. Parse AOV ──
      const aovRows = await parseFile(aovFile)
      let aovHeaderIdx = aovRows.findIndex(r => r[0]?.includes('Budtender'))
      if (aovHeaderIdx < 0) aovHeaderIdx = 4
      const aovHeader = aovRows[aovHeaderIdx]

      const aovData: Record<string, { netSales: number; netAOV: number; orders: number }> = {}
      for (let i = aovHeaderIdx + 1; i < aovRows.length; i++) {
        const row = aovRows[i]
        if (!row[0]) continue
        const member = findMember(row[0], team)
        if (!member) continue
        const mid = member.id
        const netSalesIdx = aovHeader.findIndex((h: string) => h === 'Net Sales')
        const netAOVIdx = aovHeader.findIndex((h: string) => h === 'Net AOV')
        const ordersIdx = aovHeader.findIndex((h: string) => h === 'Total Orders')
        const netSales = parseFloat(row[netSalesIdx] || '0') || 0
        const netAOV = parseFloat(row[netAOVIdx] || '0') || 0
        const orders = parseInt(row[ordersIdx] || '0') || 0
        if (aovData[mid]) {
          aovData[mid].netSales += netSales
          aovData[mid].orders += orders
          aovData[mid].netAOV = aovData[mid].netSales / aovData[mid].orders
        } else {
          aovData[mid] = { netSales, netAOV, orders }
        }
      }

      // ── 2. Parse Upsell ──
      const upsellRows = await parseFile(upsellFile)
      let upsellHeaderIdx = upsellRows.findIndex(r => r[0]?.includes('Budtender'))
      if (upsellHeaderIdx < 0) upsellHeaderIdx = 4
      const upsellHeader = upsellRows[upsellHeaderIdx]

      const upsellData: Record<string, { transactions: number; upsellTx: number }> = {}
      for (let i = upsellHeaderIdx + 1; i < upsellRows.length; i++) {
        const row = upsellRows[i]
        if (!row[0]) continue
        const member = findMember(row[0], team)
        if (!member) continue
        const txIdx = upsellHeader.findIndex((h: string) => h === 'Transactions')
        const upsellTxIdx = upsellHeader.findIndex((h: string) => h.includes('Upsell Transactions'))
        upsellData[member.id] = {
          transactions: parseInt(row[txIdx] || '0') || 0,
          upsellTx: parseInt(row[upsellTxIdx] || '0') || 0,
        }
      }

      // ── 3. Parse Attendance (optional) ──
      const onTimeData: Record<string, boolean> = {}
      if (attendanceFile) {
        const attRows = await parseFile(attendanceFile)
        let attHeaderIdx = attRows.findIndex(r => r.some(c => c === 'Name'))
        if (attHeaderIdx < 0) attHeaderIdx = 0
        const attHeader = attRows[attHeaderIdx]
        const nameIdx = attHeader.indexOf('Name')
        const typeIdx = attHeader.indexOf('Type')
        const lateMembers = new Set<string>()
        for (let i = attHeaderIdx + 1; i < attRows.length; i++) {
          const row = attRows[i]
          const name = row[nameIdx]
          const type = row[typeIdx]
          const member = findMember(name, team)
          if (!member) continue
          if (!(member.id in onTimeData)) onTimeData[member.id] = true
          if (type === 'late on clock-in' || type === 'no show on shift') {
            lateMembers.add(member.id)
          }
        }
        for (const id of lateMembers) {
          onTimeData[id] = false
        }
      }

      // ── 4. Parse Cash Reconciliation (optional) ──
      const drawerData: Record<string, number> = {}
      if (cashReconFile) {
        const sheets = await parseCashReconSheets(cashReconFile)
        for (const sheet of sheets) {
          const headerIdx = sheet.findIndex(r => r[0] === 'Register #')
          if (headerIdx < 0) continue
          const header = sheet[headerIdx]
          const empIdx = header.indexOf('Employee Name')
          const varIdx = header.indexOf('Total Variance')
          if (empIdx < 0 || varIdx < 0) continue
          for (let i = headerIdx + 1; i < sheet.length; i++) {
            const row = sheet[i]
            if (!row[0] || !row[0].match(/^\d+$/) || !row[empIdx]) continue
            const variance = parseFloat(row[varIdx] || '0') || 0
            const members = findCashMembers(row[empIdx], team)
            if (members.length === 0) continue
            const splitVariance = Math.abs(variance) / members.length
            for (const m of members) {
              drawerData[m.id] = (drawerData[m.id] || 0) + splitVariance
            }
          }
        }
      }

      // ── 5. Parse Sales Raw Data for Big Baskets (optional) ──
      const bigBasketData: Record<string, number> = {}
      if (salesRawFile) {
        const salesRows = await parseFile(salesRawFile)
        let salesHeaderIdx = salesRows.findIndex(r => r[0] === 'TransId')
        if (salesHeaderIdx < 0) salesHeaderIdx = 4
        const salesHeader = salesRows[salesHeaderIdx]
        const nameIdx = salesHeader.indexOf('FullName')
        const totalIdx = salesHeader.indexOf('InvoiceTotal')
        for (let i = salesHeaderIdx + 1; i < salesRows.length; i++) {
          const row = salesRows[i]
          if (!row[nameIdx]) continue
          const member = findMember(row[nameIdx], team)
          if (!member) continue
          const total = parseFloat(row[totalIdx] || '0') || 0
          if (total >= BIG_BASKET_THRESHOLD) {
            bigBasketData[member.id] = (bigBasketData[member.id] || 0) + 1
          }
        }
      }

      // ── Combine & upsert ──
      const allMemberIds = new Set([
        ...Object.keys(aovData),
        ...Object.keys(upsellData),
        ...Object.keys(onTimeData),
        ...Object.keys(drawerData),
        ...Object.keys(bigBasketData),
      ])
      let imported = 0

      for (const memberId of allMemberIds) {
        const aov = aovData[memberId] || { netSales: 0, netAOV: 0, orders: 0 }
        const upsell = upsellData[memberId] || { transactions: 0, upsellTx: 0 }
        const upsellRate = upsell.transactions > 0
          ? Math.round((upsell.upsellTx / upsell.transactions) * 10000) / 100
          : 0

        await supabase
          .from('weekly_stats')
          .delete()
          .eq('team_member_id', memberId)
          .eq('week_ending', weekEnding)

        const record: any = {
          team_member_id: memberId,
          week_ending: weekEnding,
          average_basket: aov.netAOV,
          total_net_sales: aov.netSales,
          total_orders: aov.orders,
          upsell_transactions: upsell.upsellTx,
          upsell_pct: upsellRate,
        }
        if (memberId in onTimeData) record.was_on_time = onTimeData[memberId]
        if (memberId in drawerData) record.drawer_variance = Math.round(drawerData[memberId] * 100) / 100
        if (memberId in bigBasketData) record.big_basket_count = bigBasketData[memberId]

        const { error: insertErr } = await supabase.from('weekly_stats').insert(record)
        if (insertErr) {
          console.error('Insert error for', memberId, insertErr)
          alert('Insert failed for ' + (team.find((t: any) => t.id === memberId)?.full_name || memberId) + ': ' + insertErr.message)
          continue
        }
        imported++
      }

      // Build friendly name list for result
      const nameList = [...allMemberIds].map(id => {
        const m = team.find((t: any) => t.id === id)
        return m?.full_name || id
      })

      setResult({
        imported,
        members: nameList,
        extras: {
          attendance: Object.keys(onTimeData).length > 0,
          cashRecon: Object.keys(drawerData).length > 0,
          bigBaskets: Object.keys(bigBasketData).length > 0,
        },
      })
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

  // Build team lookup for display
  const teamMap: Record<string, any> = {}
  teamMembers.forEach((t: any) => { teamMap[t.id] = t })

  const statsByWeek: Record<string, any[]> = {}
  existingStats.forEach(s => {
    const w = s.week_ending
    if (!statsByWeek[w]) statsByWeek[w] = []
    statsByWeek[w].push(s)
  })

  const fileAccept = '.csv,.xlsx,.xls'

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
            Import Weekly Reports
          </h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Upload your Dutchie reports and other data. AOV and Upsell are required; the rest are optional. CSV or Excel accepted.
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

            {/* Required reports */}
            <div style={{ background: '#f0faf0', borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: '#3a7b3c', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
                Required (Dutchie)
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                    AOV Report
                  </label>
                  <input type="file" accept={fileAccept} onChange={e => setAovFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Dutchie: Reports {'>'} Average Order Value</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                    Fulfillment Upsell Report
                  </label>
                  <input type="file" accept={fileAccept} onChange={e => setUpsellFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Dutchie: Reports {'>'} Fulfillment Upsell</p>
                </div>
              </div>
            </div>

            {/* Optional reports */}
            <div style={{ background: '#faf8f0', borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: '#b8860b', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
                Optional
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                    Attendance Report
                  </label>
                  <input type="file" accept={fileAccept} onChange={e => setAttendanceFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Homebase or timekeeping export (on-time tracking)</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                    Cash Reconciliation
                  </label>
                  <input type="file" accept={fileAccept} onChange={e => setCashReconFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Daily Cash Reconciliation Log (drawer accuracy)</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                    Sales Raw Data
                  </label>
                  <input type="file" accept={fileAccept} onChange={e => setSalesRawFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Dutchie: Sales Transactions by Date — counts baskets ${BIG_BASKET_THRESHOLD}+</p>
                </div>
              </div>
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
              {(result.extras.attendance || result.extras.cashRecon || result.extras.bigBaskets) && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#888' }}>
                  Also imported:
                  {result.extras.attendance ? ' attendance' : ''}
                  {result.extras.cashRecon ? ' drawer-data' : ''}
                  {result.extras.bigBaskets ? ' big-baskets' : ''}
                </p>
              )}
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
                        <th style={{ textAlign: 'center', padding: '8px 12px', color: '#666' }}>On Time</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Drawer $</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Big Baskets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((s: any) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 12px', color: '#333' }}>{teamMap[s.team_member_id]?.full_name || s.team_member_id}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>${Number(s.average_basket).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>${Number(s.total_net_sales).toLocaleString()}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>{s.total_orders}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>{Number(s.upsell_pct).toFixed(1)}%</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {s.was_on_time === true ? '✅' : s.was_on_time === false ? '❌' : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>
                            {s.drawer_variance != null ? `$${Number(s.drawer_variance).toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>
                            {s.big_basket_count != null ? s.big_basket_count : '—'}
                          </td>
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
