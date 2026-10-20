import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import data from './data/explorer.json';
import Shell from './components/Shell.jsx';
import MainChart from './components/MainChart.jsx';
import Controls from './components/Controls.jsx';
import CostPanel from './components/CostPanel.jsx';
import SourceRef from './components/SourceRef.jsx';
import SourceBlock from './components/SourceBlock.jsx';
import { useT } from './i18n.js';
import { francs, pct } from './format.js';
import { ALL_ON, ERAS, MEASURES, SUBJECTS, domainFor, eventsFor, titlesFor, notesFor } from './model.js';
import './styles.css';

const S = data.stats;
const ALL_EVENTS = [...data.events, ...data.modernEvents];

function readHash() {
  const q = new URLSearchParams(window.location.hash.slice(1));
  const pick = (k, obj, dflt) => (q.get(k) in obj ? q.get(k) : dflt);
  const subject = pick('s', SUBJECTS, 'debt');
  let era = pick('e', ERAS, 'full');
  let measure = pick('m', MEASURES, 'pct');
  if (subject === 'debt' && era === 'hist' && measure === 'mix') measure = 'pct';
  const off = new Set((q.get('off') || '').split(',').filter(Boolean));
  const enabled = new Set(ALL_ON.filter((id) => !off.has(id)));
  const y = Number(q.get('y'));
  return { state: { subject, era, measure, enabled }, year: Number.isFinite(y) && y >= 1825 && y <= 2024 ? y : 1826 };
}
function writeHash(state, year) {
  const off = ALL_ON.filter((id) => !state.enabled.has(id));
  const q = new URLSearchParams({ y: year, s: state.subject, m: state.measure, e: state.era });
  if (off.length) q.set('off', off.join(','));
  return `#${q.toString()}`;
}

function contextFor(year) {
  if (year <= 1825) return 'Haiti’s first installment was paid with the 1825 loan, so the NYT records no payment from Haiti’s own revenue this year.';
  if (year <= 1888) return 'Haiti is paying the double debt: the indemnity to France plus the 1825 loan to French bankers.';
  if (year <= 1915) return 'The double debt is paid off, but Haiti is still repaying newer foreign loans (1875, 1896, 1910). The NYT payment series stops in 1888.';
  if (year <= 1927) return 'US occupation. No GDP estimate exists for these years. The receivership’s own accounts put gross public debt at ' + `$${data.years.find((d) => d.year === year)?.pubDebtUsdM} million (Sept. 30).`;
  if (year <= 1947) return 'No annual debt series has been found for 1928–1947. Haiti finished repaying the 1922 US loans in 1947.';
  if (year < 1970) return 'No annual debt or GDP series for 1948–1969. World Bank debt data starts in 1970.';
  const d = data.modern.find((r) => r.year === year);
  return d ? `World Bank figures for ${year}: external debt of $${d.debtUsdM.toLocaleString('en-US')} million, ${pct(d.pct)} of GDP.` : '';
}
function srcFor(year) {
  if (year <= 1915) return ['nyt_data', 'henochsberg'];
  if (year <= 1927) return ['receiver_1927'];
  if (year < 1970) return ['imf_1950'];
  return ['wb_ids', 'wb_wdi'];
}

function YearNote({ year }) {
  const ev = ALL_EVENTS.find((e) => e.year === year);
  return (
    <div className="year-note" aria-live="polite">
      <p><b className="yn-year">{year}</b>{ev && <b className="yn-title"> {ev.title}.</b>} {ev ? ev.text : contextFor(year)}</p>
      <SourceRef ids={ev ? ev.source : srcFor(year)} label={ev ? 'Source' : 'Figures'} />
    </div>
  );
}

function Explorer() {
  const t = useT();
  const init = useMemo(readHash, []);
  const [state, setState] = useState(init.state);
  const [year, setYear] = useState(init.year);
  const [copied, setCopied] = useState(false);
  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const [d0, d1] = domainFor(state);

  useEffect(() => { if (year < d0) setYear(d0); else if (year > d1) setYear(d1); }, [d0, d1]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setTimeout(() => history.replaceState(null, '', writeHash(state, year)), 150);
    return () => clearTimeout(id);
  }, [state, year]);

  const { title, sub } = titlesFor(state);
  const notes = notesFor(state);
  const evYears = [...new Set(eventsFor(state, false).map((e) => e.year))].sort((a, b) => a - b);
  const prev = [...evYears].reverse().find((y) => y < year);
  const next = evYears.find((y) => y > year);

  async function share() {
    const url = `${location.origin}${location.pathname}${writeHash(state, year)}`;
    try {
      if (navigator.share) await navigator.share({ title: `Haiti’s Independence Debt, ${year}`, text: title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  }
  const step = (e) => {
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      setYear(Math.max(d0, Math.min(d1, year + (e.key === 'PageUp' ? 10 : -10))));
    }
  };

  return (
    <>
      <section className="card hero-card" aria-labelledby="chart-title">
        <div className="brand-bar" aria-hidden="true" />
        <h1 id="chart-title">{title}</h1>
        <p className="subhead">{sub}</p>
        <Controls state={state} set={set} />
        <MainChart state={state} year={year} onYear={setYear} />
        <label className="slider main-slider">
          <span className="visually-hidden">{t('sliderLabel')}</span>
          <input type="range" min={d0} max={d1} step={1} value={Math.max(d0, Math.min(d1, year))} onKeyDown={step}
            onChange={(e) => setYear(Number(e.target.value))} aria-valuetext={`${year}`} />
        </label>
        <div className="controls">
          <button type="button" className="pill" onClick={() => prev && setYear(prev)} disabled={!prev}>← {t('prevEvent')}</button>
          <button type="button" className="pill" onClick={() => next && setYear(next)} disabled={!next}>{t('nextEvent')} →</button>
          <button type="button" className="pill is-on share" onClick={share}>{copied ? t('copied') : t('share')}</button>
        </div>
        <YearNote year={year} />
        <SourceBlock ids={notes.ids} note={notes.note} />
      </section>

      <section className="intro">
        <p className="kicker">{t('kicker')}</p>
        <p className="dek">{t('dek')}</p>
        <ul className="keys">
          <li><strong>{Math.round(S.owedPct1826 / 100)}×</strong><span>{t('keyOwed')}</span></li>
          <li><strong>{pct(S.peakPayPct)}</strong><span>{t('keyPeak')}</span></li>
          <li><strong>≈{pct(S.medianPayPctPayingYears)}</strong><span>{t('keyMedian')}</span></li>
          <li><strong>≈{francs(Math.round(S.totalPaidFr / 1e6) * 1e6)}</strong><span>{t('keyTotal')}</span></li>
        </ul>
        <SourceRef ids={['nyt_data']} label="Calculated from" />
        <ol className="chips" aria-label="Jump to an event">
          {evYears.map((y) => {
            const e = ALL_EVENTS.find((x) => x.year === y);
            return (
              <li key={e.id}><button type="button" className="pill" aria-pressed={y === year} onClick={() => setYear(y)}><b>{y}</b> {e.short}</button></li>
            );
          })}
        </ol>
        <p className="hint">Keyboard: tab to the year slider and use the arrow keys (Page Up/Down jumps 10 years, Home/End to the ends).</p>
      </section>

      <CostPanel />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Shell page="explorer"><Explorer /></Shell>
  </StrictMode>,
);
