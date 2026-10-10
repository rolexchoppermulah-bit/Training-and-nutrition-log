import { useMemo, useState } from 'react';
import { Scale, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { logWeight, deleteWeight } from '../lib/actions.js';
import { num, sortByDate, weeklyRate, withMovingAverage } from '../lib/calc.js';
import { relativeDay, today, addDays, formatDate } from '../lib/dates.js';
import TopBar from '../components/TopBar.jsx';
import { Button, Card, EmptyState, Field, IconButton, NumInput, fmt, useToast } from '../components/ui.jsx';
import WeightChart from '../components/charts/WeightChart.jsx';

/** Numbers used on both the dashboard and the weight page. */
export function useWeightSummary(state) {
  return useMemo(() => {
    const ma = withMovingAverage(state.weights);
    const latest = ma[ma.length - 1] || null;
    const rate = weeklyRate(state.weights);
    const goal = num(state.settings.goalWeight);
    const target = num(state.settings.weeklyGainTarget);
    const current = latest ? latest.avg : null;
    const toGo = current != null && goal ? goal - current : null;
    let eta = null;
    if (rate && rate.perWeek > 0.05 && toGo > 0) {
      const weeks = toGo / rate.perWeek;
      eta = { weeks, date: addDays(today(), Math.round(weeks * 7)) };
    }
    let pace = null;
    if (rate && target > 0) {
      if (rate.perWeek < target * 0.5) pace = { tone: 'pr', text: `Slower than your ${fmt(target, 2)} lb/wk target` };
      else if (rate.perWeek > target * 1.5) pace = { tone: 'pr', text: `Faster than your ${fmt(target, 2)} lb/wk target` };
      else pace = { tone: 'accent', text: `On pace for your ${fmt(target, 2)} lb/wk target` };
    }
    return { ma, latest, rate, goal, toGo, eta, pace };
  }, [state.weights, state.settings.goalWeight, state.settings.weeklyGainTarget]);
}

export const signed = (n, d = 2) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n), d)}`;

export function WeightStats({ summary }) {
  const { latest, rate, toGo, eta, goal } = summary;
  return (
    <div className="grid-2">
      <div className="stat">
        <div className="stat-label">7-day average</div>
        <div className="stat-value">{latest ? fmt(latest.avg, 1) : '—'}</div>
        <div className="stat-sub">lb</div>
      </div>
      <div className="stat">
        <div className="stat-label">Rate (last 4 wks)</div>
        <div className="stat-value">{rate ? signed(rate.perWeek) : '—'}</div>
        <div className="stat-sub">{rate ? 'lb per week' : 'need 3+ weigh-ins over 7+ days'}</div>
      </div>
      <div className="stat">
        <div className="stat-label">To {fmt(goal)} lb goal</div>
        <div className="stat-value">{toGo != null ? (toGo > 0 ? fmt(toGo, 1) : 'Done') : '—'}</div>
        <div className="stat-sub">{toGo != null && toGo > 0 ? 'lb to go' : toGo != null ? 'goal reached 🎉' : ''}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Goal ETA</div>
        <div className="stat-value">{eta ? formatDate(eta.date, { month: 'short', year: 'numeric' }) : '—'}</div>
        <div className="stat-sub">{eta ? `~${fmt(eta.weeks)} weeks at this rate` : 'needs an upward trend'}</div>
      </div>
    </div>
  );
}

export default function Weight() {
  const state = useStore();
  const toast = useToast();
  const summary = useWeightSummary(state);
  const sorted = useMemo(() => sortByDate(state.weights), [state.weights]);
  const last = sorted[sorted.length - 1];
  const [date, setDate] = useState(today());
  const [value, setValue] = useState(() => String(last?.weight ?? state.settings.startWeight ?? ''));
  const existing = state.weights.find((w) => w.date === date);

  const submit = () => {
    if (!(num(value) > 0)) {
      toast('Enter your weight');
      return;
    }
    logWeight(date, num(value));
    toast(`Logged ${fmt(num(value), 1)} lb for ${relativeDay(date).toLowerCase()}`);
  };

  return (
    <>
      <TopBar title="Bodyweight" />
      <div className="page">
        <Card title="Morning weigh-in">
          <div className="stack">
            <div className="row">
              <NumInput className="input-lg grow" aria-label="Weight in pounds" value={value} onChange={setValue} />
              <span className="muted" style={{ fontWeight: 700 }}>
                lb
              </span>
            </div>
            <Field label="Date">
              <input className="input" type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </Field>
            <Button variant="primary" size="lg" block onClick={submit}>
              {existing ? `Update (was ${fmt(existing.weight, 1)})` : 'Log weight'}
            </Button>
            <p className="small faint" style={{ margin: 0 }}>
              Weigh in after waking up and using the bathroom, before eating. Daily numbers bounce around, so watch the 7-day average.
            </p>
          </div>
        </Card>

        {summary.pace && (
          <div className={`callout ${summary.pace.tone}`}>
            <Scale size={16} />
            <span>{summary.pace.text}.</span>
          </div>
        )}
        <WeightStats summary={summary} />

        <Card title="Trend">
          <WeightChart summary={summary} />
        </Card>

        <Card title="History">
          {sorted.length === 0 ? (
            <EmptyState icon={<Scale size={28} />} title="No weigh-ins yet">
              Log your first morning weight above.
            </EmptyState>
          ) : (
            <div className="list">
              {[...summary.ma].reverse().slice(0, 60).map((w) => (
                <div key={w.id || w.date} className="list-item">
                  <div className="grow">
                    <div className="list-title tabular">{fmt(w.weight, 1)} lb</div>
                    <div className="list-sub">
                      {relativeDay(w.date)} · 7-day avg {fmt(w.avg, 1)}
                    </div>
                  </div>
                  <IconButton
                    label="Delete weigh-in"
                    onClick={() => {
                      deleteWeight(w.id);
                      toast('Weigh-in deleted', { action: { label: 'Undo', onClick: () => logWeight(w.date, w.weight) } });
                    }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
