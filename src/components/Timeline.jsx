import { useMemo, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { line, curveLinear, curveMonotoneX } from 'd3-shape';
import data from '../data/explorer.json';
import { useWidth } from '../hooks/useWidth.js';
import { layoutLabels, rowCount } from './labelLayout.js';
import { useT } from '../i18n.js';
import HaloText from './HaloText.jsx';

export const START = 1825;
export const END = 1947;
const NO_GDP_FROM = 1916; // Henochsberg GDP ends in 1915

/** Two stacked panels sharing one x axis: debt owed (% GDP) and payments (% GDP). */
export default function Timeline({ year, onYear }) {
  const t = useT();
  const [ref, width] = useWidth();
  const svgRef = useRef(null);
  const mobile = width < 560;
  const m = { l: mobile ? 36 : 46, r: mobile ? 10 : 18 };
  const iw = width - m.l - m.r;

  const x = useMemo(() => scaleLinear([START, END], [0, iw]), [iw]);
  const events = useMemo(
    () => layoutLabels(
      data.events.map((e) => ({ ...e, text: mobile ? String(e.year) : `${e.year} ${e.short}` })),
      x, iw, { charW: mobile ? 6.3 : 6.5 },
    ),
    [x, iw, mobile],
  );

  const rowH = 15;
  const titleH = 22;
  const bandH = rowCount(events) * rowH + 6;
  const hA = mobile ? 190 : 250;
  const hB = mobile ? 112 : 140;
  const aTop = titleH + bandH;
  const bTitleTop = aTop + hA + 14;
  const bTop = bTitleTop + titleH;
  const axisTop = bTop + hB;
  const height = axisTop + 26;

  const yA = scaleLinear([0, 320], [hA, 0]);
  const yB = scaleLinear([0, 12], [hB, 0]);
  const years = data.years;
  const owedLine = line().defined((d) => d.owedPctGdp != null).x((d) => x(d.year)).y((d) => yA(d.owedPctGdp)).curve(curveLinear);
  const extLine = line().defined((d) => d.extDebtPctGdp != null).x((d) => x(d.year)).y((d) => yA(d.extDebtPctGdp)).curve(curveMonotoneX);
  const bw = Math.max(1.2, (iw / (END - START)) * 0.72);
  const cur = years.find((d) => d.year === year);
  const cx = x(year);

  function yearFromEvent(e) {
    const r = svgRef.current.getBoundingClientRect();
    const px = e.clientX - r.left - m.l;
    return Math.max(START, Math.min(END, Math.round(x.invert(px))));
  }
  const onPointer = (e) => {
    if (e.pointerType === 'mouse' || e.buttons || e.type === 'pointerdown') onYear(yearFromEvent(e));
  };

  const xTicks = [1825, 1850, 1875, 1900, 1925, 1947];
  const peak = years.find((d) => d.year === data.stats.peakPayYear);
  const gapX = x(NO_GDP_FROM - 0.5);
  const gapW = iw - gapX;
  const payEndX = x(data.stats.lastPayYear + 0.5);

  return (
    <div ref={ref} className="chart-wrap">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="timeline"
        aria-hidden="true"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
      >
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="hatch-line" />
          </pattern>
        </defs>
        <g transform={`translate(${m.l},0)`}>
          {/* Panel A title */}
          <text className="panel-title" x={0} y={15}>{t('panelOwed')}</text>

          {/* Event ticks + labels (inside the chart area, above the data) */}
          {events.map((e) => {
            const active = e.year === year;
            const ly = titleH + e.row * rowH + 11;
            return (
              <g key={e.id} className={`event ${active ? 'is-active' : ''}`}>
                <line x1={e.px} x2={e.px} y1={ly + 3} y2={axisTop} className="event-rule" />
                <text x={e.tx} y={ly} textAnchor={e.anchor} className="event-label">{e.text}</text>
              </g>
            );
          })}

          {/* Panel A: debt owed, % GDP */}
          <g transform={`translate(0,${aTop})`}>
            <rect x={gapX} width={gapW} y={0} height={hA} fill="url(#hatch)" className="gap" />
            {yA.ticks(4).filter((v) => v > 0).map((v) => (
              <g key={v}>
                <line x1={0} x2={gapX} y1={yA(v)} y2={yA(v)} className="grid" />
                <text x={-6} y={yA(v) + 4} textAnchor="end" className="tick">{v}%</text>
              </g>
            ))}
            <line x1={cx} x2={cx} y1={0} y2={hA} className="cursor-line" />
            <line x1={0} x2={iw} y1={hA} y2={hA} className="baseline" />
            <path d={extLine(years)} className="line-ext" />
            <path d={owedLine(years)} className="line-owed" />
            <HaloText className="gap-label" x={gapX + gapW / 2} y={hA / 2 - 14} textAnchor="middle">
              <tspan x={gapX + gapW / 2}>No GDP</tspan>
              <tspan x={gapX + gapW / 2} dy="14">estimates</tspan>
              <tspan x={gapX + gapW / 2} dy="14">1916–47</tspan>
            </HaloText>
            <HaloText className="annot" x={x(1841)} y={yA(245)}>
              <tspan x={x(1841)}>Owed ≈{Math.round(data.stats.owedPct1826 / 100)}× Haiti’s GDP</tspan>
              <tspan x={x(1841)} dy="14">in 1826</tspan>
            </HaloText>
            <HaloText className="annot annot-muted" x={x(1889) + 3} y={yA(62)}>
              {mobile ? 'New loans' : 'New loans, 1896 and 1910'}
            </HaloText>
          </g>

          {/* Panel B: payments, % GDP */}
          <text className="panel-title" x={0} y={bTitleTop + 15}>{t('panelPaid')}</text>
          <g transform={`translate(0,${bTop})`}>
            <rect x={payEndX} width={iw - payEndX} y={0} height={hB} className="gap-soft" />
            {[5, 10].map((v) => (
              <g key={v}>
                <line x1={0} x2={payEndX} y1={yB(v)} y2={yB(v)} className="grid" />
                <text x={-6} y={yB(v) + 4} textAnchor="end" className="tick">{v}%</text>
              </g>
            ))}
            <line x1={cx} x2={cx} y1={0} y2={hB} className="cursor-line" />
            {years.filter((d) => d.payPctGdp > 0).map((d) => (
              <rect
                key={d.year}
                x={x(d.year) - bw / 2}
                width={bw}
                y={yB(d.payPctGdp)}
                height={hB - yB(d.payPctGdp)}
                className={`bar ${d.year === year ? 'is-active' : ''}`}
              />
            ))}
            <line x1={0} x2={iw} y1={hB} y2={hB} className="baseline" />
            <HaloText className="gap-label" fill="#f3efe8" x={payEndX + 6} y={hB / 2 - 4}>
              <tspan x={payEndX + 6}>Double debt paid off in 1888.</tspan>
              <tspan x={payEndX + 6} dy="14">{mobile ? 'No annual payment' : 'No annual payment series for later loans.'}</tspan>
              {mobile && <tspan x={payEndX + 6} dy="14">series after that.</tspan>}
            </HaloText>
            <HaloText className="annot" x={x(peak.year) + bw + 4} y={yB(peak.payPctGdp) + 10}>
              {`${peak.payPctGdp.toFixed(1)}% in ${peak.year}`}
            </HaloText>
          </g>

          {/* x axis */}
          {xTicks.filter((v) => Math.abs(x(v) - cx) > 30).map((v) => (
            <text key={v} x={x(v)} y={axisTop + 17} textAnchor={v === END ? 'end' : v === START ? 'start' : 'middle'} className="tick">{v}</text>
          ))}

          {/* Cursor */}
          <g className="cursor" pointerEvents="none">
            {cur?.extDebtPctGdp != null && <circle cx={cx} cy={aTop + yA(cur.extDebtPctGdp)} r={4} className="dot-ext" />}
            {cur?.owedPctGdp != null && <circle cx={cx} cy={aTop + yA(cur.owedPctGdp)} r={4.5} className="dot-owed" />}
            <g transform={`translate(${Math.max(18, Math.min(iw - 18, cx))},${axisTop + 2})`}>
              <rect x={-19} y={0} width={38} height={20} rx={3} className="cursor-tag" />
              <text y={14.5} textAnchor="middle" className="cursor-tag-text">{year}</text>
            </g>
          </g>

          {/* hit area */}
          <rect x={-m.l} y={0} width={width} height={height} fill="transparent" />
        </g>
      </svg>
    </div>
  );
}
