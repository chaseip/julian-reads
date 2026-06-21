import { useCallback, useRef } from 'react'
import type { Settings } from '../types'

export const OPENAI_VOICES = [
  { name: 'nova', label: 'Nova', desc: 'Warm female ⭐ recommended' },
  { name: 'shimmer', label: 'Shimmer', desc: 'Gentle female' },
  { name: 'alloy', label: 'Alloy', desc: 'Neutral' },
  { name: 'fable', label: 'Fable', desc: 'Expressive female' },
  { name: 'echo', label: 'Echo', desc: 'Male' },
  { name: 'onyx', label: 'Onyx', desc: 'Deep male' },
] as const

// Module-level cache survives re-renders; blob URLs stay valid for the session
const audioCache = new Map<string, string>()       // key → objectURL
const inFlight   = new Map<string, Promise<string>>() // key → pending fetch

async function fetchAudio(text: string, voice: string): Promise<string> {
  const key = `${voice}::${text}`
  if (audioCache.has(key)) return audioCache.get(key)!
  if (inFlight.has(key))   return inFlight.get(key)!

  const promise = (async () => {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    })
    if (!res.ok) throw new Error(`TTS ${res.status}`)
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    audioCache.set(key, url)
    inFlight.delete(key)
    return url
  })()

  inFlight.set(key, promise)
  return promise
}

/** Fire-and-forget: fetch these phrases into cache while user isn't tapping yet */
export function prewarm(texts: string[], voice: string) {
  for (const text of texts) {
    fetchAudio(text, voice).catch(() => {})
  }
}

export function useSpeech(settings: Settings) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelRef = useRef(false)

  const stop = useCallback(() => {
    cancelRef.current = true
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [])

  const speak = useCallback(async (text: string) => {
    if (!text) return
    stop()
    cancelRef.current = false

    try {
      const url = await fetchAudio(text, settings.voiceName || 'nova')
      if (cancelRef.current) return

      const audio = new Audio(url)
      audio.playbackRate = settings.voiceRate
      audioRef.current = audio
      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
    }
  }, [settings.voiceName, settings.voiceRate, stop])

  return { speak, stop }
}
