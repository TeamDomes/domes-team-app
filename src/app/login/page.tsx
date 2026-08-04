'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) { setError(error.message) } else { setResetSent(true) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e6b4', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#3a7b3c', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>D</div>
        <h1 style={{ color: '#3a7b3c', fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px' }}>Domes</h1>
        <p style={{ color: '#888', fontSize: '14px', margin: '0 0 32px' }}>Team App</p>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="your@domesdispensary.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', marginBottom: '12px', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', marginBottom: '20px', boxSizing: 'border-box' }} />
            {error && <p style={{ color: '#e74c3c', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#3a7b3c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Signing in...' : 'Sign In'}</button>
            <button type="button" onClick={() => { setMode('reset'); setError('') }} style={{ background: 'none', border: 'none', color: '#3a7b3c', fontSize: '13px', cursor: 'pointer', marginTop: '16px' }}>Forgot password?</button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            {resetSent ? (
              <div>
                <p style={{ color: '#3a7b3c', fontSize: '14px', lineHeight: '1.5' }}>Check your email for a password reset link.</p>
                <button type="button" onClick={() => { setMode('login'); setResetSent(false) }} style={{ background: 'none', border: 'none', color: '#3a7b3c', fontSize: '13px', cursor: 'pointer', marginTop: '16px' }}>Back to sign in</button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Enter your email and we will send a reset link.</p>
                <input type="email" placeholder="your@domesdispensary.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', marginBottom: '20px', boxSizing: 'border-box' }} />
                {error && <p style={{ color: '#e74c3c', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#3a7b3c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
                <button type="button" onClick={() => { setMode('login'); setError('') }} style={{ background: 'none', border: 'none', color: '#3a7b3c', fontSize: '13px', cursor: 'pointer', marginTop: '16px' }}>Back to sign in</button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}