import { useCallback, useEffect, useRef, useState } from 'react'
import { itemById, itemsForSkill } from '../data/items'
import { buildTrial, chooseNextItem } from '../engine/session'
import { applyOutcome } from '../engine/progression'
import { trialReducer } from '../engine/trialEngine'
import type { Effect, Phase, Skill, TrialEvent, TrialState } from '../engine/types'
import * as store from '../store/store'
import type { Settings } from '../types'

interface UseTrialSessionArgs {
  skill: Skill
  settings: Settings
  speak: (text: string) => void
  speakAndWait: (text: string) => Promise<boolean>
}

export interface CelebrateState {
  show: boolean
  level: 'independent' | 'prompted'
}

export function useTrialSession({ skill, settings, speak, speakAndWait }: UseTrialSessionArgs) {
  const cfg = store.getConfig()

  const [trial, setTrial] = useState<TrialState | null>(null)
  const [celebrate, setCelebrate] = useState<CelebrateState>({ show: false, level: 'prompted' })
  const [shimmer, setShimmer] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)
  const [trialIndex, setTrialIndex] = useState(0)

  const trialRef = useRef<TrialState | null>(null)
  const gateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ rePresent: boolean } | null>(null)
  const lastItemId = useRef<string | undefined>(undefined)
  const presented = useRef(0) // counts non-re-presentation trials toward sessionLength
  const overrides = useRef<Record<string, Phase>>({}) // session-scoped guess-penalty demotions

  const clearTimers = useCallback(() => {
    if (gateTimer.current) clearTimeout(gateTimer.current)
    if (delayTimer.current) clearTimeout(delayTimer.current)
    gateTimer.current = null
    delayTimer.current = null
  }, [])

  const setLive = useCallback((s: TrialState | null) => {
    trialRef.current = s
    setTrial(s)
  }, [])

  const phaseFor = useCallback((itemId: string): Phase => {
    if (overrides.current[itemId]) return overrides.current[itemId]
    const it = itemById(itemId)
    return store.getItem(itemId, (it?.skill ?? skill) as Skill).phase
  }, [skill])

  // Forward declaration via ref so processEffects can call advance.
  const advanceRef = useRef<(rePresent: boolean) => void>(() => {})
  const dispatchRef = useRef<(e: TrialEvent) => void>(() => {})

  const processEffects = useCallback((effects: Effect[]) => {
    let celebrated = false
    for (const fx of effects) {
      switch (fx.type) {
        case 'speak': {
          // The gating prompt is the one spoken while still in PRESENT: await it, then open the gate.
          if (trialRef.current?.runtime === 'PRESENT') {
            speakAndWait(fx.text).then(ok => {
              if (ok && trialRef.current?.runtime === 'PRESENT') dispatchRef.current({ type: 'AUDIO_ENDED' })
            })
          } else {
            speak(fx.text)
          }
          break
        }
        case 'scheduleTimer': {
          if (fx.name === 'gate') {
            if (gateTimer.current) clearTimeout(gateTimer.current)
            gateTimer.current = setTimeout(
              () => dispatchRef.current({ type: 'GATE_ELAPSED', ts: performance.now() }),
              fx.ms,
            )
          } else {
            if (delayTimer.current) clearTimeout(delayTimer.current)
            delayTimer.current = setTimeout(() => dispatchRef.current({ type: 'DELAY_ELAPSED' }), fx.ms)
          }
          break
        }
        case 'clearTimer': {
          if (fx.name === 'gate' && gateTimer.current) { clearTimeout(gateTimer.current); gateTimer.current = null }
          if (fx.name === 'delay' && delayTimer.current) { clearTimeout(delayTimer.current); delayTimer.current = null }
          break
        }
        case 'celebrate': {
          celebrated = true
          setCelebrate({ show: true, level: fx.level })
          break
        }
        case 'haptic': {
          if (settings.enableHaptics && navigator.vibrate) navigator.vibrate([40, 30, 40])
          break
        }
        case 'shimmer': {
          setShimmer(n => n + 1)
          break
        }
        case 'recordOutcome': {
          const cur = trialRef.current
          if (cur) {
            const prev = store.getItem(cur.itemId, cur.skill)
            const next = applyOutcome(prev, fx.outcome, cfg, {
              now: Date.now(),
              session: store.getSession(),
              latencyMs: fx.latencyMs,
            })
            store.saveItem(next)
          }
          break
        }
        case 'endTrial': {
          pending.current = { rePresent: fx.rePresent }
          break
        }
      }
    }

    // Apply a guess penalty override for the rest of the session, if it fired.
    const cur = trialRef.current
    if (cur?.demotedThisTrial && cfg.guessPenaltyEnabled) {
      overrides.current[cur.itemId] = 'ZERO_DELAY'
    }

    // Advance now unless a celebration is playing (its overlay callback will advance).
    if (pending.current && !celebrated) {
      const { rePresent } = pending.current
      pending.current = null
      advanceRef.current(rePresent)
    }
  }, [cfg, settings.enableHaptics, speak, speakAndWait])

  const dispatch = useCallback((event: TrialEvent) => {
    const cur = trialRef.current
    if (!cur) return
    const step = trialReducer(cur, event, cfg)
    trialRef.current = step.state
    setTrial(step.state)
    processEffects(step.effects)
  }, [cfg, processEffects])
  dispatchRef.current = dispatch

  const startTrial = useCallback((itemId: string, phase: Phase) => {
    const item = itemById(itemId)
    if (!item) { setSessionDone(true); return }
    clearTimers()
    const ts = buildTrial(item, phase, cfg)
    setLive(ts)
    lastItemId.current = itemId
    dispatch({ type: 'START' })
  }, [cfg, clearTimers, dispatch, setLive])

  const advance = useCallback((rePresent: boolean) => {
    clearTimers()
    if (rePresent) {
      const id = lastItemId.current
      if (id) startTrial(id, phaseFor(id))
      return
    }
    presented.current += 1
    setTrialIndex(presented.current)
    if (presented.current >= cfg.sessionLength) {
      setLive(null)
      setSessionDone(true)
      return
    }
    const states: Record<string, ReturnType<typeof store.getItem>> = {}
    for (const s of store.itemsForSkill(skill)) states[s.itemId] = s
    const next = chooseNextItem(skill, states, cfg, {
      now: Date.now(),
      trialIndex: presented.current,
      lastItemId: lastItemId.current,
    })
    if (!next) { setLive(null); setSessionDone(true); return }
    startTrial(next.id, phaseFor(next.id))
  }, [cfg, clearTimers, phaseFor, setLive, skill, startTrial])
  advanceRef.current = advance

  // Called by the CelebrationOverlay when its animation completes.
  const onCelebrationDone = useCallback(() => {
    setCelebrate(c => ({ ...c, show: false }))
    if (pending.current) {
      const { rePresent } = pending.current
      pending.current = null
      advanceRef.current(rePresent)
    }
  }, [])

  // A tap from the UI: correction tap during ERROR, otherwise a normal response.
  const tap = useCallback((choiceId: string) => {
    const cur = trialRef.current
    if (!cur) return
    if (cur.runtime === 'ERROR') dispatch({ type: 'CORRECTION_TAP', choiceId })
    else dispatch({ type: 'TAP', choiceId, ts: performance.now() })
  }, [dispatch])

  const replayPrompt = useCallback(() => {
    const cur = trialRef.current
    if (cur) speak(cur.prompts.ask)
  }, [speak])

  // Kick off the first trial on mount / skill change.
  useEffect(() => {
    presented.current = 0
    overrides.current = {}
    setTrialIndex(0)
    setSessionDone(false)
    const states: Record<string, ReturnType<typeof store.getItem>> = {}
    for (const s of store.itemsForSkill(skill)) states[s.itemId] = s
    const first = chooseNextItem(skill, states, cfg, { now: Date.now(), trialIndex: 0, lastItemId: undefined })
      ?? itemsForSkill(skill)[0]
    if (first) startTrial(first.id, phaseFor(first.id))
    else setSessionDone(true)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill])

  return {
    trial,
    celebrate,
    shimmer,
    sessionDone,
    trialIndex,
    sessionLength: cfg.sessionLength,
    tap,
    replayPrompt,
    onCelebrationDone,
  }
}
