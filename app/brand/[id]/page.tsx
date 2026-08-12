'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MoodWrapper from '@/components/MoodWrapper'

export default function BrandPage() {
  const { id } = useParams()
  const router = useRouter()
  const [brand, setBrand] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [unavailable, setUnavailable] = useState<any[]>([])
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Load brand
      const { data: brandData } = await supabase
        .from('brands')
        .select('*')
        .eq('id', id)
        .single()

      if (!brandData) { setLoading(false); return }
      setBrand(brandData)

      // Load active products under this brand
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, category')
        .eq('brand', brandData.name)
        .eq('is_active', true)
        .order('category')
        .order('name')
      setProducts(prods || [])

      // Load inactive/unavailable products
      const { data: inactiveProds } = await supabase
        .from('products')
        .select('id, name, category')
        .eq('brand', brandData.name)
        .eq('is_active', false)
        .order('category')
        .order('name')
      setUnavailable(inactiveProds || [])

      // Generate quiz
      generateQuiz(brandData, prods || [])
      setLoading(false)
    }
    load()
  }, [id, router])

  function generateQuiz(b: any, prods: any[]) {
    const questions: any[] = []

    // Q1: Brand location
    if (b.location) {
      const wrongLocations = ['Denver, CO', 'Portland, OR', 'Los Angeles, CA', 'Seattle, WA', 'Austin, TX', 'Miami, FL', 'Chicago, IL', 'Boston, MA']
        .filter(l => l.toLowerCase() !== b.location.toLowerCase())
        .sort(() => Math.random() - 0.5)
      questions.push({
        question: `Where is ${b.name} based?`,
        correct: b.location,
        options: [b.location, wrongLocations[0], wrongLocations[1]].sort(() => Math.random() - 0.5),
      })
    }

    // Q2: Known for
    if (b.known_for) {
      const wrongKnown = ['Budget-priced accessories', 'Cannabis-infused skincare', 'Fast food partnerships', 'Celebrity endorsements only', 'Wholesale distribution only']
        .sort(() => Math.random() - 0.5)
      questions.push({
        question: `What is ${b.name} best known for?`,
        correct: b.known_for,
        options: [b.known_for, wrongKnown[0], wrongKnown[1]].sort(() => Math.random() - 0.5),
      })
    }

    // Q3: Product types
    if (b.product_types) {
      const wrongProducts = ['Rolling papers only', 'CBD pet treats only', 'Cannabis-infused candles', 'Hemp clothing', 'THC patches only']
        .sort(() => Math.random() - 0.5)
      questions.push({
        question: `What type of products does ${b.name} make?`,
        correct: b.product_types,
        options: [b.product_types, wrongProducts[0], wrongProducts[1]].sort(() => Math.random() - 0.5),
      })
    }

    // Q4: How many products do we carry? (if we have product data)
    if (prods.length > 0) {
      const correct = `${prods.length}`
      const wrong1 = `${Math.max(1, prods.length - Math.ceil(Math.random() * 5 + 2))}`
      const wrong2 = `${prods.length + Math.ceil(Math.random() * 5 + 2)}`
      questions.push({
        question: `How many ${b.name} products do we currently carry at Domes?`,
        correct,
        options: [correct, wrong1, wrong2].sort(() => Math.random() - 0.5),
      })
    }

    // Q5: Pick a real product from a list (if enough products)
    if (prods.length >= 2) {
      const realProduct = prods[Math.floor(Math.random() * prods.length)]
      const displayName = realProduct.name.includes('|') ? realProduct.name.split('|').slice(1).join('|').trim() : realProduct.name
      const fakes = [`${b.name} | Dream Cloud Indica`, `${b.name} | Solar Burst Sativa`, `${b.name} | Midnight Reserve OG`]
        .sort(() => Math.random() - 0.5)
      questions.push({
        question: `Which of these is a real ${b.name} product we carry?`,
        correct: displayName,
        options: [displayName, fakes[0].split('|').pop()!.trim(), fakes[1].split('|').pop()!.trim()].sort(() => Math.random() - 0.5),
      })
    }

    setQuiz(questions)
  }

  function handleSubmit() {
    let correct = 0
    quiz.forEach((q, i) => {
      if (answers[i] === q.correct) correct++
    })
    setScore(correct)
    setSubmitted(true)
  }

  if (loading) return (
    <MoodWrapper>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 18, color: '#333' }}>Loading...</p>
      </div>
    </MoodWrapper>
  )

  if (!brand) return (
    <MoodWrapper>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 15 }}>
        <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 18, color: '#333' }}>Brand not found.</p>
        <a href="/dashboard" style={{ color: '#3a7b3c', fontFamily: 'Cooper Light, serif' }}>{'←'} Dashboard</a>
      </div>
    </MoodWrapper>
  )

  // Group products by category
  const categories: Record<string, any[]> = {}
  products.forEach(p => {
    const cat = p.category || 'Other'
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(p)
  })

  return (
    <MoodWrapper>
      <div style={{ fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          <div style={{ textAlign: 'right', marginBottom: 10 }}>
            <a href="/dashboard" style={{
              background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
              padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333',
              textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block',
            }}>{'←'} Dashboard</a>
          </div>

          {/* Brand Header */}
          <div style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: 20,
          }}>
            <div style={{
              background: '#3a7b3c', padding: '25px 20px', textAlign: 'center',
            }}>
              <span style={{
                background: '#f37029', color: '#fff', fontFamily: 'Cooper Black, serif',
                fontSize: 11, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.8,
                textTransform: 'uppercase' as const, display: 'inline-block', marginBottom: 10,
              }}>NEW BRAND</span>
              <h1 style={{
                fontFamily: 'Cooper Black, Georgia, serif', fontSize: 30, color: '#fff', margin: '8px 0 0',
              }}>{'🌿'} {brand.name}</h1>
              {brand.location && (
                <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#f4e6b4', marginTop: 6 }}>
                  {'📍'} {brand.location}
                </p>
              )}
            </div>

            <div style={{ padding: 20 }}>
              {brand.description && (
                <p style={{
                  fontFamily: 'Cooper Light, serif', fontSize: 16, color: '#543c2d',
                  lineHeight: 1.6, marginBottom: 15,
                }}>{brand.description}</p>
              )}

              {brand.known_for && (
                <div style={{ background: '#f4e6b4', borderRadius: 10, padding: 15, marginBottom: 15 }}>
                  <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 14, color: '#3a7b3c', margin: '0 0 5px' }}>Known For</p>
                  <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#543c2d', margin: 0 }}>{brand.known_for}</p>
                </div>
              )}

              {brand.product_types && (
                <div style={{ background: '#f0f7f0', borderRadius: 10, padding: 15, marginBottom: 15 }}>
                  <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 14, color: '#3a7b3c', margin: '0 0 5px' }}>Products</p>
                  <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#543c2d', margin: 0 }}>{brand.product_types}</p>
                </div>
              )}

              {brand.talking_points && brand.talking_points.length > 0 && (
                <div style={{ marginTop: 15 }}>
                  <h3 style={{ fontFamily: 'Cooper Black, serif', fontSize: 16, color: '#543c2d', margin: '0 0 10px' }}>
                    {'💬'} Talking Points
                  </h3>
                  {brand.talking_points.map((tp: string, i: number) => (
                    <div key={i} style={{
                      background: i % 2 === 0 ? '#fff8e7' : '#f0f7f0',
                      borderRadius: 8, padding: '10px 15px', marginBottom: 8,
                      borderLeft: '4px solid ' + (i % 2 === 0 ? '#ffcb1f' : '#3a7b3c'),
                    }}>
                      <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#543c2d', margin: 0 }}>{tp}</p>
                    </div>
                  ))}
                </div>
              )}

              {!brand.description && !brand.talking_points && (
                <div style={{ background: '#fff3cd', borderRadius: 10, padding: 15, textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#856404', margin: 0 }}>
                    Brand info coming soon! We{"'"}re still gathering details on {brand.name}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Products We Carry */}
          {products.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: 20,
            }}>
              <div style={{ background: '#543c2d', padding: '14px 20px' }}>
                <h2 style={{ fontFamily: 'Cooper Black, serif', fontSize: 16, color: '#f4e6b4', margin: 0 }}>
                  What We Carry ({products.length} product{products.length !== 1 ? 's' : ''})
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                {Object.entries(categories).map(([cat, items]) => (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <p style={{
                      fontFamily: 'Cooper Black, serif', fontSize: 13, color: '#3a7b3c',
                      margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: 0.5,
                    }}>{cat}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {items.map((p: any) => {
                        const displayName = p.name.includes('|') ? p.name.split('|').slice(1).join('|').trim() : p.name
                        return (
                          <span key={p.id} style={{
                            background: '#f4e6b4', borderRadius: 20, padding: '5px 12px',
                            fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#543c2d',
                          }}>{displayName}</span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Temporarily Unavailable */}
          {unavailable.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: 20,
            }}>
              <button
                onClick={() => setShowUnavailable(!showUnavailable)}
                style={{
                  width: '100%', background: '#e8e8e8', padding: '12px 20px',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 14, color: '#888' }}>
                  Temporarily Unavailable ({unavailable.length})
                </span>
                <span style={{ fontSize: 14, color: '#888' }}>{showUnavailable ? '▲' : '▼'}</span>
              </button>
              {showUnavailable && (
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {unavailable.map((p: any) => {
                      const displayName = p.name.includes('|') ? p.name.split('|').slice(1).join('|').trim() : p.name
                      return (
                        <span key={p.id} style={{
                          background: '#f0f0f0', borderRadius: 20, padding: '5px 12px',
                          fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#999',
                        }}>{displayName}</span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quiz */}
          {quiz.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            }}>
              <div style={{ background: '#543c2d', padding: '18px 20px', textAlign: 'center' }}>
                <h2 style={{ fontFamily: 'Cooper Black, serif', fontSize: 20, color: '#ffcb1f', margin: 0 }}>
                  {'🧠'} Quick Quiz
                </h2>
                <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 13, color: '#f4e6b4', marginTop: 4 }}>
                  Test your knowledge about {brand.name}!
                </p>
              </div>

              <div style={{ padding: 20 }}>
                {submitted && (
                  <div style={{
                    background: score === quiz.length ? '#3a7b3c' : '#f37029',
                    borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16,
                  }}>
                    <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 22, color: '#fff', margin: 0 }}>
                      {score === quiz.length ? 'Perfect!' : `${score}/${quiz.length} Correct`}
                    </p>
                  </div>
                )}

                {quiz.map((q, qi) => (
                  <div key={qi} style={{ marginBottom: 18 }}>
                    <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 15, color: '#543c2d', margin: '0 0 10px' }}>
                      {qi + 1}. {q.question}
                    </p>
                    {q.options.map((opt: string) => {
                      const isSelected = answers[qi] === opt
                      const isCorrect = q.correct === opt
                      let bg = '#f9f9f9'
                      let border = '2px solid #eee'
                      if (submitted) {
                        if (isCorrect) { bg = '#e8f5e9'; border = '2px solid #3a7b3c' }
                        else if (isSelected && !isCorrect) { bg = '#ffebee'; border = '2px solid #d32f2f' }
                      } else if (isSelected) {
                        bg = '#fff8e7'; border = '2px solid #ffcb1f'
                      }
                      return (
                        <button
                          key={opt}
                          onClick={() => { if (!submitted) setAnswers({ ...answers, [qi]: opt }) }}
                          disabled={submitted}
                          style={{
                            display: 'block', width: '100%', background: bg, border,
                            borderRadius: 10, padding: '12px 15px', marginBottom: 8,
                            textAlign: 'left', cursor: submitted ? 'default' : 'pointer',
                            fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#543c2d',
                            transition: 'all 0.2s',
                          }}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                ))}

                {!submitted && (
                  <button
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length < quiz.length}
                    style={{
                      width: '100%', padding: '14px 20px',
                      background: Object.keys(answers).length < quiz.length ? '#ddd' : '#ffcb1f',
                      color: Object.keys(answers).length < quiz.length ? '#999' : '#543c2d',
                      border: 'none', borderRadius: 12,
                      fontFamily: 'Cooper Black, serif', fontSize: 16,
                      cursor: Object.keys(answers).length < quiz.length ? 'default' : 'pointer',
                      boxShadow: Object.keys(answers).length < quiz.length ? 'none' : '0 4px 12px rgba(255,203,31,0.4)',
                    }}
                  >
                    Check Answers
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </MoodWrapper>
  )
}
