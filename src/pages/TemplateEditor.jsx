import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { saveTemplates, uid } from '../lib/actions.js';
import { MUSCLES } from '../lib/defaults.js';
import { navigate } from '../lib/router.js';
import TopBar from '../components/TopBar.jsx';
import { Button, Card, Field, IconButton, NumInput, useToast } from '../components/ui.jsx';

const toForm = (e) => ({
  ...e,
  sets: String(e.sets ?? 3),
  repMin: String(e.repMin ?? ''),
  repMax: String(e.repMax ?? ''),
  increment: String(e.increment ?? 5),
});

export default function TemplateEditor({ id }) {
  const state = useStore();
  const toast = useToast();
  const isNew = id === 'new';
  const original = state.templates.find((t) => t.id === id);
  const [name, setName] = useState(original?.name ?? 'New workout');
  const [exercises, setExercises] = useState(() => (original?.exercises ?? []).map(toForm));

  const allNames = useMemo(() => {
    const s = new Set();
    state.templates.forEach((t) => t.exercises.forEach((e) => s.add(e.name)));
    state.workouts.forEach((w) => w.exercises.forEach((e) => s.add(e.name)));
    return [...s].sort();
  }, [state.templates, state.workouts]);

  if (!isNew && !original) {
    return (
      <>
        <TopBar title="Not found" back="/lift" />
        <div className="page muted">That template no longer exists.</div>
      </>
    );
  }

  const change = (i, k, v) => setExercises((list) => list.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const move = (i, dir) =>
    setExercises((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const remove = (i) => setExercises((list) => list.filter((_, j) => j !== i));
  const add = () =>
    setExercises((list) => [...list, { id: uid(), name: '', muscle: 'Chest', sets: '3', repMin: '8', repMax: '12', increment: '5' }]);

  const save = () => {
    const clean = exercises
      .filter((e) => e.name.trim())
      .map((e) => {
        let lo = Math.max(1, parseInt(e.repMin, 10) || 1);
        let hi = Math.max(1, parseInt(e.repMax, 10) || lo);
        if (lo > hi) [lo, hi] = [hi, lo];
        return {
          id: e.id || uid(),
          name: e.name.trim(),
          muscle: e.muscle,
          sets: Math.max(1, parseInt(e.sets, 10) || 3),
          repMin: lo,
          repMax: hi,
          increment: Math.max(0, parseFloat(e.increment) || 5),
        };
      });
    const tpl = { id: original?.id ?? uid(), name: name.trim() || 'Workout', exercises: clean };
    saveTemplates(isNew ? [...state.templates, tpl] : state.templates.map((t) => (t.id === tpl.id ? tpl : t)));
    toast('Template saved');
    navigate('/lift');
  };

  const del = () => {
    if (!window.confirm(`Delete the "${original.name}" template? Past workouts stay in your history.`)) return;
    saveTemplates(state.templates.filter((t) => t.id !== original.id));
    navigate('/lift');
  };

  return (
    <>
      <TopBar
        title={isNew ? 'New template' : `Edit ${original.name}`}
        back="/lift"
        hideSettings
        actions={
          <Button variant="primary" size="sm" onClick={save}>
            Save
          </Button>
        }
      />
      <div className="page">
        <Card>
          <Field label="Workout name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </Card>

        <Card title="Exercises">
          <div className="stack">
            {exercises.length === 0 && <p className="muted small">No exercises yet. Add one below.</p>}
            {exercises.map((e, i) => (
              <div className="tpl-ex" key={e.id}>
                <div className="row">
                  <input
                    className="input grow"
                    list="tpl-exercise-names"
                    placeholder="Exercise name"
                    aria-label="Exercise name"
                    value={e.name}
                    onChange={(ev) => change(i, 'name', ev.target.value)}
                  />
                </div>
                <div className="row">
                  <select className="input grow" aria-label="Muscle group" value={e.muscle} onChange={(ev) => change(i, 'muscle', ev.target.value)}>
                    {MUSCLES.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                  <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp size={18} />
                  </IconButton>
                  <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === exercises.length - 1}>
                    <ArrowDown size={18} />
                  </IconButton>
                  <IconButton label="Remove exercise" onClick={() => remove(i)}>
                    <Trash2 size={18} />
                  </IconButton>
                </div>
                <div className="tpl-nums">
                  <Field label="Sets">
                    <NumInput inputMode="numeric" value={e.sets} onChange={(v) => change(i, 'sets', v)} />
                  </Field>
                  <Field label="Min reps">
                    <NumInput inputMode="numeric" value={e.repMin} onChange={(v) => change(i, 'repMin', v)} />
                  </Field>
                  <Field label="Max reps">
                    <NumInput inputMode="numeric" value={e.repMax} onChange={(v) => change(i, 'repMax', v)} />
                  </Field>
                  <Field label="+lb step">
                    <NumInput value={e.increment} onChange={(v) => change(i, 'increment', v)} />
                  </Field>
                </div>
              </div>
            ))}
            <datalist id="tpl-exercise-names">
              {allNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <Button variant="outline" block onClick={add}>
              <Plus size={18} /> Add exercise
            </Button>
          </div>
        </Card>

        <p className="small faint" style={{ margin: '0 4px' }}>
          <strong>Rep range</strong>: when you hit the max reps on every set, the app suggests adding the <strong>+lb step</strong> next
          time. History is matched by exercise name, so renaming an exercise starts fresh history for it.
        </p>

        <Button variant="primary" block onClick={save}>
          Save template
        </Button>
        {!isNew && state.templates.length > 1 && (
          <Button variant="danger" block onClick={del}>
            Delete template
          </Button>
        )}
      </div>
    </>
  );
}
