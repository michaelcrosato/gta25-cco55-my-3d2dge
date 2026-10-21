// The sound in a real browser (PLAN.md 8.17's Accept), headless Chromium with the autoplay flag: the audio graph builds
// with no errors; each station's first 10 s, rendered offline by MOTOR's sequencer, is not silent; the radio plays
// through the engine's music bus, so mute and the volume hold for it; and over a soak (--secs, 20 s here, 600 s in
// test:full) the live voices and AudioX's voices stay bounded.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const secs = +(process.argv[process.argv.indexOf('--secs') + 1] || 20) || 20;
const url = pathToFileURL(resolve('dist/index.html')).href, fails = [];
const ok = (what, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + what + (cond && !detail ? '' : ': ' + detail)); if (!cond) fails.push(what); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url + '#play'); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 15000 });
await page.keyboard.press('KeyV'); await page.keyboard.press('KeyV'); await page.keyboard.press('KeyV');   // (a key: the browser's gesture; three turns of the view back to ISO)
// each station's first 10 s, offline
const rms = await page.evaluate(async () => {
  const M = window.__gtm.motor, out = {}, R = new M.Radio({ stations: M.all('stations'), ads: Object.fromEntries(M.all('radioAds').map(a => [a.id, a])), seed: 1 });
  for (const st of M.all('stations')) {
    const off = new OfflineAudioContext(1, 44100 * 10, 44100), S = new M.Sequencer(off, off.destination), seg = R.timelines.get(st.id).segs[0];
    S.play(seg.song, { t0: 0, loop: true }); S.schedule(0, 10);
    const d = (await off.startRendering()).getChannelData(0); let e = 0; for (let i = 0; i < d.length; i++) e += d[i] * d[i];
    out[st.id] = +Math.sqrt(e / d.length).toFixed(4);
  }
  return out;
});
for (const [id, v] of Object.entries(rms)) ok(`${id}: its first 10 s rendered offline is not silent`, v > .01, 'RMS ' + v);
// in a car with the radio on: the graph built, the radio heard on the music bus
await page.evaluate(() => { const g = window.__gtm, P = g.crew.ped, v = g.fleet.vehicles.filter(q => !q.driver && q.cls === 'car').sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.place(v.x + 18, v.y); });
await page.waitForTimeout(300); await page.keyboard.press('KeyE'); await page.waitForTimeout(2500);
const seated = await page.evaluate(() => { const v = window.__gtm.crew.ped.seat && window.__gtm.crew.ped.seat.vehicle; if (v) v.radio = 'crash'; return !!v; });
ok('in a car', seated);
const level = () => page.evaluate(() => new Promise(done => {
  const A = window.__gtm.game.audio, an = A.ctx.createAnalyser(); an.fftSize = 2048; A.bus('music').connect(an);
  const buf = new Float32Array(an.fftSize); let peak = 0, n = 0;
  const t = setInterval(() => { an.getFloatTimeDomainData(buf); let e = 0; for (const x of buf) e += x * x; peak = Math.max(peak, Math.sqrt(e / buf.length)); if (++n >= 20) { clearInterval(t); an.disconnect(); done(+peak.toFixed(4)); } }, 50);
}));
await page.waitForTimeout(800);
const st0 = await page.evaluate(() => ({ ready: window.__gtm.game.audio.ready, stats: window.__gtm.sound.stats() }));
ok('the audio graph is up', st0.ready && !!st0.stats, JSON.stringify(st0));
const on = await level(); ok('the radio is heard on the engine\'s music bus', on > .005, 'peak RMS ' + on);
await page.evaluate(() => window.__gtm.game.settings.set('sound', false));
const master = await page.evaluate(() => window.__gtm.game.audio.bus('master').gain.value);
ok('mute: the master bus everything goes through is silent', master === 0, 'master gain ' + master);
await page.evaluate(() => { const S = window.__gtm.game.settings; S.set('sound', true); S.set('radio', 0); });
await page.waitForTimeout(600); const quiet = await level();
ok('the radio\'s own volume holds', quiet < on * .2, `at 0: ${quiet} against ${on}`);
await page.evaluate(() => window.__gtm.game.settings.set('radio', .8));
// the soak: driving about with the radio on; the voices sampled each second
const samples = [];
await page.keyboard.down('KeyW');
for (let i = 0; i < secs; i++) { await page.waitForTimeout(1000); if (i % 6 === 3) { await page.keyboard.down('KeyA'); await page.waitForTimeout(400); await page.keyboard.up('KeyA'); } samples.push(await page.evaluate(() => window.__gtm.sound.stats())); }
await page.keyboard.up('KeyW');
const half = Math.floor(samples.length / 2), peak = l => Math.max(...l.map(s => s.voices + s.engines + s.sirens + s.beds));
ok(`over ${secs} s the live voices stay bounded`, samples.every(s => s.voices <= 64 && s.engines <= 4 && s.sirens <= 3 && s.beds <= 4), JSON.stringify(samples[samples.length - 1]));
ok('and don\'t grow', peak(samples.slice(half)) <= peak(samples.slice(0, half)) + 12, `first half ${peak(samples.slice(0, half))}, second ${peak(samples.slice(half))}`);
ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
process.exit(fails.length ? 1 : 0);
