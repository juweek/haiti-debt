#!/usr/bin/env node
// Headless screenshots for review: desktop 1280x800 and iPhone 390x844 @3x.
// Usage: npm run build && npm run shots   (writes process/*.png, public/og-image.png)
import { preview } from 'vite';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const OUT = new URL('../process/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.png')) unlinkSync(OUT + f);

const server = await preview({ preview: { port: PORT, strictPort: true, open: false }, logLevel: 'warn' });

const problems = [];
async function check(page, name) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('body *')]
      .filter((el) => { const b = el.getBoundingClientRect(); return b.width && (b.right > vw + 0.5 || b.left < -0.5); })
      .filter((el) => !el.closest('.visually-hidden'))
      .slice(0, 8).map((el) => `${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className} right=${Math.round(el.getBoundingClientRect().right)}`);
    // SVG text clipped by the chart box?
    const svg = document.querySelector('svg.chart');
    const clipped = [];
    if (svg) {
      const sb = svg.getBoundingClientRect();
      for (const t of svg.querySelectorAll('text')) {
        const b = t.getBoundingClientRect();
        if (!b.width) continue;
        if (b.left < sb.left - 0.5 || b.right > sb.right + 0.5 || b.top < sb.top - 0.5 || b.bottom > sb.bottom + 0.5) clipped.push(t.textContent.slice(0, 30));
      }
    }
    return { vw, sw: document.documentElement.scrollWidth, wide, clipped };
  });
  const ok = r.sw <= r.vw && r.wide.length === 0 && r.clipped.length === 0;
  console.log(`${ok ? '✓' : '✗'} ${name}: scrollWidth ${r.sw}/${r.vw}${r.wide.length ? ` → ${r.wide.join(', ')}` : ''}${r.clipped.length ? ` clipped: ${r.clipped.join(' | ')}` : ''}`);
  if (!ok) problems.push(name);
}

async function hoverYear(page, year, touch = false) {
  const svg = page.locator('svg.chart');
  await svg.scrollIntoViewIfNeeded();
  const box = await svg.boundingBox();
  const a = await svg.evaluate((el) => Object.fromEntries(['ml', 'iw', 'd0', 'd1', 'top', 'ph'].map((k) => [k, Number(el.dataset[k])])));
  const x = box.x + a.ml + ((year - a.d0 + 0.5) / (a.d1 - a.d0 + 1)) * a.iw;
  const y = box.y + a.top + a.ph * 0.5;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.move(x, y);
  await page.waitForTimeout(650);
}

// Each view: name + hash.
const VIEWS = [
  ['pct-full', 'y=1826&s=debt&m=pct&e=full'],
  ['raw-full', 'y=1838&s=debt&m=raw&e=full'],
  ['mix-full', 'y=2017&s=debt&m=mix&e=full'],
  ['raw-hist', 'y=1880&s=debt&m=raw&e=hist'],
  ['pct-modern', 'y=1993&s=debt&m=pct&e=modern'],
  ['mix-modern', 'y=2017&s=debt&m=mix&e=modern'],
  ['mix-modern-no-ven-imf', 'y=2017&s=debt&m=mix&e=modern&off=ven,imf'],
  ['raw-modern-no-ven-imf', 'y=2017&s=debt&m=raw&e=modern&off=ven,imf'],
  ['pay-raw', 'y=1840&s=pay&m=raw&e=full'],
  ['pay-pct', 'y=1840&s=pay&m=pct&e=full'],
  ['pay-mix', 'y=1875&s=pay&m=mix&e=full'],
  ['pay-mix-no-fees', 'y=1875&s=pay&m=mix&e=full&off=fees'],
];

async function shootViews(page, prefix, mobile) {
  for (const [name, hash] of VIEWS) {
    await page.goto(url('index.html', `${hash}`));
    await page.waitForSelector('svg.chart');
    await page.waitForTimeout(700);
    await check(page, `${prefix} ${name}`);
    await page.locator('section.hero-card').screenshot({ path: `${OUT}${prefix}-${name}.png` });
  }
}

// Navigating to a URL that differs only by hash does not reload the page, so add a query.
let nav = 0;
const url = (path, hash = '') => `${BASE}/${path}?v=${++nav}${hash ? `#${hash}` : ''}`;
const browser = await chromium.launch();
try {
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desk.goto(url('index.html', `y=1826`));
  await desk.waitForSelector('svg.chart');
  await desk.waitForTimeout(400);
  await desk.screenshot({ path: `${OUT}desktop-first-screen.png` });
  await desk.screenshot({ path: `${OUT}desktop-explorer-full.png`, fullPage: true });
  await shootViews(desk, 'desktop', false);
  // transition mid-frame (pct → mix) to confirm the tween runs
  await desk.goto(url('index.html', `y=2010&s=debt&m=pct&e=modern`));
  await desk.waitForSelector('svg.chart');
  await desk.waitForTimeout(800);
  await desk.getByRole('radio', { name: /Breakdown/ }).click();
  await desk.waitForTimeout(230);
  await desk.locator('section.hero-card').screenshot({ path: `${OUT}desktop-transition-midframe.png` });
  // tooltip on hover
  await desk.goto(url('index.html', `y=1826&s=debt&m=raw&e=full`));
  await desk.waitForSelector('svg.chart');
  await hoverYear(desk, 1840);
  await desk.locator('section.hero-card').screenshot({ path: `${OUT}desktop-hover-1840-raw.png` });
  await desk.goto(url('index.html', `y=2010&s=debt&m=mix&e=modern`));
  await desk.waitForSelector('svg.chart');
  await hoverYear(desk, 2009);
  await desk.locator('section.hero-card').screenshot({ path: `${OUT}desktop-hover-2009-mix.png` });
  await desk.getByRole('tab', { name: 'Lost growth' }).click();
  await desk.locator('section.cost').screenshot({ path: `${OUT}desktop-cost-lost-growth.png` });
  await desk.goto(url('sources.html'));
  await check(desk, 'desktop sources');
  await desk.screenshot({ path: `${OUT}desktop-sources-full.png`, fullPage: true });

  // Social card: the chart card alone (title + chart), controls hidden.
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(url('index.html', 'y=1888&s=debt&m=raw&e=full'));
  await og.waitForSelector('svg.chart');
  await og.addStyleTag({ content: `.site-header,.controls-block,.main-slider,.controls,.year-note,.source-block .src,.subhead{display:none!important}
    h1{font-size:40px!important;margin-bottom:6px!important}.card{padding-top:18px!important}.source-block{border:0!important;margin:0!important;padding:0!important;position:absolute;right:28px;top:18px}` });
  await og.waitForTimeout(600);
  await og.evaluate(() => window.scrollTo(0, 0));
  await og.screenshot({ path: new URL('../public/og-image.png', import.meta.url).pathname });

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const ph = await ctx.newPage();
  await ph.goto(url('index.html', `y=1826`));
  await ph.waitForSelector('svg.chart');
  await ph.waitForTimeout(400);
  await ph.screenshot({ path: `${OUT}iphone-first-screen.png` });
  await ph.screenshot({ path: `${OUT}iphone-explorer-full.png`, fullPage: true });
  await shootViews(ph, 'iphone', true);
  await ph.goto(url('index.html', `y=1826&s=debt&m=pct&e=full`));
  await ph.waitForSelector('svg.chart');
  await hoverYear(ph, 1922, true);
  await ph.locator('section.hero-card').screenshot({ path: `${OUT}iphone-tap-1922.png` });
  await ph.goto(url('index.html', `y=2010&s=debt&m=mix&e=modern&off=imf`));
  await ph.waitForSelector('svg.chart');
  await hoverYear(ph, 2015, true);
  await ph.locator('section.hero-card').screenshot({ path: `${OUT}iphone-tap-2015-mix-no-imf.png` });
  await ph.locator('.main-slider input').focus();
  await ph.keyboard.press('PageDown');
  await ph.waitForTimeout(650);
  await ph.locator('section.hero-card').screenshot({ path: `${OUT}iphone-keyboard-slider.png` });
  for (const tab of ['2021 dollars', 'Lost growth']) {
    await ph.getByRole('tab', { name: tab }).click();
    await ph.locator('section.cost').screenshot({ path: `${OUT}iphone-cost-${tab.replace(/\W+/g, '-').toLowerCase()}.png` });
  }
  await check(ph, 'iphone after interactions');
  await ph.getByRole('button', { name: 'KR' }).click();
  await ph.screenshot({ path: `${OUT}iphone-lang-kreyol-stub.png` });
  await ph.goto(url('sources.html'));
  await check(ph, 'iphone sources');
  await ph.screenshot({ path: `${OUT}iphone-sources-full.png`, fullPage: true });
} finally {
  await browser.close();
  await server.close();
}
if (problems.length) { console.error(`Problems in: ${problems.join(', ')}`); process.exit(1); }
console.log(`Screenshots in ${OUT}`);
