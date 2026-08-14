'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { awardPoints } from '@/lib/points'
import MoodWrapper from '@/components/MoodWrapper'

export default function WallOfLovePage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newReview, setNewReview] = useState({ customer_name: '', rating: 5, review_text: '' })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: teamData } = await supabase.from('team').select('*')
      setTeam(teamData || [])
      let me: any = null
      ;(teamData || []).forEach((t: any) => {
        if (t.auth_user_id === user.id) me = t
        if (!me && t.email === user.email) me = t
      })
      setCurrentUser(me)

      const { data } = await supabase
        .from('google_reviews')
        .select('*')
        .order('review_date', { ascending: false })
        .limit(50)

      // Match mentioned staff names
      const loaded = (data || []).map((r: any) => {
        const names = r.mentioned_staff || []
        return { ...r, mentioned_names: names }
      })
      setReviews(loaded)
      setLoading(false)
    }
    load()
  }, [router])

  /* Detect staff names in review text */
  function detectStaff(text: string): string[] {
    if (!text) return []
    const lower = text.toLowerCase()
    const found: string[] = []
    for (const member of team) {
      const firstName = (member.full_name || '').split(' ')[0].toLowerCase()
      if (firstName.length >= 3 && lower.includes(firstName)) {
        found.push(member.full_name.split(' ')[0])
      }
    }
    return [...new Set(found)]
  }

  /* Admin: manually add a review */
  async function addReview() {
    if (!newReview.customer_name) {
      alert('Please fill in the customer name.')
      return
    }
    setSaving(true)

    const mentioned = detectStaff(newReview.review_text)

    const { error } = await supabase.from('google_reviews').insert({
      customer_name: newReview.customer_name,
      rating: newReview.rating,
      review_text: newReview.review_text,
      review_date: new Date().toISOString(),
      mentioned_staff: mentioned,
      points_awarded: mentioned.length > 0,
    })

    if (error) {
      alert('Error saving review: ' + error.message)
      setSaving(false)
      return
    }

    // Award points + mark BINGO O square for mentioned staff
    if (mentioned.length > 0 && newReview.rating >= 4) {
      // Find active BINGO cycle
      const { data: activeCycle } = await supabase
        .from('bingo_cycles')
        .select('id')
        .eq('status', 'Active')
        .limit(1)

      for (const name of mentioned) {
        const match = team.find((t: any) => t.full_name.split(' ')[0].toLowerCase() === name.toLowerCase())
        if (match) {
          await awardPoints(match.id, 250, 'google_review_mention', newReview.customer_name)

          // Mark BINGO O square
          if (activeCycle && activeCycle.length > 0) {
            const cycleId = activeCycle[0].id
            const { data: sq } = await supabase
              .from('bingo_squares')
              .select('*')
              .eq('team_member_id', match.id)
              .eq('cycle_id', cycleId)
              .single()

            if (sq && !sq.square_o) {
              await supabase
                .from('bingo_squares')
                .update({ square_o: true })
                .eq('id', sq.id)

              // Check for BINGO (all 5 squares)
              if (sq.square_b && sq.square_i && sq.square_n && sq.square_g) {
                await awardPoints(match.id, 1500, 'bingo_win', `cycle_${cycleId}_review`)
              }
            }
          }
        }
      }
    }

    setNewReview({ customer_name: '', rating: 5, review_text: '' })
    setShowAdd(false)
    setSaving(false)
    // Reload
    const { data } = await supabase.from('google_reviews').select('*').order('review_date', { ascending: false }).limit(50)
    setReviews((data || []).map((r: any) => ({ ...r, mentioned_names: r.mentioned_staff || [] })))
  }

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Lead'

  if (loading) return (
    <MoodWrapper>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 18, color: '#333' }}>Loading...</p>
      </div>
    </MoodWrapper>
  )

  const stars = (n: number) => '⭐'.repeat(n)

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

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 style={{
              fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#f37029', margin: 0,
              textShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}>Wall of Love</h1>
            <span style={{
              color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '4px 12px',
              borderRadius: 20, display: 'inline-block', fontSize: 13, marginTop: 6,
            }}>Google Reviews from our amazing customers</span>
          </div>

          {/* Admin: Add Review button */}
          {isAdmin && (
            <button onClick={() => setShowAdd(!showAdd)} style={{
              width: '100%', padding: '12px 20px', marginBottom: 15,
              background: showAdd ? '#999' : '#ffcb1f', color: '#543c2d',
              border: 'none', borderRadius: 10, fontFamily: 'Cooper Black, serif',
              fontSize: 15, cursor: 'pointer',
            }}>
              {showAdd ? 'Cancel' : '+ Add Review'}
            </button>
          )}

          {/* Add review form */}
          {showAdd && (
            <div style={{
              background: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 20,
              marginBottom: 15, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: 'Cooper Black, serif', fontSize: 13, color: '#333', display: 'block', marginBottom: 4 }}>
                  Customer Name
                </label>
                <input
                  value={newReview.customer_name}
                  onChange={e => setNewReview({ ...newReview, customer_name: e.target.value })}
                  placeholder="e.g. Sarah M."
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '2px solid rgba(0,0,0,0.12)', fontSize: 15,
                    fontFamily: 'Cooper Light, serif', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: 'Cooper Black, serif', fontSize: 13, color: '#333', display: 'block', marginBottom: 4 }}>
                  Rating
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setNewReview({ ...newReview, rating: n })} style={{
                      fontSize: 24, background: 'none', border: 'none', cursor: 'pointer',
                      opacity: n <= newReview.rating ? 1 : 0.3, padding: '4px',
                    }}>⭐</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: 'Cooper Black, serif', fontSize: 13, color: '#333', display: 'block', marginBottom: 4 }}>
                  Review Text
                </label>
                <textarea
                  value={newReview.review_text}
                  onChange={e => setNewReview({ ...newReview, review_text: e.target.value })}
                  placeholder="Paste the review text here... Staff names will be auto-detected!"
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '2px solid rgba(0,0,0,0.12)', fontSize: 14,
                    fontFamily: 'Cooper Light, serif', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
                {newReview.review_text && detectStaff(newReview.review_text).length > 0 && (
                  <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#3a7b3c', margin: '6px 0 0' }}>
                    Staff detected: {detectStaff(newReview.review_text).join(', ')} — they&apos;ll earn 250 points!
                  </p>
                )}
              </div>
              <button onClick={addReview} disabled={saving} style={{
                width: '100%', padding: '12px 20px', background: '#3a7b3c', color: '#fff',
                border: 'none', borderRadius: 10, fontFamily: 'Cooper Black, serif',
                fontSize: 15, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
              }}>
                {saving ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          )}

          {/* Reviews list */}
          <div style={{ display: 'grid', gap: 12 }}>
            {reviews.length === 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.88)', borderRadius: 12, padding: 40, textAlign: 'center',
              }}>
                <p style={{ fontFamily: 'Cooper Light, serif', color: '#888', margin: 0 }}>
                  No reviews yet. {isAdmin ? 'Add one above or connect Zapier to pull them automatically!' : 'Check back soon!'}
                </p>
              </div>
            )}
            {reviews.map(r => (
              <div key={r.id} style={{
                background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 15, color: '#333' }}>
                    {r.customer_name}
                  </span>
                  <span style={{ fontSize: 14 }}>{stars(r.rating)}</span>
                </div>
                {r.review_text ? (
                  <p style={{
                    margin: '0 0 10px', fontSize: 14, color: '#444', lineHeight: 1.6,
                    fontStyle: 'italic', fontFamily: 'Cooper Light, serif',
                  }}>
                    &ldquo;{r.review_text}&rdquo;
                  </p>
                ) : (
                  <p style={{
                    margin: '0 0 10px', fontSize: 13, color: '#aaa',
                    fontFamily: 'Cooper Light, serif',
                  }}>
                    No comment — just {stars(r.rating)}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(r.mentioned_names || []).map((name: string) => (
                      <span key={name} style={{
                        fontSize: 12, padding: '2px 8px', borderRadius: 12,
                        background: '#e8f5e9', color: '#3a7b3c', fontWeight: 'bold',
                        fontFamily: 'Cooper Light, serif',
                      }}>{name}</span>
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'Cooper Light, serif' }}>
                    {r.review_date ? new Date(r.review_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </MoodWrapper>
  )
}
