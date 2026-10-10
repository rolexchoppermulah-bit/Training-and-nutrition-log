import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { parseISODate } from '../../lib/dates.js';
import { fmt } from '../ui.jsx';
import { C, DAY_MS, TooltipBox, niceScale, shortDate, tick } from './theme.jsx';

function E1rmTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipBox
      title={parseISODate(p.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
      rows={[
        { color: C.blue, value: `${fmt(p.e1rm)} lb`, label: 'est. 1RM' },
        { value: `${fmt(p.weight, 1)} × ${p.reps}`, label: 'best set' },
      ]}
    />
  );
}

/** Direct label on the last point only. */
function EndLabel({ x, y, index, value, count }) {
  if (index !== count - 1 || x == null) return null;
  return (
    <text x={x} y={y - 12} textAnchor="end" fill="#eef0f3" fontSize={12} fontWeight={700}>
      {fmt(value)}
    </text>
  );
}

export default function E1rmChart({ sessions, name }) {
  const data = sessions.map((s) => ({ ...s, t: parseISODate(s.date).getTime() }));
  const vals = data.map((d) => d.e1rm);
  const { lo, hi, ticks } = niceScale(Math.min(...vals), Math.max(...vals), 2);
  const tMin = data[0].t;
  const tMax = data[data.length - 1].t;
  const xDomain = tMax - tMin < 6 * DAY_MS ? [tMin - 3 * DAY_MS, tMax + 3 * DAY_MS] : [tMin, tMax];

  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label={`Estimated 1-rep max for ${name} over ${data.length} sessions, latest ${fmt(vals[vals.length - 1])} lb.`}
    >
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 22, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="t" type="number" scale="time" domain={xDomain} tickFormatter={shortDate} tick={tick} stroke={C.axis} tickLine={false} minTickGap={28} />
          <YAxis domain={[lo, hi]} ticks={ticks} width={40} tick={tick} axisLine={false} tickLine={false} />
          <Line
            dataKey="e1rm"
            type="linear"
            stroke={C.blue}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={{ r: 4, fill: C.blue, stroke: C.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: C.blue, stroke: C.surface, strokeWidth: 2 }}
            label={<EndLabel count={data.length} />}
            isAnimationActive={false}
          />
          <Tooltip content={<E1rmTooltip />} cursor={{ stroke: C.cursor, strokeWidth: 1 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
