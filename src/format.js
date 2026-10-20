import { format } from 'd3-format';

const f1 = format(',.1f');
const f0 = format(',.0f');

/** 6436113 → "6.4 million"; 33720 → "33,720" */
export function bigNumber(v) {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `${trim(f1(v / 1e9))} billion`;
  if (a >= 1e6) return `${trim(f1(v / 1e6))} million`;
  return f0(v);
}
const trim = (s) => s.replace(/\.0$/, '');

export const francs = (v) => (v == null ? '—' : `${bigNumber(v)} francs`);
export const dollars = (v) => (v == null ? '—' : `$${bigNumber(v)}`);
export const usdM = (m) => (m == null ? '—' : `$${trim(f1(m))} million`);

/** percent with sensible precision: 11.62 → "11.6%", 304.5 → "305%", 0.09 → "0.09%" */
export function pct(v) {
  if (v == null) return '—';
  if (v === 0) return '0%';
  if (v >= 100) return `${f0(v)}%`;
  if (v >= 1) return `${trim(f1(v))}%`;
  return `${format('.2f')(v)}%`;
}

/** 3.05 → "3×" style multiple, for debt/GDP ratios ≥100% */
export const times = (p) => `${trim(f1(p / 100))}×`;

/** Compact: 6436113 → "6.4M", 562477042 → "562M", 21.7e9 → "21.7B" */
export function compact(v) {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `${trim(f1(v / 1e9))}B`;
  if (a >= 1e6) return `${a >= 1e8 ? f0(v / 1e6) : trim(f1(v / 1e6))}M`;
  if (a >= 1e3) return `${f0(v / 1e3)}K`;
  return f0(v);
}
