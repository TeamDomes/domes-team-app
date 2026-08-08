'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import MoodWrapper from '@/components/MoodWrapper'

export default function BingoPage() {
  const [squares, setSquares] = useState<any[]>([])
  const [cycle, setCycle] = useState<any>(null)
  const [winners, setWinners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: cycleData } = await supabase.from('bingo_cycles').select('*').eq('status', 'Active').single()
      setCycle(cycleData)
      if (!cycleData) { setLoading(false); return }
      const { data: squaresData } = await supabase.from('bingo_squares').select('*, team!inner(full_name, role, type)').eq('cycle_id', cycleData.id).order('team_member_id')
      setSquares((squaresData || []).filter((s: any) => s.team?.role === 'Budtender'))
      const { data: winnersData } = await supabase.from('bingo_winners').select('*, team(full_name)').order('date_won', { ascending: false }).range(0, 9)
      setWinners(winnersData || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (<MoodWrapper><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><p style={{ color: '#3a7b3c', fontSize: '18px' }}>Loading BINGO...</p></div></MoodWrapper>)

  const squareLabels: Record<string, { letter: string; name: string; desc: string }> = {
    square_b: { letter: 'B', name: 'Big Basket', desc: 'Ring up 4+ transactions over $250 (PT: 3+)' },
    square_i: { letter: 'I', name: 'In the Upsell', desc: 'Achieve a 10%+ upsell rate for the week' },
    square_n: { letter: 'N', name: 'Near-Perfect Drawer', desc: 'Cash drawer is off by less than $0.50 at close' },
    square_g: { letter: 'G', name: 'Got Here On Time', desc: 'Clock in on time for every shift' },
    square_o: { letter: 'O', name: 'Oh Hey Google', desc: 'Get mentioned by name in a 5-star Google review' },
  }

  return (
    <MoodWrapper><div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: '#3a7b3c', fontSize: '28px', fontWeight: 'bold', margin: '0 0 4px' }}>BINGO</h1>
            {cycle && <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Cycle started {new Date(cycle.cycle_start_date).toLocaleDateString()}</p>}
          </div>
<div style={{ display: 'flex', gap: '8px' }}><button onClick={() => router.push('/bingo/admin')} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', color: '#3a7b3c', fontWeight: 'bold' }}>Admin</button><button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', color: '#666' }}>← Dashboard</button></div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {Object.values(squareLabels).map(sq => (<div key={sq.letter}><div style={{ fontSize: '14px', color: '#333', fontWeight: 'bold', marginBottom: '2px' }}><span style={{ color: '#3a7b3c', marginRight: '4px' }}>{sq.letter}</span>{sq.name}</div><div style={{ fontSize: '11px', color: '#888', lineHeight: '1.3' }}>{sq.desc}</div></div>))}
        </div>
        {!cycle && <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center' }}><p style={{ color: '#888', fontSize: '16px' }}>No active BINGO cycle right now.</p></div>}
        {squares.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {squares.map((person: any) => (
              <div key={person.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: person.has_bingo ? '0 0 0 3px #ffcb1f' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#333' }}>{person.team?.full_name}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{person.team?.type} · {person.squares_filled}/5 squares</p>
                  </div>
                  {person.has_bingo && <span style={{ backgroundColor: '#ffcb1f', color: '#543c2d', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>BINGO!</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {Object.entries(squareLabels).map(([key, sq]) => {
                    const filled = person[key]
                    return (<div key={key} title={sq.name + ': ' + sq.desc} style={{ flex: 1, aspectRatio: '1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? '#3a7b3c' : '#f0f0f0', color: filled ? 'white' : '#ccc', cursor: 'default', transition: 'all 0.2s' }}><span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: 1 }}>{sq.letter}</span><span style={{ fontSize: '8px', marginTop: '2px', opacity: 0.8 }}>{filled ? 'YES' : '---'}</span></div>)
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {winners.length > 0 && (
          <div style={{ marginTop: '32px', backgroundColor: 'white', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ color: '#3a7b3c', fontSize: '18px', margin: '0 0 12px' }}>Past Winners</h2>
            {winners.map((w: any) => (<div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}><span style={{ color: '#333' }}>{w.team?.full_name}</span><span style={{ color: '#888' }}>{new Date(w.date_won).toLocaleDateString()}</span></div>))}
          </div>
        )}
      </div>
    </div></MoodWrapper>
  )
}
