import { useSyncExternalStore } from 'react'
import * as store from '../store/store'

// Re-render on any store change; returns the current snapshot.
export function useStore() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
