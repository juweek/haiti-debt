import { useId } from 'react';
import { ERAS, MEASURES, UNITS, SERIES, CREDITORS, PAY_CATS, segmentsFor, keyLabel } from '../model.js';

/** Segmented control (radio group): arrow keys move the selection. */
function Segmented({ label, value, options, onChange, dim = false, className = '' }) {
  const onKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const live = options.filter((o) => !o.disabled);
    const i = live.findIndex((o) => o.value === value);
    const n = live[(i + (e.key === 'ArrowRight' ? 1 : -1) + live.length) % live.length];
    if (n) { e.preventDefault(); onChange(n.value); e.currentTarget.querySelector(`[data-v="${n.value}"]`)?.focus(); }
  };
  return (
    <div className={`seg ${dim ? 'is-dim' : ''} ${className}`} role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" data-v={o.value} aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1} disabled={o.disabled} title={o.title}
          className={value === o.value ? 'is-on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Two-sided switch: [left label] (toggle) [right label]. */
function TwoSide({ left, right, on, onChange, label, className = '' }) {
  return (
    <div className={`two-side ${className}`}>
      <span className={`ts-label ${on ? '' : 'is-active'}`} onClick={() => onChange(false)} aria-hidden="true">{left}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className="ts-switch" onClick={() => onChange(!on)}>
        <span className="ts-knob" />
      </button>
      <span className={`ts-label ${on ? 'is-active' : ''}`} onClick={() => onChange(true)} aria-hidden="true">{right}</span>
    </div>
  );
}

/** One switch (labelled on the right only) for the breakdown. */
function Toggle({ label, on, onChange }) {
  return (
    <label className="toggle">
      <button type="button" role="switch" aria-checked={on} className="ts-switch" onClick={() => onChange(!on)}><span className="ts-knob" /></button>
      <span>{label}</span>
    </label>
  );
}

/** Subject switch, measure, unit, More options (years + breakdown). */
export function Controls({ state, set, optionsOpen, setOptionsOpen }) {
  const { subject, measure, unit, era, split } = state;
  const pay = subject === 'pay';
  const panelId = useId();
  const setMeasure = (v) => {
    if (v === 'share') set({ measure: v, split: true, ...(pay ? {} : { era: 'modern' }) });
    else set({ measure: v });
  };
  const setUnit = (v) => set({ unit: v, measure: 'raw', ...(v === 'fr' && era === 'modern' ? { era: 'full' } : {}) });
  const setEra = (v) => set({ era: v, ...(v === 'modern' && measure === 'raw' && unit === 'fr' ? { unit: 'usd' } : {}) });
  const setSplit = (v) => set({ split: v, ...(!v && measure === 'share' ? { measure: 'pct' } : {}) });
  return (
    <div className="ctl">
      <div className="cbar">
        <div className="cb-sec cb-show">
          <TwoSide left="Debt owed" right="Payments made" label="Show payments made instead of debt owed" on={pay} onChange={(v) => set({ subject: v ? 'pay' : 'debt' })} />
        </div>
        <div className="cb-sec cb-measure">
          <Segmented label="Measure" value={measure} onChange={setMeasure} className="seg-measure"
            options={Object.entries(MEASURES).map(([value, l]) => ({ value, label: l }))} />
        </div>
        <div className="cb-sec cb-opt">
          <button type="button" className="opt-btn" aria-expanded={optionsOpen} aria-controls={panelId} onClick={() => setOptionsOpen(!optionsOpen)}>
            <span className="opt-long">More options</span><span className="opt-short">Options</span>
            <svg width="10" height="7" viewBox="0 0 10 7" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
          </button>
        </div>
      </div>
      <div id={panelId} className="opt-panel" hidden={!optionsOpen}>
        <div className="opt-item">
          <span className="cb-label">Years shown</span>
          <Segmented label="Years shown" value={pay ? 'hist' : era} onChange={setEra}
            options={Object.entries(ERAS).map(([value, o]) => ({
              value, label: o.label,
              disabled: (pay && value !== 'hist') || (!pay && measure === 'share' && value === 'hist'),
              title: pay && value !== 'hist' ? 'Payments: 1826–1888 only' : undefined,
            }))} />
        </div>
        <div className="opt-item">
          <span className="cb-label">Unit</span>
          <Segmented label="Unit" value={pay ? 'fr' : unit} onChange={setUnit} dim={measure !== 'raw'} className="seg-unit"
            options={Object.entries(UNITS).map(([value, l]) => ({ value, label: l, disabled: value === 'usd' && pay, title: value === 'usd' && pay ? 'The NYT payment series is in francs only' : measure !== 'raw' ? 'Units apply to Amount; choosing one switches Measure to Amount' : undefined }))} />
        </div>
        <div className="opt-item">
          <span className="cb-label">Breakdown</span>
          <Toggle label={pay ? 'Split by what it paid for' : 'Split by creditor'} on={split} onChange={setSplit} />
        </div>
      </div>
    </div>
  );
}

/** Legend directly above the chart: a plain key, or creditor / category chips when split. */
export function Legend({ state, set }) {
  const segs = segmentsFor(state).map((s) => s.id);
  const chipIds = state.split ? (state.subject === 'pay' ? PAY_CATS : segs.includes('modern') ? CREDITORS : []) : [];
  const lineKey = segs.includes('hist') || segs.includes('recv');
  const toggle = (id) => {
    const next = new Set(state.enabled);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ enabled: next });
  };
  if (!chipIds.length) {
    return (
      <div className="legend">
        <span className="key"><span className={`key-sw ${state.subject === 'pay' ? 'is-bar' : ''}`} />{keyLabel(state)}</span>
      </div>
    );
  }
  return (
    <div className="legend" role="group" aria-label={state.subject === 'pay' ? 'What each payment went to' : 'Creditors'}>
      {lineKey && <span className="key"><span className="key-sw" />{segs.includes('hist') ? 'All external debt, est.' : 'Gross public debt'}</span>}
      {chipIds.map((id) => {
        const s = SERIES[id];
        const on = state.enabled.has(id);
        return (
          <button key={id} type="button" className={`chip ${on ? 'is-on' : ''}`} aria-pressed={on} title={s.long} onClick={() => toggle(id)}>
            <span className="chip-sw" style={{ '--sw': s.color }} aria-hidden="true" />{s.label}
          </button>
        );
      })}
    </div>
  );
}
