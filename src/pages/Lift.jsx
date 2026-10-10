import { useMemo, useState } from 'react';
import { Play, Pencil, Plus, Trophy, Dumbbell, ChevronRight, ArrowUp, ChartLine } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { startWorkout } from '../lib/actions.js';
import { computePRs, planForDay, sortWorkouts, workoutStats, overloadSuggestion, e1rm } from '../lib/calc.js';
import { relativeDay, formatDate, formatDuration, today } from '../lib/dates.js';
import { MUSCLES } from '../lib/defaults.js';
import { navigate } from '../lib/router.js';
import TopBar from '../components/TopBar.jsx';
import { Button, Card, EmptyState, IconButton, Segmented, Sheet, fmt, useToast } from '../components/ui.jsx';
import WorkoutLogger from './WorkoutLogger.jsx';
import TemplateEditor from './TemplateEditor.jsx';
import WorkoutDetail from './WorkoutDetail.jsx';

export default function Lift({ parts }) {
  const state = useStore();
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [view, id] = parts;

  if (view === 'edit') return <TemplateEditor id={id} />;
  if (view === 'workout') return <WorkoutDetail id={id} />;

  if (state.draft) {
    return (
      <WorkoutLogger
        onFinished={(saved, wasEditing) => {
          if (wasEditing) {
            toast('Workout updated');
            navigate(`/lift/workout/${saved.id}`);
          } else {
            setSummary(saved);
          }
        }}
      />
    );
  }

  const tab = view === 'history' ? 'history' : view === 'prs' ? 'prs' : 'start';

  return (
    <>
      <TopBar title="Lift" />
      <div className="page">
        <Segmented
          options={[
            { value: 'start', label: 'Workouts' },
            { value: 'history', label: 'History' },
            { value: 'prs', label: 'PRs' },
          ]}
          value={tab}
          onChange={(v) => navigate(v === 'start' ? '/lift' : `/lift/${v}`)}
        />
        {tab === 'start' && <TemplateList state={state} />}
        {tab === 'history' && <HistoryList state={state} />}
        {tab === 'prs' && <PRList state={state} />}
      </div>
      <WorkoutSummary workout={summary} onClose={() => setSummary(null)} />
    </>
  );
}

function TemplateList({ state }) {
  const plan = planForDay(state);
  const lastDone = useMemo(() => {
    const m = {};
    for (const w of sortWorkouts(state.workouts)) m[w.templateId] = w.date;
    return m;
  }, [state.workouts]);

  const start = (tid) => {
    startWorkout(tid);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {state.templates.map((t) => {
        const isToday = plan.template?.id === t.id && !plan.doneWorkout;
        return (
          <Card key={t.id} className={isToday ? 'highlight' : ''}>
            <div className="row between">
              <div className="grow">
                <div className="row">
                  <h3 style={{ fontSize: 19 }}>{t.name}</h3>
                  {isToday && <span className="badge accent">{state.settings.scheduleMode === 'rotation' ? 'Up next' : 'Today'}</span>}
                </div>
                <div className="small muted" style={{ marginTop: 2 }}>
                  {t.exercises.length} exercises · {lastDone[t.id] ? `last done ${relativeDay(lastDone[t.id]).toLowerCase()}` : 'not done yet'}
                </div>
              </div>
              <IconButton label={`Edit ${t.name}`} onClick={() => navigate(`/lift/edit/${t.id}`)}>
                <Pencil size={18} />
              </IconButton>
            </div>
            <div className="small faint" style={{ margin: '8px 0 12px' }}>
              {t.exercises.map((e) => e.name).join(' · ') || 'No exercises yet'}
            </div>
            <Button variant={isToday ? 'primary' : 'secondary'} block onClick={() => start(t.id)} disabled={!t.exercises.length}>
              <Play size={16} fill="currentColor" /> Start {t.name}
            </Button>
          </Card>
        );
      })}
      <Button variant="ghost" block onClick={() => navigate('/lift/edit/new')}>
        <Plus size={18} /> New workout template
      </Button>
    </>
  );
}

function HistoryList({ state }) {
  const { prSets } = useMemo(() => computePRs(state.workouts), [state.workouts]);
  const list = useMemo(() => sortWorkouts(state.workouts).reverse(), [state.workouts]);
  if (!list.length) {
    return (
      <Card>
        <EmptyState icon={<Dumbbell size={28} />} title="No workouts yet">
          Finish your first workout and it will show up here.
        </EmptyState>
      </Card>
    );
  }
  return (
    <Card>
      <div className="list">
        {list.map((w) => {
          const st = workoutStats(w);
          const prs = [...prSets.keys()].filter((k) => k.startsWith(`${w.id}:`)).length;
          return (
            <button key={w.id} type="button" className="list-item tappable" onClick={() => navigate(`/lift/workout/${w.id}`)}>
              <div className="grow">
                <div className="row">
                  <span className="list-title">{w.name}</span>
                  {prs > 0 && (
                    <span className="badge pr">
                      <Trophy size={11} /> {prs} PR{prs > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="list-sub">
                  {relativeDay(w.date)} · {st.sets} set{st.sets === 1 ? "" : "s"} · {fmt(st.volume)} lb
                </div>
              </div>
              <ChevronRight size={18} className="faint" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function PRList({ state }) {
  const { bests } = useMemo(() => computePRs(state.workouts), [state.workouts]);
  const rows = [...bests.values()].sort(
    (a, b) => MUSCLES.indexOf(a.muscle) - MUSCLES.indexOf(b.muscle) || a.name.localeCompare(b.name),
  );
  if (!rows.length) {
    return (
      <Card>
        <EmptyState icon={<Trophy size={28} />} title="No records yet">
          Your best lifts appear here after you log workouts. A PR is flagged when you beat your heaviest weight or your
          estimated 1-rep max.
        </EmptyState>
      </Card>
    );
  }
  return (
    <Card>
      <div className="list">
        {rows.map((b) => (
          <button
            key={b.name}
            type="button"
            className="list-item tappable"
            onClick={() => b.e1rmSet && navigate(`/progress?ex=${encodeURIComponent(b.name)}`)}
          >
            <div className="grow">
              <div className="list-title">{b.name}</div>
              {b.e1rmSet ? (
                <>
                  <div className="list-sub tabular">
                    Est. 1RM <strong style={{ color: 'var(--text)' }}>{fmt(b.e1rm)}</strong> ({fmt(b.e1rmSet.weight, 1)}×{b.e1rmSet.reps},{' '}
                    {formatDate(b.e1rmSet.date)})
                  </div>
                  <div className="list-sub tabular">
                    Heaviest <strong style={{ color: 'var(--text)' }}>{fmt(b.maxWeight, 1)} lb</strong> ×{b.maxWeightSet.reps} (
                    {formatDate(b.maxWeightSet.date)})
                  </div>
                </>
              ) : (
                <div className="list-sub tabular">
                  Bodyweight · best <strong style={{ color: 'var(--text)' }}>{b.maxReps} reps</strong>
                </div>
              )}
            </div>
            <span className="badge">{b.muscle}</span>
            {b.e1rmSet && <ChartLine size={18} className="faint" />}
          </button>
        ))}
      </div>
    </Card>
  );
}

function WorkoutSummary({ workout, onClose }) {
  const state = useStore();
  const info = useMemo(() => {
    if (!workout) return null;
    const { prSets } = computePRs(state.workouts);
    const prs = [];
    for (const [k, v] of prSets) {
      const [wid, ei, si] = k.split(':');
      if (wid !== workout.id) continue;
      const ex = workout.exercises[ei];
      const s = ex.sets[si];
      prs.push({ name: ex.name, set: s, kind: v.weight && v.e1rm ? 'Heaviest + est. 1RM' : v.weight ? 'Heaviest weight' : 'Est. 1RM' });
    }
    const next = workout.exercises
      .map((ex) => ({ ex, sugg: overloadSuggestion(ex.sets, { sets: ex.targetSets, repMax: ex.repMax, increment: ex.increment }) }))
      .filter((x) => x.sugg);
    return { prs, next, stats: workoutStats(workout) };
  }, [workout, state.workouts]);

  if (!workout || !info) return null;
  return (
    <Sheet
      open
      onClose={onClose}
      title="Workout saved 💪"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="stat">
          <div className="stat-label">Time</div>
          <div className="stat-value">{formatDuration(workout.finishedAt - workout.startedAt)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Sets</div>
          <div className="stat-value">{info.stats.sets}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Volume</div>
          <div className="stat-value">{fmt(info.stats.volume)}</div>
        </div>
      </div>
      {info.prs.length > 0 && (
        <div className="stack-sm">
          <div className="card-title">New PRs</div>
          {info.prs.map((p, i) => (
            <div key={i} className="callout pr">
              <Trophy size={16} />
              <span>
                <strong>{p.name}</strong> {fmt(p.set.weight, 1)} × {p.set.reps}{' '}
                <span className="small">
                  ({p.kind}, est. 1RM {fmt(e1rm(p.set.weight, p.set.reps))})
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      {info.next.length > 0 && (
        <div className="stack-sm">
          <div className="card-title">Add weight next time</div>
          {info.next.map(({ ex, sugg }) => (
            <div key={ex.name} className="callout accent">
              <ArrowUp size={16} />
              <span>
                <strong>{ex.name}</strong>: you hit {ex.repMax}+ reps on every set. Go to {fmt(sugg.weight, 1)} lb.
              </span>
            </div>
          ))}
        </div>
      )}
      {!info.prs.length && !info.next.length && <p className="muted small">Logged for {relativeDay(workout.date, today()).toLowerCase()}. Keep stacking sessions.</p>}
    </Sheet>
  );
}
