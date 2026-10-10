import { describe, it, expect } from 'vitest';
import {
  e1rm,
  overloadSuggestion,
  computePRs,
  lastPerformance,
  livePRs,
  finalizeDraft,
  withMovingAverage,
  weeklyRate,
  cardioMinutesInWeek,
  weeklyMuscleVolume,
  dayTotals,
  planForDay,
  workoutsBefore,
} from './calc.js';
import { addDays, startOfWeek, weekdayIndex, daysBetween } from './dates.js';
import { createDefaultState } from './defaults.js';
import { normalize, parseImport, serializeForExport } from './storage.js';

const workout = (id, date, exercises, startedAt = 0) => ({ id, date, startedAt, exercises });
const bench = (...sets) => ({ name: 'Bench Press', muscle: 'Chest', sets: sets.map(([weight, reps]) => ({ weight, reps })) });

describe('e1rm', () => {
  it('uses Epley and treats singles as the weight itself', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1);
    expect(e1rm(0, 5)).toBe(0);
    expect(e1rm(100, 0)).toBe(0);
  });
});

describe('overloadSuggestion', () => {
  const plan = { sets: 3, repMin: 6, repMax: 8, increment: 5 };
  it('suggests more weight when every set hits the top of the range', () => {
    const s = overloadSuggestion(
      [
        { weight: 135, reps: 8 },
        { weight: 135, reps: 8 },
        { weight: 135, reps: 9 },
      ],
      plan,
    );
    expect(s).toEqual({ from: 135, weight: 140, increment: 5 });
  });
  it('does nothing if any set falls short', () => {
    expect(
      overloadSuggestion(
        [
          { weight: 135, reps: 8 },
          { weight: 135, reps: 8 },
          { weight: 135, reps: 7 },
        ],
        plan,
      ),
    ).toBeNull();
  });
  it('requires all planned sets to be done', () => {
    expect(overloadSuggestion([{ weight: 135, reps: 8 }, { weight: 135, reps: 8 }], plan)).toBeNull();
  });
});

describe('PRs', () => {
  const history = [
    workout('w1', '2026-01-01', [bench([135, 8], [135, 8])]),
    workout('w2', '2026-01-04', [bench([140, 6], [135, 9])]),
    workout('w3', '2026-01-08', [bench([145, 3])]),
  ];

  it('tracks best e1RM and heaviest weight', () => {
    const { bests } = computePRs(history);
    const b = bests.get('bench press');
    expect(b.maxWeight).toBe(145);
    expect(b.e1rm).toBeCloseTo(e1rm(135, 9));
    expect(b.sessions).toBe(3);
  });

  it('does not flag the first session, flags later improvements', () => {
    const { prSets } = computePRs(history);
    expect(prSets.has('w1:0:0')).toBe(false);
    expect(prSets.get('w2:0:0')).toEqual({ e1rm: false, weight: true }); // 140x6 < 135x8 e1RM, but heavier
    expect(prSets.get('w2:0:1')).toEqual({ e1rm: true, weight: false }); // 135x9
    expect(prSets.get('w3:0:0')).toEqual({ e1rm: false, weight: true });
  });

  it('matches exercises by name regardless of case/spacing', () => {
    const { bests } = computePRs([...history, workout('w4', '2026-01-10', [{ ...bench([150, 1]), name: ' bench  press' }])]);
    expect(bests.get('bench press').maxWeight).toBe(150);
  });

  it('flags live PRs in an in-progress workout, ignoring unticked sets', () => {
    const draft = {
      exercises: [
        {
          name: 'Bench Press',
          sets: [
            { weight: '155', reps: '5', done: true },
            { weight: '200', reps: '5', done: false },
          ],
        },
      ],
    };
    const live = livePRs(history, draft);
    expect(live.get('0:0')).toEqual({ e1rm: true, weight: true });
    expect(live.has('0:1')).toBe(false);
  });

  it('lastPerformance returns the most recent session', () => {
    expect(lastPerformance(history, 'bench press').workoutId).toBe('w3');
    expect(lastPerformance(workoutsBefore(history, history[2]), 'Bench Press').workoutId).toBe('w2');
    expect(lastPerformance(history, 'Squat')).toBeNull();
  });
});

describe('finalizeDraft', () => {
  it('keeps only ticked sets and converts text to numbers', () => {
    const w = finalizeDraft({
      id: 'd1',
      name: 'Upper A',
      date: '2026-02-01',
      startedAt: 1,
      exercises: [
        { id: 'e1', name: 'Bench Press', muscle: 'Chest', sets: [{ weight: '135', reps: '8', rpe: '', done: true }, { weight: '135', reps: '', done: false }] },
        { id: 'e2', name: 'Row', muscle: 'Back', sets: [{ weight: '95', reps: '10', done: false }] },
      ],
    });
    expect(w.id).toBe('d1');
    expect(w.exercises).toHaveLength(1);
    expect(w.exercises[0].sets).toEqual([{ weight: 135, reps: 8 }]);
  });
});

describe('bodyweight', () => {
  const weights = [
    { date: '2026-03-01', weight: 158 },
    { date: '2026-03-02', weight: 159 },
    { date: '2026-03-09', weight: 160 },
  ];
  it('7-day moving average uses calendar days, not entry count', () => {
    const ma = withMovingAverage(weights);
    expect(ma[0].avg).toBe(158);
    expect(ma[1].avg).toBe(158.5);
    expect(ma[2].avg).toBe(160); // Mar 1-2 are more than 6 days before Mar 9
  });

  it('weekly rate is the slope of a best-fit line', () => {
    const ref = '2026-03-28';
    const steady = Array.from({ length: 28 }, (_, i) => ({ date: addDays('2026-03-01', i), weight: 158 + i * (0.5 / 7) }));
    expect(weeklyRate(steady, ref).perWeek).toBeCloseTo(0.5, 5);
  });

  it('weekly rate needs enough data', () => {
    expect(weeklyRate(weights.slice(0, 2), '2026-03-09')).toBeNull();
    expect(weeklyRate([{ date: '2026-03-01', weight: 1 }, { date: '2026-03-02', weight: 1 }, { date: '2026-03-03', weight: 1 }], '2026-03-03')).toBeNull();
  });
});

describe('weeks, cardio, volume, nutrition', () => {
  it('weeks start on Monday', () => {
    expect(weekdayIndex('2026-10-05')).toBe(0); // a Monday
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05'); // Sunday -> Monday
    expect(daysBetween('2026-10-05', '2026-10-12')).toBe(7);
  });

  it('sums cardio minutes inside the week only', () => {
    const cardio = [
      { date: '2026-10-04', minutes: 30 },
      { date: '2026-10-05', minutes: 40 },
      { date: '2026-10-11', minutes: 35 },
      { date: '2026-10-12', minutes: 20 },
    ];
    expect(cardioMinutesInWeek(cardio, '2026-10-05')).toBe(75);
  });

  it('counts sets and tonnage per muscle', () => {
    const v = weeklyMuscleVolume([workout('w', '2026-10-06', [bench([100, 10], [100, 8])])], '2026-10-05');
    expect(v.Chest).toEqual({ sets: 2, tonnage: 1800 });
  });

  it('totals food for a day with servings', () => {
    const log = [
      { date: '2026-10-05', calories: 100, protein: 10, qty: 2 },
      { date: '2026-10-05', calories: 500, protein: 40, carbs: 50 },
      { date: '2026-10-06', calories: 999, protein: 99 },
    ];
    expect(dayTotals(log, '2026-10-05')).toEqual({ calories: 700, protein: 60, carbs: 50, fat: 0 });
  });
});

describe('planForDay', () => {
  it('weekly mode follows the day of the week', () => {
    const s = createDefaultState();
    expect(planForDay(s, '2026-10-05').template.name).toBe('Upper A'); // Monday
    const wed = planForDay(s, '2026-10-07');
    expect(wed.rest).toBe(true);
    expect(wed.next.template.name).toBe('Upper B');
    expect(wed.next.date).toBe('2026-10-08');
  });

  it('rotation mode picks the next template after the last workout', () => {
    const s = { ...createDefaultState(), settings: { ...createDefaultState().settings, scheduleMode: 'rotation' } };
    expect(planForDay(s, '2026-10-07').template.name).toBe('Upper A');
    s.workouts = [workout('w', '2026-10-06', [], 0)];
    s.workouts[0].templateId = 'lower-b';
    expect(planForDay(s, '2026-10-07').template.name).toBe('Upper A');
    s.workouts[0].templateId = 'upper-a';
    expect(planForDay(s, '2026-10-07').template.name).toBe('Lower A');
  });
});

describe('backup import/export', () => {
  it('round-trips data', () => {
    const s = createDefaultState();
    s.weights.push({ id: 'x', date: '2026-10-01', weight: 158 });
    const back = parseImport(serializeForExport(s));
    expect(back.weights).toEqual(s.weights);
    expect(back.templates).toHaveLength(4);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseImport('not json')).toThrow(/valid JSON/);
    expect(() => parseImport('{"hello": 1}')).toThrow(/backup/);
  });

  it('fills in missing fields from older files', () => {
    const s = normalize({ weights: [{ date: '2026-01-01', weight: 150 }], settings: { proteinTarget: 170 } });
    expect(s.settings.proteinTarget).toBe(170);
    expect(s.settings.calorieTarget).toBe(2800);
    expect(s.workouts).toEqual([]);
    expect(s.templates).toHaveLength(4);
  });
});
