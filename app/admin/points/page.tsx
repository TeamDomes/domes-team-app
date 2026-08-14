'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Get Monday 12:00 AM for a given date
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

// Get Sunday 11:59:59 PM for a given Monday
function getSunday(monday: Date): Date {
  const sun = new Date(monday)
  sun.setDate(monday.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return sun
}

function formatWeekLabel(monday: Date): string {
  const sunday = getSunday(monday)
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' – ' + sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function weekKey(monday: Date): string {
  return monday.toISOString().split('T')[0]
}

export default function PointsReportPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState<{ monday: Date; label: string; key: string; isCurrent: boolean }[]>([])
  const [selectedWeekKey, setSelectedWeekKey] = useState('')
  const [weekRows, setWeekRows] = useState<any[]>([])
  const [allPoints, setAllPoints] = useState<any[]>([])
  const [teamMap, setTeamMap] = useState<Record<string, any>>({})

  const activityLabels: Record<string, string> = {
    trivia_correct: 'Trivia ✓',
    trivia_wrong: 'Trivia ✗',
    quiz_perfect: 'Brand Quiz ★',
    quiz_partial: 'Brand Quiz',
    appreciation_given: 'Appr. Given',
    appreciation_received: 'Appr. Received',
    questionnaire: 'Questionnaire',
    pet_post: 'Pet Post',
    spotted_post: 'Spotted Post',
    pet_comment: 'Comment',
    spotted_comment: 'Comment',
    recap_comment: 'Comment',
    bingo_on_time: 'BINGO: On Time',
    bingo_drawer: 'BINGO: Drawer',
    bingo_google_review: 'BINGO: Review',
    bingo_square: 'BINGO Square',
    bingo_win: 'BINGO Win!',
    google_review_mention: 'Google Review ⭐',
    lead_trickle: 'Lead Bonus',
    points_adjustment: 'Adjustment',
    boggle_win: 'Boggle Win',
    boggle_play: 'Boggle Played',
    wordle_solved: 'Wordle ✓',
    wordle_attempted: 'Wordle ✗',
  }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: teamData } = await supabase.from('team').select('*')
    let me: any = null
    const tMap: Record<string, any> = {}
    ;(teamData || []).forEach((t: any) => {
      tMap[t.id] = t
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setIsAdmin(me?.role === 'Admin' || me?.role === 'Lead')
    setTeamMap(tMap)

    const { data: pts } = await supabase.from('points_log').select('*').order('created_at', { ascending: false })
    setAllPoints(pts || [])

    // Discover all weeks that have points
    const currentMonday = getMonday(new Date())
    const weekSet = new Map<string, Date>()

    // Always include current week
    weekSet.set(weekKey(currentMonday), currentMonday)

    ;(pts || []).forEach((p: any) => {
      const mon = getMonday(new Date(p.created_at))
      const key = weekKey(mon)
      if (!weekSet.has(key)) weekSet.set(key, mon)
    })

    // Sort weeks newest first
    const sortedWeeks = [...weekSet.entries()]
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([key, mon]) => ({
        monday: mon,
        label: formatWeekLabel(mon),
        key,
        isCurrent: key === weekKey(currentMonday),
      }))

    setWeeks(sortedWeeks)

    // Default to current week
    const defaultKey = sortedWeeks.length > 0 ? sortedWeeks[0].key : ''
    setSelectedWeekKey(defaultKey)
    buildWeekRows(pts || [], tMap, defaultKey)
    setLoading(false)
  }

  function buildWeekRows(pts: any[], tMap: Record<string, any>, wKey: string) {
    const monday = new Date(wKey + 'T00:00:00')
    const sunday = getSunday(monday)

    // Filter points to this week
    const weekPts = pts.filter((p: any) => {
      const d = new Date(p.created_at)
      return d >= monday && d <= sunday
    })

    // Aggregate per member
    const totals: Record<string, { points: number; activities: Record<string, number> }> = {}

    // Init all team members
    Object.keys(tMap).forEach(id => {
      totals[id] = { points: 0, activities: {} }
    })

    weekPts.forEach((p: any) => {
      if (!totals[p.team_member_id]) totals[p.team_member_id] = { points: 0, activities: {} }
      totals[p.team_member_id].points += p.points
      totals[p.team_member_id].activities[p.activity] =
        (totals[p.team_member_id].activities[p.activity] || 0) + p.points
    })

    // Calculate all-time totals up through this Sunday
    const allTimeTotals: Record<string, number> = {}
    pts.forEach((p: any) => {
      if (new Date(p.created_at) <= sunday) {
        allTimeTotals[p.team_member_id] = (allTimeTotals[p.team_member_id] || 0) + p.points
      }
    })

    const rows = Object.entries(totals)
      .map(([id, data]) => ({
        id,
        name: tMap[id]?.full_name || id,
        role: tMap[id]?.role || '',
        weekPoints: data.points,
        activities: data.activities,
        allTimePoints: allTimeTotals[id] || 0,
        tier: (allTimeTotals[id] || 0) >= 1500 ? '$25' : (allTimeTotals[id] || 0) >= 1000 ? '$15' : (allTimeTotals[id] || 0) >= 500 ? '$5' : '—'
      }))
      .sort((a, b) => b.weekPoints - a.weekPoints)

    setWeekRows(rows)
  }

  function selectWeek(wKey: string) {
    setSelectedWeekKey(wKey)
    buildWeekRows(allPoints, teamMap, wKey)
  }

  function exportWeekCSV() {
    const selectedWeek = weeks.find(w => w.key === selectedWeekKey)
    const label = selectedWeek?.label || selectedWeekKey
    const header = 'Name,Role,Week Points,All Time,Tier'
    const csvRows = weekRows
      .filter(r => r.weekPoints > 0)
      .map(r => `"${r.name}","${r.role}",${r.weekPoints},${r.allTimePoints},"${r.tier}"`)
    const csv = [header, ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `domes-points-${label.replace(/[^a-zA-Z0-9]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportDetailedCSV() {
    const selectedWeek = weeks.find(w => w.key === selectedWeekKey)
    const label = selectedWeek?.label || selectedWeekKey

    // Get all unique activities across all members this week
    const allActivities = new Set<string>()
    weekRows.forEach(r => Object.keys(r.activities).forEach(a => allActivities.add(a)))
    const actList = [...allActivities].sort()

    const header = ['Name', 'Role', ...actList.map(a => activityLabels[a] || a), 'Week Total', 'All Time', 'Tier'].join(',')
    const csvRows = weekRows
      .filter(r => r.weekPoints > 0)
      .map(r => {
        const actCols = actList.map(a => r.activities[a] || 0)
        return [`"${r.name}"`, `"${r.role}"`, ...actCols, r.weekPoints, r.allTimePoints, `"${r.tier}"`].join(',')
      })
    const csv = [header, ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `domes-points-detailed-${label.replace(/[^a-zA-Z0-9]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
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

  const selectedWeek = weeks.find(w => w.key === selectedWeekKey)
  const activeMembers = weekRows.filter(r => r.weekPoints > 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f4e6b4', padding: 20 }}>
      <div style={{ maxWidth: 750, margin: '0 auto' }}>
        <div style={{ textAlign: 'right', marginBottom: 10 }}>
          <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block' }}>
            {'←'} Dashboard
          </a>
        </div>

        <h1 style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 24, color: '#543c2d', marginTop: 10, marginBottom: 5 }}>
          {'🏆'} Weekly Points Report
        </h1>

        {/* Week Selector */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, flexWrap: 'wrap', gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#666' }}>Week:</label>
            <select
              value={selectedWeekKey}
              onChange={e => selectWeek(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '2px solid #e0d9c8',
                fontSize: 14, fontFamily: 'Cooper Light, system-ui, sans-serif',
                background: 'white', minWidth: 240,
              }}
            >
              {weeks.map(w => (
                <option key={w.key} value={w.key}>
                  {w.label}{w.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportWeekCSV} style={{
              background: '#3a7b3c', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 14px', fontFamily: 'Cooper Black, serif', fontSize: 12,
              cursor: 'pointer',
            }}>
              Export CSV
            </button>
            <button onClick={exportDetailedCSV} style={{
              background: '#543c2d', color: '#f4e6b4', border: 'none', borderRadius: 8,
              padding: '8px 14px', fontFamily: 'Cooper Black, serif', fontSize: 12,
              cursor: 'pointer',
            }}>
              Detailed CSV
            </button>
          </div>
        </div>

        {selectedWeek && !selectedWeek.isCurrent && (
          <div style={{
            background: '#e8f5e9', border: '1px solid #3a7b3c', borderRadius: 10,
            padding: '10px 16px', marginBottom: 16, textAlign: 'center'
          }}>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#3a7b3c', margin: 0 }}>
              {'🔒'} This week is complete — points are final and won't change.
            </p>
          </div>
        )}

        {/* Points Table */}
        <div style={{
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20
        }}>
          <div style={{ background: '#3a7b3c', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'Cooper Black, Georgia, serif', color: '#fff', margin: 0, fontSize: 16 }}>
              {selectedWeek?.label || 'Points'}
            </h3>
            <span style={{ fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#f4e6b4' }}>
              {activeMembers.length} active · {activeMembers.reduce((s, r) => s + r.weekPoints, 0)} pts total
            </span>
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
              {weekRows.map((row, i) => (
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
                  <td style={{ padding: '10px 15px', textAlign: 'center', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: row.tier !== '—' ? '#3a7b3c' : '#ccc' }}>
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
              Activity Breakdown
            </h3>
          </div>
          <div style={{ padding: 15 }}>
            {activeMembers.map(row => (
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
            {activeMembers.length === 0 && (
              <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#999', textAlign: 'center' }}>
                No points earned this week.
              </p>
            )}
          </div>
        </div>

        {/* Week Archive */}
        <div style={{
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20
        }}>
          <div style={{ background: '#f37029', padding: '12px 20px' }}>
            <h3 style={{ fontFamily: 'Cooper Black, Georgia, serif', color: '#fff', margin: 0, fontSize: 16 }}>
              {'📁'} Weekly Archive
            </h3>
          </div>
          <div style={{ padding: 15 }}>
            {weeks.map(w => {
              const monday = w.monday
              const sunday = getSunday(monday)
              const wkPts = allPoints.filter(p => {
                const d = new Date(p.created_at)
                return d >= monday && d <= sunday
              })
              const total = wkPts.reduce((s: number, p: any) => s + p.points, 0)
              const unique = new Set(wkPts.map((p: any) => p.team_member_id)).size
              return (
                <div key={w.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid #f0f0f0',
                }}>
                  <div>
                    <button
                      onClick={() => selectWeek(w.key)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14,
                        color: w.key === selectedWeekKey ? '#f37029' : '#543c2d',
                        fontWeight: w.key === selectedWeekKey ? 'bold' : 'normal',
                        textDecoration: 'underline',
                      }}
                    >
                      {w.label}
                    </button>
                    <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
                      {w.isCurrent ? '(in progress)' : '🔒 final'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#666' }}>
                      {unique} members · {total} pts
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Reward Tiers */}
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
