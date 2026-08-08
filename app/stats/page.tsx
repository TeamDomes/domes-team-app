'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function MyStatsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stats, setStats] = useState<any[]>([])
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

    if (me) {
      const { data: myStats } = await supabase
        .from('weekly_stats')
        .select('*')
        .eq('team_member_id', me.id)
        .order('week_ending', { ascending: false })
        .limit(12)
      setStats(myStats || [])
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#3a7b3c', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div>
  )

  const latest = stats[0]
  const previous = stats[1]

  function trend(current: number, prev: number | undefined) {
    if (prev === undefined || prev === null) return null
    const diff = current - prev
    if (Math.abs(diff) < 0.01) return { dir: 'flat', text: 'same', color: '#888' }
    if (diff > 0) return { dir: 'up', text: '+' + (Number.isInteger(diff) ? diff : diff.toFixed(1)), color: '#3a7b3c' }
    return { dir: 'down', text: diff.toFixed(1), color: '#d32f2f' }
  }

  function StatCard({ label, value, unit, prevValue }: { label: string; value: string; unit?: string; prevValue?: number }) {
    const t = prevValue !== undefined ? trend(parseFloat(value), prevValue) : null
    return (
      <div style={{
        background: 'white', borderRadius: 12, padding: 20,
        boxShadow: '0 2px 8px rgba(84,60,45,0.06)',
      }}>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#333' }}>{value}</span>
          {unit && <span style={{ fontSize: 13, color: '#888' }}>{unit}</span>}
        </div>
        {t && (
          <p style={{ fontSize: 12, color: t.color, margin: '6px 0 0' }}>
            {t.dir === 'up' ? '↑' : t.dir === 'down' ? '↓' : '→'} {t.text} vs last week
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: '0 0 4px' }}>
              My Stats
            </h1>
            {currentUser && (
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                {currentUser.full_name} {'·'} {currentUser.type}
              </p>
            )}
          </div>
          <a href="/dashboard" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>
            {'<-'} Dashboard
          </a>
        </div>

        {stats.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: 16, margin: 0 }}>No stats available yet. Check back after the weekly import!</p>
          </div>
        ) : (
          <>
            {/* Current Week Stats */}
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>
                Week ending {new Date(latest.week_ending + 'T12:00:00').toLocaleDateString()}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
              <StatCard
                label="Average Basket"
                value={'$' + Number(latest.average_basket).toFixed(2)}
                prevValue={previous ? parseFloat('$' + Number(previous.average_basket).toFixed(2)) : undefined}
              />
              <StatCard
                label="Total Net Sales"
                value={'$' + Number(latest.total_net_sales).toLocaleString()}
                prevValue={previous ? Number(previous.total_net_sales) : undefined}
              />
              <StatCard
                label="Total Orders"
                value={String(latest.total_orders)}
                prevValue={previous ? previous.total_orders : undefined}
              />
              <StatCard
                label="Upsell Rate"
                value={Number(latest.upsell_pct).toFixed(1)}
                unit="%"
                prevValue={previous ? Number(previous.upsell_pct) : undefined}
              />
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {latest.was_on_time && (
                <div style={{
                  background: '#3a7b3c', color: 'white', borderRadius: 20,
                  padding: '8px 16px', fontSize: 13, fontFamily: 'Cooper Black, serif',
                }}>
                  {'✅'} On Time
                </div>
              )}
              {latest.got_named_in_review && (
                <div style={{
                  background: '#ffcb1f', color: '#543c2d', borderRadius: 20,
                  padding: '8px 16px', fontSize: 13, fontFamily: 'Cooper Black, serif',
                }}>
                  {'⭐'} Google Review Mention
                </div>
              )}
            </div>

            {/* History Table */}
            {stats.length > 1 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20 }}>
                <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 18, margin: '0 0 12px' }}>
                  Weekly History
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e0d9c8' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', color: '#666' }}>Week</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#666' }}>Avg Basket</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#666' }}>Net Sales</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#666' }}>Orders</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#666' }}>Upsell %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((s: any) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 10px', color: '#333' }}>
                            {new Date(s.week_ending + 'T12:00:00').toLocaleDateString()}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#333', textAlign: 'right' }}>
                            ${Number(s.average_basket).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#333', textAlign: 'right' }}>
                            ${Number(s.total_net_sales).toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#333', textAlign: 'right' }}>
                            {s.total_orders}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#333', textAlign: 'right' }}>
                            {Number(s.upsell_pct).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
