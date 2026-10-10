import { createDefaultState, DEFAULT_SETTINGS } from './defaults.js';
import { today } from './dates.js';

export const STORAGE_KEY = 'training-nutrition-log:v1';

const arr = (v) => (Array.isArray(v) ? v : []);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Fill in anything missing so older backups (or hand-edited files)
 * still load. Unknown extra fields are kept.
 */
export function normalize(raw) {
  const base = createDefaultState();
  if (!isObj(raw)) return base;
  const settings = { ...DEFAULT_SETTINGS, ...(isObj(raw.settings) ? raw.settings : {}) };
  if (!Array.isArray(settings.weeklySchedule) || settings.weeklySchedule.length !== 7) {
    settings.weeklySchedule = [...DEFAULT_SETTINGS.weeklySchedule];
  }
  const templates = arr(raw.templates).filter((t) => isObj(t) && Array.isArray(t.exercises));
  return {
    ...base,
    ...raw,
    app: base.app,
    version: base.version,
    settings,
    templates: templates.length ? templates : base.templates,
    workouts: arr(raw.workouts),
    draft: isObj(raw.draft) && Array.isArray(raw.draft.exercises) ? raw.draft : null,
    cardio: arr(raw.cardio),
    foods: arr(raw.foods),
    foodLog: arr(raw.foodLog),
    weights: arr(raw.weights),
    meta: { ...base.meta, ...(isObj(raw.meta) ? raw.meta : {}) },
  };
}

export function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (err) {
    console.error('Could not read saved data', err);
    // Keep a copy of whatever was there instead of silently losing it.
    try {
      if (raw) localStorage.setItem(`${STORAGE_KEY}:unreadable-${Date.now()}`, raw);
    } catch {
      /* storage full or unavailable */
    }
  }
  return createDefaultState();
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Could not save data', err);
    return false;
  }
}

export function exportFilename() {
  return `lift-log-backup-${today()}.json`;
}

export function serializeForExport(state) {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

/** Parse a backup file. Throws an Error with a readable message if it isn't one. */
export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON. Pick a backup file exported from this app.");
  }
  if (!isObj(data)) throw new Error("That file doesn't look like a backup from this app.");
  const known = ['workouts', 'cardio', 'foodLog', 'weights', 'templates', 'settings', 'foods'];
  const looksRight = data.app === 'training-nutrition-log' || known.some((k) => k in data);
  if (!looksRight) throw new Error("That file doesn't look like a backup from this app.");
  const { exportedAt, ...rest } = data;
  return normalize(rest);
}
