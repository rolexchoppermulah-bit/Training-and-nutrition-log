import { useSyncExternalStore } from 'react';
import { loadState, saveState, STORAGE_KEY, normalize } from './storage.js';

// A tiny global store: one object holds all app data and is saved to
// localStorage after every change.

let state = loadState();
const listeners = new Set();
let saveFailed = false;

function emit() {
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function setState(updater) {
  const next = typeof updater === 'function' ? updater(state) : updater;
  if (next === state) return;
  state = next;
  saveFailed = !saveState(state);
  emit();
}

export function lastSaveFailed() {
  return saveFailed;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore() {
  return useSyncExternalStore(subscribe, getState);
}

// Keep several open tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        state = normalize(JSON.parse(e.newValue));
        emit();
      } catch {
        /* ignore */
      }
    }
  });
}
