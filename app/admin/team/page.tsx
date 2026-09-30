'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminTeamPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newMember, setNewMember] = useState({ full_name: '', email: '', role: 'Budtender', type: 'FT' })

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

  async function handleAddMember() {
    if (!newMember.full_name.trim()) { alert('Name is required'); return }
    setAdding(true)

    const firstName = newMember.full_name.trim().split(' ')[0].toLowerCase()
    // Generate a unique ID based on first name
    const existing = teamMembers.map(t => t.id)
    let id = firstName
    if (existing.includes(id)) {
      // Append last initial if duplicate
      const lastInitial = newMember.full_name.trim().split(' ').pop()?.[0]?.toLowerCase() || ''
      id = firstName + lastInitial
      let counter = 2
      while (existing.includes(id)) {
        id = firstName + counter
        counter++
      }
    }

    const { error } = await supabase.from('team').insert({
      id,
      full_name: newMember.full_name.trim(),
      first_name: newMember.full_name.trim().split(' ')[0],
      email: newMember.email.trim() || null,
      role: newMember.role,
      type: newMember.type,
      is_active: true,
    })

    if (error) {
      alert('Failed to add: ' + error.message)
    } else {
      setNewMember({ full_name: '', email: '', role: 'Budtender', type: 'FT' })
      setShowAdd(false)
      await loadData()
    }
    setAdding(false)
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

  const inputStyle = {
    padding: '10px 14px', borderRadius: 8, border: '2px solid #e0d9c8',
    fontSize: 14, fontFamily: 'Cooper Light, system-ui, sans-serif',
    width: '100%', boxSizing: 'border-box' as const,
  }

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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href="/admin/invite" style={{
              background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
              padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#3a7b3c',
              textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              fontWeight: 'bold',
            }}>Invites</a>
            <a href="/dashboard" style={{
              background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
              padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333',
              textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}>{'←'} Dashboard</a>
          </div>
        </div>

        {/* Add Employee */}
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, fontSize: 15,
              border: '2px dashed #3a7b3c', background: 'rgba(58,123,60,0.05)',
              color: '#3a7b3c', cursor: 'pointer', marginBottom: 20,
              fontFamily: 'Cooper Black, serif',
            }}
          >
            + Add New Employee
          </button>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 18, margin: '0 0 16px' }}>
              Add New Employee
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Jordan Smith"
                  value={newMember.full_name}
                  onChange={e => setNewMember(prev => ({ ...prev, full_name: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Email</label>
                <input
                  type="email"
                  placeholder="e.g. jsmith@domesdispensary.com"
                  value={newMember.email}
                  onChange={e => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Role</label>
                <select
                  value={newMember.role}
                  onChange={e => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="Budtender">Budtender</option>
                  <option value="Lead">Lead</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Type</label>
                <select
                  value={newMember.type}
                  onChange={e => setNewMember(prev => ({ ...prev, type: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="FT">Full-Time</option>
                  <option value="PT">Part-Time</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={handleAddMember}
                disabled={adding}
                style={{
                  padding: '10px 24px', borderRadius: 8, fontSize: 14,
                  border: 'none', background: '#3a7b3c', color: 'white',
                  cursor: adding ? 'wait' : 'pointer', fontFamily: 'Cooper Black, serif',
                  opacity: adding ? 0.5 : 1,
                }}
              >
                {adding ? 'Adding...' : 'Add Employee'}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewMember({ full_name: '', email: '', role: 'Budtender', type: 'FT' }) }}
                style={{
                  padding: '10px 24px', borderRadius: 8, fontSize: 14,
                  border: '1px solid #ddd', background: 'white', color: '#666',
                  cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
