// Language toggle stub. English is the only complete language for now.
// To translate: copy the `en` object into `ht` (Kreyòl ayisyen) or `fr` and
// translate the values. Missing keys fall back to English, so partial
// translations are safe. Numbers come from data, not from these strings.
import { createContext, useContext } from 'react';

export const LANGS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ht', label: 'Kreyòl ayisyen', short: 'KR' },
  { code: 'fr', label: 'Français', short: 'FR' },
];

const en = {
  kicker: 'Haiti’s Independence Debt',
  headline: 'Haiti paid for its freedom, year after year',
  dek: 'In 1825, France demanded 150 million francs from Haiti in exchange for recognizing its independence. Haiti paid France and its bankers until 1888, then paid off US loans until 1947. Since 1970 the World Bank has tracked who Haiti owes. Use the pills above the chart to switch measures, the boxes to turn categories on and off, and drag across the chart or use the slider to move through the years.',
  navExplorer: 'Explorer',
  navSources: 'Sources & method',
  langNotice: 'Translation coming soon. Showing English for now.',
  keyOwed: 'owed in 1826, as a share of Haiti’s whole economy',
  keyPeak: 'of GDP paid in the worst year',
  keyMedian: 'of GDP in a typical year of payments',
  keyTotal: 'paid in total, 1826–1888',
  timelineTitle: 'The debt, year by year',
  panelOwed: 'Debt still owed, % of GDP',
  panelPaid: 'Paid that year, % of GDP',
  legendDouble: 'Double debt (indemnity + 1825 loan)',
  legendExternal: 'All external debt, estimate',
  legendPaid: 'Payments on the double debt',
  sliderLabel: 'Year',
  prevEvent: 'Previous event',
  nextEvent: 'Next event',
  share: 'Share this year',
  copied: 'Link copied',
  costTitle: 'What it cost',
  costFrancs: 'Francs',
  costDollars: '2021 dollars',
  costGrowth: 'Lost growth',
  modernTitle: 'After 1947: Haiti’s external debt today',
  source: 'Source',
  sources: 'Sources',
  footer: 'Data: The New York Times (nytimes/haiti-debt), S. Henochsberg (2016), World Bank WDI and International Debt Statistics, and archival reports. Every number is listed on the',
};

const STRINGS = { en, ht: {}, fr: {} };

export const LangContext = createContext('en');
export function useT() {
  const lang = useContext(LangContext);
  return (key) => STRINGS[lang]?.[key] ?? en[key] ?? key;
}
export const isComplete = (lang) => Object.keys(en).every((k) => k in (STRINGS[lang] || {}));
