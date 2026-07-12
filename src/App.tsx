import { useEffect, useState } from 'react'
import { NavBar } from './components/NavBar'
import { HomeScreen } from './components/HomeScreen'
import { ABCExplorer } from './components/ABCExplorer'
import { LetterFocus } from './components/LetterFocus'
import { TrialActivity } from './components/TrialActivity'
import { ParentDashboard } from './components/ParentDashboard'
import { SettingsScreen } from './components/Settings'
import { useSpeech, prewarm, warmUrls, unlockAudio, VOICES } from './hooks/useSpeech'
import { useSettings } from './hooks/useSettings'
import * as store from './store/store'
import { getAllPhrases } from './utils/phrases'
import type { Screen, Skill } from './types'

const SKILL_TITLES: Record<string, { skill: Skill; title: string }> = {
  wordtouch: { skill: 'word-touch', title: 'Word Touch' },
  sightwords: { skill: 'sight-word', title: 'Sight Words' },
  match: { skill: 'first-letter', title: 'First Letter' },
  phonics: { skill: 'phonics-cvc', title: 'Sound It Out' },
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const { settings, updateSettings } = useSettings()
  const { speak, speakAndWait, stop } = useSpeech(settings)

  // Open a fresh session once per launch (drives the "across >=2 sessions" mastery rule),
  // clear the obsolete accuracy-counter key, precompute every phrase URL (so taps can play
  // synchronously — required for iOS), and unlock audio on the first user gesture.
  useEffect(() => {
    store.startNewSession()
    store.clearLegacy()
    warmUrls(getAllPhrases(), VOICES.map(v => v.name))
    const onGesture = () => unlockAudio()
    window.addEventListener('pointerdown', onGesture, { once: true })
    return () => window.removeEventListener('pointerdown', onGesture)
  }, [])

  // Preload (fetch) a few of the most-used audio files.
  useEffect(() => {
    const voice = settings.voiceName || 'nova'
    prewarm(
      ["Hi Julian! Let's learn today! Pick something to do!", 'You did it all by yourself!'],
      voice,
    )
  }, [settings.voiceName])

  function nav(s: Screen) {
    stop()
    setScreen(s)
  }

  const skillScreen = SKILL_TITLES[screen]

  return (
    <div className="flex flex-col h-dvh max-w-lg mx-auto bg-gray-900 relative overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {screen === 'home' && <HomeScreen onNav={nav} speak={speak} />}
        {screen === 'abc' && <ABCExplorer speak={speak} />}
        {screen === 'focus' && <LetterFocus speak={speak} />}
        {skillScreen && (
          <TrialActivity
            key={screen}
            skill={skillScreen.skill}
            title={skillScreen.title}
            settings={settings}
            speak={speak}
            speakAndWait={speakAndWait}
            stop={stop}
            onExit={() => nav('home')}
          />
        )}
        {screen === 'dashboard' && <ParentDashboard speak={speak} />}
        {screen === 'settings' && (
          <SettingsScreen settings={settings} update={updateSettings} speak={speak} />
        )}
      </div>
      <NavBar current={screen} onNav={nav} />
    </div>
  )
}
