import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ALPHABET } from '../data/alphabet'
import type { LetterData } from '../types'

interface Props {
  speak: (text: string) => void
}

export function ABCExplorer({ speak }: Props) {
  const [selected, setSelected] = useState<LetterData | null>(null)
  const [wordIdx, setWordIdx] = useState(0)

  function selectLetter(letter: LetterData) {
    setSelected(letter)
    setWordIdx(0)
    const word = letter.words[0]
    speak(`${letter.letter}! … ${letter.letter} says "${letter.phonetic}". ${word.word}! ${word.word} starts with ${letter.letter}!`)
  }

  function nextWord() {
    if (!selected) return
    const next = (wordIdx + 1) % selected.words.length
    setWordIdx(next)
    const word = selected.words[next]
    speak(`${word.word}! ${word.word} starts with ${selected.letter}!`)
  }

  function close() {
    setSelected(null)
    speak('')
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-white text-3xl font-black">ABC Explorer</h2>
        <p className="text-gray-400 text-sm">Tap any letter!</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="grid grid-cols-4 gap-2">
          {ALPHABET.map(letter => (
            <motion.button
              key={letter.letter}
              whileTap={{ scale: 0.88 }}
              onClick={() => selectLetter(letter)}
              className="aspect-square rounded-2xl flex items-center justify-center shadow-md text-white text-4xl font-black"
              style={{ backgroundColor: letter.color }}
            >
              {letter.letter}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Letter detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 22 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6"
            style={{ backgroundColor: selected.color }}
          >
            <button
              onClick={close}
              className="absolute top-5 right-5 text-white/70 text-4xl font-light leading-none"
            >
              ✕
            </button>

            <motion.div
              key={selected.letter}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-white font-black"
              style={{ fontSize: '8rem', lineHeight: 1 }}
            >
              {selected.letter}
            </motion.div>

            <div className="text-white/80 text-2xl font-bold">
              says &ldquo;{selected.phonetic}&rdquo;
            </div>

            <motion.button
              key={wordIdx}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.92 }}
              onClick={nextWord}
              className="bg-white/20 rounded-3xl p-6 flex flex-col items-center gap-3 w-full max-w-xs active:bg-white/30"
            >
              <span className="text-8xl">{selected.words[wordIdx].emoji}</span>
              <span className="text-white text-3xl font-black">{selected.words[wordIdx].word}</span>
              <span className="text-white/60 text-base">Tap for next example →</span>
            </motion.button>

            <div className="flex gap-2 mt-2">
              {selected.words.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${i === wordIdx ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
