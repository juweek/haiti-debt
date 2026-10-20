import data from '../data/explorer.json';
import { url } from '../paths.js';

/** Reference-style footer under a chart: thin rule, "Sources:" + "Note:" in small type, Gourmet Data lockup. */
export default function SourceBlock({ ids, note }) {
  const list = ids.map((id) => ({ id, ...data.sources[id] }));
  return (
    <footer className="source-block">
      <div className="src">
        <p><b>Sources:</b>{' '}
          {list.map((s, i) => (
            <span key={s.id}>{i > 0 && ' · '}<a href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}>{s.short}</a></span>
          ))}
          {' · '}<a href={url(`sources.html#${list[0]?.id || 'registry'}`)}>all sources</a>
        </p>
        {note && <p><b>Note:</b> {note}</p>}
      </div>
      <img className="logo" src={url('img/gd-lockup-stacked.png')} alt="Gourmet Data" width="645" height="216" />
    </footer>
  );
}
