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
World Bank WDI and International Debt Statistics (CC BY 4.0). Full list: [`data/SOURCES.md`](data/SOURCES.md).

## Design

Colors, type and layout follow the Gourmet Data static charts
(`/workspace/email-charts/gd_chart.py`, `gd_annostyle.py`). Fonts: IBM Plex Sans
and IBM Plex Sans Condensed (SIL OFL 1.1), subset in `src/assets/fonts/`.
