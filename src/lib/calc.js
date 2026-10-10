import { addDays, daysBetween, today, weekdayIndex } from './dates.js';

export const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const round1 = (n) => Math.round(n * 10) / 10;

/** Exercise names are matched case-insensitively, so history follows an exercise across templates. */
export const normName = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Estimated 1-rep max (Epley formula). */
export function e1rm(weight, reps) {
  const w = num(weight);
  const r = num(reps);
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

const byTime = (a, b) => a.date.localeCompare(b.date) || (a.startedAt || 0) - (b.startedAt || 0);

export function sortWorkouts(workouts) {
  return [...workouts].sort(byTime);
}

/** Workouts that happened before `ref` (used when editing an old workout). */
export function workoutsBefore(workouts, ref) {
  if (!ref) return workouts;
  return workouts.filter((w) => w.id !== ref.id && byTime(w, ref) < 0);
}

/** The most recent time this exercise was logged: { date, sets, exercise } or null. */
export function lastPerformance(workouts, name) {
  const key = normName(name);
  const sorted = sortWorkouts(workouts);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const ex = sorted[i].exercises.find((e) => normName(e.name) === key && e.sets.length);
    if (ex) return { date: sorted[i].date, workoutId: sorted[i].id, sets: ex.sets, exercise: ex };
  }
  return null;
}

/**
 * Progressive overload: if every planned set reached the top of the rep
 * range, suggest adding weight next time.
 * plan = { sets, repMax, increment }
 */
export function overloadSuggestion(sets, plan) {
  if (!sets?.length || !plan || !num(plan.repMax)) return null;
  const planned = num(plan.sets) || sets.length;
  if (sets.length < planned) return null;
  if (!sets.every((s) => num(s.reps) >= num(plan.repMax))) return null;
  const top = Math.max(...sets.map((s) => num(s.weight)));
  if (top <= 0) return null;
  const inc = num(plan.increment) || 5;
  return { from: top, weight: round1(top + inc), increment: inc };
}

/**
 * Walk through history in order and record the best lifts per exercise.
 * Returns:
 *   bests:  Map(normalized name -> { name, muscle, e1rm, e1rmSet, maxWeight, maxWeightSet, sessions, lastDate })
 *   prSets: Map("workoutId:exerciseIndex:setIndex" -> { e1rm: bool, weight: bool })
 * The first session of an exercise sets a baseline and isn't flagged as a PR.
 */
export function computePRs(workouts) {
  const bests = new Map();
  const prSets = new Map();
  for (const w of sortWorkouts(workouts)) {
    w.exercises.forEach((ex, ei) => {
      if (!ex.sets?.some((s) => num(s.reps) > 0)) return;
      const key = normName(ex.name);
      let b = bests.get(key);
      const hasBaseline = !!b;
      if (!b) {
        b = { name: ex.name, muscle: ex.muscle, e1rm: 0, e1rmSet: null, maxWeight: 0, maxWeightSet: null, sessions: 0 };
        bests.set(key, b);
      }
      ex.sets.forEach((s, si) => {
        const reps = num(s.reps);
        if (reps <= 0) return;
        const weight = num(s.weight);
        const est = e1rm(weight, reps);
        const isE1rm = est > b.e1rm + 1e-9;
        const isWeight = weight > b.maxWeight + 1e-9;
        if (hasBaseline && (isE1rm || isWeight)) prSets.set(`${w.id}:${ei}:${si}`, { e1rm: isE1rm, weight: isWeight });
        if (isE1rm) {
          b.e1rm = est;
          b.e1rmSet = { weight, reps, date: w.date };
        }
        if (isWeight) {
          b.maxWeight = weight;
          b.maxWeightSet = { weight, reps, date: w.date };
        }
      });
      b.sessions += 1;
      b.lastDate = w.date;
      b.name = ex.name;
      b.muscle = ex.muscle;
    });
  }
  return { bests, prSets };
}

/**
 * Turn an in-progress workout into the saved format: numbers instead of
 * text, and only sets that were ticked off.
 */
export function finalizeDraft(draft) {
  const exercises = draft.exercises
    .map(({ id, name, muscle, targetSets, repMin, repMax, increment, sets }) => ({
      id,
      name: name.trim() || 'Exercise',
      muscle,
      targetSets,
      repMin,
      repMax,
      increment,
      sets: sets
        .filter((s) => s.done && num(s.reps) > 0)
        .map((s) => ({ weight: num(s.weight), reps: num(s.reps), ...(num(s.rpe) ? { rpe: num(s.rpe) } : {}) })),
    }))
    .filter((e) => e.sets.length);
  return {
    id: draft.editingId || draft.id,
    templateId: draft.templateId,
    name: draft.name,
    date: draft.date,
    startedAt: draft.startedAt,
    finishedAt: draft.finishedAt || Date.now(),
    notes: draft.notes || '',
    exercises,
  };
}

/** PRs hit so far in the workout being logged, keyed "exerciseIndex:setIndex". */
export function livePRs(history, draft) {
  const pseudo = {
    id: '__draft__',
    date: '9999-12-31',
    exercises: draft.exercises.map((e) => ({
      name: e.name,
      muscle: e.muscle,
      sets: e.sets.map((s) => (s.done ? { weight: num(s.weight), reps: num(s.reps) } : { weight: 0, reps: 0 })),
    })),
  };
  const { prSets } = computePRs([...history, pseudo]);
  const out = new Map();
  for (const [k, v] of prSets) {
    if (k.startsWith('__draft__:')) out.set(k.slice('__draft__:'.length), v);
  }
  return out;
}

export function workoutStats(workout) {
  let sets = 0;
  let volume = 0;
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      sets += 1;
      volume += num(s.weight) * num(s.reps);
    }
  }
  return { sets, volume, exercises: workout.exercises.length };
}

// ---------- Bodyweight ----------

export function sortByDate(list) {
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}

/** Adds `avg`: the average of all weigh-ins in the 7 calendar days ending on each date. */
export function withMovingAverage(weights, days = 7) {
  const sorted = sortByDate(weights);
  return sorted.map((w, i) => {
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0 && daysBetween(sorted[j].date, w.date) < days; j--) {
      sum += num(sorted[j].weight);
      n += 1;
    }
    return { ...w, weight: num(w.weight), avg: sum / n };
  });
}

/**
 * Average weekly change over the last `days` days, using a best-fit line
 * through every weigh-in (less jumpy than first-vs-last).
 * Needs at least 3 weigh-ins spread over 7+ days.
 */
export function weeklyRate(weights, ref = today(), days = 28) {
  const from = addDays(ref, -(days - 1));
  const pts = weights
    .filter((w) => w.date >= from && w.date <= ref)
    .map((w) => ({ x: daysBetween(from, w.date), y: num(w.weight) }));
  if (pts.length < 3) return null;
  const xs = pts.map((p) => p.x);
  const span = Math.max(...xs) - Math.min(...xs);
  if (span < 7) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / pts.length;
  const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
  }
  return { perWeek: (sxy / sxx) * 7, count: pts.length, spanDays: span };
}

// ---------- Cardio ----------

export function cardioMinutesInWeek(cardio, weekStart) {
  const end = addDays(weekStart, 6);
  return cardio.filter((c) => c.date >= weekStart && c.date <= end).reduce((s, c) => s + num(c.minutes), 0);
}

// ---------- Volume ----------

/** { muscle: { sets, tonnage } } for the week starting on weekStart. */
export function weeklyMuscleVolume(workouts, weekStart) {
  const end = addDays(weekStart, 6);
  const out = {};
  for (const w of workouts) {
    if (w.date < weekStart || w.date > end) continue;
    for (const ex of w.exercises) {
      const m = ex.muscle || 'Other';
      out[m] ??= { sets: 0, tonnage: 0 };
      for (const s of ex.sets) {
        out[m].sets += 1;
        out[m].tonnage += num(s.weight) * num(s.reps);
      }
    }
  }
  return out;
}

// ---------- Nutrition ----------

export function entryMacros(e) {
  const q = e.qty == null ? 1 : num(e.qty);
  return {
    calories: num(e.calories) * q,
    protein: num(e.protein) * q,
    carbs: num(e.carbs) * q,
    fat: num(e.fat) * q,
  };
}

export function dayTotals(foodLog, date) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of foodLog) {
    if (e.date !== date) continue;
    const m = entryMacros(e);
    t.calories += m.calories;
    t.protein += m.protein;
    t.carbs += m.carbs;
    t.fat += m.fat;
  }
  return t;
}

// ---------- Schedule ----------

/**
 * What's on for a given day.
 * Returns { template, rest, doneWorkout, next: { template, date } }
 */
export function planForDay(state, date = today()) {
  const { settings, templates, workouts } = state;
  const byId = (id) => templates.find((t) => t.id === id) || null;
  const doneWorkout = sortWorkouts(workouts.filter((w) => w.date === date)).pop() || null;

  if (settings.scheduleMode === 'rotation') {
    const prior = sortWorkouts(workouts.filter((w) => w.date < date && byId(w.templateId))).pop();
    const idx = prior ? templates.findIndex((t) => t.id === prior.templateId) : -1;
    const template = templates[(idx + 1) % templates.length] || null;
    return { template, rest: false, doneWorkout, next: null };
  }

  const schedule = settings.weeklySchedule;
  const template = byId(schedule[weekdayIndex(date)]);
  let next = null;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(date, i);
    const t = byId(schedule[weekdayIndex(d)]);
    if (t) {
      next = { template: t, date: d };
      break;
    }
  }
  return { template, rest: !template, doneWorkout, next };
}
