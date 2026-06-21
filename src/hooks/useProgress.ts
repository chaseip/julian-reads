import { useState, useCallback } from 'react'
import type { Progress } from '../types'

const KEY = 'julian-reads-progress'

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { letterAttempts: {}, letterCorrect: {}, sightAttempts: {}, sightCorrect: {}, lastSeen: {} }
}

function save(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch {}
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(load)

  const recordLetter = useCallback((letter: string, correct: boolean) => {
    setProgress(prev => {
      const next = {
        ...prev,
        letterAttempts: { ...prev.letterAttempts, [letter]: (prev.letterAttempts[letter] ?? 0) + 1 },
        letterCorrect: { ...prev.letterCorrect, [letter]: (prev.letterCorrect[letter] ?? 0) + (correct ? 1 : 0) },
        lastSeen: { ...prev.lastSeen, [letter]: Date.now() },
      }
      save(next)
      return next
    })
  }, [])

  const recordSight = useCallback((word: string, correct: boolean) => {
    setProgress(prev => {
      const next = {
        ...prev,
        sightAttempts: { ...prev.sightAttempts, [word]: (prev.sightAttempts[word] ?? 0) + 1 },
        sightCorrect: { ...prev.sightCorrect, [word]: (prev.sightCorrect[word] ?? 0) + (correct ? 1 : 0) },
        lastSeen: { ...prev.lastSeen, [word]: Date.now() },
      }
      save(next)
      return next
    })
  }, [])

  const resetProgress = useCallback(() => {
    const empty: Progress = { letterAttempts: {}, letterCorrect: {}, sightAttempts: {}, sightCorrect: {}, lastSeen: {} }
    save(empty)
    setProgress(empty)
  }, [])

  const accuracyFor = useCallback((key: string, type: 'letter' | 'sight') => {
    const attempts = type === 'letter' ? progress.letterAttempts[key] : progress.sightAttempts[key]
    const correct = type === 'letter' ? progress.letterCorrect[key] : progress.sightCorrect[key]
    if (!attempts) return null
    return Math.round((correct / attempts) * 100)
  }, [progress])

  return { progress, recordLetter, recordSight, resetProgress, accuracyFor }
}
