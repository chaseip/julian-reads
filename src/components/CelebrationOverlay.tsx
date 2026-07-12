import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  show: boolean
  onDone: () => void
  level?: 'independent' | 'prompted'
}

const STARS = ['⭐', '🌟', '✨', '🎉', '🎊', '🏆', '👏']

export function CelebrationOverlay({ show, onDone, level = 'prompted' }: Props) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; emoji: string }>>([])

  // Independence earns a bigger, longer celebration than a prompted success.
  const independent = level === 'independent'
  const count = independent ? 16 : 8
  const duration = independent ? 2200 : 1200
  const message = independent ? 'All by yourself! 🌟' : 'Nice tapping! 👏'

  useEffect(() => {
    if (!show) return
    const items = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      emoji: STARS[Math.floor(Math.random() * STARS.length)],
    }))
    setParticles(items)
    const timer = setTimeout(onDone, duration)
    return () => clearTimeout(timer)
  }, [show, onDone, count, duration])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {particles.map(p => (
            <motion.div
              key={p.id}
              className="absolute text-5xl"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              initial={{ scale: 0, rotate: 0, opacity: 1 }}
              animate={{ scale: [0, 1.5, 0], rotate: 360, opacity: [1, 1, 0] }}
              transition={{ duration: independent ? 1.8 : 1.0, delay: Math.random() * 0.3 }}
            >
              {p.emoji}
            </motion.div>
          ))}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-center"
          >
            <div className={independent ? 'text-8xl' : 'text-6xl'}>{independent ? '🎉' : '👍'}</div>
            <div className="text-white text-3xl font-bold mt-2 drop-shadow-lg">{message}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
