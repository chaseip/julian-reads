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
  stop: () => void
  onExit: () => void
}

// One renderer for every engine-driven activity. Presentation differs only in the
// stimulus card and whether choices are letter tiles or word cards.
export function TrialActivity({ skill, title, settings, speak, speakAndWait, stop, onExit }: Props) {
  const {
    trial, celebrate, shimmer, sessionDone, trialIndex, sessionLength,
    tap, replayPrompt, onCelebrationDone,
  } = useTrialSession({ skill, settings, speak, speakAndWait, stop })

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

      {/* Stimulus: a big wordless button that (re)plays the prompt when tapped.
          Word Touch has no picture (pure reading) — just a speaker. */}
      <div className="flex flex-col items-center gap-2 py-3 shrink-0">
        <motion.button
          key={trial.itemId}
          onClick={replayPrompt}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={
            runtime === 'PRESENT' || runtime === 'GATE'
              ? { scale: [1, 1.08, 1], opacity: 1 }
              : { scale: 1, opacity: 1 }
          }
          transition={
            runtime === 'PRESENT' || runtime === 'GATE'
              ? { scale: { repeat: Infinity, duration: 1.1 }, opacity: { duration: 0.3 } }
              : { duration: 0.3 }
          }
          className="relative rounded-full bg-indigo-600 active:bg-indigo-500 flex items-center justify-center shadow-2xl"
          style={{ width: '8.5rem', height: '8.5rem' }}
        >
          <span style={{ fontSize: '4.5rem', lineHeight: 1 }}>
            {skill === 'word-touch' ? '🔊' : stimulusItem?.emoji}
          </span>
          {skill !== 'word-touch' && (
            <span className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full px-1.5 text-xl">🔊</span>
          )}
        </motion.button>
        {skill === 'first-letter' && (
          <span className="text-white text-3xl font-black">{stimulusItem?.display}</span>
        )}
      </div>

      {/* Wordless status cue (a child who can't read shouldn't need to). */}
      <div className="h-9 flex items-center justify-center shrink-0">
        {!inputEnabled && runtime !== 'CORRECT' && (
          <motion.span
            key={shimmer}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.3 }}
            style={{ fontSize: '2rem' }}
          >
            👂
          </motion.span>
        )}
        {runtime === 'ERROR' && <span style={{ fontSize: '2rem' }}>👆</span>}
      </div>

      {/* Choices — the big, obvious targets that fill the rest of the screen. */}
      <div className={`grid gap-4 ${gridCols} flex-1 min-h-0 items-center`}>
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
              className={`rounded-3xl font-black text-white shadow-lg flex items-center justify-center transition-opacity h-full w-full ${
                dimmed ? 'opacity-40' : 'opacity-100'
              } ${highlight ? 'ring-8 ring-yellow-400 animate-pulse' : ''}`}
              style={{
                backgroundColor: solved ? '#16a34a' : color,
                fontSize: lettersAsChoices ? '4.5rem' : '3rem',
                letterSpacing: lettersAsChoices ? 0 : '0.05em',
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
