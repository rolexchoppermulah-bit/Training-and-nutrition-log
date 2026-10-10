// Shared chart colors and pieces. Series colors were checked with a
// colorblind-safety validator against the dark card surface (#161920).

export const C = {
  surface: '#161920',
  grid: '#262b36', // hairline, one step off the surface
  axis: '#343a47',
  tick: '#9aa3b2',
  cursor: '#4b5263',
  blue: '#3987e5', // strength / bodyweight trend
  cardio: '#0fa89a', // matches --cardio
  dot: '#7a8394', // daily weigh-ins (de-emphasized next to the trend line)
  reference: '#9aa3b2', // goal / target lines
};

export const tick = { fill: C.tick, fontSize: 11 };

export const DAY_MS = 86400000;

export const shortDate = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const compact = (n) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}K` : String(Math.round(n)));

/** Tooltip card: values lead, labels follow, keyed with a short line in the series color. */
export function TooltipBox({ title, rows }) {
  return (
    <div className="chart-tooltip">
      {title && <div className="tt-title">{title}</div>}
      {rows.map((r, i) => (
        <div className="tt-row" key={i}>
          {r.color && <span className="key-line" style={{ background: r.color }} />}
          <strong>{r.value}</strong>
          {r.label && <span className="tt-label">{r.label}</span>}
        </div>
      ))}
    </div>
  );
}

/** Round axis bounds with evenly spaced, round-number ticks (about 4–6 of them). */
export function niceScale(min, max, pad = 0.5) {
  const span = Math.max(1, max - min + pad * 2);
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 250, 500].find((s) => span / s <= 6) || 1000;
  const lo = Math.floor((min - pad) / step) * step;
  const hi = Math.ceil((max + pad) / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

/** Label that sits just above a horizontal reference line (goal / target). */
export function RefLabel({ viewBox, value }) {
  if (!viewBox) return null;
  return (
    <text x={viewBox.x + 4} y={viewBox.y - 6} fill={C.tick} fontSize={11} fontWeight={600}>
      {value}
    </text>
  );
}
