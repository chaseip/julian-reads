export type Screen = 'home' | 'abc' | 'focus' | 'match' | 'sightwords' | 'settings'

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

export interface Progress {
  letterAttempts: Record<string, number>
  letterCorrect: Record<string, number>
  sightAttempts: Record<string, number>
  sightCorrect: Record<string, number>
  lastSeen: Record<string, number>
}

export interface Settings {
  voiceName: string
  voiceRate: number
  matchChoices: 2 | 3 | 4
  enableHaptics: boolean
}
