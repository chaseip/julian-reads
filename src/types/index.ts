export type { Skill } from '../engine/types'

export type Screen =
  | 'home'
  | 'abc'
  | 'focus'
  | 'wordtouch'
  | 'match'
  | 'sightwords'
  | 'phonics'
  | 'dashboard'
  | 'settings'

export interface WordEntry {
  word: string
  emoji: string
}

export interface LetterData {
  letter: string
  phonetic: string  // e.g. "aah"
  color: string
  words: WordEntry[]
}

export interface SightWord {
  word: string
  emoji: string
  speech: string
  category: 'functional' | 'sports' | 'basic'
}

export interface Settings {
  voiceName: string
  voiceRate: number
  enableHaptics: boolean
}
