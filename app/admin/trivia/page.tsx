'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TriviaAdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    explanation: '',
    difficulty: 'Medium',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: teamData } = await supabase.from('team').select('*')
    let me: any = null
    ;(teamData || []).forEach((t: any) => {
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setIsAdmin(me?.role === 'Admin' || me?.role === 'Lead')

    const { data: qs } = await supabase
      .from('trivia_questions')
      .select('*')
      .order('created_at', { ascending: false })
    setQuestions(qs || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.question || !form.option_a || !form.option_b || !form.correct_answer) {
      alert('Please fill in the question, at least 2 options, and the correct answer.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('trivia_questions').insert({
      question: form.question,
      option_a: form.option_a,
      option_b: form.option_b,
      option_c: form.option_c || null,
      option_d: form.option_d || null,
      correct_answer: form.correct_answer,
      explanation: form.explanation || null,
      category: 'cannabis',
      difficulty: form.difficulty,
    })
    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      setSaved(true)
      setForm({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '', difficulty: 'Medium' })
      setTimeout(() => setSaved(false), 3000)
      await loadData()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this question?')) return
    await supabase.from('trivia_questions').delete().eq('id', id)
    await loadData()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#3a7b3c', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div>
  )

  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4' }}>
      <p style={{ color: '#888', fontSize: 16 }}>Admin or Lead access required.</p>
    </div>
  )

  const counts = { Easy: 0, Medium: 0, Hard: 0 }
  questions.forEach(q => { counts[q.difficulty as keyof typeof counts] = (counts[q.difficulty as keyof typeof counts] || 0) + 1 })

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '2px solid #e0d9c8', fontSize: 14, boxSizing: 'border-box' as const,
    fontFamily: 'Cooper Light, system-ui, sans-serif',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'right', marginBottom: 10 }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: '#3a7b3c', color: 'white', border: 'none', borderRadius: 8,
              padding: '10px 16px', fontFamily: 'Cooper Black, serif', fontSize: 14, cursor: 'pointer', marginRight: 8,
            }}
          >
            {showForm ? 'Cancel' : '+ Add Question'}
          </button>
          <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block' }}>{'←'} Dashboard</a>
        </div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#3a7b3c', fontSize: 28, margin: '0 0 4px' }}>
            Trivia Manager
          </h1>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
            {questions.length} questions ({counts.Easy} easy, {counts.Medium} medium, {counts.Hard} hard)
          </p>
        </div>

        {/* Add Question Form */}
        {showForm && (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 18, margin: '0 0 16px' }}>
              New Question
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 'bold', color: '#333', display: 'block', marginBottom: 4 }}>Question</label>
                <textarea
                  value={form.question}
                  onChange={e => setForm({ ...form, question: e.target.value })}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Enter the trivia question..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 'bold', color: '#333', display: 'block', marginBottom: 4 }}>Option A</label>
                  <input style={inputStyle} value={form.option_a} onChange={e => setForm({ ...form, option_a: e.target.value })} placeholder="Option A" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 'bold', color: '#333', display: 'block', marginBottom: 4 }}>Option B</label>
                  <input style={inputStyle} value={form.option_b} onChange={e => setForm({ ...form, option_b: e.target.value })} placeholder="Option B" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 'bold', color: '#333', display: 'block', marginBottom: 4 }}>Option C (optional)</label>
                  <input style={inputStyle} value={form.option_c} onChange={e => setForm({ ...form, option_c: e.target.value })} placeholder="Option C" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 'bold', color: '#333', display: 'block', marginBottom: 4 }}>Option D (optional)</label>
                  <input style={inputStyle} value={form.option_d} onChange={e => setForm({ ...form, option_d: e.target.value })} placeholder="Option D" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 'bold', color: '#333', display: 'block', marginBottom: 4 }}>Correct Answer</label>
                  <select
                    value={form.correct_answer}
                    onChange={e => setForm({ ...form, correct_answer: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 'bold', color: '#333', display: 'block', marginBottom: 4 }}>Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={e => setForm({ ...form, difficulty: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 'bold', color: '#333', display: 'block', marginBottom: 4 }}>Explanation (shown after answering)</label>
                <textarea
                  value={form.explanation}
                  onChange={e => setForm({ ...form, explanation: e.target.value })}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Why is this the correct answer? This helps staff learn."
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#ffcb1f', color: '#543c2d', border: 'none', borderRadius: 10,
                  padding: '14px 20px', fontFamily: 'Cooper Black, serif', fontSize: 16,
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Question'}
              </button>

              {saved && (
                <p style={{ color: '#3a7b3c', fontSize: 14, margin: 0, fontWeight: 'bold' }}>
                  Question saved!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Question List */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 18, margin: '0 0 16px' }}>
            All Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.filter(q => q.category !== 'brand').map((q: any) => {
              const diffColor = q.difficulty === 'Hard' ? '#d32f2f' : q.difficulty === 'Medium' ? '#f37029' : '#3a7b3c'
              return (
                <div key={q.id} style={{
                  padding: 14, borderRadius: 8, border: '1px solid #f0f0f0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 'bold', color: 'white', backgroundColor: diffColor,
                        padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase',
                      }}>
                        {q.difficulty || 'Medium'}
                      </span>
                      <span style={{ fontSize: 11, color: '#888' }}>Answer: {q.correct_answer}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.4 }}>{q.question}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>
                      A: {q.option_a} | B: {q.option_b}{q.option_c ? ` | C: ${q.option_c}` : ''}{q.option_d ? ` | D: ${q.option_d}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(q.id)}
                    style={{
                      background: 'none', border: '1px solid #ddd', borderRadius: 6,
                      padding: '4px 10px', fontSize: 11, color: '#888', cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
