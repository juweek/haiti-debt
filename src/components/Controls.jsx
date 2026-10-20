import { ERAS, MEASURES, SUBJECTS, SERIES, checkboxGroups } from '../model.js';

function Pills({ label, value, options, onChange, name }) {
  return (
    <div className="pill-row" role="radiogroup" aria-label={label}>
      <span className="pill-label">{label}</span>
      <div className="pills">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} disabled={o.disabled}
            title={o.title} className={`pill ${value === o.value ? 'is-on' : ''}`} name={name}
            onClick={() => !o.disabled && onChange(o.value)}>
            {o.label}{o.sub && <span className="pill-sub">{o.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Pill toggles (subject, measure, era) and series checkboxes. */
export default function Controls({ state, set }) {
  const { subject, measure, era, enabled } = state;
  const mixDisabled = subject === 'debt' && era === 'hist';
  const groups = checkboxGroups(state);
  const toggle = (id) => {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ enabled: next });
  };
  return (
    <div className="controls-block">
      <Pills label="Show" value={subject} onChange={(v) => set({ subject: v })}
        options={Object.entries(SUBJECTS).map(([value, label]) => ({ value, label }))} />
      <Pills label="Measure" value={measure} onChange={(v) => set({ measure: v })}
        options={Object.entries(MEASURES).map(([value, o]) => ({
          value, label: subject === 'pay' ? o.payLabel : o.label,
          disabled: value === 'mix' && mixDisabled,
          title: value === 'mix' && mixDisabled ? 'No creditor breakdown before 1970. Pick 1970–2024, Full span, or Payments made.' : undefined,
        }))} />
      {subject === 'debt' && (
        <Pills label="Years" value={era} onChange={(v) => set({ era: v, ...(v === 'hist' && measure === 'mix' ? { measure: 'pct' } : {}) })}
          options={Object.entries(ERAS).map(([value, o]) => ({ value, label: o.label, sub: value === 'full' ? null : o.sub }))} />
      )}
      {groups.map((g) => (
        <div key={g.title} className="checks" role="group" aria-label={g.title}>
          <span className="checks-title" aria-hidden="true">{g.title}</span>
          {g.ids.map((id) => {
            const s = SERIES[id];
            return (
              <label key={id} className="check" title={s.long}>
                <input type="checkbox" checked={enabled.has(id)} onChange={() => toggle(id)} />
                <span className={`check-sw ${s.kind === 'line' ? 'is-line' : ''}`} style={{ '--sw': s.color }} aria-hidden="true" />
                {s.label}
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
