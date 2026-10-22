// FAN-OUT B (10-foot UI): at HUD size Large and Huge the screens run off the safe area, and off the screen.
// PLAN.md 8.18 / D23: the UI layer's scale is S (Standard), S + 1 (Large) or S + 2 (Huge), "never so big that
// 320 x 180 UI pixels no longer fit", and nothing falls outside the 5% safe area. Huge at 1080p and Large or Huge at
// 720p are exactly 320 x 180 UI pixels. tools/ui-audit.mjs and the UI gallery's self-test audit the Standard size only,
// so nobody saw that at 320 x 180:
//   - the phone (and each of its apps) is 198 UI px tall in a 180 px screen: its button legend ("OPEN  HANG UP") is
//     drawn at y = 185, below the bottom of the screen;
//   - the pause's MAP legend is 352 UI px wide on a 320 px screen (x = -16): cut off at both edges;
//   - the settings' tip under the list falls under the safe area and off the screen (y up to 194 of 180).
// The 1080p cases need no stand-in: a headless game's UI layer is 1920 x 1080 at S = 4. The 720p ones stand in a
// 1280 x 720 canvas for the layer (its _device(): what the page's canvas would report, S = 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

async function play() {
  const L = await loadGame({ hash: 'play', query: { time: 'day' } });
  L.game.advance(.5);
  const { game, gtm } = L, M = gtm.motor, app = { ui: gtm.ui, game, bindings: gtm.bindings }, U = gtm.ui.screens;
  const frame = () => { M.uiFrame(app, game.scene); return gtm.ui.record(); };
  const reset = () => { U.closeAll(); gtm.career.card = null; };
  return { ...L, M, app, U, frame, reset };
}
const offScreen = R => [...R.prompts, ...R.texts].filter(t => t.y + t.h > R.H || t.y < 0 || t.x < 0 || t.x + t.w > R.W).map(t => `"${t.s}" at ${Math.round(t.x)},${Math.round(t.y)} ${Math.round(t.w)}x${t.h}`);

test('HUD Huge at 1080p (320 x 180): the phone, the pause\'s map and the settings stay on the screen and in the safe area', async () => {
  const { game, gtm, M, app, U, frame, reset } = await play();
  game.settings.set('hudSize', 2);
  const bad = [];
  for (const [name, open] of [['phone', () => gtm.career.phone()], ['pause: map', () => U.open(game.scene.pauseScreen('map'))], ['settings: controls', () => U.open(M.settingsScreen(app, { tab: 0 }))]]) {
    reset(); open(); const R = frame(), audit = M.auditRecord(R), off = offScreen(R);
    if (audit.length || off.length) bad.push(`${name} (${R.W}x${R.H}): ${[...off.map(s => 'OFF THE SCREEN ' + s), ...audit].slice(0, 4).join(' | ')}`);
  }
  assert.deepEqual(bad, [], '\n' + bad.join('\n'));
});

test('HUD Large at 720p (320 x 180): the phone and the pause\'s map stay on the screen and in the safe area', async () => {
  const { game, gtm, M, U, frame, reset } = await play();
  gtm.ui.layer._device = () => ({ w: 1280, h: 720, S: 3, dpr: 1 });   // (a 1280 x 720 canvas, the engine's S = 3 there)
  game.settings.set('hudSize', 1);
  const bad = [];
  for (const [name, open] of [['phone', () => gtm.career.phone()], ['phone: contacts', () => gtm.career._contacts()], ['pause: map', () => U.open(game.scene.pauseScreen('map'))]]) {
    reset(); open(); const R = frame(), audit = M.auditRecord(R), off = offScreen(R);
    if (audit.length || off.length) bad.push(`${name} (${R.W}x${R.H}): ${[...off.map(s => 'OFF THE SCREEN ' + s), ...audit].slice(0, 4).join(' | ')}`);
  }
  assert.deepEqual(bad, [], '\n' + bad.join('\n'));
});
