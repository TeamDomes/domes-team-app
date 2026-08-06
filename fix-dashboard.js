const fs = require('fs');
const f = 'C:\\Users\\JenniferDundas\\Documents\\domes-team-app\\app\\dashboard\\page.tsx';
const code = `'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { awardPoints, POINTS } from '@/lib/points'

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState('')
  const [teamMember, setTeamMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [triviaQ, setTriviaQ] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [alreadyAnswered, setAlreadyAnswered] = useState(false)
  const [triviaStats, setTriviaStats] = useState({ correct: 0, total: 0 })
  const [totalPoints, setTotalPoints] = useState(0)
  const [weekPoints, setWeekPoints] = useState(0)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')
      const { data: member } = await supabase.from('team').select('*').eq('email', user.email).single()
      if (member) {
        setTeamMember(member)
        if (!member.auth_user_id) { await supabase.from('team').update({ auth_user_id: user.id }).eq('id', member.id) }
        await loadTrivia(member.id)
        await loadPoints(member.id)
      }
      setLoading(false)
    }
    loadUser()
  }, [router])

  async function loadPoints(memberId) {
    const { data: allPts } = await supabase.from('points_log').select('points, created_at').eq('team_member_id', memberId)
    if (!allPts) return
    const total = allPts.reduce((sum, p) => sum + p.points, 0)
    setTotalPoints(total)
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1)
    monday.setHours(0, 0, 0, 0)
    const week = allPts.filter(p => new Date(p.created_at) >= monday).reduce((sum, p) => sum + p.points, 0)
    setWeekPoints(week)
  }

  async function loadTrivia(memberId) {
    const today = new Date().toISOString().split('T')[0]
    const { data: allQs } = await supabase.from('trivia_questions').select('*')
    if (!allQs || allQs.length === 0) return
    const { data: myAnswers } = await supabase.from('trivia_answers').select('*').eq('team_member_id', memberId)
    const answeredIds = new Set((myAnswers || []).map(a => a.question_id))
    const stats = {
      correct: (myAnswers || []).filter(a => a.is_correct).length,
      total: (myAnswers || []).length
    }
    setTriviaStats(stats)
    const todayAnswer = (myAnswers || []).find(a => a.answered_date === today)
    if (todayAnswer) {
      const q = allQs.find(q => q.id === todayAnswer.question_id)
      if (q) {
        setTriviaQ(q)
        setSelectedAnswer(todayAnswer.answer)
        setIsCorrect(todayAnswer.is_correct)
        setAnswered(true)
        setAlreadyAnswered(true)
      }
      return
    }
    const unanswered = allQs.filter(q => !answeredIds.has(q.id))
    const pool = unanswered.length > 0 ? unanswered : allQs
    const dayIndex = Math.floor(Date.now() / 86400000) % pool.length
    setTriviaQ(pool[dayIndex])
  }

  async function handleAnswer(letter) {
    if (answered || !triviaQ || !teamMember) return
    const correct = letter === triviaQ.correct_answer
    setSelectedAnswer(letter)
    setIsCorrect(correct)
    setAnswered(true)
    await supabase.from('trivia_answers').insert({
      question_id: triviaQ.id,
      team_member_id: teamMember.id,
      answer: letter,
      is_correct: correct,
      answered_date: new Date().toISOString().split('T')[0],
    })
    setTriviaStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }))
    await awardPoints(teamMember.id, correct ? POINTS.TRIVIA_CORRECT : POINTS.TRIVIA_WRONG, correct ? 'trivia_correct' : 'trivia_wrong', triviaQ.id)
    setWeekPoints(prev => prev + (correct ? POINTS.TRIVIA_CORRECT : POINTS.TRIVIA_WRONG))
    setTotalPoints(prev => prev + (correct ? POINTS.TRIVIA_CORRECT : POINTS.TRIVIA_WRONG))
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
    { label: 'BINGO', href: '/bingo', emoji: '\\uD83C\\uDFAF', desc: 'Check your BINGO card' },
    { label: 'Appreciations', href: '/appreciations', emoji: '\\uD83D\\uDC9A', desc: 'Recognize your teammates' },
    { label: 'Pets', href: '/pets', emoji: '\\uD83D\\uDC3E', desc: 'Share photos of your pets' },
    { label: 'Spotted', href: '/spotted', emoji: '\\uD83D\\uDC40', desc: 'Spotted any cool products in the wild?' },
    { label: 'Weekend Recap', href: '/recap', emoji: '\\uD83C\\uDF89', desc: 'Weekly highlights and wins' },
    { label: 'Grower of the Week', href: '/grower', emoji: '\\uD83C\\uDF31', desc: 'Learn about the brands we carry' },
    { label: 'Get to Know You', href: '/questionnaire', emoji: '\\uD83E\\uDD14', desc: 'Fill out your fun facts for team trivia' },
    { label: 'Wall of Love', href: '/wall-of-love', emoji: '\\u2B50', desc: 'Google reviews from happy customers' },
  ]

  const optionStyle = (letter) => {
    const base = {
      width: '100%', padding: '10px 14px', border: '2px solid #ddd', borderRadius: 8,
      background: 'white', cursor: answered ? 'default' : 'pointer', textAlign: 'left',
      fontSize: 14, display: 'flex', gap: 8, alignItems: 'center',
    }
    if (!answered) return base
    if (letter === triviaQ.correct_answer) return { ...base, border: '2px solid #3a7b3c', background: '#e8f5e9' }
    if (letter === selectedAnswer && !isCorrect) return { ...base, border: '2px solid #d32f2f', background: '#ffebee' }
    return { ...base, opacity: 0.5 }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/images/domes-logo.png" alt="Domes" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <h1 style={{ fontFamily: 'Hanley Script, Cooper Light, serif', color: '#3a7b3c', fontSize: '22px', fontWeight: 'normal', margin: '0 0 2px' }}>Welcome, {displayName}!</h1>
              <p style={{ color: '#888', fontSize: '13px', margin: 0, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>{role}{type ? \` \\u00B7 \${type}\` : ''}</p>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ backgroundColor: 'white', color: '#666', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Sign Out</button>
        </div>

        {/* Points Card */}
        <div style={{ background: 'linear-gradient(135deg, #3a7b3c 0%, #2d5e2f 100%)', borderRadius: 12, padding: 20, marginBottom: 20, color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontFamily: 'Cooper Black, serif', fontSize: 18 }}>{'🏆'} My Points</h3>
            <span style={{ fontSize: 12, opacity: 0.8 }}>This week: +{weekPoints}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 36 }}>{totalPoints}</span>
            <span style={{ fontSize: 14, opacity: 0.8 }}>points</span>
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
              <span>Next: {tierLabel}</span>
              <span>{nextTier ? totalPoints + '/' + nextTier : '\\u2B50'}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
              <div style={{ background: '#ffcb1f', height: '100%', borderRadius: 20, width: progress + '%', transition: 'width 0.5s' }}></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 11, opacity: 0.7 }}>
            <span>500 = $5</span>
            <span>{'\\u00B7'}</span>
            <span>1,000 = $15</span>
            <span>{'\\u00B7'}</span>
            <span>1,500 = $25</span>
          </div>
          {(role === 'Admin') && (
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <a href="/admin/points" style={{ color: '#ffcb1f', fontSize: 12, textDecoration: 'none' }}>View Weekly Report {'\\u2192'}</a>
            </div>
          )}
        </div>

        {triviaQ && (
          <div style={{ background: '#543c2d', borderRadius: 12, padding: 20, marginBottom: 24, color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontFamily: 'Cooper Black, serif', fontSize: 18 }}>Trivia of the Day</h3>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{triviaStats.correct}/{triviaStats.total} correct</span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.4 }}>{triviaQ.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['A', 'B', 'C', ...(triviaQ.option_d ? ['D'] : [])].map(letter => (
                <button key={letter} onClick={() => handleAnswer(letter)} disabled={answered} style={optionStyle(letter)}>
                  <span style={{ fontWeight: 'bold', color: '#543c2d' }}>{letter}.</span>
                  <span style={{ color: '#333' }}>{triviaQ[\`option_\${letter.toLowerCase()}\`]}</span>
                </button>
              ))}
            </div>
            {answered && !alreadyAnswered && (
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: '#ffcb1f' }}>+{isCorrect ? POINTS.TRIVIA_CORRECT : POINTS.TRIVIA_WRONG} points!</span>
              </div>
            )}
            {answered && (
              <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: isCorrect ? 'rgba(58,123,60,0.3)' : 'rgba(211,47,47,0.3)' }}>
                <p style={{ margin: 0, fontSize: 14 }}>
                  {alreadyAnswered ? 'You already answered today! ' : ''}{isCorrect ? 'Correct!' : 'Not quite!'} {triviaQ.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gap: '12px' }}>
          {navItems.map(item => (
            <button key={item.href} onClick={() => router.push(item.href)} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'white', border: 'none', borderRadius: '12px', padding: '20px', cursor: 'pointer', textAlign: 'left', width: '100%', boxShadow: '0 2px 8px rgba(84,60,45,0.06)' }}>
              <span style={{ fontSize: '32px' }}>{item.emoji}</span>
              <div>
                <p style={{ margin: 0, fontFamily: 'TAY Bone Quixote, Cooper Black, serif', fontSize: '17px', color: '#3a7b3c' }}>{item.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#888', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}`;
fs.writeFileSync(f, code);
console.log('Done!');
