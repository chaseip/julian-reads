import OpenAI from 'openai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const ALLOWED_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const
type Voice = typeof ALLOWED_VOICES[number]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text, voice } = req.body as { text?: string; voice?: string }
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' })

  const safeVoice: Voice = ALLOWED_VOICES.includes(voice as Voice) ? (voice as Voice) : 'nova'

  // Trim to 500 chars max — no single speech call needs more
  const safeText = text.slice(0, 500)

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: safeVoice,
    input: safeText,
    speed: 0.9,
  })

  const buffer = Buffer.from(await mp3.arrayBuffer())
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'public, max-age=86400') // cache identical phrases for 1 day
  res.send(buffer)
}
