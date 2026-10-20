#!/usr/bin/env node
// Serve dist/ under the deploy subpath (vite.config.js base, /haiti-debt/) and load every
// page in headless Chrome. Fails on any 4xx/5xx response, failed request or page error.
// Usage: npm run build && npm run check:deploy
import { preview } from 'vite';
import { chromium } from 'playwright';

const PORT = 4183;
const server = await preview({ preview: { port: PORT, strictPort: true, open: false }, logLevel: 'warn' });
const base = server.config.base; // '/haiti-debt/'
const ROOT = `http://localhost:${PORT}${base}`;
const bad = [];
const seen = new Set();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('response', (r) => { seen.add(r.url()); if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => bad.push(`FAILED ${r.url()} (${r.failure()?.errorText})`));
  page.on('pageerror', (e) => bad.push(`PAGE ERROR ${e.message}`));
  for (const path of ['', 'index.html', 'sources.html']) {
    await page.goto(ROOT + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    // follow in-site links and the data downloads too
    const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
    for (const href of links) {
      const u = new URL(href);
      if (u.origin !== new URL(ROOT).origin) continue;
      u.hash = '';
      if (seen.has(u.href)) continue;
      const r = await page.request.get(u.href);
      seen.add(u.href);
      if (r.status() >= 400) bad.push(`${r.status()} ${u.href} (linked from /${path})`);
    }
    const og = await page.$eval('meta[property="og:image"]', (m) => m.content).catch(() => null);
    console.log(`✓ ${base}${path}  og:image=${og}`);
  }
  // the og image itself, at the local equivalent of its absolute URL
  const og = await page.request.get(`${ROOT}og-image.png`);
  if (og.status() !== 200) bad.push(`${og.status()} og-image.png`);
} finally {
  await browser.close();
  await server.close();
}
console.log(`${seen.size} URLs requested under ${base}`);
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('No 404s or errors.');
