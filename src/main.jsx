import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import data from './data/explorer.json';
import Shell from './components/Shell.jsx';
import MainChart from './components/MainChart.jsx';
import { Controls, Legend } from './components/Controls.jsx';
import Scrubber from './components/Scrubber.jsx';
import SourceBlock from './components/SourceBlock.jsx';
import SourceRef from './components/SourceRef.jsx';
import {
  ERAS, MEASURES, SUBJECTS, UNITS, SPLITTABLE, normalize, domainFor, eventsFor, titlesFor, notesFor, buildLayers, valuesAt, bandsFor,
} from './model.js';
import './styles.css';

const ALL_EVENTS = [...data.events, ...data.modernEvents];
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const SWEEP_MS = 9000;
const HOLD_MS = 1000;

function readHash() {
  const q = new URLSearchParams(window.location.hash.slice(1));
  const pick = (k, obj, dflt) => (q.get(k) in obj ? q.get(k) : dflt);
  const m = q.get('m') === 'mix' ? 'share' : q.get('m');
  const off = new Set((q.get('off') || '').split(',').filter(Boolean));
  const state = normalize({
    subject: pick('s', SUBJECTS, 'debt'),
    measure: m in MEASURES ? m : 'pct',
    unit: pick('u', UNITS, 'fr'),
    era: pick('e', ERAS, 'full'),
    split: q.get('sp') === '1' || m === 'share',
    enabled: new Set(SPLITTABLE.filter((id) => !off.has(id))),
  });
  const y = Number(q.get('y'));
  return { state, year: Number.isFinite(y) && y >= 1825 && y <= 2024 && q.get('y') ? y : 1838 };
}
function writeHash(state, year) {
  const q = new URLSearchParams({ y: year, s: state.subject, m: state.measure, u: state.unit, e: state.era, sp: state.split ? 1 : 0 });
  const off = SPLITTABLE.filter((id) => !state.enabled.has(id));
  if (off.length) q.set('off', off.join(','));
  return `#${q.toString()}`;
}

// Why a year has nothing drawn (no-data or other-unit years).
function emptyReason(state, year) {
  const b = bandsFor(state).find((g) => year >= g.x0 && year <= g.x1);
  if (state.subject === 'pay') return { text: year < 1826 ? 'Haiti’s first installment was paid with the 1825 loan, so the NYT records no payment from Haiti’s own revenue this year.' : 'The double debt was paid off in 1888. No year-by-year payment series is available after that.', src: ['nyt_readme'] };
  if (b?.hint === 'usd') return { text: `${year} was recorded in US dollars. Switch the unit to US$ to see it.`, src: year < 1970 ? ['receiver_1927'] : ['wb_ids'] };
  if (b?.hint === 'fr') return { text: `${year} was recorded in francs. Switch the unit to Francs to see it.`, src: ['henochsberg'] };
  if (state.measure === 'share' && year < 1970) return { text: 'The World Bank’s creditor breakdown starts in 1970.', src: ['wb_ids'] };
  if (state.measure === 'pct' && year > 1915 && year < 1970) return { text: `No GDP estimate exists for ${year}, so no share of GDP can be shown.`, src: year <= 1927 ? ['henochsberg', 'receiver_1927'] : ['henochsberg', 'wb_wdi'] };
  return { text: year <= 1947 ? `No annual debt series has been found for ${year}. Haiti finished repaying the 1922 US loans in 1947.` : `No annual debt series for ${year}. World Bank debt data starts in 1970.`, src: year <= 1947 ? ['imf_1950'] : ['imf_1950', 'wb_ids'] };
}

function YearNote({ state, layers, year }) {
  const ev = ALL_EVENTS.find((e) => e.year === year);
  const rows = valuesAt(state, layers, year);
  const empty = rows.length ? null : emptyReason(state, year);
  const src = [...new Set([...(ev?.source || []), ...rows.flatMap((r) => r.src), ...(empty?.src || [])])];
  return (
    <div className="year-note" aria-live="polite">
      <p className="yn-head"><b className="yn-year">{year}</b>{ev && <b className="yn-title"> {ev.title}</b>}</p>
      {ev && <p className="yn-text">{ev.text}</p>}
      {rows.length > 0 && (
        <ul className="yn-vals">
          {rows.map((r) => (
            <li key={r.id} className={r.kind === 'total' ? 'is-total' : ''}>
              {r.kind !== 'total' && <span className={`yn-sw ${r.kind === 'line' ? 'is-line' : ''}`} style={{ '--sw': r.color }} aria-hidden="true" />}
              <span>{r.label}</span> <b>{r.value}{state.measure === 'pct' && r.kind !== 'total' ? ' of GDP' : ''}</b>
            </li>
          ))}
        </ul>
      )}
      {empty && <p className="yn-text yn-empty">{empty.text}</p>}
      <SourceRef ids={src} label="Sources" className="yn-src" />
    </div>
  );
}

function Explorer() {
  const init = useMemo(readHash, []);
  const [state, setState] = useState(init.state);
  const [year, setYear] = useState(init.year);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const yearRef = useRef(year);
  yearRef.current = year;
  const set = (patch) => { setPlaying(false); setState((s) => normalize({ ...s, ...patch })); };
  const stop = () => setPlaying(false);
  const [d0, d1] = domainFor(state);
  const layers = useMemo(() => buildLayers(state), [state]);
  const events = eventsFor(state);
  const viewKey = `${state.subject}|${state.measure}|${state.unit}|${state.era}|${state.split}|${[...state.enabled].sort().join(',')}`;

  useEffect(() => { if (year < d0) setYear(d0); else if (year > d1) setYear(d1); }, [d0, d1]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setTimeout(() => history.replaceState(null, '', writeHash(state, year)), 150);
    return () => clearTimeout(id);
  }, [state, year]);

  // Play: sweep the span in ~9s, holding ~1s on each event (event-to-event steps if reduced motion).
  useEffect(() => {
    if (!playing) return undefined;
    const evYears = [...new Set(events.map((e) => e.year))].sort((a, b) => a - b);
    let pos = yearRef.current >= d1 ? d0 : yearRef.current;
    setYear(pos);
    if (reducedMotion()) {
      const id = setInterval(() => {
        const nx = evYears.find((y) => y > yearRef.current);
        if (nx == null) { setYear(d1); setPlaying(false); } else setYear(nx);
      }, 1500);
      return () => clearInterval(id);
    }
    const speed = (d1 - d0) / SWEEP_MS;
    let last = null, holdUntil = 0, shown = Math.floor(pos), raf;
    const step = (now) => {
      if (last == null) last = now;
      const dt = now - last;
      last = now;
      if (now >= holdUntil) {
        pos = Math.min(d1, pos + dt * speed);
        let yr = Math.floor(pos);
        for (let k = shown + 1; k <= yr; k++) {
          if (evYears.includes(k)) { yr = k; pos = k; holdUntil = now + HOLD_MS; break; }
        }
        if (yr !== shown) { shown = yr; setYear(yr); }
        if (pos >= d1 && now >= holdUntil) { setPlaying(false); return; }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, viewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { title, sub } = titlesFor(state);
  const notes = notesFor(state);
  const evYears = [...new Set(events.map((e) => e.year))];
  const prevY = [...evYears].reverse().find((y) => y < year);
  const nextY = evYears.find((y) => y > year);
  const short = (y) => ALL_EVENTS.find((e) => e.year === y)?.short;

  async function share() {
    const url = `${location.origin}${location.pathname}${writeHash(state, year)}`;
    try {
      if (navigator.share) await navigator.share({ title: `Haiti’s debt, ${year}`, text: title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  }

  return (
    <section className="card hero-card" aria-labelledby="chart-title">
      <div className="brand-bar" aria-hidden="true" />
      <h2 id="chart-title" className="chart-title">{title}</h2>
      <p className="subhead">{sub}</p>
      <Controls state={state} set={set} optionsOpen={optionsOpen} setOptionsOpen={setOptionsOpen} />
      <Legend state={state} set={set} />
      <MainChart state={state} viewKey={viewKey} year={year} onYear={setYear} onInteract={stop} />
      <Scrubber d0={d0} d1={d1} year={year} onYear={setYear} events={events} onInteract={stop} />
      <div className="controls">
        <button type="button" className="pill" onClick={() => { stop(); setYear(prevY); }} disabled={prevY == null}>
          ← {prevY ?? ''}<span className="ev-name"> {prevY != null && short(prevY)}</span>
        </button>
        <button type="button" className="pill is-on play" aria-pressed={playing} onClick={() => setPlaying(!playing)}>
          {playing ? <><span aria-hidden="true">❚❚</span> Pause</> : <><span aria-hidden="true">▶</span> Play</>}
        </button>
        <button type="button" className="pill" onClick={() => { stop(); setYear(nextY); }} disabled={nextY == null}>
          {nextY ?? ''}<span className="ev-name"> {nextY != null && short(nextY)}</span> →
        </button>
        <button type="button" className="pill share" onClick={share}>
          {copied ? 'Link copied' : <><span className="share-long">Share this year</span><span className="share-short">Share</span></>}
        </button>
      </div>
      <YearNote state={state} layers={layers} year={year} />
      <SourceBlock ids={notes.ids} note={notes.note} />
    </section>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Shell page="explorer" hero={{
      kicker: 'Debt explorer · 1825–2024',
      title: 'Two centuries of Haiti’s debt',
      dek: 'France’s 1825 indemnity, the US loans that followed, and the foreign debt the World Bank has tracked since 1970.',
    }}>
      <Explorer />
    </Shell>
  </StrictMode>,
);
