'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import MoodWrapper from '@/components/MoodWrapper'

export default function StaffReviews() {
  const router = useRouter()
  const [member, setMember] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // form state
  const [selectedProduct, setSelectedProduct] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: m } = await supabase.from('team').select('*').eq('email', user.email).single()
    setMember(m)

    const { data: prods } = await supabase.from('products').select('*').eq('is_active', true).order('name')
    setProducts(prods || [])

    const { data: revs } = await supabase
      .from('staff_reviews')
      .select('*, products(name, brand, category), team(full_name)')
      .order('created_at', { ascending: false })
    setReviews(revs || [])
    setLoading(false)
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()]

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = filterCategory === 'all' || p.category === filterCategory
    return matchesSearch && matchesCat
  })

  async function handleSubmit() {
    if (!selectedProduct || rating === 0 || !reviewText.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('staff_reviews').insert({
      product_id: selectedProduct,
      team_member_id: member.id,
      rating,
      review_text: reviewText.trim(),
    })
    if (!error) {
      setSelectedProduct('')
      setRating(0)
      setReviewText('')
      setSearchQuery('')
      await loadData()
    }
    setSubmitting(false)
  }

  const selectedProductData = products.find(p => p.id === selectedProduct)
  const avgRating = (productId: string) => {
    const prodRevs = reviews.filter(r => r.product_id === productId)
    if (prodRevs.length === 0) return null
    return (prodRevs.reduce((sum, r) => sum + r.rating, 0) / prodRevs.length).toFixed(1)
  }

  if (loading) return (
    <MoodWrapper>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
      </div>
    </MoodWrapper>
  )

  return (
    <MoodWrapper>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      <div style={{ padding: 20, maxWidth: 800, margin: '0 auto', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Cooper Black, serif', fontSize: 26, margin: '0 0 4px', color: '#f37029', textShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              Staff Reviews
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#f4e6b4', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>Share your product knowledge with the team</p>
          </div>
          <button onClick={() => router.push('/dashboard')} style={{
            background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
            padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}>Dashboard</button>
        </div>

        {/* Write a Review */}
        <div style={{
          background: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 24, marginBottom: 24,
          border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontFamily: 'Cooper Black, serif', fontSize: 18, margin: '0 0 16px', color: '#333' }}>
            Write a Review
          </h2>

          {/* Product search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 6, letterSpacing: 0.5 }}>
              SELECT PRODUCT
            </label>
            {selectedProductData ? (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f0f7f4', border: '2px solid #2d9e75', borderRadius: 10, padding: '10px 14px',
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>{selectedProductData.name}</span>
                  {selectedProductData.category && (
                    <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{selectedProductData.category}</span>
                  )}
                  {selectedProductData.source === 'sample' && (
                    <span style={{
                      fontSize: 9, background: '#f37029', color: '#fff', padding: '2px 6px',
                      borderRadius: 4, marginLeft: 8, fontWeight: 700,
                    }}>SAMPLE</span>
                  )}
                </div>
                <button onClick={() => { setSelectedProduct(''); setSearchQuery('') }} style={{
                  background: 'none', border: 'none', color: '#d4436a', cursor: 'pointer', fontSize: 18,
                }}>x</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search products..."
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd',
                      fontSize: 14, fontFamily: 'Cooper Light, system-ui, sans-serif', outline: 'none',
                    }}
                  />
                  <select
                    value={filterCategory}
                    onChange={e => { setFilterCategory(e.target.value); setShowDropdown(true) }}
                    style={{
                      padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd',
                      fontSize: 12, fontFamily: 'Cooper Light, system-ui, sans-serif', background: '#fff',
                      color: '#555', cursor: 'pointer',
                    }}
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                    ))}
                  </select>
                </div>
                {showDropdown && filteredProducts.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: '#fff', borderRadius: 10, border: '1px solid #ddd',
                    maxHeight: 250, overflowY: 'auto', marginTop: 4,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                  }}>
                    {filteredProducts.slice(0, 50).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p.id); setShowDropdown(false); setSearchQuery('') }}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          width: '100%', padding: '10px 14px', border: 'none', background: 'none',
                          cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f0f0f0',
                          fontFamily: 'Cooper Light, system-ui, sans-serif',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8f8f8')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div>
                          <span style={{ fontSize: 13, color: '#333' }}>{p.name}</span>
                          {p.source === 'sample' && (
                            <span style={{
                              fontSize: 9, background: '#f37029', color: '#fff', padding: '1px 5px',
                              borderRadius: 3, marginLeft: 6, fontWeight: 700,
                            }}>SAMPLE</span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{p.category || ''}</span>
                      </button>
                    ))}
                    {filteredProducts.length > 50 && (
                      <p style={{ padding: '8px 14px', fontSize: 11, color: '#aaa', margin: 0 }}>
                        +{filteredProducts.length - 50} more — keep typing to narrow down
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Star Rating */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8, letterSpacing: 0.5 }}>
              RATING
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 28,
                    color: star <= (hoverRating || rating) ? '#c8a84e' : '#ddd',
                    transition: 'color 0.15s, transform 0.15s',
                    transform: star <= (hoverRating || rating) ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <i className={`ti ti-star${star <= (hoverRating || rating) ? '-filled' : ''}`} />
                </button>
              ))}
              {rating > 0 && (
                <span style={{ fontSize: 13, color: '#888', alignSelf: 'center', marginLeft: 8 }}>
                  {rating === 1 ? 'Not great' : rating === 2 ? 'Okay' : rating === 3 ? 'Good' : rating === 4 ? 'Really good' : 'Must try!'}
                </span>
              )}
            </div>
          </div>

          {/* Review text */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 6, letterSpacing: 0.5 }}>
              YOUR REVIEW
            </label>
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="What did you think? Flavor, effects, who would you recommend it to..."
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #ddd',
                fontSize: 14, fontFamily: 'Cooper Light, system-ui, sans-serif', resize: 'vertical',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!selectedProduct || rating === 0 || !reviewText.trim() || submitting}
            style={{
              background: (!selectedProduct || rating === 0 || !reviewText.trim()) ? '#ccc' : '#2d9e75',
              color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px',
              fontSize: 14, fontFamily: 'Cooper Black, serif', cursor: 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Posting...' : 'Post Review'}
          </button>
        </div>

        {/* All Reviews */}
        <div>
          <h2 style={{ fontFamily: 'Cooper Black, serif', fontSize: 18, margin: '0 0 16px', color: '#333' }}>
            Team Reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.85)', borderRadius: 14, padding: 40,
              textAlign: 'center', color: '#888',
            }}>
              <i className="ti ti-message-circle" style={{ fontSize: 40, marginBottom: 12, display: 'block', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.map(r => (
                <div key={r.id} style={{
                  background: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 20,
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontFamily: 'Cooper Black, serif', fontSize: 15, color: '#333' }}>
                        {r.products?.name || 'Unknown Product'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#888' }}>by {r.team?.full_name || 'Unknown'}</span>
                        <span style={{ fontSize: 10, color: '#bbb' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <i key={s} className={`ti ti-star${s <= r.rating ? '-filled' : ''}`}
                          style={{ fontSize: 16, color: s <= r.rating ? '#c8a84e' : '#ddd' }} />
                      ))}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: '#444', lineHeight: 1.5 }}>
                    {r.review_text}
                  </p>
                  {member && r.team_member_id === member.id && (
                    <button
                      onClick={async () => {
                        await supabase.from('staff_reviews').delete().eq('id', r.id)
                        await loadData()
                      }}
                      style={{
                        background: 'none', border: 'none', color: '#d4436a', fontSize: 11,
                        cursor: 'pointer', marginTop: 8, padding: 0,
                        fontFamily: 'Cooper Light, system-ui, sans-serif',
                      }}
                    >Delete my review</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MoodWrapper>
  )
}
