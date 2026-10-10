import { useMemo, useState } from 'react';
import { Check, Plus, Minus, Trash2, Trophy, ArrowUp, Clock, History } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { updateDraft, discardDraft, finishDraft, draftHistory, draftExercise } from '../lib/actions.js';
import { computePRs, livePRs, lastPerformance, overloadSuggestion, normName, e1rm } from '../lib/calc.js';
import { formatClock, formatDate, relativeDay } from '../lib/dates.js';
import { MUSCLES } from '../lib/defaults.js';
import { Button, Card, Field, IconButton, NumInput, Sheet, fmt, useNow, useToast } from '../components/ui.jsx';

const setLabel = (s) => `${fmt(s.weight, 1)}×${s.reps}`;

export function rangeLabel(ex) {
  const n = ex.targetSets || ex.sets;
  if (ex.repMin && ex.repMax) return `${n} × ${ex.repMin === ex.repMax ? ex.repMin : `${ex.repMin}–${ex.repMax}`}`;
  return `${n} sets`;
}

export default function WorkoutLogger({ onFinished }) {
  const state = useStore();
  const draft = state.draft;
  const toast = useToast();
  const now = useNow(1000);
  const [adding, setAdding] = useState(false);
  const [invalid, setInvalid] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => draftHistory(state), [state.workouts, draft.editingId, draft.date]);
  const { bests } = useMemo(() => computePRs(history), [history]);
  const live = useMemo(() => livePRs(history, draft), [history, draft]);
  const knownNames = useMemo(() => {
    const names = new Map();
    for (const t of state.templates) for (const e of t.exercises) names.set(normName(e.name), e);
    for (const w of state.workouts) for (const e of w.exercises) if (!names.has(normName(e.name))) names.set(normName(e.name), e);
    return names;
  }, [state.templates, state.workouts]);

  const editing = !!draft.editingId;

  const mapSet = (d, ei, si, fn) => ({
    ...d,
    exercises: d.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j !== si ? s : fn(s))) })),
  });

  const setField = (ei, si, field, value) =>
    updateDraft((d) =>
      mapSet(d, ei, si, (s) => {
        const next = { ...s, [field]: value, ...(field === 'weight' ? { touched: true } : {}) };
        // A ticked set that no longer has a weight and reps goes back to unticked,
        // so it can't be saved half-empty (and the finish warning counts it).
        if (next.done && (next.weight === '' || !(Number(next.reps) > 0))) next.done = false;
        return next;
      }),
    );

  const flagInvalid = (id) => {
    setInvalid(id);
    document.getElementById(id)?.focus();
    setTimeout(() => setInvalid(null), 450);
  };

  const toggleDone = (ei, si, placeholder) => {
    const ex = draft.exercises[ei];
    const set = ex.sets[si];
    if (set.done) {
      updateDraft((d) => mapSet(d, ei, si, (s) => ({ ...s, done: false })));
      return;
    }
    const weight = set.weight !== '' ? set.weight : placeholder.weight;
    const reps = set.reps !== '' ? set.reps : placeholder.reps;
    if (weight === '' || weight == null) return flagInvalid(`w-${ex.id}-${si}`);
    if (!(Number(reps) > 0)) return flagInvalid(`r-${ex.id}-${si}`);

    let next = mapSet(draft, ei, si, (s) => ({ ...s, weight: String(weight), reps: String(reps), done: true }));
    // Carry this weight forward to later sets you haven't touched yet.
    next = {
      ...next,
      exercises: next.exercises.map((e, i) =>
        i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j > si && !s.done && !s.touched ? { ...s, weight: String(weight) } : s)) },
      ),
    };
    updateDraft(() => next);

    const pr = livePRs(history, next).get(`${ei}:${si}`);
    if (pr) {
      const kind = pr.weight && pr.e1rm ? 'weight + e1RM' : pr.weight ? 'heaviest weight' : 'est. 1RM';
      toast(`New PR! ${ex.name} ${fmt(Number(weight), 1)} × ${reps} (${kind})`, { tone: 'pr', duration: 3500 });
      navigator.vibrate?.(60);
    }
  };

  const addSet = (ei) =>
    updateDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, i) => {
        if (i !== ei) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { weight: last ? last.weight : '', reps: '', rpe: '', done: false }] };
      }),
    }));

  const removeSet = (ei) =>
    updateDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, i) => (i !== ei || e.sets.length <= 1 ? e : { ...e, sets: e.sets.slice(0, -1) })),
    }));

  const removeExercise = (ei) => {
    if (!window.confirm(`Remove ${draft.exercises[ei].name} from this workout?`)) return;
    updateDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== ei) }));
  };

  const finish = () => {
    const all = draft.exercises.flatMap((e) => e.sets);
    const done = all.filter((s) => s.done).length;
    if (!done) {
      if (window.confirm('No sets are ticked off yet. Discard this workout?')) discardDraft();
      return;
    }
    const left = all.length - done;
    if (left && !window.confirm(`${left} set${left > 1 ? 's' : ''} not ticked off. Unticked sets won't be saved. Finish anyway?`)) return;
    const saved = finishDraft();
    if (!saved) {
      toast('Tick off at least one set with weight and reps');
      return;
    }
    onFinished(saved, editing);
  };

  const discard = () => {
    const msg = editing ? 'Stop editing? Your changes will be lost.' : 'Discard this workout? Nothing from it will be saved.';
    if (window.confirm(msg)) discardDraft();
  };

  return (
    <>
      <header className="workout-bar">
        <div className="grow">
          <h1 className="ellipsis">{editing ? `Editing ${draft.name}` : draft.name}</h1>
          <div className="timer">
            {editing ? (
              relativeDay(draft.date)
            ) : (
              <>
                <Clock size={13} /> {formatClock(now - draft.startedAt)}
              </>
            )}
          </div>
        </div>
        <Button variant="primary" onClick={finish}>
          {editing ? 'Save' : 'Finish'}
        </Button>
      </header>

      <div className="page">
        {draft.exercises.map((ex, ei) => (
          <ExerciseBlock
            key={ex.id}
            ex={ex}
            ei={ei}
            history={history}
            best={bests.get(normName(ex.name))}
            live={live}
            invalid={invalid}
            onField={setField}
            onToggle={toggleDone}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onRemove={removeExercise}
          />
        ))}

        <Button variant="outline" block onClick={() => setAdding(true)}>
          <Plus size={18} /> Add exercise
        </Button>

        <Card>
          <div className="stack">
            <Field label="Date">
              <input className="input" type="date" value={draft.date} onChange={(e) => e.target.value && updateDraft((d) => ({ ...d, date: e.target.value }))} />
            </Field>
            <Field label="Notes (optional)">
              <textarea
                className="input"
                value={draft.notes || ''}
                placeholder="How did it feel? Anything to remember next time?"
                onChange={(e) => updateDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </Field>
          </div>
        </Card>

        <div className="grid-2">
          <Button variant="danger" onClick={discard}>
            {editing ? 'Cancel edit' : 'Discard'}
          </Button>
          <Button variant="primary" onClick={finish}>
            {editing ? 'Save changes' : 'Finish workout'}
          </Button>
        </div>
      </div>

      <AddExerciseSheet
        open={adding}
        onClose={() => setAdding(false)}
        knownNames={knownNames}
        onAdd={(plan) => {
          updateDraft((d) => ({ ...d, exercises: [...d.exercises, draftExercise(plan, history)] }));
          setAdding(false);
        }}
      />
    </>
  );
}

function ExerciseBlock({ ex, ei, history, best, live, invalid, onField, onToggle, onAddSet, onRemoveSet, onRemove }) {
  const last = useMemo(() => lastPerformance(history, ex.name), [history, ex.name]);
  const sugg = last ? overloadSuggestion(last.sets, { sets: ex.targetSets, repMax: ex.repMax, increment: ex.increment }) : null;

  return (
    <Card className="exercise-card">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="exercise-name">{ex.name}</div>
          <div className="small muted">
            {rangeLabel(ex)} reps · {ex.muscle}
          </div>
        </div>
        <IconButton label={`Remove ${ex.name}`} onClick={() => onRemove(ei)}>
          <Trash2 size={18} />
        </IconButton>
      </div>

      <div className="stack-sm" style={{ marginTop: 8 }}>
        {last ? (
          <div className="small muted row" style={{ alignItems: 'flex-start' }}>
            <History size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              Last time ({formatDate(last.date)}): <span className="tabular">{last.sets.map(setLabel).join(', ')}</span>
            </span>
          </div>
        ) : (
          <div className="small faint">First time logging this. Pick a weight you can lift for {ex.repMin && ex.repMax ? `${ex.repMin}–${ex.repMax}` : 'your target'} reps.</div>
        )}
        {sugg && (
          <div className="callout accent">
            <ArrowUp size={16} />
            <span>
              You hit {ex.repMax}+ reps on every set last time. <strong>Go up to {fmt(sugg.weight, 1)} lb</strong> today.
            </span>
          </div>
        )}
        {best?.e1rmSet && (
          <div className="small faint">
            Best: {setLabel(best.e1rmSet)} (est. 1RM {fmt(e1rm(best.e1rmSet.weight, best.e1rmSet.reps))}) · Heaviest {fmt(best.maxWeight, 1)} lb
          </div>
        )}
      </div>

      <div className="set-grid set-head">
        <span>Set</span>
        <span>lb</span>
        <span>Reps</span>
        <span>RPE</span>
        <span aria-hidden="true" />
      </div>
      {ex.sets.map((s, si) => {
        const prev = last?.sets[si];
        const placeholder = {
          weight: prev ? String(prev.weight) : '',
          reps: sugg ? String(ex.repMin || '') : prev ? String(prev.reps) : '',
        };
        const pr = s.done ? live.get(`${ei}:${si}`) : null;
        const wId = `w-${ex.id}-${si}`;
        const rId = `r-${ex.id}-${si}`;
        return (
          <div key={si} className={`set-grid set-row ${s.done ? 'done' : ''} ${pr ? 'is-pr' : ''}`}>
            <div className="set-num">
              <strong>
                {si + 1}{' '}
                {pr && (
                  <span className="pr-tag">
                    <Trophy size={11} /> PR
                  </span>
                )}
              </strong>
              <span className="set-prev">{prev ? setLabel(prev) : '—'}</span>
            </div>
            <NumInput
              id={wId}
              className={`set-input ${invalid === wId ? 'shake' : ''}`}
              aria-label={`Set ${si + 1} weight`}
              placeholder={placeholder.weight || 'lb'}
              value={s.weight}
              onChange={(v) => onField(ei, si, 'weight', v)}
            />
            <NumInput
              id={rId}
              className={`set-input ${invalid === rId ? 'shake' : ''}`}
              aria-label={`Set ${si + 1} reps`}
              inputMode="numeric"
              placeholder={placeholder.reps || (ex.repMin && ex.repMax ? `${ex.repMin}-${ex.repMax}` : '')}
              value={s.reps}
              onChange={(v) => onField(ei, si, 'reps', v.replace('.', ''))}
            />
            <NumInput
              className="set-input rpe"
              aria-label={`Set ${si + 1} RPE (optional)`}
              placeholder="–"
              value={s.rpe}
              onChange={(v) => onField(ei, si, 'rpe', v)}
            />
            <button
              type="button"
              className="check-btn"
              aria-label={s.done ? `Untick set ${si + 1}` : `Complete set ${si + 1}`}
              aria-pressed={s.done}
              onClick={() => onToggle(ei, si, placeholder)}
            >
              <Check size={22} strokeWidth={3} />
            </button>
          </div>
        );
      })}

      <div className="row" style={{ marginTop: 8 }}>
        <Button variant="secondary" size="sm" className="grow" onClick={() => onAddSet(ei)}>
          <Plus size={16} /> Add set
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onRemoveSet(ei)} disabled={ex.sets.length <= 1}>
          <Minus size={16} /> Remove set
        </Button>
      </div>
    </Card>
  );
}

function AddExerciseSheet({ open, onClose, onAdd, knownNames }) {
  const blank = { name: '', muscle: 'Chest', sets: '3', repMin: '8', repMax: '12', increment: '5' };
  const [f, setF] = useState(blank);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const onName = (name) => {
    const known = knownNames.get(normName(name));
    setF((x) =>
      known
        ? {
            ...x,
            name,
            muscle: known.muscle || x.muscle,
            sets: String(known.targetSets ?? (typeof known.sets === 'number' ? known.sets : x.sets)),
            repMin: String(known.repMin ?? x.repMin),
            repMax: String(known.repMax ?? x.repMax),
            increment: String(known.increment ?? x.increment),
          }
        : { ...x, name },
    );
  };

  const submit = () => {
    if (!f.name.trim()) return;
    onAdd({ ...f, name: f.name.trim() });
    setF(blank);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add exercise"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!f.name.trim()}>
            Add
          </Button>
        </>
      }
    >
      <Field label="Exercise">
        <input className="input" list="exercise-names" value={f.name} onChange={(e) => onName(e.target.value)} placeholder="e.g. Cable Fly" autoFocus />
        <datalist id="exercise-names">
          {[...knownNames.values()].map((e) => (
            <option key={e.name} value={e.name} />
          ))}
        </datalist>
      </Field>
      <Field label="Muscle group">
        <select className="input" value={f.muscle} onChange={(e) => set('muscle')(e.target.value)}>
          {MUSCLES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>
      <div className="tpl-nums">
        <Field label="Sets">
          <NumInput value={f.sets} onChange={set('sets')} />
        </Field>
        <Field label="Min reps">
          <NumInput value={f.repMin} onChange={set('repMin')} />
        </Field>
        <Field label="Max reps">
          <NumInput value={f.repMax} onChange={set('repMax')} />
        </Field>
        <Field label="+lb">
          <NumInput value={f.increment} onChange={set('increment')} />
        </Field>
      </div>
    </Sheet>
  );
}
