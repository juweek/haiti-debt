# Haiti Independence Debt explorer

An interactive, sourced look at the "double debt" France imposed on Haiti in 1825,
and the US-era loans that followed, year by year from 1825 to 1947, with the modern
World Bank external-debt series after it.

- **Explorer** (`index.html`): scrub or hover any year to see what Haiti paid
  that year and how much it still owed, as a share of GDP, with nine annotated
  events. A "What it cost" panel switches between francs, 2021 dollars and the
  NYT's lost-growth range. A second chart covers external debt, 1970–2024.
- **Sources & method** (`sources.html`): every number, how it was calculated,
  what is missing, and CSV/JSON downloads.

Built for sharing on social media (links keep the year: `index.html#y=1840`),
and meant as a real reference for Haitians and Haitian Americans. Nothing is
shown that isn't traceable to a source in [`data/SOURCES.md`](data/SOURCES.md).

## Run it

```bash
npm install
npm run data:refresh   # re-download NYT + World Bank data, rebuild src/data/explorer.json
npm run dev            # http://localhost:5173
npm run build          # static site in dist/ (relative paths; host anywhere)
npm run shots          # Playwright screenshots → process/ (after build)
```

`npm run data:refresh:offline` rebuilds from the vendored copies in `data/raw/`
without touching the network. You may need `npx playwright install chromium`
once before `npm run shots`.

## Stack

Plain JavaScript, React 19, Vite 6 (multi-page), d3 modules (`d3-scale`,
`d3-shape`, `d3-array`, `d3-format`). No CSS framework.

## Data and license

Primary data: The New York Times, [nytimes/haiti-debt](https://github.com/nytimes/haiti-debt),
used under its license (non-commercial use, credit to The New York Times; see
`data/raw/nyt/LICENSE`). GDP estimates: Simon Henochsberg (2016). US-era figures:
Haiti's receivership reports, FRUS, and the IMF's 1950 survey. Modern series:
World Bank WDI. Full list: [`data/SOURCES.md`](data/SOURCES.md).

## Languages

English only for now. The Kreyòl and French toggles are wired up (`src/i18n.js`)
and fall back to English until the strings are translated.
