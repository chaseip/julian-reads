// The item bank. Restructures sight words + alphabet (and a CVC pilot) into a
// uniform Item shape the trial engine consumes. Prompt phrases here must match
// the strings emitted by scripts/generate_audio.py so pre-generated audio resolves.
import { ALPHABET } from './alphabet'
import { SIGHT_WORDS } from './sightWords'
import { CVC_WORDS } from './cvc'
import type { Skill, TrialPrompts } from '../engine/types'

export interface Item {
  id: string
  skill: Skill
  label: string // the token the child selects (WORD or LETTER)
  display: string // stimulus text (word for word-touch/first-letter; word for sight-word)
  emoji?: string
  color?: string
  priority: number // lower = taught earlier (safety words first)
  distractorPool: string[] // ordered item ids, visually dissimilar first
  prompts: TrialPrompts
  cvc?: { onset: string; vowel: string; coda: string } // phonics schema (Step 9)
}

const GENERIC_INDEPENDENT_PRAISE = 'You did it all by yourself!'

// Crude visual-dissimilarity ordering: different first letter and different length first.
function orderDistractors(target: Item, pool: Item[]): string[] {
  return pool
    .filter(p => p.id !== target.id)
    .map(p => {
      const sameFirst = p.label[0] === target.label[0] ? 1 : 0
      const lenDelta = Math.abs(p.label.length - target.label.length)
      // dissimilar = big length delta, different first letter -> sort ascending by similarity
      const similarity = sameFirst * 2 - Math.min(lenDelta, 3)
      return { id: p.id, similarity }
    })
    .sort((a, b) => a.similarity - b.similarity)
    .map(x => x.id)
}

// ---- Word Touch (receptive reading: hear the word, find the written word) ----
function wordTouchPrompts(w: string): TrialPrompts {
  return {
    ask: `Tap ${w}.`,
    model: `This word is ${w}.`,
    hint: `${w}. Tap ${w}.`,
    praiseIndependent: GENERIC_INDEPENDENT_PRAISE,
    praisePrompted: `Good job tapping ${w}!`,
  }
}

// ---- Sight Words (picture -> word: read the word that matches the picture) ----
function sightWordPrompts(w: string): TrialPrompts {
  return {
    ask: `Which word is this?`,
    model: `This word is ${w}.`,
    hint: `${w}. Tap ${w}.`,
    praiseIndependent: GENERIC_INDEPENDENT_PRAISE,
    praisePrompted: `Good job tapping ${w}!`,
  }
}

// ---- First Letter (what letter does this word start with?) ----
function firstLetterPrompts(word: string, letter: string): TrialPrompts {
  return {
    ask: `What letter does ${word} start with?`,
    model: `${word} starts with ${letter}.`,
    hint: `${word} starts with ${letter}. Tap ${letter}.`,
    praiseIndependent: GENERIC_INDEPENDENT_PRAISE,
    praisePrompted: `Good job! ${word} starts with ${letter}.`,
  }
}

// ---- Phonics CVC (sound out the word) ----
function cvcPrompts(word: string, onset: string, vowel: string, coda: string): TrialPrompts {
  return {
    ask: `Sound it out. ${onset}... ${vowel}... ${coda}. What word?`,
    model: `${onset}... ${vowel}... ${coda}. ${word}.`,
    hint: `${word}. Tap ${word}.`,
    praiseIndependent: GENERIC_INDEPENDENT_PRAISE,
    praisePrompted: `Good job sounding out ${word}!`,
  }
}

const CATEGORY_PRIORITY: Record<string, number> = { functional: 0, basic: 1000, sports: 2000 }

function buildWordTouch(): Item[] {
  const items: Item[] = SIGHT_WORDS.map((w, i) => ({
    id: `wt-${w.word}`,
    skill: 'word-touch' as Skill,
    label: w.word,
    display: w.word,
    emoji: w.emoji,
    priority: CATEGORY_PRIORITY[w.category] + i,
    distractorPool: [],
    prompts: wordTouchPrompts(w.word),
  }))
  items.forEach(it => (it.distractorPool = orderDistractors(it, items)))
  return items
}

function buildSightWords(): Item[] {
  const items: Item[] = SIGHT_WORDS.map((w, i) => ({
    id: `sw-${w.word}`,
    skill: 'sight-word' as Skill,
    label: w.word,
    display: w.word,
    emoji: w.emoji,
    priority: CATEGORY_PRIORITY[w.category] + i,
    distractorPool: [],
    prompts: sightWordPrompts(w.word),
  }))
  items.forEach(it => (it.distractorPool = orderDistractors(it, items)))
  return items
}

function buildFirstLetter(): Item[] {
  const items: Item[] = ALPHABET.map((l, i) => {
    const word = l.words[0].word
    return {
      id: `fl-${l.letter}`,
      skill: 'first-letter' as Skill,
      label: l.letter,
      display: word,
      emoji: l.words[0].emoji,
      color: l.color,
      priority: i,
      distractorPool: [],
      prompts: firstLetterPrompts(word, l.letter),
    }
  })
  items.forEach(it => (it.distractorPool = orderDistractors(it, items)))
  return items
}

function buildCvc(): Item[] {
  const items: Item[] = CVC_WORDS.map((c, i) => ({
    id: `cvc-${c.word}`,
    skill: 'phonics-cvc' as Skill,
    label: c.word,
    display: c.word,
    emoji: c.emoji,
    priority: i,
    distractorPool: [],
    prompts: cvcPrompts(c.word, c.onset, c.vowel, c.coda),
    cvc: { onset: c.onset, vowel: c.vowel, coda: c.coda },
  }))
  items.forEach(it => (it.distractorPool = orderDistractors(it, items)))
  return items
}

export const ITEMS: Item[] = [
  ...buildWordTouch(),
  ...buildSightWords(),
  ...buildFirstLetter(),
  ...buildCvc(),
]

const BY_ID = new Map(ITEMS.map(it => [it.id, it]))

export function itemById(id: string): Item | undefined {
  return BY_ID.get(id)
}

export function itemsForSkill(skill: Skill): Item[] {
  return ITEMS.filter(it => it.skill === skill).sort((a, b) => a.priority - b.priority)
}
