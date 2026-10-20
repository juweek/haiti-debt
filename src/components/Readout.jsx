import data from '../data/explorer.json';
import { pct, usdM, times, compact } from '../format.js';
import SourceRef from './SourceRef.jsx';

const byYear = new Map(data.years.map((d) => [d.year, d]));
const eventByYear = new Map(data.events.map((e) => [e.year, e]));

function era(y) {
  if (y === 1825) return 'Haiti’s first installment was paid with the 1825 loan, so the NYT records no payment from Haiti’s own revenue this year.';
  if (y <= 1888) return 'Haiti is paying the double debt: the indemnity to France plus the 1825 loan to French bankers.';
  if (y <= 1915) return 'The double debt is paid off, but Haiti is still repaying newer foreign loans (1875, 1896, 1910). The NYT payment series stops in 1888.';
  if (y <= 1927) return 'US occupation. No GDP estimate exists for these years, so the debt can only be shown in dollars, from the receivership’s own accounts (fiscal years ending Sept. 30).';
  return 'No annual debt series has been found for 1928–1947. Haiti finished repaying the 1922 US loans in 1947.';
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat ${tone ? `tone-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function sourceIds(year, d) {
  const ids = year > 1927 ? ['imf_1950'] : year > 1915 ? [] : ['nyt_data'];
  if (d.extDebtPctGdp != null) ids.push('henochsberg');
  if (d.pubDebtUsdM != null) ids.push('receiver_1927');
  return ids;
}

/** Fixed-shape readout above the chart: year, event title, three stat slots. */
export default function Readout({ year }) {
  const d = byYear.get(year);
  const ev = eventByYear.get(year);
  const paid = d.payFr != null
    ? <Stat tone="paid" label="Paid that year" value={d.payFr > 0 ? pct(d.payPctGdp) : '—'}
        sub={d.payFr > 0 ? `of GDP · ${compact(d.payFr)} francs · ≈$${compact(d.payUsd2021)} in 2021 $` : 'No payment recorded'} />
    : <Stat tone="paid" label="Paid that year" value="—" sub={year <= 1947 ? 'No annual series after 1888' : ''} />;
  const owed = d.owedFr != null
    ? <Stat tone="owed" label="Double debt owed" value={pct(d.owedPctGdp)}
        sub={`of GDP${d.owedPctGdp >= 100 ? ` (${times(d.owedPctGdp)})` : ''} · ${compact(d.owedFr)} francs`} />
    : <Stat tone="owed" label="Double debt" value="Paid off" sub="Last payment: 1888" />;
  let third;
  if (d.extDebtPctGdp != null) {
    third = <Stat tone="ext" label="All external debt, est." value={pct(d.extDebtPctGdp)}
      sub={`of GDP${d.extDebtFr ? ` · ≈${compact(d.extDebtFr)} francs` : ''}`} />;
  } else if (d.pubDebtUsdM != null) {
    third = <Stat label="Gross public debt" value={usdM(d.pubDebtUsdM)} sub="Sept. 30; no GDP to compare" />;
  } else {
    third = <Stat label="Debt" value="No data" sub="No annual series, 1928–47" />;
  }
  return (
    <section className="readout" aria-live="polite" aria-atomic="true">
      <div className="readout-head">
        <span className="readout-year">{year}</span>
        <span className="readout-event">{ev ? ev.title : '\u00a0'}</span>
      </div>
      <div className="stats">{paid}{owed}{third}</div>
    </section>
  );
}

/** Context for the selected year, shown under the chart. */
export function YearNote({ year }) {
  const d = byYear.get(year);
  const ev = eventByYear.get(year);
  return (
    <div className="year-note">
      <p className="readout-text">
        {ev ? ev.text : era(year)}{' '}
        {ev && <SourceRef ids={ev.source} className="inline" as="span" />}
      </p>
      <SourceRef ids={sourceIds(year, d)} label={`Figures for ${year}`} />
    </div>
  );
}
