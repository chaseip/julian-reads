import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SIGHT_WORDS } from '../data/sightWords'
import type { SightWord } from '../types'

interface Props {
  speak: (text: string) => void
}

const CATEGORIES = [
  { key: 'all',        label: '⭐ All',    color: 'bg-indigo-600' },
  { key: 'functional', label: '🛑 Safety', color: 'bg-red-600' },
  { key: 'sports',     label: '🏆 Sports', color: 'bg-green-600' },
  { key: 'basic',      label: '💬 Basic',  color: 'bg-blue-600' },
] as const

export function SightWords({ speak }: Props) {
  const [category, setCategory] = useState<'all' | 'functional' | 'sports' | 'basic'>('all')
  const [idx, setIdx] = useState(0)

  const filtered = category === 'all' ? SIGHT_WORDS : SIGHT_WORDS.filter(w => w.category === category)
  const word: SightWord = filtered[idx % filtered.length]

  // Speak automatically whenever the card changes
  useEffect(() => {
    const t = setTimeout(() => speak(word.speech), 300)
    return () => clearTimeout(t)
  }, [idx, category, word.speech, speak])

  function next() {
    setIdx(i => (i + 1) % filtered.length)
  }

  function prev() {
    setIdx(i => (i - 1 + filtered.length) % filtered.length)
  }

  function switchCategory(cat: typeof category) {
    setCategory(cat)
    setIdx(0)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Category tabs */}
      <div className="flex gap-2 p-3 overflow-x-auto shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => switchCategory(cat.key)}
            className={`shrink-0 px-4 py-2 rounded-xl font-bold text-white text-sm transition-opacity ${cat.color} ${
              category === cat.key ? 'opacity-100 ring-2 ring-white' : 'opacity-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="text-center text-gray-400 text-sm py-1">
        {(idx % filtered.length) + 1} of {filtered.length}
      </div>

      {/* Main card — always shows emoji + word */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.button
            key={`${category}-${idx}`}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.35 }}
            onClick={() => speak(word.speech)}
            className="w-full max-w-sm bg-gray-800 rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl active:brightness-110"
          >
            <span style={{ fontSize: '7rem', lineHeight: 1 }}>{word.emoji}</span>

            <div
              className="text-white font-black text-center"
              style={{ fontSize: '3.5rem', letterSpacing: '0.05em' }}
            >
              {word.word}
            </div>

            <div className="text-gray-500 text-sm">Tap to hear it again</div>
          </motion.button>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 p-5 justify-center shrink-0">
        <button
          onClick={prev}
          className="bg-gray-700 text-white rounded-2xl px-8 py-4 text-2xl font-black active:bg-gray-600"
        >
          ←
        </button>
        <button
          onClick={next}
          className="bg-indigo-600 text-white rounded-2xl px-8 py-4 text-2xl font-black active:bg-indigo-500 flex-1 max-w-xs"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
