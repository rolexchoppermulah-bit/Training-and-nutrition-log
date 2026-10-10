import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Utensils, Star } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { addFoodEntry, removeFoodEntry, restoreFoodEntry, saveFood, deleteFood, updateFoodEntry } from '../lib/actions.js';
import { dayTotals, entryMacros, num } from '../lib/calc.js';
import { addDays, relativeDay, today } from '../lib/dates.js';
import TopBar from '../components/TopBar.jsx';
import { Button, Card, EmptyState, Field, IconButton, NumInput, ProgressBar, Sheet, Stepper, fmt, useToast } from '../components/ui.jsx';

export function MacroBars({ totals, settings, compact }) {
  const s = settings;
  return (
    <>
      <ProgressBar label="Calories" value={totals.calories} target={num(s.calorieTarget)} color="var(--calories)" compact={compact} />
      <ProgressBar label="Protein" value={totals.protein} target={num(s.proteinTarget)} unit=" g" color="var(--protein)" compact={compact} />
      {!compact && num(s.carbTarget) > 0 && <ProgressBar label="Carbs" value={totals.carbs} target={num(s.carbTarget)} unit=" g" color="var(--carbs)" />}
      {!compact && num(s.fatTarget) > 0 && <ProgressBar label="Fat" value={totals.fat} target={num(s.fatTarget)} unit=" g" color="var(--fat)" />}
    </>
  );
}

/** Saved foods, most-used first. */
export function useSortedFoods(state) {
  return useMemo(() => {
    const uses = {};
    for (const e of state.foodLog) if (e.foodId) uses[e.foodId] = (uses[e.foodId] || 0) + 1;
    return [...state.foods].sort((a, b) => (uses[b.id] || 0) - (uses[a.id] || 0) || a.name.localeCompare(b.name));
  }, [state.foods, state.foodLog]);
}

export function quickAddFood(food, date, toast) {
  const entry = addFoodEntry(date, { ...food, foodId: food.id });
  toast(`Added ${food.name}`, { action: { label: 'Undo', onClick: () => removeFoodEntry(entry.id) } });
}

const macroLine = (m) => {
  const parts = [`${fmt(m.calories)} cal`, `${fmt(m.protein)}g P`];
  if (m.carbs) parts.push(`${fmt(m.carbs)}g C`);
  if (m.fat) parts.push(`${fmt(m.fat)}g F`);
  return parts.join(' · ');
};

export default function Food() {
  const state = useStore();
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [sheet, setSheet] = useState(null); // { mode: 'log' } | { mode: 'food', food }
  const [editingFoods, setEditingFoods] = useState(false);
  const foods = useSortedFoods(state);

  const totals = dayTotals(state.foodLog, date);
  const entries = state.foodLog.filter((e) => e.date === date).sort((a, b) => (a.loggedAt || 0) - (b.loggedAt || 0));
  const s = state.settings;
  const showCarbFatTotals = !(num(s.carbTarget) > 0 && num(s.fatTarget) > 0) && (totals.carbs > 0 || totals.fat > 0);

  return (
    <>
      <TopBar title="Food" />
      <div className="page">
        <Card>
          <div className="day-nav" style={{ marginBottom: 12 }}>
            <IconButton label="Previous day" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft size={22} />
            </IconButton>
            <div className="label">{relativeDay(date)}</div>
            <IconButton label="Next day" onClick={() => setDate(addDays(date, 1))} disabled={date >= today()}>
              <ChevronRight size={22} />
            </IconButton>
          </div>
          <MacroBars totals={totals} settings={s} />
          {showCarbFatTotals && (
            <div className="small muted" style={{ marginTop: 10 }}>
              Carbs {fmt(totals.carbs)} g · Fat {fmt(totals.fat)} g
            </div>
          )}
        </Card>

        <Card
          title="My foods"
          action={
            foods.length > 0 && (
              <button type="button" className="link-btn" onClick={() => setEditingFoods((v) => !v)}>
                {editingFoods ? 'Done' : 'Edit'}
              </button>
            )
          }
        >
          {foods.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>
              Foods and meals you save show up here. Then logging them takes one tap. Use <strong>Add food</strong> below and tick
              &ldquo;Save to My foods&rdquo;.
            </p>
          ) : (
            <div className="food-grid">
              {foods.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`food-tile ${editingFoods ? 'editing' : ''}`}
                  onClick={() => (editingFoods ? setSheet({ mode: 'food', food: f }) : quickAddFood(f, date, toast))}
                  aria-label={editingFoods ? `Edit ${f.name}` : `Add ${f.name}`}
                >
                  <span className="name">{f.name}</span>
                  <span className="macros">
                    {fmt(f.calories)} cal · {fmt(f.protein)}g P
                  </span>
                  <span className="plus">{editingFoods ? <Pencil size={16} /> : <Plus size={18} />}</span>
                </button>
              ))}
            </div>
          )}
          {editingFoods && (
            <Button variant="ghost" block size="sm" style={{ marginTop: 8 }} onClick={() => setSheet({ mode: 'food', food: null })}>
              <Plus size={16} /> New saved food
            </Button>
          )}
        </Card>

        <Button variant="primary" block size="lg" onClick={() => setSheet({ mode: 'log' })}>
          <Plus size={20} /> Add food
        </Button>

        <Card title={`${relativeDay(date)}'s log`}>
          {entries.length === 0 ? (
            <EmptyState icon={<Utensils size={28} />} title="Nothing logged">
              Tap a saved food or use Add food.
            </EmptyState>
          ) : (
            <div className="list">
              {entries.map((e) => {
                const m = entryMacros(e);
                const qty = e.qty == null ? 1 : num(e.qty);
                return (
                  <div key={e.id} className="list-item">
                    <div className="grow">
                      <div className="list-title ellipsis">{e.name}</div>
                      <div className="list-sub tabular">{macroLine(m)}</div>
                    </div>
                    <Stepper value={qty} step={0.5} min={0.5} format={(v) => `×${v}`} label="servings" onChange={(v) => updateFoodEntry(e.id, { qty: v })} />
                    <IconButton
                      label={`Delete ${e.name}`}
                      onClick={() => {
                        removeFoodEntry(e.id);
                        toast(`Removed ${e.name}`, { action: { label: 'Undo', onClick: () => restoreFoodEntry(e) } });
                      }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <FoodSheet
        sheet={sheet}
        onClose={() => setSheet(null)}
        onLog={(food, keep) => {
          const saved = keep ? saveFood(food) : null;
          addFoodEntry(date, { ...food, foodId: saved?.id });
          toast(keep ? `Added and saved ${food.name || 'food'}` : `Added ${food.name || 'food'}`);
          setSheet(null);
        }}
        onSaveFood={(food) => {
          saveFood(food);
          toast('Saved');
          setSheet(null);
        }}
        onDeleteFood={(food) => {
          if (!window.confirm(`Delete "${food.name}" from My foods? Entries you already logged stay.`)) return;
          deleteFood(food.id);
          setSheet(null);
        }}
      />
    </>
  );
}

function FoodSheet({ sheet, onClose, onLog, onSaveFood, onDeleteFood }) {
  const key = sheet ? `${sheet.mode}-${sheet.food?.id ?? 'new'}` : 'closed';
  if (!sheet) return null;
  return <FoodForm key={key} sheet={sheet} onClose={onClose} onLog={onLog} onSaveFood={onSaveFood} onDeleteFood={onDeleteFood} />;
}

function FoodForm({ sheet, onClose, onLog, onSaveFood, onDeleteFood }) {
  const existing = sheet.food;
  const [f, setF] = useState(() => ({
    name: existing?.name ?? '',
    calories: existing ? String(existing.calories) : '',
    protein: existing ? String(existing.protein) : '',
    carbs: existing?.carbs ? String(existing.carbs) : '',
    fat: existing?.fat ? String(existing.fat) : '',
  }));
  const [keep, setKeep] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const isLog = sheet.mode === 'log';
  const valid = num(f.calories) > 0 || num(f.protein) > 0;
  const food = { ...f, id: existing?.id, name: f.name.trim() || (isLog ? 'Quick add' : 'Food') };

  return (
    <Sheet
      open
      onClose={onClose}
      title={isLog ? 'Add food' : existing ? 'Edit saved food' : 'New saved food'}
      footer={
        <>
          {!isLog && existing ? (
            <Button variant="danger" onClick={() => onDeleteFood(existing)}>
              Delete
            </Button>
          ) : (
            <Button onClick={onClose}>Cancel</Button>
          )}
          <Button variant="primary" disabled={!valid || (!isLog && !f.name.trim())} onClick={() => (isLog ? onLog(food, keep) : onSaveFood(food))}>
            {isLog ? 'Add' : 'Save'}
          </Button>
        </>
      }
    >
      <Field label={isLog ? 'Name (optional)' : 'Name'}>
        <input className="input" value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="e.g. Chicken & rice bowl" />
      </Field>
      <div className="grid-2">
        <Field label="Calories">
          <NumInput inputMode="numeric" value={f.calories} onChange={set('calories')} placeholder="0" />
        </Field>
        <Field label="Protein (g)">
          <NumInput value={f.protein} onChange={set('protein')} placeholder="0" />
        </Field>
        <Field label="Carbs (g, optional)">
          <NumInput value={f.carbs} onChange={set('carbs')} placeholder="–" />
        </Field>
        <Field label="Fat (g, optional)">
          <NumInput value={f.fat} onChange={set('fat')} placeholder="–" />
        </Field>
      </div>
      {isLog && (
        <label className="checkbox">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          <Star size={16} /> Save to My foods for one-tap logging
        </label>
      )}
    </Sheet>
  );
}
