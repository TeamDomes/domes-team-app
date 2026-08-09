export type MoodKey = 'herb' | 'bunny' | 'cat' | 'hound' | 'lion' | 'elephant' | 'owl' | 'aquatic'

export interface Mood {
  key: MoodKey
  label: string
  emoji: string
  tagline: string
  wallpaper: string
  wallpaperPosition?: string
  wallpaperSize?: string
  bg: string
  bgGradient: string
  textColor: string
  mutedColor: string
  cardBg: string
  accent: string
}

export const MOODS: Record<MoodKey, Mood> = {
  herb: {
    key: 'herb',
    label: 'Lovin the Herb',
    emoji: '\u{1F33F}',
    tagline: 'The Classic Domes Vibe',
    wallpaper: '/images/cannabis-botanical.png',
    bg: '#2a4a3f',
    bgGradient: 'linear-gradient(135deg, #2a4a3f 0%, #1e3a30 50%, #2e5244 100%)',
    textColor: '#ffffff',
    mutedColor: 'rgba(255,255,255,0.5)',
    cardBg: 'rgba(255,255,255,0.9)',
    accent: '#c8a84e',
  },
  bunny: {
    key: 'bunny',
    label: 'Bunny',
    emoji: '\u{1F430}',
    tagline: 'Let\'s Play!',
    wallpaper: '/images/mood-bunny.png',
    bg: '#d6e8d4',
    bgGradient: 'linear-gradient(135deg, #d6e8d4 0%, #c8dcc6 50%, #daecd8 100%)',
    textColor: '#2a4a28',
    mutedColor: '#5a7a5a',
    cardBg: 'rgba(255,255,255,0.88)',
    accent: '#5a8a4a',
  },
  cat: {
    key: 'cat',
    label: 'Feline',
    emoji: '\u{1F431}',
    tagline: 'Cool Cat',
    wallpaper: '/images/mood-cat.png',
    bg: '#cce0cc',
    bgGradient: 'linear-gradient(135deg, #cce0cc 0%, #c0d6c0 50%, #d4e8d4 100%)',
    textColor: '#283828',
    mutedColor: '#4a6a4a',
    cardBg: 'rgba(255,255,255,0.85)',
    accent: '#4a7a48',
  },
  hound: {
    key: 'hound',
    label: 'Hound',
    emoji: '\u{1F436}',
    tagline: 'Chillin',
    wallpaper: '/images/mood-hound.png',
    bg: '#d0e4ce',
    bgGradient: 'linear-gradient(135deg, #d0e4ce 0%, #c4d8c2 50%, #d8ecd6 100%)',
    textColor: '#2a3a1a',
    mutedColor: '#5a7a4a',
    cardBg: 'rgba(255,255,255,0.88)',
    accent: '#6a8a4c',
  },
  lion: {
    key: 'lion',
    label: 'Lion',
    emoji: '\u{1F981}',
    tagline: 'Royalty Today',
    wallpaper: '/images/mood-lion.png',
    wallpaperPosition: '-60px -40px',
    bg: '#c8dcc6',
    bgGradient: 'linear-gradient(135deg, #c8dcc6 0%, #bcd0ba 50%, #d0e4ce 100%)',
    textColor: '#2a3c1a',
    mutedColor: '#5a7a48',
    cardBg: 'rgba(255,255,255,0.9)',
    accent: '#6a9a50',
  },
  elephant: {
    key: 'elephant',
    label: 'Elephant',
    emoji: '\u{1F418}',
    tagline: 'Patience',
    wallpaper: '/images/mood-elephant.png',
    bg: '#c4d8c2',
    bgGradient: 'linear-gradient(135deg, #c4d8c2 0%, #b8ccb6 50%, #cce0ca 100%)',
    textColor: '#243428',
    mutedColor: '#4a7448',
    cardBg: 'rgba(255,255,255,0.9)',
    accent: '#5a8a5c',
  },
  owl: {
    key: 'owl',
    label: 'Owl',
    emoji: '\u{1F989}',
    tagline: 'Feeling The Wisdom',
    wallpaper: '/images/mood-owl.png',
    bg: '#c8e0cc',
    bgGradient: 'linear-gradient(135deg, #c8e0cc 0%, #bcd4c0 50%, #d0e8d4 100%)',
    textColor: '#1a3820',
    mutedColor: '#3a7448',
    cardBg: 'rgba(255,255,255,0.85)',
    accent: '#3a7b3c',
  },
  aquatic: {
    key: 'aquatic',
    label: 'Aquatic',
    emoji: '\u{1F420}',
    tagline: 'In The Flow',
    wallpaper: '/images/mood-aquatic.png',
    bg: '#c0dce0',
    bgGradient: 'linear-gradient(135deg, #c0dce0 0%, #b4d4d8 50%, #c8e4e8 100%)',
    textColor: '#1a3a3a',
    mutedColor: '#3a7a7a',
    cardBg: 'rgba(255,255,255,0.88)',
    accent: '#2d8a8a',
  },
}

export const MOOD_KEYS = Object.keys(MOODS) as MoodKey[]
export const DEFAULT_MOOD: MoodKey = 'herb'
