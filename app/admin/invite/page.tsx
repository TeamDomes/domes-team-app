'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  name: string
  email: string
  role: string
  type: string
  hasAuth: boolean
}

export default function InvitePage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [invitingAll, setInvitingAll] = useState(false)
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: teamData } = await supabase.from('team').select('*')
    let me: any = null
    ;(teamData || []).forEach((t: any) => {
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setCurrentUser(me)
    setIsAdmin(me?.role === 'Admin')

    // Fetch member list with auth status
    const res = await fetch('/api/invite')
    const data = await res.json()
    setMembers(data.members || [])
    setLoading(false)
  }

  async function inviteOne(email: string) {
    setInviting(prev => ({ ...prev, [email]: true }))
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.error) {
        setResults(prev => ({ ...prev, [email]: { ok: false, msg: data.error } }))
      } else {
        setResults(prev => ({ ...prev, [email]: { ok: true, msg: data.status === 'already_exists' ? 'Already has account' : 'Account created!' } }))
        // Update local state
        setMembers(prev => prev.map(m => m.email === email ? { ...m, hasAuth: true } : m))
      }
    } catch (err: any) {
      setResults(prev => ({ ...prev, [email]: { ok: false, msg: err.message } }))
    }
    setInviting(prev => ({ ...prev, [email]: false }))
  }

  async function inviteAll() {
    setInvitingAll(true)
    const needInvite = members.filter(m => !m.hasAuth)
    for (const m of needInvite) {
      await inviteOne(m.email)
    }
    setInvitingAll(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f4e6b4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#543c2d' }}>Loading...</p>
    </div>
  )

  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', background: '#f4e6b4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 18, color: '#543c2d' }}>Admin access required.</p>
    </div>
  )

  const needInvite = members.filter(m => !m.hasAuth)
  const hasAccount = members.filter(m => m.hasAuth)

  return (
    <div style={{ minHeight: '100vh', background: '#f4e6b4', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <a href="/dashboard" style={{
          background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
          padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
          fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333',
          textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block',
        }}>{'<'} Dashboard</a>

        <h1 style={{ fontFamily: 'Cooper Black, Georgia, serif', fontSize: 24, color: '#543c2d', marginTop: 10 }}>
          Team Invites
        </h1>
        <p style={{ fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14, color: '#666', marginBottom: 20 }}>
          Create accounts for team members so they can log in. Everyone gets the temporary password <strong>Domes2026!</strong> — they can reset it from the login page.
        </p>

        {/* Invite All button */}
        {needInvite.length > 0 && (
          <button onClick={inviteAll} disabled={invitingAll} style={{
            width: '100%', padding: '14px 20px', marginBottom: 20,
            background: invitingAll ? '#999' : '#3a7b3c', color: '#fff',
            border: 'none', borderRadius: 10, fontFamily: 'Cooper Black, serif',
            fontSize: 16, cursor: invitingAll ? 'default' : 'pointer',
          }}>
            {invitingAll ? 'Creating accounts...' : `Invite All (${needInvite.length} people)`}
          </button>
        )}

        {needInvite.length === 0 && (
          <div style={{
            background: '#e8f5e9', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20,
          }}>
            <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 16, color: '#3a7b3c', margin: 0 }}>
              Everyone has an account!
            </p>
          </div>
        )}

        {/* Need invite */}
        {needInvite.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20,
          }}>
            <div style={{ background: '#f37029', padding: '10px 20px' }}>
              <h3 style={{ fontFamily: 'Cooper Black, serif', color: '#fff', margin: 0, fontSize: 15 }}>
                Need Account ({needInvite.length})
              </h3>
            </div>
            {needInvite.map(m => (
              <div key={m.email} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px', borderBottom: '1px solid #eee',
              }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'Cooper Black, serif', fontSize: 14, color: '#543c2d' }}>
                    {m.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#888' }}>
                    {m.email} · {m.role}{m.type ? ` · ${m.type}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {results[m.email] && (
                    <span style={{
                      fontSize: 12, fontFamily: 'Cooper Light, serif',
                      color: results[m.email].ok ? '#3a7b3c' : '#d32f2f',
                    }}>
                      {results[m.email].msg}
                    </span>
                  )}
                  {!results[m.email]?.ok && (
                    <button onClick={() => inviteOne(m.email)} disabled={!!inviting[m.email]} style={{
                      padding: '6px 14px', background: inviting[m.email] ? '#ccc' : '#3a7b3c',
                      color: '#fff', border: 'none', borderRadius: 8,
                      fontFamily: 'Cooper Black, serif', fontSize: 12, cursor: inviting[m.email] ? 'default' : 'pointer',
                    }}>
                      {inviting[m.email] ? '...' : 'Invite'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Already have accounts */}
        {hasAccount.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <div style={{ background: '#3a7b3c', padding: '10px 20px' }}>
              <h3 style={{ fontFamily: 'Cooper Black, serif', color: '#fff', margin: 0, fontSize: 15 }}>
                Have Account ({hasAccount.length})
              </h3>
            </div>
            {hasAccount.map(m => (
              <div key={m.email} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px', borderBottom: '1px solid #eee',
              }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'Cooper Black, serif', fontSize: 14, color: '#543c2d' }}>
                    {m.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#888' }}>
                    {m.email} · {m.role}{m.type ? ` · ${m.type}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 12, color: '#3a7b3c', fontFamily: 'Cooper Light, serif' }}>Active</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
