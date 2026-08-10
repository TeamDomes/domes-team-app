'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PointsReportPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [weekData, setWeekData] = useState<any[]>([])
  const [allTimeData, setAllTimeData] = useState<any[]>([])
  const [weekLabel, setWeekLabel] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: teamData } = await supabase.from('team').select('*')
    let me: any = null
    const teamMap: Record<string, any> = {}
    ;(teamData || []).forEach((t: any) => {
      teamMap[t.id] = t
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setCurrentUser(me)
    setIsAdmin(me?.role === 'Admin' || me?.role === 'Lead')

    // Get this week's Monday
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    setWeekLabel(monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' - ' + sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))

    // Get all points
    const { data: allPoints } = await supabase.from('points_log').select('*')
    if (!allPoints) { setLoading(false); return }

    // Weekly totals per person
    const weekTotals: Record<string, { points: number, activities: Record<string, number> }> = {}
    const allTimeTotals: Record<string, number> = {}

    // Init all team members
    ;(teamData || []).forEach((t: any) => {
      weekTotals[t.id] = { points: 0, activities: {} }
      allTimeTotals[t.id] = 0
    })

    allPoints.forEach((p: any) => {
      allTimeTotals[p.team_member_id] = (allTimeTotals[p.team_member_id] || 0) + p.points
      if (new Date(p.created_at) >= monday) {
        if (!weekTotals[p.team_member_id]) weekTotals[p.team_member_id] = { points: 0, activities: {} }
        weekTotals[p.team_member_id].points += p.points
        weekTotals[p.team_member_id].activities[p.activity] = (weekTotals[p.team_member_id].activities[p.activity] || 0) + p.points
      }
    })

    // Build weekly report sorted by points desc
    const weekReport = Object.entries(weekTotals)
      .map(([id, data]) => ({
        id,
        name: teamMap[id]?.full_name || id,
        role: teamMap[id]?.role || '',
        weekPoints: data.points,
        activities: data.activities,
        allTimePoints: allTimeTotals[id] || 0,
        tier: (allTimeTotals[id] || 0) >= 1500 ? '$25' : (allTimeTotals[id] || 0) >= 1000 ? '$15' : (allTimeTotals[id] || 0) >= 500 ? '$5' : '-'
      }))
      .sort((a, b) => b.weekPoints - a.weekPoints)

    setWeekData(weekReport)

    const allTimeReport = Object.entries(allTimeTotals)
      .map(([id, pts]) => ({
        id,
        name: teamMap[id]?.full_name || id,
        role: teamMap[id]?.role || '',
        points: pts,
        tier: pts >= 1500 ? '$25' : pts >= 1000 ? '$15' : pts >= 500 ? '$5' : '-'
      }))
      .sort((a, b) => b.points - a.points)

    setAllTimeData(allTimeReport)
    setLoading(false)
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

  const activityLabels: Record<string, string> = {
    trivia_correct: 'Trivia (correct)',
    trivia_wrong: 'Trivia (wrong)',
    quiz_perfect: 'Brand Quiz (perfect)',
    quiz_partial: 'Brand Quiz',
    appreciation_given: 'Appreciation Given',
    appreciation_received: 'Appreciation Received',
    questionnaire: 'Questionnaire',
    pet_post: 'Pet Post',
    spotted_post: 'Spotted Post',
    pet_comment: 'Comment (Pets)',
    spotted_comment: 'Comment (Spotted)',
    recap_comment: 'Comment (Recap)',
    bingo_on_time: 'On Time',
    bingo_drawer: 'Perfect Drawer',
    bingo_google_review: 'Google Review',
    bingo_square: 'BINGO Square',
    bingo_win: 'BINGO Win',
    google_review_mention: 'Google Review Mention',
    lead_trickle: 'Lead Bonus',
    points_adjustment: 'Adjustment',
    boggle_win: 'Boggle Win',
    boggle_play: 'Boggle Played',
    wordle_win: 'Wordle',
  }

  function exportCSV() {
    const header = 'Name,Role,This Week,All Time,Tier'
    const rows = weekData.map(r => `${r.name},${r.role},${r.weekPoints},${r.allTimePoints},${r.tier}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `domes-points-${weekLabel.replace(/[^a-zA-Z0-9]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4e6b4', padding: 20 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block' }}>
          {'←'} Dashboard
        </a>

        <h1 style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 24, color: '#543c2d', marginTop: 10 }}>
          {'🏆'} Weekly Points Report
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#666', margin: 0 }}>
            Week of {weekLabel}
          </p>
          <button onClick={exportCSV} style={{
            background: '#3a7b3c', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontFamily: 'Cooper Black, serif', fontSize: 13,
            cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}>
            Export CSV for AIQ
          </button>
        </div>

        {/* Weekly Report Table */}
        <div style={{
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20
        }}>
          <div style={{ background: '#3a7b3c', padding: '12px 20px' }}>
            <h3 style={{ fontFamily: 'Cooper Black, Georgia, serif', color: '#fff', margin: 0, fontSize: 16 }}>
              This Week's Points (for Loyalty Update)
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '10px 15px', textAlign: 'left', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13 }}>Team Member</th>
                <th style={{ padding: '10px 15px', textAlign: 'center', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13 }}>This Week</th>
                <th style={{ padding: '10px 15px', textAlign: 'center', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13 }}>All Time</th>
                <th style={{ padding: '10px 15px', textAlign: 'center', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13 }}>Tier</th>
              </tr>
            </thead>
            <tbody>
              {weekData.map((row, i) => (
                <tr key={row.id} style={{ borderTop: '1px solid #eee', background: i === 0 && row.weekPoints > 0 ? '#fff8e7' : 'white' }}>
                  <td style={{ padding: '10px 15px', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14 }}>
                    {i === 0 && row.weekPoints > 0 && '🥇 '}
                    {i === 1 && row.weekPoints > 0 && '🥈 '}
                    {i === 2 && row.weekPoints > 0 && '🥉 '}
                    {row.name}
                    <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>{row.role}</span>
                  </td>
                  <td style={{ padding: '10px 15px', textAlign: 'center', fontFamily: 'Cooper Black, Georgia, serif', fontSize: 16, color: row.weekPoints > 0 ? '#3a7b3c' : '#ccc' }}>
                    {row.weekPoints > 0 ? '+' + row.weekPoints : '0'}
                  </td>
                  <td style={{ padding: '10px 15px', textAlign: 'center', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#543c2d' }}>
                    {row.allTimePoints}
                  </td>
                  <td style={{ padding: '10px 15px', textAlign: 'center', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: row.tier !== '-' ? '#3a7b3c' : '#ccc' }}>
                    {row.tier}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Activity Breakdown */}
        <div style={{
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20
        }}>
          <div style={{ background: '#543c2d', padding: '12px 20px' }}>
            <h3 style={{ fontFamily: 'Cooper Black, Georgia, serif', color: '#f4e6b4', margin: 0, fontSize: 16 }}>
              Activity Breakdown (This Week)
            </h3>
          </div>
          <div style={{ padding: 15 }}>
            {weekData.filter(r => r.weekPoints > 0).map(row => (
              <div key={row.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
                <p style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 14, color: '#543c2d', margin: '0 0 6px' }}>
                  {row.name} — {row.weekPoints} pts
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(row.activities).map(([activity, pts]) => (
                    <span key={activity} style={{
                      background: '#f4e6b4', borderRadius: 20, padding: '3px 10px',
                      fontSize: 11, fontFamily: 'Cooper Light, Georgia, serif', color: '#543c2d'
                    }}>
                      {activityLabels[activity] || activity}: +{pts as number}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {weekData.filter(r => r.weekPoints > 0).length === 0 && (
              <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#999', textAlign: 'center' }}>
                No points earned this week yet.
              </p>
            )}
          </div>
        </div>

        {/* Reward Tiers Legend */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 15,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h4 style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 14, color: '#543c2d', margin: '0 0 8px' }}>Reward Tiers</h4>
          <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#666', margin: '3px 0' }}>500 points = $5 loyalty credit</p>
          <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#666', margin: '3px 0' }}>1,000 points = $15 loyalty credit</p>
          <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#666', margin: '3px 0' }}>1,500 points = $25 loyalty credit OR Secret Stash Grab</p>
        </div>
      </div>
    </div>
  )
}
