export type MoodKey = 'bunny' | 'cat' | 'hound' | 'lion' | 'elephant' | 'squirrel' | 'shark'

export interface Mood {
  key: MoodKey
  label: string
  emoji: string
  tagline: string
  bg: string
  bgGradient: string
  pattern?: string
  textColor: string
  mutedColor: string
  cardBg: string
  accent: string
}

export const MOODS: Record<MoodKey, Mood> = {
  bunny: {
    key: 'bunny',
    label: 'Bunny',
    emoji: '🐰',
    tagline: 'Soft & sweet',
    bg: '#f8e8f0',
    bgGradient: 'linear-gradient(135deg, #f8e8f0 0%, #f0d8e8 50%, #fce8f4 100%)',
    pattern: `radial-gradient(circle at 15% 85%, rgba(212,67,106,0.06) 0%, transparent 40%),
              radial-gradient(circle at 85% 15%, rgba(200,140,180,0.06) 0%, transparent 40%)`,
    textColor: '#4a1a30',
    mutedColor: '#9a6a80',
    cardBg: 'rgba(255,255,255,0.88)',
    accent: '#d4436a',
  },
  cat: {
    key: 'cat',
    label: 'Cat',
    emoji: '🐱',
    tagline: 'Cool & mysterious',
    bg: '#f0e6f6',
    bgGradient: 'linear-gradient(135deg, #f0e6f6 0%, #e0d0f0 50%, #f5e6ff 100%)',
    pattern: `radial-gradient(ellipse at 10% 90%, rgba(123,94,167,0.07) 0%, transparent 50%),
              radial-gradient(ellipse at 90% 10%, rgba(160,120,200,0.05) 0%, transparent 50%)`,
    textColor: '#3d2a5c',
    mutedColor: '#7b5ea7',
    cardBg: 'rgba(255,255,255,0.85)',
    accent: '#7b5ea7',
  },
  hound: {
    key: 'hound',
    label: 'Hound',
    emoji: '🐶',
    tagline: 'Loyal & warm',
    bg: '#ede4d8',
    bgGradient: 'linear-gradient(135deg, #ede4d8 0%, #e0d4c4 50%, #f0e8dc 100%)',
    pattern: `repeating-linear-gradient(90deg, rgba(84,60,45,0.02) 0px, rgba(84,60,45,0.02) 1px, transparent 1px, transparent 30px),
              repeating-linear-gradient(0deg, rgba(84,60,45,0.02) 0px, rgba(84,60,45,0.02) 1px, transparent 1px, transparent 30px)`,
    textColor: '#3a2a1a',
    mutedColor: '#7a6a5a',
    cardBg: 'rgba(255,255,255,0.88)',
    accent: '#8B5E3C',
  },
  lion: {
    key: 'lion',
    label: 'Lion',
    emoji: '🦁',
    tagline: 'Bold & fierce',
    bg: '#fff3e0',
    bgGradient: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 50%, #fff8e1 100%)',
    pattern: `repeating-linear-gradient(45deg, rgba(243,112,41,0.03) 0px, rgba(243,112,41,0.03) 2px, transparent 2px, transparent 20px),
              repeating-linear-gradient(-45deg, rgba(200,168,78,0.04) 0px, rgba(200,168,78,0.04) 2px, transparent 2px, transparent 20px)`,
    textColor: '#5a2d0a',
    mutedColor: '#a06830',
    cardBg: 'rgba(255,255,255,0.9)',
    accent: '#f37029',
  },
  elephant: {
    key: 'elephant',
    label: 'Elephant',
    emoji: '🐘',
    tagline: 'Calm & wise',
    bg: '#e4e8ec',
    bgGradient: 'linear-gradient(135deg, #e4e8ec 0%, #d8dee4 50%, #eaeff4 100%)',
    pattern: `radial-gradient(circle at 30% 70%, rgba(100,120,140,0.05) 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, rgba(100,120,140,0.04) 0%, transparent 40%)`,
    textColor: '#2a3440',
    mutedColor: '#6a7a8a',
    cardBg: 'rgba(255,255,255,0.9)',
    accent: '#607080',
  },
  squirrel: {
    key: 'squirrel',
    label: 'Squirrel',
    emoji: '🐿️',
    tagline: 'Busy & bright',
    bg: '#e8f0e8',
    bgGradient: 'linear-gradient(135deg, #e8f0e8 0%, #d4e6d4 50%, #e0ece0 100%)',
    pattern: `radial-gradient(circle at 20% 50%, rgba(58,123,60,0.06) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(58,123,60,0.04) 0%, transparent 40%)`,
    textColor: '#2d4a2d',
    mutedColor: '#6b8a6b',
    cardBg: 'rgba(255,255,255,0.85)',
    accent: '#3a7b3c',
  },
  shark: {
    key: 'shark',
    label: 'Shark',
    emoji: '🦈',
    tagline: 'Focused & fast',
    bg: '#e0f0f8',
    bgGradient: 'linear-gradient(135deg, #e0f0f8 0%, #c8e4f4 50%, #e8f4fc 100%)',
    pattern: `repeating-linear-gradient(0deg, rgba(56,125,172,0.03) 0px, transparent 1px, transparent 40px, rgba(56,125,172,0.03) 41px),
              radial-gradient(ellipse at 50% 100%, rgba(56,125,172,0.06) 0%, transparent 60%)`,
    textColor: '#1a3a4a',
    mutedColor: '#4a7a8a',
    cardBg: 'rgba(255,255,255,0.88)',
    accent: '#387dac',
  },
}

export const MOOD_KEYS = Object.keys(MOODS) as MoodKey[]
export const DEFAULT_MOOD: MoodKey = 'lion'
