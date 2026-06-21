import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getAllPhrases } from '../utils/phrases'
import { cacheKey } from '../hooks/useSpeech'
import { dbGet, dbSet, dbClear, dbKeys } from '../utils/audioDb'

interface Props {
  voice: string
  onComplete: () => void
}

type Status = 'idle' | 'checking' | 'downloading' | 'done' | 'error'

export function AudioDownloader({ voice, onComplete }: Props) {
  const [status, setStatus]     = useState<Status>('idle')
  const [done, setDone]         = useState(0)
  const [total, setTotal]       = useState(0)
  const [cached, setCached]     = useState<number | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const phrases = getAllPhrases()

  // Check how many are already cached
  useEffect(() => {
    dbKeys().then(keys => {
      const voiceKeys = new Set(phrases.map(p => cacheKey(p, voice)))
      setCached(keys.filter(k => voiceKeys.has(k)).length)
    }).catch(() => setCached(0))
  }, [voice, phrases])

  const startDownload = useCallback(async () => {
    setStatus('downloading')
    setError(null)
    setDone(0)
    setTotal(phrases.length)

    const CONCURRENCY = 2
    let completed = 0

    for (let i = 0; i < phrases.length; i += CONCURRENCY) {
      const batch = phrases.slice(i, i + CONCURRENCY)

      await Promise.allSettled(
        batch.map(async text => {
          const key = cacheKey(text, voice)
          try {
            // Skip if already cached
            const existing = await dbGet(key)
            if (existing) { completed++; setDone(completed); return }

            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, voice }),
            })
            if (!res.ok) throw new Error(`${res.status}`)
            const blob = await res.blob()
            await dbSet(key, blob)
          } catch (e) {
            console.warn('Failed to cache phrase:', text, e)
          } finally {
            completed++
            setDone(completed)
          }
        })
      )
    }

    setStatus('done')
    setCached(phrases.length)
    onComplete()
  }, [phrases, voice, onComplete])

  const clearCache = useCallback(async () => {
    await dbClear()
    setCached(0)
    setStatus('idle')
    setDone(0)
  }, [])

  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="bg-gray-800 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-lg">📥 Offline Audio</div>
          <div className="text-gray-400 text-sm">
            {cached === null ? 'Checking…' : `${cached} / ${phrases.length} phrases cached`}
          </div>
        </div>
        {cached !== null && cached >= phrases.length && (
          <span className="text-green-400 text-2xl">✅</span>
        )}
      </div>

      {status === 'downloading' && (
        <div className="flex flex-col gap-2">
          <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500 rounded-full"
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', damping: 20 }}
            />
          </div>
          <div className="text-gray-400 text-sm text-center">{done} of {total} ({pct}%)</div>
        </div>
      )}

      {status === 'done' && (
        <div className="text-green-400 font-semibold text-center">
          Done! App is now fully offline. 🎉
        </div>
      )}

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="flex gap-2">
        {status !== 'downloading' && (cached === null || cached < phrases.length) && (
          <button
            onClick={startDownload}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-3 font-bold active:bg-indigo-500"
          >
            {cached === 0 ? '⬇️ Download All Audio' : '⬇️ Download Missing'}
          </button>
        )}
        {cached !== null && cached > 0 && status !== 'downloading' && (
          <button
            onClick={clearCache}
            className="bg-gray-700 text-gray-300 rounded-xl px-4 py-3 font-bold active:bg-gray-600 text-sm"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-gray-500 text-xs">
        One-time download (~$0.50). After this, no internet needed and no more API charges.
      </p>
    </div>
  )
}
