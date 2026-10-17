// Where the page's time goes, by function (dev tool): a CPU profile of the built page in headless Chromium for a few
// seconds, then the functions with the most self time. Native canvas work shows as drawImage, fillRect and so on.
//   node tools/cpu-profile.mjs '#play/bank-door' 'time=night' [seconds]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [hash, query = '', seconds = '4'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href + (query ? '?' + query : '') + hash);
  await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await page.waitForTimeout(+seconds * 1000);
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n]));
  const dt = profile.timeDeltas, samples = profile.samples; let total = 0;
  for (let i = 0; i < samples.length; i++) { const n = byId.get(samples[i]), cf = n.callFrame, key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + (dt[i] || 0)); total += dt[i] || 0; }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28);
  for (const [k, v] of top) console.log((v / 1000).toFixed(0).padStart(6) + ' ms ' + (100 * v / total).toFixed(1).padStart(5) + '%  ' + k);
} finally { await browser.close(); }
