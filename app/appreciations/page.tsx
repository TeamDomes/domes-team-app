'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { awardPoints, POINTS } from '@/lib/points'
import { useRouter } from 'next/navigation'
export default function AppreciationsPage() {
  const [appreciations, setAppreciations] = useState<any[]>([])
  const [themes, setThemes] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [toId, setToId] = useState('')
  const [selectedThemeId, setSelectedThemeId] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: member } = await supabase.from('team').select('*').eq('email', user.email).single()
    setCurrentUser(member)
    const { data: team } = await supabase.from('team').select('id, full_name, role').eq('is_active', true).order('full_name')
    setTeamMembers(team || [])
    const { data: th } = await supabase.from('themes').select('*').order('theme_name')
    setThemes(th || [])
    const { data: appr } = await supabase.from('appreciations').select('*').order('created_at', { ascending: false }).range(0, 49)
    const { data: allTeam } = await supabase.from('team').select('id, full_name')
    const { data: allThemes } = await supabase.from('themes').select('id, theme_name, theme_icon')
    const teamMap: Record<string, string> = {}
    ;(allTeam || []).forEach((t: any) => { teamMap[t.id] = t.full_name })
    const themeMap: Record<string, any> = {}
    ;(allThemes || []).forEach((t: any) => { themeMap[t.id] = t })
    setAppreciations((appr || []).map((a: any) => ({ ...a, from_name: teamMap[a.from_team_member_id] || a.from_team_member_id, to_name: teamMap[a.to_team_member_id] || a.to_team_member_id, theme_name: themeMap[a.theme_id]?.theme_name || a.theme_id, theme_icon: themeMap[a.theme_id]?.theme_icon || '' })))
    setLoading(false)
  }
  useEffect(() => { load() }, [router])
  const handleSend = async () => {
    if (!toId || !selectedThemeId || !message.trim() || !currentUser) return
    setSending(true)
    const { data: ins } = await supabase.from('appreciations').insert({ from_team_member_id: currentUser.id, to_team_member_id: toId, theme_id: selectedThemeId, message: message.trim(), created_at: new Date().toISOString() }).select().single()
    if (ins) {
      await awardPoints(currentUser.id, POINTS.APPRECIATION_GIVEN, 'appreciation_given', ins.id)
      await awardPoints(toId, POINTS.APPRECIATION_RECEIVED, 'appreciation_received', ins.id)
    }
    setToId(''); setSelectedThemeId(''); setMessage(''); setShowForm(false); setSending(false); load()
  }
  if (loading) return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}><p style={{ color: '#3a7b3c', fontSize: '18px' }}>Loading...</p></div>)
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#3a7b3c', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Appreciations</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: '#3a7b3c', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>{showForm ? 'Cancel' : '+ Send'}</button>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', color: '#666' }}>← Dashboard</button>
          </div>
        </div>
        {showForm && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 'bold', color: '#333', fontSize: '15px' }}>Send an Appreciation</p>
            <select value={toId} onChange={e => setToId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', marginBottom: '12px' }}>
              <option value="">Who are you appreciating?</option>
              {teamMembers.filter(t => t.id !== currentUser?.id).map(t => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
            </select>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {themes.map(t => (<button key={t.id} onClick={() => setSelectedThemeId(t.id)} style={{ padding: '6px 12px', borderRadius: '20px', border: selectedThemeId === t.id ? '2px solid #3a7b3c' : '1px solid #ddd', backgroundColor: selectedThemeId === t.id ? '#e8f5e9' : 'white', cursor: 'pointer', fontSize: '13px' }}>{t.theme_icon} {t.theme_name}</button>))}
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="What did they do that made a difference?" rows={3} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', marginBottom: '12px', resize: 'vertical', boxSizing: 'border-box' }} />
            <button onClick={handleSend} disabled={sending || !toId || !selectedThemeId || !message.trim()} style={{ width: '100%', backgroundColor: '#3a7b3c', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '15px', fontWeight: 'bold', cursor: sending ? 'not-allowed' : 'pointer', opacity: (!toId || !selectedThemeId || !message.trim()) ? 0.5 : 1 }}>{sending ? 'Sending...' : 'Send Appreciation'}</button>
          </div>
        )}
        <div style={{ display: 'grid', gap: '12px' }}>
          {appreciations.length === 0 && (<div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center' }}><p style={{ color: '#888' }}>No appreciations yet. Be the first!</p></div>)}
          {appreciations.map(a => (
            <div key={a.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div><span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>{a.from_name}</span><span style={{ color: '#888', fontSize: '13px' }}> → </span><span style={{ fontWeight: 'bold', color: '#3a7b3c', fontSize: '14px' }}>{a.to_name}</span></div>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f0f0f0', color: '#666', whiteSpace: 'nowrap' }}>{a.theme_icon} {a.theme_name}</span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#444', lineHeight: 1.5 }}>{a.message}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#aaa' }}>{new Date(a.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
