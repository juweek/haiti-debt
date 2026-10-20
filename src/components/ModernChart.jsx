import { useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { line, area, curveMonotoneX } from 'd3-shape';
import { max } from 'd3-array';
import data from '../data/explorer.json';
import { useWidth } from '../hooks/useWidth.js';
import { layoutLabels, rowCount } from './labelLayout.js';
import { pct, usdM } from '../format.js';
import SourceRef from './SourceRef.jsx';
import { useT } from '../i18n.js';

/** World Bank total external debt stocks as % of GDP, 1970–2024. */
export default function ModernChart() {
  const t = useT();
  const rows = data.modern;
  const first = rows[0].year;
  const last = rows.at(-1).year;
  const [year, setYear] = useState(last);
  const [ref, width] = useWidth();
  const svgRef = useRef(null);
  const mobile = width < 560;
  const m = { l: mobile ? 36 : 46, r: mobile ? 10 : 18 };
  const iw = width - m.l - m.r;
  const x = useMemo(() => scaleLinear([first, last], [0, iw]), [first, last, iw]);
  const events = useMemo(() => layoutLabels(
    data.modernEvents.map((e) => ({ ...e, text: mobile ? String(e.year) : `${e.year} ${e.short}` })), x, iw, { charW: mobile ? 6.3 : 6.5 },
  ), [x, iw, mobile]);
  const bandH = rowCount(events) * 15 + 6;
  const h = mobile ? 150 : 190;
  const top = bandH;
  const height = top + h + 26;
  const y = scaleLinear([0, Math.ceil(max(rows, (d) => d.pct) / 10) * 10], [h, 0]);
  const ln = line().x((d) => x(d.year)).y((d) => y(d.pct)).curve(curveMonotoneX);
  const ar = area().x((d) => x(d.year)).y0(h).y1((d) => y(d.pct)).curve(curveMonotoneX);
  const cur = rows.find((d) => d.year === year);
  const ev = data.modernEvents.find((e) => e.year === year);

  const pick = (e) => {
    if (!(e.pointerType === 'mouse' || e.buttons || e.type === 'pointerdown')) return;
    const r = svgRef.current.getBoundingClientRect();
    setYear(Math.max(first, Math.min(last, Math.round(x.invert(e.clientX - r.left - m.l)))));
  };

  return (
    <section className="modern" aria-labelledby="modern-h">
      <h2 id="modern-h">{t('modernTitle')}</h2>
      <p className="section-dek">
        The 1947 payoff did not end Haiti’s borrowing. This is a different measure from the chart above: the World Bank’s total
        external debt (public and private, including IMF credit) as a share of GDP. No comparable series exists for 1948–1969.
      </p>
      <div className="readout readout-small" aria-live="polite">
        <div className="readout-head">
          <span className="readout-year">{year}</span>
          {ev && <span className="readout-event">{ev.title}</span>}
        </div>
        <div className="stats">
          <div className="stat tone-owed">
            <div className="stat-label">External debt</div>
            <div className="stat-value">{pct(cur.pct)}</div>
            <div className="stat-sub">of GDP · {usdM(cur.debtUsdM)}</div>
          </div>
        </div>
        {ev && <p className="readout-text">{ev.text} <SourceRef ids={ev.source} as="span" className="inline" /></p>}
      </div>
      <div ref={ref} className="chart-wrap">
        <svg ref={svgRef} width={width} height={height} className="timeline" aria-hidden="true" onPointerMove={pick} onPointerDown={pick}>
          <g transform={`translate(${m.l},0)`}>
            {events.map((e) => (
              <g key={e.id} className={`event ${e.year === year ? 'is-active' : ''}`}>
                <line x1={e.px} x2={e.px} y1={e.row * 15 + 14} y2={top + h} className="event-rule" />
                <text x={e.tx} y={e.row * 15 + 11} textAnchor={e.anchor} className="event-label">{e.text}</text>
              </g>
            ))}
            <g transform={`translate(0,${top})`}>
              {y.ticks(4).filter((v) => v > 0).map((v) => (
                <g key={v}>
                  <line x1={0} x2={iw} y1={y(v)} y2={y(v)} className="grid" />
                  <text x={-6} y={y(v) + 4} textAnchor="end" className="tick">{v}%</text>
                </g>
              ))}
              <path d={ar(rows)} className="area-modern" />
              <path d={ln(rows)} className="line-owed" />
              <line x1={0} x2={iw} y1={h} y2={h} className="baseline" />
              <line x1={x(year)} x2={x(year)} y1={0} y2={h} className="cursor-line" />
              <circle cx={x(year)} cy={y(cur.pct)} r={4.5} className="dot-owed" />
            </g>
            {[1970, 1990, 2010, last].map((v) => (
              <text key={v} x={x(v)} y={top + h + 17} textAnchor={v === last ? 'end' : v === first ? 'start' : 'middle'} className="tick">{v}</text>
            ))}
            <rect x={-m.l} width={width} height={height} fill="transparent" />
          </g>
        </svg>
      </div>
      <label className="slider">
        <span className="visually-hidden">Year, modern chart</span>
        <input type="range" min={first} max={last} step={1} value={year} onChange={(e) => setYear(Number(e.target.value))}
          aria-valuetext={`${year}: external debt ${pct(cur.pct)} of GDP`} />
      </label>
      <SourceRef ids={['wb_wdi']} label="Data" />
    </section>
  );
}
