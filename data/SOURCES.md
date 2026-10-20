# Data sources

Every number on the site traces to one of the sources below. Numbers come from
three places, all rebuilt by `npm run data:refresh` (`scripts/build-data.mjs`):

1. **Raw files in `data/raw/`**, parsed by the script.
2. **Hand-entered facts in `scripts/sources.mjs`** (`FACTS`, `EVENTS`, `MODERN_EVENTS`), each with a `source` id.
3. **Values calculated from 1 and 2** (ratios, sums, medians), listed under "Derived numbers" below.

Source ids in brackets match the keys of `SOURCES` in `scripts/sources.mjs`.
The sources page (`sources.html`) renders the same registry.

## Raw files

| File | What | Source | Retrieved |
|---|---|---|---|
| `data/raw/nyt/haiti-double-debt.csv` | Year-by-year payments (indemnity, 1825 loan, late fees), double debt remaining, US CPI, franc/$ rate, Haiti GDP, payments in 2021 $. 1825–1888 for payments; GDP to 1915; CPI to 2021. | [nyt_data] The New York Times, https://github.com/nytimes/haiti-debt (commit c5c7104, May 20 2022). GDP column = Henochsberg (2016); fx = Victor Bulmer-Thomas; CPI = Minneapolis Fed. | Re-downloaded by `data:refresh` from raw.githubusercontent.com; identical to the vendored copy on Oct 20, 2026 |
| `data/raw/nyt/README.md`, `LICENSE` | Field definitions, method, payment history; license (non-commercial, credit NYT) | [nyt_readme] | same |
| `data/raw/derived/longrun_1825_1927.csv` | **B** Henochsberg Fig. 14 "Estimation of the outstanding external debt of Haiti, 1825–1915" (p.29), digitized from the PDF vector path (±1M francs, ±1 yr), francs in `table_or_series`, % GDP using NYT fx and GDP. **C** Gross public debt at Sept. 30, 1915–1927, Table No. 52 "Public Debt", p.90, gourdes ÷ 5. | [henochsberg] http://piketty.pse.ens.fr/files/Henochsberg2016.pdf (via web.archive.org copy); [receiver_1927] https://haiti-now.org/wp-content/uploads/2017/05/Haiti-annual-report-1926.pdf | Built Oct 17, 2026 in the research folder (`/workspace/haiti-debt/longrun_debt.csv`, by `build_longrun.py`); subset copied here. Not re-downloadable: digitization was manual. |
| `data/raw/worldbank/wb_DT.DOD.DECT.CD.json` | External debt stocks, total (DOD, current US$), Haiti | [wb_wdi] https://api.worldbank.org/v2/country/HTI/indicator/DT.DOD.DECT.CD?format=json&per_page=100 | Re-downloaded by `data:refresh`; WB "lastupdated" 2026-10-08 |
| `data/raw/worldbank/wb_NY.GDP.MKTP.CD.json` | GDP, current US$, Haiti | [wb_wdi] https://api.worldbank.org/v2/country/HTI/indicator/NY.GDP.MKTP.CD?format=json&per_page=100 | same |

| `data/raw/worldbank/ids/ids_dect.json` | Total external debt stocks (check against WDI) | [wb_ids] `https://api.worldbank.org/v2/sources/6/country/HTI/series/DT.DOD.DECT.CD/counterpart-area/WLD/time/all?format=json&per_page=200` | IDS lastupdated 2025-12-03 |
| `data/raw/worldbank/ids/ids_mlat.json` | PPG multilateral (excl. IMF) | [wb_ids] `https://api.worldbank.org/v2/sources/6/country/HTI/series/DT.DOD.MLAT.CD/counterpart-area/WLD/time/all?format=json&per_page=200` | IDS lastupdated 2025-12-03 |
| `data/raw/worldbank/ids/ids_dimf.json` | Use of IMF credit incl. SDR allocations | [wb_ids] `https://api.worldbank.org/v2/sources/6/country/HTI/series/DT.DOD.DIMF.CD/counterpart-area/WLD/time/all?format=json&per_page=200` | IDS lastupdated 2025-12-03 |
| `data/raw/worldbank/ids/ids_blat.json` | PPG bilateral, all governments | [wb_ids] `https://api.worldbank.org/v2/sources/6/country/HTI/series/DT.DOD.BLAT.CD/counterpart-area/WLD/time/all?format=json&per_page=200` | IDS lastupdated 2025-12-03 |
| `data/raw/worldbank/ids/ids_blat_ven.json` | PPG bilateral owed to Venezuela | [wb_ids] `https://api.worldbank.org/v2/sources/6/country/HTI/series/DT.DOD.BLAT.CD/counterpart-area/463/time/all?format=json&per_page=200` | IDS lastupdated 2025-12-03 |
| `data/raw/worldbank/ids/ids_prvt.json` | PPG private creditors | [wb_ids] `https://api.worldbank.org/v2/sources/6/country/HTI/series/DT.DOD.PRVT.CD/counterpart-area/WLD/time/all?format=json&per_page=200` | IDS lastupdated 2025-12-03 |
| `data/raw/worldbank/ids/ids_dpng.json` | Private nonguaranteed | [wb_ids] `https://api.worldbank.org/v2/sources/6/country/HTI/series/DT.DOD.DPNG.CD/counterpart-area/WLD/time/all?format=json&per_page=200` | IDS lastupdated 2025-12-03 |
| `data/raw/worldbank/ids/ids_dstc.json` | Short-term debt | [wb_ids] `https://api.worldbank.org/v2/sources/6/country/HTI/series/DT.DOD.DSTC.CD/counterpart-area/WLD/time/all?format=json&per_page=200` | IDS lastupdated 2025-12-03 |

IDS files were first vendored from `/workspace/haiti-debt/comparisons/src` and are re-downloaded by `npm run data:refresh`.

## Hand-entered facts (`scripts/sources.mjs` → `FACTS`)

| Fact | Value | Source |
|---|---|---|
| Indemnity demanded, 1825 ordinance | 150,000,000 francs | [nyt_readme], [wiki_indemnity] https://en.wikipedia.org/wiki/Haitian_independence_debt |
| Indemnity after the 1838 treaty | 90,000,000 francs | [wiki_indemnity], [nyt_readme] (the NYT notes say the 1838 treaty cut the unpaid remainder to 60M francs plus 700,000 still owed on the first installment) |
| 1825 loan | 30,000,000 francs | [nyt_readme] "Haiti borrowed 30 million francs from a consortium of banks" |
| Commission kept by the bankers | 6,000,000 francs | [nyt_readme] |
| Lost economic growth | $21B–$115B | [nyt_lost_growth] https://www.nytimes.com/interactive/2022/05/20/world/americas/enslaved-haiti-debt-timeline.html (method: https://www.nytimes.com/2022/05/20/world/americas/haiti-bibliography.html) |
| Aristide's 2003 restitution demand | $21,685,135,571.48 | [latimes_2003] https://www.latimes.com/archives/la-xpm-2003-jun-14-fg-haiti14-story.html (also UPI, Dec 18 2003) |
| Gold taken by US Marines, Dec 1914 | $500,000 | [nyt_wall_street] https://www.nytimes.com/2022/05/20/world/haiti-wall-street-us-banks.html |
| 1922 Series A loan | $16,000,000, 30-year 6% gold bonds | [frus_1922] FRUS 1922 vol. II, docs 437–438 |
| 1922–24 bond issues, total | $23.7M; foreign debt fully repaid by 1947 | [imf_1950] IMF Staff Memorandum No. 546 (1950), §7, p.11 |
| HIPC + MDRI relief, June 30 2009 | ≈$1.2B | [wb_hipc_2009] |
| IMF cancellation, July 2010 | $268M | [ustreas_2010] https://home.treasury.gov/news/press-releases/tg796 |
| PetroCaribe settlement, Jan 2024 | Haiti paid $500M; Venezuela forgave $1.69B | [imf_2024] IMF Country Report 24/333 |

Event descriptions (`EVENTS`, `MODERN_EVENTS`) carry their own source ids:
1825 ordinance and loan [nyt_readme, wiki_indemnity]; 1826 treasury shipment
[nyt_readme: "the captain who carried the emptied coffers of the Haitian Treasury
in his ship in 1826"]; 1838 reduction and recognition [nyt_readme]; 1875 CIC loan
[wiki_indemnity, nyt_cic]; 1888 last payment [nyt_readme]; 1914 gold and 1915
invasion / National City ownership by 1920 [nyt_wall_street, fordham]; 1922 loans
[frus_1922, imf_1950]; 1947 payoff [imf_1950].

## Derived numbers (calculated by `scripts/build-data.mjs`)

The script asserts these against the fact-checked values in
`/workspace/haiti-debt/explainer.md` and fails if a source changes them.

| Number | Value | How |
|---|---|---|
| Total paid | 112,323,476 francs (≈112M) | Σ `PAYMENTS-DOUBLE-DEBT-FRANCS`, 1825–1888 |
| Total paid, 2021 $ | $562,477,042 (≈$560M) | Σ `DOUBLE-DEBT-IN-2021-USD` |
| Payment, % of GDP | e.g. 11.62% in 1840 (peak), 10.71% in 1826 | payment ÷ `EXCHANGE-RATE-FRANC-TO-USD` ÷ `HAITI-HISTORICAL-GDP` |
| Median payment, % of GDP | 2.47% over the 53 years with a recorded payment (2.02% counting zero years, 1826–1888) | median of the above |
| Double debt owed, % of GDP | 281.6% (1825), 304.5% (1826), 131.6% (1838); first below 50% in 1860 | `DOUBLE-DEBT-DRAWDOWN` ÷ fx ÷ GDP |
| 150M francs in 2021 $ | ≈$661.6M | 150M ÷ 5.43 × (814.3 ÷ 34): NYT formula with the 1825 rate and CPI. **Our calculation**, labelled as such on the site. |
| Modern external debt, % of GDP | e.g. 16.1% (2023), 3.9% (2024) | `DT.DOD.DECT.CD` ÷ `NY.GDP.MKTP.CD` |
| Modern peak, % of GDP | 45% (1993) | max of the above |
| Modern peak, US$ | $3,156.5M (2023) | max of `DT.DOD.DECT.CD` |
| Creditor groups (US$ M, each year 1970–2024) | Venezuela = BLAT@463; multilateral = MLAT; IMF = DIMF; other governments = BLAT@WLD − BLAT@463; private and short-term = PRVT + DPNG + DSTC | Same decomposition as `/workspace/haiti-debt/comparisons/build_cmp_data.py`. The script fails if the five groups differ from IDS DECT by > $0.05M; IDS DECT equals WDI DECT in every year. Missing Venezuela years count as 0. |
| Creditor shares (Breakdown 100%) | Peak shares: Venezuela 77.9% (2017), multilateral 79.9% (2005), IMF 59.2% (2024), other governments 83.3% (1974), private and short-term 27.1% (1982) | group ÷ DECT. On the site, shares are of the *checked* groups only |
| Venezuela over half of external debt | 13 years, 2011–2023 | count of years with Venezuela share > 50% (asserted) |
| Payments by category, 1826–1888 | indemnity 66,000,000 fr (≈59%); 1825 loan 41,124,111 fr (principal + interest, not split in the NYT file); late fees 5,199,365 fr (first recorded 1873) | Σ `PAYMENTS-INDEMNITY-FRANCS`, `PAYMENTS-1825-LOAN-FRANCS`, `LATE-FEES` |
| Largest single-year payment | 6,436,113 francs (1840) | max `PAYMENTS-DOUBLE-DEBT-FRANCS` |
| Henochsberg all-external-debt peak, % of GDP | 303.1% (1826) | digitized Fig. 14 ÷ fx ÷ GDP |

## Known gaps

- **No GDP 1916–1969.** Henochsberg stops in 1915; WDI GDP starts in 1960 and debt in 1970. The Maddison Project's real GDP per capita can't serve as a nominal denominator.
- **No annual debt series 1928–1947.** Receivership annual reports for 1929/30–1939/40 exist on HathiTrust (e.g. `uiug.30112109590676`) but automated access was blocked; they are the best next source.
- **No annual payment series after 1888** comparable to the NYT's (1875/1896/1910 loans, 1922 loans).
- **Henochsberg line is digitized** from a chart: ±1M francs, ±1 year.
- **2024 WB drop** ($3.16B → $0.94B) coincides with the PetroCaribe settlement, but the attribution is unverified.
- **Wikipedia gives 1883** for the end of the indemnity; the NYT data shows indemnity payments ending in 1878 and loan payments in 1888. The site uses the NYT.
- **Two units on one chart.** "Amount owed" over the full span shows francs (left axis, 1825–1915) and current US$ (right axis, 1970–2024), never converted into each other.
- **No creditor split before 1970.** The 19th-century breakdown is by payment category (indemnity / loan / late fees), from the NYT file.
- **IMF Historical Public Debt Database** was unreachable (403) during research.

## Design provenance (not data)

- Colors: the `C` palette in `/workspace/email-charts/gd_chart.py` (paper #F6F1EF, ink #2A2522, brand #E08484, story #7E3B35, context #C9ADA7, context2 #8C97A8, muted #6B625D, grid #E3DAD6, hairline #D9CFCB) plus the light tints in `/workspace/haiti-debt/hd_render_cmp.py` (context_lt #E4D3CF, context2_lt #C4CBD6). Creditor colors follow `make_charts_cmp.py`.
- Type: IBM Plex Sans Condensed (Medium/SemiBold/Bold/Medium Italic) and IBM Plex Sans, the same TTFs `gd_chart.py` loads from `~/.fonts`; subset to WOFF in `src/assets/fonts/` (SIL OFL 1.1). Annotation style "A" from `/workspace/email-charts/gd_annostyle.py`.
- Logo: `/workspace/email-charts/assets/gd-lockup-stacked.png` → `public/img/`.
