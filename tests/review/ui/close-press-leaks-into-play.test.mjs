// FAN-OUT B (10-foot UI): the button that closes a screen is also read by play in the same step.
// The pause's legend says "○ RESUME" (PLAN.md 8.18: ○ resumes) and the phone's "○ HANG UP"; app.ui.took is documented
// as "a screen had the step's input (the scene's controls read nothing of it)" (src/motor/app.js). But wrapScenes runs
// the scene's update in the very step the screen closed, and HumanController.update reads that step's taps in the
// onFoot / vehicle context, where ○ (Pad1) is ROLL and the DRIVE-BY. Resuming the pause with ○ rolls the protagonist;
// in a car with a gun it fires the gun (a 'shooting' crime); hanging up the phone with ○ does the same.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';
import { pad } from '../../fixtures/pads.mjs';

const CIRCLE = 1, TRIANGLE = 3, OPTIONS = 9, DPAD_UP = 12;

async function setup() {
  const pads = [pad(0)];
  const L = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0' }, pads });
  const { game, gtm } = L;
  game.advance(.5);
  const press = (b, secs = 1 / 30) => { pads[0] = pad(0, { pressed: [b] }); game.advance(secs); };
  const release = (secs = 1 / 30) => { pads[0] = pad(0); game.advance(secs); };
  const top = () => (gtm.ui.screens.top ? gtm.ui.screens.top.id : null);
  return { ...L, pads, press, release, top };
}
async function inCarWithSmg(S) {
  const { game, gtm, press, release } = S, p = gtm.crew.ped, F = gtm.fleet;
  const v = F.near(p.x, p.y, 3000).find(q => q.cls === 'car');
  const [x, y] = v.toWorld(0, -v.hw - 14); gtm.teleport(x, y); game.advance(.5);
  press(TRIANGLE); release(1.5);
  assert.ok(p.seat && p.seat.vehicle, 'set-up: in the car');
  p.inv.give('buzzsaw', 150, true); p.inv.select('buzzsaw'); game.advance(.5);
  const crimes = []; gtm.BUS.on('crime', e => { if (e.by === p.id) crimes.push(e.type); }, 'global');
  return { p, crimes };
}

test('resuming the pause with ○ does not make the protagonist roll', async () => {
  const S = await setup(), { gtm, press, release, top } = S, p = gtm.crew.ped;
  p.mover.facing = Math.PI / 2;   // (facing the open sidewalk: room for a roll)
  press(OPTIONS); release();
  assert.equal(top(), 'pause', 'Options opens our pause');
  press(CIRCLE, 1 / 120);   // ○: the pause's legend says RESUME
  assert.equal(top(), null, '○ resumed');
  const act = p.mover.action ? p.mover.action.name || String(p.mover.action) : null;
  assert.equal(act, null, `the ○ that resumed the game also rolled the protagonist (mover.action = ${act})`);
});

test('resuming the pause with ○ in a car fires no drive-by', async () => {
  const S = await setup(), { press, release, top } = S, { p, crimes } = await inCarWithSmg(S);
  const mag0 = p.inv.mag.buzzsaw;
  press(OPTIONS); release();
  assert.equal(top(), 'pause');
  press(CIRCLE, .1); release(.2);   // (a quick press of ○: a tenth of a second)
  assert.equal(top(), null, '○ resumed');
  const fired = mag0 - p.inv.mag.buzzsaw;
  assert.equal(fired, 0, `○ (RESUME) also pulled the drive-by trigger: ${fired} rounds fired, crimes: ${crimes.join(',') || 'none'}`);
});

test('hanging up the phone with ○ in a car fires no drive-by', async () => {
  const S = await setup(), { press, release, top } = S, { p, crimes } = await inCarWithSmg(S);
  const mag0 = p.inv.mag.buzzsaw;
  press(DPAD_UP); release();
  assert.equal(top(), 'phone', 'd-pad up opens the phone');
  press(CIRCLE, .1); release(.2);   // ○ HANG UP
  assert.equal(top(), null, 'hung up');
  const fired = mag0 - p.inv.mag.buzzsaw;
  assert.equal(fired, 0, `○ (HANG UP) also pulled the drive-by trigger: ${fired} rounds fired, crimes: ${crimes.join(',') || 'none'}`);
});
