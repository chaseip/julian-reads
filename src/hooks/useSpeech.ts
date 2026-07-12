import { useCallback, useRef } from 'react'
import type { Settings } from '../types'

export const VOICES = [
  { name: 'nova', label: 'Nova', desc: 'Warm female ⭐' },
  { name: 'onyx', label: 'Onyx', desc: 'Deep male' },
] as const

// SHA-256 first 12 hex chars — must match scripts/generate_audio.py text_hash()
async function textHash(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12)
}

async function audioUrl(text: string, voice: string): Promise<string> {
  const hash = await textHash(text)
  return `/audio/${voice}_${hash}.mp3`
}

// Preloaded Audio elements — avoids first-play delay for key phrases
const preloaded = new Map<string, HTMLAudioElement>()

export async function prewarm(texts: string[], voice: string) {
  for (const text of texts) {
    const url = await audioUrl(text, voice)
    if (!preloaded.has(url)) {
      const a = new Audio(url)
      a.preload = 'auto'
      preloaded.set(url, a)
    }
  }
}

export function useSpeech(settings: Settings) {
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const cancelRef = useRef(false)

  const stop = useCallback(() => {
    cancelRef.current = true
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
  }, [])

  // Play a phrase and resolve when it finishes (or errors/cancels). Lets the trial
  // engine gate input on audio completion. Resolves false if interrupted.
  const speakAndWait = useCallback(async (text: string): Promise<boolean> => {
    if (!text) return true
    stop()
    cancelRef.current = false

    const voice = settings.voiceName || 'nova'
    const url   = await audioUrl(text, voice)
    if (cancelRef.current) return false

    const audio = preloaded.get(url) ?? new Audio(url)
    audio.playbackRate = settings.voiceRate
    audio.currentTime  = 0
    audioRef.current   = audio

    return new Promise<boolean>(resolve => {
      let settled = false
      const done = (ok: boolean) => {
        if (settled) return
        settled = true
        audio.onended = null
        audio.onerror = null
        resolve(ok && !cancelRef.current)
      }
      audio.onended = () => done(true)
      // Missing pre-generated file (404) should not stall the engine — resolve immediately.
      audio.onerror = () => done(true)
      audio.play().catch(err => {
        console.error('Audio error:', err)
        done(true)
      })
    })
  }, [settings.voiceName, settings.voiceRate, stop])

  const speak = useCallback((text: string) => {
    void speakAndWait(text)
  }, [speakAndWait])

  return { speak, speakAndWait, stop }
}
