import { useSyncExternalStore } from 'react';
import { createProgressStore, type ProgressState } from './progressStore';

const storage = typeof window !== 'undefined' ? window.localStorage : undefined;

/** The app-wide store, persisted to localStorage. */
export const progressStore = createProgressStore(storage);

export function useProgress(): ProgressState {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getState, progressStore.getState);
}
