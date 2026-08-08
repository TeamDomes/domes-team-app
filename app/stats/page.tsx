'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function MyStatsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [viewingUser, setViewingUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [leadStats, setLeadStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const isLead = (member: any) => member?.role === 'Lead'

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
    setViewingUser(me)
    const admin = me?.role === 'Admin' || me?.role === 'admin' || me?.role === 'Lead' || (!me?.role && me?.email === 'jennifer@domesdispensary.com') || (!me?.role && me?.email === 'david@domesdispensary.com')
    setIsAdmin(admin)
    if (admin) {
      setTeamMembers((teamData || []).sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || '')))
    }

    if (me) {
      await loadMemberStats(me)
    }
    setLoading(false)
  }

  async function loadMemberStats(member: any) {
    const { data: memberStats } = await supabase
      .from('weekly_stats')
      .select('*')
      .eq('team_member_id', member.id)
      .order('week_ending', { ascending: false })
      .limit(12)
    setStats(memberStats || [])

    if (isLead(member)) {
      await loadLeadData(member.id, memberStats || [])
    } else {
      setLeadStats(null)
    }
  }

  async function loadLeadData(memberId: string, weeklyStats: any[]) {
    // Count on-time weeks from weekly_stats
    const onTimeWeeks = weeklyStats.filter((s: any) => s.was_on_time).length
    const totalWeeks = weeklyStats.length

    // Count Google review mentions
    const reviewMentions = weeklyStats.filter((s: any) => s.got_named_in_review).length

    // Hours worked this week
    const latestHours = weeklyStats[0]?.hours_worked ? Number(weeklyStats[0].hours_worked).toFixed(1) : '—'

    // Load appreciations given
    const { data: given } = await supabase
      .from('appreciations')
      .select('id, created_at')
      .eq('from_team_member_id', memberId)
    const appreciationsGiven = (given || []).length

    // Appreciations given in last 4 weeks
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    const recentGiven = (given || []).filter((a: any) => new Date(a.created_at) >= fourWeeksAgo).length

    // Load appreciations received
    const { data: received } = await supabase
      .from('appreciations')
      .select('id, created_at')
      .eq('to_team_member_id', memberId)
    const appreciationsReceived = (received || []).length

    const recentReceived = (received || []).filter((a: any) => new Date(a.created_at) >= fourWeeksAgo).length

    setLeadStats({
      onTimeWeeks,
      totalWeeks,
      reviewMentions,
      appreciationsGiven,
      appreciationsReceived,
      recentGiven,
      recentReceived,
      latestHours,
    })
  }

  async function switchUser(memberId: string) {
    const member = teamMembers.find((t: any) => t.id === memberId)
    if (!member) return
    setViewingUser(member)
    await loadMemberStats(member)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#3a7b3c', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div>
  )

  const latest = stats[0]
  const previous = stats[1]
  const viewIsLead = isLead(viewingUser)

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

  function LeadStatsView() {
    if (!leadStats) return null
    const onTimePct = leadStats.totalWeeks > 0
      ? Math.round((leadStats.onTimeWeeks / leadStats.totalWeeks) * 100)
      : 0

    return (
      <>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 16px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>
          Leadership Metrics · Last {leadStats.totalWeeks} weeks
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {/* On Time */}
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(84,60,45,0.06)' }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>On Time</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#3a7b3c' }}>
                {leadStats.onTimeWeeks}/{leadStats.totalWeeks}
              </span>
              <span style={{ fontSize: 13, color: '#888' }}>weeks</span>
            </div>
            <div style={{ marginTop: 8, height: 6, background: '#e8e0cc', borderRadius: 4 }}>
              <div style={{ width: onTimePct + '%', height: '100%', background: '#3a7b3c', borderRadius: 4 }} />
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{onTimePct}% on-time rate</p>
          </div>

          {/* Hours This Week */}
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(84,60,45,0.06)' }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Hours This Week</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#333' }}>{leadStats.latestHours}</span>
              <span style={{ fontSize: 13, color: '#888' }}>hrs</span>
            </div>
          </div>

          {/* Google Reviews */}
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(84,60,45,0.06)' }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Google Review Mentions</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#c8a84e' }}>{leadStats.reviewMentions}</span>
              <span style={{ fontSize: 13, color: '#888' }}>times</span>
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>in last {leadStats.totalWeeks} weeks</p>
          </div>
        </div>

        {/* Appreciations */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(84,60,45,0.06)', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 18, margin: '0 0 16px' }}>
            Appreciations
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>Given</p>
              <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#f37029' }}>{leadStats.appreciationsGiven}</span>
              <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>total</span>
              <p style={{ fontSize: 12, color: '#3a7b3c', margin: '4px 0 0' }}>
                {leadStats.recentGiven} in last 4 weeks
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>Received</p>
              <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#7b5ea7' }}>{leadStats.appreciationsReceived}</span>
              <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>total</span>
              <p style={{ fontSize: 12, color: '#3a7b3c', margin: '4px 0 0' }}>
                {leadStats.recentReceived} in last 4 weeks
              </p>
            </div>
          </div>
        </div>

        {/* Weekly History — simplified for leads */}
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
                    <th style={{ textAlign: 'right', padding: '8px 10px', color: '#666' }}>Hours</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', color: '#666' }}>On Time</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', color: '#666' }}>Review Mention</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 10px', color: '#333' }}>
                        {new Date(s.week_ending + 'T12:00:00').toLocaleDateString()}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#333', textAlign: 'right' }}>
                        {s.hours_worked ? Number(s.hours_worked).toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {s.was_on_time
                          ? <span style={{ color: '#3a7b3c', fontWeight: 'bold' }}>Yes</span>
                          : <span style={{ color: '#d32f2f' }}>No</span>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {s.got_named_in_review
                          ? <span style={{ color: '#c8a84e', fontWeight: 'bold' }}>Yes</span>
                          : <span style={{ color: '#ccc' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: '0 0 4px' }}>
              {isAdmin && viewingUser?.id !== currentUser?.id ? `${viewingUser?.full_name}'s Stats` : 'My Stats'}
            </h1>
            {viewingUser && (
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                {viewingUser.full_name} {'·'} {viewingUser.role === 'Lead' ? 'Team Lead' : viewingUser.type}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isAdmin && (
              <select
                value={viewingUser?.id || ''}
                onChange={e => switchUser(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '2px solid #e0d9c8',
                  fontSize: 13, fontFamily: 'Cooper Light, system-ui, sans-serif',
                  background: 'white', color: '#333', cursor: 'pointer',
                }}
              >
                {teamMembers.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}{t.id === currentUser?.id ? ' (you)' : ''} — {t.role === 'Lead' ? 'Lead' : t.type}
                  </option>
                ))}
              </select>
            )}
            <a href="/dashboard" style={{ color: '#666', textDecoration: 'none', fontSize: 14, whiteSpace: 'nowrap' }}>
              {'<-'} Dashboard
            </a>
          </div>
        </div>

        {stats.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: 16, margin: 0 }}>No stats available yet. Check back after the weekly import!</p>
          </div>
        ) : viewIsLead ? (
          <LeadStatsView />
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
                label="Sales / Hour"
                value={latest.hours_worked ? '$' + (Number(latest.total_net_sales) / Number(latest.hours_worked)).toFixed(2) : '—'}
                prevValue={previous?.hours_worked ? Number(previous.total_net_sales) / Number(previous.hours_worked) : undefined}
              />
              <StatCard
                label="Total Net Sales"
                value={'$' + Number(latest.total_net_sales).toLocaleString()}
                prevValue={previous ? Number(previous.total_net_sales) : undefined}
              />
              <StatCard
                label="Hours Worked"
                value={latest.hours_worked ? Number(latest.hours_worked).toFixed(1) : '—'}
                prevValue={previous?.hours_worked ? Number(previous.hours_worked) : undefined}
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
                  On Time
                </div>
              )}
              {latest.got_named_in_review && (
                <div style={{
                  background: '#ffcb1f', color: '#543c2d', borderRadius: 20,
                  padding: '8px 16px', fontSize: 13, fontFamily: 'Cooper Black, serif',
                }}>
                  Google Review Mention
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
                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#666' }}>Sales/Hr</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#666' }}>Avg Basket</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#666' }}>Net Sales</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#666' }}>Hours</th>
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
                          <td style={{ padding: '8px 10px', color: '#333', textAlign: 'right', fontWeight: 'bold' }}>
                            {s.hours_worked ? `$${(Number(s.total_net_sales) / Number(s.hours_worked)).toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#333', textAlign: 'right' }}>
                            ${Number(s.average_basket).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#333', textAlign: 'right' }}>
                            ${Number(s.total_net_sales).toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#333', textAlign: 'right' }}>
                            {s.hours_worked ? Number(s.hours_worked).toFixed(1) : '—'}
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
