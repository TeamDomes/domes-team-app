'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { MOODS, DEFAULT_MOOD, type MoodKey } from '@/lib/moods'

export default function MoodWrapper({ children }: { children: ReactNode }) {
  const [mood, setMood] = useState(MOODS[DEFAULT_MOOD])

  useEffect(() => {
    async function loadMood() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase.from('team').select('current_mood').eq('email', user.email).single()
      if (member?.current_mood && MOODS[member.current_mood as MoodKey]) {
        setMood(MOODS[member.current_mood as MoodKey])
      }
    }
    loadMood()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: mood.bgGradient,
      fontFamily: 'Cooper Light, system-ui, sans-serif',
    }}>
      {mood.wallpaper && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: `url(${mood.wallpaper})`,
          backgroundSize: '400px',
          backgroundRepeat: 'repeat',
          opacity: 0.40,
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
