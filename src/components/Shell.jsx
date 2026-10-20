import { useEffect, useRef } from 'react';
import { LangContext, useT } from '../i18n.js';
import { url } from '../paths.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Maroon hero band: site bar, kicker, title, dek. position: sticky; top: 0 behind the page,
 * the paper card scrolls over it. Its content drifts up at 0.4× scroll and fades to ~15%.
 */
function Hero({ page, kicker, title, dek }) {
  const t = useT();
  const hero = useRef(null);
  const inner = useRef(null);
  useEffect(() => {
    if (reduced()) return undefined;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const h = hero.current?.offsetHeight || 1;
      const s = Math.max(0, Math.min(window.scrollY, h));
      const k = s / h;
      inner.current.style.transform = `translate3d(0, ${(-0.4 * s).toFixed(1)}px, 0)`;
      inner.current.style.opacity = (1 - 0.85 * k).toFixed(3);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <header className="hero" ref={hero}>
      <div className="hero-inner" ref={inner}>
        <div className="site-bar">
          <a className="brand" href={url()}>{t('kicker')}</a>
          <nav aria-label="Pages">
            <a href={url()} aria-current={page === 'explorer' ? 'page' : undefined}>{t('navExplorer')}</a>
            <a href={url('sources.html')} aria-current={page === 'sources' ? 'page' : undefined}>
              <span className="nav-long">{t('navSources')}</span><span className="nav-short">Sources</span>
            </a>
          </nav>
        </div>
        <p className="hero-kicker">{kicker}</p>
        <h1 className="hero-title">{title}</h1>
        {dek && <p className="hero-dek">{dek}</p>}
      </div>
    </header>
  );
}

/** Page chrome shared by every HTML entry: hero band, paper card, footer. */
export default function Shell({ page, hero, children }) {
  return (
    <LangContext.Provider value="en">
      <a className="skip" href="#main">Skip to content</a>
      <Hero page={page} {...hero} />
      <div className="page-card">
        <main id="main">{children}</main>
        <Footer />
      </div>
    </LangContext.Provider>
  );
}

function Footer() {
  const t = useT();
  return (
    <footer className="site-footer">
      <p>{t('footer')} <a href={url('sources.html')}>{t('navSources')}</a> page.</p>
      <p>The NYT data is used under its non-commercial license, with credit to The New York Times. World Bank data: CC BY 4.0.</p>
    </footer>
  );
}
