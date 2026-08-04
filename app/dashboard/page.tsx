'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState('')
  const [teamMember, setTeamMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')
      const { data: member } = await supabase
        .from('team').select('*').eq('email', user.email).single()
      if (member) {
        setTeamMember(member)
        if (!member.auth_user_id) {
          await supabase.from('team')
            .update({ auth_user_id: user.id }).eq('id', member.id)
        }
      }
      setLoading(false)
    }
    loadUser()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#3a7b3c', fontSize: '18px' }}>Loading...</p>
    </div>
  )

  const displayName = teamMember ? teamMember.full_name : userEmail
  const role = teamMember?.role || 'Admin'
  const type = teamMember?.type || ''

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ color: '#3a7b3c', fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px' }}>
              Welcome, {displayName}!
            </h1>
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
              {role}{type ? ` · ${type}` : ''}
            </p>
          </div>
          <button onClick={handleSignOut} style={{ backgroundColor: 'white', color: '#666', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
        <button onClick={() => router.push('/bingo')} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'white', border: 'none', borderRadius: '12px', padding: '20px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <span style={{ fontSize: '32px' }}>🎯</span>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#3a7b3c' }}>BINGO</p>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#888' }}>Check your BINGO card</p>
          </div>
        </button>
      </div>
    </div>
  )
}