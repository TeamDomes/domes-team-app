'use client'

import MoodWrapper from '@/components/MoodWrapper'

const POINT_CATEGORIES = [
  {
    title: 'Daily Games',
    icon: '🎮',
    items: [
      { activity: 'Trivia — correct answer', points: 30 },
      { activity: 'Trivia — wrong answer (thanks for playing!)', points: 10 },
      { activity: 'Wordle — solved it', points: 30 },
      { activity: 'Wordle — nice try', points: 10 },
      { activity: 'Boggle — winner of the match', points: 10 },
      { activity: 'Boggle — participated', points: 3 },
    ],
  },
  {
    title: 'Partner Spotlight',
    icon: '🌱',
    items: [
      { activity: 'Brand quiz — perfect score', points: 75 },
      { activity: 'Brand quiz — partial score', points: 30 },
    ],
  },
  {
    title: 'Community',
    icon: '💛',
    items: [
      { activity: 'Appreciation — giving one', points: 15 },
      { activity: 'Appreciation — receiving one', points: 25 },
      { activity: 'Pet Feed or Spotted — posting', points: 15 },
      { activity: 'Commenting on a post', points: 10 },
      { activity: 'Getting to Know You questionnaire', points: 50 },
    ],
  },
  {
    title: 'Google Reviews',
    icon: '⭐',
    items: [
      { activity: 'Customer mentions you by name (4+ stars)', points: 250 },
    ],
  },
  {
    title: 'BINGO Squares',
    icon: '🎯',
    items: [
      { activity: 'G — Perfect Attendance (on time all week)', points: 10 },
      { activity: 'B — Big Baskets (4+ items FT / 3+ items PT)', points: 15 },
      { activity: 'I — Upsell rate 10%+', points: 15 },
      { activity: 'N — Drawer accuracy within $0.50', points: 25 },
      { activity: 'O — Google Review mention', points: 0, note: '(250 pts already awarded above)' },
      { activity: 'BINGO! — all 5 squares', points: 1500 },
    ],
  },
  {
    title: 'Reward Tiers',
    icon: '🏆',
    items: [
      { activity: '500 points', points: null, note: '$5 Reward' },
      { activity: '1,000 points', points: null, note: '$15 Reward' },
      { activity: '1,500 points', points: null, note: '$25 Reward' },
    ],
  },
]

export default function PointsGuidePage() {
  return (
    <MoodWrapper>
      <div style={{ padding: 20 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'right', marginBottom: 10 }}>
            <a href="/dashboard" style={{
              background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
              padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333',
              textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block',
            }}>{'←'} Dashboard</a>
          </div>

          <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 25 }}>
            <h1 style={{
              fontFamily: 'Cooper Black, Georgia, serif', fontSize: 28, color: '#f37029',
              margin: 0, textShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}>
              {'💰'} How to Earn Points
            </h1>
            <p style={{
              fontFamily: 'Cooper Light, Georgia, serif', fontSize: 13, color: '#fff',
              marginTop: 5, background: 'rgba(0,0,0,0.45)', padding: '4px 12px',
              borderRadius: 20, display: 'inline-block'
            }}>
              Every point counts toward your next reward!
            </p>
          </div>

          {POINT_CATEGORIES.map((cat, ci) => (
            <div key={ci} style={{
              background: '#fff', borderRadius: 14, marginBottom: 16, overflow: 'hidden',
              boxShadow: '0 3px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                background: ci === POINT_CATEGORIES.length - 1 ? '#ffcb1f' : '#3a7b3c',
                padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span style={{ fontSize: 22 }}>{cat.icon}</span>
                <h2 style={{
                  fontFamily: 'Cooper Black, Georgia, serif', fontSize: 18,
                  color: ci === POINT_CATEGORIES.length - 1 ? '#543c2d' : '#fff', margin: 0
                }}>
                  {cat.title}
                </h2>
              </div>
              <div style={{ padding: '8px 0' }}>
                {cat.items.map((item, ii) => (
                  <div key={ii} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 18px',
                    background: ii % 2 === 0 ? '#fff' : '#f9f6ee',
                    borderBottom: ii < cat.items.length - 1 ? '1px solid #f0ebe0' : 'none'
                  }}>
                    <span style={{
                      fontFamily: 'Cooper Light, Georgia, serif', fontSize: 14,
                      color: '#543c2d', flex: 1
                    }}>
                      {item.activity}
                    </span>
                    <span style={{
                      fontFamily: 'Cooper Black, Georgia, serif',
                      fontSize: item.points === 1500 ? 18 : 16,
                      color: item.points === 1500 ? '#f37029' : item.points === null ? '#543c2d' : '#3a7b3c',
                      marginLeft: 12, whiteSpace: 'nowrap'
                    }}>
                      {item.points !== null ? `+${item.points}` : ''}
                      {item.note && (
                        <span style={{
                          fontFamily: 'Cooper Light, Georgia, serif',
                          fontSize: 12, color: '#888', marginLeft: 4
                        }}>
                          {item.note}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{
            background: 'rgba(0,0,0,0.35)', borderRadius: 12, padding: 15,
            textAlign: 'center', marginBottom: 20
          }}>
            <p style={{
              fontFamily: 'Cooper Light, Georgia, serif', fontSize: 12,
              color: '#f4e6b4', margin: 0
            }}>
              Game points (trivia, wordle, boggle) are capped at 500/week.
              BINGO and Google Review points have no cap.
            </p>
          </div>
        </div>
      </div>
    </MoodWrapper>
  )
}
