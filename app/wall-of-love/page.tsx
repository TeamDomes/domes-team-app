'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import MoodWrapper from '@/components/MoodWrapper'
export default function WallOfLovePage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('google_reviews').select('*').eq('is_posted', true).order('date_posted', { ascending: false }).range(0, 49)
      const { data: allTeam } = await supabase.from('team').select('id, full_name')
      const teamMap: Record<string, string> = {}
      ;(allTeam || []).forEach((t: any) => { teamMap[t.id] = t.full_name })
      setReviews((data || []).map((r: any) => {
        const mentioned = r.team_members_mentioned || []
        const names = mentioned.map((id: string) => teamMap[id] || id)
        return { ...r, mentioned_names: names }
      }))
      setLoading(false)
    }
    load()
  }, [router])
  if (loading) return (<MoodWrapper><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><p style={{ color: '#3a7b3c', fontSize: '18px' }}>Loading...</p></div></MoodWrapper>)
  const stars = (n: number) => '⭐'.repeat(n)
  return (
    <MoodWrapper><div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#333', fontSize: '24px', fontWeight: 'bold', margin: 0, textShadow: '0 1px 4px rgba(255,255,255,0.7)' }}>Wall of Love</h1>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>Dashboard</button>
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          {reviews.length === 0 && (<div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center' }}><p style={{ color: '#888' }}>No reviews yet.</p></div>)}
          {reviews.map(r => (
            <div key={r.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#333', fontSize: '15px' }}>{r.customer_name}</span>
                <span style={{ fontSize: '14px' }}>{stars(r.rating)}</span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#444', lineHeight: 1.6, fontStyle: 'italic' }}>"{r.review_text}"</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {r.mentioned_names.map((name: string) => (<span key={name} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#e8f5e9', color: '#3a7b3c', fontWeight: 'bold' }}>{name}</span>))}
                </div>
                <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(r.date_posted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div></MoodWrapper>
  )
}
