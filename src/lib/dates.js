// All dates in the app are stored as local "YYYY-MM-DD" strings.
// (Using toISOString() would give UTC dates, so late-evening logs
// could land on the wrong day.)

const pad = (n) => String(n).padStart(2, '0');

export function toISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const today = () => toISODate(new Date());

export function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // noon avoids daylight-saving edge cases
}

export function addDays(s, n) {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a, b) {
  return Math.round((parseISODate(b) - parseISODate(a)) / 86400000);
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(s) {
  return (parseISODate(s).getDay() + 6) % 7;
}

/** The Monday of the week containing s. */
export function startOfWeek(s) {
  return addDays(s, -weekdayIndex(s));
}

export function formatDate(s, opts = { month: 'short', day: 'numeric' }) {
  return parseISODate(s).toLocaleDateString(undefined, opts);
}

export function relativeDay(s, ref = today()) {
  const diff = daysBetween(s, ref);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return parseISODate(s).toLocaleDateString(undefined, { weekday: 'long' });
  const sameYear = s.slice(0, 4) === ref.slice(0, 4);
  return formatDate(s, sameYear ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatWeekRange(weekStart) {
  return `${formatDate(weekStart)} – ${formatDate(addDays(weekStart, 6))}`;
}

export function formatDuration(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
