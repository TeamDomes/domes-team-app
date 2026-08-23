'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { awardPoints, POINTS } from '@/lib/points'

type QuizQuestion = {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  correct_answer: string
  explanation: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randomizeOptions(correct: string, wrong1: string, wrong2: string) {
  const options = [
    { text: correct, isCorrect: true },
    { text: wrong1, isCorrect: false },
    { text: wrong2, isCorrect: false },
  ]
  const shuffled = shuffle(options)
  const idx = shuffled.findIndex(o => o.isCorrect)
  return {
    option_a: shuffled[0].text,
    option_b: shuffled[1].text,
    option_c: shuffled[2].text,
    correct_answer: idx === 0 ? 'A' : idx === 1 ? 'B' : 'C',
  }
}

function generateQuizFromBrand(brand: any, otherBrands: any[]): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  const otherTPs = otherBrands.flatMap(b => (b.talking_points || []) as string[])
  const otherLocs = otherBrands.map(b => b.location).filter(Boolean)
  const otherKnown = otherBrands.map(b => b.known_for).filter(Boolean)
  const otherProds = otherBrands.map(b => b.product_types).filter(Boolean)

  const fallbackFacts = [
    'They only sell products online through a subscription model',
    'They are a subsidiary of a major tobacco company',
    'They exclusively make CBD-only products with no THC',
    'They only operate in California dispensaries',
    'They were founded as a hemp clothing company',
  ]
  const fallbackLocs = ['Denver, CO', 'Portland, ME', 'Austin, TX', 'Seattle, WA', 'Miami, FL', 'Chicago, IL']
  const fallbackKnown = ['Budget-priced accessories', 'Cannabis-infused skincare', 'Celebrity endorsements', 'Wholesale distribution only']
  const fallbackProds = ['Rolling papers only', 'CBD pet treats only', 'Cannabis-infused candles', 'Hemp clothing']

  // Talking point questions
  if (brand.talking_points && brand.talking_points.length > 0) {
    const tps = shuffle(brand.talking_points as string[])
    const wrongPool = otherTPs.length >= 2 ? shuffle(otherTPs) : shuffle(fallbackFacts)

    for (let i = 0; i < Math.min(tps.length, 3); i++) {
      const wrongs = wrongPool.filter(w => w !== tps[i])
      if (wrongs.length < 2) continue
      const opts = randomizeOptions(tps[i], wrongs[i % wrongs.length], wrongs[(i + 1) % wrongs.length])
      questions.push({
        id: 'tp-' + i,
        question: 'Which of the following is true about ' + brand.name + '?',
        ...opts,
        explanation: 'This is one of ' + brand.name + "'s key talking points.",
      })
    }
  }

  // Location question
  if (brand.location) {
    const wrongs = (otherLocs.length >= 2 ? shuffle(otherLocs.filter(l => l !== brand.location)) : shuffle(fallbackLocs.filter(l => l !== brand.location)))
    if (wrongs.length >= 2) {
      const opts = randomizeOptions(brand.location, wrongs[0], wrongs[1])
      questions.push({
        id: 'loc',
        question: 'Where is ' + brand.name + ' located?',
        ...opts,
        explanation: brand.name + ' is based in ' + brand.location + '.',
      })
    }
  }

  // Known-for question
  if (brand.known_for) {
    const wrongs = (otherKnown.length >= 2 ? shuffle(otherKnown.filter(k => k !== brand.known_for)) : shuffle(fallbackKnown))
    if (wrongs.length >= 2) {
      const opts = randomizeOptions(brand.known_for, wrongs[0], wrongs[1])
      questions.push({
        id: 'known',
        question: 'What is ' + brand.name + ' best known for?',
        ...opts,
        explanation: brand.name + ' is known for: ' + brand.known_for,
      })
    }
  }

  // Product types question
  if (brand.product_types) {
    const wrongs = (otherProds.length >= 2 ? shuffle(otherProds.filter(p => p !== brand.product_types)) : shuffle(fallbackProds))
    if (wrongs.length >= 2) {
      const opts = randomizeOptions(brand.product_types, wrongs[0], wrongs[1])
      questions.push({
        id: 'prods',
        question: 'What type of products does ' + brand.name + ' make?',
        ...opts,
        explanation: brand.name + ' produces: ' + brand.product_types,
      })
    }
  }

  return questions
}

export default function GrowerQuizPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#543c2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#f4e6b4' }}>Loading...</p>
      </div>
    }>
      <QuizContent />
    </Suspense>
  )
}

function QuizContent() {
  const searchParams = useSearchParams()
  const brandId = searchParams.get('brand')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [brand, setBrand] = useState<any>(null)
  const [quiz, setQuiz] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!brandId) {
      window.location.href = '/grower'
      return
    }
    loadData()
  }, [brandId])

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

    // Load this brand directly
    const { data: brandData } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single()

    if (!brandData) {
      setLoading(false)
      return
    }

    setBrand(brandData)

    // Load other brands for wrong-answer material
    const { data: others } = await supabase
      .from('brands')
      .select('id, name, location, known_for, product_types, talking_points')
      .eq('is_active', true)
      .neq('id', brandId!)

    // Generate quiz in memory — no database writes needed
    const questions = generateQuizFromBrand(brandData, others || [])
    setQuiz(questions)
    setLoading(false)
  }

  async function submitQuiz() {
    if (!currentUser) { alert('You must be logged in.'); return }
    let correct = 0
    for (const q of quiz) {
      const userAns = answers[q.id]
      if (!userAns) continue
      if (userAns === q.correct_answer) correct++
    }
    setScore(correct)
    setSubmitted(true)
    const pts = correct === quiz.length ? POINTS.QUIZ_PERFECT : POINTS.QUIZ_PARTIAL
    await awardPoints(currentUser.id, pts, correct === quiz.length ? 'quiz_perfect' : 'quiz_partial', brand?.id || 'unknown')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#543c2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#f4e6b4' }}>
        Loading quiz...
      </p>
    </div>
  )

  if (!brand) return (
    <div style={{ minHeight: '100vh', background: '#543c2d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 15 }}>
      <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#f4e6b4' }}>Brand not found.</p>
      <a href="/grower" style={{ color: '#ffcb1f', fontFamily: 'Cooper Light, Georgia, serif' }}>{'←'} Back to Partner Spotlight</a>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#543c2d', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ textAlign: 'right', marginBottom: 10 }}>
          <a href="/dashboard" style={{
            background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
            padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333',
            textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block',
          }}>{'←'} Dashboard</a>
        </div>

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
            {quiz.map((q, qi) => (
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
                  const optKey = 'option_' + opt.toLowerCase() as keyof QuizQuestion
                  const optVal = q[optKey] as string
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
                {'←'} Back to Partner Spotlight
              </a>
            )}
          </>
        )}
      </div>
    </div>
  )
}
