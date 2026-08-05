'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { awardPoints, POINTS } from '@/lib/points'

const singleQuestions = [
  { key: 'birthplace', label: 'Where were you born?', placeholder: 'City, State or Country' },
  { key: 'raised_in', label: 'Where did you grow up?', placeholder: 'e.g. Hawaii, Brooklyn, a farm in Vermont...' },
  { key: 'favorite_food', label: 'What is your ultimate comfort food?', placeholder: 'The one thing you could eat every day forever' },
]

const multiQuestions = [
  { key: 'before_cannabis', label: 'What did you do before working in cannabis?', placeholder: 'Add a job or career', max: 10 },
  { key: 'hidden_talent', label: 'What are your hidden talents or superpowers?', placeholder: 'Add a talent', max: 5 },
  { key: 'favorite_music', label: 'What music are you vibing to lately?', placeholder: 'Add an artist, genre, or song', max: 5 },
  { key: 'pets', label: 'Do you have any pets? Tell us about them!', placeholder: 'e.g. A cat named Whiskers', max: 5 },
  { key: 'fun_fact', label: 'Things most people would never guess about you.', placeholder: 'Add a fun fact (the weirder the better!)', max: 10 },
]

const triviaTemplates = [
  { key: 'birthplace', q: (val: string) => `Which teammate was born in ${val}?`, multi: false },
  { key: 'raised_in', q: (val: string) => `Who grew up in ${val}?`, multi: false },
  { key: 'favorite_food', q: (val: string) => `Whose ultimate comfort food is ${val.toLowerCase()}?`, multi: false },
  { key: 'before_cannabis', q: (val: string) => `Before cannabis, who used to be a ${val.toLowerCase()}?`, multi: true },
  { key: 'hidden_talent', q: (val: string) => `Whose hidden talent is: ${val.toLowerCase()}?`, multi: true },
  { key: 'fun_fact', q: (val: string) => `Which teammate said: "${val}"?`, multi: true },
]

export default function QuestionnairePage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [singles, setSingles] = useState<Record<string, string>>({})
  const [multis, setMultis] = useState<Record<string, string[]>>({})
  const [multiInputs, setMultiInputs] = useState<Record<string, string>>({})
  const [existing, setExisting] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: teamData } = await supabase.from('team').select('*')
    setTeamMembers(teamData || [])
    let me: any = null
    ;(teamData || []).forEach((t: any) => {
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setCurrentUser(me)
    if (me) {
      const { data: q } = await supabase.from('staff_questionnaire').select('*').eq('team_member_id', me.id).single()
      if (q) {
        setExisting(q)
        const s: Record<string, string> = {}
        singleQuestions.forEach(({ key }) => { if (q[key]) s[key] = q[key] })
        setSingles(s)
        const m: Record<string, string[]> = {}
        multiQuestions.forEach(({ key }) => { if (q[key]) m[key] = q[key] })
        setMultis(m)
      }
    }
  }

  function addMultiAnswer(key: string) {
    const val = (multiInputs[key] || '').trim()
    if (!val) return
    const current = multis[key] || []
    const max = multiQuestions.find(q => q.key === key)?.max || 5
    if (current.length >= max) return
    setMultis(prev => ({ ...prev, [key]: [...current, val] }))
    setMultiInputs(prev => ({ ...prev, [key]: '' }))
  }

  function removeMultiAnswer(key: string, index: number) {
    setMultis(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }))
  }

  async function handleSubmit() {
    if (!currentUser) return
    const totalAnswers = Object.values(singles).filter(v => v.trim()).length +
      Object.values(multis).filter(v => v.length > 0).length
    if (totalAnswers < 4) { alert('Please fill out at least 4 questions!'); return }
    setSaving(true)
    try {
      const payload: any = { ...singles }
      multiQuestions.forEach(({ key }) => { payload[key] = multis[key] || [] })
      if (existing) {
        payload.completed_at = new Date().toISOString()
        const { error } = await supabase.from('staff_questionnaire').update(payload).eq('id', existing.id)
        if (error) throw error
      } else {
        payload.team_member_id = currentUser.id
        const { error } = await supabase.from('staff_questionnaire').insert(payload)
        if (error) throw error
      }
      await generateTrivia()
      await awardPoints(currentUser.id, POINTS.QUESTIONNAIRE_COMPLETE, 'questionnaire', currentUser.id)
      setSaved(true)
    } catch (err: any) {
      alert('Save failed: ' + err.message)
    } finally { setSaving(false) }
  }

  async function generateTrivia() {
    if (!currentUser) return
    const others = teamMembers.filter(t => t.id !== currentUser.id)
    if (others.length < 2) return
    await supabase.from('trivia_questions').delete().eq('source_team_member_id', currentUser.id).eq('category', 'team')
    const newQuestions: any[] = []
    triviaTemplates.forEach(template => {
      if (template.multi) {
        const vals = multis[template.key] || []
        vals.forEach(val => {
          if (!val.trim()) return
          const shuffled = [...others].sort(() => Math.random() - 0.5)
          const wrongNames = shuffled.slice(0, 2).map(t => t.full_name)
          const options = [currentUser.full_name, ...wrongNames].sort(() => Math.random() - 0.5)
          const correctLetter = ['A', 'B', 'C'][options.indexOf(currentUser.full_name)]
          newQuestions.push({
            category: 'team', question: template.q(val),
            option_a: options[0], option_b: options[1], option_c: options[2],
            correct_answer: correctLetter,
            explanation: `That would be ${currentUser.full_name}!`,
            source_team_member_id: currentUser.id,
          })
        })
      } else {
        const val = singles[template.key]
        if (!val || !val.trim()) return
        const shuffled = [...others].sort(() => Math.random() - 0.5)
        const wrongNames = shuffled.slice(0, 2).map(t => t.full_name)
        const options = [currentUser.full_name, ...wrongNames].sort(() => Math.random() - 0.5)
        const correctLetter = ['A', 'B', 'C'][options.indexOf(currentUser.full_name)]
        newQuestions.push({
          category: 'team', question: template.q(val),
          option_a: options[0], option_b: options[1], option_c: options[2],
          correct_answer: correctLetter,
          explanation: `That would be ${currentUser.full_name}!`,
          source_team_member_id: currentUser.id,
        })
      }
    })
    if (newQuestions.length > 0) {
      const { error } = await supabase.from('trivia_questions').insert(newQuestions)
      if (error) console.log('Trivia generation error:', error.message)
    }
  }

  if (saved) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4e6b4', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>{'\u2705'}</p>
          <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', margin: '0 0 12px' }}>You did it!</h2>
          <p style={{ color: '#666', margin: '0 0 20px' }}>Your answers have been saved and trivia questions have been created from your responses. Your teammates are going to have fun guessing!</p>
          <a href="/dashboard" style={{ color: '#387dac', fontWeight: 'bold', textDecoration: 'none' }}>Back to Dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4e6b4', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: 0 }}>
            Get to Know You
          </h1>
          <a href="/dashboard" style={{ color: '#387dac', textDecoration: 'none', fontWeight: 'bold' }}>Dashboard</a>
        </div>
        <p style={{ color: '#543c2d', marginBottom: 24, fontSize: 15 }}>
          Help your teammates get to know you! Fill out at least 4 of these and your answers will become trivia questions for the team. No wrong answers here (except boring ones).
        </p>

        {singleQuestions.map(({ key, label, placeholder }) => (
          <div key={key} style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <label style={{ fontWeight: 'bold', color: '#543c2d', fontSize: 15, display: 'block', marginBottom: 8 }}>{label}</label>
            <input type="text" placeholder={placeholder} value={singles[key] || ''}
              onChange={e => setSingles(prev => ({ ...prev, [key]: e.target.value }))}
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box', fontSize: 14 }} />
          </div>
        ))}

        {multiQuestions.map(({ key, label, placeholder, max }) => (
          <div key={key} style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <label style={{ fontWeight: 'bold', color: '#543c2d', fontSize: 15, display: 'block', marginBottom: 8 }}>
              {label} <span style={{ fontWeight: 'normal', fontSize: 12, color: '#999' }}>(up to {max})</span>
            </label>
            {(multis[key] || []).map((val, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ flex: 1, padding: '6px 10px', background: '#f0f0f0', borderRadius: 6, fontSize: 14 }}>{val}</span>
                <button onClick={() => removeMultiAnswer(key, i)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 16 }}>{'\u00D7'}</button>
              </div>
            ))}
            {(multis[key] || []).length < max && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder={placeholder} value={multiInputs[key] || ''}
                  onChange={e => setMultiInputs(prev => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMultiAnswer(key) } }}
                  style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
                <button onClick={() => addMultiAnswer(key)} style={{
                  padding: '10px 14px', background: '#3a7b3c', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', fontSize: 13,
                }}>Add</button>
              </div>
            )}
          </div>
        ))}

        <button onClick={handleSubmit} disabled={saving} style={{
          width: '100%', padding: 14, background: saving ? '#999' : '#3a7b3c', color: 'white',
          border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: saving ? 'default' : 'pointer',
          marginTop: 8, marginBottom: 40,
        }}>
          {saving ? 'Saving...' : existing ? 'Update My Answers' : 'Submit'}
        </button>
      </div>
    </div>
  )
}