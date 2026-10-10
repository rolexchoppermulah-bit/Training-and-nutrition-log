import { useMemo } from 'react';
import { Trophy, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { deleteWorkout, editWorkout } from '../lib/actions.js';
import { computePRs, workoutStats } from '../lib/calc.js';
import { formatDate, formatDuration } from '../lib/dates.js';
import { navigate } from '../lib/router.js';
import TopBar from '../components/TopBar.jsx';
import { Button, Card, fmt, useToast } from '../components/ui.jsx';

export default function WorkoutDetail({ id }) {
  const state = useStore();
  const toast = useToast();
  const w = state.workouts.find((x) => x.id === id);
  const { prSets } = useMemo(() => computePRs(state.workouts), [state.workouts]);

  if (!w) {
    return (
      <>
        <TopBar title="Workout" back="/lift/history" />
        <div className="page muted">This workout was deleted.</div>
      </>
    );
  }

  const st = workoutStats(w);
  const onEdit = () => {
    if (state.draft) {
      toast('Finish or discard your current workout first');
      return;
    }
    editWorkout(w.id);
    navigate('/lift');
  };
  const onDelete = () => {
    if (!window.confirm(`Delete ${w.name} from ${formatDate(w.date)}? This can't be undone.`)) return;
    deleteWorkout(w.id);
    toast('Workout deleted');
    navigate('/lift/history');
  };

  return (
    <>
      <TopBar title={w.name} back="/lift/history" />
      <div className="page">
        <Card>
          <div className="muted">{formatDate(w.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 10 }}>
            <div className="stat">
              <div className="stat-label">Time</div>
              <div className="stat-value">{w.finishedAt && w.startedAt ? formatDuration(w.finishedAt - w.startedAt) : '—'}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Sets</div>
              <div className="stat-value">{st.sets}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Volume (lb)</div>
              <div className="stat-value">{fmt(st.volume)}</div>
            </div>
          </div>
          {w.notes && <p style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{w.notes}</p>}
        </Card>

        {w.exercises.map((ex, ei) => (
          <Card key={ei}>
            <div className="row between">
              <div className="exercise-name">{ex.name}</div>
              <span className="badge">{ex.muscle}</span>
            </div>
            <div className="list" style={{ marginTop: 6 }}>
              {ex.sets.map((s, si) => {
                const pr = prSets.get(`${w.id}:${ei}:${si}`);
                return (
                  <div key={si} className="list-item" style={{ minHeight: 40 }}>
                    <span className="faint tabular" style={{ width: 22 }}>
                      {si + 1}
                    </span>
                    <span className="grow tabular" style={{ fontWeight: 600 }}>
                      {fmt(s.weight, 1)} lb × {s.reps}
                      {s.rpe ? <span className="muted small"> @ RPE {s.rpe}</span> : null}
                    </span>
                    {pr && (
                      <span className="badge pr">
                        <Trophy size={11} /> PR
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <div className="grid-2">
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={16} /> Delete
          </Button>
          <Button onClick={onEdit}>
            <Pencil size={16} /> Edit
          </Button>
        </div>
      </div>
    </>
  );
}
