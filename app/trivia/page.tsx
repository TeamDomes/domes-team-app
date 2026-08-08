'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { awardPoints, POINTS } from '@/lib/points'
import MoodWrapper from '@/components/MoodWrapper'

export default function TriviaPage() {
  const [teamMember, setTeamMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [triviaQ, setTriviaQ] = useState<any>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [alreadyAnswered, setAlreadyAnswered] = useState(false)
  const [triviaStats, setTriviaStats] = useState({ correct: 0, total: 0 })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: member } = await supabase.from('team').select('*').eq('email', user.email).single()
    if (member) {
      setTeamMember(member)
      await loadTrivia(member.id)
    }
    setLoading(false)
  }

  async function loadTrivia(memberId: string) {
    const today = new Date().toISOString().split('T')[0]
    const { data: allQs } = await supabase.from('trivia_questions').select('*')
    if (!allQs || allQs.length === 0) return
    const { data: myAnswers } = await supabase.from('trivia_answers').select('*').eq('team_member_id', memberId)
    const answeredIds = new Set((myAnswers || []).map((a: any) => a.question_id))
    const stats = {
      correct: (myAnswers || []).filter((a: any) => a.is_correct).length,
      total: (myAnswers || []).length
    }
    setTriviaStats(stats)
    const todayAnswer = (myAnswers || []).find((a: any) => a.answered_date === today)
    if (todayAnswer) {
      const q = allQs.find((q: any) => q.id === todayAnswer.question_id)
      if (q) {
        setTriviaQ(q)
        setSelectedAnswer(todayAnswer.answer)
        setIsCorrect(todayAnswer.is_correct)
        setAnswered(true)
        setAlreadyAnswered(true)
      }
      return
    }
    const recent = (myAnswers || []).sort((a: any, b: any) => b.answered_date.localeCompare(a.answered_date)).slice(0, 5)
    const recentCorrect = recent.filter((a: any) => a.is_correct).length
    let difficulty = 'Easy'
    if (recentCorrect >= 4) difficulty = 'Hard'
    else if (recentCorrect >= 2) difficulty = 'Medium'

    const unanswered = allQs.filter((q: any) => !answeredIds.has(q.id))
    const pool = unanswered.length > 0 ? unanswered : allQs
    const diffPool = pool.filter((q: any) => q.difficulty === difficulty)
    const finalPool = diffPool.length > 0 ? diffPool : pool
    const dayIndex = Math.floor(Date.now() / 86400000) % finalPool.length
    setTriviaQ(finalPool[dayIndex])
  }

  async function handleAnswer(letter: string) {
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
  }

  if (loading) return (
    <MoodWrapper><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#3a7b3c', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div></MoodWrapper>
  )

  const optionStyle = (letter: string) => {
    const base: any = {
      width: '100%', padding: '14px 18px', border: '2px solid #ddd', borderRadius: 10,
      background: 'white', cursor: answered ? 'default' : 'pointer', textAlign: 'left' as const,
      fontSize: 16, display: 'flex', gap: 10, alignItems: 'center',
      fontFamily: 'Cooper Light, system-ui, sans-serif',
      transition: 'all 0.15s',
    }
    if (!answered) return base
    if (letter === triviaQ.correct_answer) return { ...base, border: '2px solid #3a7b3c', background: '#e8f5e9' }
    if (letter === selectedAnswer && !isCorrect) return { ...base, border: '2px solid #d32f2f', background: '#ffebee' }
    return { ...base, opacity: 0.5 }
  }

  return (
    <MoodWrapper><div style={{ fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>{'←'} Dashboard</a>
          <span style={{ fontSize: 12, color: '#888' }}>{triviaStats.correct}/{triviaStats.total} correct all time</span>
        </div>

        <div style={{ background: '#543c2d', borderRadius: 16, padding: 28, color: 'white', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Cooper Black, serif', fontSize: 26, margin: '0 0 4px' }}>
            {'\u{1F9E0}'} Trivia of the Day
          </h1>
          <p style={{ fontSize: 13, opacity: 0.6, margin: '0 0 24px' }}>
            {triviaQ?.difficulty ? `Difficulty: ${triviaQ.difficulty}` : ''}
          </p>

          {triviaQ ? (
            <>
              <p style={{ margin: '0 0 20px', fontSize: 18, lineHeight: 1.5, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>
                {triviaQ.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['A', 'B', 'C', ...(triviaQ.option_d ? ['D'] : [])].map(letter => (
                  <button key={letter} onClick={() => handleAnswer(letter)} disabled={answered} style={optionStyle(letter)}>
                    <span style={{ fontWeight: 'bold', color: '#543c2d', minWidth: 20 }}>{letter}.</span>
                    <span style={{ color: '#333' }}>{triviaQ[`option_${letter.toLowerCase()}`]}</span>
                  </button>
                ))}
              </div>

              {answered && !alreadyAnswered && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <span style={{ fontSize: 16, color: '#ffcb1f', fontFamily: 'Cooper Black, serif' }}>
                    +{isCorrect ? POINTS.TRIVIA_CORRECT : POINTS.TRIVIA_WRONG} points!
                  </span>
                </div>
              )}

              {answered && (
                <div style={{
                  marginTop: 16, padding: 16, borderRadius: 12,
                  background: isCorrect ? 'rgba(58,123,60,0.3)' : 'rgba(211,47,47,0.3)',
                }}>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
                    {alreadyAnswered ? 'You already answered today! ' : ''}
                    {isCorrect ? 'Correct! ' : 'Not quite! '}
                    {triviaQ.explanation}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: 16, opacity: 0.7 }}>No trivia available today. Check back soon!</p>
          )}
        </div>
      </div>
    </div></MoodWrapper>
  )
}
