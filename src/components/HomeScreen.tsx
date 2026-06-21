import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { Screen } from '../types'

interface Props {
  onNav: (s: Screen) => void
  speak: (text: string) => void
}

const TILES: { screen: Screen; emoji: string; label: string; color: string; desc: string }[] = [
  { screen: 'abc', emoji: '🔤', label: 'ABC', color: 'from-red-500 to-orange-500', desc: 'Learn letters' },
  { screen: 'match', emoji: '🎮', label: 'Match Game', color: 'from-green-500 to-teal-500', desc: 'Match pictures' },
  { screen: 'sightwords', emoji: '👁️', label: 'Sight Words', color: 'from-blue-500 to-indigo-500', desc: 'Learn words' },
  { screen: 'focus', emoji: '⭐', label: 'Letter Focus', color: 'from-purple-500 to-pink-500', desc: 'One letter at a time' },
]

export function HomeScreen({ onNav, speak }: Props) {
  useEffect(() => {
    const t = setTimeout(() => speak("Hi Julian! Let's learn today! Pick something to do!"), 400)
    return () => clearTimeout(t)
  }, [speak])

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-indigo-900 to-gray-900 p-4 gap-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center py-4"
      >
        <div className="text-6xl mb-2">📚</div>
        <h1 className="text-4xl font-black text-white tracking-wide">Hi Julian!</h1>
        <p className="text-indigo-300 text-xl mt-1">What do you want to learn?</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {TILES.map((tile, i) => (
          <motion.button
            key={tile.screen}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 + 0.2, type: 'spring' }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onNav(tile.screen)}
            className={`flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${tile.color} shadow-xl p-4 gap-2 active:brightness-90`}
          >
            <span className="text-6xl">{tile.emoji}</span>
            <span className="text-white text-2xl font-black">{tile.label}</span>
            <span className="text-white/80 text-sm font-medium">{tile.desc}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
