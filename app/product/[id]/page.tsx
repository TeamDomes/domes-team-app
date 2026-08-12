'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MoodWrapper from '@/components/MoodWrapper'

export default function ProductPage() {
  const { id } = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [brand, setBrand] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Load the product
      const { data: prod } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (!prod) { setLoading(false); return }
      setProduct(prod)

      // Load the brand info
      if (prod.brand) {
        const { data: brandData } = await supabase
          .from('brands')
          .select('*')
          .eq('name', prod.brand)
          .limit(1)
          .single()
        if (brandData) {
          setBrand(brandData)
          generateQuiz(prod, brandData)
        }
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  function generateQuiz(prod: any, brandData: any) {
    const questions: any[] = []

    // Q1: What brand makes this product?
    const wrongBrands = ['Wyld', 'Kiva', 'Select', 'Wana', 'Pax', 'Stiiizy', 'Cookies', 'Raw Garden', 'Bloom Farms', 'Canndescent']
      .filter(b => b.toLowerCase() !== prod.brand.toLowerCase())
      .sort(() => Math.random() - 0.5)
    const displayName = prod.name.includes('|') ? prod.name.split('|').slice(1).join('|').trim() : prod.name
    questions.push({
      question: `Which brand makes "${displayName}"?`,
      correct: prod.brand,
      options: [prod.brand, wrongBrands[0], wrongBrands[1]].sort(() => Math.random() - 0.5),
    })

    // Q2: Category question (if category exists)
    if (prod.category) {
      const wrongCategories = ['Flower', 'Edibles', 'Vaporizers', 'Concentrates', 'Pre-Rolls', 'Tinctures', 'Topicals', 'Accessories', 'Beverages']
        .filter(c => c.toLowerCase() !== prod.category.toLowerCase())
        .sort(() => Math.random() - 0.5)
      questions.push({
        question: `What category does this product fall under?`,
        correct: prod.category,
        options: [prod.category, wrongCategories[0], wrongCategories[1]].sort(() => Math.random() - 0.5),
      })
    }

    // Q3: Brand location (if brand has location)
    if (brandData?.location) {
      const wrongLocations = ['Denver, CO', 'Portland, OR', 'Los Angeles, CA', 'Seattle, WA', 'Austin, TX', 'Miami, FL', 'Chicago, IL']
        .filter(l => l.toLowerCase() !== brandData.location.toLowerCase())
        .sort(() => Math.random() - 0.5)
      questions.push({
        question: `Where is ${prod.brand} based?`,
        correct: brandData.location,
        options: [brandData.location, wrongLocations[0], wrongLocations[1]].sort(() => Math.random() - 0.5),
      })
    }

    // Q4: Known for (if brand has it)
    if (brandData?.known_for) {
      const wrongKnown = ['Budget-priced accessories', 'Cannabis-infused skincare', 'Fast food partnerships', 'Celebrity endorsements only', 'Wholesale distribution only']
        .sort(() => Math.random() - 0.5)
      questions.push({
        question: `What is ${prod.brand} best known for?`,
        correct: brandData.known_for,
        options: [brandData.known_for, wrongKnown[0], wrongKnown[1]].sort(() => Math.random() - 0.5),
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

  if (!product) return (
    <MoodWrapper>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 15 }}>
        <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 18, color: '#333' }}>Product not found.</p>
        <a href="/dashboard" style={{ color: '#3a7b3c', fontFamily: 'Cooper Light, serif' }}>{'←'} Dashboard</a>
      </div>
    </MoodWrapper>
  )

  const displayName = product.name.includes('|') ? product.name.split('|').slice(1).join('|').trim() : product.name

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

          {/* Product Header */}
          <div style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: 20,
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3a7b3c 0%, #2d6b9e 100%)',
              padding: '25px 20px', textAlign: 'center',
            }}>
              <span style={{
                background: '#f37029', color: '#fff', fontFamily: 'Cooper Black, serif',
                fontSize: 11, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.8,
                textTransform: 'uppercase' as const, display: 'inline-block', marginBottom: 10,
              }}>NEW PRODUCT</span>
              <h1 style={{
                fontFamily: 'Cooper Black, Georgia, serif', fontSize: 26, color: '#fff', margin: '8px 0 0',
              }}>{displayName}</h1>
              <p style={{
                fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#f4e6b4', marginTop: 6,
              }}>by {product.brand}</p>
            </div>

            <div style={{ padding: 20 }}>
              {product.category && (
                <div style={{
                  background: '#f0f7f0', borderRadius: 10, padding: 15, marginBottom: 15,
                }}>
                  <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 14, color: '#3a7b3c', margin: '0 0 5px' }}>
                    Category
                  </p>
                  <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#543c2d', margin: 0 }}>
                    {product.category}
                  </p>
                </div>
              )}

              {/* Brand Info */}
              {brand && (
                <>
                  {brand.description && (
                    <p style={{
                      fontFamily: 'Cooper Light, serif', fontSize: 15, color: '#543c2d',
                      lineHeight: 1.6, marginBottom: 15,
                    }}>
                      {brand.description}
                    </p>
                  )}

                  {brand.known_for && (
                    <div style={{
                      background: '#f4e6b4', borderRadius: 10, padding: 15, marginBottom: 15,
                    }}>
                      <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 14, color: '#3a7b3c', margin: '0 0 5px' }}>
                        {product.brand} is Known For
                      </p>
                      <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#543c2d', margin: 0 }}>
                        {brand.known_for}
                      </p>
                    </div>
                  )}

                  {brand.talking_points && brand.talking_points.length > 0 && (
                    <div style={{ marginTop: 15 }}>
                      <h3 style={{
                        fontFamily: 'Cooper Black, serif', fontSize: 16, color: '#543c2d', margin: '0 0 10px',
                      }}>
                        {'💬'} Talking Points
                      </h3>
                      {brand.talking_points.map((tp: string, i: number) => (
                        <div key={i} style={{
                          background: i % 2 === 0 ? '#fff8e7' : '#f0f7f0',
                          borderRadius: 8, padding: '10px 15px', marginBottom: 8,
                          borderLeft: '4px solid ' + (i % 2 === 0 ? '#ffcb1f' : '#3a7b3c'),
                        }}>
                          <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#543c2d', margin: 0 }}>
                            {tp}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {brand.location && (
                    <p style={{
                      fontFamily: 'Cooper Light, serif', fontSize: 13, color: '#888', marginTop: 12,
                    }}>
                      {'📍'} {brand.location}
                    </p>
                  )}
                </>
              )}

              {!brand?.description && !brand?.talking_points && (
                <div style={{
                  background: '#fff3cd', borderRadius: 10, padding: 15, textAlign: 'center',
                }}>
                  <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 14, color: '#856404', margin: 0 }}>
                    Brand info coming soon! We{"'"}re still gathering details on {product.brand}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quiz Section */}
          {quiz.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            }}>
              <div style={{
                background: '#543c2d', padding: '18px 20px', textAlign: 'center',
              }}>
                <h2 style={{
                  fontFamily: 'Cooper Black, serif', fontSize: 20, color: '#ffcb1f', margin: 0,
                }}>
                  {'🧠'} Quick Quiz
                </h2>
                <p style={{
                  fontFamily: 'Cooper Light, serif', fontSize: 13, color: '#f4e6b4', marginTop: 4,
                }}>
                  Test your knowledge about this product!
                </p>
              </div>

              <div style={{ padding: 20 }}>
                {submitted && (
                  <div style={{
                    background: score === quiz.length ? '#3a7b3c' : '#f37029',
                    borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16,
                  }}>
                    <p style={{
                      fontFamily: 'Cooper Black, serif', fontSize: 22, color: '#fff', margin: 0,
                    }}>
                      {score === quiz.length ? 'Perfect!' : `${score}/${quiz.length} Correct`}
                    </p>
                  </div>
                )}

                {quiz.map((q, qi) => (
                  <div key={qi} style={{ marginBottom: 18 }}>
                    <p style={{
                      fontFamily: 'Cooper Black, serif', fontSize: 15, color: '#543c2d', margin: '0 0 10px',
                    }}>
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
