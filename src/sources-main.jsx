import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import data from './data/explorer.json';
import Shell from './components/Shell.jsx';
import { francs, dollars, pct } from './format.js';
import './styles.css';

const S = data.stats;
const F = data.facts;
const src = (id) => data.sources[id];
const Cite = ({ id }) => <a href={`#${id}`} className="cite">{src(id).short}</a>;
const Cites = ({ ids }) => <>{ids.map((id, i) => <span key={id}>{i > 0 && ', '}<Cite id={id} /></span>)}</>;

const SERIES = [
  ['Payments on the double debt (francs, 2021 $)', '1825–1888', 'Indemnity + 1825 loan principal and interest + late fees. 2021 $ = francs ÷ franc-per-$ rate × (2021 CPI ÷ that year’s CPI).', ['nyt_data']],
  ['Double debt still owed (francs)', '1825–1888', 'NYT “DOUBLE-DEBT-DRAWDOWN”: remainder after each year’s payments, not counting future interest. Starts at 156M = 150M indemnity + 30M loan − 24M paid from the loan.', ['nyt_data']],
  ['Haiti GDP (nominal US $)', '1825–1915', 'Broad estimates by Henochsberg, as published in the NYT file. Used as the denominator for every “% of GDP”.', ['henochsberg', 'nyt_data']],
  ['All external debt (estimate)', '1825–1915', 'Henochsberg Fig. 14, digitized from the PDF’s vector path (±1M francs, ±1 year). Includes the indemnity and the 1825, 1875, 1896 and 1910 loans.', ['henochsberg']],
  ['Gross public debt (US $)', '1915–1927', 'Receivership Table 52, Sept. 30 each fiscal year; gourdes ÷ 5. Includes internal debt and uncovered currency. No GDP to compare.', ['receiver_1927']],
  ['External debt stocks, % of GDP', `${S.modernFirstYear}–${S.modernLastYear}`, 'World Bank DT.DOD.DECT.CD ÷ NY.GDP.MKTP.CD (current US $). Public and private, including IMF credit.', ['wb_wdi']],
];

function Sources() {
  return (
    <article className="prose">
      <p className="kicker">Sources and methodology</p>
      <h1>Where every number comes from</h1>
      <p className="dek">
        This explorer only shows figures that come from a published dataset or document listed below. Ratios and totals are
        calculated from those sources by <code>scripts/build-data.mjs</code>; the script checks them against a fact-checked
        list before it writes the data file.
      </p>

      <h2 id="headline-numbers">The headline numbers</h2>
      <ul className="facts">
        <li><b>{francs(F.indemnity_1825_francs.value)}</b> demanded by the 1825 ordinance; <b>{francs(F.indemnity_1838_francs.value)}</b> after the 1838 treaty. <Cites ids={F.indemnity_1825_francs.source} /></li>
        <li><b>{francs(F.loan_1825_francs.value)}</b> borrowed in 1825; the bankers kept <b>{francs(F.loan_1825_commission_francs.value)}</b> as commission. <Cite id="nyt_readme" /></li>
        <li><b>≈{francs(S.totalPaidFr)}</b> paid in total, {S.firstPayYear}–{S.lastPayYear} (sum of PAYMENTS-DOUBLE-DEBT-FRANCS), or <b>≈{dollars(S.totalPaidUsd2021)}</b> in 2021 dollars (sum of DOUBLE-DEBT-IN-2021-USD). <Cite id="nyt_data" /></li>
        <li>Payments peaked at <b>{pct(S.peakPayPct)} of GDP</b> in {S.peakPayYear}. In the {S.nPayingYears} years with a recorded payment, the median was <b>{pct(S.medianPayPctPayingYears)}</b> (counting zero years too, {pct(S.medianPayPctAllYears)}). <Cites ids={['nyt_data', 'henochsberg']} /></li>
        <li>The double debt still owed was <b>{pct(S.owedPct1825)}</b> of GDP in 1825 and <b>{pct(S.owedPct1826)}</b> in 1826 (about 3×), fell to {pct(S.owedPct1838)} after the 1838 cut, and first dropped below 50% in {S.firstYearOwedBelow50}. <Cites ids={['nyt_data', 'henochsberg']} /></li>
        <li>The last double-debt payment was in <b>1888</b>; the 1922 US loans were paid off in <b>1947</b>. These are different debts. <Cites ids={['nyt_readme', 'imf_1950']} /></li>
        <li>The NYT’s estimate of lost economic growth: <b>{dollars(F.lost_growth_low_usd.value)} to {dollars(F.lost_growth_high_usd.value)}</b>. <Cite id="nyt_lost_growth" /></li>
        <li>Aristide’s 2003 demand: <b>$21,685,135,571.48</b> (≈{dollars(F.aristide_2003_usd.value)}), which his government said was today’s value of the 90 million francs. <Cite id="latimes_2003" /></li>
        <li>150 million francs in 2021 dollars, using the NYT’s formula and 1825 rates: <b>≈{dollars(S.indemnity150InUsd2021)}</b>. This one is our calculation, not a published figure. <Cite id="nyt_data" /></li>
      </ul>

      <h2 id="series">Data series in the charts</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Series</th><th scope="col">Years</th><th scope="col">How</th><th scope="col">Source</th></tr></thead>
          <tbody>
            {SERIES.map(([a, b, c, ids]) => (
              <tr key={a}><th scope="row">{a}</th><td>{b}</td><td>{c}</td><td><Cites ids={ids} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="method">Method</h2>
      <p>Every “% of GDP” divides a franc amount by that year’s franc-per-dollar exchange rate and then by Henochsberg’s nominal GDP estimate in dollars, both from the NYT file. Annual payments and the amount still owed use the same denominator, so the two panels are comparable.</p>
      <p>“Paid that year” is what Haiti paid from its own revenue. The 24 million francs of the first installment paid with the 1825 loan are counted through the loan repayments, as in the NYT data, so 1825 shows no payment.</p>
      <p>Dollar conversions follow the NYT: amount ÷ exchange rate × (2021 US CPI ÷ that year’s US CPI). CPI is the Minneapolis Fed historical series, as included in the NYT file.</p>

      <h2 id="gaps">Gaps and caveats</h2>
      <ul>
        <li><b>No GDP for 1916–1969.</b> Henochsberg’s estimates stop in 1915 and the World Bank’s start in 1960 (its debt data in 1970). That is why no ratio is shown for the US-loan years, and why the modern chart is separate.</li>
        <li><b>No annual debt series for 1928–1947.</b> The receivership’s annual reports for these years exist (HathiTrust) but have not been transcribed. Known points: 1922–24 bond issues of {dollars(F.bonds_1922_24_usd.value)}; the 1922 Series A was {dollars(F.loan_1922_series_a_usd.value)}; foreign debt repaid by 1947. <Cites ids={['imf_1950', 'frus_1922']} /></li>
        <li><b>No payment series after 1888.</b> Haiti kept paying the 1875, 1896 and 1910 loans and later the US loans, but no year-by-year payment series comparable to the NYT’s is available here.</li>
        <li><b>Digitized estimate.</b> The “all external debt” line was read off a chart in Henochsberg’s thesis, accurate to about ±1 million francs and ±1 year.</li>
        <li><b>19th-century GDP is a broad estimate.</b> Small changes in GDP move the ratios; treat them as orders of magnitude.</li>
        <li><b>Modern series differs in definition.</b> World Bank total external debt includes private debt and IMF credit, so it is not the same thing as the double debt.</li>
        <li><b>The 2024 drop in the modern series</b> (external debt falls from about $3.2 billion in 2023 to about $0.9 billion in 2024) coincides with the January 2024 PetroCaribe settlement, but we have not verified how much of the drop it explains. <Cites ids={['wb_wdi', 'imf_2024']} /></li>
        <li><b>Lost growth is a model estimate</b>, with a wide range, not a measured amount.</li>
      </ul>

      <h2 id="registry">Source list</h2>
      <ol className="registry">
        {Object.entries(data.sources).map(([id, s]) => (
          <li key={id} id={id}>
            <b>{s.short}.</b> {s.title}. <a href={s.url} className="url" target="_blank" rel="noopener noreferrer">{s.url}</a>
            {s.note && <span className="muted"> {s.note}</span>}
          </li>
        ))}
      </ol>

      <h2 id="download">Download the data</h2>
      <p>
        <a href="data/haiti-debt-explorer.csv" download>haiti-debt-explorer.csv</a> (one row per year, 1825–1947) ·{' '}
        <a href="data/haiti-debt-explorer.json" download>haiti-debt-explorer.json</a> (everything on this site, with sources).
        NYT-derived data is for non-commercial use with credit to The New York Times.
      </p>
      <p className="muted">Data built {new Date(data.meta.builtAt).toLocaleDateString('en-US', { dateStyle: 'long' })}. World Bank data last updated {data.meta.worldBankLastUpdated}.</p>
    </article>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Shell page="sources"><Sources /></Shell>
  </StrictMode>,
);
