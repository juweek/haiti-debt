#!/usr/bin/env node
// Headless screenshots for review: desktop 1280x800 and iPhone 390x844 @3x.
// Usage: npm run build && npm run shots   (writes process/*.png, public/og-image.png)
import { preview } from 'vite';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/haiti-debt`; // vite.config.js base
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
    // Label-to-label collisions: any two visible SVG text boxes (or a text box and the
    // cursor year tag) that intersect by more than 1px. Lines/areas under a label are fine.
    const collide = [];
    if (svg) {
      const boxes = [...svg.querySelectorAll('text')]
        .filter((t) => t.textContent.trim() && getComputedStyle(t).visibility !== 'hidden' && Number(getComputedStyle(t).opacity) > 0)
        .map((t) => ({ t, label: t.textContent.slice(0, 28), b: t.getBoundingClientRect(), tag: !!t.closest('[pointer-events="none"]') && t.classList.contains('cursor-tag-text') }))
        .filter((o) => o.b.width);
      const tag = svg.querySelector('rect.cursor-tag');
      if (tag) boxes.push({ label: '[cursor tag]', b: tag.getBoundingClientRect(), isTag: true });
      const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i], B = boxes[j];
          // the tag's own year text sits inside the tag by design
          if ((A.isTag && B.t?.classList.contains('cursor-tag-text')) || (B.isTag && A.t?.classList.contains('cursor-tag-text'))) continue;
          if (hit(A.b, B.b)) collide.push(`"${A.label}" × "${B.label}"`);
        }
      }
    }
    return { vw, sw: document.documentElement.scrollWidth, wide, clipped, collide };
  });
  const ok = r.sw <= r.vw && r.wide.length === 0 && r.clipped.length === 0 && r.collide.length === 0;
  console.log(`${ok ? '✓' : '✗'} ${name}: scrollWidth ${r.sw}/${r.vw}${r.wide.length ? ` → ${r.wide.join(', ')}` : ''}${r.clipped.length ? ` clipped: ${r.clipped.join(' | ')}` : ''}${r.collide.length ? ` overlaps: ${r.collide.slice(0, 6).join(', ')}` : ''}`);
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
  ['pct-full-event-1838', 'y=1838&s=debt&m=pct&u=fr&e=full&sp=0'],
  ['pct-full-nonevent-1860', 'y=1860&s=debt&m=pct&u=fr&e=full&sp=0'],
  ['raw-francs-full', 'y=1838&s=debt&m=raw&u=fr&e=full&sp=0'],
  ['raw-usd-full', 'y=2017&s=debt&m=raw&u=usd&e=full&sp=0'],
  ['raw-usd-hist', 'y=1922&s=debt&m=raw&u=usd&e=hist&sp=0'],
  ['pct-modern', 'y=1993&s=debt&m=pct&u=fr&e=modern&sp=0'],
  ['share-modern', 'y=2017&s=debt&m=share&u=fr&e=modern&sp=1'],
  ['split-raw-usd-modern', 'y=2015&s=debt&m=raw&u=usd&e=modern&sp=1'],
  ['split-pct-full-no-ven-imf', 'y=2005&s=debt&m=pct&u=fr&e=full&sp=1&off=ven,imf'],
  ['nodata-1950', 'y=1950&s=debt&m=raw&u=usd&e=full&sp=0'],
  ['pay-raw', 'y=1840&s=pay&m=raw&u=fr&e=hist&sp=0'],
  ['pay-split', 'y=1875&s=pay&m=raw&u=fr&e=hist&sp=1'],
  ['pay-share', 'y=1875&s=pay&m=share&u=fr&e=hist&sp=1'],
  ['pay-pct-split-no-fees', 'y=1840&s=pay&m=pct&u=fr&e=hist&sp=1&off=fees'],
];

async function shootViews(page, prefix) {
  for (const [name, hash] of VIEWS) {
    await page.goto(url('index.html', hash));
    await page.waitForSelector('svg.chart');
    await page.waitForTimeout(800);
    await check(page, `${prefix} ${name}`);
    await page.locator('section.hero-card').screenshot({ path: `${OUT}${prefix}-${name}.png` });
  }
}

async function shootStates(page, prefix) {
  // hero at the top, then mid-scroll (card sliding over the sticky hero)
  await page.goto(url('index.html', 'y=1838'));
  await page.waitForSelector('svg.chart');
  await page.waitForTimeout(500);
  await check(page, `${prefix} hero top`);
  await page.screenshot({ path: `${OUT}${prefix}-hero-top.png` });
  await page.screenshot({ path: `${OUT}${prefix}-page-full.png`, fullPage: true });
  const heroH = await page.locator('header.hero').evaluate((el) => el.offsetHeight);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(heroH * 0.6));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}${prefix}-hero-scrolled-mid.png` });
  await page.evaluate((y) => window.scrollTo(0, y), heroH + 40);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}${prefix}-hero-scrolled-under.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  // Options open
  await page.locator('.opt-btn').click();
  await page.waitForTimeout(200);
  await check(page, `${prefix} options open`);
  await page.locator('section.hero-card').screenshot({ path: `${OUT}${prefix}-options-open.png` });
  // split morph mid-frame (turn split on from the options panel)
  await page.goto(url('index.html', 'y=2010&s=debt&m=raw&u=usd&e=modern&sp=0'));
  await page.waitForSelector('svg.chart');
  await page.waitForTimeout(700);
  await page.locator('.opt-btn').click();
  await page.locator('.opt-panel [role=switch]').click();
  await page.waitForTimeout(280);
  await page.locator('section.hero-card').screenshot({ path: `${OUT}${prefix}-split-morph-midframe.png` });
  await page.waitForTimeout(700);
  await check(page, `${prefix} split after morph`);
  // Play mid-sweep
  await page.goto(url('index.html', 'y=1825&s=debt&m=pct&u=fr&e=full&sp=0'));
  await page.waitForSelector('svg.chart');
  await page.waitForTimeout(500);
  await page.locator('button.play').click();
  await page.waitForTimeout(4200);
  await check(page, `${prefix} play mid-sweep`);
  await page.locator('section.hero-card').screenshot({ path: `${OUT}${prefix}-play-midsweep.png` });
  await page.locator('button.play').click();
}

// Navigating to a URL that differs only by hash does not reload the page, so add a query.
let nav = 0;
const url = (path, hash = '') => `${BASE}/${path}?v=${++nav}${hash ? `#${hash}` : ''}`;
const browser = await chromium.launch();
try {
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await shootStates(desk, 'desktop');
  await shootViews(desk, 'desktop');
  await desk.goto(url('index.html', 'y=1826&s=debt&m=raw&u=fr&e=full&sp=0'));
  await desk.waitForSelector('svg.chart');
  await hoverYear(desk, 1840);
  await check(desk, 'desktop-hover-1840');
  await desk.locator('section.hero-card').screenshot({ path: `${OUT}desktop-hover-1840.png` });
  await desk.goto(url('sources.html'));
  await check(desk, 'desktop sources');
  await desk.screenshot({ path: `${OUT}desktop-sources-full.png`, fullPage: true });

  // Social card: the chart card alone (title + chart), controls hidden.
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(url('index.html', 'y=1888&s=debt&m=pct&u=fr&e=full&sp=0'));
  await og.waitForSelector('svg.chart');
  await og.addStyleTag({ content: `.hero,.ctl,.scrubber,.controls,.year-note,.source-block .src,.subhead{display:none!important}
    .chart-title{font-size:40px!important;margin-bottom:6px!important}.card{padding-top:18px!important}.source-block{border:0!important;margin:0!important;padding:0!important;position:absolute;right:28px;top:18px}` });
  await og.waitForTimeout(600);
  await og.evaluate(() => window.scrollTo(0, 0));
  await og.screenshot({ path: new URL('../public/og-image.png', import.meta.url).pathname });

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const ph = await ctx.newPage();
  await shootStates(ph, 'iphone');
  await shootViews(ph, 'iphone');
  await ph.goto(url('index.html', 'y=1826&s=debt&m=pct&u=fr&e=full&sp=0'));
  await ph.waitForSelector('svg.chart');
  await hoverYear(ph, 1922, true);
  await check(ph, 'iphone-tap-1922');
  await ph.locator('section.hero-card').screenshot({ path: `${OUT}iphone-tap-1922.png` });
  await ph.locator('.main-slider input').focus();
  await ph.keyboard.press('PageUp');
  await ph.waitForTimeout(300);
  await check(ph, 'iphone-keyboard-1932');
  await ph.goto(url('sources.html'));
  await check(ph, 'iphone sources');
  await ph.screenshot({ path: `${OUT}iphone-sources-full.png`, fullPage: true });
} finally {
  await browser.close();
  await server.close();
}
if (problems.length) { console.error(`Problems in: ${problems.join(', ')}`); process.exit(1); }
console.log(`Screenshots in ${OUT}`);
