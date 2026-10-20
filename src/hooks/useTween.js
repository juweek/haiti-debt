import { useEffect, useRef, useState } from 'react';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // cubic in-out
const lerp = (a, b, t) => a + (b - a) * t;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Interpolate chart geometry (layers of {year,x,y0,y1,d}) by layer id and year. */
function mix(from, to, t) {
  const prev = new Map(from.map((l) => [l.id + l.seg, new Map(l.points.map((p) => [p.year, p]))]));
  return to.map((l) => {
    const pm = prev.get(l.id + l.seg);
    return {
      ...l,
      points: l.points.map((p) => {
        if (!p.d) return p;
        const q = pm?.get(p.year);
        if (q?.d) return { ...p, x: lerp(q.x, p.x, t), y1: lerp(q.y1, p.y1, t), y0: p.y0 == null || q.y0 == null ? p.y0 : lerp(q.y0, p.y0, t) };
        if (l.kind === 'line') return p; // new line points just appear
        return { ...p, y1: lerp(p.y0, p.y1, t) }; // new area/bar points grow from their base
      }),
    };
  });
}

/** Animates between successive geometry values over `ms` (500ms like the old page).
 *  Only animates when `key` changes (a mode switch); resizes and other updates snap. */
export function useTween(target, ms = 500, key = null) {
  const [cur, setCur] = useState(target);
  const last = useRef(target);
  const lastKey = useRef(key);
  useEffect(() => {
    const keyChanged = lastKey.current !== key;
    lastKey.current = key;
    if (reduced() || !keyChanged || last.current === target) { last.current = target; setCur(target); return undefined; }
    const from = last.current;
    let raf, t0;
    const step = (now) => {
      if (t0 == null) t0 = now;
      const k = Math.min(1, (now - t0) / ms);
      const g = k === 1 ? target : mix(from, target, ease(k));
      last.current = g;
      setCur(g);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]); // eslint-disable-line react-hooks/exhaustive-deps
  return cur;
}
