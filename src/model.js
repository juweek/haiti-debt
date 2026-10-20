// View model for the main chart (v3 spec): series, eras, measures, units, the split,
// and everything derived from the current state (layers, bands, titles, notes, labels).
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
  full: { label: 'Full span', domain: [1825, 2024] },
  hist: { label: '1825–1947', domain: [1825, 1947] },
  modern: { label: '1970–2024', domain: [1970, 2024] },
};
export const MEASURES = { raw: 'Amount', pct: '% of GDP', share: 'Share' };
export const UNITS = { fr: 'Francs', usd: 'US$' };
export const SUBJECTS = { debt: 'Debt owed', pay: 'Payments made' };

const HIST_END = 1915; // Henochsberg GDP / debt estimates end
const RECV = [1915, 1927]; // receivership gross public debt, US$
const PAY_END = data.stats.lastPayYear; // 1888
const MOD_START = data.stats.modernFirstYear; // 1970
const MOD_END = data.stats.modernLastYear; // 2024

// Order = stacking order, bottom to top (matches the reference creditor chart).
export const SERIES = {
  ext: { seg: 'hist', kind: 'line', color: PAL.story, label: 'All external debt, est.', long: 'All external debt, estimate read off Henochsberg’s chart', src: ['henochsberg'] },
  recv: { seg: 'recv', kind: 'line', color: PAL.story, label: 'Gross public debt', long: 'Gross public debt (internal and external) under the US receivership, Sept. 30', src: ['receiver_1927'] },
  tot: { seg: 'modern', kind: 'line', color: PAL.story, label: 'External debt, total', long: 'Total external debt stocks (World Bank)', src: ['wb_ids'] },
  ven: { seg: 'modern', kind: 'area', color: PAL.story, text: PAL.paper, label: 'Venezuela', long: 'Venezuela (PetroCaribe oil credit)', src: ['wb_ids'] },
  mlt: { seg: 'modern', kind: 'area', color: PAL.context, text: PAL.ink, label: 'Multilateral banks', long: 'Multilateral banks (IDB, World Bank IDA, others)', src: ['wb_ids'] },
  imf: { seg: 'modern', kind: 'area', color: PAL.contextLt, text: PAL.ink, label: 'IMF', long: 'IMF loans and SDR allocations', src: ['wb_ids'] },
  oth: { seg: 'modern', kind: 'area', color: PAL.context2, text: PAL.paper, label: 'Other governments', long: 'Other governments (bilateral, excluding Venezuela)', src: ['wb_ids'] },
  prv: { seg: 'modern', kind: 'area', color: PAL.context2Lt, text: PAL.ink, label: 'Private and short-term', long: 'Private lenders and short-term debt', src: ['wb_ids'] },
  ind: { seg: 'pay', kind: 'bar', color: PAL.story, text: PAL.paper, label: 'Indemnity', long: 'Indemnity payments to France', src: ['nyt_data'] },
  loan: { seg: 'pay', kind: 'bar', color: PAL.context, text: PAL.ink, label: '1825 loan', long: '1825 loan: principal and interest (the NYT does not split them)', src: ['nyt_data'] },
  fees: { seg: 'pay', kind: 'bar', color: PAL.context2, text: PAL.paper, label: 'Late fees', long: 'Late fees on arrears (from 1873)', src: ['nyt_data'] },
};
export const CREDITORS = ['ven', 'mlt', 'imf', 'oth', 'prv'];
export const PAY_CATS = ['ind', 'loan', 'fees'];
export const SPLITTABLE = [...CREDITORS, ...PAY_CATS];

const histRow = new Map(data.years.map((d) => [d.year, d]));
const modRow = new Map(data.modern.map((d) => [d.year, d]));
const PAY_KEY = { ind: 'payIndemnityFr', loan: 'payLoanFr', fees: 'payLateFeesFr' };

/** Normalize a state so impossible combinations can't happen. */
export function normalize(s) {
  const n = { ...s };
  if (n.subject === 'pay') { n.era = 'hist'; n.unit = 'fr'; }
  if (n.measure === 'share') n.split = true;
  if (n.subject === 'debt' && n.measure === 'share' && n.era === 'hist') n.era = 'modern';
  if (n.subject === 'debt' && n.measure === 'raw' && n.unit === 'fr' && n.era === 'modern') n.unit = 'usd';
  return n;
}

/** Value of one series in one year, in the measure's unit (share is handled by the caller). */
function rawValue(id, year, measure) {
  if (id === 'ext') {
    const d = histRow.get(year);
    if (!d) return null;
    return measure === 'pct' ? d.extDebtPctGdp : d.extDebtFr != null ? d.extDebtFr / 1e6 : null;
  }
  if (id === 'recv') return histRow.get(year)?.pubDebtUsdM ?? null;
  if (PAY_KEY[id]) {
    const d = histRow.get(year);
    const fr = d?.[PAY_KEY[id]];
    if (fr == null) return null;
    if (measure === 'pct') return d.gdpUsd && d.fx ? (fr / d.fx / d.gdpUsd) * 100 : null;
    return fr / 1e6;
  }
  const d = modRow.get(year);
  if (!d) return null;
  const v = d.cred[id];
  return measure === 'pct' ? (v / d.gdpUsdM) * 100 : v;
}

export function domainFor({ subject, era }) {
  return ERAS[subject === 'pay' ? 'hist' : era].domain;
}

/** Data segments drawn for a state, clipped to the domain. */
export function segmentsFor(state) {
  const { subject, measure, unit } = state;
  const [d0, d1] = domainFor(state);
  const want = [];
  if (subject === 'pay') want.push({ id: 'pay', x0: 1825, x1: PAY_END });
  else if (measure === 'pct') want.push({ id: 'hist', x0: 1825, x1: HIST_END }, { id: 'modern', x0: MOD_START, x1: MOD_END });
  else if (measure === 'share') want.push({ id: 'modern', x0: MOD_START, x1: MOD_END });
  else if (unit === 'fr') want.push({ id: 'hist', x0: 1825, x1: HIST_END });
  else want.push({ id: 'recv', x0: RECV[0], x1: RECV[1] }, { id: 'modern', x0: MOD_START, x1: MOD_END });
  return want.map((s) => ({ ...s, x0: Math.max(s.x0, d0), x1: Math.min(s.x1, d1) })).filter((s) => s.x1 >= s.x0);
}

/** Shaded bands: hard = no data at all; soft = data exists in the other unit / view. */
export function bandsFor(state) {
  const { subject, measure, unit } = state;
  const [d0, d1] = domainFor(state);
  const out = [];
  const add = (x0, x1, lines, soft = false, hint = null) => {
    const a = Math.max(x0, d0), b = Math.min(x1, d1);
    if (b >= a) out.push({ x0: a, x1: b, lines, soft, hint });
  };
  if (subject === 'pay') {
    add(PAY_END + 1, 1947, ['Double debt paid', 'off in 1888. No', 'payment series', 'after that'], true);
    return out;
  }
  if (measure === 'pct') add(HIST_END + 1, MOD_START - 1, ['No GDP', 'estimates']);
  else if (measure === 'share') add(1825, MOD_START - 1, ['No creditor', 'split before', '1970'], true);
  else if (unit === 'fr') {
    add(HIST_END + 1, RECV[1], [], true, 'usd');
    add(RECV[1] + 1, MOD_START - 1, ['No annual', 'debt series']);
    add(MOD_START, MOD_END, ['Recorded in US$.', 'Switch unit', 'to see it'], true, 'usd');
  } else {
    add(1825, RECV[0] - 1, ['Recorded in', 'francs. Switch', 'unit to see it'], true, 'fr');
    add(RECV[1] + 1, MOD_START - 1, ['No annual', 'debt series']);
  }
  return out;
}

/**
 * Layers: [{ id, seg, kind, on, points: [{year, v0, v1, value}] }].
 * Unsplit views still build the stacked members (all on) so the split can morph them.
 * Unchecked members stay in the stack with zero height so transitions are smooth.
 */
export function buildLayers(state) {
  const { measure, enabled, split } = state;
  const layers = [];
  for (const seg of segmentsFor(state)) {
    const years = [];
    for (let y = seg.x0; y <= seg.x1; y++) years.push(y);
    if (seg.id === 'hist' || seg.id === 'recv') {
      const id = seg.id === 'hist' ? 'ext' : 'recv';
      layers.push({ id, seg: seg.id, kind: 'line', on: true, points: years.map((y) => ({ year: y, v0: null, v1: rawValue(id, y, measure), value: rawValue(id, y, measure) })) });
      continue;
    }
    const ids = seg.id === 'pay' ? PAY_CATS : CREDITORS;
    const isOn = (id) => !split || enabled.has(id);
    const base = measure === 'share' ? 'raw' : measure;
    const totals = new Map(years.map((y) => [y, ids.filter(isOn).reduce((a, id) => a + (rawValue(id, y, base) || 0), 0)]));
    const acc = new Map(years.map((y) => [y, 0]));
    for (const id of ids) {
      const on = isOn(id);
      layers.push({
        id, seg: seg.id, kind: SERIES[id].kind, on,
        points: years.map((y) => {
          const raw = rawValue(id, y, base);
          if (seg.id === 'modern' && !modRow.get(y)) return { year: y, v0: null, v1: null };
          let v = on ? raw || 0 : 0;
          if (measure === 'share') {
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
    if (seg.id === 'modern') {
      layers.push({ id: 'tot', seg: 'modern', kind: 'line', on: !split, points: years.map((y) => ({ year: y, v0: null, v1: modRow.get(y) ? acc.get(y) : null, value: modRow.get(y) ? acc.get(y) : null })) });
    }
  }
  return layers;
}

export function unitLabel(state) {
  if (state.measure !== 'raw') return '%';
  return state.unit === 'fr' ? 'M francs' : 'M US$';
}

export function formatValue(v, state) {
  if (v == null) return '—';
  if (state.measure !== 'raw') return pct(v);
  if (state.unit === 'fr') return v >= 1 ? `${v >= 100 ? Math.round(v) : v.toFixed(1)}M francs` : `${Math.round(v * 1000).toLocaleString('en-US')} thousand francs`;
  return v >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${v >= 100 ? Math.round(v) : v.toFixed(1)}M`;
}

const S = data.stats;
const F = data.facts;
const share = (n) => Math.round(n * 100);
const recvPeak = data.years.filter((d) => d.pubDebtUsdM != null).reduce((a, d) => (d.pubDebtUsdM > a.pubDebtUsdM ? d : a));
const recvLast = data.years.filter((d) => d.pubDebtUsdM != null).at(-1);

/** Legend key text for the unsplit view. */
export function keyLabel(state) {
  if (state.subject === 'pay') return state.measure === 'pct' ? 'Payments made, % of GDP' : state.measure === 'share' ? 'Payments made, share' : 'Payments made, millions of francs';
  if (state.measure === 'pct') return 'Debt owed, % of GDP';
  if (state.measure === 'share') return 'Debt owed, share';
  return state.unit === 'fr' ? 'Debt owed, millions of francs' : 'Debt owed, millions of US$';
}

/** Headline + subhead for the current view (all numbers computed from data). */
export function titlesFor(state) {
  const t = baseTitles(state);
  const ids = state.subject === 'pay' ? PAY_CATS : CREDITORS;
  const off = ids.filter((id) => !state.enabled.has(id));
  const drawsSplit = state.split && segmentsFor(state).some((s) => s.id === 'modern' || s.id === 'pay');
  if (drawsSplit && off.length && state.measure !== 'share') t.sub += `. Not shown: ${off.map((id) => SERIES[id].label).join(', ')}`;
  if (drawsSplit && off.length && state.measure === 'share') t.sub += state.subject === 'pay' ? '. Shares are of the categories shown' : '. Shares are of the creditors shown';
  return t;
}

function baseTitles(state) {
  const { subject, measure, era, enabled, split, unit } = state;
  if (subject === 'pay') {
    const t = S.payByCategory;
    const all = t.indemnity + t.loan + t.lateFees;
    const by = split ? ', by what it paid for' : '';
    return {
      title: {
        raw: `Haiti paid about ${Math.round(S.totalPaidFr / 1e6)} million francs over ${S.lastPayYear - S.firstPayYear + 1} years`,
        pct: `In its worst year, ${S.peakPayYear}, Haiti paid ${S.peakPayPct.toFixed(1)}% of its economy on the double debt`,
        share: `About ${share(t.indemnity / all)}% of what Haiti paid went to the indemnity itself`,
      }[measure],
      sub: {
        raw: `Payments on the double debt each year${by}, in millions of francs (not adjusted for inflation), 1826–1888`,
        pct: `Payments on the double debt each year${by}, as a % of Haiti’s GDP, 1826–1888`,
        share: 'Share of each year’s payment by what it paid for, 1826–1888',
      }[measure],
    };
  }
  const last = data.modern.at(-1);
  const drop = Math.round((1 - last.debtUsdM / S.modernPeakUsd.usdM) * 100);
  const peakB = (S.modernPeakUsd.usdM / 1000).toFixed(1);
  const owed = split ? 'External debt owed to each type of creditor' : 'External debt';
  if (measure === 'share') {
    return {
      title: enabled.has('ven') ? `For ${S.venOverHalf.n} years, more than half of Haiti’s foreign debt was owed to Venezuela` : `Who Haiti’s foreign debt was owed to, ${MOD_START}–${MOD_END}`,
      sub: `Share of Haiti’s external debt owed to each type of creditor, ${MOD_START}–${MOD_END}`,
    };
  }
  if (measure === 'pct') {
    if (era === 'modern') return { title: `Haiti’s foreign debt peaked at ${Math.round(S.modernPeakPct.pct)}% of GDP in ${S.modernPeakPct.year}, far below its 19th-century burden`, sub: `${owed} as a % of Haiti’s GDP, ${MOD_START}–${MOD_END}` };
    return {
      title: 'Haiti’s debt burden was heaviest at its birth, about three times its economy',
      sub: era === 'hist'
        ? 'Outstanding external debt as a % of Haiti’s GDP, 1825–1915. Shaded years have no estimate'
        : 'Outstanding external debt as a % of Haiti’s GDP, 1825–1915 and 1970–2024. Shaded years have no estimate',
    };
  }
  if (unit === 'fr') {
    return {
      title: `France’s 1825 bill was ${F.indemnity_1825_francs.value / 1e6} million francs, and Haiti borrowed ${F.loan_1825_francs.value / 1e6} million more to start paying`,
      sub: 'All external debt (estimate), in millions of francs (not adjusted for inflation), 1825–1915. Later years were recorded in US dollars',
    };
  }
  if (era === 'hist') {
    return {
      title: `Under the US receivership, Haiti’s public debt peaked at $${recvPeak.pubDebtUsdM.toFixed(1)} million in ${recvPeak.year}`,
      sub: `Gross public debt (internal and external) on Sept. 30 each year, in millions of US$, ${RECV[0]}–${RECV[1]}. Earlier years were recorded in francs`,
    };
  }
  if (era === 'modern') return { title: `Haiti’s foreign debt reached $${peakB} billion in ${S.modernPeakUsd.year}, then fell ${drop}% in a year`, sub: `${owed}, in millions of current US$, ${MOD_START}–${MOD_END}` };
  return {
    title: `Haiti’s foreign debt reached $${peakB} billion in ${S.modernPeakUsd.year}, then fell ${drop}% in a year`,
    sub: `In millions of current US$ (not adjusted for inflation): gross public debt under the US receivership, ${RECV[0]}–${RECV[1]} ($${recvLast.pubDebtUsdM.toFixed(1)}M in ${recvLast.year}), and external debt, ${MOD_START}–${MOD_END}. Earlier years were recorded in francs`,
  };
}

/** Source ids + note for the block under the chart. */
export function notesFor(state) {
  const segs = segmentsFor(state).map((s) => s.id);
  const ids = new Set();
  const note = [];
  if (state.subject === 'pay') {
    ids.add('nyt_data'); ids.add('nyt_readme');
    if (state.measure === 'pct') ids.add('henochsberg');
    note.push('Payments are what Haiti paid from its own revenue; the first 24M francs of the indemnity came from the 1825 loan and are counted through the loan repayments. The NYT combines the loan’s principal and interest. Late fees began after the 1870 agreement.');
    if (state.measure === 'pct') note.push('% of GDP = francs ÷ franc-per-dollar rate ÷ Henochsberg’s GDP estimate.');
  } else {
    if (segs.includes('hist')) {
      ids.add('henochsberg');
      note.push(`1825–1915: Henochsberg’s all-external-debt estimate (read off his chart, ±1M francs)${state.measure === 'pct' ? ' ÷ his GDP estimate' : ''}.`);
    }
    if (segs.includes('recv')) {
      ids.add('receiver_1927');
      note.push(`${RECV[0]}–${RECV[1]}: gross public debt (internal and external) on Sept. 30, from the receivership’s 1927 report, gourdes ÷ 5.`);
    }
    if (segs.includes('modern')) {
      ids.add('wb_ids'); if (state.measure === 'pct') ids.add('wb_wdi');
      note.push(`1970–2024: World Bank external debt${state.measure === 'pct' ? ' ÷ GDP (current US$)' : ''}.${state.split ? ' Creditor groups from IDS: IMF includes SDR allocations; “other governments” is bilateral excluding Venezuela; private = PPG private + private nonguaranteed + short-term.' : ''}`);
    }
    if (segs.length > 1) note.push('Different sources; no line across the gap.');
  }
  return { ids: [...ids], note: note.join(' ') };
}

/** Start and peak value labels for each drawn segment ({seg, year, v, text, kind}). */
export function valueLabels(state, layers) {
  if (state.measure === 'share') return [];
  const out = [];
  for (const seg of segmentsFor(state)) {
    const ls = layers.filter((l) => l.seg === seg.id && (l.kind !== 'line' || l.id === 'ext' || l.id === 'recv'));
    const topAt = (y) => Math.max(...ls.map((l) => l.points.find((p) => p.year === y)?.v1 ?? -Infinity));
    let pk = null, first = null;
    for (let y = seg.x0; y <= seg.x1; y++) {
      const v = topAt(y);
      if (!Number.isFinite(v) || v <= 0) continue;
      if (!first) first = { y, v };
      if (!pk || v > pk.v) pk = { y, v };
    }
    if (!pk) continue;
    out.push({ seg: seg.id, year: pk.y, v: pk.v, text: formatValue(pk.v, state), kind: 'peak' });
    if (first && first.y !== pk.y && seg.id !== 'pay') out.push({ seg: seg.id, year: first.y, v: first.v, text: formatValue(first.v, state), kind: 'start' });
  }
  return out;
}

/** Events in the current domain (for scrubber dots, prev/next, year notes and Play holds). */
export function eventsFor(state) {
  const [d0, d1] = domainFor(state);
  return [...data.events, ...data.modernEvents].filter((e) => e.year >= d0 && e.year <= d1).sort((a, b) => a.year - b.year);
}

/** Rows for the year note: what is drawn at that year. */
export function valuesAt(state, layers, year) {
  const rows = [];
  for (const l of layers) {
    const p = l.points.find((q) => q.year === year);
    if (!p || p.v1 == null) continue;
    const s = SERIES[l.id];
    if (l.kind === 'line') {
      if (l.id === 'tot' && state.split) continue;
      rows.push({ id: l.id, label: s.label, color: s.color, kind: 'line', value: formatValue(p.value, state), src: s.src });
      continue;
    }
    if (!state.split) continue;
    if (!l.on) continue;
    rows.push({ id: l.id, label: s.label, color: s.color, kind: l.kind, value: formatValue(p.value, state), src: s.src });
  }
  // unsplit payments: one total row
  if (state.subject === 'pay' && !state.split) {
    const tot = layers.filter((l) => l.seg === 'pay').reduce((a, l) => a + (l.points.find((q) => q.year === year)?.value ?? 0), 0);
    const any = layers.some((l) => l.seg === 'pay' && l.points.find((q) => q.year === year)?.v1 != null);
    if (any) rows.push({ id: 'paytot', label: 'Paid that year', color: PAL.story, kind: 'bar', value: formatValue(tot, state), src: ['nyt_data'] });
  }
  // split, not share: add the total
  if (state.split && state.measure !== 'share' && state.subject === 'debt') {
    const t = layers.find((l) => l.id === 'tot')?.points.find((q) => q.year === year);
    if (t?.v1 != null) rows.push({ id: 'total', label: CREDITORS.some((id) => !state.enabled.has(id)) ? 'Total shown' : 'Total', color: null, kind: 'total', value: formatValue(t.value, state), src: [] });
  }
  if (state.split && state.measure !== 'share' && state.subject === 'pay') {
    const ls = layers.filter((l) => l.seg === 'pay' && l.on);
    const any = ls.some((l) => l.points.find((q) => q.year === year)?.v1 != null);
    if (any) rows.push({ id: 'total', label: 'Total shown', color: null, kind: 'total', value: formatValue(ls.reduce((a, l) => a + (l.points.find((q) => q.year === year)?.value ?? 0), 0), state), src: [] });
  }
  return rows;
}
