import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ALPHABET } from '../data/alphabet'
import { CelebrationOverlay } from './CelebrationOverlay'
import type { Settings } from '../types'

interface Props {
  speak: (text: string) => void
  settings: Settings
  onCorrect: (letter: string) => void
  onWrong: (letter: string) => void
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function buildRound(numChoices: number) {
  const allLetters = ALPHABET.map(l => l.letter)
  const target = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  const word = target.words[Math.floor(Math.random() * target.words.length)]
  const distractors = shuffle(allLetters.filter(l => l !== target.letter)).slice(0, numChoices - 1)
  const choices = shuffle([target.letter, ...distractors])
  return { target, word, choices }
}

export function MatchGame({ speak, settings, onCorrect, onWrong }: Props) {
  const [round, setRound] = useState(() => buildRound(settings.matchChoices))
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [streak, setStreak] = useState(0)

  const newRound = useCallback(() => {
    const r = buildRound(settings.matchChoices)
    setRound(r)
    setResult(null)
    setHintShown(false)
    setTimeout(() => {
      speak(`What letter does ${r.word.word} start with?`)
    }, 300)
  }, [settings.matchChoices, speak])

  useEffect(() => {
    speak(`What letter does ${round.word.word} start with?`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Constant Time Delay: show hint after 6 seconds of no answer
  useEffect(() => {
    if (result) return
    const t = setTimeout(() => {
      if (!result) {
        setHintShown(true)
        speak(`${round.word.word} starts with the letter ${round.target.letter}. Can you find the ${round.target.letter}?`)
      }
    }, 6000)
    return () => clearTimeout(t)
  }, [round, result, speak])

  function choose(letter: string) {
    if (result) return
    if (letter === round.target.letter) {
      setResult('correct')
      setStreak(s => s + 1)
      onCorrect(letter)
      setCelebrate(true)
      speak(`Yes! Great job, Julian! ${round.word.word} starts with ${letter}!`)
      if (settings.enableHaptics && navigator.vibrate) navigator.vibrate([50, 30, 50])
    } else {
      setResult('wrong')
      setStreak(0)
      onWrong(round.target.letter)
      speak(`Let's try again. ${round.word.word} starts with ${round.target.letter}.`)
      setTimeout(() => {
        setResult(null)
        setHintShown(true)
      }, 2000)
    }
  }

  const letterColor = ALPHABET.find(l => l.letter === round.target.letter)?.color ?? '#4f46e5'

  return (
    <div className="flex flex-col h-full bg-gray-900 p-4 gap-5">
      <CelebrationOverlay show={celebrate} onDone={() => { setCelebrate(false); newRound() }} />

      <div className="flex justify-between items-center">
        <h2 className="text-white text-2xl font-black">Match Game</h2>
        {streak > 1 && (
          <div className="bg-yellow-500 rounded-full px-3 py-1 text-black font-black text-sm">
            🔥 {streak} in a row!
          </div>
        )}
      </div>

      <div className="text-center text-gray-300 text-lg font-semibold">
        What letter does this start with?
      </div>

      {/* Picture card */}
      <motion.div
        key={round.word.word}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center bg-gray-800 rounded-3xl p-6 gap-3 mx-2"
        onClick={() => speak(`${round.word.word}. What letter does ${round.word.word} start with?`)}
      >
        <span style={{ fontSize: '7rem', lineHeight: 1 }}>{round.word.emoji}</span>
        <span className="text-white text-4xl font-black">{round.word.word}</span>
        <span className="text-gray-500 text-sm">Tap to hear it again</span>
      </motion.div>

      {/* Hint banner */}
      <AnimatePresence>
        {hintShown && !result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-600/30 border border-yellow-500 rounded-2xl px-4 py-2 text-center"
          >
            <span className="text-yellow-300 font-bold">
              Hint: look for the letter <span style={{ color: letterColor }} className="text-2xl font-black">{round.target.letter}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Letter choices */}
      <div className={`grid gap-3 ${settings.matchChoices <= 2 ? 'grid-cols-2' : settings.matchChoices === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {round.choices.map(letter => {
          const lData = ALPHABET.find(l => l.letter === letter)!
          const isCorrect = letter === round.target.letter
          let bg = lData.color
          if (result === 'correct' && isCorrect) bg = '#16a34a'
          if (result === 'wrong' && isCorrect) bg = '#16a34a'
          if (result === 'wrong' && !isCorrect) bg = '#374151'

          return (
            <motion.button
              key={letter}
              whileTap={{ scale: 0.88 }}
              onClick={() => choose(letter)}
              className="aspect-square rounded-3xl text-white font-black shadow-lg flex items-center justify-center"
              style={{ backgroundColor: bg, fontSize: '3.5rem' }}
              animate={result === 'correct' && isCorrect ? { scale: [1, 1.2, 1] } : {}}
            >
              {letter}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
