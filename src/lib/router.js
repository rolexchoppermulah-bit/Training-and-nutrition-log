import { useSyncExternalStore } from 'react';

// Hash-based routes (#/food, #/lift …) work on GitHub Pages without any
// server setup, and the phone's back button still works.

const getPath = () => window.location.hash.replace(/^#/, '') || '/';

function subscribe(cb) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute() {
  return useSyncExternalStore(subscribe, getPath);
}

export function navigate(path) {
  if (getPath() !== path) window.location.hash = path;
}
