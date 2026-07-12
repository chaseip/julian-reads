import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CelebrationOverlay } from './CelebrationOverlay'
import { useTrialSession } from '../hooks/useTrialSession'
import { itemById } from '../data/items'
import type { Skill } from '../engine/types'
import type { Settings } from '../types'

interface Props {
  skill: Skill
  title: string
  settings: Settings
  speak: (text: string) => void
  speakAndWait: (text: string) => Promise<boolean>
  onExit: () => void
}

// One renderer for every engine-driven activity. Presentation differs only in the
// stimulus card and whether choices are letter tiles or word cards.
export function TrialActivity({ skill, title, settings, speak, speakAndWait, onExit }: Props) {
  const {
    trial, celebrate, shimmer, sessionDone, trialIndex, sessionLength,
    tap, replayPrompt, onCelebrationDone,
  } = useTrialSession({ skill, settings, speak, speakAndWait })

  const stimulusItem = trial ? itemById(trial.itemId) : undefined
  const lettersAsChoices = skill === 'first-letter'

  const gridCols = useMemo(() => {
    const n = trial?.choices.length ?? 2
    return n <= 2 ? 'grid-cols-2' : n === 3 ? 'grid-cols-3' : 'grid-cols-2'
  }, [trial?.choices.length])

  if (sessionDone) {
    return (
      <div className="flex flex-col h-full bg-gray-900 items-center justify-center p-8 gap-6 text-center">
        <div className="text-8xl">🏆</div>
        <h2 className="text-white text-3xl font-black">All done, Julian!</h2>
        <p className="text-gray-400">Great practicing today.</p>
        <button
          onClick={onExit}
          className="bg-indigo-600 text-white rounded-2xl px-8 py-4 text-xl font-black active:bg-indigo-500"
        >
          Home
        </button>
      </div>
    )
  }

  if (!trial) {
    return <div className="flex h-full items-center justify-center bg-gray-900 text-gray-500">Loading…</div>
  }

  const { runtime, inputEnabled, showHighlight, choices, correctId } = trial

  return (
    <div className="flex flex-col h-full bg-gray-900 p-4 gap-4">
      <CelebrationOverlay show={celebrate.show} level={celebrate.level} onDone={onCelebrationDone} />

      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-white text-2xl font-black">{title}</h2>
        <div className="text-gray-400 text-sm font-bold">
          {Math.min(trialIndex + 1, sessionLength)} / {sessionLength}
        </div>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden shrink-0">
        <div
          className="h-full bg-indigo-500 transition-all"
          style={{ width: `${(trialIndex / sessionLength) * 100}%` }}
        />
      </div>

      {/* Stimulus card */}
      <motion.button
        key={trial.itemId + runtime}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={replayPrompt}
        className="flex flex-col items-center justify-center bg-gray-800 rounded-3xl p-6 gap-3 flex-1 min-h-0 active:brightness-110"
      >
        {skill === 'word-touch' ? (
          <>
            <motion.span
              style={{ fontSize: '6rem', lineHeight: 1 }}
              animate={runtime === 'PRESENT' ? { scale: [1, 1.12, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              🔊
            </motion.span>
            <span className="text-gray-300 text-xl font-bold">Listen, then tap the word</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '6.5rem', lineHeight: 1 }}>{stimulusItem?.emoji}</span>
            {skill === 'first-letter' && (
              <span className="text-white text-3xl font-black">{stimulusItem?.display}</span>
            )}
            {skill === 'phonics-cvc' && (
              <span className="text-gray-300 text-lg font-bold">Sound it out…</span>
            )}
          </>
        )}
        <span className="text-gray-500 text-sm">Tap to hear again</span>
      </motion.button>

      {/* Wait shimmer while input is gated */}
      <div className="h-6 flex items-center justify-center shrink-0">
        {!inputEnabled && runtime !== 'CORRECT' && (
          <motion.span
            key={shimmer}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="text-indigo-300 font-bold"
          >
            Listen first…
          </motion.span>
        )}
        {runtime === 'ERROR' && (
          <span className="text-yellow-300 font-bold">Tap the glowing one</span>
        )}
      </div>

      {/* Choices */}
      <div className={`grid gap-3 ${gridCols} shrink-0`}>
        {choices.map(choice => {
          const isCorrect = choice.id === correctId
          const highlight = showHighlight && isCorrect
          const dimmed = !inputEnabled || (runtime === 'ERROR' && !isCorrect)
          const solved = runtime === 'CORRECT' && isCorrect
          const color = lettersAsChoices ? itemById(choice.id)?.color ?? '#4f46e5' : '#1f2937'

          return (
            <motion.button
              key={choice.id}
              whileTap={inputEnabled ? { scale: 0.9 } : {}}
              onClick={() => tap(choice.id)}
              disabled={!inputEnabled && runtime !== 'ERROR'}
              animate={solved ? { scale: [1, 1.15, 1] } : highlight ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={highlight ? { repeat: Infinity, duration: 0.9 } : { duration: 0.2 }}
              className={`rounded-3xl font-black text-white shadow-lg flex items-center justify-center transition-opacity ${
                lettersAsChoices ? 'aspect-square' : 'py-6 px-4'
              } ${dimmed ? 'opacity-40' : 'opacity-100'} ${
                highlight ? 'ring-4 ring-yellow-400 animate-pulse' : ''
              }`}
              style={{
                backgroundColor: solved ? '#16a34a' : color,
                fontSize: lettersAsChoices ? '3.5rem' : '2.25rem',
              }}
            >
              {choice.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
