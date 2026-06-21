import { useState, useEffect } from 'react'
import { NavBar } from './components/NavBar'
import { HomeScreen } from './components/HomeScreen'
import { ABCExplorer } from './components/ABCExplorer'
import { LetterFocus } from './components/LetterFocus'
import { MatchGame } from './components/MatchGame'
import { SightWords } from './components/SightWords'
import { SettingsScreen } from './components/Settings'
import { useSpeech, prewarm } from './hooks/useSpeech'
import { useProgress } from './hooks/useProgress'
import { useSettings } from './hooks/useSettings'
import { ALPHABET } from './data/alphabet'
import type { Screen } from './types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const { settings, updateSettings } = useSettings()
  const { speak, stop } = useSpeech(settings)
  const { recordLetter, resetProgress } = useProgress()

  // Preload the most-used audio files while user is on home screen
  useEffect(() => {
    const voice = settings.voiceName || 'nova'
    const firstPhrases = [
      "Hi Julian! Let's learn today! Pick something to do!",
      "What letter does this start with?",
      "Yes! Great job, Julian!",
      ...ALPHABET.slice(0, 8).flatMap(l => [
        `${l.letter}! … ${l.letter} says "${l.phonetic}". ${l.words[0].word}! ${l.words[0].word} starts with ${l.letter}!`,
        `What letter does ${l.words[0].word} start with?`,
      ]),
    ]
    prewarm(firstPhrases, voice)
  }, [settings.voiceName])

  function nav(s: Screen) {
    stop()
    setScreen(s)
  }

  return (
    <div className="flex flex-col h-dvh max-w-lg mx-auto bg-gray-900 relative overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {screen === 'home'       && <HomeScreen onNav={nav} speak={speak} />}
        {screen === 'abc'        && <ABCExplorer speak={speak} />}
        {screen === 'focus'      && <LetterFocus speak={speak} />}
        {screen === 'match'      && (
          <MatchGame
            speak={speak}
            settings={settings}
            onCorrect={l => recordLetter(l, true)}
            onWrong={l => recordLetter(l, false)}
          />
        )}
        {screen === 'sightwords' && <SightWords speak={speak} />}
        {screen === 'settings'   && (
          <SettingsScreen
            settings={settings}
            update={updateSettings}
            speak={speak}
            resetProgress={resetProgress}
          />
        )}
      </div>
      <NavBar current={screen} onNav={nav} />
    </div>
  )
}
