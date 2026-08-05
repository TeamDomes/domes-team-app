const fs = require('fs');
const f = 'C:\\Users\\JenniferDundas\\Documents\\domes-team-app\\app\\dashboard\\page.tsx';
const code = `'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
      }
      setLoading(false)
    }
    loadUser()
  }, [router])

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
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}><p style={{ color: '#3a7b3c', fontSize: '18px' }}>Loading...</p></div>)

  const displayName = teamMember ? teamMember.full_name : userEmail
  const role = teamMember?.role || 'Admin'
  const type = teamMember?.type || ''
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ color: '#3a7b3c', fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px' }}>Welcome, {displayName}!</h1>
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>{role}{type ? \` \\u00B7 \${type}\` : ''}</p>
          </div>
          <button onClick={handleSignOut} style={{ backgroundColor: 'white', color: '#666', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>Sign Out</button>
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
            {answered && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: isCorrect ? 'rgba(58,123,60,0.3)' : 'rgba(211,47,47,0.3)' }}>
                <p style={{ margin: 0, fontSize: 14 }}>
                  {alreadyAnswered ? 'You already answered today! ' : ''}{isCorrect ? 'Correct!' : 'Not quite!'} {triviaQ.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gap: '12px' }}>
          {navItems.map(item => (
            <button key={item.href} onClick={() => router.push(item.href)} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'white', border: 'none', borderRadius: '12px', padding: '20px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <span style={{ fontSize: '32px' }}>{item.emoji}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#3a7b3c' }}>{item.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#888' }}>{item.desc}</p>
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