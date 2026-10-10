import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList } from 'recharts';
import { cardioMinutesInWeek } from '../../lib/calc.js';
import { addDays, formatWeekRange, startOfWeek, today, formatDate } from '../../lib/dates.js';
import { fmt } from '../ui.jsx';
import { C, RefLabel, TooltipBox, tick } from './theme.jsx';

function WeekTooltip({ active, payload, target }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipBox
      title={formatWeekRange(p.weekStart)}
      rows={[
        { color: C.cardio, value: `${fmt(p.minutes)} min`, label: 'zone 2' },
        ...(target > 0 ? [{ value: `${Math.round((p.minutes / target) * 100)}%`, label: 'of target' }] : []),
      ]}
    />
  );
}

export default function CardioWeeksChart({ cardio, target, weeks = 8 }) {
  const data = useMemo(() => {
    const thisWeek = startOfWeek(today());
    return Array.from({ length: weeks }, (_, i) => {
      const weekStart = addDays(thisWeek, -7 * (weeks - 1 - i));
      return {
        weekStart,
        label: i === weeks - 1 ? 'Now' : formatDate(weekStart, { month: 'numeric', day: 'numeric' }),
        minutes: cardioMinutesInWeek(cardio, weekStart),
        isCurrent: i === weeks - 1,
      };
    });
  }, [cardio, weeks]);

  const max = Math.max(target || 0, ...data.map((d) => d.minutes));
  const yMax = Math.max(60, Math.ceil((max * 1.15) / 30) * 30);

  return (
    <div className="chart-wrap" role="img" aria-label={`Zone 2 minutes for the last ${weeks} weeks. This week ${data[data.length - 1].minutes} of ${target} minutes.`}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="label" tick={tick} stroke={C.axis} tickLine={false} interval={0} />
          <YAxis width={34} tick={tick} axisLine={false} tickLine={false} domain={[0, yMax]} allowDecimals={false} tickCount={4} />
          {target > 0 && (
            <ReferenceLine
              y={target}
              stroke={C.reference}
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={<RefLabel value={`Target ${target} min`} />}
            />
          )}
          <Bar dataKey="minutes" fill={C.cardio} barSize={22} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="minutes"
              position="top"
              content={({ x, y, width, value, index }) =>
                index === data.length - 1 && value > 0 ? (
                  <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#eef0f3" fontSize={12} fontWeight={700}>
                    {value}
                  </text>
                ) : null
              }
            />
          </Bar>
          <Tooltip content={<WeekTooltip target={target} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
