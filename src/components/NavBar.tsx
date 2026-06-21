import type { Screen } from '../types'

interface Props {
  current: Screen
  onNav: (s: Screen) => void
}

const TABS: { screen: Screen; emoji: string; label: string }[] = [
  { screen: 'home', emoji: '🏠', label: 'Home' },
  { screen: 'abc', emoji: '🔤', label: 'ABC' },
  { screen: 'match', emoji: '🎮', label: 'Match' },
  { screen: 'sightwords', emoji: '👁️', label: 'Words' },
  { screen: 'settings', emoji: '⚙️', label: 'Settings' },
]

export function NavBar({ current, onNav }: Props) {
  return (
    <nav className="flex bg-gray-900 border-t-2 border-gray-700">
      {TABS.map(tab => (
        <button
          key={tab.screen}
          onClick={() => onNav(tab.screen)}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
            current === tab.screen
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 active:bg-gray-800'
          }`}
        >
          <span className="text-2xl">{tab.emoji}</span>
          <span className="text-xs font-bold tracking-wide">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
