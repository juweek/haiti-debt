import { useWidth } from '../hooks/useWidth.js';
import { chartMargins } from './MainChart.jsx';

/**
 * Year slider aligned with the chart's plot area, with event dots under the track.
 * The native range input is the keyboard control (arrows ±1, Page Up/Down ±10, Home/End).
 */
export default function Scrubber({ d0, d1, year, onYear, events, onInteract }) {
  const [ref, width] = useWidth();
  const m = chartMargins(width);
  const v = Math.max(d0, Math.min(d1, year));
  const f = (y) => (y - d0) / (d1 - d0);
  const onKey = (e) => {
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      onInteract();
      onYear(Math.max(d0, Math.min(d1, v + (e.key === 'PageUp' ? 10 : -10))));
    }
  };
  const evYears = [...new Set(events.map((e) => e.year))];
  return (
    <div className="scrubber" ref={ref} style={{ paddingLeft: m.l, paddingRight: m.r }}>
      <label className="main-slider">
        <span className="visually-hidden">Year</span>
        <input type="range" min={d0} max={d1} step={1} value={v} style={{ '--p': `${f(v) * 100}%` }}
          onKeyDown={onKey} onPointerDown={onInteract}
          onChange={(e) => { onInteract(); onYear(Number(e.target.value)); }} aria-valuetext={`${v}`} />
      </label>
      <div className="ev-dots" aria-hidden="true">
        {evYears.map((y) => {
          const ev = events.find((e) => e.year === y);
          return (
            <button key={y} type="button" tabIndex={-1} className={`ev-dot ${y === v ? 'is-on' : ''}`} title={`${y} ${ev.short}`}
              style={{ left: `calc(9px + (100% - 18px) * ${f(y)})` }} onClick={() => { onInteract(); onYear(y); }}>
              <span />
            </button>
          );
        })}
      </div>
    </div>
  );
}
