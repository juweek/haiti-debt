// Source registry + hand-entered facts.
// Every number the site shows either comes from a CSV/JSON in data/raw/ (parsed by
// build-data.mjs) or is listed here with a `source` id. Keep this file and
// data/SOURCES.md in sync. Do not add a number without a source id.

export const SOURCES = {
  nyt_data: {
    title: 'The New York Times, "Historical data on Haiti\'s debt" (nytimes/haiti-debt), 2022',
    short: 'NYT dataset',
    url: 'https://github.com/nytimes/haiti-debt',
    note: 'haiti-double-debt.csv: payments, remaining double debt, GDP, exchange rate, CPI, 2021 USD. Non-commercial license, credit required.',
  },
  nyt_readme: {
    title: 'NYT haiti-debt README: "How we calculated the debt" and "History of payments"',
    short: 'NYT dataset notes',
    url: 'https://github.com/nytimes/haiti-debt/blob/main/README.md',
  },
  nyt_lost_growth: {
    title: 'The New York Times, "The Ransom" (May 20, 2022): timeline and lost-growth estimate',
    short: 'NYT, The Ransom',
    url: 'https://www.nytimes.com/interactive/2022/05/20/world/americas/enslaved-haiti-debt-timeline.html',
    note: 'Method described in the project bibliography: https://www.nytimes.com/2022/05/20/world/americas/haiti-bibliography.html',
  },
  nyt_wall_street: {
    title: 'The New York Times, "Invade Haiti, Wall Street Urged. The U.S. Obliged." (May 20, 2022)',
    short: 'NYT, Wall Street',
    url: 'https://www.nytimes.com/2022/05/20/world/haiti-wall-street-us-banks.html',
  },
  nyt_cic: {
    title: 'The New York Times, "How a French Bank Captured Haiti" (May 20, 2022)',
    short: 'NYT, CIC',
    url: 'https://www.nytimes.com/2022/05/20/world/french-banks-haiti-cic.html',
  },
  henochsberg: {
    title: 'S. Henochsberg, "Public Debt and Slavery: The Case of Haiti (1760–1915)", PSE master\'s thesis, Dec 2016',
    short: 'Henochsberg 2016',
    url: 'http://piketty.pse.ens.fr/files/Henochsberg2016.pdf',
    note: 'Source of the NYT GDP column. Fig. 14 (all outstanding external debt, p.29) was digitized from the PDF vector path, ±1M francs and ±1 year.',
  },
  receiver_1927: {
    title: 'Haiti, Annual Report of the Financial Adviser-General Receiver, FY1926–27, Table 52 "Public Debt", p.90',
    short: 'Receivership report 1927',
    url: 'https://haiti-now.org/wp-content/uploads/2017/05/Haiti-annual-report-1926.pdf',
  },
  frus_1922: {
    title: 'Foreign Relations of the United States, 1922, vol. II, docs 435–438',
    short: 'FRUS 1922',
    url: 'https://history.state.gov/historicaldocuments/frus1922v02/d437',
  },
  imf_1950: {
    title: 'IMF Staff Memorandum No. 546, "Economic Survey of Haiti" (Nov 28, 1950), §7 Debt, p.11',
    short: 'IMF 1950 survey',
    url: 'https://stoprdcom01e2.blob.core.windows.net/allfiles/IG/Production%20Hosting/Adlib/Public%20Documents/EB/163591.PDF',
  },
  wiki_indemnity: {
    title: 'Wikipedia, "Haitian independence debt"',
    short: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Haitian_independence_debt',
  },
  fordham: {
    title: 'Fordham International Law Journal (U.S. occupation and National City Bank history)',
    short: 'Fordham ILJ',
    url: 'https://ir.lawnet.fordham.edu/cgi/viewcontent.cgi?article=2899&context=ilj',
  },
  latimes_2003: {
    title: 'Los Angeles Times, "Quixotic Haiti Seeks French Restitution" (June 14, 2003)',
    short: 'LA Times 2003',
    url: 'https://www.latimes.com/archives/la-xpm-2003-jun-14-fg-haiti14-story.html',
  },
  wb_wdi: {
    title: 'World Bank WDI / International Debt Statistics, Haiti: DT.DOD.DECT.CD and NY.GDP.MKTP.CD',
    short: 'World Bank',
    url: 'https://api.worldbank.org/v2/country/HTI/indicator/DT.DOD.DECT.CD?format=json&per_page=100',
  },
  wb_ids: {
    title: 'World Bank, International Debt Statistics (IDS, source 6), Haiti: external debt stocks by creditor (DT.DOD.DECT.CD, DT.DOD.DIMF.CD, DT.DOD.MLAT.CD, DT.DOD.BLAT.CD incl. counterpart 463 = Venezuela, DT.DOD.PRVT.CD, DT.DOD.DPNG.CD, DT.DOD.DSTC.CD)',
    short: 'World Bank IDS',
    url: 'https://datatopics.worldbank.org/debt/ids/country/HTI',
    note: 'API: https://api.worldbank.org/v2/sources/6/country/HTI/series/{series}/counterpart-area/{WLD|463}/time/all?format=json. License CC BY 4.0.',
  },
  wb_hipc_2009: {
    title: 'World Bank press release, Haiti HIPC completion point (June 30, 2009)',
    short: 'World Bank 2009',
    url: 'https://documents1.worldbank.org/curated/en/985051645008298201/pdf/Announcement-of-Haiti-Gets-One-Billion-Two-Million-of-Debt-Relief-on-June-30-2009.pdf',
  },
  ustreas_2010: {
    title: 'U.S. Treasury press release tg796 (2010): IMF debt cancellation after the earthquake',
    short: 'US Treasury 2010',
    url: 'https://home.treasury.gov/news/press-releases/tg796',
  },
  imf_2024: {
    title: 'IMF Country Report 24/333 (2024 Article IV) and DSA: PetroCaribe settlement',
    short: 'IMF 2024',
    url: 'https://www.elibrary.imf.org/view/journals/002/2024/333/article-A003-en.xml',
  },
};

// Hand-entered figures (not in a CSV). value is numeric where possible.
export const FACTS = {
  indemnity_1825_francs: { value: 150e6, source: ['nyt_readme', 'wiki_indemnity'], label: 'Indemnity demanded by the 1825 ordinance' },
  indemnity_1838_francs: { value: 90e6, source: ['wiki_indemnity', 'nyt_readme'], label: 'Indemnity after the 1838 treaty' },
  loan_1825_francs: { value: 30e6, source: ['nyt_readme'], label: '1825 loan from French bankers' },
  loan_1825_commission_francs: { value: 6e6, source: ['nyt_readme'], label: 'Kept by the bankers as commission' },
  lost_growth_low_usd: { value: 21e9, source: ['nyt_lost_growth'], label: 'NYT lost-growth estimate, low' },
  lost_growth_high_usd: { value: 115e9, source: ['nyt_lost_growth'], label: 'NYT lost-growth estimate, high' },
  aristide_2003_usd: { value: 21685135571.48, source: ['latimes_2003'], label: 'Aristide\'s 2003 restitution demand' },
  gold_1914_usd: { value: 500000, source: ['nyt_wall_street'], label: 'Gold carried by US Marines to New York, Dec 1914' },
  loan_1922_series_a_usd: { value: 16e6, source: ['frus_1922'], label: '1922 Series A loan, 30-year 6% bonds' },
  bonds_1922_24_usd: { value: 23.7e6, source: ['imf_1950'], label: '1922–24 bond issues, total' },
  hipc_2009_usd: { value: 1.2e9, source: ['wb_hipc_2009'], label: 'HIPC + MDRI debt relief, 2009' },
  imf_2010_cancel_usd: { value: 268e6, source: ['ustreas_2010'], label: 'IMF debt cancelled after the 2010 earthquake' },
  petrocaribe_2024_forgiven_usd: { value: 1.69e9, source: ['imf_2024'], label: 'PetroCaribe debt forgiven by Venezuela, Jan 2024' },
};

// Timeline events, 1825–1947 (main chart) and the modern chart.
export const EVENTS = [
  { year: 1825, id: 'ordinance', short: 'Ordinance', title: 'Charles X’s ordinance',
    text: 'France demands 150 million francs to “compensate” former colonists, people they had enslaved included. Warships arrive with the bill; President Boyer signs. Haiti borrows 30 million francs from French bankers, who keep 6 million as commission.',
    source: ['nyt_readme', 'wiki_indemnity'] },
  { year: 1826, id: 'treasury', short: 'Treasury shipped', title: 'The treasury is emptied',
    text: 'Haiti ships the coins in its treasury to France to make the first installment.',
    source: ['nyt_readme'] },
  { year: 1838, id: 'reduction', short: 'Cut to 90M', title: 'Bill cut to 90 million francs',
    text: 'A new treaty reduces the indemnity to 90 million francs and France recognizes Haiti’s independence. Payments continue.',
    source: ['nyt_readme', 'wiki_indemnity'] },
  { year: 1875, id: 'cic', short: 'CIC loan', title: 'The CIC loan',
    text: 'Haiti takes a new French loan, arranged by the bank Crédit Industriel et Commercial (CIC), to pay off the last of the original debt.',
    source: ['wiki_indemnity', 'nyt_cic'] },
  { year: 1888, id: 'last', short: 'Last payment', title: 'Last double-debt payment',
    text: 'A final small payment of interest and late fees closes the double debt. In all, the NYT counts about 112 million francs paid.',
    source: ['nyt_readme', 'nyt_data'] },
  { year: 1914, id: 'gold', short: 'Gold seized', title: 'US Marines take the gold',
    text: 'In December 1914, US Marines carry $500,000 in gold from Haiti’s national bank to National City Bank’s vault in New York.',
    source: ['nyt_wall_street'] },
  { year: 1915, id: 'invasion', short: 'US invasion', title: 'The US invades',
    text: 'The United States invades Haiti. By 1920, National City Bank owns Haiti’s national bank outright.',
    source: ['fordham', 'nyt_wall_street'] },
  { year: 1922, id: 'loans1922', short: 'US loans', title: 'The 1922 loans',
    text: 'National City issues new US loans (Series A: $16 million in 30-year 6% bonds) that refinance Haiti’s older debts. The 1922–24 issues total $23.7 million.',
    source: ['frus_1922', 'imf_1950'] },
  { year: 1947, id: 'payoff', short: 'Paid off', title: 'The US loans are paid off',
    text: 'Haiti finishes repaying the foreign debt from the 1922 loans.',
    source: ['imf_1950'] },
];

export const MODERN_EVENTS = [
  { year: 2003, id: 'aristide', short: 'Aristide demand', title: 'Aristide’s demand',
    text: 'President Jean-Bertrand Aristide asks France to repay $21,685,135,571.48. France rejects it.',
    source: ['latimes_2003'] },
  { year: 2009, id: 'hipc', short: 'HIPC relief', title: 'HIPC debt relief',
    text: 'Haiti reaches the HIPC completion point: about $1.2 billion of relief from HIPC and MDRI.',
    source: ['wb_hipc_2009'] },
  { year: 2010, id: 'quake', short: 'Quake relief', title: 'Earthquake debt relief',
    text: 'After the January 2010 earthquake, the IMF cancels $268 million of Haiti’s debt; other lenders follow.',
    source: ['ustreas_2010'] },
  { year: 2024, id: 'petrocaribe', short: 'PetroCaribe deal', title: 'PetroCaribe settlement',
    text: 'In January 2024 Haiti pays $500 million and Venezuela forgives $1.69 billion of PetroCaribe debt.',
    source: ['imf_2024'] },
];
