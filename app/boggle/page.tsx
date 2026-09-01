'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { CANNABIS_DICTIONARY, isValidWord } from '@/lib/cannabis-dictionary'
import { CANNABIS_DEFINITIONS } from '@/lib/cannabis-definitions'
import { awardPoints, POINTS } from '@/lib/points'
import MoodWrapper from '@/components/MoodWrapper'

/* ── Boggle board generation ── */
// Letter frequencies weighted toward cannabis vocabulary
const DICE: string[][] = [
  ['R','I','F','O','B','X'], ['I','F','E','H','E','Y'], ['D','E','N','O','W','S'], ['U','T','O','K','N','D'],
  ['H','M','S','R','A','O'], ['L','U','P','E','T','S'], ['A','C','I','T','O','A'], ['Y','L','G','K','U','E'],
  ['B','M','J','O','A','Q'], ['I','H','S','P','C','E'], ['O','V','W','R','G','S'], ['S','E','A','N','I','E'],
  ['O','T','T','E','M','L'], ['R','Y','V','D','E','L'], ['L','R','E','I','X','D'], ['E','I','U','N','E','S'],
]

function generateBoard(): string[] {
  const shuffled = [...DICE].sort(() => Math.random() - 0.5)
  return shuffled.map(die => die[Math.floor(Math.random() * 6)])
}

/* ── Adjacency check for valid Boggle paths ── */
function getNeighbors(idx: number): number[] {
  const row = Math.floor(idx / 4), col = idx % 4
  const n: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr, nc = col + dc
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) n.push(nr * 4 + nc)
    }
  }
  return n
}

function canFormWord(word: string, board: string[]): boolean {
  const upper = word.toUpperCase()
  function dfs(idx: number, pos: number, visited: Set<number>): boolean {
    if (pos === upper.length) return true
    for (const n of getNeighbors(idx)) {
      if (!visited.has(n) && board[n] === upper[pos]) {
        visited.add(n)
        if (dfs(n, pos + 1, visited)) return true
        visited.delete(n)
      }
    }
    return false
  }
  for (let i = 0; i < 16; i++) {
    if (board[i] === upper[0]) {
      const visited = new Set([i])
      if (dfs(i, 1, visited)) return true
    }
  }
  return false
}

/* ── Scoring ── */
function wordScore(word: string): number {
  const len = word.length
  if (len <= 3) return 1
  if (len === 4) return 2
  if (len === 5) return 3
  if (len === 6) return 5
  if (len === 7) return 8
  return 11 // 8+ letters
}

const TIMER_OPTIONS = [
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '60 min', seconds: 3600 },
]
const DEFAULT_SECONDS = 600 // 10 minutes

export default function BogglePage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'lobby' | 'playing' | 'results'>('lobby')
  const [selectedTimer, setSelectedTimer] = useState(DEFAULT_SECONDS)

  // Game state
  const [gameId, setGameId] = useState<string | null>(null)
  const [board, setBoard] = useState<string[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SECONDS)
  const timerRef = useRef<any>(null)

  // Word entry
  const [currentWord, setCurrentWord] = useState('')
  const [foundWords, setFoundWords] = useState<string[]>([])
  const [wordFeedback, setWordFeedback] = useState<{ msg: string; ok: boolean } | null>(null)

  // Study guide
  const [showGuide, setShowGuide] = useState(false)
  const [defWord, setDefWord] = useState<string | null>(null)

  // Results
  const [results, setResults] = useState<any>(null)

  // Available games
  const [openGames, setOpenGames] = useState<any[]>([])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: teamData } = await supabase.from('team').select('*')
    let me: any = null
    ;(teamData || []).forEach((t: any) => {
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setCurrentUser(me)
    await loadOpenGames()
    setLoading(false)
  }

  async function loadOpenGames() {
    const { data } = await supabase
      .from('boggle_games')
      .select('*, boggle_players(player_id, team:team!boggle_players_player_id_fkey(full_name))')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(10)
    setOpenGames(data || [])
  }

  /* ── Create a new game ── */
  async function createGame() {
    if (!currentUser) return
    const newBoard = generateBoard()
    const { data: game, error } = await supabase
      .from('boggle_games')
      .insert({ board: newBoard, created_by: currentUser.id })
      .select()
      .single()
    if (error || !game) { alert('Error creating game'); return }

    await supabase.from('boggle_players').insert({
      game_id: game.id, player_id: currentUser.id, ready: true
    })

    setGameId(game.id)
    setBoard(newBoard)
    setView('lobby')
    subscribeToGame(game.id)
    await loadPlayers(game.id)
  }

  /* ── Join an existing game ── */
  async function joinGame(gId: string) {
    if (!currentUser) return
    await supabase.from('boggle_players').insert({
      game_id: gId, player_id: currentUser.id, ready: true
    })

    const { data: game } = await supabase.from('boggle_games').select('*').eq('id', gId).single()
    if (!game) return

    setGameId(gId)
    setBoard(game.board)
    setView('lobby')
    subscribeToGame(gId)
    await loadPlayers(gId)
  }

  async function loadPlayers(gId: string) {
    const { data } = await supabase
      .from('boggle_players')
      .select('*, team:team!boggle_players_player_id_fkey(full_name)')
      .eq('game_id', gId)
    setPlayers(data || [])
  }

  /* ── Realtime subscription ── */
  function subscribeToGame(gId: string) {
    supabase.channel(`boggle-${gId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boggle_games', filter: `id=eq.${gId}` },
        (payload: any) => {
          const g = payload.new
          if (g.status === 'playing' && view !== 'playing') {
            setBoard(g.board)
            startPlaying(g.ends_at)
          }
          if (g.status === 'finished') {
            loadResults(gId)
          }
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'boggle_players', filter: `game_id=eq.${gId}` },
        () => { loadPlayers(gId) }
      )
      .subscribe()
  }

  /* ── Start the game ── */
  async function startGame() {
    if (!gameId) return
    const endsAt = new Date(Date.now() + selectedTimer * 1000).toISOString()
    await supabase.from('boggle_games').update({
      status: 'playing', started_at: new Date().toISOString(), ends_at: endsAt
    }).eq('id', gameId)
    startPlaying(endsAt)
  }

  function startPlaying(endsAt: string) {
    setView('playing')
    setFoundWords([])
    setCurrentWord('')

    const end = new Date(endsAt).getTime()
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((end - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        finishGame()
      }
    }, 500)
  }

  /* ── Submit a word ── */
  const submitWord = useCallback(() => {
    const word = currentWord.trim().toLowerCase()
    setCurrentWord('')

    if (word.length < 3) {
      setWordFeedback({ msg: 'Too short (min 3 letters)', ok: false })
      return
    }
    if (foundWords.includes(word)) {
      setWordFeedback({ msg: 'Already found!', ok: false })
      return
    }
    if (!isValidWord(word)) {
      setWordFeedback({ msg: 'Not in cannabis dictionary', ok: false })
      return
    }
    // Check that all letters in the word exist on the board (using available tiles)
    const boardLetters = board.map(l => l.toUpperCase())
    const used: boolean[] = new Array(16).fill(false)
    for (const ch of word.toUpperCase()) {
      const idx = boardLetters.findIndex((l, i) => l === ch && !used[i])
      if (idx === -1) {
        setWordFeedback({ msg: 'Letters not on board', ok: false })
        return
      }
      used[idx] = true
    }

    setFoundWords(prev => [...prev, word])
    setWordFeedback({ msg: `+${wordScore(word)} pts`, ok: true })

    // Save to DB
    if (gameId && currentUser) {
      supabase.from('boggle_words').insert({
        game_id: gameId, player_id: currentUser.id,
        word, is_valid: true, points: wordScore(word)
      }).then(() => {})
    }
  }, [currentWord, foundWords, board, gameId, currentUser])

  /* ── Finish game ── */
  async function finishGame() {
    if (!gameId) return
    clearInterval(timerRef.current)

    // Submit remaining words to DB
    await supabase.from('boggle_games').update({ status: 'finished' }).eq('id', gameId)
    await loadResults(gameId)
  }

  async function loadResults(gId: string) {
    setView('results')
    clearInterval(timerRef.current)

    // Get all words from all players
    const { data: allWords } = await supabase
      .from('boggle_words')
      .select('*, team:team!boggle_words_player_id_fkey(full_name)')
      .eq('game_id', gId)

    // Get players
    const { data: gamePlayers } = await supabase
      .from('boggle_players')
      .select('*, team:team!boggle_players_player_id_fkey(full_name)')
      .eq('game_id', gId)

    if (!allWords || !gamePlayers) return

    // Find duplicates (words found by multiple players)
    const wordCounts: Record<string, string[]> = {}
    allWords.forEach((w: any) => {
      if (!wordCounts[w.word]) wordCounts[w.word] = []
      wordCounts[w.word].push(w.player_id)
    })

    // Calculate scores (duplicates cancel out in classic Boggle)
    const scores: Record<string, { name: string; score: number; words: string[]; uniqueWords: string[] }> = {}
    gamePlayers.forEach((p: any) => {
      scores[p.player_id] = { name: p.team?.full_name || 'Unknown', score: 0, words: [], uniqueWords: [] }
    })

    allWords.forEach((w: any) => {
      if (!scores[w.player_id]) return
      scores[w.player_id].words.push(w.word)
      if (wordCounts[w.word].length === 1) {
        // Unique word — scores points
        scores[w.player_id].score += wordScore(w.word)
        scores[w.player_id].uniqueWords.push(w.word)
      }
    })

    // Update player scores in DB
    for (const [pid, s] of Object.entries(scores)) {
      await supabase.from('boggle_players').update({ score: s.score }).eq('game_id', gId).eq('player_id', pid)
    }

    // Award points to winner
    const sorted = Object.entries(scores).sort((a, b) => b[1].score - a[1].score)
    if (sorted.length > 0 && sorted[0][1].score > 0) {
      await awardPoints(sorted[0][0], 10, 'boggle_win', gId)
    }
    // Participation points for all
    for (const [pid] of sorted) {
      if (pid === currentUser?.id) {
        await awardPoints(pid, 3, 'boggle_play', gId)
      }
    }

    setResults({ scores: sorted.map(([pid, s]) => ({ ...s, id: pid })), duplicates: Object.entries(wordCounts).filter(([, p]) => p.length > 1).map(([w]) => w) })
  }

  /* ── Back to lobby ── */
  function backToLobby() {
    setView('lobby')
    setGameId(null)
    setBoard([])
    setPlayers([])
    setFoundWords([])
    setResults(null)
    setTimeLeft(DEFAULT_SECONDS)
    loadOpenGames()
  }

  if (loading) return (
    <MoodWrapper>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 18, color: '#333' }}>Loading...</p>
      </div>
    </MoodWrapper>
  )

  return (
    <MoodWrapper>
      <div style={{ minHeight: '100vh', padding: 20 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'right', marginBottom: 10 }}>
            <a href="/dashboard" style={{
              background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
              padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333',
              textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block',
            }}>{'←'} Dashboard</a>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 style={{
              fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#f37029', margin: 0,
              textShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}>Cannabis Boggle</h1>
            <span style={{
              color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '4px 12px',
              borderRadius: 20, display: 'inline-block', fontSize: 13,
              fontFamily: 'Cooper Light, serif', marginTop: 6,
            }}>Find cannabis words in the grid!</span>
            <button onClick={() => setShowGuide(!showGuide)} style={{
              display: 'block', margin: '10px auto 0', background: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(0,0,0,0.12)', borderRadius: 20, padding: '6px 16px',
              fontFamily: 'Cooper Light, serif', fontSize: 13, color: '#543c2d',
              cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}>{showGuide ? 'Hide' : 'Show'} Word List</button>
          </div>

          {/* Study Guide */}
          {showGuide && (
            <div style={{
              background: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 20,
              marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              maxHeight: 500, overflowY: 'auto',
            }}>
              <h3 style={{ fontFamily: 'Cooper Black, serif', fontSize: 16, color: '#f37029', margin: '0 0 4px' }}>
                Cannabis Word List ({CANNABIS_DICTIONARY.size} words)
              </h3>
              <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#888', margin: '0 0 12px' }}>
                Tap any word to see its cannabis definition
              </p>
              {[
                { title: 'Strains', words: 'ace,acdc,afghan,afpak,amnesia,animal,ape,apple,banana,biscotti,biscuit,blackberry,blueberry,bruce,bubba,bubblegum,cake,candy,cereal,cheese,cheetah,chemdog,cherry,chocolate,citrus,cookie,cookies,cream,critical,crush,diesel,dosido,dream,durban,fire,fruity,fuel,gas,gelato,ghost,glue,gorilla,grape,grapefruit,gsc,guava,gummy,haze,headband,hulk,ice,jack,jealousy,jet,king,kryptonite,kush,larry,lavender,lemon,lime,london,mac,mango,maui,melon,mimosa,mint,mochi,moonrock,northern,nuken,obama,ocean,orange,oreo,papaya,peach,pebbles,pie,pine,pineapple,plum,poison,punch,purple,rainbow,razz,rocket,runtz,sherbert,skittlez,skunk,slurricane,snowcap,sour,stardawg,strawberry,sugar,sunset,supreme,tangie,tiger,trainwreck,truffle,tuna,vanilla,velvet,venom,watermelon,wedding,white,widow,wizard,yoda,zen,zero,zkittlez,zombie,zookies' },
                { title: 'Terpenes', words: 'bisabolol,borneol,camphene,carene,caryophyllene,cymene,eucalyptol,farnesene,fenchol,geraniol,guaiol,humulene,limonene,linalool,myrcene,nerolidol,ocimene,phytol,pinene,pulegone,sabinene,terpinene,terpineol,terpinolene,valencene' },
                { title: 'Cannabinoids', words: 'thc,thca,thcv,thcp,cbd,cbda,cbdv,cbg,cbga,cbn,cbc,delta' },
                { title: 'Effects', words: 'alert,awake,bliss,body,boost,brave,bright,buzz,calm,chill,clear,couch,create,creative,deep,dopey,doze,dream,drift,ease,elate,energy,euphoria,float,flow,focus,free,fresh,giddy,giggly,glow,good,groove,happy,harmony,haze,head,heal,heavy,high,ignite,inspire,joy,juice,keen,lazy,lean,level,lift,light,lit,lock,loose,love,lucid,mellow,mental,mind,mood,nap,numb,peace,peak,pep,power,quiet,relax,relief,rest,rise,rush,sedated,serene,sleepy,slow,smooth,snooze,social,soothe,spark,spirit,stoned,surge,sweet,tingle,tired,tone,tranquil,trip,tune,unwind,uplift,upbeat,vibe,vigor,vivid,warm,wave,wavy,woke,wonder,wow,zen,zing,zone' },
                { title: 'Gear', words: 'ash,ashtray,banger,battery,blunt,bong,bowl,bubbler,burner,butane,cap,carb,cart,chillum,clipper,coil,cone,dab,dabber,dome,domes,downstem,drip,dugout,edible,filter,flame,flint,glass,globe,grinder,hemp,holder,hookah,jar,joint,kief,lighter,liner,mat,mill,mod,mold,nail,nectar,oil,paper,papers,pen,perc,piece,pipe,poker,pouch,press,puck,puff,quartz,rag,reclaim,rig,ring,roach,roll,roller,scale,screen,shatter,slab,slider,snuffer,spool,stem,stir,straw,tab,tin,tip,toke,tool,torch,tray,trim,tube,vape,vial,wick,wrap' },
                { title: 'Plant & Grow', words: 'bract,branch,breed,bud,bulb,calyx,canopy,clone,cola,compost,crop,cure,cut,dirt,drain,dry,fan,feed,fem,fiber,flora,flower,flush,foliage,frost,germ,grow,guard,harvest,herd,hybrid,indica,leaf,lobe,lumen,male,mother,mulch,node,nug,nugs,nutrient,organic,peat,pest,pheno,pistil,plant,pollen,pot,prune,pull,resin,root,ruderalis,sap,sativa,seed,shake,soil,sprout,stalk,stem,sticky,strain,sugar,tent,terra,top,tree,trellis,trichome,trim,veg,vine,water,wax,weed,wet,wick,yield' },
                { title: 'Industry', words: 'bag,bank,batch,bid,bin,brand,bulk,buy,cash,club,coa,comply,cost,counter,cure,deal,delivery,dispo,dose,drop,eighth,extract,farm,fill,firm,gram,green,grind,grow,half,hash,hub,label,lab,legal,license,lid,lot,loud,market,med,menu,micro,ounce,pack,patron,permit,pharm,plug,potency,preroll,price,product,profit,promo,quad,quality,rec,retail,review,safe,sale,sell,shelf,shop,smoke,stock,store,supply,tax,terp,test,tier,tincture,topical,total,unit,upsell,vendor,vet,wholesale,zip' },
                { title: 'Slang', words: 'bake,baked,banger,blast,blaze,blazed,chief,chronic,cloud,cough,crispy,dank,dazed,diesel,dope,faded,fire,fried,ganja,gas,gone,goofy,green,herb,hit,hot,inhale,jane,juice,kief,kind,leaf,legit,lit,loud,mary,mids,mist,nug,nugs,phat,puff,purp,reefer,rip,roast,sesh,slab,smoke,smoked,snoop,spliff,stash,stick,stoned,stoner,stink,toke,toker,torch,trees,trip,vape,weed,whip,zooted' },
              ].map(cat => (
                <div key={cat.title} style={{ marginBottom: 14 }}>
                  <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 13, color: '#543c2d', margin: '0 0 6px' }}>
                    {cat.title}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {cat.words.split(',').map(w => (
                      <span
                        key={w}
                        onClick={() => setDefWord(defWord === w ? null : w)}
                        style={{
                          fontFamily: 'Cooper Light, serif', fontSize: 12, color: defWord === w ? '#fff' : '#543c2d',
                          background: defWord === w ? '#3a7b3c' : '#f0ead6', borderRadius: 6,
                          padding: '2px 7px', cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >{w}</span>
                    ))}
                  </div>
                  {cat.words.split(',').filter(w => w === defWord).map(w => (
                    <div key={w + '-def'} style={{
                      background: '#e8f5e9', borderRadius: 8, padding: '8px 12px', marginTop: 6,
                      borderLeft: '3px solid #3a7b3c',
                    }}>
                      <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 13, color: '#333', margin: 0 }}>
                        <strong style={{ color: '#3a7b3c' }}>{w}</strong> — {CANNABIS_DEFINITIONS[w] || 'Definition coming soon.'}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── LOBBY VIEW ── */}
          {view === 'lobby' && !gameId && (
            <>
              <button onClick={createGame} style={{
                width: '100%', padding: '16px 20px', background: '#3a7b3c', color: '#fff',
                border: 'none', borderRadius: 12, fontFamily: 'Cooper Black, serif',
                fontSize: 18, cursor: 'pointer', marginBottom: 20,
                boxShadow: '0 4px 12px rgba(58,123,60,0.3)',
              }}>
                Create New Game
              </button>

              {openGames.length > 0 && (
                <div>
                  <h3 style={{ fontFamily: 'Cooper Black, serif', fontSize: 16, color: '#f37029', marginBottom: 10 }}>
                    Open Games
                  </h3>
                  {openGames.map((g: any) => {
                    const creator = g.boggle_players?.[0]?.team?.full_name || 'Someone'
                    const playerCount = g.boggle_players?.length || 1
                    return (
                      <div key={g.id} style={{
                        background: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 15,
                        marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}>
                        <div>
                          <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 14, margin: 0, color: '#333' }}>
                            {creator}&apos;s Game
                          </p>
                          <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 12, margin: '4px 0 0', color: '#666' }}>
                            {playerCount} player{playerCount > 1 ? 's' : ''} waiting
                          </p>
                        </div>
                        <button onClick={() => joinGame(g.id)} style={{
                          padding: '8px 20px', background: '#2d9e75', color: '#fff',
                          border: 'none', borderRadius: 8, fontFamily: 'Cooper Black, serif',
                          fontSize: 14, cursor: 'pointer',
                        }}>Join</button>
                      </div>
                    )
                  })}
                </div>
              )}

              {openGames.length === 0 && (
                <div style={{
                  background: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 20, textAlign: 'center',
                }}>
                  <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 15, color: '#666', margin: 0 }}>
                    No open games right now. Create one and invite a teammate!
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── WAITING FOR PLAYERS ── */}
          {view === 'lobby' && gameId && (
            <div style={{
              background: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 20,
              textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ fontFamily: 'Cooper Black, serif', fontSize: 18, color: '#333', margin: '0 0 15px' }}>
                Waiting for Players
              </h3>
              <div style={{ marginBottom: 15 }}>
                {players.map((p: any) => (
                  <div key={p.id} style={{
                    display: 'inline-block', background: '#e8f5e9', borderRadius: 20,
                    padding: '6px 14px', margin: 4, fontFamily: 'Cooper Light, serif',
                    fontSize: 14, color: '#2e7d32',
                  }}>
                    {p.team?.full_name || 'Player'}
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 13, color: '#888', margin: '0 0 15px' }}>
                Tell a coworker to open Boggle and join your game!
              </p>

              {/* Timer selection */}
              <div style={{ marginBottom: 15 }}>
                <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 13, color: '#543c2d', margin: '0 0 8px' }}>
                  Round Length:
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {TIMER_OPTIONS.map(opt => (
                    <button
                      key={opt.seconds}
                      onClick={() => setSelectedTimer(opt.seconds)}
                      style={{
                        padding: '8px 16px', borderRadius: 8,
                        border: selectedTimer === opt.seconds ? '2px solid #3a7b3c' : '2px solid #ddd',
                        background: selectedTimer === opt.seconds ? '#e8f5e9' : '#fff',
                        color: selectedTimer === opt.seconds ? '#2e7d32' : '#666',
                        fontFamily: 'Cooper Black, serif', fontSize: 14,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              <button onClick={startGame} style={{
                padding: '14px 30px', background: '#f37029', color: '#fff',
                border: 'none', borderRadius: 10, fontFamily: 'Cooper Black, serif',
                fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(243,112,41,0.3)',
              }}>
                Start Game!
              </button>
              <button onClick={backToLobby} style={{
                display: 'block', margin: '15px auto 0', background: 'none', border: 'none',
                color: '#999', fontFamily: 'Cooper Light, serif', fontSize: 13, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          )}

          {/* ── PLAYING VIEW ── */}
          {view === 'playing' && (
            <>
              {/* Timer */}
              <div style={{
                textAlign: 'center', marginBottom: 15,
                background: timeLeft <= 30 ? 'rgba(243,112,41,0.9)' : 'rgba(58,123,60,0.9)',
                borderRadius: 12, padding: '10px 20px', transition: 'background 0.5s',
              }}>
                <span style={{
                  fontFamily: 'Cooper Black, serif', fontSize: 28, color: '#fff',
                }}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Board */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
                maxWidth: 320, margin: '0 auto 15px', padding: 12,
                background: 'rgba(255,255,255,0.92)', borderRadius: 14,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}>
                {board.map((letter, i) => (
                  <div key={i} style={{
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f8f0e0 0%, #efe4d0 100%)',
                    borderRadius: 8, border: '2px solid #d4c4a8',
                    fontFamily: 'Cooper Black, serif', fontSize: 26, color: '#543c2d',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    userSelect: 'none',
                  }}>
                    {letter}
                  </div>
                ))}
              </div>

              {/* Word input */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  value={currentWord}
                  onChange={e => setCurrentWord(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') submitWord() }}
                  placeholder="Type a cannabis word..."
                  autoFocus
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10,
                    border: '2px solid rgba(0,0,0,0.15)', fontFamily: 'Cooper Light, serif',
                    fontSize: 16, background: 'rgba(255,255,255,0.95)', outline: 'none',
                  }}
                />
                <button onClick={submitWord} style={{
                  padding: '12px 20px', background: '#3a7b3c', color: '#fff',
                  border: 'none', borderRadius: 10, fontFamily: 'Cooper Black, serif',
                  fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>Submit</button>
              </div>

              {/* Feedback */}
              {wordFeedback && (
                <div style={{
                  textAlign: 'center', padding: '6px 12px', borderRadius: 8, marginBottom: 10,
                  background: wordFeedback.ok ? 'rgba(58,123,60,0.15)' : 'rgba(243,112,41,0.15)',
                  color: wordFeedback.ok ? '#2e7d32' : '#e65100',
                  fontFamily: 'Cooper Light, serif', fontSize: 13,
                }}>
                  {wordFeedback.msg}
                </div>
              )}

              {/* Found words */}
              <div style={{
                background: 'rgba(255,255,255,0.88)', borderRadius: 12, padding: 15,
              }}>
                <p style={{ fontFamily: 'Cooper Black, serif', fontSize: 14, color: '#333', margin: '0 0 8px' }}>
                  Words Found: {foundWords.length} ({foundWords.reduce((s, w) => s + wordScore(w), 0)} pts)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {foundWords.map((w, i) => (
                    <span key={i} style={{
                      background: '#e8f5e9', borderRadius: 6, padding: '4px 10px',
                      fontFamily: 'Cooper Light, serif', fontSize: 13, color: '#2e7d32',
                    }}>{w} +{wordScore(w)}</span>
                  ))}
                </div>
              </div>

              {/* End early button */}
              <button onClick={finishGame} style={{
                display: 'block', margin: '15px auto 0', background: 'rgba(0,0,0,0.1)',
                border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
                fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#666',
              }}>End Round Early</button>
            </>
          )}

          {/* ── RESULTS VIEW ── */}
          {view === 'results' && results && (
            <>
              <div style={{
                background: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 20,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)', marginBottom: 15,
              }}>
                <h2 style={{ fontFamily: 'Cooper Black, serif', fontSize: 22, color: '#f37029', margin: '0 0 15px', textAlign: 'center' }}>
                  Results
                </h2>

                {results.scores.map((s: any, i: number) => (
                  <div key={s.id} style={{
                    background: i === 0 ? 'linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)' : '#f5f5f5',
                    borderRadius: 10, padding: 15, marginBottom: 10,
                    border: i === 0 ? '2px solid #ffc107' : '1px solid #e0e0e0',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 16, color: '#333' }}>
                        {i === 0 ? '🏆 ' : ''}{s.name}
                      </span>
                      <span style={{ fontFamily: 'Cooper Black, serif', fontSize: 20, color: '#f37029' }}>
                        {s.score} pts
                      </span>
                    </div>
                    <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#666', margin: '0 0 6px' }}>
                      {s.words.length} words found, {s.uniqueWords.length} unique
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {s.words.map((w: string, wi: number) => {
                        const isDuplicate = results.duplicates.includes(w)
                        return (
                          <span key={wi} style={{
                            background: isDuplicate ? '#ffcdd2' : '#e8f5e9',
                            borderRadius: 4, padding: '2px 8px',
                            fontFamily: 'Cooper Light, serif', fontSize: 12,
                            color: isDuplicate ? '#c62828' : '#2e7d32',
                            textDecoration: isDuplicate ? 'line-through' : 'none',
                          }}>{w}</span>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {results.duplicates.length > 0 && (
                  <p style={{ fontFamily: 'Cooper Light, serif', fontSize: 12, color: '#999', textAlign: 'center', margin: '10px 0 0' }}>
                    Crossed out words were found by both players (no points)
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={backToLobby} style={{
                  flex: 1, padding: '14px 20px', background: '#3a7b3c', color: '#fff',
                  border: 'none', borderRadius: 10, fontFamily: 'Cooper Black, serif',
                  fontSize: 16, cursor: 'pointer',
                }}>Play Again</button>
                <a href="/dashboard" style={{
                  flex: 1, padding: '14px 20px', background: 'rgba(255,255,255,0.92)', color: '#333',
                  border: '1px solid rgba(0,0,0,0.12)', borderRadius: 20, fontFamily: 'Cooper Light, system-ui, sans-serif',
                  fontSize: 13, textDecoration: 'none', textAlign: 'center', cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}>{'←'} Dashboard</a>
              </div>
            </>
          )}

        </div>
      </div>
    </MoodWrapper>
  )
}
