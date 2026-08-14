'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AllTimeStatsPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])

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

    const teamMap: Record<string, any> = {}
    ;(teamData || []).forEach((t: any) => { teamMap[t.id] = t })

    // Weekly stats
    const { data: allStats } = await supabase.from('weekly_stats').select('*')

    // Points
    const { data: allPoints } = await supabase.from('points_log').select('team_member_id, points, activity')

    // Reviews
    const { data: allReviews } = await supabase.from('google_reviews').select('mentioned_staff')

    // BINGO
    const { data: allBingo } = await supabase.from('bingo_squares').select('*')

    // Appreciations
    const { data: allAppreciations } = await supabase.from('appreciations').select('from_member_id, to_member_id')

    // Build per-member aggregates
    const memberStats: Record<string, any> = {}

    // Init all team members
    ;(teamData || []).forEach((t: any) => {
      memberStats[t.id] = {
        id: t.id,
        name: t.full_name,
        role: t.role,
        totalSales: 0,
        totalHours: 0,
        totalOrders: 0,
        weekCount: 0,
        basketSum: 0,
        upsellSum: 0,
        onTimeCount: 0,
        drawerGoodCount: 0,
        drawerTotalCount: 0,
        totalPoints: 0,
        reviewMentions: 0,
        bingoWins: 0,
        bingoSquares: 0,
        appreciationsGiven: 0,
        appreciationsReceived: 0,
        gamesPlayed: 0,
      }
    })

    // Aggregate weekly stats
    ;(allStats || []).forEach((s: any) => {
      const m = memberStats[s.team_member_id]
      if (!m) return
      m.weekCount++
      m.totalSales += Number(s.total_net_sales) || 0
      m.totalHours += Number(s.hours_worked) || 0
      m.totalOrders += Number(s.total_orders) || 0
      m.basketSum += Number(s.average_basket) || 0
      m.upsellSum += Number(s.upsell_pct) || 0
      if (s.was_on_time) m.onTimeCount++
      if (s.drawer_variance != null) {
        m.drawerTotalCount++
        if (Number(s.drawer_variance) <= 0.50) m.drawerGoodCount++
      }
    })

    // Aggregate points
    ;(allPoints || []).forEach((p: any) => {
      const m = memberStats[p.team_member_id]
      if (!m) return
      m.totalPoints += p.points
      if (p.activity === 'bingo_win') m.bingoWins++
      if (['trivia_correct', 'trivia_wrong', 'wordle_solved', 'wordle_attempted', 'boggle_win', 'boggle_play'].includes(p.activity)) {
        m.gamesPlayed++
      }
    })

    // Aggregate reviews
    ;(allReviews || []).forEach((r: any) => {
      ;(r.mentioned_staff || []).forEach((name: string) => {
        const member = (teamData || []).find((t: any) =>
          t.full_name.split(' ')[0].toLowerCase() === name.toLowerCase()
        )
        if (member && memberStats[member.id]) memberStats[member.id].reviewMentions++
      })
    })

    // Aggregate BINGO squares
    ;(allBingo || []).forEach((sq: any) => {
      const m = memberStats[sq.team_member_id]
      if (!m) return
      const checked = [sq.square_b, sq.square_i, sq.square_n, sq.square_g, sq.square_o].filter(Boolean).length
      m.bingoSquares += checked
    })

    // Aggregate appreciations
    ;(allAppreciations || []).forEach((a: any) => {
      if (memberStats[a.from_member_id]) memberStats[a.from_member_id].appreciationsGiven++
      if (memberStats[a.to_member_id]) memberStats[a.to_member_id].appreciationsReceived++
    })

    // Filter to only members with any activity, sort by total points
    const result = Object.values(memberStats)
      .filter((m: any) => m.weekCount > 0 || m.totalPoints > 0)
      .sort((a: any, b: any) => b.totalPoints - a.totalPoints)

    setRows(result)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#3a7b3c', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div>
  )

  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#888', fontSize: 16 }}>Admin access required.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: '0 0 4px' }}>
              {'🏆'} All-Time Stats
            </h1>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              Cumulative performance across all weeks
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href="/admin/stats-overview" style={{ color: '#387dac', textDecoration: 'none', fontSize: 13 }}>Weekly View</a>
            <span style={{ color: '#ccc' }}>|</span>
            <a href="/dashboard" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>{'←'} Dashboard</a>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>Total Team Sales</p>
            <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 22, color: '#3a7b3c', margin: 0 }}>
              ${rows.reduce((s, r) => s + r.totalSales, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>Total Points Awarded</p>
            <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 22, color: '#f37029', margin: 0 }}>
              {rows.reduce((s, r) => s + r.totalPoints, 0).toLocaleString()}
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>Review Mentions</p>
            <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 22, color: '#ffcb1f', margin: 0 }}>
              {rows.reduce((s, r) => s + r.reviewMentions, 0)}
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>BINGO Wins</p>
            <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 22, color: '#543c2d', margin: 0 }}>
              {rows.reduce((s, r) => s + r.bingoWins, 0)}
            </p>
          </div>
        </div>

        {/* Main Table */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0d9c8' }}>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: '#666' }}>#</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: '#666' }}>Name</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: '#666' }}>Points</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: '#666' }}>Sales</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: '#666' }}>Avg Basket</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: '#666' }}>Hours</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: '#666' }}>Orders</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: '#666' }}>Avg Upsell</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: '#666' }}>On Time</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: '#666' }}>Drawer</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: '#666' }}>Reviews</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: '#666' }}>BINGO</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: '#666' }}>Appr.</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: '#666' }}>Games</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, idx: number) => (
                <tr key={r.id} style={{
                  borderBottom: '1px solid #f0f0f0',
                  background: idx === 0 ? '#f0faf0' : idx === 1 ? '#fafaf5' : idx === 2 ? '#fdf8ee' : 'transparent'
                }}>
                  <td style={{ padding: '10px 8px', color: '#888', fontSize: 11 }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#333', fontWeight: idx < 3 ? 'bold' : 'normal' }}>
                    {r.name}
                    {r.role && <span style={{ fontSize: 10, color: '#888', marginLeft: 5 }}>{r.role}</span>}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Cooper Black, serif', color: '#f37029' }}>
                    {r.totalPoints.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#333' }}>
                    ${r.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#333' }}>
                    {r.weekCount > 0 ? '$' + (r.basketSum / r.weekCount).toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#333' }}>
                    {r.totalHours > 0 ? r.totalHours.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#333' }}>
                    {r.totalOrders > 0 ? r.totalOrders.toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#333' }}>
                    {r.weekCount > 0 ? (r.upsellSum / r.weekCount).toFixed(1) + '%' : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {r.weekCount > 0 ? (
                      <span style={{ color: r.onTimeCount === r.weekCount ? '#3a7b3c' : '#888' }}>
                        {r.onTimeCount}/{r.weekCount}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {r.drawerTotalCount > 0 ? (
                      <span style={{ color: r.drawerGoodCount === r.drawerTotalCount ? '#3a7b3c' : '#888' }}>
                        {r.drawerGoodCount}/{r.drawerTotalCount}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {r.reviewMentions > 0 ? (
                      <span style={{ color: '#f37029', fontWeight: 'bold' }}>{'⭐'} {r.reviewMentions}</span>
                    ) : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {r.bingoWins > 0 || r.bingoSquares > 0 ? (
                      <span>
                        {r.bingoWins > 0 && <span style={{ color: '#3a7b3c', fontWeight: 'bold' }}>{r.bingoWins}W </span>}
                        <span style={{ color: '#888', fontSize: 11 }}>{r.bingoSquares}sq</span>
                      </span>
                    ) : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {r.appreciationsGiven + r.appreciationsReceived > 0 ? (
                      <span style={{ fontSize: 11 }}>
                        <span style={{ color: '#3a7b3c' }}>+{r.appreciationsReceived}</span>
                        {' / '}
                        <span style={{ color: '#888' }}>{r.appreciationsGiven}</span>
                      </span>
                    ) : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: r.gamesPlayed > 0 ? '#543c2d' : '#ccc' }}>
                    {r.gamesPlayed > 0 ? r.gamesPlayed : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 12 }}>
          Sorted by total points. On Time and Drawer show weeks perfect / weeks tracked. Appr. shows received / given.
        </p>
      </div>
    </div>
  )
}
