import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import data from './data/explorer.json';
import Shell from './components/Shell.jsx';
import Timeline, { START, END } from './components/Timeline.jsx';
import Readout, { YearNote } from './components/Readout.jsx';
import CostPanel from './components/CostPanel.jsx';
import ModernChart from './components/ModernChart.jsx';
import SourceRef from './components/SourceRef.jsx';
import { useT } from './i18n.js';
import { francs, pct } from './format.js';
import './styles.css';

const S = data.stats;
const EVENT_YEARS = data.events.map((e) => e.year);

function yearFromHash() {
  const m = /y=(\d{4})/.exec(window.location.hash);
  const y = m ? Number(m[1]) : NaN;
  return y >= START && y <= END ? y : S.peakPayYear;
}

function KeyNumbers() {
  const t = useT();
  const items = [
    [`${Math.round(S.owedPct1826 / 100)}×`, t('keyOwed')],
    [pct(S.peakPayPct), t('keyPeak')],
    [`≈${pct(S.medianPayPctPayingYears)}`, t('keyMedian')],
    [`≈${francs(Math.round(S.totalPaidFr / 1e6) * 1e6)}`, t('keyTotal')],
  ];
  return (
    <div className="keys">
      <ul>
        {items.map(([v, l]) => <li key={l}><strong>{v}</strong><span>{l}</span></li>)}
      </ul>
      <SourceRef ids={['nyt_data']} label="Calculated from" />
    </div>
  );
}

function Explorer() {
  const t = useT();
  const [year, setYearRaw] = useState(yearFromHash);
  const [copied, setCopied] = useState(false);
  const setYear = useCallback((y) => setYearRaw(y), []);

  useEffect(() => {
    const id = setTimeout(() => history.replaceState(null, '', `#y=${year}`), 150);
    return () => clearTimeout(id);
  }, [year]);

  const prev = [...EVENT_YEARS].reverse().find((y) => y < year);
  const next = EVENT_YEARS.find((y) => y > year);
  const d = data.years.find((r) => r.year === year);
  const valueText = [
    `${year}`,
    d.payPctGdp > 0 ? `paid ${pct(d.payPctGdp)} of GDP` : null,
    d.owedPctGdp != null ? `double debt owed ${pct(d.owedPctGdp)} of GDP` : null,
    data.events.find((e) => e.year === year)?.title,
  ].filter(Boolean).join(', ');

  async function share() {
    const url = `${location.origin}${location.pathname}#y=${year}`;
    const text = `Haiti’s Independence Debt in ${year}`;
    try {
      if (navigator.share) await navigator.share({ title: text, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* user cancelled */ }
  }

  return (
    <>
      <section className="hero">
        <p className="kicker">{t('kicker')}</p>
        <h1>{t('headline')}</h1>
        <p className="dek">{t('dek')}</p>
        <KeyNumbers />
      </section>

      <section className="explorer" aria-labelledby="tl-h">
        <h2 id="tl-h">{t('timelineTitle')}, {START}–{END}</h2>
        <ul className="legend">
          <li><span className="swatch swatch-owed" />{t('legendDouble')}</li>
          <li><span className="swatch swatch-ext" />{t('legendExternal')}</li>
          <li><span className="swatch swatch-paid" />{t('legendPaid')}</li>
        </ul>
        <Readout year={year} />
        <Timeline year={year} onYear={setYear} />
        <label className="slider">
          <span className="visually-hidden">{t('sliderLabel')}</span>
          <input type="range" min={START} max={END} step={1} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-valuetext={valueText}
            onKeyDown={(e) => {
              if (e.key === 'PageUp' || e.key === 'PageDown') {
                e.preventDefault();
                setYear(Math.max(START, Math.min(END, year + (e.key === 'PageUp' ? 10 : -10))));
              }
            }} />
        </label>
        <YearNote year={year} />
        <div className="controls">
          <button type="button" onClick={() => prev && setYear(prev)} disabled={!prev}>← {t('prevEvent')}</button>
          <button type="button" onClick={() => next && setYear(next)} disabled={!next}>{t('nextEvent')} →</button>
          <button type="button" className="share" onClick={share}>{copied ? t('copied') : t('share')}</button>
        </div>
        <ol className="chips" aria-label="Jump to an event">
          {data.events.map((e) => (
            <li key={e.id}>
              <button type="button" aria-pressed={e.year === year} onClick={() => setYear(e.year)}>
                <b>{e.year}</b> {e.short}
              </button>
            </li>
          ))}
        </ol>
        <p className="hint">Tip: tab to the slider and use the arrow keys (Page Up/Down jumps 10 years, Home/End to the ends).</p>
      </section>

      <CostPanel />
      <ModernChart />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Shell page="explorer"><Explorer /></Shell>
  </StrictMode>,
);
