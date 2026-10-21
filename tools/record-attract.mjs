// The attract mode captured for the README (PLAN.md M11): the built page in Chromium, its loop stopped and each frame
// stepped and drawn here at a fixed rate, the page shot frame by frame, then ffmpeg makes an MP4 and a GIF of it.
//   node tools/record-attract.mjs [--reel joyride] [--seed 2600] [--secs 20] [--fps 15] [--size 960x540] [--skip 2]
//     [--out docs/media/attract]  ->  <out>.mp4 and <out>.gif (needs ffmpeg on the PATH)
// --reel plays one reel over and over (#attract/<reel>); without it, the whole show from its start. --skip: seconds of
// the show stepped through before the first frame.
import { chromium } from 'playwright';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const reel = arg('reel', ''), seed = arg('seed', ''), secs = +arg('secs', 20), fps = +arg('fps', 15), skip = +arg('skip', 2), out = arg('out', 'docs/media/attract');
const [W, H] = arg('size', '960x540').split('x').map(Number);
if (spawnSync('ffmpeg', ['-version']).status !== 0) { console.error('record-attract: ffmpeg is not on the PATH'); process.exit(2); }
const dir = mkdtempSync(join(tmpdir(), 'attract-')), url = pathToFileURL(resolve('dist/index.html')).href + (seed ? '?seed=' + seed : '') + '#attract' + (reel ? '/' + reel : '');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(url); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
await page.evaluate(() => window.__gtm.game.stop());
await page.evaluate(s => { const g = window.__gtm.game; for (let t = 0; t < s; t += 1 / 30) g.advance(1 / 30); }, skip);
const n = Math.round(secs * fps);
for (let i = 0; i < n; i++) {
  await page.evaluate(dt => window.__gtm.game.advance(dt, { draw: true }), 1 / fps);
  await page.screenshot({ path: join(dir, `f${String(i).padStart(5, '0')}.png`) });
  if (i % fps === 0) process.stdout.write(`\r${(i / fps).toFixed(0)}/${secs} s`);
}
process.stdout.write('\n');
await browser.close();
const run = (args, what) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); if (r.status !== 0) { console.error('record-attract: ffmpeg failed making the ' + what); process.exit(1); } };
const frames = ['-framerate', String(fps), '-i', join(dir, 'f%05d.png')];
run([...frames, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', out + '.mp4'], 'MP4');
const gw = Math.min(W, 400);   // (the GIF smaller: a README's width, ten frames a second, 64 colours)
run([...frames, '-vf', `fps=${Math.min(fps, 10)},scale=${gw}:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`, out + '.gif'], 'GIF');
rmSync(dir, { recursive: true, force: true });
for (const f of [out + '.mp4', out + '.gif']) console.log(`wrote ${f} (${Math.round(statSync(f).size / 1024)} KB)`);
