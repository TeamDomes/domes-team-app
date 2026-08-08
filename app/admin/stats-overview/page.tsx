'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function StatsOverviewPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any[]>([])
  const [teamMap, setTeamMap] = useState<Record<string, any>>({})
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [weeks, setWeeks] = useState<string[]>([])

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
    setIsAdmin(me?.role === 'Admin')

    const map: Record<string, any> = {}
    ;(teamData || []).forEach((t: any) => { map[t.id] = t })
    setTeamMap(map)

    const { data: allStats } = await supabase
      .from('weekly_stats')
      .select('*')
      .order('week_ending', { ascending: false })
    setStats(allStats || [])

    const uniqueWeeks = [...new Set((allStats || []).map((s: any) => s.week_ending))].sort().reverse()
    setWeeks(uniqueWeeks)
    if (uniqueWeeks.length > 0) setSelectedWeek(uniqueWeeks[0])

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

  const weekStats = stats.filter(s => s.week_ending === selectedWeek)
    .sort((a, b) => Number(b.total_net_sales) - Number(a.total_net_sales))

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: '0 0 4px' }}>
              Team Stats Overview
            </h1>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              {weekStats.length} team members with stats
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href="/admin/stats" style={{ color: '#387dac', textDecoration: 'none', fontSize: 13 }}>Import Stats</a>
            <span style={{ color: '#ccc' }}>|</span>
            <a href="/dashboard" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>{'<-'} Dashboard</a>
          </div>
        </div>

        {weeks.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: 16, margin: '0 0 12px' }}>No stats imported yet.</p>
            <a href="/admin/stats" style={{
              display: 'inline-block', background: '#3a7b3c', color: 'white',
              padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
              fontFamily: 'Cooper Black, serif', fontSize: 14,
            }}>Import Stats</a>
          </div>
        ) : (
          <>
            {/* Week Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#666', marginRight: 8 }}>Week ending:</label>
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(e.target.value)}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: '2px solid #e0d9c8',
                  fontSize: 14, fontFamily: 'Cooper Light, system-ui, sans-serif',
                  background: 'white',
                }}
              >
                {weeks.map(w => (
                  <option key={w} value={w}>{formatDate(w)}</option>
                ))}
              </select>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>Team Avg Basket</p>
                <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 24, color: '#3a7b3c', margin: 0 }}>
                  ${weekStats.length > 0
                    ? (weekStats.reduce((sum, s) => sum + Number(s.average_basket), 0) / weekStats.length).toFixed(2)
                    : '0.00'}
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>Total Team Sales</p>
                <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 24, color: '#3a7b3c', margin: 0 }}>
                  ${weekStats.reduce((sum, s) => sum + Number(s.total_net_sales), 0).toLocaleString()}
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>Total Team Orders</p>
                <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 24, color: '#3a7b3c', margin: 0 }}>
                  {weekStats.reduce((sum, s) => sum + Number(s.total_orders), 0)}
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>Avg Upsell Rate</p>
                <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 24, color: '#3a7b3c', margin: 0 }}>
                  {weekStats.length > 0
                    ? (weekStats.reduce((sum, s) => sum + Number(s.upsell_pct), 0) / weekStats.length).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
            </div>

            {/* Staff Table */}
            <div style={{ background: 'white', borderRadius: 12, padding: 20, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0d9c8' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: '#666', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Name</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: '#666' }}>Sales/Hr</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: '#666' }}>Avg Basket</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: '#666' }}>Net Sales</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: '#666' }}>Hours</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: '#666' }}>Orders</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: '#666' }}>Upsell %</th>
                    <th style={{ textAlign: 'center', padding: '10px 12px', color: '#666' }}>On Time</th>
                    <th style={{ textAlign: 'center', padding: '10px 12px', color: '#666' }}>Drawer</th>
                    <th style={{ textAlign: 'center', padding: '10px 12px', color: '#666' }}>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {weekStats.map((s: any, idx: number) => {
                    const member = teamMap[s.team_member_id]
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0', background: idx === 0 ? '#f0faf0' : 'transparent' }}>
                        <td style={{ padding: '10px 12px', color: '#333', fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                          {idx === 0 && <span style={{ marginRight: 4 }}>{'\u{1F451}'}</span>}
                          {member?.full_name || s.team_member_id}
                          {member?.role && <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>{member.role}</span>}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#333', fontWeight: 'bold' }}>
                          {s.hours_worked ? `$${(Number(s.total_net_sales) / Number(s.hours_worked)).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#333' }}>
                          ${Number(s.average_basket).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#333' }}>
                          ${Number(s.total_net_sales).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#333' }}>
                          {s.hours_worked ? Number(s.hours_worked).toFixed(1) : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#333' }}>
                          {s.total_orders}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#333' }}>
                          {Number(s.upsell_pct).toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {s.was_on_time ? '✅' : <span style={{ color: '#ccc' }}>{'—'}</span>}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {s.drawer_variance != null
                            ? (Number(s.drawer_variance) <= 0.50 ? '✅' : `❌`)
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {s.got_named_in_review ? <span>{'⭐'}</span> : <span style={{ color: '#ccc' }}>{'—'}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {weekStats.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', padding: 20, margin: 0 }}>No stats for this week.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
