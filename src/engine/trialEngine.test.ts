import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { initTrial, trialReducer, type TrialInit } from './trialEngine'
import { applyOutcome, newItemState } from './progression'
import type { Effect, EngineConfig, ItemState, Phase, TrialEvent, TrialState } from './types'

const cfg = DEFAULT_CONFIG

const baseInit = (itemPhase: Phase): TrialInit => ({
  itemId: 'dog',
  skill: 'word-touch',
  itemPhase,
  choices: [
    { id: 'dog', label: 'DOG' },
    { id: 'cat', label: 'CAT' },
  ],
  correctId: 'dog',
  prompts: {
    ask: 'Tap DOG.',
    model: 'This word is DOG',
    hint: 'DOG. Tap DOG.',
    praiseIndependent: 'You read it all by yourself!',
    praisePrompted: 'Good job tapping DOG!',
  },
})

// Drive a sequence of events, returning the final state and all effects emitted.
function run(state: TrialState, events: TrialEvent[], c: EngineConfig = cfg) {
  const effects: Effect[] = []
  let s = state
  for (const e of events) {
    const step = trialReducer(s, e, c)
    s = step.state
    effects.push(...step.effects)
  }
  return { state: s, effects }
}

const types = (fx: Effect[]) => fx.map(f => f.type)

describe('gating (anti-guessing)', () => {
  it('disables input until audio ends + gate elapses', () => {
    let s = initTrial(baseInit('DELAY_2S'))
    // START plays the prompt; input still disabled.
    ;({ state: s } = run(s, [{ type: 'START' }]))
    expect(s.inputEnabled).toBe(false)

    // A tap before the gate does nothing but shimmer, and leaks no correctness.
    const early = run(s, [{ type: 'TAP', choiceId: 'dog', ts: 10 }])
    expect(early.state.inputEnabled).toBe(false)
    expect(early.state.outcome).toBeNull()
    expect(types(early.effects)).toEqual(['shimmer'])

    // After audio + gate, input enables.
    ;({ state: s } = run(s, [{ type: 'AUDIO_ENDED' }, { type: 'GATE_ELAPSED', ts: 100 }]))
    expect(s.runtime).toBe('RESPOND')
    expect(s.inputEnabled).toBe(true)
  })
})

describe('zero-delay phase', () => {
  it('highlights from the start and a correct tap is prompted-correct', () => {
    let s = initTrial(baseInit('ZERO_DELAY'))
    ;({ state: s } = run(s, [{ type: 'START' }, { type: 'AUDIO_ENDED' }, { type: 'GATE_ELAPSED', ts: 0 }]))
    expect(s.showHighlight).toBe(true)
    const { state, effects } = run(s, [{ type: 'TAP', choiceId: 'dog', ts: 500 }])
    expect(state.runtime).toBe('CORRECT')
    const rec = effects.find(e => e.type === 'recordOutcome')
    expect(rec).toMatchObject({ outcome: 'prompted', latencyMs: 500 })
    expect(types(effects)).toContain('celebrate')
    expect(types(effects)).toContain('endTrial')
  })
})

describe('delayed phase', () => {
  it('tap before the delay prompt is independent-correct', () => {
    let s = initTrial(baseInit('DELAY_4S'))
    ;({ state: s } = run(s, [{ type: 'START' }, { type: 'AUDIO_ENDED' }, { type: 'GATE_ELAPSED', ts: 0 }]))
    expect(s.showHighlight).toBe(false)
    const { effects } = run(s, [{ type: 'TAP', choiceId: 'dog', ts: 1200 }])
    expect(effects.find(e => e.type === 'recordOutcome')).toMatchObject({ outcome: 'independent', latencyMs: 1200 })
  })

  it('after the delay prompt, a correct tap is prompted-correct', () => {
    let s = initTrial(baseInit('DELAY_4S'))
    ;({ state: s } = run(s, [
      { type: 'START' },
      { type: 'AUDIO_ENDED' },
      { type: 'GATE_ELAPSED', ts: 0 },
      { type: 'DELAY_ELAPSED' },
    ]))
    expect(s.showHighlight).toBe(true)
    const { effects } = run(s, [{ type: 'TAP', choiceId: 'dog', ts: 5000 }])
    expect(effects.find(e => e.type === 'recordOutcome')).toMatchObject({ outcome: 'prompted' })
    // the hint was spoken when the delay elapsed
  })
})

describe('error correction & re-presentation', () => {
  it('records an error, models the answer, and re-presents on touch-the-model', () => {
    let s = initTrial(baseInit('DELAY_2S'))
    ;({ state: s } = run(s, [{ type: 'START' }, { type: 'AUDIO_ENDED' }, { type: 'GATE_ELAPSED', ts: 0 }]))

    const wrong = run(s, [{ type: 'TAP', choiceId: 'cat', ts: 800 }])
    s = wrong.state
    expect(s.runtime).toBe('ERROR')
    expect(s.showHighlight).toBe(true)
    expect(wrong.effects.find(e => e.type === 'recordOutcome')).toMatchObject({ outcome: 'error' })
    // No endTrial yet — never advance past an error.
    expect(types(wrong.effects)).not.toContain('endTrial')

    // Tapping a wrong answer during correction re-models, does not advance.
    const stillWrong = run(s, [{ type: 'CORRECTION_TAP', choiceId: 'cat' }])
    expect(types(stillWrong.effects)).not.toContain('endTrial')

    // Touching the modeled answer re-presents the same trial.
    const fixed = run(s, [{ type: 'CORRECTION_TAP', choiceId: 'dog' }])
    expect(fixed.effects.find(e => e.type === 'endTrial')).toMatchObject({ rePresent: true })
  })
})

describe('phase progression', () => {
  it('ZERO_DELAY -> DELAY_2S after 3 consecutive prompted-correct', () => {
    let item = newItemState('dog', 'word-touch')
    for (let i = 0; i < 3; i++) {
      item = applyOutcome(item, 'prompted', cfg, { now: i, session: 1, latencyMs: 100 })
    }
    expect(item.phase).toBe('DELAY_2S')
    expect(item.consecutivePrompted).toBe(0)
  })

  it('DELAY_2S -> DELAY_4S after 3 consecutive independent-correct', () => {
    let item = { ...newItemState('dog', 'word-touch'), phase: 'DELAY_2S' as Phase }
    for (let i = 0; i < 3; i++) {
      item = applyOutcome(item, 'independent', cfg, { now: i, session: 1, latencyMs: 100 })
    }
    expect(item.phase).toBe('DELAY_4S')
  })

  it('two consecutive errors at a delayed phase demote one phase', () => {
    let item = { ...newItemState('dog', 'word-touch'), phase: 'DELAY_4S' as Phase }
    item = applyOutcome(item, 'error', cfg, { now: 0, session: 1, latencyMs: -1 })
    item = applyOutcome(item, 'error', cfg, { now: 1, session: 1, latencyMs: -1 })
    expect(item.phase).toBe('DELAY_2S')
  })

  it('an independent-correct resets the error streak (no demotion)', () => {
    let item = { ...newItemState('dog', 'word-touch'), phase: 'DELAY_4S' as Phase }
    item = applyOutcome(item, 'error', cfg, { now: 0, session: 1, latencyMs: -1 })
    item = applyOutcome(item, 'independent', cfg, { now: 1, session: 1, latencyMs: 100 })
    item = applyOutcome(item, 'error', cfg, { now: 2, session: 1, latencyMs: -1 })
    expect(item.phase).toBe('DELAY_4S')
  })

  it('reaches MASTERED only with the mastery window across >=2 sessions', () => {
    let item = { ...newItemState('dog', 'word-touch'), phase: 'DELAY_4S' as Phase }
    // 3 independent in a single session: streak met but sessions<2 -> not mastered.
    for (let i = 0; i < 3; i++) {
      item = applyOutcome(item, 'independent', cfg, { now: i, session: 1, latencyMs: 100 })
    }
    expect(item.phase).toBe('DELAY_4S')
    // Continue in a second session until the mastery window is satisfied.
    for (let i = 0; i < 9 && item.phase === 'DELAY_4S'; i++) {
      item = applyOutcome(item, 'independent', cfg, { now: 10 + i, session: 2, latencyMs: 100 })
    }
    expect(item.phase).toBe('MASTERED')
    expect(item.nextReviewAt).toBeGreaterThan(0)
    // A further success moves it into the long-term maintenance cycle.
    item = applyOutcome(item, 'independent', cfg, { now: 100, session: 2, latencyMs: 100 })
    expect(item.phase).toBe('MAINTENANCE')
  })

  it('a maintenance miss demotes to DELAY_4S', () => {
    let item: ItemState = { ...newItemState('dog', 'word-touch'), phase: 'MAINTENANCE', maintenanceIndex: 1, nextReviewAt: 999 }
    item = applyOutcome(item, 'error', cfg, { now: 0, session: 3, latencyMs: -1 })
    expect(item.phase).toBe('DELAY_4S')
    expect(item.nextReviewAt).toBeUndefined()
  })

  it('caps history at the configured ring-buffer size', () => {
    const small: EngineConfig = { ...cfg, historyCap: 5 }
    let item = newItemState('dog', 'word-touch')
    for (let i = 0; i < 20; i++) {
      item = applyOutcome(item, 'prompted', small, { now: i, session: 1, latencyMs: 1 })
    }
    expect(item.history.length).toBe(5)
    expect(item.history[item.history.length - 1].ts).toBe(19)
  })
})
