#!/usr/bin/env node
// Rebuilds src/data/explorer.json from the raw sources in data/raw/.
//
//   npm run data:refresh            try to re-download NYT + World Bank first, then build
//   npm run data:refresh:offline    build from the vendored copies only
//
// Raw inputs (see data/SOURCES.md):
//   data/raw/nyt/haiti-double-debt.csv           NYT nytimes/haiti-debt (payments, double debt, GDP, fx, CPI)
//   data/raw/derived/longrun_1825_1927.csv       Henochsberg Fig.14 digitized (B) + receivership Table 52 (C)
//   data/raw/worldbank/wb_DT.DOD.DECT.CD.json    World Bank external debt stocks, current US$
//   data/raw/worldbank/wb_NY.GDP.MKTP.CD.json    World Bank GDP, current US$

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES, FACTS, EVENTS, MODERN_EVENTS } from './sources.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data/raw');
const OUT = join(ROOT, 'src/data/explorer.json');
const OFFLINE = process.argv.includes('--offline');

const REMOTE = {
  nyt: { url: 'https://raw.githubusercontent.com/nytimes/haiti-debt/main/haiti-double-debt.csv', path: 'nyt/haiti-double-debt.csv' },
  wbDebt: { url: 'https://api.worldbank.org/v2/country/HTI/indicator/DT.DOD.DECT.CD?format=json&per_page=100', path: 'worldbank/wb_DT.DOD.DECT.CD.json' },
  wbGdp: { url: 'https://api.worldbank.org/v2/country/HTI/indicator/NY.GDP.MKTP.CD?format=json&per_page=100', path: 'worldbank/wb_NY.GDP.MKTP.CD.json' },
};
// World Bank IDS creditor breakdown (source 6). key -> [series, counterpart area]
const IDS = {
  dect: ['DT.DOD.DECT.CD', 'WLD'], // total external debt stocks
  dimf: ['DT.DOD.DIMF.CD', 'WLD'], // use of IMF credit + SDR allocations
  mlat: ['DT.DOD.MLAT.CD', 'WLD'], // PPG multilateral
  blat: ['DT.DOD.BLAT.CD', 'WLD'], // PPG bilateral, all governments
  blat_ven: ['DT.DOD.BLAT.CD', '463'], // PPG bilateral owed to Venezuela
  prvt: ['DT.DOD.PRVT.CD', 'WLD'], // PPG private creditors
  dpng: ['DT.DOD.DPNG.CD', 'WLD'], // private nonguaranteed
  dstc: ['DT.DOD.DSTC.CD', 'WLD'], // short-term
};
for (const [k, [series, area]] of Object.entries(IDS)) {
  REMOTE[`ids_${k}`] = {
    url: `https://api.worldbank.org/v2/sources/6/country/HTI/series/${series}/counterpart-area/${area}/time/all?format=json&per_page=200`,
    path: `worldbank/ids/ids_${k}.json`,
  };
}

async function refresh(key) {
  const { url, path } = REMOTE[key];
  if (OFFLINE) return 'vendored';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (key !== 'nyt') {
      const j = JSON.parse(text); // validate before overwriting
      if (key.startsWith('ids_') && !j?.source?.data?.length) throw new Error('no IDS data in response');
    }
    if (text.length < 500) throw new Error('response too short');
    writeFileSync(join(RAW, path), text);
    console.log(`  ✓ downloaded ${key} from ${url}`);
    return 'downloaded';
  } catch (e) {
    console.warn(`  ! could not download ${key} (${e.message}); using vendored ${path}`);
    return 'vendored';
  }
}

// Minimal RFC-4180 CSV parser (quoted fields with commas).
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}
const num = (s) => (s === '' || s == null ? null : Number(String(s).replace(/,/g, '')));
const round = (v, d = 3) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function assertClose(name, got, want, tol) {
  if (Math.abs(got - want) > tol) throw new Error(`check failed: ${name} = ${got}, expected ≈ ${want} (±${tol}). Did a source change? Update explainer facts + SOURCES.md.`);
  console.log(`  ✓ ${name} = ${round(got, 3)} (expected ≈ ${want})`);
}

async function main() {
  console.log('Refreshing raw sources…');
  const status = {};
  for (const key of Object.keys(REMOTE)) status[key] = await refresh(key);

  // ---- NYT double debt, 1825–1915 (GDP to 1915; payments to 1888)
  const nyt = parseCSV(readFileSync(join(RAW, REMOTE.nyt.path), 'utf8'));
  const byYear = new Map(nyt.map((r) => [Number(r.YEAR), r]));
  const cpi2021 = num(byYear.get(2021)['CONSUMER-PRICE-INDEX-USD']);

  // ---- Henochsberg (B) + receivership (C)
  const longrun = parseCSV(readFileSync(join(RAW, 'derived/longrun_1825_1927.csv'), 'utf8'));
  const hen = new Map(), recv = new Map();
  for (const r of longrun) {
    const y = Number(r.year);
    if (r.series.startsWith('B_')) {
      const fr = /([\d.]+)m francs/.exec(r.table_or_series);
      hen.set(y, { pct: num(r.value_pct), francs: fr ? Number(fr[1]) * 1e6 : null, usdM: num(r.debt_usd_m) });
    } else if (r.series.startsWith('C_')) recv.set(y, { usdM: num(r.debt_usd_m) });
  }

  const years = [];
  for (let y = 1825; y <= 1947; y++) {
    const r = byYear.get(y) || {};
    const gdp = num(r['HAITI-HISTORICAL-GDP']);
    const fx = num(r['EXCHANGE-RATE-FRANC-TO-USD']);
    const pay = y <= 1888 ? num(r['PAYMENTS-DOUBLE-DEBT-FRANCS']) ?? 0 : null;
    const owed = y <= 1888 ? num(r['DOUBLE-DEBT-DRAWDOWN']) : null;
    const h = hen.get(y);
    years.push({
      year: y,
      gdpUsd: round(gdp, 0),
      fx,
      payFr: pay,
      payIndemnityFr: y <= 1888 ? num(r['PAYMENTS-INDEMNITY']) ?? 0 : null,
      payLoanFr: y <= 1888 ? num(r['PAYMENTS-PRINCIPAL-INTEREST-1825-LOAN']) ?? 0 : null,
      payLateFeesFr: y <= 1888 ? num(r['LATE-FEES']) ?? 0 : null,
      payUsd2021: y <= 1888 ? num(r['DOUBLE-DEBT-IN-2021-USD']) ?? 0 : null,
      payPctGdp: pay != null && gdp && fx ? round((pay / fx / gdp) * 100) : null,
      owedFr: owed,
      owedPctGdp: owed != null && gdp && fx ? round((owed / fx / gdp) * 100, 2) : null,
      extDebtFr: h?.francs ?? null,
      extDebtPctGdp: h?.pct ?? null,
      pubDebtUsdM: recv.get(y)?.usdM ?? null,
    });
  }

  // ---- World Bank, 1970–2024
  const wb = (p) => new Map(JSON.parse(readFileSync(join(RAW, p), 'utf8'))[1].filter((d) => d.value != null).map((d) => [Number(d.date), d.value]));
  const wbMeta = JSON.parse(readFileSync(join(RAW, REMOTE.wbDebt.path), 'utf8'))[0];
  const debt = wb(REMOTE.wbDebt.path), gdpWb = wb(REMOTE.wbGdp.path);
  // IDS creditor breakdown: the five groups add up to DT.DOD.DECT.CD (checked below).
  const idsRead = (k) => {
    const j = JSON.parse(readFileSync(join(RAW, REMOTE[`ids_${k}`].path), 'utf8'));
    const m = new Map();
    for (const r of j.source.data) {
      const y = Number(r.variable.find((v) => v.concept === 'Time').id.slice(2));
      m.set(y, r.value);
    }
    return { m, lastupdated: j.lastupdated };
  };
  const I = Object.fromEntries(Object.keys(IDS).map((k) => [k, idsRead(k)]));
  const z = (k, y) => (I[k].m.get(y) ?? 0) / 1e6;
  const modern = [...debt.keys()].filter((y) => gdpWb.has(y) && y >= 1970).sort((a, b) => a - b).map((y) => {
    const cred = {
      mlt: z('mlat', y),
      imf: z('dimf', y),
      ven: z('blat_ven', y),
      oth: z('blat', y) - z('blat_ven', y),
      prv: z('prvt', y) + z('dpng', y) + z('dstc', y),
    };
    const idsTotal = z('dect', y);
    const sum = Object.values(cred).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - idsTotal) > 0.05) throw new Error(`IDS creditor groups (${sum}) don't add up to DT.DOD.DECT.CD (${idsTotal}) in ${y}`);
    if (Math.abs(idsTotal - debt.get(y) / 1e6) > 0.5) console.warn(`  ! ${y}: IDS total ${idsTotal} vs WDI ${debt.get(y) / 1e6}`);
    return {
      year: y, debtUsdM: round(debt.get(y) / 1e6, 1), gdpUsdM: round(gdpWb.get(y) / 1e6, 1), pct: round((debt.get(y) / gdpWb.get(y)) * 100, 1),
      cred: Object.fromEntries(Object.entries(cred).map(([k, v]) => [k, round(v, 3)])),
      venReported: I.blat_ven.m.get(y) != null,
    };
  });

  // ---- Stats (each traces to nyt_data unless noted)
  const pay = years.filter((d) => d.year <= 1888);
  const paying = pay.filter((d) => d.payFr > 0);
  const peak = paying.reduce((a, b) => (b.payPctGdp > a.payPctGdp ? b : a));
  const firstBelow50 = pay.find((d) => d.owedPctGdp < 50);
  const y1825 = byYear.get(1825);
  const stats = {
    totalPaidFr: round(pay.reduce((s, d) => s + d.payFr, 0), 0),
    totalPaidUsd2021: round(pay.reduce((s, d) => s + d.payUsd2021, 0), 0),
    peakPayPct: peak.payPctGdp, peakPayYear: peak.year,
    medianPayPctPayingYears: round(median(paying.map((d) => d.payPctGdp)), 3),
    medianPayPctAllYears: round(median(pay.filter((d) => d.year >= 1826).map((d) => d.payPctGdp)), 3),
    nPayingYears: paying.length,
    firstPayYear: paying[0].year, lastPayYear: paying.at(-1).year,
    owedPct1825: years[0].owedPctGdp, owedPct1826: years[1].owedPctGdp,
    owedPct1838: years.find((d) => d.year === 1838).owedPctGdp,
    firstYearOwedBelow50: firstBelow50.year,
    cpi2021,
    // Derived (our calculation, NYT formula): 150M francs at the 1825 exchange rate and CPI, in 2021 dollars.
    indemnity150InUsd2021: round((FACTS.indemnity_1825_francs.value / num(y1825['EXCHANGE-RATE-FRANC-TO-USD'])) * (cpi2021 / num(y1825['CONSUMER-PRICE-INDEX-USD'])), 0),
    modernFirstYear: modern[0]?.year, modernLastYear: modern.at(-1)?.year,
  };
  // Creditor shares (of total external debt): peak share and year for each group.
  stats.credPeaks = Object.fromEntries(['mlt', 'imf', 'ven', 'oth', 'prv'].map((k) => {
    const best = modern.reduce((a, d) => { const sh = (d.cred[k] / d.debtUsdM) * 100; return sh > a.share ? { share: sh, year: d.year } : a; }, { share: -1, year: null });
    return [k, { share: round(best.share, 1), year: best.year }];
  }));
  const venHalf = modern.filter((d) => d.cred.ven / d.debtUsdM > 0.5).map((d) => d.year);
  stats.venOverHalf = { from: venHalf[0], to: venHalf.at(-1), n: venHalf.length };
  const modernPeak = modern.reduce((a, d) => (d.pct > a.pct ? d : a));
  stats.modernPeakPct = { pct: modernPeak.pct, year: modernPeak.year };
  const modernPeakUsd = modern.reduce((a, d) => (d.debtUsdM > a.debtUsdM ? d : a));
  stats.modernPeakUsd = { usdM: modernPeakUsd.debtUsdM, year: modernPeakUsd.year };
  const henPeak = years.filter((d) => d.extDebtPctGdp != null).reduce((a, d) => (d.extDebtPctGdp > a.extDebtPctGdp ? d : a));
  stats.henPeakPct = { pct: henPeak.extDebtPctGdp, year: henPeak.year };
  stats.idsLastUpdated = I.dect.lastupdated;
  // What the payments went to, 1826–1888 (NYT categories)
  const sumOf = (k) => round(pay.reduce((a, d) => a + (d[k] || 0), 0), 0);
  stats.payByCategory = { indemnity: sumOf('payIndemnityFr'), loan: sumOf('payLoanFr'), lateFees: sumOf('payLateFeesFr') };
  const lf = pay.filter((d) => d.payLateFeesFr > 0);
  stats.lateFeesFirstYear = lf[0]?.year ?? null;
  const pk = paying.reduce((a, b) => (b.payFr > a.payFr ? b : a));
  stats.peakPayFr = { francs: pk.payFr, year: pk.year };

  console.log('Checking against fact-checked figures (explainer.md)…');
  assertClose('total paid, million francs', stats.totalPaidFr / 1e6, 112, 1);
  assertClose('total paid, million 2021 USD', stats.totalPaidUsd2021 / 1e6, 560, 5);
  assertClose('peak payment % GDP', stats.peakPayPct, 11.6, 0.05);
  assertClose('peak year', stats.peakPayYear, 1840, 0);
  assertClose('median payment % GDP (paying years)', stats.medianPayPctPayingYears, 2.5, 0.1);
  assertClose('owed % GDP 1826', stats.owedPct1826, 300, 10);
  assertClose('last payment year', stats.lastPayYear, 1888, 0);
  // Figures quoted on the reference chart "more than half owed to Venezuela" (IDS, Dec 2025 update)
  assertClose('Venezuela peak share %', stats.credPeaks.ven.share, 78, 1);
  assertClose('Venezuela over 50% (years)', stats.venOverHalf.n, 13, 0);

  const out = {
    meta: {
      title: 'Haiti Independence Debt explorer',
      builtAt: new Date().toISOString(),
      rawStatus: status,
      worldBankLastUpdated: wbMeta?.lastupdated ?? null,
      idsLastUpdated: stats.idsLastUpdated,
      license: 'NYT data: non-commercial use with credit to The New York Times (data/raw/nyt/LICENSE).',
    },
    sources: SOURCES, facts: FACTS, events: EVENTS, modernEvents: MODERN_EVENTS,
    stats, years, modern,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  // Public downloads (linked from sources.html)
  const PUB = join(ROOT, 'public/data');
  mkdirSync(PUB, { recursive: true });
  writeFileSync(join(PUB, 'haiti-debt-explorer.json'), JSON.stringify(out, null, 1) + '\n');
  const cols = Object.keys(years[0]);
  const csv = [cols.join(','), ...years.map((d) => cols.map((c) => d[c] ?? '').join(','))].join('\n') + '\n';
  writeFileSync(join(PUB, 'haiti-debt-explorer.csv'), csv);
  console.log(`Wrote ${OUT.replace(ROOT + '/', '')}: ${years.length} historical years, ${modern.length} modern years.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
