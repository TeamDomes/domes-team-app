'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { awardPoints, POINTS } from '@/lib/points'

export default function GrowerQuizPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [brand, setBrand] = useState<any>(null)
  const [quiz, setQuiz] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

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

    // Get this week's featured brand
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    const weekStart = monday.toISOString().split('T')[0]

    const { data: featured } = await supabase
      .from('brands')
      .select('*')
      .eq('featured_week', weekStart)
      .limit(1)

    if (!featured || featured.length === 0) {
      setLoading(false)
      return
    }

    const b = featured[0]
    setBrand(b)

    // Check if quiz questions exist for THIS brand
    const { data: existing } = await supabase
      .from('trivia_questions')
      .select('*')
      .eq('category', 'brand')

    // Check if ALL existing questions are for the current brand
    const matchesBrand = existing && existing.length > 0 && existing.every((q: any) => q.question?.includes(b.name))

    if (!existing || existing.length === 0 || !matchesBrand) {
      // Generate new quiz questions for current brand
      setGenerating(true)
      await generateQuiz(b)
      setGenerating(false)
      // Re-fetch
      const { data: freshQuiz } = await supabase
        .from('trivia_questions')
        .select('*')
        .eq('category', 'brand')
      setQuiz(freshQuiz || [])
      await checkExistingAnswers(freshQuiz || [], me?.id)
    } else {
      setQuiz(existing)
      await checkExistingAnswers(existing, me?.id)
    }

    setLoading(false)
  }

  async function checkExistingAnswers(questions: any[], memberId: string | undefined) {
    if (!memberId || questions.length === 0) return
    const qIds = questions.map((q: any) => q.id)
    const { data: prev } = await supabase
      .from('trivia_answers')
      .select('*')
      .in('question_id', qIds)
      .eq('team_member_id', memberId)
    if (prev && prev.length > 0) {
      const ansMap: Record<string, string> = {}
      let correct = 0
      prev.forEach((a: any) => {
        ansMap[a.question_id] = a.answer
        if (a.is_correct) correct++
      })
      setAnswers(ansMap)
      setScore(correct)
      setSubmitted(true)
    }
  }

  async function generateQuiz(b: any) {
    if (!b.talking_points || b.talking_points.length === 0) return

    const wrongLocations = ['Denver, CO', 'Portland, ME', 'Austin, TX', 'Seattle, WA', 'Miami, FL', 'Chicago, IL', 'Boston, MA', 'Trenton, NJ']
    const wrongProducts = ['Rolling papers only', 'CBD pet treats only', 'Cannabis-infused candles', 'Hemp clothing', 'THC patches only']
    const wrongKnown = ['Budget-priced accessories', 'Cannabis-infused skincare', 'Fast food partnerships', 'Celebrity endorsements only', 'Wholesale only']

    // Delete any old brand quiz questions
    await supabase.from('trivia_questions').delete().eq('category', 'brand')

    if (b.location) {
      const shuffled = wrongLocations.filter(l => l !== b.location).sort(() => Math.random() - 0.5)
      await supabase.from('trivia_questions').insert({
        question: 'Where is ' + b.name + ' located?',
        option_a: b.location,
        option_b: shuffled[0],
        option_c: shuffled[1],
        correct_answer: 'A',
        explanation: b.name + ' is based in ' + b.location + '.',
        category: 'brand'
      })
    }

    if (b.known_for) {
      const shuffled = wrongKnown.sort(() => Math.random() - 0.5)
      await supabase.from('trivia_questions').insert({
        question: 'What is ' + b.name + ' best known for?',
        option_a: b.known_for,
        option_b: shuffled[0],
        option_c: shuffled[1],
        correct_answer: 'A',
        explanation: b.name + ' is known for: ' + b.known_for,
        category: 'brand'
      })
    }

    if (b.product_types) {
      const shuffled = wrongProducts.sort(() => Math.random() - 0.5)
      await supabase.from('trivia_questions').insert({
        question: 'What type of products does ' + b.name + ' make?',
        option_a: b.product_types,
        option_b: shuffled[0],
        option_c: shuffled[1],
        correct_answer: 'A',
        explanation: b.name + ' produces: ' + b.product_types,
        category: 'brand'
      })
    }
  }

  async function submitQuiz() {
    if (!currentUser) { alert('You must be logged in.'); return }
    let correct = 0
    for (const q of quiz) {
      const userAns = answers[q.id]
      if (!userAns) continue
      const isCorrect = userAns === q.correct_answer
      if (isCorrect) correct++
      await supabase.from('trivia_answers').insert({
        question_id: q.id,
        team_member_id: currentUser.id,
        answer: userAns,
        is_correct: isCorrect,
        answered_date: new Date().toISOString().split('T')[0]
      })
    }
    setScore(correct)
    setSubmitted(true)
    const pts = correct === quiz.length ? POINTS.QUIZ_PERFECT : POINTS.QUIZ_PARTIAL
    await awardPoints(currentUser.id, pts, correct === quiz.length ? 'quiz_perfect' : 'quiz_partial', brand?.id || 'unknown')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#543c2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#f4e6b4' }}>
        {generating ? 'Generating quiz...' : 'Loading...'}
      </p>
    </div>
  )

  if (!brand) return (
    <div style={{ minHeight: '100vh', background: '#543c2d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 15 }}>
      <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#f4e6b4' }}>No brand featured this week.</p>
      <a href="/grower" style={{ color: '#ffcb1f', fontFamily: 'Cooper Light, Georgia, serif' }}>{'←'} Back to Grower of the Week</a>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#543c2d', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <a href="/grower" style={{ color: '#ffcb1f', textDecoration: 'none', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14 }}>
          {'←'} Back to {brand.name}
        </a>

        <div style={{ textAlign: 'center', marginTop: 15, marginBottom: 25 }}>
          <h1 style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 26, color: '#ffcb1f', margin: 0 }}>
            {'🧠'} {brand.name} Quiz
          </h1>
          <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#f4e6b4', marginTop: 5 }}>
            Test what you learned!
          </p>
        </div>

        {submitted && (
          <div style={{
            background: score === quiz.length ? '#3a7b3c' : '#f37029',
            borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20
          }}>
            <p style={{
              fontFamily: 'Cooper Black, Georgia, serif', fontSize: 24, color: '#fff', margin: 0
            }}>
              {score === quiz.length ? '🌟 Perfect Score!' : score + '/' + quiz.length + ' Correct'}
            </p>
            <p style={{
              fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#fff', marginTop: 8
            }}>
              {score === quiz.length ? 'You really know your stuff!' : 'Review the brand page and try again next week!'}
            </p>
          </div>
        )}

        {quiz.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 20, textAlign: 'center'
          }}>
            <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 16, color: '#f4e6b4' }}>
              No quiz available for this brand yet. Check back later!
            </p>
          </div>
        ) : (
          <>
            {quiz.map((q: any, qi: number) => (
              <div key={q.id} style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: 12,
                padding: 20, marginBottom: 15
              }}>
                <p style={{
                  fontFamily: 'Cooper Black, Georgia, serif', fontSize: 16, color: '#f4e6b4',
                  margin: '0 0 12px'
                }}>
                  {qi + 1}. {q.question}
                </p>
                {['A', 'B', 'C'].map(opt => {
                  const optKey = 'option_' + opt.toLowerCase()
                  const optVal = q[optKey]
                  if (!optVal) return null
                  const isSelected = answers[q.id] === opt
                  const isCorrect = q.correct_answer === opt
                  let bg = 'rgba(255,255,255,0.06)'
                  let border = '2px solid rgba(255,255,255,0.15)'
                  if (submitted) {
                    if (isCorrect) { bg = 'rgba(58,123,60,0.5)'; border = '2px solid #3a7b3c' }
                    else if (isSelected && !isCorrect) { bg = 'rgba(243,112,41,0.5)'; border = '2px solid #f37029' }
                    else { bg = 'rgba(255,255,255,0.03)'; border = '2px solid transparent' }
                  } else if (isSelected) {
                    bg = 'rgba(255,203,31,0.25)'; border = '2px solid #ffcb1f'
                  }
                  return (
                    <button
                      key={opt}
                      onClick={() => { if (!submitted) setAnswers({ ...answers, [q.id]: opt }) }}
                      disabled={submitted}
                      style={{
                        display: 'block', width: '100%', background: bg, border,
                        borderRadius: 10, padding: '12px 15px', marginBottom: 8,
                        textAlign: 'left', cursor: submitted ? 'default' : 'pointer',
                        fontFamily: 'Cooper Light, Georgia, serif', fontSize: 15,
                        color: '#f4e6b4', transition: 'all 0.2s'
                      }}
                    >
                      <strong style={{ marginRight: 8 }}>{opt}.</strong> {optVal}
                    </button>
                  )
                })}
                {submitted && q.explanation && (
                  <p style={{
                    fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13,
                    color: '#ffcb1f', margin: '10px 0 0', fontStyle: 'italic'
                  }}>
                    {q.explanation}
                  </p>
                )}
              </div>
            ))}

            {!submitted && (
              <button
                onClick={submitQuiz}
                disabled={Object.keys(answers).length < quiz.length}
                style={{
                  background: Object.keys(answers).length < quiz.length ? 'rgba(255,255,255,0.15)' : '#ffcb1f',
                  color: Object.keys(answers).length < quiz.length ? '#999' : '#543c2d',
                  border: 'none', borderRadius: 12,
                  padding: '15px 20px', fontFamily: 'Cooper Black, Georgia, serif',
                  fontSize: 18, cursor: Object.keys(answers).length < quiz.length ? 'default' : 'pointer',
                  width: '100%', marginTop: 5,
                  boxShadow: Object.keys(answers).length < quiz.length ? 'none' : '0 4px 12px rgba(255,203,31,0.4)'
                }}
              >
                Submit Answers
              </button>
            )}

            {submitted && (
              <a
                href="/grower"
                style={{
                  display: 'block', textAlign: 'center', background: '#3a7b3c', color: '#fff',
                  border: 'none', borderRadius: 12, padding: '15px 20px',
                  fontFamily: 'Cooper Black, Georgia, serif', fontSize: 16,
                  textDecoration: 'none', marginTop: 10
                }}
              >
                {'←'} Back to Grower of the Week
              </a>
            )}
          </>
        )}
      </div>
    </div>
  )
}
