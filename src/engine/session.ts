// Session composition (distributed trials) + maintenance scheduling. Pure logic.
import { itemById, itemsForSkill, type Item } from '../data/items'
import { initTrial, type TrialInit } from './trialEngine'
import type { Choice, EngineConfig, ItemState, Phase, Skill, TrialState } from './types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const MASTERED_PHASES: Phase[] = ['MASTERED', 'MAINTENANCE']

function phaseOf(itemId: string, states: Record<string, ItemState>): Phase {
  return states[itemId]?.phase ?? 'ZERO_DELAY'
}

// The acquisition set: the highest-priority non-mastered items, capped at acquisitionSize.
export function acquisitionSet(skill: Skill, states: Record<string, ItemState>, cfg: EngineConfig): Item[] {
  return itemsForSkill(skill)
    .filter(it => !MASTERED_PHASES.includes(phaseOf(it.id, states)))
    .slice(0, cfg.acquisitionSize)
}

// Mastered/maintenance items available to interleave for success padding; due probes first.
function successItems(skill: Skill, states: Record<string, ItemState>, now: number): Item[] {
  const mastered = itemsForSkill(skill).filter(it => MASTERED_PHASES.includes(phaseOf(it.id, states)))
  const due = mastered.filter(it => (states[it.id]?.nextReviewAt ?? Infinity) <= now)
  return due.length ? due : mastered
}

export interface NextChoiceCtx {
  now: number
  trialIndex: number
  lastItemId?: string
}

// Pick which item to present next: interleave acquisition with mastered/maintenance,
// prefer due maintenance probes, and never repeat the immediately-previous item.
export function chooseNextItem(
  skill: Skill,
  states: Record<string, ItemState>,
  cfg: EngineConfig,
  ctx: NextChoiceCtx,
): Item | null {
  const acq = acquisitionSet(skill, states, cfg)
  const success = successItems(skill, states, ctx.now)
  const dueNow = success.filter(it => (states[it.id]?.nextReviewAt ?? Infinity) <= ctx.now)

  let pool: Item[]
  const useSuccess = success.length > 0 && (dueNow.length > 0 || Math.random() < cfg.masteredInterleave)
  if (acq.length === 0) {
    pool = success
  } else if (useSuccess) {
    pool = dueNow.length ? dueNow : success
  } else {
    pool = acq
  }
  if (pool.length === 0) pool = acq.length ? acq : success
  if (pool.length === 0) return null

  // Avoid immediate repeat when an alternative exists.
  const noRepeat = pool.filter(it => it.id !== ctx.lastItemId)
  const finalPool = noRepeat.length ? noRepeat : pool
  return shuffle(finalPool)[0]
}

// Choose distractors: dissimilar early phases, more-similar (harder) at higher phases.
function pickDistractors(item: Item, phase: Phase, cfg: EngineConfig): Item[] {
  const n = Math.max(1, cfg.choiceCount - 1)
  const pool = item.distractorPool
    .map(id => itemById(id))
    .filter((x): x is Item => !!x)
  if (pool.length === 0) return []
  const hard = phase === 'DELAY_4S' || phase === 'MASTERED' || phase === 'MAINTENANCE'
  const window = Math.min(pool.length, Math.max(n * 2, n + 1))
  const band = hard ? pool.slice(-window) : pool.slice(0, window)
  return shuffle(band).slice(0, n)
}

function toChoice(item: Item): Choice {
  return { id: item.id, label: item.label, emoji: item.emoji }
}

// Build a runnable trial for an item at its current (or overridden) phase.
export function buildTrial(item: Item, phase: Phase, cfg: EngineConfig): TrialState {
  const distractors = pickDistractors(item, phase, cfg)
  const choices = shuffle([item, ...distractors]).map(toChoice)
  const init: TrialInit = {
    itemId: item.id,
    skill: item.skill,
    itemPhase: phase,
    choices,
    correctId: item.id,
    prompts: item.prompts,
  }
  return initTrial(init)
}
