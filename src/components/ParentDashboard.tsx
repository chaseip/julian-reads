import { useMemo } from 'react'
import { useStore } from '../hooks/useStore'
import { itemsForSkill } from '../data/items'
import * as store from '../store/store'
import type { ItemState, Phase, Skill } from '../engine/types'

interface Props {
  speak: (text: string) => void
}

const SKILLS: { skill: Skill; label: string }[] = [
  { skill: 'word-touch', label: '👂 Word Touch' },
  { skill: 'sight-word', label: '👁️ Sight Words' },
  { skill: 'first-letter', label: '🔡 First Letter' },
  { skill: 'phonics-cvc', label: '🔊 Sound It Out' },
]

const PHASE_ORDER: Phase[] = ['ZERO_DELAY', 'DELAY_2S', 'DELAY_4S', 'MASTERED', 'MAINTENANCE']
const PHASE_LABEL: Record<Phase, string> = {
  ZERO_DELAY: '0s',
  DELAY_2S: '2s',
  DELAY_4S: '4s',
  MASTERED: 'Mastered',
  MAINTENANCE: 'Review',
}
const PHASE_COLOR: Record<Phase, string> = {
  ZERO_DELAY: 'bg-gray-600',
  DELAY_2S: 'bg-blue-600',
  DELAY_4S: 'bg-indigo-600',
  MASTERED: 'bg-green-600',
  MAINTENANCE: 'bg-emerald-700',
}

function stats(item: ItemState) {
  const recent = item.history.slice(-20)
  const independent = recent.filter(r => r.outcome === 'independent').length
  const prompted = recent.filter(r => r.outcome === 'prompted').length
  const errors = recent.filter(r => r.outcome === 'error').length
  const indepLat = recent.filter(r => r.outcome === 'independent' && r.latencyMs >= 0).map(r => r.latencyMs)
  const half = Math.floor(indepLat.length / 2)
  const firstAvg = avg(indepLat.slice(0, half))
  const lastAvg = avg(indepLat.slice(half))
  return { independent, prompted, errors, count: recent.length, firstAvg, lastAvg, indepLat }
}

function avg(xs: number[]): number | null {
  if (!xs.length) return null
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
}

// Tiny inline latency sparkline (independent-correct latencies over time).
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <span className="text-gray-600 text-xs">—</span>
  const max = Math.max(...points, 1)
  const w = 64
  const h = 18
  const step = w / (points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (p / max) * h).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={d} fill="none" stroke="#818cf8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function ParentDashboard({ speak: _speak }: Props) {
  const snapshot = useStore()

  const bySkill = useMemo(() => {
    return SKILLS.map(({ skill, label }) => {
      const bankItems = itemsForSkill(skill)
      const rows = bankItems
        .map(bi => ({ bank: bi, state: snapshot.items[bi.id] }))
        .filter(r => r.state && r.state.history.length > 0)
      return { skill, label, rows }
    }).filter(g => g.rows.length > 0)
  }, [snapshot])

  function promote(item: ItemState) {
    const i = PHASE_ORDER.indexOf(item.phase)
    if (i < PHASE_ORDER.length - 1) store.setItemPhase(item.itemId, item.skill, PHASE_ORDER[i + 1])
  }
  function demote(item: ItemState) {
    const i = PHASE_ORDER.indexOf(item.phase)
    if (i > 0) store.setItemPhase(item.itemId, item.skill, PHASE_ORDER[i - 1])
  }

  const totalSeen = Object.values(snapshot.items).filter(i => i.history.length > 0).length
  const mastered = Object.values(snapshot.items).filter(
    i => i.phase === 'MASTERED' || i.phase === 'MAINTENANCE',
  ).length

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-y-auto">
      <div className="p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
        <h2 className="text-white text-3xl font-black">Progress</h2>
        <p className="text-gray-400 text-sm mt-1">
          {totalSeen} words in play · {mastered} mastered · session #{snapshot.session}
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Watch latency <span className="text-indigo-300">fall</span> on independent taps — that's real
          recognition, not guessing.
        </p>
      </div>

      {bySkill.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No practice yet. Open an activity to start building progress.
        </div>
      )}

      {bySkill.map(group => (
        <div key={group.skill} className="p-4">
          <h3 className="text-white text-lg font-black mb-3">{group.label}</h3>
          <div className="flex flex-col gap-2">
            {group.rows.map(({ bank, state }) => {
              const st = stats(state!)
              const trend =
                st.firstAvg != null && st.lastAvg != null
                  ? st.lastAvg < st.firstAvg
                    ? '↓ faster'
                    : st.lastAvg > st.firstAvg
                      ? '↑ slower'
                      : '→'
                  : ''
              return (
                <div key={bank.id} className="bg-gray-800 rounded-2xl px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl w-8 text-center">{bank.emoji ?? '🔤'}</span>
                    <span className="text-white font-black text-lg w-24 truncate">{bank.label}</span>
                    <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${PHASE_COLOR[state!.phase]}`}>
                      {PHASE_LABEL[state!.phase]}
                    </span>
                    <div className="flex-1" />
                    <div className="flex gap-1">
                      <button
                        onClick={() => demote(state!)}
                        className="w-7 h-7 rounded-lg bg-gray-700 text-white font-black active:bg-gray-600"
                        title="Demote"
                      >
                        −
                      </button>
                      <button
                        onClick={() => promote(state!)}
                        className="w-7 h-7 rounded-lg bg-gray-700 text-white font-black active:bg-gray-600"
                        title="Promote"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 pl-11 text-xs">
                    <span className="text-green-400 font-bold">{st.independent} solo</span>
                    <span className="text-yellow-400 font-bold">{st.prompted} helped</span>
                    <span className="text-red-400 font-bold">{st.errors} miss</span>
                    <div className="flex-1" />
                    <Sparkline points={st.indepLat} />
                    <span className="text-indigo-300 font-bold w-16 text-right">{trend}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
