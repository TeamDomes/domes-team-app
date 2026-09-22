'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminTeamPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: teamData } = await supabase.from('team').select('*').order('full_name')
    let me: any = null
    ;(teamData || []).forEach((t: any) => {
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setIsAdmin(me?.role === 'Admin' || me?.role === 'Lead')
    setTeamMembers(teamData || [])
    setLoading(false)
  }

  async function toggleActive(member: any) {
    const newStatus = member.is_active === false ? true : false
    setUpdating(member.id)
    const { error } = await supabase
      .from('team')
      .update({ is_active: newStatus })
      .eq('id', member.id)
    if (error) {
      alert('Failed to update: ' + error.message)
    } else {
      setTeamMembers(prev => prev.map(t => t.id === member.id ? { ...t, is_active: newStatus } : t))
    }
    setUpdating(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#3a7b3c', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div>
  )

  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#888', fontSize: 16 }}>Admin access required.</p>
    </div>
  )

  const filtered = teamMembers.filter(t => {
    if (filter === 'active') return t.is_active !== false
    if (filter === 'inactive') return t.is_active === false
    return true
  })

  const activeCount = teamMembers.filter(t => t.is_active !== false).length
  const inactiveCount = teamMembers.filter(t => t.is_active === false).length

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: '0 0 4px' }}>
              Team Management
            </h1>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              {activeCount} active · {inactiveCount} inactive
            </p>
          </div>
          <a href="/dashboard" style={{
            background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
            padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333',
            textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}>{'←'} Dashboard</a>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['active', 'inactive', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 18px', borderRadius: 20, fontSize: 13,
                border: filter === f ? '2px solid #3a7b3c' : '1px solid #ddd',
                background: filter === f ? '#3a7b3c' : 'white',
                color: filter === f ? 'white' : '#666',
                cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif',
                fontWeight: filter === f ? 'bold' : 'normal',
              }}
            >
              {f === 'active' ? `Active (${activeCount})` : f === 'inactive' ? `Inactive (${inactiveCount})` : `All (${teamMembers.length})`}
            </button>
          ))}
        </div>

        {/* Team list */}
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: 40, margin: 0 }}>
              No {filter === 'inactive' ? 'inactive' : filter === 'active' ? 'active' : ''} team members.
            </p>
          ) : (
            filtered.map((member, idx) => (
              <div
                key={member.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #f0f0f0' : 'none',
                  opacity: member.is_active === false ? 0.6 : 1,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: '#333' }}>
                    {member.full_name}
                    {member.is_active === false && (
                      <span style={{ fontSize: 11, color: '#c0392b', marginLeft: 8, fontWeight: 'normal' }}>INACTIVE</span>
                    )}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
                    {member.role || 'No role'} · {member.type || 'No type'} · {member.email || 'No email'}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(member)}
                  disabled={updating === member.id}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 13,
                    border: 'none', cursor: updating === member.id ? 'wait' : 'pointer',
                    fontFamily: 'Cooper Light, system-ui, sans-serif',
                    fontWeight: 'bold',
                    background: member.is_active === false ? '#27ae60' : '#e74c3c',
                    color: 'white',
                    opacity: updating === member.id ? 0.5 : 1,
                  }}
                >
                  {updating === member.id
                    ? '...'
                    : member.is_active === false
                      ? 'Reactivate'
                      : 'Deactivate'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
