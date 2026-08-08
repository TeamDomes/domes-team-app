'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MoodWrapper from '@/components/MoodWrapper'

type ViewMode = 'week' | 'rolling'
type Metric = 'salesPerHour' | 'avgBasket' | 'upsellPct'

const METRIC_CONFIG: Record<Metric, { label: string; format: (v: number) => string; emoji: string; color: string }> = {
  salesPerHour: { label: 'Sales / Hour', format: v => '$' + v.toFixed(2), emoji: '\u{1F4B0}', color: '#3a7b3c' },
  avgBasket: { label: 'Average Basket', format: v => '$' + v.toFixed(2), emoji: '\u{1F6D2}', color: '#387dac' },
  upsellPct: { label: 'Upsell %', format: v => v.toFixed(1) + '%', emoji: '\u{1F4C8}', color: '#7b5ea7' },
}

const RANK_STYLES: Record<number, { bg: string; border: string; badge: string }> = {
  0: { bg: 'linear-gradient(135deg, #fff9e0, #fff4cc)', border: '2px solid #ffcb1f', badge: '\u{1F947}' },
  1: { bg: 'linear-gradient(135deg, #f0f0f0, #e8e8e8)', border: '2px solid #c0c0c0', badge: '\u{1F948}' },
  2: { bg: 'linear-gradient(135deg, #fdf0e6, #f5e0cc)', border: '2px solid #cd7f32', badge: '\u{1F949}' },
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any[]>([])
  const [teamMap, setTeamMap] = useState<Record<string, any>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [latestWeek, setLatestWeek] = useState<string>('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: teamData } = await supabase.from('team').select('*')
    const map: Record<string, any> = {}
    ;(teamData || []).forEach((t: any) => { map[t.id] = t })
    setTeamMap(map)

    const { data: allStats } = await supabase
      .from('weekly_stats')
      .select('*')
      .order('week_ending', { ascending: false })
    setStats(allStats || [])

    const weeks = [...new Set((allStats || []).map((s: any) => s.week_ending))].sort().reverse()
    if (weeks.length > 0) setLatestWeek(weeks[0])

    setLoading(false)
  }

  function getRankings(metric: Metric): { memberId: string; name: string; type: string; value: number }[] {
    const uniqueWeeks = [...new Set(stats.map(s => s.week_ending))].sort().reverse()

    if (viewMode === 'week') {
      const weekStats = stats.filter(s => s.week_ending === latestWeek && s.include_in_leaderboard !== false)
      return weekStats
        .map(s => ({
          memberId: s.team_member_id,
          name: teamMap[s.team_member_id]?.full_name || 'Unknown',
          type: teamMap[s.team_member_id]?.type || '',
          value: getValue(s, metric),
        }))
        .filter(r => r.value > 0 && !isNaN(r.value))
        .sort((a, b) => b.value - a.value)
    } else {
      // Rolling 4-week average
      const last4Weeks = uniqueWeeks.slice(0, 4)
      const rollingStats = stats.filter(s => last4Weeks.includes(s.week_ending) && s.include_in_leaderboard !== false)

      const byMember: Record<string, { total: number; count: number; name: string; type: string }> = {}
      rollingStats.forEach(s => {
        const val = getValue(s, metric)
        if (val <= 0 || isNaN(val)) return
        if (!byMember[s.team_member_id]) {
          byMember[s.team_member_id] = {
            total: 0, count: 0,
            name: teamMap[s.team_member_id]?.full_name || 'Unknown',
            type: teamMap[s.team_member_id]?.type || '',
          }
        }
        byMember[s.team_member_id].total += val
        byMember[s.team_member_id].count += 1
      })

      return Object.entries(byMember)
        .map(([memberId, data]) => ({
          memberId,
          name: data.name,
          type: data.type,
          value: data.total / data.count,
        }))
        .sort((a, b) => b.value - a.value)
    }
  }

  function getValue(s: any, metric: Metric): number {
    switch (metric) {
      case 'salesPerHour':
        return s.hours_worked ? Number(s.total_net_sales) / Number(s.hours_worked) : 0
      case 'avgBasket':
        return Number(s.average_basket) || 0
      case 'upsellPct':
        return Number(s.upsell_pct) || 0
    }
  }

  if (loading) return (
    <MoodWrapper><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#3a7b3c', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div></MoodWrapper>
  )

  const uniqueWeeks = [...new Set(stats.map(s => s.week_ending))].sort().reverse()
  const rollingLabel = uniqueWeeks.length >= 4
    ? `${new Date(uniqueWeeks[3] + 'T12:00:00').toLocaleDateString()} – ${new Date(uniqueWeeks[0] + 'T12:00:00').toLocaleDateString()}`
    : `Last ${uniqueWeeks.length} weeks`

  return (
    <MoodWrapper><div style={{ fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: '0 0 4px' }}>
              {'\u{1F3C6}'} Leaderboard
            </h1>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              {viewMode === 'week'
                ? `Week ending ${latestWeek ? new Date(latestWeek + 'T12:00:00').toLocaleDateString() : '—'}`
                : rollingLabel}
            </p>
          </div>
          <a href="/dashboard" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>
            {'<-'} Dashboard
          </a>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'white', borderRadius: 10, overflow: 'hidden', border: '2px solid #e0d9c8', width: 'fit-content' }}>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13,
              fontFamily: 'Cooper Black, serif',
              background: viewMode === 'week' ? '#3a7b3c' : 'white',
              color: viewMode === 'week' ? 'white' : '#666',
            }}
          >
            This Week
          </button>
          <button
            onClick={() => setViewMode('rolling')}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13,
              fontFamily: 'Cooper Black, serif',
              background: viewMode === 'rolling' ? '#3a7b3c' : 'white',
              color: viewMode === 'rolling' ? 'white' : '#666',
            }}
          >
            4-Week Avg
          </button>
        </div>

        {stats.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: 16, margin: 0 }}>No stats imported yet. Check back after the weekly import!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 24 }}>
            {(Object.keys(METRIC_CONFIG) as Metric[]).map(metric => {
              const config = METRIC_CONFIG[metric]
              const rankings = getRankings(metric)
              return (
                <div key={metric} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(84,60,45,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 24 }}>{config.emoji}</span>
                    <h2 style={{ fontFamily: 'Cooper Black, serif', color: config.color, fontSize: 20, margin: 0 }}>
                      {config.label}
                    </h2>
                  </div>
                  {rankings.length === 0 ? (
                    <p style={{ color: '#888', fontSize: 14, margin: 0 }}>No data for this metric.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {rankings.slice(0, 3).map((r, idx) => {
                        const style = RANK_STYLES[idx]
                        const barWidth = rankings[0].value > 0 ? Math.max(8, (r.value / rankings[0].value) * 100) : 0
                        return (
                          <div key={r.memberId} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: style.bg,
                            border: style.border,
                          }}>
                            <span style={{
                              fontFamily: 'Cooper Black, serif', fontSize: 18,
                              color: '#888', minWidth: 28, textAlign: 'center',
                            }}>
                              {style.badge}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                <span style={{
                                  fontFamily: 'Cooper Black, serif',
                                  fontSize: 15, color: '#333',
                                }}>
                                  {r.name}
                                  {r.type && <span style={{ fontSize: 11, color: '#888', marginLeft: 6, fontFamily: 'Cooper Light, system-ui, sans-serif', fontWeight: 'normal' }}>{r.type}</span>}
                                </span>
                                <span style={{
                                  fontFamily: 'Cooper Black, serif',
                                  fontSize: 16,
                                  color: config.color,
                                }}>
                                  {config.format(r.value)}
                                </span>
                              </div>
                              <div style={{ background: '#f0ece0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                <div style={{
                                  background: config.color, height: '100%', borderRadius: 4,
                                  width: barWidth + '%', transition: 'width 0.5s',
                                }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div></MoodWrapper>
  )
}
