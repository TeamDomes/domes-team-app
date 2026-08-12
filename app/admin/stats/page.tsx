'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

const BIG_BASKET_THRESHOLD = 250

function parseVariance(val: any): number {
  if (typeof val === 'number') return val
  const str = String(val).replace(/[$,]/g, '').trim()
  if (str.startsWith('(') && str.endsWith(')')) return -parseFloat(str.slice(1, -1)) || 0
  return parseFloat(str) || 0
}

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
  // Fuzzy: match if first 3+ chars match (handles "Samara" → "Samaria")
  if (rFirst.length >= 3) {
    const prefix = rFirst.slice(0, 3)
    for (const t of team) {
      const dbFirst = (t.first_name || t.full_name?.split(' ')[0] || '').toLowerCase()
      if (dbFirst.startsWith(prefix) && Math.abs(dbFirst.length - rFirst.length) <= 2) return t
    }
  }
  return null
}

// For shared cash drawers like "Nakoa/Brian", "Craig / Sam", "Nakoa/Brian(4:30-close)"
function findCashMembers(empName: string, team: any[]): any[] {
  if (!empName) return []
  const low = empName.toLowerCase().trim()
  if (low === 'lead' || low === 'n/a' || low === 'na' || low === 'all' || low === 'none' || low === 'unused') return []
  // Clean up: remove parenthetical notes like "(4:30-close)"
  const cleaned = empName.replace(/\(.*?\)/g, '').trim()
  // Split on / with optional spaces
  const parts = cleaned.split(/\s*\/\s*/)
  const members: any[] = []
  for (const part of parts) {
    const name = part.trim()
    if (!name || name.toLowerCase() === 'lead' || name.toLowerCase() === 'all') continue
    const m = findMember(name, team)
    if (m && !members.find(x => x.id === m.id)) members.push(m)
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
  const [cashReconFiles, setCashReconFiles] = useState<File[]>([])
  const [salesRawFile, setSalesRawFile] = useState<File | null>(null)
  const [payrollFile, setPayrollFile] = useState<File | null>(null)
  const [weekEnding, setWeekEnding] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [existingStats, setExistingStats] = useState<any[]>([])
  const [samplesFile, setSamplesFile] = useState<File | null>(null)
  const [importingSamples, setImportingSamples] = useState(false)
  const [samplesResult, setSamplesResult] = useState<any>(null)

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

  async function handleSamplesImport() {
    if (!samplesFile) return
    setImportingSamples(true)
    setSamplesResult(null)
    try {
      const buffer = await samplesFile.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const productNames = new Set<string>()

      for (const sheetName of workbook.SheetNames) {
        if (sheetName.toLowerCase() === 'template') continue
        const sheet = workbook.Sheets[sheetName]
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

        // Check if this is a date-style sheet (Budtender, Samples given, Feedback)
        const header = rows[0]?.map((c: any) => String(c).toLowerCase().trim()) || []
        const samplesIdx = header.findIndex((h: string) => h.includes('samples given') || h.includes('sample'))

        if (samplesIdx >= 0) {
          // Date sheet: extract product names from "Samples given" column
          for (let i = 1; i < rows.length; i++) {
            const val = String(rows[i]?.[samplesIdx] || '').trim()
            if (!val || val === 'NaN') continue
            // Could be comma-separated or newline-separated
            const items = val.split(/[,\n]+/).map((s: string) => s.trim()).filter(Boolean)
            items.forEach((item: string) => { if (item.length > 2) productNames.add(item) })
          }
          continue
        }

        // Revelry-style sheet: look for Brand/Description columns in various sub-tables
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (!row) continue
          // Find header rows with "Brand" and "Description"
          const brandIdx = row.findIndex((c: any) => String(c).toLowerCase().trim() === 'brand')
          const descIdx = row.findIndex((c: any) => String(c).toLowerCase().trim() === 'description')
          if (brandIdx >= 0) {
            // Read rows below this header until blank
            for (let j = i + 1; j < rows.length; j++) {
              const dataRow = rows[j]
              const brand = String(dataRow?.[brandIdx] || '').trim()
              if (!brand || brand === 'NaN' || brand.toLowerCase().includes('total')) break
              const desc = descIdx >= 0 ? String(dataRow?.[descIdx] || '').trim() : ''
              const fullName = desc && desc !== 'NaN' ? `${brand} - ${desc}` : brand
              if (fullName.length > 2) productNames.add(fullName)
            }
          }
        }

        // Individual budtender sheets: check for product-like data in any column
        if (sheetName.length <= 10 && !sheetName.includes('.')) {
          for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < (rows[i]?.length || 0); j++) {
              const val = String(rows[i][j] || '').trim()
              if (val.includes(' - ') && val.length > 5 && val !== 'NaN') {
                productNames.add(val)
              }
            }
          }
        }
      }

      // Insert into products table
      let inserted = 0
      for (const name of productNames) {
        const brand = name.includes(' - ') ? name.split(' - ')[0].trim() : name
        const { error } = await supabase.from('products').upsert(
          { name, brand, source: 'sample', is_active: true },
          { onConflict: 'name' }
        )
        if (!error) inserted++
      }

      setSamplesResult({ total: productNames.size, inserted })
    } catch (err: any) {
      alert('Error importing samples: ' + err.message)
    }
    setImportingSamples(false)
  }

  async function handleImport() {
    if (!weekEnding) {
      alert('Please select a week ending date.')
      return
    }
    if (!aovFile && !upsellFile && !attendanceFile && cashReconFiles.length === 0 && !salesRawFile && !payrollFile) {
      alert('Please select at least one report to import.')
      return
    }

    setImporting(true)
    try {
      const team = teamMembers

      // ── 1. Parse AOV (optional) ──
      const aovRows = aovFile ? await parseFile(aovFile) : []
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

      // ── 2. Parse Upsell (optional) ──
      const upsellRows = upsellFile ? await parseFile(upsellFile) : []
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
      // Count unique DAYS per person as shifts (not rows).
      // Only the first clock-in of each day determines lateness.
      const onTimeData: Record<string, boolean> = {}
      const shiftCounts: Record<string, { total: number; onTime: number }> = {}
      if (attendanceFile) {
        const attRows = await parseFile(attendanceFile)
        let attHeaderIdx = attRows.findIndex(r => r.some(c => c === 'Name'))
        if (attHeaderIdx < 0) attHeaderIdx = 0
        const attHeader = attRows[attHeaderIdx]
        const nameIdx = attHeader.indexOf('Name')
        const typeIdx = attHeader.indexOf('Type')
        const dateIdx = attHeader.indexOf('Date')
        const shiftIdx = attHeader.indexOf('Shift Time')

        // Group by member+date, track earliest shift start per day
        const dayMap: Record<string, Record<string, { lateClockIn: boolean; noShow: boolean; earliestShift: string }>> = {}

        for (let i = attHeaderIdx + 1; i < attRows.length; i++) {
          const row = attRows[i]
          const name = row[nameIdx]
          const type = (row[typeIdx] || '').trim()
          const date = (row[dateIdx >= 0 ? dateIdx : 0] || '').trim()
          const shiftTime = (row[shiftIdx >= 0 ? shiftIdx : 0] || '').trim()
          const member = findMember(name, team)
          if (!member || !date) continue

          const key = member.id
          if (!dayMap[key]) dayMap[key] = {}
          if (!dayMap[key][date]) dayMap[key][date] = { lateClockIn: false, noShow: false, earliestShift: '' }

          const day = dayMap[key][date]

          // Track earliest shift start to identify the first clock-in of the day
          const shiftStart = shiftTime.split(' - ')[0] || ''
          if (!day.earliestShift || (shiftStart && shiftStart < day.earliestShift)) {
            // This is an earlier shift — only this one's clock-in status matters
            if (type === 'late on clock-in') {
              day.lateClockIn = true
            } else if (type === 'early on clock-in' || type === 'no shift on clock-in') {
              // Earlier shift was on time — reset any late from a later-listed shift
              day.lateClockIn = false
            }
            if (shiftStart) day.earliestShift = shiftStart
          } else if (shiftStart === day.earliestShift) {
            // Same shift — update clock-in status
            if (type === 'late on clock-in') day.lateClockIn = true
          }
          // Clock-out events and later shifts are ignored for lateness

          if (type === 'no show on shift') day.noShow = true
        }

        // Now count unique days and determine lateness
        const lateMembers = new Set<string>()
        for (const [memberId, dates] of Object.entries(dayMap)) {
          if (!(memberId in onTimeData)) onTimeData[memberId] = true
          if (!shiftCounts[memberId]) shiftCounts[memberId] = { total: 0, onTime: 0 }
          for (const day of Object.values(dates)) {
            shiftCounts[memberId].total++
            if (day.lateClockIn || day.noShow) {
              lateMembers.add(memberId)
            } else {
              shiftCounts[memberId].onTime++
            }
          }
        }
        for (const id of lateMembers) {
          onTimeData[id] = false
        }
      }

      // ── 4. Parse Cash Reconciliation (optional) ──
      // Matches BINGO admin logic: use Cash Variance column, parseVariance, check <= $0.50
      const drawerResults: Record<string, { pass: boolean; worstVariance: number }> = {}
      if (cashReconFiles.length > 0) {
       for (const cashReconFile of cashReconFiles) {
        const buffer = await cashReconFile.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })

        // Determine the 7-day range from weekEnding
        const weDate = new Date(weekEnding + 'T12:00:00')
        const weStart = new Date(weDate)
        weStart.setDate(weDate.getDate() - 6)

        for (const sn of workbook.SheetNames) {
          if (sn === 'Summary') continue
          const rows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sn], { header: 1 })

          // Check if this sheet's date falls within the week
          const dateStr = String(rows[1]?.[3] || '').split(' ')[0]
          if (dateStr) {
            const sheetDate = new Date(dateStr + 'T12:00:00')
            if (sheetDate < weStart || sheetDate > weDate) continue
          }

          // Find header row with Employee Name and Cash Variance
          let hr = -1, nc = -1, vc = -1
          for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i]; if (!row) continue
            for (let j = 0; j < row.length; j++) {
              const c = String(row[j] || '').toLowerCase().trim()
              if (c.includes('employee name')) { hr = i; nc = j }
              if (c.includes('cash variance')) vc = j
            }
            if (hr >= 0 && vc >= 0) break
          }
          if (hr < 0 || nc < 0 || vc < 0) continue

          for (let i = hr + 1; i < rows.length; i++) {
            const row = rows[i]; if (!row || !row[nc]) continue
            const nm = String(row[nc]).trim()
            if (!nm || nm.toLowerCase() === 'lead' || nm.toLowerCase() === 'all' || nm.toLowerCase().includes('total') || nm.toLowerCase() === 'n/a') continue
            const v = parseVariance(row[vc])

            // Handle shared drawers (e.g. "Nakoa/Brian")
            const names = nm.includes('/') ? nm.split('/').map(x => x.trim()).filter(Boolean) : [nm]
            const splitV = v / names.length

            for (const n of names) {
              const member = findMember(n, team)
              if (!member) continue
              if (!drawerResults[member.id]) drawerResults[member.id] = { pass: true, worstVariance: 0 }
              if (Math.abs(splitV) > 0.50) drawerResults[member.id].pass = false
              if (Math.abs(splitV) > Math.abs(drawerResults[member.id].worstVariance)) {
                drawerResults[member.id].worstVariance = splitV
              }
            }
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
        const orderTypeIdx = salesHeader.indexOf('OrderType')
        for (let i = salesHeaderIdx + 1; i < salesRows.length; i++) {
          const row = salesRows[i]
          if (!row[nameIdx]) continue
          // Only count In-Store sales, not online pre-orders
          const orderType = (row[orderTypeIdx] || '').toLowerCase()
          if (orderType !== 'in-store') continue
          const member = findMember(row[nameIdx], team)
          if (!member) continue
          const total = parseFloat(row[totalIdx] || '0') || 0
          if (total >= BIG_BASKET_THRESHOLD) {
            bigBasketData[member.id] = (bigBasketData[member.id] || 0) + 1
          }
        }
      }

      // ── 6. Parse Payroll Export for hours worked (optional) ──
      const hoursData: Record<string, number> = {}
      if (payrollFile) {
        const payRows = await parseFile(payrollFile)
        let payHeaderIdx = payRows.findIndex(r => r[0] === 'First Name')
        if (payHeaderIdx < 0) payHeaderIdx = 0
        const payHeader = payRows[payHeaderIdx]
        const fnIdx = payHeader.indexOf('First Name')
        const lnIdx = payHeader.indexOf('Last Name')
        const regIdx = payHeader.indexOf('Regular')
        const otIdx = payHeader.indexOf('OT')
        const dotIdx = payHeader.indexOf('Double OT')
        for (let i = payHeaderIdx + 1; i < payRows.length; i++) {
          const row = payRows[i]
          if (!row[fnIdx]) continue
          const fullName = (row[fnIdx] + ' ' + (row[lnIdx] || '')).trim()
          const member = findMember(fullName, team)
          if (!member) continue
          const reg = parseFloat(row[regIdx] || '0') || 0
          const ot = parseFloat(row[otIdx] || '0') || 0
          const dot = parseFloat(row[dotIdx] || '0') || 0
          hoursData[member.id] = (hoursData[member.id] || 0) + reg + ot + dot
        }
      }

      // ── Combine & upsert ──
      const allMemberIds = new Set([
        ...Object.keys(aovData),
        ...Object.keys(upsellData),
        ...Object.keys(onTimeData),
        ...Object.keys(drawerResults),
        ...Object.keys(bigBasketData),
        ...Object.keys(hoursData),
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
        if (shiftCounts[memberId]) {
          record.shifts_on_time = shiftCounts[memberId].onTime
          record.total_shifts = shiftCounts[memberId].total
        }
        // Drawer: null = no data, 0 = passed all days, >0.50 = worst variance
        if (memberId in drawerResults) {
          record.drawer_variance = Math.round(Math.abs(drawerResults[memberId].worstVariance) * 100) / 100
        } else {
          record.drawer_variance = null
        }
        if (memberId in bigBasketData) record.big_basket_count = bigBasketData[memberId]
        if (memberId in hoursData) record.hours_worked = Math.round(hoursData[memberId] * 100) / 100

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
          cashRecon: Object.keys(drawerResults).length > 0,
          payroll: Object.keys(hoursData).length > 0,
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
        <div style={{ textAlign: 'right', marginBottom: 10 }}>
          <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block' }}>{'←'} Dashboard</a>
        </div>
        <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: '0 0 24px' }}>
          Weekly Stats Import
        </h1>

        {/* Import Form */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 18, margin: '0 0 16px' }}>
            Import Weekly Reports
          </h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Upload your Dutchie reports and other data. All reports are optional — upload whichever ones you have. CSV or Excel accepted.
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

            {/* Dutchie reports */}
            <div style={{ background: '#f0faf0', borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: '#3a7b3c', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
                Dutchie Reports
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
                  <input type="file" accept={fileAccept} multiple onChange={e => setCashReconFiles(e.target.files ? Array.from(e.target.files) : [])} style={{ fontSize: 13 }} />
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Daily Cash Reconciliation Log — upload both months if the week spans two</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                    Sales Raw Data
                  </label>
                  <input type="file" accept={fileAccept} onChange={e => setSalesRawFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Dutchie: Sales Transactions by Date — counts baskets ${BIG_BASKET_THRESHOLD}+</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                    Payroll Export
                  </label>
                  <input type="file" accept={fileAccept} onChange={e => setPayrollFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Homebase payroll export (hours worked for sales/hour calc)</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={importing || !weekEnding}
              style={{
                background: !weekEnding ? '#ccc' : '#3a7b3c',
                color: 'white', border: 'none', borderRadius: 10, padding: '14px 20px',
                fontFamily: 'Cooper Black, serif', fontSize: 16,
                cursor: !weekEnding ? 'default' : 'pointer',
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

        {/* Samples Tracker Import */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 18, margin: '0 0 8px' }}>
            Samples Tracker Upload
          </h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Upload the Samples Tracker spreadsheet to add sample products to the Staff Reviews dropdown.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept=".xlsx,.xls" onChange={e => setSamplesFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
            <button
              onClick={handleSamplesImport}
              disabled={!samplesFile || importingSamples}
              style={{
                background: !samplesFile ? '#ccc' : '#f37029',
                color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px',
                fontFamily: 'Cooper Black, serif', fontSize: 14,
                cursor: !samplesFile ? 'default' : 'pointer',
              }}
            >
              {importingSamples ? 'Importing...' : 'Import Samples'}
            </button>
          </div>
          {samplesResult && (
            <div style={{ marginTop: 12, background: '#fff3e0', borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#f37029', fontFamily: 'Cooper Black, serif' }}>
                Found {samplesResult.total} products, added {samplesResult.inserted} to the reviews dropdown
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
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Sales/Hr</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Net Sales</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Hours</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Orders</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Upsell %</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', color: '#666' }}>On Time</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', color: '#666' }}>Drawer</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#666' }}>Big Baskets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((s: any) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 12px', color: '#333' }}>{teamMap[s.team_member_id]?.full_name || s.team_member_id}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>${Number(s.average_basket).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right', fontWeight: 'bold' }}>
                            {s.hours_worked ? `$${(Number(s.total_net_sales) / Number(s.hours_worked)).toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>${Number(s.total_net_sales).toLocaleString()}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>{s.hours_worked ? Number(s.hours_worked).toFixed(1) : '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>{s.total_orders}</td>
                          <td style={{ padding: '8px 12px', color: '#333', textAlign: 'right' }}>{Number(s.upsell_pct).toFixed(1)}%</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {s.was_on_time === true ? '✅' : s.was_on_time === false ? '❌' : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {s.drawer_variance != null
                              ? (Number(s.drawer_variance) <= 0.50 ? '✅' : `❌ $${Number(s.drawer_variance).toFixed(2)}`)
                              : '—'}
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
