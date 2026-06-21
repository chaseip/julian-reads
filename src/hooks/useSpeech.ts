import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'

export function useSpeech(settings: Settings) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length > 0) setVoices(v)
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = settings.voiceRate
    utt.pitch = 1.1
    utt.volume = 1

    const chosen = voices.find(v => v.name === settings.voiceName)
    if (chosen) {
      utt.voice = chosen
    } else {
      // fallback: prefer a female-sounding en-US voice
      const fallback = voices.find(v => v.lang.startsWith('en') && /female|samantha|zira|victoria|karen/i.test(v.name))
        || voices.find(v => v.lang.startsWith('en'))
      if (fallback) utt.voice = fallback
    }

    utteranceRef.current = utt
    window.speechSynthesis.speak(utt)
  }, [voices, settings.voiceName, settings.voiceRate])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
  }, [])

  return { speak, stop, voices }
}
