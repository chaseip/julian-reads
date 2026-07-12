// Persistence for per-item learning state + tunable engine config.
// localStorage today; the same interface can later sit in front of Vercel KV/Postgres.
import { DEFAULT_CONFIG } from '../engine/config'
import { newItemState } from '../engine/progression'
import type { EngineConfig, ItemState, Skill } from '../engine/types'

const KEY = 'julian-reads-store-v1'
const LEGACY_KEY = 'julian-reads-progress' // old accuracy counters — ignored, not migrated

export interface StoreData {
  version: 1
  session: number
  items: Record<string, ItemState>
  config: EngineConfig
  updatedAt: number
}

function empty(): StoreData {
  return { version: 1, session: 0, items: {}, config: { ...DEFAULT_CONFIG }, updatedAt: Date.now() }
}

function read(): StoreData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoreData
      // Merge config so newly-added tunables get their defaults.
      return { ...empty(), ...parsed, config: { ...DEFAULT_CONFIG, ...parsed.config } }
    }
  } catch {}
  return empty()
}

let data: StoreData = read()

type Listener = () => void
const listeners = new Set<Listener>()

function persist() {
  data.updatedAt = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {}
  listeners.forEach(l => l())
}

export function subscribe(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function getSnapshot(): StoreData {
  return data
}

export function getConfig(): EngineConfig {
  return data.config
}

export function updateConfig(patch: Partial<EngineConfig>) {
  data = { ...data, config: { ...data.config, ...patch } }
  persist()
}

export function getSession(): number {
  return data.session
}

// Call once per app launch to open a new session (drives the "across >=2 sessions" criterion).
export function startNewSession(): number {
  data = { ...data, session: data.session + 1 }
  persist()
  return data.session
}

export function getItem(itemId: string, skill: Skill): ItemState {
  return data.items[itemId] ?? newItemState(itemId, skill)
}

export function allItems(): ItemState[] {
  return Object.values(data.items)
}

export function itemsForSkill(skill: Skill): ItemState[] {
  return Object.values(data.items).filter(i => i.skill === skill)
}

export function saveItem(state: ItemState) {
  data = { ...data, items: { ...data.items, [state.itemId]: state } }
  persist()
}

export function setItemPhase(itemId: string, skill: Skill, phase: ItemState['phase']) {
  const item = getItem(itemId, skill)
  saveItem({ ...item, phase })
}

export function resetProgress() {
  const cfg = data.config // keep tuning
  data = { ...empty(), config: cfg }
  persist()
}

export function exportJSON(): string {
  return JSON.stringify(data, null, 2)
}

export function importJSON(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as StoreData
    if (parsed.version !== 1 || typeof parsed.items !== 'object') return false
    data = { ...empty(), ...parsed, config: { ...DEFAULT_CONFIG, ...parsed.config } }
    persist()
    return true
  } catch {
    return false
  }
}

// One-time cleanup of the old progress key (its accuracy counters can't drive instruction).
export function clearLegacy() {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {}
}
