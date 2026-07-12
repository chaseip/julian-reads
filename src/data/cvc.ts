// Phonics CVC pilot (Step 9). Consonant-Vowel-Consonant words for sound-out blending.
// onset/vowel/coda are the three phonemes spoken during the sound-out prompt.
export interface CvcWord {
  word: string
  emoji: string
  onset: string // first sound, e.g. "d"
  vowel: string // middle sound, e.g. "o"
  coda: string // last sound, e.g. "g"
}

export const CVC_WORDS: CvcWord[] = [
  { word: 'CAT', emoji: '🐱', onset: 'k', vowel: 'a', coda: 't' },
  { word: 'DOG', emoji: '🐕', onset: 'd', vowel: 'o', coda: 'g' },
  { word: 'PIG', emoji: '🐷', onset: 'p', vowel: 'i', coda: 'g' },
  { word: 'SUN', emoji: '☀️', onset: 's', vowel: 'u', coda: 'n' },
  { word: 'HAT', emoji: '🎩', onset: 'h', vowel: 'a', coda: 't' },
  { word: 'BUS', emoji: '🚌', onset: 'b', vowel: 'u', coda: 's' },
  { word: 'BED', emoji: '🛏️', onset: 'b', vowel: 'e', coda: 'd' },
  { word: 'CUP', emoji: '🥤', onset: 'k', vowel: 'u', coda: 'p' },
]
