// Per-item phase progression (CTD schedule). Pure functions over ItemState.
import type { EngineConfig, ItemState, Outcome, Phase, Skill, TrialRecord } from './types'

const DELAYED: Phase[] = ['DELAY_2S', 'DELAY_4S']

export function newItemState(itemId: string, skill: Skill): ItemState {
  return {
    itemId,
    skill,
    phase: 'ZERO_DELAY',
    consecutiveIndependent: 0,
    consecutivePrompted: 0,
    consecutiveErrors: 0,
    history: [],
  }
}

function demote(phase: Phase): Phase {
  switch (phase) {
    case 'DELAY_4S':
      return 'DELAY_2S'
    case 'DELAY_2S':
      return 'ZERO_DELAY'
    case 'MAINTENANCE':
      return 'DELAY_4S'
    case 'MASTERED':
      return 'DELAY_4S'
    default:
      return 'ZERO_DELAY'
  }
}

// Does the trailing history satisfy the mastery criterion for DELAY_4S -> MASTERED?
function meetsMastery(state: ItemState, cfg: EngineConfig): boolean {
  const window = state.history.slice(-cfg.masteryWindow)
  const independents = window.filter(r => r.outcome === 'independent').length
  const sessions = new Set(window.map(r => r.session)).size
  return independents >= cfg.masteryIndependent && sessions >= cfg.masterySessions
}

// On reaching criterion the item rests at MASTERED with its first probe scheduled.
// It relabels to MAINTENANCE only once it survives a spaced-review probe.
function enterMastery(state: ItemState, cfg: EngineConfig, now: number): ItemState {
  const index = 0
  return {
    ...state,
    phase: 'MASTERED',
    maintenanceIndex: index,
    nextReviewAt: now + cfg.maintenanceSchedule[index],
    consecutiveIndependent: 0,
    consecutivePrompted: 0,
    consecutiveErrors: 0,
  }
}

// Advance a maintenance item to its next spaced-review slot after a success.
function advanceMaintenance(state: ItemState, cfg: EngineConfig, now: number): ItemState {
  const next = Math.min(
    (state.maintenanceIndex ?? 0) + 1,
    cfg.maintenanceSchedule.length - 1,
  )
  return {
    ...state,
    phase: 'MAINTENANCE', // survived a probe -> long-term review
    maintenanceIndex: next,
    nextReviewAt: now + cfg.maintenanceSchedule[next],
  }
}

// Fold a single trial outcome into the item's persisted state.
export function applyOutcome(
  state: ItemState,
  outcome: Outcome,
  cfg: EngineConfig,
  ctx: { now: number; session: number; latencyMs: number },
): ItemState {
  const record: TrialRecord = {
    ts: ctx.now,
    session: ctx.session,
    outcome,
    latencyMs: ctx.latencyMs,
  }
  const history = [...state.history, record].slice(-cfg.historyCap)

  let s: ItemState = {
    ...state,
    history,
    firstSeenSession: state.firstSeenSession ?? ctx.session,
    lastSession: ctx.session,
  }

  // Update consecutive counters.
  if (outcome === 'error') {
    s = { ...s, consecutiveErrors: s.consecutiveErrors + 1, consecutiveIndependent: 0, consecutivePrompted: 0 }
  } else if (outcome === 'independent') {
    s = { ...s, consecutiveIndependent: s.consecutiveIndependent + 1, consecutivePrompted: 0, consecutiveErrors: 0 }
  } else {
    s = { ...s, consecutivePrompted: s.consecutivePrompted + 1, consecutiveIndependent: 0, consecutiveErrors: 0 }
  }

  // Mastered / maintenance: a miss demotes to DELAY_4S; a success reschedules the next probe.
  if (s.phase === 'MASTERED' || s.phase === 'MAINTENANCE') {
    if (outcome === 'error') {
      return demoteReset(s, 'DELAY_4S')
    }
    return advanceMaintenance(s, cfg, ctx.now)
  }

  // Demotion: N consecutive errors at a delayed phase drops one phase.
  if (DELAYED.includes(s.phase) && s.consecutiveErrors >= cfg.demoteErrors) {
    return demoteReset(s, demote(s.phase))
  }

  // Advancement.
  if (s.phase === 'ZERO_DELAY' && s.consecutivePrompted >= cfg.advancePrompted) {
    return advanceReset(s, 'DELAY_2S')
  }
  if (s.phase === 'DELAY_2S' && s.consecutiveIndependent >= cfg.advanceIndependent) {
    return advanceReset(s, 'DELAY_4S')
  }
  if (s.phase === 'DELAY_4S' && s.consecutiveIndependent >= cfg.advanceIndependent && meetsMastery(s, cfg)) {
    return enterMastery(s, cfg, ctx.now)
  }

  return s
}

function advanceReset(state: ItemState, phase: Phase): ItemState {
  return { ...state, phase, consecutiveIndependent: 0, consecutivePrompted: 0, consecutiveErrors: 0 }
}

function demoteReset(state: ItemState, phase: Phase): ItemState {
  return { ...state, phase, consecutiveIndependent: 0, consecutivePrompted: 0, consecutiveErrors: 0, nextReviewAt: undefined, maintenanceIndex: undefined }
}

// Session-scoped guess penalty: temporarily treat item as ZERO_DELAY (does not persist a phase change).
export function guessPenaltyPhase(state: ItemState): Phase {
  return state.phase === 'MASTERED' || state.phase === 'MAINTENANCE' ? state.phase : 'ZERO_DELAY'
}
