export type MoodKey = 'herb' | 'bunny' | 'cat' | 'hound' | 'lion' | 'elephant' | 'owl' | 'aquatic'

export interface Mood {
  key: MoodKey
  label: string
  emoji: string
  tagline: string
  wallpaper: string
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
    tagline: 'The classic Domes vibe',
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
    tagline: 'Warm and playful',
    wallpaper: '/images/mood-bunny.png',
    bg: '#f8f4f0',
    bgGradient: 'linear-gradient(135deg, #f8f4f0 0%, #f0ece6 50%, #faf6f0 100%)',
    textColor: '#4a3828',
    mutedColor: '#8a7a6a',
    cardBg: 'rgba(255,255,255,0.88)',
    accent: '#8a6a4a',
  },
  cat: {
    key: 'cat',
    label: 'Cat',
    emoji: '\u{1F431}',
    tagline: 'Intelligence vibes',
    wallpaper: '/images/mood-cat.png',
    bg: '#f6f4f0',
    bgGradient: 'linear-gradient(135deg, #f6f4f0 0%, #eae6e0 50%, #f8f6f2 100%)',
    textColor: '#3d3028',
    mutedColor: '#7a6e60',
    cardBg: 'rgba(255,255,255,0.85)',
    accent: '#6a5a48',
  },
  hound: {
    key: 'hound',
    label: 'Hound',
    emoji: '\u{1F436}',
    tagline: 'Loving humans today',
    wallpaper: '/images/mood-hound.png',
    bg: '#f4f2ee',
    bgGradient: 'linear-gradient(135deg, #f4f2ee 0%, #ece8e2 50%, #f6f4f0 100%)',
    textColor: '#3a2a1a',
    mutedColor: '#7a6a5a',
    cardBg: 'rgba(255,255,255,0.88)',
    accent: '#8B5E3C',
  },
  lion: {
    key: 'lion',
    label: 'Lion',
    emoji: '\u{1F981}',
    tagline: 'Royalty today',
    wallpaper: '/images/mood-lion.png',
    bg: '#e8e0d6',
    bgGradient: 'linear-gradient(135deg, #e8e0d6 0%, #ddd4c8 50%, #ece4da 100%)',
    textColor: '#4a3c2a',
    mutedColor: '#8a7a68',
    cardBg: 'rgba(255,255,255,0.9)',
    accent: '#a08860',
  },
  elephant: {
    key: 'elephant',
    label: 'Elephant',
    emoji: '\u{1F418}',
    tagline: 'Patience',
    wallpaper: '/images/mood-elephant.png',
    bg: '#d8d0c6',
    bgGradient: 'linear-gradient(135deg, #d8d0c6 0%, #cec4b8 50%, #dcd4ca 100%)',
    textColor: '#3a3428',
    mutedColor: '#7a7468',
    cardBg: 'rgba(255,255,255,0.9)',
    accent: '#8a7e6c',
  },
  owl: {
    key: 'owl',
    label: 'Owl',
    emoji: '\u{1F989}',
    tagline: 'Feeling the wisdom',
    wallpaper: '/images/mood-owl.png',
    bg: '#eae8e4',
    bgGradient: 'linear-gradient(135deg, #eae8e4 0%, #dedad4 50%, #eceae6 100%)',
    textColor: '#2a3830',
    mutedColor: '#5a7468',
    cardBg: 'rgba(255,255,255,0.85)',
    accent: '#4a7a6a',
  },
  aquatic: {
    key: 'aquatic',
    label: 'Aquatic',
    emoji: '\u{1F420}',
    tagline: 'Tapping into the unconscious',
    wallpaper: '/images/mood-aquatic.png',
    bg: '#f0f4f8',
    bgGradient: 'linear-gradient(135deg, #f0f4f8 0%, #e4ecf4 50%, #f4f6fa 100%)',
    textColor: '#1a3a4a',
    mutedColor: '#4a7a8a',
    cardBg: 'rgba(255,255,255,0.88)',
    accent: '#387dac',
  },
}

export const MOOD_KEYS = Object.keys(MOODS) as MoodKey[]
export const DEFAULT_MOOD: MoodKey = 'herb'
