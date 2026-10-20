import { useMemo, useRef, useState, useEffect } from 'react';
import { scaleLinear } from 'd3-scale';
import data from '../data/explorer.json';
import { useWidth } from '../hooks/useWidth.js';
import { useTween } from '../hooks/useTween.js';
import { layoutLabels, rowCount } from './labelLayout.js';
import {
  PAL, SERIES, buildLayers, axesFor, segmentsFor, domainFor, gapsFor, annotationsFor, eventsFor, formatValue,
} from '../model.js';

const tickFmt = (v) => v.toLocaleString('en-US');

/** The hero chart: one x axis 1825–2024 (or an era), lines / stacked areas / stacked bars by state. */
export default function MainChart({ state, year, onYear }) {
  const [ref, width] = useWidth();
  const svgRef = useRef(null);
  const [active, setActive] = useState(false);
  const hideTimer = useRef(null);
  const narrow = width < 560;

  const layers = useMemo(() => buildLayers(state), [state]);
  const axes = useMemo(() => axesFor(state, layers), [state, layers]);
  const segs = segmentsFor(state);
  const [d0, d1] = domainFor(state);
  const events = eventsFor(state, narrow);

  // ---- layout
  const fs = narrow ? { tick: 11.5, anno: 13.5, val: 15, lh: 16, ev: 11 } : { tick: 13, anno: 16, val: 19, lh: 19, ev: 12.5 };
  const m = { l: narrow ? 42 : 50, r: axes.split ? (narrow ? 40 : 52) : narrow ? 10 : 16, b: 28 };
  const iw = width - m.l - m.r;
  const x = useMemo(() => scaleLinear([d0 - 0.5, d1 + 0.5], [0, iw]), [d0, d1, iw]);
  const laid = layoutLabels(events.map((e) => ({ ...e, text: narrow ? String(e.year) : `${e.year} ${e.short}` })), x, iw, { charW: narrow ? 6.4 : 7.2 });
  const bandH = rowCount(laid) * (fs.ev + 4) + 8;
  const ph = narrow ? 300 : 380;
  const top = bandH;
  const height = top + ph + m.b;

  const headroom = state.measure === 'mix' ? 1 : 1.16;
  const yScales = useMemo(() => {
    const out = {};
    for (const [k, s] of Object.entries(axes.scales)) out[k] = scaleLinear([0, (s.max || 1) * headroom], [ph, 0]).nice(4);
    if (state.measure === 'mix') out.all = scaleLinear([0, 100], [ph, 0]);
    return out;
  }, [axes, ph, headroom, state.measure]);
  const yOf = (seg) => (axes.split ? yScales[seg] : yScales.all);

  // ---- target geometry (pixels), tweened over 500ms on every change of view
  const target = useMemo(() => layers.map((l) => {
    const y = yOf(l.seg);
    return {
      id: l.id, seg: l.seg, kind: l.kind, on: l.on !== false,
      points: l.points.map((p) => (p.v1 == null
        ? { year: p.year, d: false }
        : { year: p.year, d: true, x: x(p.year), y1: y(p.v1), y0: p.v0 == null ? null : y(p.v0), value: p.value ?? p.v1 })),
    };
  }), [layers, x, yScales]); // eslint-disable-line react-hooks/exhaustive-deps
  const geo = useTween(target, 500, state);

  const bw = Math.max(1.2, (iw / (d1 - d0 + 1)) * 0.74);

  // ---- pointer scrubbing
  function yearAt(e) {
    const r = svgRef.current.getBoundingClientRect();
    return Math.max(d0, Math.min(d1, Math.round(x.invert(e.clientX - r.left - m.l))));
  }
  const onMove = (e) => {
    if (e.pointerType === 'mouse' || e.buttons || e.type === 'pointerdown') {
      onYear(yearAt(e));
      setActive(true);
      clearTimeout(hideTimer.current);
    }
  };
  const onLeave = (e) => {
    if (e.pointerType === 'mouse') setActive(false);
    else hideTimer.current = setTimeout(() => setActive(false), 1800);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  // keyboard scrubbing (slider focus) also shows the tooltip
  useEffect(() => {
    const onFocus = (e) => { if (e.target.matches?.('.main-slider input')) setActive(e.type === 'focusin'); };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onFocus);
    return () => { document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onFocus); };
  }, []);

  // ---- shapes
  const areaPath = (pts) => {
    const runs = [];
    let run = [];
    for (const p of pts) { if (p.d) run.push(p); else if (run.length) { runs.push(run); run = []; } }
    if (run.length) runs.push(run);
    return runs.map((r) => {
      const xs = (p, i, a) => (a.length === 1 ? p.x : p.x);
      const fwd = r.map((p, i, a) => `${xs(p, i, a).toFixed(1)},${p.y1.toFixed(1)}`).join('L');
      const back = [...r].reverse().map((p) => `${p.x.toFixed(1)},${p.y0.toFixed(1)}`).join('L');
      return `M${fwd}L${back}Z`;
    }).join('');
  };
  const linePath = (pts) => {
    let d = '';
    let pen = false;
    for (const p of pts) {
      if (!p.d) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)},${p.y1.toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const lineFill = (pts, base) => {
    const r = pts.filter((p) => p.d);
    if (!r.length) return '';
    return `M${r[0].x},${base}L${r.map((p) => `${p.x.toFixed(1)},${p.y1.toFixed(1)}`).join('L')}L${r.at(-1).x},${base}Z`;
  };

  // ---- area labels inside bands (breakdown view), only where they fit
  const areaLabels = useMemo(() => {
    if (state.measure !== 'mix' || state.subject !== 'debt') return [];
    const placed = [];
    const charW = narrow ? 7.4 : 8.6;
    const lh = narrow ? 15 : 18;
    for (const l of target) {
      if (l.kind !== 'area' || !l.on) continue;
      const s = SERIES[l.id];
      const pk = data.stats.credPeaks[l.id];
      const raw = layers.find((r) => r.id === l.id);
      const pkPt = raw.points.reduce((a, p) => ((p.value ?? -1) > (a.value ?? -1) ? p : a));
      const lines = [s.label, `${Math.round(pkPt.value)}% in ${pkPt.year}`];
      if (narrow && s.label.length > 12) lines.splice(0, 1, ...s.label.split(' and ').map((t, i, a) => (i < a.length - 1 ? `${t} and` : t)));
      const w = Math.max(...lines.map((t) => t.length)) * charW;
      const h = lines.length * lh + 4;
      const cands = l.points.filter((p) => p.d).sort((a, b) => (b.y0 - b.y1) - (a.y0 - a.y1));
      for (const c of cands.slice(0, 30)) {
        const thick = c.y0 - c.y1;
        if (thick < h) break;
        const cx = Math.max(w / 2 + 2, Math.min(iw - w / 2 - 2, c.x));
        const box = { l: cx - w / 2, r: cx + w / 2, t: (c.y0 + c.y1) / 2 - h / 2, b: (c.y0 + c.y1) / 2 + h / 2 };
        const span = l.points.filter((p) => p.x >= box.l - 2 && p.x <= box.r + 2);
        const fits = span.length && span.every((p) => p.d && p.y1 <= box.t && p.y0 >= box.b);
        const clash = placed.some((o) => !(box.r < o.box.l || box.l > o.box.r || box.b < o.box.t || box.t > o.box.b));
        if (fits && !clash) { placed.push({ id: l.id, box, cx, lines, color: s.text, lh, peak: pk }); break; }
      }
    }
    return placed;
  }, [target, layers, state.measure, state.subject, iw, narrow]);

  // ---- annotations (computed positions)
  const annos = annotationsFor(state, layers, narrow).map((a, i) => {
    const y = yOf(a.seg);
    const px = x(a.year), py = y(a.v);
    if (a.kind === 'value') {
      const text = a.text;
      const w = text.length * fs.val * 0.58;
      let tx = px + (a.dx || 0), anchor = a.above ? 'middle' : 'start';
      if (anchor === 'middle') tx = Math.max(w / 2, Math.min(iw - w / 2, tx));
      if (anchor === 'start' && tx + 10 + w > iw) { anchor = 'end'; tx = px - 10; }
      const ty = a.above ? Math.max(fs.val + 2, py - 12) : Math.max(fs.val, py + 6);
      return { ...a, key: i, px, py, tx: anchor === 'start' ? tx + 10 : tx, ty, anchor };
    }
    const w = Math.max(...a.lines.map((t) => t.length)) * fs.anno * 0.5;
    let tx = x(a.at[0]);
    if (a.anchor === 'start') tx = Math.min(tx, iw - w);
    if (a.anchor === 'end') tx = Math.max(tx, w);
    const blockH = a.lines.length * fs.lh;
    let ty = Math.max(fs.anno + 2, Math.min(ph - blockH, y(a.at[1])));
    // leader: from the text block edge nearest the point, to just short of the point
    const bx = a.anchor === 'start' ? tx + 4 : a.anchor === 'end' ? tx - Math.min(w, 60) : tx;
    const below = py > ty + blockH - fs.anno;
    const by = below ? ty + blockH - fs.anno + 6 : ty - fs.anno - 2;
    const ang = Math.atan2(py - by, px - bx);
    const ex = px - Math.cos(ang) * 7, ey = py - Math.sin(ang) * 7;
    return { ...a, key: i, px, py, tx, ty, bx, by, ex, ey, ang };
  });

  // ---- tooltip content
  const inDomain = year >= d0 && year <= d1;
  const rows = [];
  if (inDomain) {
    for (const l of layers) {
      if (l.on === false) continue;
      const p = l.points.find((q) => q.year === year);
      if (!p || p.v1 == null) continue;
      rows.push({ id: l.id, seg: l.seg, label: SERIES[l.id].label, color: SERIES[l.id].color, value: formatValue(p.value ?? p.v1, state.measure, l.seg), raw: p.value ?? p.v1 });
    }
  }
  const stackRows = rows.filter((r) => SERIES[r.id].kind !== 'line');
  const total = stackRows.length > 1 && state.measure !== 'mix' ? formatValue(stackRows.reduce((a, r) => a + r.raw, 0), state.measure, stackRows[0].seg) : null;
  const cx = x(year);
  const tipW = narrow ? 178 : 220;
  const tipLeft = cx + m.l + 14 + tipW > width ? cx + m.l - 14 - tipW : cx + m.l + 14;
  const gaps = gapsFor(state);
  const evActive = new Set(events.filter((e) => e.year === year).map((e) => e.id));

  const tagX = Math.max(20, Math.min(iw - 20, cx));
  return (
    <div ref={ref} className="chart-wrap main-chart">
      <svg ref={svgRef} width={width} height={height} className="chart" aria-hidden="true" data-ml={m.l} data-iw={iw} data-d0={d0} data-d1={d1} data-top={top} data-ph={ph}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={onLeave} onPointerUp={(e) => e.pointerType !== 'mouse' && onLeave(e)}>
        <g transform={`translate(${m.l},0)`}>
          {/* event markers, in a band above the plot */}
          {laid.map((e) => {
            const ly = e.row * (fs.ev + 4) + fs.ev + 2;
            return (
              <g key={e.id} className={`event ${evActive.has(e.id) ? 'is-active' : ''}`}>
                <line x1={e.px} x2={e.px} y1={ly + 4} y2={top + ph} className="event-rule" />
                <text x={e.tx} y={ly} textAnchor={e.anchor} className="event-label" style={{ fontSize: fs.ev }}>{e.text}</text>
              </g>
            );
          })}
          <g transform={`translate(0,${top})`}>
            {/* gap bands */}
            {gaps.map((g) => (
              <rect key={g.x0} x={x(g.x0 - 0.5)} width={Math.max(0, x(g.x1 + 0.5) - x(g.x0 - 0.5))} y={0} height={ph} className={g.soft ? 'gap gap-soft' : 'gap'} />
            ))}
            {/* grid + y ticks */}
            {axes.split ? (
              ['hist', 'modern'].map((sid) => {
                const seg = segs.find((s) => s.id === sid);
                const y = yScales[sid];
                const x0 = x(seg.x0 - 0.5), x1 = x(seg.x1 + 0.5);
                return (
                  <g key={sid}>
                    {y.ticks(4).filter((v) => v > 0).map((v) => (
                      <g key={v}>
                        <line x1={x0} x2={x1} y1={y(v)} y2={y(v)} className="grid" />
                        <text x={sid === 'hist' ? -8 : iw + 6} y={y(v) + 4} textAnchor={sid === 'hist' ? 'end' : 'start'} className="tick" style={{ fontSize: fs.tick }}>{tickFmt(v)}</text>
                      </g>
                    ))}
                    <text x={sid === 'hist' ? 4 : iw - 4} y={fs.tick + 2} textAnchor={sid === 'hist' ? 'start' : 'end'} className="unit" style={{ fontSize: fs.tick }}>{axes.scales[sid].unit}</text>
                  </g>
                );
              })
            ) : (
              <g>
                {yScales.all.ticks(4).filter((v) => v > 0).map((v, i, a) => (
                  <g key={v}>
                    <line x1={0} x2={iw} y1={yScales.all(v)} y2={yScales.all(v)} className="grid" />
                    <text x={-8} y={yScales.all(v) + 4} textAnchor="end" className="tick" style={{ fontSize: fs.tick }}>{tickFmt(v)}{i === a.length - 1 && axes.scales.all.unit === '%' ? '%' : ''}</text>
                  </g>
                ))}
                {axes.scales.all.unit !== '%' && <text x={4} y={fs.tick + 2} className="unit" style={{ fontSize: fs.tick }}>{axes.scales.all.unit}</text>}
              </g>
            )}
            {/* data */}
            {geo.map((l) => {
              const s = SERIES[l.id];
              if (l.kind === 'area') return <path key={l.id} d={areaPath(l.points)} fill={s.color} className="area" />;
              if (l.kind === 'bar') {
                return (
                  <g key={l.id} fill={s.color}>
                    {l.points.filter((p) => p.d && p.y0 - p.y1 > 0.05).map((p) => (
                      <rect key={p.year} x={p.x - bw / 2} width={bw} y={p.y1} height={p.y0 - p.y1} className={p.year === year ? 'bar is-active' : 'bar'} />
                    ))}
                  </g>
                );
              }
              return (
                <g key={l.id}>
                  {s.fill && <path d={lineFill(l.points, ph)} className="line-fill" />}
                  <path d={linePath(l.points)} fill="none" stroke={s.color} className={s.fill ? 'line line-main' : 'line line-sub'} />
                </g>
              );
            })}
            {/* gap labels (after data so lines never cross them) */}
            {gaps.map((g) => {
              const gx = (x(g.x0 - 0.5) + x(g.x1 + 0.5)) / 2;
              const gw = x(g.x1 + 0.5) - x(g.x0 - 0.5);
              if (gw < 40) return null;
              return (
                <text key={`l${g.x0}`} x={gx} y={g.soft && !g.wide ? ph * 0.62 : narrow ? ph * 0.62 : 80} textAnchor="middle" className="gap-label" style={{ fontSize: narrow ? 12 : 15 }}>
                  {g.lines.map((t, i) => <tspan key={t} x={gx} dy={i ? (narrow ? 15 : 19) : 0}>{t}</tspan>)}
                </text>
              );
            })}
            <line x1={0} x2={iw} y1={ph} y2={ph} className="baseline" />
            {/* area labels */}
            {areaLabels.map((a) => (
              <text key={a.id} x={a.cx} y={a.box.t + a.lh} textAnchor="middle" className="area-label" fill={a.color} style={{ fontSize: narrow ? 12.5 : 15 }}>
                {a.lines.map((t, i) => <tspan key={t} x={a.cx} dy={i ? a.lh : 0} fontWeight={i < a.lines.length - 1 ? 700 : 400}>{t}</tspan>)}
              </text>
            ))}
            {/* annotations */}
            {annos.map((a) => (a.kind === 'value' ? (
              <g key={a.key}>
                <circle cx={a.px} cy={a.py} r={narrow ? 4.5 : 5.5} className="val-dot" />
                <text x={a.tx} y={a.ty} textAnchor={a.anchor} className="val-label" style={{ fontSize: fs.val }}>{a.text}</text>
              </g>
            ) : (
              <g key={a.key} className="anno">
                <line x1={a.bx} y1={a.by} x2={a.ex} y2={a.ey} className="anno-leader" />
                <path d={`M${a.px - Math.cos(a.ang) * 3},${a.py - Math.sin(a.ang) * 3} l${-Math.cos(a.ang - 0.42) * 8},${-Math.sin(a.ang - 0.42) * 8} l${Math.cos(a.ang - 0.42) * 8 - Math.cos(a.ang + 0.42) * 8},${Math.sin(a.ang - 0.42) * 8 - Math.sin(a.ang + 0.42) * 8}Z`} className="anno-head" />
                <text x={a.tx} y={a.ty} textAnchor={a.anchor} className="anno-text" style={{ fontSize: fs.anno }}>
                  {a.lines.map((t, i) => <tspan key={t} x={a.tx} dy={i ? fs.lh : 0}>{t}</tspan>)}
                </text>
              </g>
            )))}
            {/* cursor */}
            {inDomain && (
              <g className="cursor" pointerEvents="none">
                <line x1={cx} x2={cx} y1={0} y2={ph} />
                {geo.filter((l) => l.kind === 'line').map((l) => {
                  const p = l.points.find((q) => q.year === year && q.d);
                  return p ? <circle key={l.id} cx={p.x} cy={p.y1} r={4.5} fill={SERIES[l.id].color} className="cursor-dot" /> : null;
                })}
              </g>
            )}
          </g>
          {/* x axis */}
          {xTicks(d0, d1, narrow).map((v) => {
            const anchor = x(v) > iw - 16 + m.r ? 'end' : x(v) < 16 - m.l ? 'start' : 'middle';
            // Hide any tick label the cursor's year tag would cover (estimated label extent + 4px gap).
            const w = String(v).length * fs.tick * 0.62;
            const l = anchor === 'end' ? x(v) - w : anchor === 'start' ? x(v) : x(v) - w / 2;
            if (inDomain && l < tagX + 21 + 4 && l + w > tagX - 21 - 4) return null;
            return <text key={v} x={x(v)} y={top + ph + 19} textAnchor={anchor} className="tick" style={{ fontSize: fs.tick }}>{v}</text>;
          })}
          {inDomain && (
            <g transform={`translate(${tagX},${top + ph + 4})`} pointerEvents="none">
              <rect x={-21} y={0} width={42} height={21} rx={10.5} className="cursor-tag" />
              <text y={15} textAnchor="middle" className="cursor-tag-text">{year}</text>
            </g>
          )}
          <rect x={-m.l} y={0} width={width} height={height} fill="transparent" />
        </g>
      </svg>
      {active && inDomain && (
        <div className="tip" style={{ left: Math.max(4, tipLeft), top: top + 6, width: tipW }} role="presentation">
          <div className="tip-year">{year}</div>
          {rows.length ? rows.map((r) => (
            <div key={r.id} className="tip-row"><span className="sw" style={{ background: r.color }} />{r.label}<b>{r.value}</b></div>
          )) : <div className="tip-empty">No data for this year</div>}
          {total && <div className="tip-row tip-total">Total<b>{total}</b></div>}
        </div>
      )}
    </div>
  );
}

function xTicks(d0, d1, narrow) {
  if (d0 === 1825 && d1 === 2024) return narrow ? [1825, 1875, 1925, 1975, 2024] : [1825, 1850, 1875, 1900, 1925, 1950, 1975, 2000, 2024];
  if (d0 === 1825) return narrow ? [1825, 1850, 1875, 1900, 1947] : [1825, 1850, 1875, 1900, 1925, 1947];
  return narrow ? [1970, 1990, 2010, 2024] : [1970, 1980, 1990, 2000, 2010, 2024];
}
