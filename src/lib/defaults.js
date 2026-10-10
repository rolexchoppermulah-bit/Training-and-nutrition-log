export const MUSCLES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Other',
];

export const CARDIO_TYPES = ['Walk', 'Incline walk', 'Bike', 'Elliptical', 'Rower', 'Stair climber', 'Jog', 'Swim', 'Other'];

// name, muscle, sets, rep range, weight to add when you hit the top of the range
const ex = (id, name, muscle, sets, repMin, repMax, increment = 5) => ({
  id,
  name,
  muscle,
  sets,
  repMin,
  repMax,
  increment,
});

export const DEFAULT_TEMPLATES = [
  {
    id: 'upper-a',
    name: 'Upper A',
    exercises: [
      ex('ua1', 'Bench Press', 'Chest', 3, 6, 8),
      ex('ua2', 'Barbell Row', 'Back', 3, 6, 8),
      ex('ua3', 'Seated Dumbbell Shoulder Press', 'Shoulders', 3, 8, 10),
      ex('ua4', 'Lat Pulldown', 'Back', 3, 8, 12),
      ex('ua5', 'EZ-Bar Curl', 'Biceps', 3, 10, 12),
      ex('ua6', 'Triceps Pushdown', 'Triceps', 3, 10, 12),
    ],
  },
  {
    id: 'lower-a',
    name: 'Lower A',
    exercises: [
      ex('la1', 'Back Squat', 'Quads', 3, 6, 8),
      ex('la2', 'Romanian Deadlift', 'Hamstrings', 3, 8, 10),
      ex('la3', 'Leg Press', 'Quads', 3, 10, 12, 10),
      ex('la4', 'Lying Leg Curl', 'Hamstrings', 3, 10, 12),
      ex('la5', 'Standing Calf Raise', 'Calves', 3, 10, 15),
      ex('la6', 'Cable Crunch', 'Core', 3, 10, 15),
    ],
  },
  {
    id: 'upper-b',
    name: 'Upper B',
    exercises: [
      ex('ub1', 'Overhead Press', 'Shoulders', 3, 6, 8),
      ex('ub2', 'Incline Dumbbell Press', 'Chest', 3, 8, 10),
      ex('ub3', 'Seated Cable Row', 'Back', 3, 8, 12),
      ex('ub4', 'Neutral-Grip Pulldown', 'Back', 3, 8, 12),
      ex('ub5', 'Lateral Raise', 'Shoulders', 3, 12, 15),
      ex('ub6', 'Hammer Curl', 'Biceps', 3, 10, 12),
      ex('ub7', 'Overhead Triceps Extension', 'Triceps', 3, 10, 12),
    ],
  },
  {
    id: 'lower-b',
    name: 'Lower B',
    exercises: [
      ex('lb1', 'Deadlift', 'Hamstrings', 3, 5, 7),
      ex('lb2', 'Bulgarian Split Squat', 'Quads', 3, 8, 10),
      ex('lb3', 'Hip Thrust', 'Glutes', 3, 8, 12, 10),
      ex('lb4', 'Leg Extension', 'Quads', 3, 10, 15),
      ex('lb5', 'Seated Leg Curl', 'Hamstrings', 3, 10, 12),
      ex('lb6', 'Seated Calf Raise', 'Calves', 3, 12, 15),
    ],
  },
];

export const DEFAULT_SETTINGS = {
  // Starting points only. Change them on the Settings page.
  calorieTarget: 2800,
  proteinTarget: 160,
  carbTarget: null,
  fatTarget: null,
  cardioTarget: 150, // zone 2 minutes per week
  startWeight: 158,
  goalWeight: 180,
  weeklyGainTarget: 0.5, // lb per week
  // 'weekly' = fixed days of the week, 'rotation' = next workout in order
  scheduleMode: 'weekly',
  // Mon … Sun, template id or null for a rest day
  weeklySchedule: ['upper-a', 'lower-a', null, 'upper-b', 'lower-b', null, null],
};

export function createDefaultState() {
  return {
    app: 'training-nutrition-log',
    version: 1,
    settings: { ...DEFAULT_SETTINGS, weeklySchedule: [...DEFAULT_SETTINGS.weeklySchedule] },
    templates: structuredClone(DEFAULT_TEMPLATES),
    workouts: [],
    draft: null, // the workout currently being logged
    cardio: [],
    foods: [], // saved foods / meals for one-tap logging
    foodLog: [],
    weights: [],
    meta: { lastExportAt: null },
  };
}
