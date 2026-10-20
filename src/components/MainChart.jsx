import { useMemo, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { useWidth } from '../hooks/useWidth.js';
import { useTween } from '../hooks/useTween.js';
import {
  PAL, SERIES, buildLayers, segmentsFor, domainFor, bandsFor, valueLabels, formatValue, unitLabel,
} from '../model.js';

const tickFmt = (v) => v.toLocaleString('en-US');
const MORPH_MS = 600;

/**
 * The hero chart (v3): one x axis, one left y axis in one unit. Lines with a light fill
 * for single series; stacked creditor areas / payment bars that morph in when split.
 * No event rules or italic notes: events live in the scrubber and the year note.
 */
export default function MainChart({ state, viewKey, year, onYear, onInteract }) {
  const [ref, width] = useWidth();
  const svgRef = useRef(null);
  const narrow = width < 560;

  const layers = useMemo(() => buildLayers(state), [state]);
  const [d0, d1] = domainFor(state);

  // ---- layout
  const fs = narrow ? { tick: 11.5, val: 15, band: 12, area: 12.5 } : { tick: 13, val: 18, band: 14, area: 15 };
  const m = { l: narrow ? 40 : 48, r: narrow ? 10 : 16, t: 10, b: 30 };
  const iw = width - m.l - m.r;
  const ph = narrow ? 270 : 400;
  const height = m.t + ph + m.b;
  const x = useMemo(() => scaleLinear([d0 - 0.5, d1 + 0.5], [0, iw]), [d0, d1, iw]);
  const max = Math.max(0, ...layers.filter((l) => l.kind !== 'line' || l.id !== 'tot').flatMap((l) => l.points.map((p) => p.v1 ?? 0)));
  const y = useMemo(
    () => (state.measure === 'share' ? scaleLinear([0, 100], [ph, 0]) : scaleLinear([0, (max || 1) * 1.14], [ph, 0]).nice(4)),
    [state.measure, max, ph],
  );

  // ---- target geometry (pixels), tweened when the view changes (not on resize or scrub)
  const target = useMemo(() => layers.map((l) => ({
    id: l.id, seg: l.seg, kind: l.kind, on: l.on !== false,
    points: l.points.map((p) => (p.v1 == null
      ? { year: p.year, d: false }
      : { year: p.year, d: true, x: x(p.year), y1: y(p.v1), y0: p.v0 == null ? null : y(p.v0), value: p.value ?? p.v1 })),
  })), [layers, x, y]);
  const geo = useTween(target, MORPH_MS, viewKey);
  const bw = Math.max(1.2, (iw / (d1 - d0 + 1)) * 0.74);

  // ---- pointer scrubbing
  function yearAt(e) {
    const r = svgRef.current.getBoundingClientRect();
    return Math.max(d0, Math.min(d1, Math.round(x.invert(e.clientX - r.left - m.l))));
  }
  const onMove = (e) => {
    if (e.pointerType === 'mouse' || e.buttons || e.type === 'pointerdown') {
      if (e.type === 'pointerdown') onInteract?.();
      onYear(yearAt(e));
    }
  };

  // ---- shapes
  const runsOf = (pts) => {
    const runs = [];
    let run = [];
    for (const p of pts) { if (p.d) run.push(p); else if (run.length) { runs.push(run); run = []; } }
    if (run.length) runs.push(run);
    return runs;
  };
  const areaPath = (pts) => runsOf(pts).map((r) => {
    const fwd = r.map((p) => `${p.x.toFixed(1)},${p.y1.toFixed(1)}`).join('L');
    const back = [...r].reverse().map((p) => `${p.x.toFixed(1)},${p.y0.toFixed(1)}`).join('L');
    return `M${fwd}L${back}Z`;
  }).join('');
  const linePath = (pts) => runsOf(pts).map((r) => `M${r.map((p) => `${p.x.toFixed(1)},${p.y1.toFixed(1)}`).join('L')}`).join('');
  const lineFill = (pts) => runsOf(pts).map((r) => `M${r[0].x},${ph}L${r.map((p) => `${p.x.toFixed(1)},${p.y1.toFixed(1)}`).join('L')}L${r.at(-1).x},${ph}Z`).join('');

  // ---- cursor: top of whatever is drawn at that year
  const inDomain = year >= d0 && year <= d1;
  const cx = x(year);
  let cur = null;
  if (inDomain) {
    for (const l of geo) {
      if (!l.on && l.kind !== 'line') continue;
      if (l.id === 'tot' && state.split) continue;
      const p = l.points.find((q) => q.year === year && q.d);
      if (p && (!cur || p.y1 < cur.y)) cur = { y: p.y1, seg: l.seg };
    }
    if (cur) {
      const raw = layers.filter((l) => l.seg === cur.seg && (l.kind === 'line' ? l.id !== 'tot' || !state.split : l.on));
      const pts = raw.map((l) => l.points.find((q) => q.year === year)).filter((p) => p?.v1 != null);
      const v = Math.max(...pts.map((p) => p.v1));
      cur.text = state.measure === 'share' ? null : formatValue(v, state);
      if (state.measure !== 'share' && v <= 0) cur.text = state.subject === 'pay' ? 'no payment' : formatValue(v, state);
    }
  }
  const curBox = (() => {
    if (!cur?.text) return null;
    const w = cur.text.length * fs.val * 0.56;
    let tx = cx + 9, anchor = 'start';
    if (tx + w > iw) { tx = cx - 9; anchor = 'end'; }
    const ty = Math.max(fs.val + 2, cur.y - 9);
    return { tx, ty, anchor, l: anchor === 'start' ? tx : tx - w, r: anchor === 'start' ? tx + w : tx, t: ty - fs.val, b: ty + 3 };
  })();

  // ---- static start/peak labels, dropped when they'd collide with each other or the cursor label
  const labels = useMemo(() => {
    const placed = [];
    const hit = (a, b) => a.l < b.r + 4 && a.r > b.l - 4 && a.t < b.b + 2 && a.b > b.t - 2;
    const all = valueLabels(state, layers).sort((a, b) => (a.kind === 'peak' ? -1 : 1) - (b.kind === 'peak' ? -1 : 1));
    for (const a of all) {
      if (inDomain && a.year === year) continue;
      const px = x(a.year), py = y(a.v);
      const w = a.text.length * fs.val * 0.56;
      let tx = px + 10, anchor = 'start';
      if (tx + w > iw) { tx = px - 10; anchor = 'end'; }
      const ty = Math.max(fs.val + 2, py - 8);
      const box = { l: anchor === 'start' ? tx : tx - w, r: anchor === 'start' ? tx + w : tx, t: ty - fs.val, b: ty + 3 };
      if (placed.some((o) => hit(o.box, box)) || (curBox && hit(curBox, box))) continue;
      // a start label right next to its segment's peak reads as clutter; keep the peak only
      if (a.kind === 'start' && placed.some((o) => o.seg === a.seg && Math.abs(o.px - px) < (narrow ? 50 : 70))) continue;
      if (inDomain && a.kind === 'start' && Math.abs(cx - px) < 30) continue;
      placed.push({ ...a, px, py, tx, ty, anchor, box });
    }
    return placed;
  }, [state, layers, x, y, iw, fs.val, inDomain, year, cx, narrow, curBox?.l, curBox?.t]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- band labels inside stacked shares, only where they fit
  const areaLabels = useMemo(() => {
    if (state.measure !== 'share' || state.subject !== 'debt') return [];
    const placed = [];
    const charW = narrow ? 7.2 : 8.4;
    const lh = narrow ? 15 : 18;
    for (const l of target) {
      if (l.kind !== 'area' || !l.on) continue;
      const s = SERIES[l.id];
      const raw = layers.find((r) => r.id === l.id);
      const pkPt = raw.points.reduce((a, p) => ((p.value ?? -1) > (a.value ?? -1) ? p : a));
      const lines = [s.label, `${Math.round(pkPt.value)}% in ${pkPt.year}`];
      const w = Math.max(...lines.map((t) => t.length)) * charW;
      const h = lines.length * lh + 4;
      const cands = l.points.filter((p) => p.d).sort((a, b) => (b.y0 - b.y1) - (a.y0 - a.y1));
      for (const c of cands.slice(0, 30)) {
        if (c.y0 - c.y1 < h) break;
        const bx = Math.max(w / 2 + 2, Math.min(iw - w / 2 - 2, c.x));
        const box = { l: bx - w / 2, r: bx + w / 2, t: (c.y0 + c.y1) / 2 - h / 2, b: (c.y0 + c.y1) / 2 + h / 2 };
        const span = l.points.filter((p) => p.x >= box.l - 2 && p.x <= box.r + 2);
        const fits = span.length && span.every((p) => p.d && p.y1 <= box.t && p.y0 >= box.b);
        const nearCursor = inDomain && box.l < cx + 6 && box.r > cx - 6;
        const clash = placed.some((o) => !(box.r < o.box.l || box.l > o.box.r || box.b < o.box.t || box.t > o.box.b));
        if (fits && !clash && !nearCursor) { placed.push({ id: l.id, box, cx: bx, lines, color: s.text, lh }); break; }
      }
    }
    return placed;
  }, [target, layers, state.measure, state.subject, iw, narrow, inDomain, cx]);

  const bands = bandsFor(state);
  const ticks = state.measure === 'share' ? [25, 50, 75, 100] : y.ticks(4).filter((v) => v > 0);
  const unit = unitLabel(state);
  const tagX = Math.max(20, Math.min(iw - 20, cx));
  const merged = !state.split;

  return (
    <div ref={ref} className="chart-wrap main-chart">
      <svg ref={svgRef} width={width} height={height} className="chart" aria-hidden="true"
        data-ml={m.l} data-iw={iw} data-d0={d0} data-d1={d1} data-top={m.t} data-ph={ph}
        onPointerMove={onMove} onPointerDown={onMove}>
        <g transform={`translate(${m.l},${m.t})`}>
          {bands.map((g) => (
            <rect key={`b${g.x0}`} x={x(g.x0 - 0.5)} width={Math.max(0, x(g.x1 + 0.5) - x(g.x0 - 0.5))} y={0} height={ph} className={g.soft ? 'gap gap-soft' : 'gap'} />
          ))}
          {ticks.map((v, i, a) => (
            <g key={v}>
              <line x1={0} x2={iw} y1={y(v)} y2={y(v)} className="grid" />
              <text x={-8} y={y(v) + 4} textAnchor="end" className="tick" style={{ fontSize: fs.tick }}>{tickFmt(v)}{i === a.length - 1 && unit === '%' ? '%' : ''}</text>
            </g>
          ))}
          {unit !== '%' && <text x={4} y={fs.tick + 2} className="unit" style={{ fontSize: fs.tick }}>{unit}</text>}

          {geo.map((l) => {
            const s = SERIES[l.id];
            if (l.kind === 'area') {
              return <path key={l.id} d={areaPath(l.points)} className="area morph" style={{ fill: merged ? PAL.context : s.color, fillOpacity: merged ? 0.42 : 1, strokeOpacity: merged ? 0 : 1 }} />;
            }
            if (l.kind === 'bar') {
              return (
                <g key={l.id} className="morph" style={{ fill: merged ? PAL.story : s.color }}>
                  {l.points.filter((p) => p.d && p.y0 - p.y1 > 0.05).map((p) => (
                    <rect key={p.year} x={p.x - bw / 2} width={bw} y={p.y1} height={p.y0 - p.y1} className={p.year === year ? 'bar is-active' : 'bar'} />
                  ))}
                </g>
              );
            }
            const hidden = l.id === 'tot' && state.split;
            return (
              <g key={l.id} className="morph" style={{ opacity: hidden ? 0 : 1 }}>
                {l.id !== 'tot' && <path d={lineFill(l.points)} className="line-fill" />}
                <path d={linePath(l.points)} fill="none" stroke={s.color} className="line line-main" />
              </g>
            );
          })}

          {bands.map((g) => {
            const gx = (x(g.x0 - 0.5) + x(g.x1 + 0.5)) / 2;
            const gw = x(g.x1 + 0.5) - x(g.x0 - 0.5);
            const longest = Math.max(0, ...g.lines.map((t) => t.length));
            if (!g.lines.length || gw < longest * fs.band * 0.55 + 8) return null;
            // skip the band text if the cursor value or a value label would sit on it
            const bwid = longest * fs.band * 0.55, by0 = ph * 0.42 - fs.band, by1 = by0 + g.lines.length * fs.band * 1.3 + 4;
            const bb = { l: gx - bwid / 2, r: gx + bwid / 2, t: by0, b: by1 };
            const hitB = (o) => o && o.l < bb.r + 4 && o.r > bb.l - 4 && o.t < bb.b && o.b > bb.t;
            if (hitB(curBox) || labels.some((a) => hitB(a.box))) return null;
            return (
              <text key={`l${g.x0}`} x={gx} y={ph * 0.42} textAnchor="middle" className={g.hint ? 'gap-label gap-hint' : 'gap-label'} style={{ fontSize: fs.band }}>
                {g.lines.map((t, i) => <tspan key={t} x={gx} dy={i ? fs.band * 1.3 : 0}>{t}</tspan>)}
              </text>
            );
          })}
          <line x1={0} x2={iw} y1={ph} y2={ph} className="baseline" />

          {areaLabels.map((a) => (
            <text key={a.id} x={a.cx} y={a.box.t + a.lh} textAnchor="middle" className="area-label" fill={a.color} style={{ fontSize: fs.area }}>
              {a.lines.map((t, i) => <tspan key={t} x={a.cx} dy={i ? a.lh : 0} fontWeight={i < a.lines.length - 1 ? 700 : 400}>{t}</tspan>)}
            </text>
          ))}
          {labels.map((a) => (
            <g key={`${a.seg}${a.kind}`}>
              <circle cx={a.px} cy={a.py} r={narrow ? 4 : 5} className="val-dot" />
              <text x={a.tx} y={a.ty} textAnchor={a.anchor} className="val-label" style={{ fontSize: fs.val }}>{a.text}</text>
            </g>
          ))}

          {inDomain && (
            <g className="cursor" pointerEvents="none">
              <line x1={cx} x2={cx} y1={0} y2={ph} />
              {cur && state.measure !== 'share' && <circle cx={cx} cy={cur.y} r={narrow ? 4.5 : 5.5} className="cursor-dot" />}
              {curBox && <text x={curBox.tx} y={curBox.ty} textAnchor={curBox.anchor} className="val-label cursor-value" style={{ fontSize: fs.val }}>{cur.text}</text>}
            </g>
          )}

          {xTicks(d0, d1, narrow).map((v) => {
            const anchor = x(v) > iw - 16 + m.r ? 'end' : x(v) < 16 - m.l ? 'start' : 'middle';
            // hide any tick label the cursor's year tag would cover (estimated extent + 4px gap)
            const w = String(v).length * fs.tick * 0.62;
            const l = anchor === 'end' ? x(v) - w : anchor === 'start' ? x(v) : x(v) - w / 2;
            if (inDomain && l < tagX + 21 + 4 && l + w > tagX - 21 - 4) return null;
            return <text key={v} x={x(v)} y={ph + 20} textAnchor={anchor} className="tick" style={{ fontSize: fs.tick }}>{v}</text>;
          })}
          {inDomain && (
            <g transform={`translate(${tagX},${ph + 5})`} pointerEvents="none">
              <rect x={-21} y={0} width={42} height={21} rx={10.5} className="cursor-tag" />
              <text y={15} textAnchor="middle" className="cursor-tag-text">{year}</text>
            </g>
          )}
          <rect x={-m.l} y={-m.t} width={width} height={height} fill="transparent" />
        </g>
      </svg>
    </div>
  );
}

export function xTicks(d0, d1, narrow) {
  if (d0 === 1825 && d1 === 2024) return narrow ? [1825, 1875, 1925, 1975, 2024] : [1825, 1850, 1875, 1900, 1925, 1950, 1975, 2000, 2024];
  if (d0 === 1825) return narrow ? [1825, 1850, 1875, 1900, 1947] : [1825, 1850, 1875, 1900, 1925, 1947];
  return narrow ? [1970, 1990, 2010, 2024] : [1970, 1980, 1990, 2000, 2010, 2024];
}

export const chartMargins = (width) => (width < 560 ? { l: 40, r: 10 } : { l: 48, r: 16 });
