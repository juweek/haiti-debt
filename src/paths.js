// Site-relative URLs that work under the deploy subpath (vite.config.js `base`,
// e.g. /haiti-debt/ on GitHub Pages). Always build page/asset links through here.
export const BASE = import.meta.env.BASE_URL;
export const url = (p = '') => `${BASE}${p.replace(/^\//, '')}`;
export const SITE = 'https://juweek.github.io/haiti-debt/';
