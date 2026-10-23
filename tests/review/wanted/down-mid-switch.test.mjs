// FAN-OUT B (M13), wanted and gangs: WRECKED (and NABBED) mid-switch. A switch is allowed with no stars (crew.js), and
// the switch camera takes about two seconds (up, across, down) while the one left behind stands idle in the street. If
// they go down meanwhile (a gang's members already on them: hostility needs no stars), play.js sets `down` from the
// possessed one (hero()) at that moment, the switch carries on and hands control over, and when the card ends
// respawn(kind) acts on hero() again: by then the protagonist switched TO. That one is cut to the hospital and billed;
// the one who actually went down is left dead in the street, and crew.canSwitch refuses them ('down') from then on (no
// free-roam path revives a protagonist: only a reload, or a mission that places them).
//   node --test tests/review/wanted/down-mid-switch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

// the game at the road cell nearest tile (tx, ty) (tests/sim/gangs.test.mjs's helper)
const at = async (tx, ty, q = {}) => {
  const g = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear', ...q } }), C = g.gtm.city; g.game.advance(1);
  let best = null; for (let r = 0; r < 20 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) if (C.surfaceAt(tx + dx, ty + dy) === 'road' && C.walkable(tx + dx, ty + dy)) best = [tx + dx, ty + dy];
  g.gtm.teleport((best[0] + .5) * 16, (best[1] + .5) * 16); g.game.advance(2); return g;
};
// a gang member put down on the sidewalks about d from the player, facing them (tests/sim/gangs.test.mjs's helper)
const member = (gtm, gang, d = 70) => {
  const C = gtm.life.crowd, g = gtm.motor.get('gangs', gang), P = gtm.crew.ped;
  const [m] = C.group({ n: 1, arch: [g.peds.grunt], rIn: 0, where: q => Math.abs(Math.hypot(q.x - P.x, q.y - P.y) - d) < 25 && gtm.city.map.ray({ x: q.x, y: q.y, z: 0 }, P, { eye: 18, target: 18 }).clear, tag: ped => { ped.gang = gang; } });
  assert.ok(m, 'a ' + gang + ' member put down'); m.ped.mover.facing = Math.atan2(P.y - m.ped.y, P.x - m.ped.x); return m.ped;
};
const quiet = gtm => { const C = gtm.life.crowd; for (const m of [...C.members]) C._drop(m); gtm.TUNE.gangHangout = 0; gtm.TUNE.gangPatrol = 0; gtm.TUNE.crowdDensity = 0; gtm.TUNE.gangCars = 0; };

test('Dex goes down while the switch camera flies to Viv (two hostile Saints on him, no stars): Dex is the one revived and billed, Viv is left where she was, and Dex can be switched back to', async () => {
  const { game, gtm } = await at(120, 60), G = gtm.life.gangs, crew = gtm.crew, W = gtm.life.wanted;
  quiet(gtm); game.advance(.5);
  const dex = crew.member('dex').ped, viv = crew.member('viv').ped;
  G.respect.saints = -60; member(gtm, 'saints', 70); member(gtm, 'saints', 90);
  game.advance(2);
  assert.ok(G.fighters.filter(f => f.target === dex).length >= 2, 'the Saints are on Dex'); assert.equal(W.stars, 0, 'no stars: a switch is allowed');
  const viv0 = [Math.round(viv.x), Math.round(viv.y)], fund0 = crew.fund;
  // the switch, as play.js's trySwitch asks it (wanted: the stars now, no mission)
  const r = crew.request('viv', { wanted: W.stars, mission: null, H0: 320 }, (m, fresh, to) => { if (fresh && to) m.ped.place(to[0], to[1], 0); });
  assert.ok(r.ok, 'the switch is under way');
  const log = []; for (const n of ['wrecked', 'switch', 'respawn', 'cash']) gtm.BUS.on(n, e => log.push({ n, t: +gtm.life.t.toFixed(2), ...e }), 'world');
  for (let t = 0; t < 10; t += .5) game.advance(.5);   // (the camera, the WRECKED card, the respawn)
  const H = gtm.city.poi('hospital'), atH = q => Math.hypot(q.x - H.x, q.y - H.y) < 60;
  const can = crew.canSwitch('dex', { wanted: W.stars });
  console.log(JSON.stringify({ active: crew.active, dex: { dead: dex.dead, at: [Math.round(dex.x), Math.round(dex.y)], atHospital: atH(dex) }, viv: { before: viv0, after: [Math.round(viv.x), Math.round(viv.y)], atHospital: atH(viv) }, fund: [fund0, crew.fund], canSwitchToDex: can, events: log }));
  assert.ok(log.some(e => e.n === 'wrecked'), 'Dex went down: the WRECKED card played');
  assert.ok(!dex.dead, 'the one who went down is revived (respawned at the hospital), not left dead in the street');
  assert.ok(!atH(viv), `Viv, who was never hurt, is not the one cut to the hospital (she was at ${viv0}, now ${Math.round(viv.x)},${Math.round(viv.y)})`);
  assert.ok(crew.active === 'dex' || can.ok, 'and Dex is played again, or the switch wheel can take the player back to him: ' + JSON.stringify(can));
});
