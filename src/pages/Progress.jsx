import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChartLine } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { computePRs, exerciseSessions, normName, weeklyMuscleVolume } from '../lib/calc.js';
import { addDays, formatDate, formatWeekRange, relativeDay, startOfWeek, today } from '../lib/dates.js';
import { MUSCLES } from '../lib/defaults.js';
import { navigate } from '../lib/router.js';
import TopBar from '../components/TopBar.jsx';
import { Card, EmptyState, Field, IconButton, Segmented, fmt } from '../components/ui.jsx';
import { E1rmChart, VolumeChart } from '../components/charts/index.jsx';
import { signed } from './Weight.jsx';

export default function Progress({ params }) {
  const state = useStore();
  if (!state.workouts.length) {
    return (
      <>
        <TopBar title="Progress" />
        <div className="page">
          <Card>
            <EmptyState icon={<ChartLine size={28} />} title="No lifting data yet">
              Strength and volume charts appear once you&apos;ve logged a workout or two.
            </EmptyState>
          </Card>
        </div>
      </>
    );
  }
  return (
    <>
      <TopBar title="Progress" />
      <div className="page">
        <StrengthCard state={state} initial={params.get('ex')} />
        <VolumeCard state={state} />
        <VolumeGridCard state={state} />
      </div>
    </>
  );
}

function StrengthCard({ state, initial }) {
  const { bests } = useMemo(() => computePRs(state.workouts), [state.workouts]);
  const options = useMemo(() => [...bests.values()], [bests]);
  const defaultName = useMemo(() => {
    if (initial && bests.has(normName(initial))) return bests.get(normName(initial)).name;
    return [...options].sort((a, b) => b.sessions - a.sessions)[0]?.name;
  }, [initial, bests, options]);
  const [picked, setPicked] = useState(null);
  const name = picked && bests.has(normName(picked)) ? picked : defaultName;
  const sessions = useMemo(() => (name ? exerciseSessions(state.workouts, name) : []), [state.workouts, name]);
  const best = name ? bests.get(normName(name)) : null;

  const byMuscle = MUSCLES.map((m) => ({ muscle: m, items: options.filter((o) => (o.muscle || 'Other') === m).sort((a, b) => a.name.localeCompare(b.name)) })).filter(
    (g) => g.items.length,
  );
  const change = sessions.length > 1 ? sessions[sessions.length - 1].e1rm - sessions[0].e1rm : null;

  return (
    <Card title="Estimated 1-rep max">
      <div className="stack">
        <Field label="Exercise">
          <select
            className="input"
            value={name || ''}
            onChange={(e) => {
              setPicked(e.target.value);
              navigate(`/progress?ex=${encodeURIComponent(e.target.value)}`);
            }}
          >
            {byMuscle.map((g) => (
              <optgroup key={g.muscle} label={g.muscle}>
                {g.items.map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        {best && (
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="stat">
              <div className="stat-label">Best e1RM</div>
              <div className="stat-value">{fmt(best.e1rm)}</div>
              <div className="stat-sub">lb</div>
            </div>
            <div className="stat">
              <div className="stat-label">Change</div>
              <div className="stat-value">{change != null ? signed(change, 0) : '—'}</div>
              <div className="stat-sub">first → latest</div>
            </div>
            <div className="stat">
              <div className="stat-label">Heaviest</div>
              <div className="stat-value">{fmt(best.maxWeight, 1)}</div>
              <div className="stat-sub">lb × {best.maxWeightSet?.reps}</div>
            </div>
          </div>
        )}

        {sessions.length > 0 && <E1rmChart sessions={sessions} name={name} />}
        {sessions.length === 1 && <p className="small faint" style={{ margin: 0 }}>One session so far. The line appears after your next one.</p>}

        <p className="small faint" style={{ margin: 0 }}>
          Estimated 1RM = weight × (1 + reps ÷ 30), using your best set each session. It lets you compare a set of 8 with a set of
          5, so the line climbs whether you add weight or reps.
        </p>

        <details className="data-details">
          <summary>Show sessions ({sessions.length})</summary>
          <div className="list">
            {[...sessions].reverse().map((s) => (
              <div className="list-item" key={s.workoutId} style={{ minHeight: 44 }}>
                <span className="grow">{relativeDay(s.date)}</span>
                <span className="tabular muted">
                  {fmt(s.weight, 1)} × {s.reps}
                </span>
                <strong className="tabular" style={{ width: 56, textAlign: 'right' }}>
                  {fmt(s.e1rm)}
                </strong>
              </div>
            ))}
          </div>
        </details>
      </div>
    </Card>
  );
}

function VolumeCard({ state }) {
  const thisWeek = startOfWeek(today());
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [metric, setMetric] = useState('sets');

  const rows = useMemo(() => {
    const cur = weeklyMuscleVolume(state.workouts, weekStart);
    const prev = weeklyMuscleVolume(state.workouts, addDays(weekStart, -7));
    const pick = (v) => (v ? (metric === 'sets' ? v.sets : v.tonnage) : 0);
    return MUSCLES.filter((m) => cur[m]?.sets).map((m) => ({ muscle: m, value: pick(cur[m]), prev: pick(prev[m]) }));
  }, [state.workouts, weekStart, metric]);

  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <Card title="Weekly volume by muscle">
      <div className="stack">
        <div className="day-nav">
          <IconButton label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft size={22} />
          </IconButton>
          <div className="label">
            <div>{weekStart === thisWeek ? 'This week' : formatWeekRange(weekStart)}</div>
            <div className="small muted" style={{ fontWeight: 500 }}>
              {metric === 'sets' ? `${fmt(total)} sets total` : `${fmt(total)} lb total`}
            </div>
          </div>
          <IconButton label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))} disabled={weekStart >= thisWeek}>
            <ChevronRight size={22} />
          </IconButton>
        </div>
        <Segmented
          options={[
            { value: 'sets', label: 'Sets' },
            { value: 'tonnage', label: 'Pounds lifted' },
          ]}
          value={metric}
          onChange={setMetric}
        />
        {rows.length ? (
          <VolumeChart rows={rows} metric={metric} />
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            No workouts logged this week.
          </p>
        )}
        <p className="small faint" style={{ margin: 0 }}>
          {metric === 'sets'
            ? 'Counts every logged set toward the muscle the exercise is tagged with. A common muscle-building guideline is roughly 10–20 sets per muscle per week.'
            : 'Pounds lifted = weight × reps, added up across all sets.'}
        </p>
      </div>
    </Card>
  );
}

// Dark-mode sequential ramp (one hue): darker = fewer sets, brighter = more.
const RAMP = [
  { min: 1, bg: '#184f95', ink: '#ffffff' },
  { min: 4, bg: '#1c5cab', ink: '#ffffff' },
  { min: 7, bg: '#256abf', ink: '#ffffff' },
  { min: 10, bg: '#2a78d6', ink: '#ffffff' },
  { min: 13, bg: '#3987e5', ink: '#0e1014' },
  { min: 16, bg: '#5598e7', ink: '#0e1014' },
  { min: 20, bg: '#6da7ec', ink: '#0e1014' },
];
const stepFor = (n) => [...RAMP].reverse().find((r) => n >= r.min);

function VolumeGridCard({ state }) {
  const weeks = useMemo(() => {
    const thisWeek = startOfWeek(today());
    return Array.from({ length: 6 }, (_, i) => addDays(thisWeek, -7 * (5 - i)));
  }, []);
  const grid = useMemo(() => weeks.map((w) => weeklyMuscleVolume(state.workouts, w)), [weeks, state.workouts]);
  const muscles = MUSCLES.filter((m) => grid.some((g) => g[m]?.sets));
  if (!muscles.length) return null;

  return (
    <Card title="Sets per muscle · last 6 weeks">
      <table className="heat">
        <thead>
          <tr>
            <th className="muscle" scope="col">
              <span className="sr-only">Muscle</span>
            </th>
            {weeks.map((w, i) => (
              <th key={w} scope="col">
                {i === weeks.length - 1 ? 'Now' : formatDate(w, { month: 'numeric', day: 'numeric' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {muscles.map((m) => (
            <tr key={m}>
              <th className="muscle" scope="row">
                {m}
              </th>
              {grid.map((g, i) => {
                const n = g[m]?.sets || 0;
                const step = n ? stepFor(n) : null;
                return (
                  <td key={weeks[i]} style={step ? { background: step.bg, color: step.ink } : { background: 'var(--surface-2)', color: 'var(--faint)' }}>
                    {n || '·'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row small muted" style={{ marginTop: 10, gap: 6 }} aria-hidden="true">
        <span>Fewer</span>
        {RAMP.map((r) => (
          <span key={r.min} style={{ width: 16, height: 10, borderRadius: 3, background: r.bg, display: 'inline-block' }} />
        ))}
        <span>More sets</span>
      </div>
      <p className="small faint" style={{ margin: '8px 0 0' }}>
        Columns are weeks starting Monday ({formatDate(weeks[0])} to now).
      </p>
    </Card>
  );
}
