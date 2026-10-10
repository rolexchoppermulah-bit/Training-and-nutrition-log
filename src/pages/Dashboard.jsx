import { useMemo, useState } from 'react';
import { Play, Check, Moon, Plus, ChevronRight, ShieldAlert, Trophy } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { startWorkout, logWeight } from '../lib/actions.js';
import { cardioMinutesInWeek, computePRs, dayTotals, num, planForDay, workoutStats } from '../lib/calc.js';
import { daysBetween, formatClock, formatDate, parseISODate, startOfWeek, today, toISODate } from '../lib/dates.js';
import { navigate } from '../lib/router.js';
import TopBar from '../components/TopBar.jsx';
import { Button, Card, NumInput, ProgressBar, fmt, useNow, useToast } from '../components/ui.jsx';
import { MacroBars, quickAddFood, useSortedFoods } from './Food.jsx';
import { useWeightSummary, signed } from './Weight.jsx';

export default function Dashboard() {
  const state = useStore();
  const d = today();
  const title = parseISODate(d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  return (
    <>
      <TopBar title={title} />
      <div className="page">
        <WorkoutCard state={state} date={d} />
        <NutritionCard state={state} date={d} />
        <WeightCard state={state} date={d} />
        <CardioCard state={state} date={d} />
        <BackupNudge state={state} />
      </div>
    </>
  );
}

function WorkoutCard({ state, date }) {
  const plan = planForDay(state, date);
  const { draft } = state;
  const now = useNow(draft ? 1000 : 60000);
  const { prSets } = useMemo(() => computePRs(state.workouts), [state.workouts]);

  if (draft) {
    const done = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    const total = draft.exercises.reduce((n, e) => n + e.sets.length, 0);
    return (
      <Card title="Workout in progress" className="highlight">
        <div className="row between">
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{draft.editingId ? `Editing ${draft.name}` : draft.name}</div>
            <div className="muted small tabular">
              {done}/{total} sets{draft.editingId ? '' : ` · ${formatClock(now - draft.startedAt)}`}
            </div>
          </div>
          <Button variant="primary" onClick={() => navigate('/lift')}>
            <Play size={16} fill="currentColor" /> Resume
          </Button>
        </div>
      </Card>
    );
  }

  if (plan.doneWorkout) {
    const w = plan.doneWorkout;
    const st = workoutStats(w);
    const prs = [...prSets.keys()].filter((k) => k.startsWith(`${w.id}:`)).length;
    return (
      <Card title="Today's workout">
        <button type="button" className="list-item tappable" style={{ padding: 0, minHeight: 0 }} onClick={() => navigate(`/lift/workout/${w.id}`)}>
          <span className="check-btn" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }} aria-hidden="true">
            <Check size={22} strokeWidth={3} />
          </span>
          <div className="grow">
            <div style={{ fontSize: 20, fontWeight: 800 }}>{w.name} done</div>
            <div className="muted small">
              {st.sets} set{st.sets === 1 ? "" : "s"} · {fmt(st.volume)} lb
              {prs > 0 && (
                <span className="badge pr" style={{ marginLeft: 6 }}>
                  <Trophy size={11} /> {prs} PR{prs > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={18} className="faint" />
        </button>
      </Card>
    );
  }

  if (plan.rest) {
    return (
      <Card title="Today's workout">
        <div className="row">
          <Moon size={22} className="muted" />
          <div className="grow">
            <div style={{ fontSize: 20, fontWeight: 800 }}>Rest day</div>
            {plan.next && (
              <div className="muted small">
                Next up: {plan.next.template.name} on {formatDate(plan.next.date, { weekday: 'long' })}
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" block size="sm" style={{ marginTop: 10 }} onClick={() => navigate('/lift')}>
          Train anyway <ChevronRight size={16} />
        </Button>
      </Card>
    );
  }

  const t = plan.template;
  if (!t) return null;
  return (
    <Card title={state.settings.scheduleMode === 'rotation' ? 'Next workout' : "Today's workout"} className="highlight">
      <div style={{ fontSize: 24, fontWeight: 800 }}>{t.name}</div>
      <div className="small muted" style={{ margin: '4px 0 14px' }}>
        {t.exercises.map((e) => e.name).join(' · ')}
      </div>
      <Button
        variant="primary"
        size="lg"
        block
        onClick={() => {
          startWorkout(t.id);
          navigate('/lift');
        }}
      >
        <Play size={18} fill="currentColor" /> Start {t.name}
      </Button>
      <Button variant="ghost" size="sm" block style={{ marginTop: 4 }} onClick={() => navigate('/lift')}>
        Pick a different workout
      </Button>
    </Card>
  );
}

function NutritionCard({ state, date }) {
  const toast = useToast();
  const totals = dayTotals(state.foodLog, date);
  const foods = useSortedFoods(state).slice(0, 4);
  return (
    <Card
      title="Nutrition today"
      action={
        <button type="button" className="link-btn" onClick={() => navigate('/food')}>
          Food log
        </button>
      }
    >
      <MacroBars totals={totals} settings={state.settings} compact />
      {foods.length > 0 && (
        <div className="food-grid" style={{ marginTop: 14 }}>
          {foods.map((f) => (
            <button key={f.id} type="button" className="food-tile" onClick={() => quickAddFood(f, date, toast)} aria-label={`Add ${f.name}`}>
              <span className="name">{f.name}</span>
              <span className="macros">
                {fmt(f.calories)} cal · {fmt(f.protein)}g P
              </span>
              <span className="plus">
                <Plus size={18} />
              </span>
            </button>
          ))}
        </div>
      )}
      {foods.length === 0 && (
        <Button variant="secondary" block size="sm" style={{ marginTop: 14 }} onClick={() => navigate('/food')}>
          <Plus size={16} /> Log food
        </Button>
      )}
    </Card>
  );
}

function WeightCard({ state, date }) {
  const toast = useToast();
  const summary = useWeightSummary(state);
  const { latest, rate, toGo, goal } = summary;
  const loggedToday = latest?.date === date;
  const [value, setValue] = useState(() => String(latest?.weight ?? state.settings.startWeight ?? ''));

  return (
    <Card
      title="Bodyweight"
      action={
        <button type="button" className="link-btn" onClick={() => navigate('/weight')}>
          Trend
        </button>
      }
    >
      {latest ? (
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="big-number">
              {fmt(latest.weight, 1)}
              <span className="unit">lb</span>
            </div>
            <div className="small muted">
              {loggedToday ? 'Today' : formatDate(latest.date)} · 7-day avg {fmt(latest.avg, 1)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 18 }} className="tabular">
              {rate ? `${signed(rate.perWeek)} lb/wk` : '— lb/wk'}
            </div>
            <div className="small muted">{toGo != null && toGo > 0 ? `${fmt(toGo, 1)} lb to ${fmt(goal)}` : rate ? 'last 4 weeks' : 'trend needs more data'}</div>
          </div>
        </div>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>
          Log your morning weight to start your trend toward {fmt(goal)} lb.
        </p>
      )}
      {!loggedToday && (
        <div className="row" style={{ marginTop: 12 }}>
          <NumInput className="grow" aria-label="Today's weight" value={value} onChange={setValue} style={{ fontWeight: 700, fontSize: 18 }} />
          <Button
            variant="primary"
            onClick={() => {
              if (!(num(value) > 0)) return;
              logWeight(date, num(value));
              toast(`Logged ${fmt(num(value), 1)} lb`);
            }}
          >
            Log today
          </Button>
        </div>
      )}
    </Card>
  );
}

function CardioCard({ state, date }) {
  const minutes = cardioMinutesInWeek(state.cardio, startOfWeek(date));
  return (
    <Card
      title="Zone 2 this week"
      action={
        <button type="button" className="link-btn" onClick={() => navigate('/cardio')}>
          Log cardio
        </button>
      }
    >
      <ProgressBar label="Minutes" value={minutes} target={num(state.settings.cardioTarget)} unit=" min" color="var(--cardio)" />
    </Card>
  );
}

function BackupNudge({ state }) {
  const hasData = state.workouts.length + state.weights.length + state.foodLog.length + state.cardio.length > 5;
  const last = state.meta.lastExportAt ? toISODate(new Date(state.meta.lastExportAt)) : null;
  const stale = !last || daysBetween(last, today()) >= 14;
  if (!hasData || !stale) return null;
  return (
    <button type="button" className="callout pr" style={{ border: 'none', textAlign: 'left', width: '100%' }} onClick={() => navigate('/settings')}>
      <ShieldAlert size={18} />
      <span>
        <strong>Back up your data.</strong> {last ? 'Your last backup was over 2 weeks ago.' : "You haven't exported a backup yet."} Tap to
        export.
      </span>
    </button>
  );
}
