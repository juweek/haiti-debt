import data from '../data/explorer.json';
import { url } from '../paths.js';

/** Inline "Source: A; B" with links to the registry entries. */
export default function SourceRef({ ids, label = 'Source', className = '', as: Tag = 'p' }) {
  const list = (Array.isArray(ids) ? ids : [ids]).map((id) => ({ id, ...data.sources[id] })).filter((s) => s.url);
  if (!list.length) return null;
  return (
    <Tag className={`source-ref ${className}`}>
      {label}:{' '}
      {list.map((s, i) => (
        <span key={s.id}>
          {i > 0 && '; '}
          <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}>{s.short}</a>
        </span>
      ))}
      {' · '}
      <a href={url(`sources.html#${list[0].id}`)}>details</a>
    </Tag>
  );
}
