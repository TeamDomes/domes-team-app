'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [teamMember, setTeamMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: member } = await supabase.from('team').select('id, full_name, role, type').eq('email', user.email).single()
      if (member) {
        setTeamMember(member)
        await supabase.from('team').update({ auth_user_id: user.id }).eq('email', user.email).is('auth_user_id', null)
      }
      setLoading(false)
    }
    loadUser()
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4', fontFamily: 'system-ui, sans-serif' }}><p style={{ color: '#3a7b3c', fontSize: '18px' }}>Loading...</p></div>)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'system-ui, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#3a7b3c', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Domes Team App</h1>
          <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', color: '#666' }}>Sign out</button>
        </div>
        <div style={{ backgroundColor: '#f0f7f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '15px', color: '#666' }}>Welcome back,</p>
          <p style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 'bold', color: '#3a7b3c' }}>{teamMember ? teamMember.full_name : (user ? user.email : '')}</p>
          {teamMember && <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>{teamMember.role} - {teamMember.type}</p>}
        </div>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>Your database is connected and auth is working. This is where we will build out BINGO, Appreciations, Trivia, and everything else.</p>
      </div>
    </div>
  )
}