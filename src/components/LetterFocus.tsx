import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ALPHABET } from '../data/alphabet'

interface Props {
  speak: (text: string) => void
}

export function LetterFocus({ speak }: Props) {
  const [letterIdx, setLetterIdx] = useState(0)
  const [wordIdx, setWordIdx] = useState(0)
  const [autoSpoken, setAutoSpoken] = useState(false)

  const letter = ALPHABET[letterIdx]
  const word = letter.words[wordIdx]

  useEffect(() => {
    setAutoSpoken(false)
  }, [letterIdx, wordIdx])

  useEffect(() => {
    if (!autoSpoken) {
      const t = setTimeout(() => {
        speak(`This is the letter ${letter.letter}. ${letter.letter} says "${letter.phonetic}". ${word.word}! ${word.word} starts with ${letter.letter}!`)
        setAutoSpoken(true)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [autoSpoken, letter, word, speak])

  function advance() {
    const nextWord = (wordIdx + 1) % letter.words.length
    if (nextWord === 0) {
      const nextLetter = (letterIdx + 1) % ALPHABET.length
      setLetterIdx(nextLetter)
      setWordIdx(0)
    } else {
      setWordIdx(nextWord)
    }
  }

  function prev() {
    if (wordIdx > 0) {
      setWordIdx(wordIdx - 1)
    } else if (letterIdx > 0) {
      const prevLetter = letterIdx - 1
      setLetterIdx(prevLetter)
      setWordIdx(ALPHABET[prevLetter].words.length - 1)
    }
  }

  return (
    <div
      className="flex flex-col h-full items-center justify-between p-6"
      style={{ backgroundColor: letter.color }}
    >
      <div className="text-center w-full">
        <div className="text-white/70 text-xl font-bold mb-1">Letter {letterIdx + 1} of 26</div>
        <div className="flex gap-1 justify-center flex-wrap">
          {ALPHABET.map((l, i) => (
            <button
              key={l.letter}
              onClick={() => { setLetterIdx(i); setWordIdx(0) }}
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${i === letterIdx ? 'bg-white text-gray-900' : 'bg-white/20 text-white'}`}
            >
              {l.letter}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${letterIdx}-${wordIdx}`}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className="font-black text-white drop-shadow-xl"
            style={{ fontSize: '9rem', lineHeight: 1 }}
          >
            {letter.letter}
          </div>
          <div className="text-white/80 text-2xl font-semibold">says &ldquo;{letter.phonetic}&rdquo;</div>

          <button
            onClick={() => speak(`${letter.letter} says "${letter.phonetic}". ${word.word}! ${word.word} starts with ${letter.letter}!`)}
            className="bg-white/20 rounded-3xl p-5 flex flex-col items-center gap-3 active:bg-white/30 w-64"
          >
            <span style={{ fontSize: '6rem', lineHeight: 1 }}>{word.emoji}</span>
            <span className="text-white text-3xl font-black">{word.word}</span>
          </button>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-6 w-full justify-center">
        <button
          onClick={prev}
          className="bg-white/20 text-white rounded-2xl px-8 py-4 text-2xl font-black active:bg-white/30"
        >
          ← Back
        </button>
        <button
          onClick={advance}
          className="bg-white text-gray-900 rounded-2xl px-8 py-4 text-2xl font-black active:brightness-90"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
