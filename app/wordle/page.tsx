'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { awardPoints, POINTS } from '@/lib/points'
import MoodWrapper from '@/components/MoodWrapper'

const CANNABIS_WORDS = [
  'KUSH', 'HASH', 'DABS', 'HEMP', 'BONG', 'DANK', 'NUBS',
  'BLOOM', 'FLAME', 'GRIND', 'JOINT', 'ROSIN', 'STASH', 'VAPES', 'DOMES',
  'PLANT', 'RESIN', 'BLUNT', 'PURPS', 'FROST', 'SKUNK', 'BUDSY',
  'SATIVA', 'INDICA', 'HYBRID', 'DOSAGE', 'EDIBLE', 'FLOWER',
  'TINCTURE', 'TERPENE', 'EXTRACT', 'CAPSULE', 'PREROLL',
  'CANNABI', 'TOPICAL', 'POTENCY',
  'CULTIVAR', 'LIMONENE', 'MYRCENE',
]

function getTodaysWord(): string {
  const dayNum = Math.floor(Date.now() / 86400000)
  return CANNABIS_WORDS[dayNum % CANNABIS_WORDS.length]
}

function checkGuess(guess: string, answer: string): string[] {
  const result: string[] = new Array(guess.length).fill('absent')
  const answerArr = answer.split('')
  const used = new Array(answer.length).fill(false)

  // First pass: correct position (green)
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answerArr[i]) {
      result[i] = 'correct'
      used[i] = true
    }
  }
  // Second pass: wrong position (yellow)
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue
    for (let j = 0; j < answerArr.length; j++) {
      if (!used[j] && guess[i] === answerArr[j]) {
        result[i] = 'present'
        used[j] = true
        break
      }
    }
  }
  return result
}

const COLORS: Record<string, string> = {
  correct: '#3a7b3c',
  present: '#ffcb1f',
  absent: '#888',
  empty: 'transparent',
}

export default function WordlePage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [todaysWord, setTodaysWord] = useState('')
  const [guesses, setGuesses] = useState<string[]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shake, setShake] = useState(false)
  const [message, setMessage] = useState('')
  const [keyColors, setKeyColors] = useState<Record<string, string>>({})
  const MAX_GUESSES = 6

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
    setCurrentUser(me)

    const word = getTodaysWord()
    setTodaysWord(word)

    const today = new Date().toISOString().split('T')[0]
    if (me) {
      const { data: existing } = await supabase
        .from('wordle_games')
        .select('*')
        .eq('team_member_id', me.id)
        .eq('played_date', today)
        .limit(1)

      if (existing && existing.length > 0) {
        const game = existing[0]
        setGuesses(game.guesses || [])
        setAlreadyPlayed(true)
        setGameOver(true)
        setWon(game.solved)
        // Rebuild key colors
        const colors: Record<string, string> = {}
        ;(game.guesses || []).forEach((g: string) => {
          const res = checkGuess(g, word)
          g.split('').forEach((letter, i) => {
            const prev = colors[letter]
            if (res[i] === 'correct') colors[letter] = 'correct'
            else if (res[i] === 'present' && prev !== 'correct') colors[letter] = 'present'
            else if (!prev) colors[letter] = 'absent'
          })
        })
        setKeyColors(colors)
      }
    }
    setLoading(false)
  }

  const handleKey = useCallback((key: string) => {
    if (gameOver) return
    if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1))
      return
    }
    if (key === 'ENTER') {
      if (currentGuess.length !== todaysWord.length) {
        setMessage(`Word must be ${todaysWord.length} letters`)
        setShake(true)
        setTimeout(() => { setShake(false); setMessage('') }, 1000)
        return
      }
      submitGuess()
      return
    }
    if (/^[A-Z]$/.test(key) && currentGuess.length < todaysWord.length) {
      setCurrentGuess(prev => prev + key)
    }
  }, [currentGuess, todaysWord, gameOver])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toUpperCase()
      if (key === 'BACKSPACE' || key === 'ENTER' || /^[A-Z]$/.test(key)) {
        handleKey(key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  async function submitGuess() {
    const guess = currentGuess.toUpperCase()
    const newGuesses = [...guesses, guess]
    setGuesses(newGuesses)
    setCurrentGuess('')

    // Update key colors
    const res = checkGuess(guess, todaysWord)
    const newColors = { ...keyColors }
    guess.split('').forEach((letter, i) => {
      const prev = newColors[letter]
      if (res[i] === 'correct') newColors[letter] = 'correct'
      else if (res[i] === 'present' && prev !== 'correct') newColors[letter] = 'present'
      else if (!prev) newColors[letter] = 'absent'
    })
    setKeyColors(newColors)

    const solved = guess === todaysWord
    const outOfGuesses = newGuesses.length >= MAX_GUESSES

    if (solved || outOfGuesses) {
      setGameOver(true)
      setWon(solved)

      if (currentUser) {
        const today = new Date().toISOString().split('T')[0]
        await supabase.from('wordle_games').upsert({
          team_member_id: currentUser.id,
          word: todaysWord,
          guesses: newGuesses,
          solved,
          played_date: today,
        }, { onConflict: 'team_member_id,played_date' })

        if (solved) {
          await awardPoints(currentUser.id, POINTS.TRIVIA_CORRECT, 'wordle_solved', today)
        } else {
          await awardPoints(currentUser.id, POINTS.TRIVIA_WRONG, 'wordle_attempted', today)
        }
      }
    }
  }

  if (loading) return (
    <MoodWrapper><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#3a7b3c', fontSize: 18, fontFamily: 'Cooper Light, system-ui, sans-serif' }}>Loading...</p>
    </div></MoodWrapper>
  )

  const keyboard = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','BACKSPACE'],
  ]

  const wordLen = todaysWord.length
  const allRows: string[][] = []
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < guesses.length) {
      allRows.push(guesses[i].split(''))
    } else if (i === guesses.length && !gameOver) {
      const row = currentGuess.split('')
      while (row.length < wordLen) row.push('')
      allRows.push(row)
    } else {
      allRows.push(new Array(wordLen).fill(''))
    }
  }

  return (
    <MoodWrapper><div style={{ fontFamily: 'Cooper Light, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>{'←'} Dashboard</a>
          <div>
            <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#333', fontSize: 28, margin: 0, textShadow: '0 1px 4px rgba(255,255,255,0.7)' }}>
              {'🌿'} Domes Wordle
            </h1>
            <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0', textShadow: '0 1px 4px rgba(255,255,255,0.7)' }}>{wordLen} letters today</p>
          </div>
          <div style={{ width: 80 }} />
        </div>

        {message && (
          <div style={{
            background: '#543c2d', color: 'white', padding: '8px 16px',
            borderRadius: 8, marginBottom: 12, fontSize: 14,
            fontFamily: 'Cooper Light, system-ui, sans-serif',
          }}>
            {message}
          </div>
        )}

        {/* Game Board */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          {allRows.map((row, ri) => {
            const isCurrentRow = ri === guesses.length && !gameOver
            const isGuessed = ri < guesses.length
            return (
              <div key={ri} style={{
                display: 'flex', gap: 5,
                animation: isCurrentRow && shake ? 'shake 0.3s' : undefined,
              }}>
                {row.map((letter, ci) => {
                  let bg = 'white'
                  let borderColor = '#ddd'
                  let color = '#333'
                  if (isGuessed) {
                    const result = checkGuess(guesses[ri], todaysWord)
                    bg = COLORS[result[ci]]
                    borderColor = bg
                    color = 'white'
                  } else if (letter) {
                    borderColor = '#543c2d'
                  }
                  const size = Math.min(58, Math.floor((480 - (wordLen - 1) * 5) / wordLen))
                  return (
                    <div key={ci} style={{
                      width: size, height: size,
                      border: `2px solid ${borderColor}`,
                      borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Cooper Black, serif', fontSize: size > 40 ? 24 : 18,
                      backgroundColor: bg, color,
                      transition: 'all 0.2s',
                    }}>
                      {letter}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Game Over Message */}
        {gameOver && (
          <div style={{
            background: won ? '#3a7b3c' : '#543c2d',
            color: 'white', borderRadius: 12, padding: 16, marginBottom: 16,
          }}>
            <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 20, margin: '0 0 4px' }}>
              {won ? (alreadyPlayed ? 'You already solved it!' : 'Nice one!') : 'Better luck tomorrow!'}
            </p>
            <p style={{ fontSize: 14, margin: 0, opacity: 0.9 }}>
              {won
                ? `You got it in ${guesses.length}/${MAX_GUESSES} ${!alreadyPlayed ? '(+' + POINTS.TRIVIA_CORRECT + ' points!)' : ''}`
                : `The word was ${todaysWord} ${!alreadyPlayed ? '(+' + POINTS.TRIVIA_WRONG + ' points for trying)' : ''}`
              }
            </p>
          </div>
        )}

        {/* Keyboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          {keyboard.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 4 }}>
              {row.map(key => {
                const isSpecial = key === 'ENTER' || key === 'BACKSPACE'
                const kc = keyColors[key]
                let bg = '#e0d9c8'
                let textColor = '#333'
                if (kc === 'correct') { bg = '#3a7b3c'; textColor = 'white' }
                else if (kc === 'present') { bg = '#ffcb1f'; textColor = '#333' }
                else if (kc === 'absent') { bg = '#666'; textColor = 'white' }

                return (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    style={{
                      background: bg, color: textColor, border: 'none',
                      borderRadius: 6, padding: isSpecial ? '12px 10px' : '12px 0',
                      width: isSpecial ? 65 : 36, height: 50,
                      fontFamily: 'Cooper Black, serif',
                      fontSize: isSpecial ? 10 : 16,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {key === 'BACKSPACE' ? 'DEL' : key}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
        `}</style>
      </div>
    </div></MoodWrapper>
  )
}
