// The replay round-trip (PLAN.md 13 M1 proofs, 7.3): record a session of the built page with the engine's own recorder
// (?record=1: seed, frame times, inputs; a checksum every 60 frames that includes game.stateHash), drive the Cortez on
// the Proving Ground's pad (throttle, steering, a handbrake turn, a crash), save it, then replay it frame by frame in a
// fresh headless Chromium with the engine's tools/replay.mjs. Every checksum must match: the whole game, MOTOR's
// vehicles included, is deterministic.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = resolve('check-output/replay'), file = resolve(out, 'pad-session.json'); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(pathToFileURL(resolve('dist/index.html')).href + '?record=1#proving/pad');
await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
const hold = async (keys, ms) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); };
await hold(['KeyW'], 1200); await hold(['KeyW', 'KeyD'], 500); await hold(['KeyW', 'KeyA', 'Space'], 450); await hold(['KeyW'], 900); await hold(['KeyS'], 700); await hold(['KeyW', 'KeyD'], 1500);
const snap = await page.evaluate(() => window.__gtm.game.debug.snapshot());
const session = await page.evaluate(() => window.My3D2dge.session.save());
await browser.close();
writeFileSync(file, session);
const S = JSON.parse(session), fails = [];
const ok = (what, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + what + (cond ? '' : ': ' + detail)); if (!cond) fails.push(what); };
ok('the recording ran and the car moved', S.frames.length > 200 && snap.speed >= 0 && Math.hypot(snap.car[0] - 96, snap.car[1] - 1024) > 150, JSON.stringify(snap));
ok('the recording has checksums', (S.checks || []).length >= 3, String((S.checks || []).length));
let log, code = 0;
try { log = execFileSync(process.execPath, ['vendor/my-3d2dge/tools/replay.mjs', file, '--page', 'dist/index.html', '--out', out], { encoding: 'utf8', timeout: 120000 }); }
catch (e) { code = e.status || 1; log = (e.stdout || '') + (e.stderr || ''); }
console.log(log.trim().split('\n').map(l => '     ' + l).join('\n'));
ok('the replay matches every checksum', code === 0 && !/differ|diverg/i.test(log), 'exit ' + code);
ok('no page errors while recording', errors.length === 0, errors.join(' | '));
process.exit(fails.length ? 1 : 0);
