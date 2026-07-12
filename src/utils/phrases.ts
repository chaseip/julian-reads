import { ALPHABET } from '../data/alphabet'
import { ITEMS } from '../data/items'

export function getAllPhrases(): string[] {
  const set = new Set<string>()

  const add = (s: string) => set.add(s.trim())

  // Home
  add("Hi Julian! Let's learn today! Pick something to do!")

  // Settings
  add("Settings. You can change the voice and difficulty here.")

  // Trial engine prompts — every ask/model/hint/praise across the item bank.
  for (const item of ITEMS) {
    add(item.prompts.ask)
    add(item.prompts.model)
    add(item.prompts.hint)
    add(item.prompts.praiseIndependent)
    add(item.prompts.praisePrompted)
  }

  // ABC Explorer + Letter Focus (kept-as-is browse tools).
  for (const letter of ALPHABET) {
    for (const word of letter.words) {
      // ABC Explorer: main intro / Letter Focus replay
      add(`${letter.letter}! … ${letter.letter} says "${letter.phonetic}". ${word.word}! ${word.word} starts with ${letter.letter}!`)
      // Tapping a word card inside the letter panel
      add(`${word.word}! ${word.word} starts with ${letter.letter}!`)
      // Letter Focus auto-speak (every word)
      add(`This is the letter ${letter.letter}. ${letter.letter} says "${letter.phonetic}". ${word.word}! ${word.word} starts with ${letter.letter}!`)
      // Letter Focus replay button (every word)
      add(`${letter.letter} says "${letter.phonetic}". ${word.word}! ${word.word} starts with ${letter.letter}!`)
    }
  }

  return [...set]
}
