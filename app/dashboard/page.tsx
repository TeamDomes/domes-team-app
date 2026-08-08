'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { awardPoints, POINTS } from '@/lib/points'

/* ── icon map (Tabler icon class names) ── */
const navItems = [
  { label: 'Trivia',        href: '/trivia',        icon: 'ti-brain',            desc: 'Daily quiz',        bg: '#c8a84e', text: '#1a2f2a' },
  { label: 'Wordle',        href: '/wordle',         icon: 'ti-vocabulary',       desc: 'Word puzzle',       bg: '#2d9e75', text: '#fff' },
  { label: 'My Stats',      href: '/stats',          icon: 'ti-chart-bar',        desc: 'Performance',       bg: '#387dac', text: '#fff' },
  { label: 'BINGO',         href: '/bingo',          icon: 'ti-target',           desc: 'Weekly card',       bg: '#7b5ea7', text: '#fff' },
  { label: 'Appreciations', href: '/appreciations',  icon: 'ti-heart-handshake',  desc: 'Recognize peers',   bg: '#f37029', text: '#fff' },
  { label: 'Pets',          href: '/pets',            icon: 'ti-paw',             desc: 'Team pets',         bg: '#d4436a', text: '#fff' },
  { label: 'Spotted',       href: '/spotted',         icon: 'ti-eye',             desc: 'Cool finds',        bg: '#e84593', text: '#fff' },
  { label: 'Recap',         href: '/recap',           icon: 'ti-confetti',        desc: 'Weekly wins',       bg: '#3a7b3c', text: '#fff' },
  { label: 'Grower',        href: '/grower',          icon: 'ti-plant',           desc: 'Brand spotlight',   bg: '#543c2d', text: '#f4e6b4' },
  { label: 'Wall of Love',  href: '/wall-of-love',    icon: 'ti-star',            desc: 'Google reviews',    bg: '#ffcb1f', text: '#543c2d' },
]

/* ── scattered dome triangles (SVG) ── */
function DomeTriangles() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
      {/* gold clusters */}
      <polygon points="80,40 105,80 55,80"   fill="#c8a84e" opacity="0.18" transform="rotate(10,80,60)"/>
      <polygon points="820,90 850,140 790,140" fill="#c8a84e" opacity="0.14" transform="rotate(-20,820,115)"/>
      <polygon points="700,500 730,545 670,545" fill="#d4a830" opacity="0.12" transform="rotate(35,700,520)"/>
      <polygon points="150,650 175,690 125,690" fill="#c8a84e" opacity="0.15" transform="rotate(-15,150,670)"/>
      {/* teal */}
      <polygon points="900,300 925,340 875,340" fill="#34d399" opacity="0.10" transform="rotate(25,900,320)"/>
      <polygon points="50,380 72,415 28,415"   fill="#2d9e75" opacity="0.09" transform="rotate(-30,50,398)"/>
      <polygon points="500,100 522,135 478,135" fill="#34d399" opacity="0.08" transform="rotate(15,500,118)"/>
      {/* purple */}
      <polygon points="780,400 802,435 758,435" fill="#a855f7" opacity="0.09" transform="rotate(40,780,418)"/>
      <polygon points="300,50 318,80 282,80"    fill="#c084fc" opacity="0.10" transform="rotate(-10,300,65)"/>
      <polygon points="600,700 622,735 578,735" fill="#a855f7" opacity="0.08" transform="rotate(20,600,718)"/>
      {/* small accents */}
      <polygon points="200,200 212,218 188,218" fill="#c8a84e" opacity="0.15" transform="rotate(5,200,209)"/>
      <polygon points="650,250 662,268 638,268" fill="#e84593" opacity="0.08" transform="rotate(-25,650,259)"/>
      <polygon points="400,450 412,468 388,468" fill="#34d399" opacity="0.10" transform="rotate(30,400,459)"/>
      <polygon points="100,550 112,568 88,568"  fill="#c084fc" opacity="0.09" transform="rotate(-40,100,559)"/>
      <polygon points="850,600 862,618 838,618" fill="#c8a84e" opacity="0.12" transform="rotate(15,850,609)"/>
      {/* dome arc at top */}
      <path d="M200,20 Q480,-30 760,20" stroke="#c8a84e" strokeWidth="1.5" fill="none" opacity="0.12"/>
      <path d="M240,30 Q480,-10 720,30" stroke="#c8a84e" strokeWidth="1" fill="none" opacity="0.08"/>
    </svg>
  )
}

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState('')
  const [teamMember, setTeamMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [totalPoints, setTotalPoints] = useState(0)
  const [weekPoints, setWeekPoints] = useState(0)
  const [celebrations, setCelebrations] = useState<any[]>([])
  const [hasQuestionnaire, setHasQuestionnaire] = useState(true)
  const [leaderboard, setLeaderboard] = useState<Record<string, { name: string; value: number }[]>>({})
  const [lbWeek, setLbWeek] = useState('')

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')
      const { data: member } = await supabase.from('team').select('*').eq('email', user.email).single()
      if (member) {
        setTeamMember(member)
        if (!member.auth_user_id) { await supabase.from('team').update({ auth_user_id: user.id }).eq('id', member.id) }
        await loadPoints(member.id)
        await checkQuestionnaire(member.id)
      }
      await loadCelebrations()
      await loadLeaderboard()
      setLoading(false)
    }
    loadUser()
  }, [router])

  async function loadLeaderboard() {
    const { data: teamData } = await supabase.from('team').select('id, full_name, role')
    const nameMap: Record<string, string> = {}
    const leadIds = new Set<string>()
    ;(teamData || []).forEach((t: any) => {
      nameMap[t.id] = t.full_name
      if (t.role === 'Lead') leadIds.add(t.id)
    })
    const { data: allStats } = await supabase
      .from('weekly_stats')
      .select('team_member_id, average_basket, total_net_sales, hours_worked, upsell_pct, week_ending')
      .order('week_ending', { ascending: false })
    if (!allStats || allStats.length === 0) return
    const latestWeek = allStats[0].week_ending
    setLbWeek(latestWeek)
    const weekStats = allStats.filter((s: any) => s.week_ending === latestWeek && !leadIds.has(s.team_member_id))
    const metrics: Record<string, { calc: (s: any) => number }> = {
      'Sales / Hour': { calc: s => s.hours_worked ? Number(s.total_net_sales) / Number(s.hours_worked) : 0 },
      'Average Basket': { calc: s => Number(s.average_basket) || 0 },
      'Upsell %': { calc: s => Number(s.upsell_pct) || 0 },
    }
    const lb: Record<string, { name: string; value: number }[]> = {}
    Object.entries(metrics).forEach(([label, { calc }]) => {
      lb[label] = weekStats
        .map((s: any) => ({ name: nameMap[s.team_member_id] || 'Unknown', value: calc(s) }))
        .filter(r => r.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
    })
    setLeaderboard(lb)
  }

  async function checkQuestionnaire(memberId: string) {
    const { data } = await supabase.from('staff_questionnaire').select('id').eq('team_member_id', memberId).single()
    setHasQuestionnaire(!!data)
  }

  async function loadCelebrations() {
    const { data: allMembers } = await supabase.from('team').select('full_name, birthday, hire_date')
    if (!allMembers) return
    const today = new Date()
    const m = today.getMonth() + 1
    const d = today.getDate()
    const items: any[] = []
    allMembers.forEach((member: any) => {
      if (member.birthday) {
        const bday = new Date(member.birthday + 'T12:00:00')
        if (bday.getMonth() + 1 === m && bday.getDate() === d) {
          items.push({ name: member.full_name, type: 'birthday' })
        }
      }
      if (member.hire_date) {
        const hd = new Date(member.hire_date + 'T12:00:00')
        if (hd.getDate() === d && hd.getFullYear() <= today.getFullYear()) {
          const monthDiff = (today.getFullYear() - hd.getFullYear()) * 12 + (m - (hd.getMonth() + 1))
          if (monthDiff > 0 && monthDiff % 6 === 0) {
            let label = ''
            if (monthDiff % 12 === 0) { label = `${monthDiff / 12}-Year` }
            else if (monthDiff === 6) label = '6-Month'
            else if (monthDiff === 18) label = '18-Month'
            else if (monthDiff === 30) label = '30-Month'
            else { label = `${Math.floor(monthDiff / 12)}½-Year` }
            items.push({ name: member.full_name, type: 'anniversary', label })
          }
        }
      }
    })
    setCelebrations(items)
  }

  async function loadPoints(memberId: string) {
    const { data: allPts } = await supabase.from('points_log').select('points, created_at').eq('team_member_id', memberId)
    if (!allPts) return
    const total = allPts.reduce((sum: number, p: any) => sum + p.points, 0)
    setTotalPoints(total)
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1)
    monday.setHours(0, 0, 0, 0)
    const week = allPts.filter((p: any) => new Date(p.created_at) >= monday).reduce((sum: number, p: any) => sum + p.points, 0)
    setWeekPoints(week)
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2a4a3f' }}>
      <p style={{ color: '#c8a84e', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div>
  )

  const displayName = teamMember ? teamMember.full_name.split(' ')[0] : userEmail
  const role = teamMember?.role || 'Admin'
  const type = teamMember?.type || ''
  const nextTier = totalPoints < 500 ? 500 : totalPoints < 1000 ? 1000 : totalPoints < 1500 ? 1500 : null
  const tierLabel = totalPoints < 500 ? '$5 Reward' : totalPoints < 1000 ? '$15 Reward' : totalPoints < 1500 ? '$25 Reward' : 'Max Tier!'
  const progress = nextTier ? Math.min(100, Math.round((totalPoints / nextTier) * 100)) : 100

  const lbIcons: Record<string, string> = { 'Sales / Hour': 'ti-coin', 'Average Basket': 'ti-shopping-cart', 'Upsell %': 'ti-trending-up' }
  const lbColors: Record<string, string> = { 'Sales / Hour': '#34d399', 'Average Basket': '#60a5fa', 'Upsell %': '#c084fc' }
  const formatLb = (label: string, v: number) => label === 'Upsell %' ? v.toFixed(1) + '%' : '$' + v.toFixed(2)

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: 'Cooper Light, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Tabler icons CDN */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />

      <style>{`
        .tile-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .tile-hover:hover { transform: scale(1.04) !important; box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important; }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .celebration-banner {
          position: relative; border-radius: 14px; padding: 24px 20px;
          margin-bottom: 16px; text-align: center; overflow: hidden;
        }
        .celebration-banner .shimmer-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%; animation: shimmer 2.5s linear infinite;
        }
        @keyframes questionnairePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200,168,78,0.4); }
          50% { box-shadow: 0 0 20px 8px rgba(200,168,78,0.15); }
        }
      `}</style>

      {/* ── Wallpaper background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#2a4a3f' }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        backgroundImage: 'url(/images/cannabis-botanical.png)',
        backgroundSize: '340px',
        backgroundRepeat: 'repeat',
        opacity: 0.45,
        filter: 'saturate(1.2) brightness(1.1)',
      }} />

      {/* ── Dome triangles overlay ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <DomeTriangles />
      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 3, padding: 20 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(200,168,78,0.5)', overflow: 'hidden',
              }}>
                <img src="/images/domes-logo.png" alt="Domes" style={{ width: 36, objectFit: 'contain' }} />
              </div>
              <div>
                <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#fff', fontSize: 22, margin: '0 0 2px', letterSpacing: -0.3 }}>
                  Welcome, {displayName}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>{role}{type ? ` · ${type}` : ''}</p>
              </div>
            </div>
            <button onClick={handleSignOut} style={{
              background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.4)', padding: '7px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              fontFamily: 'Cooper Light, system-ui, sans-serif',
            }}>Sign Out</button>
          </div>

          {/* Celebrations */}
          {celebrations.map((c, i) => (
            <div key={i} className="celebration-banner" style={{
              background: c.type === 'birthday'
                ? 'linear-gradient(135deg, #c8a84e 0%, #f07030 50%, #e84593 100%)'
                : 'linear-gradient(135deg, #2d9e75 0%, #387dac 50%, #7b5ea7 100%)',
            }}>
              <div className="shimmer-overlay" />
              <p style={{ margin: 0, position: 'relative', zIndex: 1, fontFamily: 'Cooper Black, serif', fontSize: 24, color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                {c.type === 'birthday' ? `Happy Birthday, ${c.name}!` : `Happy ${c.label} Anniversary, ${c.name}!`}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)', position: 'relative', zIndex: 1 }}>
                {c.type === 'birthday' ? 'Celebrate with the Domes fam today!' : 'Thank you for being part of the Domes family!'}
              </p>
            </div>
          ))}

          {/* Points strip */}
          <div style={{
            margin: '0 0 16px', padding: '18px 22px',
            background: '#f4e6b4', borderRadius: 14,
            border: '1px solid rgba(200,168,78,0.4)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 34, fontFamily: 'Cooper Black, serif', color: '#3a7b3c', letterSpacing: -1 }}>{totalPoints}</span>
              <span style={{ fontSize: 13, color: '#543c2d' }}>points</span>
              <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>+{weekPoints} this week</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Next: {tierLabel}{nextTier ? ` at ${nextTier}` : ''}</p>
              <div style={{ width: 130, height: 5, background: 'rgba(0,0,0,0.1)', borderRadius: 4, marginTop: 5 }}>
                <div style={{ width: progress + '%', height: '100%', background: 'linear-gradient(90deg, #c8a84e, #e0bc50)', borderRadius: 4 }} />
              </div>
              {(role === 'Admin' || role === 'Lead') && (
                <div style={{ marginTop: 6 }}>
                  <a href="/admin/points" style={{ color: '#3a7b3c', fontSize: 11, textDecoration: 'none', marginRight: 10 }}>Points Report</a>
                  <a href="/admin/stats-overview" style={{ color: '#3a7b3c', fontSize: 11, textDecoration: 'none' }}>Team Stats</a>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          {Object.keys(leaderboard).length > 0 && (
            <div style={{
              padding: '20px 22px', marginBottom: 16,
              background: '#f4e6b4', borderRadius: 14,
              border: '1px solid rgba(84,60,45,0.15)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#543c2d', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
                  This week{"'"}s top 3
                </p>
                <span style={{ fontSize: 10, color: '#888' }}>
                  Week ending {lbWeek ? new Date(lbWeek + 'T12:00:00').toLocaleDateString() : ''}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {Object.entries(leaderboard).map(([label, rankings]) => {
                  const color = lbColors[label] || '#fff'
                  return (
                    <div key={label}>
                      <p style={{ margin: '0 0 10px', fontSize: 11, color: '#543c2d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className={`ti ${lbIcons[label]}`} style={{ fontSize: 14, color }} aria-hidden="true" />
                        {label}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {rankings.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: i === 0 ? '#333' : '#666' }}>{r.name}</span>
                            <span style={{ fontSize: 12, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? color : '#888' }}>
                              {formatLb(label, r.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Get to Know You */}
          {!hasQuestionnaire && (
            <button
              className="tile-hover"
              onClick={() => router.push('/questionnaire')}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, width: '100%',
                background: 'linear-gradient(135deg, #c8a84e 0%, #f07030 50%, #e84593 100%)',
                border: 'none', borderRadius: 14, padding: '18px 24px',
                cursor: 'pointer', textAlign: 'left', marginBottom: 16,
                animation: 'questionnairePulse 3s ease-in-out infinite',
              }}
            >
              <i className="ti ti-clipboard-text" style={{ fontSize: 32, color: '#fff' }} aria-hidden="true" />
              <div>
                <p style={{ margin: 0, fontFamily: 'Cooper Black, serif', fontSize: 16, color: '#fff' }}>Get to Know You</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Fill in once to add your fun facts to team trivia!</p>
              </div>
            </button>
          )}

          {/* Nav Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {navItems.map((item) => (
                <button
                  key={item.href}
                  className="tile-hover"
                  onClick={() => router.push(item.href)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: item.bg,
                    border: 'none',
                    borderRadius: 14, padding: '22px 16px', cursor: 'pointer',
                    textAlign: 'center', width: '100%', minHeight: 120,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  }}
                >
                  <i className={`ti ${item.icon}`} style={{
                    fontSize: 28, marginBottom: 8, display: 'block',
                    color: item.text,
                    opacity: 0.85,
                  }} aria-hidden="true" />
                  <p style={{
                    margin: 0, fontFamily: 'TAY Bone Quixote, Cooper Black, serif', fontSize: 15,
                    color: item.text,
                  }}>{item.label}</p>
                  <p style={{
                    margin: '3px 0 0', fontSize: 10,
                    color: item.text,
                    opacity: 0.6,
                    fontFamily: 'Cooper Light, system-ui, sans-serif',
                  }}>{item.desc}</p>
                </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

/* helper: "#c8a84e" → "200,168,78" */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
