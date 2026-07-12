import type { EngineConfig } from './types'

const DAY = 24 * 60 * 60 * 1000

export const DEFAULT_CONFIG: EngineConfig = {
  minWaitMs: 1500,
  delayMs: { DELAY_2S: 2000, DELAY_4S: 4000 },
  advancePrompted: 3,
  advanceIndependent: 3,
  demoteErrors: 2,
  masteryWindow: 10,
  masteryIndependent: 9,
  masterySessions: 2,
  historyCap: 200,
  guessPenaltyEnabled: false,
  guessPenaltyTaps: 3,
  maintenanceSchedule: [1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY],
  acquisitionSize: 4,
  sessionLength: 16,
  choiceCount: 2,
  masteredInterleave: 0.25,
}
