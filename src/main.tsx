import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No StrictMode: its dev-only double-invocation of effects starts a throwaway trial and
// speaks a second prompt over the first, cutting off the audio. Production never double-invokes,
// so this keeps dev behaviour identical to production for the audio-gated trial flow.
createRoot(document.getElementById('root')!).render(<App />)
