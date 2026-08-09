'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MoodWrapper from '@/components/MoodWrapper'

export default function GrowerPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [brand, setBrand] = useState<any>(null)
  const [allBrands, setAllBrands] = useState<any[]>([])
  const [showAdmin, setShowAdmin] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [loading, setLoading] = useState(true)
  const [pastBrands, setPastBrands] = useState<any[]>([])

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
    setIsAdmin(me?.role === 'Admin' || me?.role === 'Lead')

    const { data: brandsData } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setAllBrands(brandsData || [])

    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    const weekStart = monday.toISOString().split('T')[0]

    const { data: featured } = await supabase
      .from('brands')
      .select('*')
      .eq('featured_week', weekStart)
      .limit(1)

    if (featured && featured.length > 0) {
      setBrand(featured[0])
    } else {
      const { data: unshown } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .is('featured_week', null)
        .not('talking_points', 'is', null)
        .limit(1)

      if (unshown && unshown.length > 0) {
        const { data: updated } = await supabase
          .from('brands')
          .update({ featured_week: weekStart })
          .eq('id', unshown[0].id)
          .select()
          .single()
        setBrand(updated || unshown[0])
      } else {
        const { data: anyBrand } = await supabase
          .from('brands')
          .select('*')
          .eq('is_active', true)
          .is('featured_week', null)
          .limit(1)
        if (anyBrand && anyBrand.length > 0) {
          const { data: updated } = await supabase
            .from('brands')
            .update({ featured_week: weekStart })
            .eq('id', anyBrand[0].id)
            .select()
            .single()
          setBrand(updated || anyBrand[0])
        }
      }
    }

    const { data: past } = await supabase
      .from('brands')
      .select('*')
      .not('featured_week', 'is', null)
      .order('featured_week', { ascending: false })
      .limit(10)
    setPastBrands(past || [])

    setLoading(false)
  }

  async function adminSetBrand() {
    if (!selectedBrandId) return
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    const weekStart = monday.toISOString().split('T')[0]

    await supabase
      .from('brands')
      .update({ featured_week: null })
      .eq('featured_week', weekStart)

    const { data: updated } = await supabase
      .from('brands')
      .update({ featured_week: weekStart })
      .eq('id', selectedBrandId)
      .select()
      .single()

    if (updated) {
      setBrand(updated)
      setShowAdmin(false)
    }
  }

  if (loading) return (
    <MoodWrapper><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#543c2d' }}>Loading...</p>
    </div></MoodWrapper>
  )

  return (
    <MoodWrapper><div style={{ padding: 20 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block' }}>
          {'←'} Dashboard
        </a>

        <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 28, color: '#f37029', margin: 0, textShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
            {'🌱'} Grower of the Week
          </h1>
          <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#fff', marginTop: 5, background: 'rgba(0,0,0,0.45)', padding: '4px 12px', borderRadius: 20, display: 'inline-block' }}>
            Learn about the brands we carry and become a product expert!
          </p>
        </div>

        {isAdmin && (
          <div style={{ textAlign: 'right', marginBottom: 10 }}>
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              style={{
                background: '#543c2d', color: '#f4e6b4', border: 'none', borderRadius: 8,
                padding: '8px 16px', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, cursor: 'pointer'
              }}
            >
              {showAdmin ? 'Close Admin' : '⚙️ Admin: Pick Brand'}
            </button>
          </div>
        )}

        {showAdmin && (
          <div style={{
            background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20,
            border: '2px solid #543c2d'
          }}>
            <h3 style={{ fontFamily: 'Cooper Black, Georgia, serif', color: '#543c2d', margin: '0 0 10px' }}>
              Pick This Week's Brand
            </h3>
            <select
              value={selectedBrandId}
              onChange={e => setSelectedBrandId(e.target.value)}
              style={{
                width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc',
                fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, marginBottom: 10
              }}
            >
              <option value="">Select a brand...</option>
              {allBrands.filter(b => b.talking_points && b.talking_points.length > 0).map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.featured_week ? '(featured ' + b.featured_week + ')' : '(not yet featured)'}
                </option>
              ))}
              <optgroup label="--- Brands without info yet ---">
                {allBrands.filter(b => !b.talking_points || b.talking_points.length === 0).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </optgroup>
            </select>
            <button
              onClick={adminSetBrand}
              style={{
                background: '#3a7b3c', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14,
                cursor: 'pointer', width: '100%'
              }}
            >
              Set as This Week's Brand
            </button>
          </div>
        )}

        {brand ? (
          <div style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: 20
          }}>
            <div style={{
              background: '#3a7b3c', padding: '25px 20px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 40, marginBottom: 5 }}>{'🌿'}</div>
              <h2 style={{
                fontFamily: 'Cooper Black, Georgia, serif', fontSize: 32, color: '#fff', margin: 0
              }}>
                {brand.name}
              </h2>
              {brand.location && (
                <p style={{
                  fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14,
                  color: '#f4e6b4', marginTop: 5
                }}>
                  {'📍'} {brand.location}
                </p>
              )}
            </div>

            <div style={{ padding: 20 }}>
              {brand.description && (
                <p style={{
                  fontFamily: 'Cooper Light, Georgia, serif', fontSize: 16, color: '#543c2d',
                  lineHeight: 1.6, marginBottom: 15
                }}>
                  {brand.description}
                </p>
              )}

              {brand.known_for && (
                <div style={{
                  background: '#f4e6b4', borderRadius: 10, padding: 15, marginBottom: 15
                }}>
                  <p style={{
                    fontFamily: 'Cooper Black, Georgia, serif', fontSize: 14, color: '#3a7b3c',
                    margin: '0 0 5px'
                  }}>
                    Known For:
                  </p>
                  <p style={{
                    fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#543c2d', margin: 0
                  }}>
                    {brand.known_for}
                  </p>
                </div>
              )}

              {brand.product_types && (
                <div style={{
                  background: '#f0f7f0', borderRadius: 10, padding: 15, marginBottom: 15
                }}>
                  <p style={{
                    fontFamily: 'Cooper Black, Georgia, serif', fontSize: 14, color: '#3a7b3c',
                    margin: '0 0 5px'
                  }}>
                    Products:
                  </p>
                  <p style={{
                    fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#543c2d', margin: 0
                  }}>
                    {brand.product_types}
                  </p>
                </div>
              )}

              {brand.talking_points && brand.talking_points.length > 0 && (
                <div style={{ marginTop: 15 }}>
                  <h3 style={{
                    fontFamily: 'Cooper Black, Georgia, serif', fontSize: 18, color: '#543c2d',
                    margin: '0 0 10px'
                  }}>
                    {'💬'} Talking Points for Customers
                  </h3>
                  {brand.talking_points.map((tp: string, i: number) => (
                    <div key={i} style={{
                      background: i % 2 === 0 ? '#fff8e7' : '#f0f7f0',
                      borderRadius: 8, padding: '10px 15px', marginBottom: 8,
                      borderLeft: '4px solid ' + (i % 2 === 0 ? '#ffcb1f' : '#3a7b3c')
                    }}>
                      <p style={{
                        fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14,
                        color: '#543c2d', margin: 0
                      }}>
                        {tp}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!brand.talking_points && (
                <div style={{
                  background: '#fff3cd', borderRadius: 10, padding: 15, textAlign: 'center'
                }}>
                  <p style={{
                    fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#856404', margin: 0
                  }}>
                    Brand info coming soon! We're still gathering details on {brand.name}.
                  </p>
                </div>
              )}

              {/* Take the Quiz Button */}
              {brand.talking_points && brand.talking_points.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: 25 }}>
                  <a
                    href="/grower/quiz"
                    style={{
                      display: 'inline-block', background: '#ffcb1f', color: '#543c2d',
                      border: 'none', borderRadius: 12, padding: '16px 40px',
                      fontFamily: 'Cooper Black, Georgia, serif', fontSize: 18,
                      cursor: 'pointer', textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(255,203,31,0.4)'
                    }}
                  >
                    {'🧠'} Got It? Take the Quiz!
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 30, textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <p style={{
              fontFamily: 'Cooper Light, Georgia, serif', fontSize: 16, color: '#543c2d'
            }}>
              No brand featured this week yet. {isAdmin ? 'Use the Admin panel above to pick one!' : 'Check back soon!'}
            </p>
          </div>
        )}

        {pastBrands.length > 1 && (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 20,
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: 20
          }}>
            <h3 style={{
              fontFamily: 'Cooper Black, Georgia, serif', fontSize: 16, color: '#543c2d',
              margin: '0 0 10px'
            }}>
              Past Featured Brands
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pastBrands.filter(b => b.id !== brand?.id).map((b: any) => (
                <span key={b.id} style={{
                  background: '#f4e6b4', borderRadius: 20, padding: '5px 12px',
                  fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#543c2d'
                }}>
                  {b.name} ({b.featured_week})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div></MoodWrapper>
  )
}
