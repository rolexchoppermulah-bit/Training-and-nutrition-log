import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { fmt } from '../ui.jsx';
import { C, TooltipBox, compact, tick } from './theme.jsx';

const unitLabel = (metric, v) => (metric === 'sets' ? `${fmt(v)} set${v === 1 ? '' : 's'}` : `${fmt(v)} lb`);

function VolumeTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipBox
      title={p.muscle}
      rows={[
        { color: C.blue, value: unitLabel(metric, p.value), label: 'this week' },
        { value: unitLabel(metric, p.prev), label: 'week before' },
      ]}
    />
  );
}

/** rows: [{ muscle, value, prev }] — one bar per muscle, value labelled at the tip. */
export default function VolumeChart({ rows, metric }) {
  const height = rows.length * 34 + 8;
  return (
    <div className="chart-wrap" role="img" aria-label={`Weekly ${metric === 'sets' ? 'sets' : 'pounds lifted'} per muscle group`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="muscle" width={86} tick={{ ...tick, fill: '#c3c8d1', fontSize: 12 }} axisLine={{ stroke: C.axis }} tickLine={false} />
          <Bar dataKey="value" fill={C.blue} barSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v) => (metric === 'sets' ? fmt(v) : compact(v))}
              fill="#c3c8d1"
              fontSize={12}
              fontWeight={600}
            />
          </Bar>
          <Tooltip content={<VolumeTooltip metric={metric} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
