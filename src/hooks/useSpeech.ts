import { useCallback, useRef } from 'react'
import { dbGet, dbSet } from '../utils/audioDb'
import type { Settings } from '../types'

export const OPENAI_VOICES = [
  { name: 'nova',    label: 'Nova',    desc: 'Warm female ⭐ recommended' },
  { name: 'shimmer', label: 'Shimmer', desc: 'Gentle female' },
  { name: 'alloy',   label: 'Alloy',   desc: 'Neutral' },
  { name: 'fable',   label: 'Fable',   desc: 'Expressive female' },
  { name: 'echo',    label: 'Echo',    desc: 'Male' },
  { name: 'onyx',    label: 'Onyx',    desc: 'Deep male' },
] as const

// In-memory cache: avoids repeat IndexedDB reads within a session
const memCache  = new Map<string, string>()        // cacheKey → objectURL
const inFlight  = new Map<string, Promise<string>>() // cacheKey → pending fetch

export function cacheKey(text: string, voice: string) {
  return `${voice}::${text}`
}

async function getAudioUrl(text: string, voice: string): Promise<string> {
  const key = cacheKey(text, voice)

  // 1. Memory cache (instant)
  if (memCache.has(key)) return memCache.get(key)!

  // 2. Deduplicate in-flight requests
  if (inFlight.has(key)) return inFlight.get(key)!

  const promise = (async () => {
    // 3. IndexedDB (fast, persists across reloads)
    const stored = await dbGet(key)
    if (stored) {
      const url = URL.createObjectURL(stored)
      memCache.set(key, url)
      inFlight.delete(key)
      return url
    }

    // 4. API (slow — only when not yet cached)
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    })
    if (!res.ok) throw new Error(`TTS ${res.status}`)
    const blob = await res.blob()

    // Persist to IndexedDB so next load is instant
    await dbSet(key, blob)

    const url = URL.createObjectURL(blob)
    memCache.set(key, url)
    inFlight.delete(key)
    return url
  })()

  inFlight.set(key, promise)
  return promise
}

/** Pre-fetch a list of phrases into cache (fire-and-forget, 3 at a time) */
export async function prewarm(texts: string[], voice: string) {
  const CONCURRENCY = 3
  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const batch = texts.slice(i, i + CONCURRENCY)
    await Promise.allSettled(batch.map(t => getAudioUrl(t, voice)))
  }
}

export function useSpeech(settings: Settings) {
  const audioRef  = useRef<HTMLAudioElement | null>(null)
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
    const voice = settings.voiceName || 'nova'

    try {
      const url = await getAudioUrl(text, voice)
      if (cancelRef.current) return
      const audio = new Audio(url)
      audio.playbackRate = settings.voiceRate
      audioRef.current  = audio
      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
    }
  }, [settings.voiceName, settings.voiceRate, stop])

  return { speak, stop }
}
