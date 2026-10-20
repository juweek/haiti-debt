#!/usr/bin/env node
// Headless screenshots for review: desktop 1280x800 and iPhone 390x844 @3x.
// Usage: npm run build && npm run shots   (writes process/*.png, public/og-image.png)
import { preview } from 'vite';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const OUT = new URL('../process/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// Serves dist/ in-process (run `npm run build` first).
const server = await preview({ preview: { port: PORT, strictPort: true, open: false }, logLevel: 'warn' });

const problems = [];
async function checkOverflow(page, name) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('body *')]
      .filter((el) => { const b = el.getBoundingClientRect(); return b.width && (b.right > vw + 0.5 || b.left < -0.5); })
      .filter((el) => !el.closest('.visually-hidden'))
      .slice(0, 8).map((el) => `${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className} right=${Math.round(el.getBoundingClientRect().right)}`);
    return { vw, sw: document.documentElement.scrollWidth, wide };
  });
  const ok = r.sw <= r.vw && r.wide.length === 0;
  console.log(`${ok ? '✓' : '✗'} ${name}: scrollWidth ${r.sw} / viewport ${r.vw}${r.wide.length ? ` → ${r.wide.join(', ')}` : ''}`);
  if (!ok) problems.push(name);
}

// Scrub the main chart to a year by moving the pointer to its x position.
async function hoverYear(page, year) {
  const svg = page.locator('.explorer svg.timeline');
  await svg.scrollIntoViewIfNeeded();
  const box = await svg.boundingBox();
  const vw = page.viewportSize().width;
  const ml = box.width < 560 ? 36 : 46, mr = box.width < 560 ? 10 : 18;
  const x = box.x + ml + ((year - 1825) / (1947 - 1825)) * (box.width - ml - mr);
  const y = box.y + box.height * 0.45;
  await page.mouse.move(Math.min(x, vw - 1), y);
  await page.waitForTimeout(150);
}

const browser = await chromium.launch();
try {
  // ---- desktop
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desk.goto(`${BASE}/index.html#y=1826`);
  await desk.waitForSelector('svg.timeline');
  await checkOverflow(desk, 'desktop explorer');
  await desk.screenshot({ path: `${OUT}desktop-1280-explorer-full.png`, fullPage: true });
  await hoverYear(desk, 1840);
  await desk.locator('.explorer').screenshot({ path: `${OUT}desktop-1280-hover-1840.png` });
  await hoverYear(desk, 1922);
  await desk.locator('.explorer').screenshot({ path: `${OUT}desktop-1280-hover-1922.png` });
  await desk.getByRole('tab', { name: 'Lost growth' }).click();
  await desk.locator('section.cost').screenshot({ path: `${OUT}desktop-1280-cost-lost-growth.png` });
  await desk.goto(`${BASE}/sources.html`);
  await checkOverflow(desk, 'desktop sources');
  await desk.screenshot({ path: `${OUT}desktop-1280-sources-full.png`, fullPage: true });

  // ---- social card (1200x630)
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(`${BASE}/index.html`);
  await og.waitForSelector('svg.timeline');
  await og.evaluate(() => window.scrollTo(0, 0));
  await og.screenshot({ path: new URL('../public/og-image.png', import.meta.url).pathname });

  // ---- iPhone (real viewport: 390x844, DPR 3, mobile, touch)
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const ph = await ctx.newPage();
  await ph.goto(`${BASE}/index.html#y=1826`);
  await ph.waitForSelector('svg.timeline');
  await checkOverflow(ph, 'iphone explorer');
  await ph.screenshot({ path: `${OUT}iphone-390-explorer-full.png`, fullPage: true });
  await ph.screenshot({ path: `${OUT}iphone-390-first-screen.png` });
  // scrub with a touch tap on the chart at 1915, then keyboard on the slider
  const svg = ph.locator('.explorer svg.timeline');
  await svg.scrollIntoViewIfNeeded();
  const box = await svg.boundingBox();
  await ph.touchscreen.tap(box.x + 36 + ((1915 - 1825) / 122) * (box.width - 46), box.y + box.height * 0.5);
  await ph.waitForTimeout(150);
  await ph.locator('.explorer').screenshot({ path: `${OUT}iphone-390-scrubbed-1915.png` });
  await ph.locator('.explorer input[type=range]').focus();
  for (let i = 0; i < 4; i++) await ph.keyboard.press('PageDown');
  await ph.keyboard.press('ArrowRight');
  await ph.waitForTimeout(150);
  await ph.locator('.explorer').screenshot({ path: `${OUT}iphone-390-keyboard-1876.png` });
  for (const tab of ['2021 dollars', 'Lost growth']) {
    await ph.getByRole('tab', { name: tab }).click();
    await ph.locator('section.cost').screenshot({ path: `${OUT}iphone-390-cost-${tab.replace(/\W+/g, '-').toLowerCase()}.png` });
  }
  await ph.locator('section.modern').screenshot({ path: `${OUT}iphone-390-modern.png` });
  await checkOverflow(ph, 'iphone explorer after interactions');
  await ph.getByRole('button', { name: 'KR' }).click();
  await ph.screenshot({ path: `${OUT}iphone-390-lang-kreyol-stub.png` });
  await ph.goto(`${BASE}/sources.html`);
  await checkOverflow(ph, 'iphone sources');
  await ph.screenshot({ path: `${OUT}iphone-390-sources-full.png`, fullPage: true });
} finally {
  await browser.close();
  await server.close();
}
if (problems.length) { console.error(`Overflow in: ${problems.join(', ')}`); process.exit(1); }
console.log(`Screenshots in ${OUT}`);
