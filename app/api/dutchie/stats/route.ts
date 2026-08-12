import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DUTCHIE_BASE = 'https://api.pos.dutchie.com'

function dutchieAuth(): string {
  const key = process.env.DUTCHIE_API_KEY
  if (!key) throw new Error('DUTCHIE_API_KEY not configured')
  const encoded = Buffer.from(`${key}:`).toString('base64')
  return `Basic ${encoded}`
}

// Get the most recent Monday as week_ending date
function getWeekEnding(): string {
  const now = new Date()
  const day = now.getDay()
  // Sunday = 0, Monday = 1, etc. Find next Sunday (end of week)
  const sunday = new Date(now)
  sunday.setDate(now.getDate() + (7 - day) % 7)
  return sunday.toISOString().split('T')[0]
}

// Get start of current week (Monday)
function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  return monday.toISOString().split('T')[0]
}

export async function POST(req: Request) {
  try {
    const weekStart = getWeekStart()
    const weekEnding = getWeekEnding()

    // Fetch register transactions from Dutchie
    const res = await fetch(
      `${DUTCHIE_BASE}/reporting/register-transactions?startDate=${weekStart}&endDate=${weekEnding}`,
      { headers: { Authorization: dutchieAuth() } }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({
        status: 'error',
        message: `Dutchie transactions returned ${res.status}: ${text}`,
      }, { status: 500 })
    }

    const data = await res.json()
    const transactions = Array.isArray(data) ? data : (data.transactions || data.data || [])

    // Get team members to match budtender names
    const { data: teamMembers } = await supabase.from('team').select('id, full_name, role')
    const teamMap = new Map<string, any>()
    for (const t of (teamMembers || [])) {
      // Map by first name (case-insensitive) for matching Dutchie employee names
      const firstName = t.full_name.split(' ')[0].toLowerCase()
      teamMap.set(firstName, t)
      // Also map by full name
      teamMap.set(t.full_name.toLowerCase(), t)
    }

    // Aggregate stats per team member
    const stats: Record<string, {
      team_member_id: string
      total_sales: number
      transaction_count: number
      avg_basket: number
      items_sold: number
    }> = {}

    for (const tx of transactions) {
      // Dutchie transaction fields vary — try common field names
      const employeeName = (tx.employee || tx.employeeName || tx.cashier || tx.budtender || '').toLowerCase()
      const total = parseFloat(tx.total || tx.totalAmount || tx.amount || 0)
      const itemCount = parseInt(tx.itemCount || tx.items || tx.lineItemCount || 1, 10)

      if (!employeeName) continue

      // Try to match employee to team member
      const firstName = employeeName.split(' ')[0]
      const member = teamMap.get(employeeName) || teamMap.get(firstName)
      if (!member) continue

      if (!stats[member.id]) {
        stats[member.id] = {
          team_member_id: member.id,
          total_sales: 0,
          transaction_count: 0,
          avg_basket: 0,
          items_sold: 0,
        }
      }

      stats[member.id].total_sales += total
      stats[member.id].transaction_count += 1
      stats[member.id].items_sold += itemCount
    }

    // Calculate averages
    for (const s of Object.values(stats)) {
      s.avg_basket = s.transaction_count > 0
        ? Math.round((s.total_sales / s.transaction_count) * 100) / 100
        : 0
      s.total_sales = Math.round(s.total_sales * 100) / 100
    }

    // Upsert into weekly_stats table
    const statRows = Object.values(stats).map(s => ({
      ...s,
      week_ending: weekEnding,
    }))

    let upserted = 0
    if (statRows.length > 0) {
      const { error } = await supabase.from('weekly_stats').upsert(statRows, {
        onConflict: 'team_member_id,week_ending',
      })
      if (!error) upserted = statRows.length
    }

    return NextResponse.json({
      status: 'ok',
      weekEnding,
      transactionsProcessed: transactions.length,
      teamMembersMatched: Object.keys(stats).length,
      statsUpserted: upserted,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Dutchie stats error:', err)
    return NextResponse.json(
      { status: 'error', message: err.message },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  // Vercel cron calls GET — run the sync
  const isCron = req.headers.get('x-vercel-cron') === '1' ||
    req.headers.get('user-agent')?.includes('vercel-cron')

  if (isCron) {
    return POST(req)
  }

  return NextResponse.json({
    status: 'ok',
    endpoint: 'Domes Dutchie Weekly Stats Sync',
  })
}
