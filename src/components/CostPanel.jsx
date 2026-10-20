import { useId, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import data from '../data/explorer.json';
import { francs, dollars, bigNumber } from '../format.js';
import SourceRef from './SourceRef.jsx';
import { useT } from '../i18n.js';

const F = data.facts;
const S = data.stats;

const VIEWS = {
  francs: {
    max: 150e6,
    intro: 'France’s bill, and what Haiti actually paid on it, in the francs of the time (not adjusted for inflation).',
    rows: [
      { label: 'Demanded by the 1825 ordinance', value: F.indemnity_1825_francs.value, fmt: francs, tone: 'muted', src: F.indemnity_1825_francs.source },
      { label: 'Indemnity after the 1838 cut', value: F.indemnity_1838_francs.value, fmt: francs, tone: 'muted', src: F.indemnity_1838_francs.source },
      { label: 'Actually paid, 1826–1888 (indemnity, loan interest and principal, late fees)', value: S.totalPaidFr, fmt: francs, tone: 'paid', src: ['nyt_data'], approx: true },
      { label: 'The 1825 loan from French bankers', value: F.loan_1825_francs.value, fmt: francs, tone: 'owed', src: F.loan_1825_francs.source,
        part: { value: F.loan_1825_commission_francs.value, label: `${bigNumber(F.loan_1825_commission_francs.value)} kept as commission` } },
    ],
    note: 'Haiti paid more than the 90 million francs France settled on because the “double debt” also included the 1825 loan’s interest and, after 1870, late fees.',
  },
  dollars: {
    max: 700e6,
    intro: 'The same money converted at historical exchange rates and adjusted to 2021 US dollars with US consumer prices, the NYT’s method.',
    rows: [
      { label: 'Actually paid, 1826–1888', value: S.totalPaidUsd2021, fmt: dollars, tone: 'paid', src: ['nyt_data'], approx: true },
      { label: 'The original 150-million-franc demand (our calculation, NYT method, 1825 rates)', value: S.indemnity150InUsd2021, fmt: dollars, tone: 'muted', src: ['nyt_data'], approx: true },
    ],
    note: 'Converting 19th-century francs to today’s dollars is rough: it uses one exchange rate per year and US, not Haitian or French, prices.',
  },
  growth: {
    max: 115e9,
    intro: 'What the money could have done if it had stayed in Haiti. The NYT estimated the lost economic growth over two centuries as a range.',
    rows: [
      { label: 'Lost growth, NYT estimate (range)', range: [F.lost_growth_low_usd.value, F.lost_growth_high_usd.value], tone: 'paid', src: F.lost_growth_low_usd.source },
      { label: 'Aristide’s 2003 restitution demand, based on the 90 million francs', value: F.aristide_2003_usd.value, fmt: dollars, tone: 'owed', src: F.aristide_2003_usd.source },
      { label: 'Actually paid, 1826–1888, in 2021 dollars (for scale)', value: S.totalPaidUsd2021, fmt: dollars, tone: 'muted', src: ['nyt_data'], approx: true },
    ],
    note: 'The range is a model estimate with wide uncertainty, not a measured sum. The $21 billion low end and Aristide’s $21.7 billion demand are different calculations that happen to be close in size. Neither is a conversion of the 150 million francs.',
  },
};

function Bar({ row, x }) {
  const width = 100;
  if (row.range) {
    const [lo, hi] = row.range;
    return (
      <div className="cost-row">
        <div className="cost-label">{row.label}</div>
        <div className="cost-value">{`${dollars(lo)} to ${dollars(hi)}`}</div>
        <div className="cost-track" aria-hidden="true">
          <div className={`cost-fill tone-${row.tone} is-range`} style={{ left: `${x(lo) * width}%`, width: `${(x(hi) - x(lo)) * width}%` }} />
        </div>
        <SourceRef ids={row.src} />
      </div>
    );
  }
  const w = Math.max(0.4, x(row.value) * width);
  return (
    <div className="cost-row">
      <div className="cost-label">{row.label}</div>
      <div className="cost-value">{row.approx ? '≈' : ''}{row.fmt(row.value)}</div>
      <div className="cost-track" aria-hidden="true">
        <div className={`cost-fill tone-${row.tone}`} style={{ width: `${w}%` }}>
          {row.part && <div className="cost-part" style={{ width: `${(row.part.value / row.value) * 100}%` }} />}
        </div>
      </div>
      {row.part && <div className="cost-part-label">{row.part.label}</div>}
      <SourceRef ids={row.src} />
    </div>
  );
}

export default function CostPanel() {
  const t = useT();
  const [view, setView] = useState('francs');
  const id = useId();
  const tabs = [['francs', t('costFrancs')], ['dollars', t('costDollars')], ['growth', t('costGrowth')]];
  const v = VIEWS[view];
  const x = scaleLinear([0, v.max], [0, 1]).clamp(true);
  const onKey = (e) => {
    const i = tabs.findIndex(([k]) => k === view);
    const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (n) {
      const next = tabs[(i + n + tabs.length) % tabs.length][0];
      setView(next);
      document.getElementById(`${id}-${next}`)?.focus();
    }
  };
  return (
    <section className="cost" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{t('costTitle')}</h2>
      <div className="tabs" role="tablist" aria-label="Units" onKeyDown={onKey}>
        {tabs.map(([k, label]) => (
          <button key={k} id={`${id}-${k}`} role="tab" type="button" aria-selected={view === k} aria-controls={`${id}-panel`}
            tabIndex={view === k ? 0 : -1} className={view === k ? 'is-on' : ''} onClick={() => setView(k)}>
            {label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${view}`} className="cost-panel">
        <p className="cost-intro">{v.intro}</p>
        {v.rows.map((r) => <Bar key={r.label} row={r} x={x} />)}
        <p className="cost-note">{v.note}</p>
      </div>
    </section>
  );
}
