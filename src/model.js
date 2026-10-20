// View model for the main chart: series, eras, measures, and everything derived
// from the current toggle state (layers, titles, notes, sources, annotations).
// Every number here comes from src/data/explorer.json (see data/SOURCES.md).
import data from './data/explorer.json';
import { pct } from './format.js';

// Gourmet Data chart palette, copied from /workspace/email-charts/gd_chart.py (C = dict(...))
// plus the tints added in /workspace/haiti-debt/hd_render_cmp.py.
export const PAL = {
  paper: '#F6F1EF', ink: '#2A2522', brand: '#E08484', story: '#7E3B35',
  context: '#C9ADA7', context2: '#8C97A8', muted: '#6B625D', grid: '#E3DAD6', hairline: '#D9CFCB',
  contextLt: '#E4D3CF', context2Lt: '#C4CBD6', storyLt: '#C79F9A',
};

export const ERAS = {
  full: { label: 'Full span', sub: '1825–2024', domain: [1825, 2024] },
  hist: { label: '1825–1947', sub: 'Double debt', domain: [1825, 1947] },
  modern: { label: '1970–2024', sub: 'Modern', domain: [1970, 2024] },
};
export const MEASURES = {
  raw: { label: 'Amount owed', payLabel: 'Amount paid' },
  pct: { label: '% of GDP', payLabel: '% of GDP' },
  mix: { label: 'Breakdown (100%)', payLabel: 'Breakdown (100%)' },
};
export const SUBJECTS = { debt: 'Debt owed', pay: 'Payments made' };

const HIST_END = 1915; // Henochsberg GDP / debt estimates end
const PAY_END = data.stats.lastPayYear; // 1888
const MOD_START = data.stats.modernFirstYear; // 1970
const MOD_END = data.stats.modernLastYear; // 2024

// Order = stacking order, bottom to top (matches the reference creditor chart).
export const SERIES = {
  dd: { seg: 'hist', subject: 'debt', kind: 'line', color: PAL.context2, label: 'Double debt (NYT)', long: 'Double debt still owed: indemnity + 1825 loan (NYT)', src: ['nyt_data'] },
  ext: { seg: 'hist', subject: 'debt', kind: 'line', fill: true, color: PAL.story, label: 'All external debt, est.', long: 'All external debt, estimate read off Henochsberg’s chart', src: ['henochsberg'] },
  ven: { seg: 'modern', subject: 'debt', kind: 'area', color: PAL.story, text: PAL.paper, label: 'Venezuela', long: 'Venezuela (PetroCaribe oil credit)', src: ['wb_ids'] },
  mlt: { seg: 'modern', subject: 'debt', kind: 'area', color: PAL.context, text: PAL.ink, label: 'Multilateral banks', long: 'Multilateral banks (IDB, World Bank IDA, others)', src: ['wb_ids'] },
  imf: { seg: 'modern', subject: 'debt', kind: 'area', color: PAL.contextLt, text: PAL.ink, label: 'IMF', long: 'IMF loans and SDR allocations', src: ['wb_ids'] },
  oth: { seg: 'modern', subject: 'debt', kind: 'area', color: PAL.context2, text: PAL.paper, label: 'Other governments', long: 'Other governments (bilateral, excluding Venezuela)', src: ['wb_ids'] },
  prv: { seg: 'modern', subject: 'debt', kind: 'area', color: PAL.context2Lt, text: PAL.ink, label: 'Private and short-term', long: 'Private lenders and short-term debt', src: ['wb_ids'] },
  ind: { seg: 'hist', subject: 'pay', kind: 'bar', color: PAL.story, text: PAL.paper, label: 'Indemnity', long: 'Indemnity payments to France', src: ['nyt_data'] },
  loan: { seg: 'hist', subject: 'pay', kind: 'bar', color: PAL.context, text: PAL.ink, label: '1825 loan', long: '1825 loan: principal and interest (the NYT does not split them)', src: ['nyt_data'] },
  fees: { seg: 'hist', subject: 'pay', kind: 'bar', color: PAL.context2, text: PAL.paper, label: 'Late fees', long: 'Late fees on arrears (from 1873)', src: ['nyt_data'] },
};
export const CREDITORS = ['ven', 'mlt', 'imf', 'oth', 'prv'];
export const PAY_CATS = ['ind', 'loan', 'fees'];
export const HIST_LINES = ['dd', 'ext'];
export const ALL_ON = Object.keys(SERIES);

const histRow = new Map(data.years.map((d) => [d.year, d]));
const modRow = new Map(data.modern.map((d) => [d.year, d]));
const PAY_KEY = { ind: 'payIndemnityFr', loan: 'payLoanFr', fees: 'payLateFeesFr' };

/** Raw value of one series in one year, in the measure's unit (mix is handled by the caller). */
function rawValue(id, year, measure) {
  const s = SERIES[id];
  if (s.seg === 'hist') {
    const d = histRow.get(year);
    if (!d) return null;
    if (id === 'dd') return measure === 'pct' ? d.owedPctGdp : d.owedFr != null ? d.owedFr / 1e6 : null;
    if (id === 'ext') return measure === 'pct' ? d.extDebtPctGdp : d.extDebtFr != null ? d.extDebtFr / 1e6 : null;
    const fr = d[PAY_KEY[id]];
    if (fr == null) return null;
    if (measure === 'pct') return d.gdpUsd && d.fx ? (fr / d.fx / d.gdpUsd) * 100 : null;
    return fr / 1e6;
  }
  const d = modRow.get(year);
  if (!d) return null;
  const v = d.cred[id];
  return measure === 'pct' ? (v / d.gdpUsdM) * 100 : v;
}

/** Which segments (data eras) are visible for a state. */
export function segmentsFor({ subject, era }) {
  const [d0, d1] = ERAS[subject === 'pay' ? 'hist' : era].domain;
  const out = [];
  const histEnd = subject === 'pay' ? PAY_END : HIST_END;
  if (d0 <= histEnd) out.push({ id: 'hist', x0: Math.max(d0, 1825), x1: Math.min(d1, histEnd) });
  if (subject === 'debt' && d1 >= MOD_START) out.push({ id: 'modern', x0: Math.max(d0, MOD_START), x1: Math.min(d1, MOD_END) });
  return out;
}

export function domainFor({ subject, era }) {
  return ERAS[subject === 'pay' ? 'hist' : era].domain;
}

/** Shaded no-data bands for the current view. */
export function gapsFor({ subject, era, measure }) {
  const [d0, d1] = domainFor({ subject, era });
  if (subject === 'pay') return [{ x0: PAY_END + 1, x1: d1, lines: ['Double debt paid', 'off in 1888. No', 'annual payment', 'series after that'], soft: true }];
  const out = [];
  const g0 = HIST_END + 1, g1 = Math.min(d1, MOD_START - 1);
  if (d1 > HIST_END && d0 < MOD_START) {
    out.push({ x0: Math.max(d0, g0), x1: g1, lines: measure === 'pct' ? ['No GDP', 'estimates,', `${g0}–${g1}`] : ['No annual', 'debt series,', `${g0}–${g1}`] });
  }
  if (measure === 'mix' && d0 < MOD_START) {
    out.unshift({ x0: d0, x1: Math.min(HIST_END, d1), lines: ['No creditor split', 'before 1970. Switch to', '“Payments made” for', 'the 1826–1888 split'], soft: true, wide: true });
  }
  return out;
}

/** Series offered as checkboxes for the current view. */
export function checkboxGroups({ subject, era, measure }) {
  const segs = segmentsFor({ subject, era }).map((s) => s.id);
  if (subject === 'pay') return [{ title: 'What each payment went to, 1826–1888', ids: PAY_CATS }];
  const g = [];
  if (segs.includes('hist') && measure !== 'mix') g.push({ title: '1825–1915', ids: HIST_LINES });
  if (segs.includes('modern')) g.push({ title: 'Creditors, 1970–2024', ids: CREDITORS });
  return g;
}

/**
 * Build layers: [{ id, seg, kind, points: [{year, v0, v1} | {year, v1:null}] }].
 * Unchecked stack members stay in the stack with zero height so transitions are smooth.
 */
export function buildLayers(state) {
  const { subject, measure, enabled, era } = state;
  const segs = segmentsFor(state);
  const layers = [];
  for (const seg of segs) {
    const years = [];
    for (let y = seg.x0; y <= seg.x1; y++) years.push(y);
    if (subject === 'debt' && seg.id === 'hist') {
      if (measure === 'mix') continue;
      for (const id of HIST_LINES) {
        if (!enabled.has(id)) continue;
        layers.push({ id, seg: seg.id, kind: 'line', points: years.map((y) => ({ year: y, v0: null, v1: rawValue(id, y, measure) })) });
      }
      continue;
    }
    const ids = subject === 'pay' ? PAY_CATS : CREDITORS;
    const acc = new Map(years.map((y) => [y, 0]));
    const totals = new Map(years.map((y) => [y, ids.filter((id) => enabled.has(id)).reduce((a, id) => a + (rawValue(id, y, 'raw') || 0), 0)]));
    for (const id of ids) {
      const on = enabled.has(id);
      layers.push({
        id, seg: seg.id, kind: SERIES[id].kind, on,
        points: years.map((y) => {
          let v = on ? rawValue(id, y, measure === 'mix' ? 'raw' : measure) || 0 : 0;
          if (measure === 'mix') {
            const t = totals.get(y);
            if (!t) return { year: y, v0: null, v1: null };
            v = (v / t) * 100;
          }
          const v0 = acc.get(y);
          acc.set(y, v0 + v);
          return { year: y, v0, v1: v0 + v, value: v };
        }),
      });
    }
  }
  return layers;
}

/** y-axis setup: shared scale unless raw amounts span both eras (francs vs US$). */
export function axesFor(state, layers) {
  const segs = segmentsFor(state);
  const max = (seg) => Math.max(0, ...layers.filter((l) => !seg || l.seg === seg).flatMap((l) => l.points.map((p) => p.v1 ?? 0)));
  const unitOf = (seg) => (state.measure === 'pct' ? '%' : state.measure === 'mix' ? '%' : seg === 'hist' ? 'M francs' : 'M US$');
  if (state.measure === 'mix') return { split: false, scales: { all: { max: 100, unit: '%' } } };
  if (state.measure === 'raw' && segs.length === 2) {
    return { split: true, scales: { hist: { max: max('hist'), unit: unitOf('hist') }, modern: { max: max('modern'), unit: unitOf('modern') } } };
  }
  return { split: false, scales: { all: { max: max(), unit: unitOf(segs[0]?.id) } } };
}

export function formatValue(v, measure, seg) {
  if (v == null) return '—';
  if (measure !== 'raw') return pct(v);
  if (seg === 'hist') return v >= 1 ? `${v >= 100 ? Math.round(v) : v.toFixed(1)}M francs` : `${Math.round(v * 1000).toLocaleString('en-US')} thousand francs`;
  return v >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${v >= 100 ? Math.round(v) : v.toFixed(1)}M`;
}

const S = data.stats;
const F = data.facts;
const share = (n) => Math.round(n * 100);

/** Headline + subhead for the current view (all numbers computed from data). */
export function titlesFor(state) {
  const t = baseTitles(state);
  const off = CREDITORS.filter((id) => !state.enabled.has(id));
  if (state.subject === 'debt' && state.measure !== 'mix' && state.era !== 'hist' && off.length) {
    t.sub += `. Not shown: ${off.map((id) => SERIES[id].label).join(', ')}`;
  }
  return t;
}

function baseTitles(state) {
  const { subject, measure, era, enabled } = state;
  const partial = (ids) => ids.some((id) => !enabled.has(id));
  if (subject === 'pay') {
    const sub = {
      raw: 'Payments on the double debt each year, in millions of francs (not adjusted for inflation), 1826–1888',
      pct: 'Payments on the double debt each year, as a % of Haiti’s GDP, 1826–1888',
      mix: 'Share of each year’s payment by what it paid for, 1826–1888',
    }[measure] + (partial(PAY_CATS) ? '. Unchecked categories are left out' : '');
    const t = S.payByCategory;
    const all = t.indemnity + t.loan + t.lateFees;
    return {
      title: {
        raw: `Haiti paid about ${Math.round(S.totalPaidFr / 1e6)} million francs over ${S.lastPayYear - S.firstPayYear + 1} years`,
        pct: `In its worst year, ${S.peakPayYear}, Haiti paid ${S.peakPayPct.toFixed(1)}% of its economy on the double debt`,
        mix: `About ${share(t.indemnity / all)}% of what Haiti paid went to the indemnity itself`,
      }[measure],
      sub,
    };
  }
  const mod = data.modern;
  const last = mod.at(-1);
  const drop = Math.round((1 - last.debtUsdM / S.modernPeakUsd.usdM) * 100);
  const peakB = (S.modernPeakUsd.usdM / 1000).toFixed(1);
  if (measure === 'mix') {
    return {
      title: enabled.has('ven') ? `For ${S.venOverHalf.n} years, more than half of Haiti’s foreign debt was owed to Venezuela` : `Who Haiti’s foreign debt was owed to, ${MOD_START}–${MOD_END}`,
      sub: `Share of Haiti’s external debt owed to each type of creditor, ${MOD_START}–${MOD_END}${partial(CREDITORS) ? '. Shares are of the checked creditors only' : ''}`,
    };
  }
  if (measure === 'pct') {
    if (era === 'modern') return { title: `Haiti’s foreign debt peaked at ${Math.round(S.modernPeakPct.pct)}% of GDP in ${S.modernPeakPct.year}, far below its 19th-century burden`, sub: `External debt owed to each type of creditor, as a % of Haiti’s GDP, ${MOD_START}–${MOD_END}` };
    return {
      title: 'Haiti’s debt burden was heaviest at its birth, about three times its economy',
      sub: era === 'hist'
        ? 'Outstanding debt as a % of Haiti’s GDP, 1825–1915. Shaded years have no estimate'
        : 'Outstanding external debt as a % of Haiti’s GDP, 1825–1915 and 1970–2024. Shaded years have no estimate',
    };
  }
  if (era === 'hist') return { title: `France’s 1825 bill was ${F.indemnity_1825_francs.value / 1e6} million francs, and Haiti borrowed ${F.loan_1825_francs.value / 1e6} million more to start paying`, sub: 'Debt still owed, in millions of francs (not adjusted for inflation), 1825–1915' };
  if (era === 'modern') return { title: `Haiti’s foreign debt reached $${peakB} billion in ${S.modernPeakUsd.year}, then fell ${drop}% in a year`, sub: `External debt owed to each type of creditor, in millions of current US$, ${MOD_START}–${MOD_END}` };
  return {
    title: `From ${F.indemnity_1825_francs.value / 1e6} million francs in 1825 to $${peakB} billion in ${S.modernPeakUsd.year}`,
    sub: 'Debt still owed: millions of francs for 1825–1915 (left axis) and millions of current US$ for 1970–2024 (right axis). Two different units, not adjusted for inflation',
  };
}

/** Source ids + note for the footer block under the chart. */
export function notesFor(state) {
  const segs = segmentsFor(state).map((s) => s.id);
  const ids = new Set();
  let note = [];
  if (state.subject === 'pay') {
    ids.add('nyt_data'); ids.add('nyt_readme');
    if (state.measure === 'pct') ids.add('henochsberg');
    note.push('Payments are what Haiti paid from its own revenue; the first 24M francs of the indemnity came from the 1825 loan and are counted through the loan repayments. The NYT combines the loan’s principal and interest. Late fees began after the 1870 agreement.');
    if (state.measure === 'pct') note.push('% of GDP = francs ÷ franc-per-dollar rate ÷ Henochsberg’s GDP estimate.');
  } else {
    if (segs.includes('hist') && state.measure !== 'mix') {
      ids.add('nyt_data'); ids.add('henochsberg');
      note.push('1825–1915: the NYT’s double debt (to 1888) and Henochsberg’s all-external-debt estimate (read off his chart, ±1M francs)' + (state.measure === 'pct' ? ' ÷ his GDP estimate.' : '.'));
    }
    if (segs.includes('modern')) {
      ids.add('wb_ids'); if (state.measure === 'pct') ids.add('wb_wdi');
      note.push(`1970–2024: World Bank IDS creditor stocks${state.measure === 'pct' ? ' ÷ WDI GDP (current US$)' : ''}. IMF includes SDR allocations. “Other governments”: bilateral excluding Venezuela. Private = PPG private + private nonguaranteed + short-term.`);
    }
    if (segs.length === 2) note.push('Different sources; no line across the gap.');
  }
  return { ids: [...ids], note: note.join(' ') };
}

// Annotations: value labels (bold) and italic notes with a leader arrow.
// at = [year, value] for the text anchor, in the same segment's units.
export function annotationsFor(state, layers, narrow = false) {
  const { subject, measure, enabled, era } = state;
  const segs = segmentsFor(state).map((s) => s.id);
  const out = [];
  const top = (seg, y) => {
    const ls = layers.filter((l) => l.seg === seg);
    return Math.max(0, ...ls.map((l) => l.points.find((p) => p.year === y)?.v1 ?? 0));
  };
  const peakOf = (seg, y0, y1) => {
    let best = { y: null, v: -1 };
    for (let y = y0; y <= y1; y++) { const v = top(seg, y); if (v > best.v) best = { y, v }; }
    return best;
  };
  if (subject === 'pay') {
    if (measure === 'mix') {
      if (enabled.has('fees')) out.push({ kind: 'note', seg: 'hist', year: 1878, v: 88, at: [1892, 93], anchor: 'start', lines: ['Late fees start', 'after 1870'] });
      return out;
    }
    const pk = peakOf('hist', 1826, PAY_END);
    if (pk.y) out.push({ kind: 'value', seg: 'hist', year: pk.y, v: pk.v, text: formatValue(pk.v, measure, 'hist'), dx: 6 });
    if (top('hist', 1826) > 0) out.push({ kind: 'note', seg: 'hist', year: 1826, v: top('hist', 1826), at: [1850, pk.v * 1.2], anchor: 'start', lines: ['1826: Haiti empties its', 'treasury to pay France'] });
    return out;
  }
  if (segs.includes('hist') && measure !== 'mix') {
    const lineId = enabled.has('ext') ? 'ext' : enabled.has('dd') ? 'dd' : null;
    if (lineId) {
      const l = layers.find((x) => x.id === lineId);
      const at = (y) => l.points.find((p) => p.year === y)?.v1;
      const pk = l.points.reduce((a, p) => ((p.v1 ?? -1) > (a.v1 ?? -1) ? p : a));
      out.push({ kind: 'value', seg: 'hist', year: pk.year, v: pk.v1, text: formatValue(pk.v1, measure, 'hist'), dx: 8 });
      if (measure === 'pct') {
        out.push({ kind: 'note', seg: 'hist', year: 1838, v: at(1838), at: [1846, 255], anchor: 'start', lines: ['1838: France cuts its', 'demand, and the burden', 'nearly halves'] });
      } else {
        out.push({ kind: 'note', seg: 'hist', year: 1838, v: at(1838), at: [1848, pk.v1 * 0.86], anchor: 'start', lines: ['1838: France cuts the', 'indemnity to 90M francs'] });
      }
    }
  }
  if (segs.includes('modern') && measure !== 'mix' && CREDITORS.some((id) => enabled.has(id))) {
    const pk = peakOf('modern', MOD_START, MOD_END);
    out.push({ kind: 'value', seg: 'modern', year: pk.y, v: pk.v, text: formatValue(pk.v, measure, 'modern'), dx: 0, above: true });
    // On a phone the full-span raw view has no room for a second note beside the 1838 one.
    // Full span: on % of GDP the modern band is too short for a note beside its peak label;
    // on a phone the raw view has no room for it beside the 1838 note.
    if (enabled.has('ven') && !(segs.length > 1 && (measure === 'pct' || narrow))) {
      out.push({ kind: 'note', seg: 'modern', year: MOD_END, v: top('modern', MOD_END), at: measure === 'raw' ? [era === 'full' ? 2004 : 2015, pk.v * (era === 'full' ? 0.8 : 0.9)] : [2016, Math.max(pk.v * 1.08, top('modern', 2016) * 1.25)], anchor: 'end', lines: ['2024: Venezuela', `forgives $${(F.petrocaribe_2024_forgiven_usd.value / 1e9).toFixed(2)}B`] });
    }
  }
  return out;
}

/** Events shown as markers for the current domain. Full span on narrow screens shows only key ones. */
const KEY_EVENTS = new Set([1825, 1838, 1888, 1915, 1947, 2009, 2024]);
export function eventsFor(state, narrow) {
  const [d0, d1] = domainFor(state);
  const all = [...data.events, ...data.modernEvents].filter((e) => e.year >= d0 && e.year <= d1);
  return state.era === 'full' && state.subject === 'debt' ? all.filter((e) => !narrow || KEY_EVENTS.has(e.year)) : all;
}
