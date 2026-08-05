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

  async function handleLogin(e: any) {
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

  async function handleReset(e: any) {
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
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f4e6b4', fontFamily: 'Cooper Light, system-ui, sans-serif',
      backgroundImage: 'url(/images/DomesMountainsPaleYellow.png)',
      backgroundPosition: 'bottom center', backgroundRepeat: 'no-repeat',
      backgroundSize: '100% auto',
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '20px', padding: '48px 40px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 8px 40px rgba(84,60,45,0.15)', textAlign: 'center',
        overflow: 'visible',
      }}>
        {/* Logo */}
        <img
          src={"/images/domes-logo.png?v=2"}
          alt="Domes Dispensary"
          style={{ width: 220, objectFit: 'contain', margin: '0 auto 8px', display: 'block', borderRadius: 0 }}
        />
        <p style={{ fontFamily: 'Hanley Script, Cooper Light, serif', color: '#543c2d', fontSize: '20px', margin: '0 0 28px' }}>
          Team App
        </p>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="your@domesdispensary.com" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '2px solid #e0d9c8', fontSize: '15px', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'Cooper Light, system-ui, sans-serif', outline: 'none' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '2px solid #e0d9c8', fontSize: '15px', marginBottom: '20px', boxSizing: 'border-box', fontFamily: 'Cooper Light, system-ui, sans-serif', outline: 'none' }} />
            {error && <p style={{ color: '#e74c3c', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', backgroundColor: '#3a7b3c', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontFamily: 'Cooper Black, serif', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, letterSpacing: 0.5 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" onClick={() => { setMode('reset'); setError('') }}
              style={{ background: 'none', border: 'none', color: '#3a7b3c', fontSize: '13px', cursor: 'pointer', marginTop: '16px', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            {resetSent ? (
              <div>
                <p style={{ color: '#3a7b3c', fontSize: '14px', lineHeight: '1.5' }}>Check your email for a password reset link.</p>
                <button type="button" onClick={() => { setMode('login'); setResetSent(false) }}
                  style={{ background: 'none', border: 'none', color: '#3a7b3c', fontSize: '13px', cursor: 'pointer', marginTop: '16px', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Enter your email and we{"'"}ll send a reset link.</p>
                <input type="email" placeholder="your@domesdispensary.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '2px solid #e0d9c8', fontSize: '15px', marginBottom: '20px', boxSizing: 'border-box', fontFamily: 'Cooper Light, system-ui, sans-serif' }} />
                {error && <p style={{ color: '#e74c3c', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '14px', backgroundColor: '#3a7b3c', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontFamily: 'Cooper Black, serif', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button type="button" onClick={() => { setMode('login'); setError('') }}
                  style={{ background: 'none', border: 'none', color: '#3a7b3c', fontSize: '13px', cursor: 'pointer', marginTop: '16px', fontFamily: 'Cooper Light, system-ui, sans-serif' }}>
                  Back to sign in
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
