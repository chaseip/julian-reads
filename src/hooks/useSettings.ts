import { useState, useCallback } from 'react'
import type { Settings } from '../types'

const KEY = 'julian-reads-settings'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { voiceName: '', voiceRate: 0.85, matchChoices: 2, enableHaptics: true }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load)

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { settings, updateSettings }
}
