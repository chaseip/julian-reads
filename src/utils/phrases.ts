import { ALPHABET } from '../data/alphabet'
import { SIGHT_WORDS } from '../data/sightWords'

export function getAllPhrases(): string[] {
  const set = new Set<string>()

  const add = (s: string) => set.add(s.trim())

  // Home
  add("Hi Julian! Let's learn today! Pick something to do!")

  // Settings
  add("Settings. You can change the voice and difficulty here.")
  add("Hi Julian! Great job today! Keep learning! You are doing amazing!")
  add("Progress has been reset.")
  add("All audio has been downloaded! The app will work instantly from now on.")

  // Match game fixed strings
  add("What letter does this start with?")
  add("Yes! Great job, Julian!")

  for (const letter of ALPHABET) {
    for (const word of letter.words) {
      // ABC Explorer / Letter Focus: main intro
      add(`${letter.letter}! … ${letter.letter} says "${letter.phonetic}". ${word.word}! ${word.word} starts with ${letter.letter}!`)
      // Tapping a word card inside the letter panel
      add(`${word.word}! ${word.word} starts with ${letter.letter}!`)
      // Match game question
      add(`What letter does ${word.word} start with?`)
      // Match game: picture card re-tap
      add(`${word.word}. What letter does ${word.word} start with?`)
      // Match correct
      add(`Yes! Great job, Julian! ${word.word} starts with ${letter.letter}!`)
      // Match hint (constant time delay)
      add(`${word.word} starts with the letter ${letter.letter}. Can you find the ${letter.letter}?`)
      // Match wrong / retry
      add(`Let's try again. ${word.word} starts with ${letter.letter}.`)
    }
    // Letter Focus auto-speak (first word only)
    const w0 = letter.words[0]
    add(`This is the letter ${letter.letter}. ${letter.letter} says "${letter.phonetic}". ${w0.word}! ${w0.word} starts with ${letter.letter}!`)
    // Letter Focus replay button
    add(`${letter.letter} says "${letter.phonetic}". ${w0.word}! ${w0.word} starts with ${letter.letter}!`)
  }

  // Sight words
  for (const sw of SIGHT_WORDS) {
    add(sw.speech)
  }

  return [...set]
}
