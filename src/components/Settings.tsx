import { useEffect, useRef, useState } from 'react'
import { VOICES } from '../hooks/useSpeech'
import { useStore } from '../hooks/useStore'
import * as store from '../store/store'
import type { Settings } from '../types'

interface Props {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  speak: (text: string) => void
}

function Stepper({ label, value, min, max, step = 1, suffix = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-2xl px-4 py-3">
      <span className="text-white font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
          className="w-9 h-9 rounded-xl bg-gray-700 text-white text-xl font-black active:bg-gray-600"
        >−</button>
        <span className="text-white font-black w-16 text-center">{value}{suffix}</span>
        <button
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
          className="w-9 h-9 rounded-xl bg-gray-700 text-white text-xl font-black active:bg-gray-600"
        >+</button>
      </div>
    </div>
  )
}

export function SettingsScreen({ settings, update, speak }: Props) {
  const snapshot = useStore()
  const cfg = snapshot.config
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    speak('Settings. You can change the voice and difficulty here.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flash(m: string) {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  function doExport() {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `julian-reads-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash('Progress exported.')
  }

  function doImport() {
    if (store.importJSON(importText)) {
      flash('Progress imported.')
      setImportOpen(false)
      setImportText('')
    } else {
      flash('Import failed — check the file.')
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then(t => {
      if (store.importJSON(t)) flash('Progress imported.')
      else flash('Import failed — check the file.')
    })
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-y-auto">
      <div className="p-5 border-b border-gray-800">
        <h2 className="text-white text-3xl font-black">Settings</h2>
        <p className="text-gray-400 text-sm mt-1">For parents / teachers</p>
      </div>

      <div className="p-5 flex flex-col gap-6">
        {/* Voice */}
        <div>
          <label className="text-white text-xl font-bold block mb-3">🎙️ Voice</label>
          <div className="flex gap-3">
            {VOICES.map(v => (
              <button
                key={v.name}
                onClick={() => update({ voiceName: v.name })}
                className={`flex-1 flex flex-col items-center py-4 rounded-2xl font-bold transition-colors ${
                  settings.voiceName === v.name
                    ? 'bg-indigo-600 text-white ring-2 ring-white'
                    : 'bg-gray-800 text-gray-300 active:bg-gray-700'
                }`}
              >
                <span className="text-2xl mb-1">{v.name === 'nova' ? '👩' : '👨'}</span>
                <span className="text-lg">{v.label}</span>
                <span className={`text-xs mt-0.5 ${settings.voiceName === v.name ? 'text-indigo-200' : 'text-gray-500'}`}>
                  {v.desc}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => speak('You did it all by yourself!')}
            className="mt-3 bg-indigo-600 text-white rounded-xl px-5 py-3 font-bold w-full active:bg-indigo-500"
          >
            🔊 Test Voice
          </button>
        </div>

        {/* Speed */}
        <div>
          <label className="text-white text-xl font-bold block mb-3">
            🐢 Speed: {Math.round(settings.voiceRate * 100)}%
          </label>
          <input
            type="range" min="0.6" max="1.2" step="0.05"
            value={settings.voiceRate}
            onChange={e => update({ voiceRate: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Instruction tuning */}
        <div>
          <label className="text-white text-xl font-bold block mb-3">🎯 Instruction</label>
          <div className="flex flex-col gap-2">
            <Stepper label="Words in play" value={cfg.acquisitionSize} min={2} max={6}
              onChange={v => store.updateConfig({ acquisitionSize: v })} />
            <Stepper label="Choices" value={cfg.choiceCount} min={2} max={4}
              onChange={v => store.updateConfig({ choiceCount: v })} />
            <Stepper label="Wait before tap" value={+(cfg.minWaitMs / 1000).toFixed(1)} min={0.5} max={4} step={0.5} suffix="s"
              onChange={v => store.updateConfig({ minWaitMs: Math.round(v * 1000) })} />
            <Stepper label="2s prompt delay" value={+(cfg.delayMs.DELAY_2S / 1000).toFixed(1)} min={1} max={4} step={0.5} suffix="s"
              onChange={v => store.updateConfig({ delayMs: { ...cfg.delayMs, DELAY_2S: Math.round(v * 1000) } })} />
            <Stepper label="4s prompt delay" value={+(cfg.delayMs.DELAY_4S / 1000).toFixed(1)} min={2} max={7} step={0.5} suffix="s"
              onChange={v => store.updateConfig({ delayMs: { ...cfg.delayMs, DELAY_4S: Math.round(v * 1000) } })} />
            <Stepper label="Session length" value={cfg.sessionLength} min={6} max={30} step={2}
              onChange={v => store.updateConfig({ sessionLength: v })} />
          </div>

          <div className="flex items-center justify-between bg-gray-800 rounded-2xl px-4 py-3 mt-2">
            <div>
              <div className="text-white font-bold">Guess penalty</div>
              <div className="text-gray-400 text-xs">Rapid early taps reset a word to 0s</div>
            </div>
            <button
              onClick={() => store.updateConfig({ guessPenaltyEnabled: !cfg.guessPenaltyEnabled })}
              className={`w-14 h-8 rounded-full transition-colors relative ${cfg.guessPenaltyEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${cfg.guessPenaltyEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Haptics */}
        <div className="flex items-center justify-between bg-gray-800 rounded-2xl px-5 py-4">
          <div>
            <div className="text-white font-bold text-lg">📳 Vibrate on correct answer</div>
            <div className="text-gray-400 text-sm">iPad / iPhone only</div>
          </div>
          <button
            onClick={() => update({ enableHaptics: !settings.enableHaptics })}
            className={`w-14 h-8 rounded-full transition-colors relative ${settings.enableHaptics ? 'bg-indigo-600' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.enableHaptics ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Data */}
        <div>
          <label className="text-white text-xl font-bold block mb-3">💾 Progress data</label>
          <div className="flex gap-3">
            <button onClick={doExport} className="flex-1 bg-gray-800 text-white rounded-xl py-3 font-bold active:bg-gray-700">
              ⬇️ Export
            </button>
            <button onClick={() => setImportOpen(o => !o)} className="flex-1 bg-gray-800 text-white rounded-xl py-3 font-bold active:bg-gray-700">
              ⬆️ Import
            </button>
          </div>
          {importOpen && (
            <div className="mt-3 flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="application/json" onChange={onFile}
                className="text-gray-300 text-sm" />
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="…or paste exported JSON here"
                className="bg-gray-800 text-gray-200 rounded-xl p-3 text-xs h-24 font-mono"
              />
              <button onClick={doImport} disabled={!importText} className="bg-indigo-600 disabled:opacity-40 text-white rounded-xl py-2 font-bold">
                Load pasted JSON
              </button>
            </div>
          )}
        </div>

        {msg && <div className="text-center text-indigo-300 font-bold">{msg}</div>}

        {/* Reset */}
        <button
          onClick={() => {
            if (confirm('Reset all progress? This cannot be undone.')) {
              store.resetProgress()
              flash('Progress has been reset.')
            }
          }}
          className="w-full bg-red-900/50 border border-red-700 text-red-400 rounded-2xl py-4 font-bold active:bg-red-900"
        >
          🗑️ Reset All Progress
        </button>
      </div>
    </div>
  )
}
