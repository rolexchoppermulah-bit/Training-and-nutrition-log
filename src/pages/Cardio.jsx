import { useMemo, useState } from 'react';
import { HeartPulse, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { saveCardio, deleteCardio } from '../lib/actions.js';
import { cardioMinutesInWeek, num, sortByDate } from '../lib/calc.js';
import { addDays, formatWeekRange, relativeDay, startOfWeek, today, WEEKDAYS } from '../lib/dates.js';
import { CARDIO_TYPES } from '../lib/defaults.js';
import TopBar from '../components/TopBar.jsx';
import { Button, Card, Chips, EmptyState, Field, IconButton, NumInput, ProgressBar, fmt, useToast } from '../components/ui.jsx';
import CardioWeeksChart from '../components/charts/CardioWeeksChart.jsx';

const QUICK_MINUTES = [20, 30, 45, 60];

export default function Cardio() {
  const state = useStore();
  const toast = useToast();
  const target = num(state.settings.cardioTarget);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today()));
  const [form, setForm] = useState({ type: 'Walk', minutes: '', avgHr: '', date: today() });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const thisWeek = startOfWeek(today());
  const minutes = cardioMinutesInWeek(state.cardio, weekStart);
  const perDay = useMemo(
    () =>
      WEEKDAYS.map((label, i) => {
        const d = addDays(weekStart, i);
        return { label, date: d, minutes: state.cardio.filter((c) => c.date === d).reduce((s, c) => s + num(c.minutes), 0) };
      }),
    [state.cardio, weekStart],
  );
  const dayMax = Math.max(60, ...perDay.map((d) => d.minutes));
  const recent = useMemo(() => sortByDate(state.cardio).reverse(), [state.cardio]);
  const [showAll, setShowAll] = useState(false);

  const submit = () => {
    const m = num(form.minutes);
    if (m <= 0) {
      toast('Enter how many minutes');
      return;
    }
    saveCardio({ type: form.type, minutes: m, avgHr: num(form.avgHr) || null, date: form.date || today() });
    toast(`Logged ${m} min ${form.type.toLowerCase()}`);
    setForm((f) => ({ ...f, minutes: '', avgHr: '' }));
    setWeekStart(startOfWeek(form.date || today()));
  };

  return (
    <>
      <TopBar title="Cardio" />
      <div className="page">
        <Card>
          <div className="day-nav" style={{ marginBottom: 10 }}>
            <IconButton label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft size={22} />
            </IconButton>
            <div className="label">
              <div>{weekStart === thisWeek ? 'This week' : formatWeekRange(weekStart)}</div>
              <div className="small muted" style={{ fontWeight: 500 }}>
                Zone 2 minutes
              </div>
            </div>
            <IconButton label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))} disabled={weekStart >= thisWeek}>
              <ChevronRight size={22} />
            </IconButton>
          </div>
          <ProgressBar label="Zone 2" value={minutes} target={target} unit=" min" color="var(--cardio)" />
          <div className="week-dots" aria-label="Minutes per day">
            {perDay.map((d) => (
              <div key={d.date} className={`week-dot ${d.date === today() ? 'today' : ''}`} title={`${d.minutes} min`}>
                <div className="bar">
                  <span style={{ height: `${(d.minutes / dayMax) * 100}%` }} />
                </div>
                {d.label[0]}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Log a session">
          <div className="stack">
            <Chips options={CARDIO_TYPES} value={form.type} onChange={set('type')} />
            <div className="grid-2">
              <Field label="Minutes">
                <NumInput inputMode="numeric" value={form.minutes} onChange={set('minutes')} placeholder="30" />
              </Field>
              <Field label="Avg heart rate (optional)">
                <NumInput inputMode="numeric" value={form.avgHr} onChange={set('avgHr')} placeholder="bpm" />
              </Field>
            </div>
            <div className="chips">
              {QUICK_MINUTES.map((m) => (
                <button key={m} type="button" className={`chip ${num(form.minutes) === m ? 'active' : ''}`} onClick={() => set('minutes')(String(m))}>
                  {m} min
                </button>
              ))}
            </div>
            <Field label="Date">
              <input className="input" type="date" value={form.date} max={today()} onChange={(e) => set('date')(e.target.value)} />
            </Field>
            <Button variant="primary" block size="lg" onClick={submit}>
              Save session
            </Button>
          </div>
        </Card>

        <Card title="Zone 2 minutes · last 8 weeks">
          <CardioWeeksChart cardio={state.cardio} target={target} />
        </Card>

        <Card title="Recent sessions">
          {recent.length === 0 ? (
            <EmptyState icon={<HeartPulse size={28} />} title="No sessions yet">
              Log your zone 2 walks, rides and rows here.
            </EmptyState>
          ) : (
            <div className="list">
              {recent.slice(0, showAll ? undefined : 10).map((c) => (
                <div key={c.id} className="list-item">
                  <div className="grow">
                    <div className="list-title">
                      {c.type} · {fmt(num(c.minutes))} min
                    </div>
                    <div className="list-sub">
                      {relativeDay(c.date)}
                      {c.avgHr ? ` · avg ${c.avgHr} bpm` : ''}
                    </div>
                  </div>
                  <IconButton
                    label="Delete session"
                    onClick={() => {
                      deleteCardio(c.id);
                      toast('Session deleted', { action: { label: 'Undo', onClick: () => saveCardio(c) } });
                    }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </div>
              ))}
              {recent.length > 10 && (
                <button type="button" className="link-btn" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Show fewer' : `Show all ${recent.length}`}
                </button>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
