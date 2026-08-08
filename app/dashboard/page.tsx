'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { awardPoints, POINTS } from '@/lib/points'

const tileColors = [
  'linear-gradient(135deg, #3a7b3c, #5ba85e)',
  'linear-gradient(135deg, #543c2d, #8b6545)',
  'linear-gradient(135deg, #387dac, #5b9dcf)',
  'linear-gradient(135deg, #f37029, #ffcb1f)',
  'linear-gradient(135deg, #7b5ea7, #a87fd4)',
  'linear-gradient(135deg, #d4436a, #f37029)',
  'linear-gradient(135deg, #3a7b3c, #387dac)',
  'linear-gradient(135deg, #ffcb1f, #f37029)',
  'linear-gradient(135deg, #543c2d, #7b5ea7)',
  'linear-gradient(135deg, #387dac, #3a7b3c)',
  'linear-gradient(135deg, #f37029, #d4436a)',
]

const tileRadii = [
  '24px 12px 24px 12px',
  '12px 24px 12px 24px',
  '24px 12px 24px 12px',
  '12px 24px 12px 24px',
  '24px 12px 24px 12px',
  '12px 24px 12px 24px',
  '24px 12px 24px 12px',
  '12px 24px 12px 24px',
  '24px 12px 24px 12px',
  '12px 24px 12px 24px',
  '24px 12px 24px 12px',
]

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState('')
  const [teamMember, setTeamMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [totalPoints, setTotalPoints] = useState(0)
  const [weekPoints, setWeekPoints] = useState(0)
  const [celebrations, setCelebrations] = useState<any[]>([])
  const [hasQuestionnaire, setHasQuestionnaire] = useState(true)

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
      setLoading(false)
    }
    loadUser()
  }, [router])

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
            if (monthDiff % 12 === 0) {
              const years = monthDiff / 12
              label = `${years}-Year`
            } else {
              const totalMonths = monthDiff
              if (totalMonths === 6) label = '6-Month'
              else if (totalMonths === 18) label = '18-Month'
              else if (totalMonths === 30) label = '30-Month'
              else {
                const yrs = Math.floor(totalMonths / 12)
                label = `${yrs}½-Year`
              }
            }
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

  if (loading) return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}><p style={{ color: '#3a7b3c', fontSize: '18px' }}>Loading...</p></div>)

  const displayName = teamMember ? teamMember.full_name : userEmail
  const role = teamMember?.role || 'Admin'
  const type = teamMember?.type || ''
  const nextTier = totalPoints < 500 ? 500 : totalPoints < 1000 ? 1000 : totalPoints < 1500 ? 1500 : null
  const tierLabel = totalPoints < 500 ? '$5 Reward' : totalPoints < 1000 ? '$15 Reward' : totalPoints < 1500 ? '$25 Reward' : 'Max Tier!'
  const progress = nextTier ? Math.min(100, Math.round((totalPoints / nextTier) * 100)) : 100

  const navItems = [
    { label: 'Trivia of the Day', href: '/trivia', emoji: '\u{1F9E0}', desc: 'Test your cannabis knowledge' },
    { label: 'Domes Wordle', href: '/wordle', emoji: '\u{1F33F}', desc: 'Daily cannabis word puzzle' },
    { label: 'My Stats', href: '/stats', emoji: '\u{1F4CA}', desc: 'Your weekly sales performance' },
    { label: 'BINGO', href: '/bingo', emoji: '\u{1F3AF}', desc: 'Check your BINGO card' },
    { label: 'Appreciations', href: '/appreciations', emoji: '\u{1F49A}', desc: 'Recognize your teammates' },
    { label: 'Pets', href: '/pets', emoji: '\u{1F43E}', desc: 'Share photos of your pets' },
    { label: 'Spotted', href: '/spotted', emoji: '\u{1F440}', desc: 'Spotted any cool products in the wild?' },
    { label: 'Weekend Recap', href: '/recap', emoji: '\u{1F389}', desc: 'Weekly highlights and wins' },
    { label: 'Grower of the Week', href: '/grower', emoji: '\u{1F331}', desc: 'Learn about the brands we carry' },
    { label: 'Wall of Love', href: '/wall-of-love', emoji: '⭐', desc: 'Google reviews from happy customers' },
  ]

  const isDarkText = (idx: number) => idx === 3

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif', padding: '20px' }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes firework1 {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          50% { transform: translate(60px, -100px) scale(1.2); opacity: 1; }
          100% { transform: translate(80px, -120px) scale(0.3); opacity: 0; }
        }
        @keyframes firework2 {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          50% { transform: translate(-50px, -90px) scale(1.3); opacity: 1; }
          100% { transform: translate(-70px, -110px) scale(0.2); opacity: 0; }
        }
        @keyframes firework3 {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          50% { transform: translate(30px, -110px) scale(1.1); opacity: 1; }
          100% { transform: translate(40px, -140px) scale(0.3); opacity: 0; }
        }
        @keyframes firework4 {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          50% { transform: translate(-40px, -80px) scale(1.4); opacity: 1; }
          100% { transform: translate(-55px, -100px) scale(0.2); opacity: 0; }
        }
        @keyframes firework5 {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          50% { transform: translate(70px, -70px) scale(1); opacity: 1; }
          100% { transform: translate(90px, -90px) scale(0.3); opacity: 0; }
        }
        @keyframes firework6 {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          50% { transform: translate(-20px, -120px) scale(1.2); opacity: 1; }
          100% { transform: translate(-25px, -150px) scale(0.2); opacity: 0; }
        }
        @keyframes firework7 {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          50% { transform: translate(50px, -60px) scale(1.3); opacity: 1; }
          100% { transform: translate(65px, -80px) scale(0.3); opacity: 0; }
        }
        @keyframes firework8 {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          50% { transform: translate(-60px, -100px) scale(1.1); opacity: 1; }
          100% { transform: translate(-75px, -130px) scale(0.2); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes bannerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes questionnairePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,203,31,0.4); }
          50% { box-shadow: 0 0 20px 8px rgba(255,203,31,0.2); }
        }
        .celebration-banner {
          position: relative;
          border-radius: 16px;
          padding: 28px 20px;
          margin-bottom: 20px;
          text-align: center;
          overflow: hidden;
          animation: bannerPulse 4s ease-in-out infinite;
        }
        .celebration-banner .shimmer-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: shimmer 2.5s linear infinite;
        }
        .firework {
          position: absolute;
          font-size: 20px;
          pointer-events: none;
        }
        .tile-hover:hover {
          transform: scale(1.04) !important;
          box-shadow: 0 8px 25px rgba(0,0,0,0.2) !important;
        }
      `}</style>

      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/images/domes-logo.png" alt="Domes" style={{ width: 52, objectFit: 'contain' }} />
            <div>
              <h1 style={{ fontFamily: 'Hanley Script, Cooper Light, serif', color: '#3a7b3c', fontSize: '22px', fontWeight: 'normal', margin: '0 0 2px' }}>Welcome, {displayName}!</h1>
              <p style={{ color: '#888', fontSize: '13px', margin: 0, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>{role}{type ? ` · ${type}` : ''}</p>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ backgroundColor: 'white', color: '#666', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Sign Out</button>
        </div>

        {/* Celebrations Banner */}
        {celebrations.map((c, i) => (
          <div key={i} className="celebration-banner" style={{
            background: c.type === 'birthday'
              ? 'linear-gradient(135deg, #ffcb1f 0%, #f37029 30%, #ff6b9d 60%, #a87fd4 100%)'
              : 'linear-gradient(135deg, #3a7b3c 0%, #387dac 30%, #7b5ea7 60%, #f37029 100%)',
          }}>
            <div className="shimmer-overlay" />
            <span className="firework" style={{ bottom: '50%', left: '10%', animation: 'firework1 1.8s ease-out infinite' }}>{'✨'}</span>
            <span className="firework" style={{ bottom: '50%', left: '15%', animation: 'firework2 2.1s ease-out infinite 0.2s' }}>{'\u{1F387}'}</span>
            <span className="firework" style={{ bottom: '50%', left: '25%', animation: 'firework3 1.6s ease-out infinite 0.5s' }}>{'⭐'}</span>
            <span className="firework" style={{ bottom: '50%', left: '35%', animation: 'firework4 2.3s ease-out infinite 0.3s' }}>{'\u{1F31F}'}</span>
            <span className="firework" style={{ bottom: '50%', right: '10%', animation: 'firework5 2s ease-out infinite 0.4s' }}>{'\u{1F386}'}</span>
            <span className="firework" style={{ bottom: '50%', right: '20%', animation: 'firework6 1.7s ease-out infinite 0.1s' }}>{'✨'}</span>
            <span className="firework" style={{ bottom: '50%', right: '30%', animation: 'firework7 2.2s ease-out infinite 0.6s' }}>{'\u{1F387}'}</span>
            <span className="firework" style={{ bottom: '50%', right: '40%', animation: 'firework8 1.9s ease-out infinite 0.7s' }}>{'⭐'}</span>
            <span className="firework" style={{ bottom: '30%', left: '5%', animation: 'firework3 2.4s ease-out infinite 0.8s' }}>{'\u{1F389}'}</span>
            <span className="firework" style={{ bottom: '30%', right: '5%', animation: 'firework1 2.6s ease-out infinite 0.9s' }}>{'\u{1F38A}'}</span>
            <span className="firework" style={{ bottom: '40%', left: '45%', animation: 'firework6 2s ease-out infinite 0.15s' }}>{'\u{1F4AB}'}</span>
            <span className="firework" style={{ bottom: '60%', left: '50%', animation: 'firework4 1.5s ease-out infinite 0.35s' }}>{'✨'}</span>

            <p style={{ margin: 0, position: 'relative', zIndex: 1, fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
              {c.type === 'birthday' ? '\u{1F382}' : '\u{1F389}'}{' '}
              {c.type === 'birthday'
                ? `Happy Birthday, ${c.name}!`
                : `Happy ${c.label} Anniversary, ${c.name}!`
              }
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.9)', position: 'relative', zIndex: 1 }}>
              {c.type === 'birthday' ? 'Celebrate with the Domes fam today!' : 'Thank you for being part of the Domes family!'}
            </p>
          </div>
        ))}

        {/* Points Card */}
        <div style={{ background: 'linear-gradient(135deg, #3a7b3c 0%, #2d5e2f 100%)', borderRadius: 12, padding: 20, marginBottom: 20, color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontFamily: 'Cooper Black, serif', fontSize: 18 }}>{'\u{1F3C6}'} My Points</h3>
            <span style={{ fontSize: 12, opacity: 0.8 }}>This week: +{weekPoints}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 36 }}>{totalPoints}</span>
            <span style={{ fontSize: 14, opacity: 0.8 }}>points</span>
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
              <span>Next: {tierLabel}</span>
              <span>{nextTier ? totalPoints + '/' + nextTier : '⭐'}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
              <div style={{ background: '#ffcb1f', height: '100%', borderRadius: 20, width: progress + '%', transition: 'width 0.5s' }}></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 11, opacity: 0.7 }}>
            <span>500 = $5</span>
            <span>{'·'}</span>
            <span>1,000 = $15</span>
            <span>{'·'}</span>
            <span>1,500 = $25</span>
          </div>
          {(role === 'Admin') && (
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <a href="/admin/points" style={{ color: '#ffcb1f', fontSize: 12, textDecoration: 'none', marginRight: 12 }}>Points Report {'→'}</a>
              <a href="/admin/stats-overview" style={{ color: '#ffcb1f', fontSize: 12, textDecoration: 'none' }}>Team Stats {'→'}</a>
            </div>
          )}
        </div>

        {/* Get to Know You — only shown if not yet filled out */}
        {!hasQuestionnaire && (
          <button
            className="tile-hover"
            onClick={() => router.push('/questionnaire')}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              width: '100%',
              background: 'linear-gradient(135deg, #ffcb1f 0%, #f37029 50%, #ff6b9d 100%)',
              border: 'none',
              borderRadius: '16px',
              padding: '20px 24px',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: 20,
              boxShadow: '0 4px 15px rgba(243,112,41,0.25)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              animation: 'questionnairePulse 3s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: '44px', animation: 'float 2s ease-in-out infinite' }}>{'\u{1F4DD}'}</span>
            <div>
              <p style={{ margin: 0, fontFamily: 'Cooper Black, serif', fontSize: 18, color: '#fff', textShadow: '1px 1px 2px rgba(0,0,0,0.15)' }}>
                Get to Know You
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
                Fill in once to add your fun facts to team trivia!
              </p>
            </div>
          </button>
        )}

        {/* Nav Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {navItems.map((item, idx) => (
            <button
              key={item.href}
              className="tile-hover"
              onClick={() => router.push(item.href)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: tileColors[idx],
                border: 'none',
                borderRadius: tileRadii[idx],
                padding: '24px 16px',
                cursor: 'pointer',
                textAlign: 'center',
                width: '100%',
                minHeight: '140px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <span style={{
                fontSize: '40px',
                marginBottom: '10px',
                display: 'block',
                animation: `float 3s ease-in-out infinite ${idx * 0.3}s`,
              }}>{item.emoji}</span>
              <p style={{
                margin: 0,
                fontFamily: 'TAY Bone Quixote, Cooper Black, serif',
                fontSize: '15px',
                color: isDarkText(idx) ? '#543c2d' : '#fff',
                lineHeight: 1.2,
              }}>{item.label}</p>
              <p style={{
                margin: '4px 0 0',
                fontSize: '11px',
                color: isDarkText(idx) ? 'rgba(84,60,45,0.7)' : 'rgba(255,255,255,0.75)',
                fontFamily: 'Cooper Light, system-ui, sans-serif',
                lineHeight: 1.3,
              }}>{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
