// Trial engine — shared types. Pure data, no React, no DOM.

export type Skill = 'word-touch' | 'sight-word' | 'first-letter' | 'phonics-cvc'

// Per-item instructional phase (Constant Time Delay schedule).
// NEW collapses into ZERO_DELAY the moment an item is first seen.
export type Phase =
  | 'ZERO_DELAY'
  | 'DELAY_2S'
  | 'DELAY_4S'
  | 'MASTERED'
  | 'MAINTENANCE'

export type Outcome = 'independent' | 'prompted' | 'error'

// One recorded response. History is a capped ring buffer on ItemState.
export interface TrialRecord {
  ts: number
  session: number // session counter at time of trial (for "across >=2 sessions")
  outcome: Outcome
  latencyMs: number // time from input-enable to tap; -1 if not applicable
}

// Persisted learning state for a single item.
export interface ItemState {
  itemId: string
  skill: Skill
  phase: Phase
  consecutiveIndependent: number
  consecutivePrompted: number
  consecutiveErrors: number
  history: TrialRecord[]
  firstSeenSession?: number
  lastSession?: number
  nextReviewAt?: number // maintenance scheduling (epoch ms)
  maintenanceIndex?: number // index into config.maintenanceSchedule
}

// Tunable thresholds — surfaced in the parent dashboard.
export interface EngineConfig {
  minWaitMs: number // gate after audio ends before input enables
  delayMs: Record<'DELAY_2S' | 'DELAY_4S', number> // CTD prompt delay per phase
  advancePrompted: number // consecutive prompted-correct to leave ZERO_DELAY
  advanceIndependent: number // consecutive independent-correct to advance a delayed phase
  demoteErrors: number // consecutive errors at a delayed phase to demote
  masteryWindow: number // trailing trials examined for the mastery criterion
  masteryIndependent: number // independent-corrects required within that window
  masterySessions: number // distinct sessions the window must span
  historyCap: number // ring-buffer size for ItemState.history
  guessPenaltyEnabled: boolean // 3 rapid early taps demote item to ZERO_DELAY for the session
  guessPenaltyTaps: number
  maintenanceSchedule: number[] // spaced-review offsets in ms (1d, 3d, 7d, 14d, 30d)
  acquisitionSize: number // non-mastered items in play at once (3-5)
  sessionLength: number // trials per session block
  choiceCount: number // response options shown (2-4)
  masteredInterleave: number // fraction of trials drawn from mastered/maintenance for success padding
}

// Runtime state of a single in-flight trial (transient, not persisted).
export type Runtime = 'PRESENT' | 'GATE' | 'RESPOND' | 'CORRECT' | 'ERROR'

export interface Choice {
  id: string
  label: string
  emoji?: string
}

export interface TrialPrompts {
  ask: string // "Tap DOG."
  model: string // "This word is DOG"
  hint: string // "DOG. Tap DOG."
  praiseIndependent: string // "You read it all by yourself!"
  praisePrompted: string // "Good job tapping DOG!"
}

export interface TrialState {
  itemId: string
  skill: Skill
  itemPhase: Phase
  choices: Choice[]
  correctId: string
  prompts: TrialPrompts
  runtime: Runtime
  inputEnabled: boolean
  showHighlight: boolean
  respondStartTs: number | null
  earlyTaps: number
  outcome: Outcome | null
  demotedThisTrial: boolean // guess-penalty fired
}

// Declarative effects the engine emits; the React host interprets them.
export type Effect =
  | { type: 'speak'; text: string }
  | { type: 'scheduleTimer'; name: 'gate' | 'delay'; ms: number }
  | { type: 'clearTimer'; name: 'gate' | 'delay' }
  | { type: 'celebrate'; level: 'independent' | 'prompted' }
  | { type: 'haptic' }
  | { type: 'shimmer' }
  | { type: 'recordOutcome'; outcome: Outcome; latencyMs: number }
  | { type: 'endTrial'; rePresent: boolean }

export type TrialEvent =
  | { type: 'START' }
  | { type: 'AUDIO_ENDED' }
  | { type: 'GATE_ELAPSED'; ts: number }
  | { type: 'DELAY_ELAPSED' }
  | { type: 'TAP'; choiceId: string; ts: number }
  | { type: 'CORRECTION_TAP'; choiceId: string }
