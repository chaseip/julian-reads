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

export function useSpeech(settings: Settings) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [])

  const speak = useCallback(async (text: string) => {
    if (!text) return
    stop()

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: settings.voiceName || 'nova' }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(`TTS ${res.status}`)

      const blob = await res.blob()
      if (controller.signal.aborted) return

      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = new Audio(url)
      audio.playbackRate = settings.voiceRate
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        blobUrlRef.current = null
      }
      await audio.play()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error('TTS error:', err)
    }
  }, [settings.voiceName, settings.voiceRate, stop])

  return { speak, stop }
}
