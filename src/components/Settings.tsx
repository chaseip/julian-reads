import { useEffect } from 'react'
import type { Settings } from '../types'

interface Props {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  speak: (text: string) => void
  voices: SpeechSynthesisVoice[]
  resetProgress: () => void
}

export function SettingsScreen({ settings, update, speak, voices, resetProgress }: Props) {
  const enVoices = voices.filter(v => v.lang.startsWith('en'))

  useEffect(() => {
    speak('Settings. You can change the voice and difficulty here.')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function testVoice() {
    speak('Hi Julian! Great job today! Keep learning!')
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-y-auto">
      <div className="p-5 border-b border-gray-800">
        <h2 className="text-white text-3xl font-black">Settings</h2>
        <p className="text-gray-400 text-sm mt-1">For parents / teachers</p>
      </div>

      <div className="p-5 flex flex-col gap-6">
        {/* Voice selection */}
        <div>
          <label className="text-white text-xl font-bold block mb-3">🎙️ Voice</label>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto bg-gray-800 rounded-2xl p-3">
            {enVoices.length === 0 && (
              <p className="text-gray-400 text-sm">No voices found. Try reloading.</p>
            )}
            {enVoices.map(v => (
              <button
                key={v.name}
                onClick={() => update({ voiceName: v.name })}
                className={`text-left px-4 py-3 rounded-xl font-semibold transition-colors ${
                  settings.voiceName === v.name
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 active:bg-gray-700'
                }`}
              >
                {v.name}
                {/female|samantha|zira|victoria|karen|moira|tessa|fiona/i.test(v.name) && (
                  <span className="ml-2 text-pink-400 text-xs">(female)</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={testVoice}
            className="mt-3 bg-indigo-600 text-white rounded-xl px-5 py-3 font-bold w-full active:bg-indigo-500"
          >
            🔊 Test Voice
          </button>
        </div>

        {/* Voice speed */}
        <div>
          <label className="text-white text-xl font-bold block mb-3">
            🐢 Speed: {Math.round(settings.voiceRate * 100)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="1.2"
            step="0.05"
            value={settings.voiceRate}
            onChange={e => update({ voiceRate: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>Slow</span><span>Normal</span><span>Fast</span>
          </div>
        </div>

        {/* Match game difficulty */}
        <div>
          <label className="text-white text-xl font-bold block mb-3">🎮 Match Game — Number of Choices</label>
          <div className="flex gap-3">
            {([2, 3, 4] as const).map(n => (
              <button
                key={n}
                onClick={() => update({ matchChoices: n })}
                className={`flex-1 py-4 rounded-2xl text-2xl font-black transition-colors ${
                  settings.matchChoices === n
                    ? 'bg-indigo-600 text-white ring-2 ring-white'
                    : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-2">Start with 2 (easiest). Move to 3 or 4 as he improves.</p>
        </div>

        {/* Haptics */}
        <div className="flex items-center justify-between bg-gray-800 rounded-2xl px-5 py-4">
          <div>
            <div className="text-white font-bold text-lg">📳 Vibrate on correct answer</div>
            <div className="text-gray-400 text-sm">iPad/iPhone only</div>
          </div>
          <button
            onClick={() => update({ enableHaptics: !settings.enableHaptics })}
            className={`w-14 h-8 rounded-full transition-colors relative ${settings.enableHaptics ? 'bg-indigo-600' : 'bg-gray-600'}`}
          >
            <span
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.enableHaptics ? 'translate-x-7' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {/* Reset */}
        <div className="mt-4">
          <button
            onClick={() => {
              if (confirm('Reset all progress? This cannot be undone.')) {
                resetProgress()
                speak('Progress has been reset.')
              }
            }}
            className="w-full bg-red-900/50 border border-red-700 text-red-400 rounded-2xl py-4 font-bold active:bg-red-900"
          >
            🗑️ Reset All Progress
          </button>
        </div>
      </div>
    </div>
  )
}
