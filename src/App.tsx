import { useEffect, useState } from 'react'
import { NavBar } from './components/NavBar'
import { HomeScreen } from './components/HomeScreen'
import { ABCExplorer } from './components/ABCExplorer'
import { LetterFocus } from './components/LetterFocus'
import { TrialActivity } from './components/TrialActivity'
import { ParentDashboard } from './components/ParentDashboard'
import { SettingsScreen } from './components/Settings'
import { useSpeech, prewarm } from './hooks/useSpeech'
import { useSettings } from './hooks/useSettings'
import * as store from './store/store'
import { ALPHABET } from './data/alphabet'
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

  // Open a fresh session once per launch (drives the "across >=2 sessions" mastery rule)
  // and clear the obsolete accuracy-counter key.
  useEffect(() => {
    store.startNewSession()
    store.clearLegacy()
  }, [])

  // Preload the most-used audio files while the user is on the home screen.
  useEffect(() => {
    const voice = settings.voiceName || 'nova'
    const firstPhrases = [
      "Hi Julian! Let's learn today! Pick something to do!",
      'You did it all by yourself!',
      ...ALPHABET.slice(0, 6).flatMap(l => [
        `Tap ${l.words[0].word}.`,
        `What letter does ${l.words[0].word} start with?`,
      ]),
    ]
    prewarm(firstPhrases, voice)
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
