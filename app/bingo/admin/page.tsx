'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BingoAdmin() {
  const [squares, setSquares] = useState<any[]>([])
  const [cycle, setCycle] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: cycleData } = await supabase
      .from('bingo_cycles').select('*').eq('status', 'Active').single()
    setCycle(cycleData)
    if (!cycleData) { setLoading(false); return }
    const { data: sq } = await supabase
      .from('bingo_squares')
      .select('*, team!inner(full_name, role, type)')
      .eq('cycle_id', cycleData.id)
      .order('team_member_id')
    setSquares((sq || []).filter((s: any) => s.team?.role === 'Budtender'))
    setLoading(false)
  }

  useEffect(() => { load() }, [router])

  const toggle = (id: string, field: string) => {
    setSquares(prev => prev.map(s => {
      if (s.id !== id) return s
      const updated = { ...s, [field]: !s[field] }
      const filled = [updated.square_b, updated.square_i, updated.square_n, updated.square_g, updated.square_o].filter(Boolean).length
      return { ...updated, squares_filled: filled, has_bingo: filled === 5 }
    }))
  }

  const saveAll = async () => {
    setSaving(true)
    setMessage('')
    for (const s of squares) {
      await supabase.from('bingo_squares').update({
        square_n: s.square_n,
        square_g: s.square_g,
        squares_filled: s.squares_filled,
        has_bingo: s.has_bingo,
      }).eq('id', s.id)
    }
    const winner = squares.find(s => s.has_bingo)
    if (winner) {
      setMessage(winner.team.full_name + ' got BINGO! Go to the BINGO page to verify, then come back here to reset the cycle.')
    } else {
      setMessage('Saved!')
    }
    setSaving(false)
  }

  const resetCycle = async () => {
    const winner = squares.find(s => s.has_bingo)
    if (!winner) { setMessage('No one has BINGO yet — nothing to reset.'); return }
    if (!confirm('Reset all BINGO cards and start a new cycle? This logs ' + winner.team.full_name + ' as the winner.')) return
    setSaving(true)
    await supabase.from('bingo_winners').insert({
      id: 'WIN-' + Date.now(),
      team_member_id: winner.team_member_id,
      date_won: new Date().toISOString().split('T')[0],
      cycle_id: cycle.id,
      notes: 'Cycle ' + cycle.id,
    })
    await supabase.from('bingo_cycles').update({
      status: 'Completed',
      cycle_end_date: new Date().toISOString().split('T')[0],
      winners: winner.team.full_name,
    }).eq('id', cycle.id)
    const newId = 'CYC' + String(Date.now()).slice(-4)
    const nextMonday = new Date()
    nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7))
    await supabase.from('bingo_cycles').insert({
      id: newId,
      cycle_start_date: nextMonday.toISOString().split('T')[0],
      status: 'Active',
      notes: 'Auto-created after ' + winner.team.full_name + ' won',
    })
    for (const s of squares) {
      await supabase.from('bingo_squares').update({
        square_b: false, square_i: false, square_n: false,
        square_g: false, square_o: false,
        squares_filled: 0, has_bingo: false, cycle_id: newId,
      }).eq('id', s.id)
    }
    setMessage('Cycle reset! ' + winner.team.full_name + ' logged as winner. New cycle starts ' + nextMonday.toLocaleDateString())
    setSaving(false)
    load()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#3a7b3c', fontSize: '18px' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: '#3a7b3c', fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px' }}>BINGO Admin</h1>
            <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Mark N and G squares weekly</p>
          </div>
          <button onClick={() => router.push('/bingo')} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', color: '#666' }}>← BINGO</button>
        </div>

        {message && (
          <div style={{ backgroundColor: message.includes('BINGO') ? '#fff3cd' : '#d4edda', border: '1px solid ' + (message.includes('BINGO') ? '#ffc107' : '#28a745'), borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px', color: '#333' }}>
            {message}
          </div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#3a7b3c', color: 'white' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>B</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>I</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', backgroundColor: '#2d5e2f' }}>N</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', backgroundColor: '#2d5e2f' }}>G</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>O</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {squares.map((s: any, i: number) => (
                <tr key={s.id} style={{ backgroundColor: s.has_bingo ? '#fff8e1' : i % 2 === 0 ? '#fafafa' : 'white', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                    {s.team?.full_name}
                    <span style={{ fontWeight: 'normal', color: '#888', marginLeft: '6px', fontSize: '12px' }}>{s.team?.type}</span>
                    {s.has_bingo && <span style={{ marginLeft: '8px', backgroundColor: '#ffcb1f', color: '#543c2d', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>BINGO!</span>}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px', fontSize: '18px' }}>{s.square_b ? '✅' : '—'}</td>
                  <td style={{ textAlign: 'center', padding: '10px', fontSize: '18px' }}>{s.square_i ? '✅' : '—'}</td>
                  <td style={{ textAlign: 'center', padding: '10px' }}>
                    <button onClick={() => toggle(s.id, 'square_n')} style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '18px', backgroundColor: s.square_n ? '#3a7b3c' : '#e0e0e0', color: s.square_n ? 'white' : '#999' }}>
                      {s.square_n ? '✓' : '·'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px' }}>
                    <button onClick={() => toggle(s.id, 'square_g')} style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '18px', backgroundColor: s.square_g ? '#3a7b3c' : '#e0e0e0', color: s.square_g ? 'white' : '#999' }}>
                      {s.square_g ? '✓' : '·'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px', fontSize: '18px' }}>{s.square_o ? '✅' : '—'}</td>
                  <td style={{ textAlign: 'center', padding: '10px', fontSize: '16px', fontWeight: 'bold', color: '#3a7b3c' }}>{s.squares_filled}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={saveAll} disabled={saving} style={{ flex: 1, backgroundColor: '#3a7b3c', color: 'white', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={resetCycle} disabled={saving} style={{ backgroundColor: '#f37029', color: 'white', border: 'none', borderRadius: '8px', padding: '14px 20px', fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            Reset Cycle
          </button>
        </div>

        <p style={{ color: '#aaa', fontSize: '12px', marginTop: '16px', textAlign: 'center' }}>
          B, I, and O are auto-calculated from data. N and G are the only manual squares.
        </p>
      </div>
    </div>
  )
}