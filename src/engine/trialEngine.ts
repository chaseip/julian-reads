// The Trial Engine — a pure state machine for one trial's lifecycle.
// PRESENT -> GATE -> RESPOND -> (CORRECT | ERROR). No React, no timers, no DOM.
import type {
  Choice,
  EngineConfig,
  Effect,
  Outcome,
  Phase,
  Skill,
  TrialEvent,
  TrialPrompts,
  TrialState,
} from './types'

export interface TrialInit {
  itemId: string
  skill: Skill
  itemPhase: Phase
  choices: Choice[]
  correctId: string
  prompts: TrialPrompts
}

export function initTrial(init: TrialInit): TrialState {
  return {
    itemId: init.itemId,
    skill: init.skill,
    itemPhase: init.itemPhase,
    choices: init.choices,
    correctId: init.correctId,
    prompts: init.prompts,
    runtime: 'PRESENT',
    inputEnabled: false,
    showHighlight: false,
    respondStartTs: null,
    earlyTaps: 0,
    outcome: null,
    demotedThisTrial: false,
  }
}

// MASTERED/MAINTENANCE items behave like DELAY_4S during a probe.
function delayMsFor(phase: Phase, cfg: EngineConfig): number | null {
  switch (phase) {
    case 'ZERO_DELAY':
      return null // highlight from the start, no delay timer
    case 'DELAY_2S':
      return cfg.delayMs.DELAY_2S
    default:
      return cfg.delayMs.DELAY_4S
  }
}

export interface Step {
  state: TrialState
  effects: Effect[]
}

export function trialReducer(state: TrialState, event: TrialEvent, cfg: EngineConfig): Step {
  const effects: Effect[] = []

  switch (event.type) {
    case 'START': {
      if (state.runtime !== 'PRESENT') return { state, effects }
      effects.push({ type: 'speak', text: state.prompts.ask })
      return { state, effects }
    }

    case 'AUDIO_ENDED': {
      if (state.runtime !== 'PRESENT') return { state, effects }
      effects.push({ type: 'scheduleTimer', name: 'gate', ms: cfg.minWaitMs })
      return { state: { ...state, runtime: 'GATE' }, effects }
    }

    case 'GATE_ELAPSED': {
      if (state.runtime !== 'GATE') return { state, effects }
      const zeroDelay = state.itemPhase === 'ZERO_DELAY'
      const delayMs = delayMsFor(state.itemPhase, cfg)
      if (!zeroDelay && delayMs != null) {
        effects.push({ type: 'scheduleTimer', name: 'delay', ms: delayMs })
      }
      return {
        state: {
          ...state,
          runtime: 'RESPOND',
          inputEnabled: true,
          showHighlight: zeroDelay, // highlighted from the start only at zero delay
          respondStartTs: event.ts,
        },
        effects,
      }
    }

    case 'DELAY_ELAPSED': {
      if (state.runtime !== 'RESPOND' || state.showHighlight) return { state, effects }
      // CTD prompt arrives: highlight the answer and model it aloud.
      effects.push({ type: 'speak', text: state.prompts.hint })
      return { state: { ...state, showHighlight: true }, effects }
    }

    case 'TAP': {
      // Early tap while input is disabled — no information leak, just a gentle shimmer.
      if (!state.inputEnabled || (state.runtime !== 'RESPOND')) {
        if (state.runtime === 'PRESENT' || state.runtime === 'GATE') {
          const earlyTaps = state.earlyTaps + 1
          effects.push({ type: 'shimmer' })
          const penalize =
            cfg.guessPenaltyEnabled && !state.demotedThisTrial && earlyTaps >= cfg.guessPenaltyTaps
          return { state: { ...state, earlyTaps, demotedThisTrial: penalize || state.demotedThisTrial }, effects }
        }
        return { state, effects }
      }

      const latencyMs = state.respondStartTs != null ? Math.max(0, event.ts - state.respondStartTs) : -1

      if (event.choiceId === state.correctId) {
        const outcome: Outcome =
          state.itemPhase === 'ZERO_DELAY' || state.showHighlight ? 'prompted' : 'independent'
        effects.push({ type: 'clearTimer', name: 'delay' })
        effects.push({
          type: 'speak',
          text: outcome === 'independent' ? state.prompts.praiseIndependent : state.prompts.praisePrompted,
        })
        effects.push({ type: 'celebrate', level: outcome === 'independent' ? 'independent' : 'prompted' })
        effects.push({ type: 'haptic' })
        effects.push({ type: 'recordOutcome', outcome, latencyMs })
        effects.push({ type: 'endTrial', rePresent: false })
        return { state: { ...state, runtime: 'CORRECT', inputEnabled: false, outcome }, effects }
      }

      // Wrong: neutral error correction. Model the answer, require touch-the-model, re-present.
      effects.push({ type: 'clearTimer', name: 'delay' })
      effects.push({ type: 'speak', text: state.prompts.model })
      effects.push({ type: 'recordOutcome', outcome: 'error', latencyMs })
      return {
        state: { ...state, runtime: 'ERROR', showHighlight: true, outcome: 'error' },
        effects,
      }
    }

    case 'CORRECTION_TAP': {
      if (state.runtime !== 'ERROR') return { state, effects }
      if (event.choiceId !== state.correctId) {
        // Must touch the modeled (highlighted) answer; re-model gently otherwise.
        effects.push({ type: 'speak', text: state.prompts.model })
        return { state, effects }
      }
      effects.push({ type: 'endTrial', rePresent: true })
      return { state: { ...state, inputEnabled: false }, effects }
    }

    default:
      return { state, effects }
  }
}
