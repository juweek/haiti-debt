# Haiti Independence Debt explorer

An interactive, sourced look at the "double debt" France imposed on Haiti in 1825,
the US-era loans that followed, and who Haiti has owed since 1970, in the
Gourmet Data chart style.

- **Explorer** (`index.html`): one large chart under a sticky maroon hero band.
  A switch flips between *Debt owed* and *Payments made*; Measure is Amount / % of GDP /
  Share; Unit is Francs (1825–1915) or US$ (1915–1927 receivership, 1970–2024 World Bank),
  one at a time. *More options* sets the years shown and splits the debt by creditor (or
  payments by what they paid for). Scrub, drag, use prev/next event, or press Play for a
  ~9-second sweep that pauses on each event. The year note gives the event and the values
  drawn, with sources.
- **Sources & method** (`sources.html`): every number, how it was calculated,
  what is missing, the "What it cost" panel, and CSV/JSON downloads.

Built for sharing on social media (links keep the year and view: `index.html#y=2017&s=debt&m=share&u=fr&e=modern&sp=1`),
and meant as a real reference for Haitians and Haitian Americans. Nothing is
shown that isn't traceable to a source in [`data/SOURCES.md`](data/SOURCES.md).

## Run it

```bash
npm install
npm run data:refresh   # re-download NYT + World Bank data, rebuild src/data/explorer.json
npm run dev            # http://localhost:5173/haiti-debt/
npm run build          # static site in dist/, built for the /haiti-debt/ subpath
npm run shots          # Playwright screenshots → process/ (after build)
npm run check:deploy   # serve dist/ under /haiti-debt/, fail on any 404 (after build)
```

`npm run data:refresh:offline` rebuilds from the vendored copies in `data/raw/`
without touching the network. You may need `npx playwright install chromium`
once before `npm run shots`.

## Deploy

The site is published to GitHub Pages at <https://juweek.github.io/haiti-debt/>
from the `juweek/haiti-debt` repo.

- `vite.config.js` sets `base: '/haiti-debt/'`. Runtime links and asset paths go
  through `src/paths.js` (`import.meta.env.BASE_URL`), so they work under the subpath.
  `og:image` and `og:url` are absolute URLs on that host. To host somewhere else,
  change `base` and the absolute URLs in `index.html` and `sources.html`.
- `.github/workflows/deploy.yml` runs on every push to `main` (or by hand via
  *Run workflow*): `npm ci`, `npm run build`, upload `dist/`, deploy with
  `actions/deploy-pages`. In the repo's Settings → Pages, set **Source** to
  **GitHub Actions** once.
- CI never runs `data:refresh`. It builds from the processed data committed in
  `src/data/explorer.json` and `public/data/`. To update the numbers, run
  `npm run data:refresh` locally, review the diff, and commit it.
- Before pushing, `npm run build && npm run check:deploy` loads both pages from
  `dist/` under `/haiti-debt/` in headless Chrome and fails on any 404.

## Stack

Plain JavaScript, React 19, Vite 6 (multi-page), d3 modules (`d3-scale`,
`d3-shape`, `d3-array`, `d3-format`). No CSS framework.

## Data and license

Primary data: The New York Times, [nytimes/haiti-debt](https://github.com/nytimes/haiti-debt),
used under its license (non-commercial use, credit to The New York Times; see
`data/raw/nyt/LICENSE`). GDP estimates: Simon Henochsberg (2016). US-era figures:
Haiti's receivership reports, FRUS, and the IMF's 1950 survey. Modern series:
World Bank WDI and International Debt Statistics (CC BY 4.0). Full list: [`data/SOURCES.md`](data/SOURCES.md).

## Design

Colors, type and layout follow the Gourmet Data static charts
(`/workspace/email-charts/gd_chart.py`, `gd_annostyle.py`). Fonts: IBM Plex Sans
and IBM Plex Sans Condensed (SIL OFL 1.1), subset in `src/assets/fonts/`.
