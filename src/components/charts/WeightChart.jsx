import { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { addDays, parseISODate, today } from '../../lib/dates.js';
import { Segmented, fmt } from '../ui.jsx';
import { C, DAY_MS, RefLabel, TooltipBox, niceScale, shortDate, tick } from './theme.jsx';

const RANGES = [
  { value: '1M', label: '1M', days: 30 },
  { value: '3M', label: '3M', days: 91 },
  { value: '6M', label: '6M', days: 182 },
  { value: 'All', label: 'All', days: Infinity },
];

const WeighInDot = ({ cx, cy }) => (cx == null ? null : <circle cx={cx} cy={cy} r={4} fill={C.dot} stroke={C.surface} strokeWidth={2} />);

function WeightTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipBox
      title={parseISODate(p.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
      rows={[
        { color: C.dot, value: `${fmt(p.weight, 1)} lb`, label: 'weigh-in' },
        { color: C.blue, value: `${fmt(p.avg, 1)} lb`, label: '7-day avg' },
      ]}
    />
  );
}

export default function WeightChart({ summary }) {
  const [range, setRange] = useState('3M');
  const { ma, goal } = summary;

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.value === range).days;
    const from = Number.isFinite(days) ? addDays(today(), -days) : '';
    return ma.filter((w) => w.date >= from).map((w) => ({ ...w, t: parseISODate(w.date).getTime() }));
  }, [ma, range]);

  if (!ma.length) return <p className="small muted" style={{ margin: 0 }}>Log a few weigh-ins to see your trend line here.</p>;

  const values = data.flatMap((d) => [d.weight, d.avg]);
  const { lo, hi, ticks } = niceScale(Math.min(...values, goal || Infinity), Math.max(...values, goal || -Infinity));
  const tMin = data.length ? data[0].t : 0;
  const tMax = data.length ? data[data.length - 1].t : 0;
  const xDomain = tMax - tMin < 6 * DAY_MS ? [tMin - 3 * DAY_MS, tMax + 3 * DAY_MS] : [tMin, tMax];

  return (
    <div className="stack">
      <Segmented options={RANGES} value={range} onChange={setRange} />
      {data.length === 0 ? (
        <p className="small muted">No weigh-ins in this range.</p>
      ) : (
        <>
          <div className="chart-legend" aria-hidden="true">
            <span>
              <i className="key-line" style={{ background: C.blue }} /> 7-day average
            </span>
            <span>
              <i className="key-dot" style={{ background: C.dot }} /> Daily weigh-in
            </span>
            {goal > 0 && (
              <span>
                <i className="key-dash" /> Goal {fmt(goal)} lb
              </span>
            )}
          </div>
          <div className="chart-wrap" role="img" aria-label={`Bodyweight chart, ${data.length} weigh-ins. Latest 7-day average ${fmt(data[data.length - 1].avg, 1)} lb, goal ${fmt(goal)} lb.`}>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={xDomain}
                  tickFormatter={shortDate}
                  tick={tick}
                  stroke={C.axis}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis domain={[lo, hi]} ticks={ticks} width={38} tick={tick} axisLine={false} tickLine={false} />
                {goal > 0 && (
                  <ReferenceLine
                    y={goal}
                    stroke={C.reference}
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={<RefLabel value={`Goal ${fmt(goal)} lb`} />}
                  />
                )}
                {/* Daily weigh-ins sit underneath the trend line, which is what matters. */}
                <Scatter dataKey="weight" zIndex={350} isAnimationActive={false} shape={WeighInDot} />
                <Line
                  dataKey="avg"
                  type="monotone"
                  zIndex={450}
                  stroke={C.blue}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 5, fill: C.blue, stroke: C.surface, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Tooltip content={<WeightTooltip />} cursor={{ stroke: C.cursor, strokeWidth: 1 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
