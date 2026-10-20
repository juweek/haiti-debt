import { useEffect, useState } from 'react';
import { LANGS, LangContext, isComplete, useT } from '../i18n.js';

function Header({ page, lang, setLang }) {
  const t = useT();
  return (
    <header className="site-header">
      <a className="brand" href="index.html">{t('kicker')}</a>
      <nav aria-label="Pages">
        <a href="index.html" aria-current={page === 'explorer' ? 'page' : undefined}>{t('navExplorer')}</a>
        <a href="sources.html" aria-current={page === 'sources' ? 'page' : undefined}>{t('navSources')}</a>
      </nav>
      <div className="lang" role="group" aria-label="Language">
        {LANGS.map((l) => (
          <button key={l.code} type="button" lang={l.code} aria-pressed={lang === l.code} title={l.label} onClick={() => setLang(l.code)}>
            {l.short}
          </button>
        ))}
      </div>
    </header>
  );
}

/** Page chrome shared by every HTML entry: header, language state, footer. */
export default function Shell({ page, children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('hd-lang') || 'en');
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem('hd-lang', lang);
  }, [lang]);
  return (
    <LangContext.Provider value={lang}>
      <Header page={page} lang={lang} setLang={setLang} />
      {!isComplete(lang) && lang !== 'en' && <Notice />}
      <main id="main">{children}</main>
      <Footer />
    </LangContext.Provider>
  );
}

function Notice() {
  const t = useT();
  return <p className="lang-notice" role="status">{t('langNotice')}</p>;
}

function Footer() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div>
        <p>{t('footer')} <a href="sources.html">{t('navSources')}</a>.</p>
        <p>The NYT data is used under its non-commercial license, with credit to The New York Times. World Bank data: CC BY 4.0.</p>
      </div>
      <img className="logo" src="img/gd-lockup-stacked.png" alt="Gourmet Data" width="645" height="216" loading="lazy" />
    </footer>
  );
}
