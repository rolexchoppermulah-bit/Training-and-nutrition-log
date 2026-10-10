import { setState, getState } from './store.js';
import { today } from './dates.js';
import { finalizeDraft, lastPerformance, overloadSuggestion, workoutsBefore } from './calc.js';
import { createDefaultState } from './defaults.js';

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const update = (key, fn) => setState((s) => ({ ...s, [key]: fn(s[key]) }));

// ---------- Workouts ----------

/** Build a fresh set list for an exercise, pre-filled from last time. */
export function plannedSets(plan, history) {
  const last = lastPerformance(history, plan.name);
  const sugg = last ? overloadSuggestion(last.sets, plan) : null;
  const n = Math.max(1, Number(plan.sets) || 3);
  return Array.from({ length: n }, (_, i) => {
    const prev = last ? last.sets[Math.min(i, last.sets.length - 1)] : null;
    const weight = sugg ? sugg.weight : prev ? prev.weight : '';
    return { weight: weight === '' ? '' : String(weight), reps: '', rpe: '', done: false };
  });
}

export function draftExercise(plan, history) {
  return {
    id: uid(),
    name: plan.name,
    muscle: plan.muscle || 'Other',
    targetSets: Number(plan.sets) || 3,
    repMin: Number(plan.repMin) || null,
    repMax: Number(plan.repMax) || null,
    increment: Number(plan.increment) || 5,
    sets: plannedSets(plan, history),
  };
}

export function startWorkout(templateId) {
  const s = getState();
  if (s.draft) return;
  const t = s.templates.find((x) => x.id === templateId);
  if (!t) return;
  setState({
    ...s,
    draft: {
      id: uid(),
      editingId: null,
      templateId: t.id,
      name: t.name,
      date: today(),
      startedAt: Date.now(),
      notes: '',
      exercises: t.exercises.map((e) => draftExercise(e, s.workouts)),
    },
  });
}

/** Re-open a saved workout in the logger to fix mistakes. */
export function editWorkout(workoutId) {
  const s = getState();
  if (s.draft) return false;
  const w = s.workouts.find((x) => x.id === workoutId);
  if (!w) return false;
  setState({
    ...s,
    draft: {
      ...structuredClone(w),
      id: uid(),
      editingId: w.id,
      exercises: w.exercises.map((e) => ({
        ...e,
        id: e.id || uid(),
        sets: e.sets.map((x) => ({
          weight: String(x.weight),
          reps: String(x.reps),
          rpe: x.rpe ? String(x.rpe) : '',
          done: true,
          touched: true,
        })),
      })),
    },
  });
  return true;
}

export function updateDraft(fn) {
  setState((s) => (s.draft ? { ...s, draft: fn(s.draft) } : s));
}

export function discardDraft() {
  update('draft', () => null);
}

/** Save the workout being logged. Returns the saved workout (or null if nothing was ticked). */
export function finishDraft() {
  const s = getState();
  if (!s.draft) return null;
  const w = finalizeDraft(s.draft);
  if (!w.exercises.length) return null;
  const workouts = s.draft.editingId
    ? s.workouts.map((x) => (x.id === s.draft.editingId ? { ...w, finishedAt: x.finishedAt || w.finishedAt } : x))
    : [...s.workouts, w];
  setState({ ...s, workouts, draft: null });
  return w;
}

export function deleteWorkout(id) {
  update('workouts', (list) => list.filter((w) => w.id !== id));
}

/**
 * History to compare the draft against: only workouts that came before it.
 * Matters when editing an old workout or back-dating a new one.
 */
export function draftHistory(state) {
  const d = state.draft;
  if (!d) return state.workouts;
  return workoutsBefore(state.workouts, { id: d.editingId || d.id, date: d.date, startedAt: d.startedAt });
}

// ---------- Templates ----------

export function saveTemplates(templates) {
  setState((s) => {
    const ids = new Set(templates.map((t) => t.id));
    const weeklySchedule = s.settings.weeklySchedule.map((id) => (id && ids.has(id) ? id : null));
    return { ...s, templates, settings: { ...s.settings, weeklySchedule } };
  });
}

// ---------- Cardio ----------

export function saveCardio(entry) {
  update('cardio', (list) =>
    entry.id && list.some((c) => c.id === entry.id)
      ? list.map((c) => (c.id === entry.id ? entry : c))
      : [...list, { ...entry, id: entry.id || uid() }],
  );
}

export function deleteCardio(id) {
  update('cardio', (list) => list.filter((c) => c.id !== id));
}

// ---------- Nutrition ----------

export function addFoodEntry(date, food) {
  const entry = {
    id: uid(),
    date,
    name: food.name || 'Food',
    calories: Number(food.calories) || 0,
    protein: Number(food.protein) || 0,
    carbs: Number(food.carbs) || 0,
    fat: Number(food.fat) || 0,
    qty: 1,
    foodId: food.foodId || null,
    loggedAt: Date.now(),
  };
  update('foodLog', (list) => [...list, entry]);
  return entry;
}

export function updateFoodEntry(id, patch) {
  update('foodLog', (list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

export function removeFoodEntry(id) {
  update('foodLog', (list) => list.filter((e) => e.id !== id));
}

export function restoreFoodEntry(entry) {
  update('foodLog', (list) => [...list, entry]);
}

export function saveFood(food) {
  const clean = {
    id: food.id || uid(),
    name: food.name.trim() || 'Food',
    calories: Number(food.calories) || 0,
    protein: Number(food.protein) || 0,
    carbs: Number(food.carbs) || 0,
    fat: Number(food.fat) || 0,
  };
  update('foods', (list) => (list.some((f) => f.id === clean.id) ? list.map((f) => (f.id === clean.id ? clean : f)) : [...list, clean]));
  return clean;
}

export function deleteFood(id) {
  update('foods', (list) => list.filter((f) => f.id !== id));
}

// ---------- Bodyweight ----------

/** One weigh-in per day; logging again on the same day replaces it. */
export function logWeight(date, weight) {
  const w = Number(weight);
  if (!(w > 0)) return;
  update('weights', (list) => [...list.filter((x) => x.date !== date), { id: uid(), date, weight: w }]);
}

export function deleteWeight(id) {
  update('weights', (list) => list.filter((x) => x.id !== id));
}

// ---------- Settings & data ----------

export function updateSettings(patch) {
  update('settings', (s) => ({ ...s, ...patch }));
}

export function markExported() {
  update('meta', (m) => ({ ...m, lastExportAt: new Date().toISOString() }));
}

export function replaceAllData(newState) {
  setState(newState);
}

export function resetAllData() {
  setState(createDefaultState());
}
