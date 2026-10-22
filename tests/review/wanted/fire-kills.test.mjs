// FAN-OUT B (M13), wanted and gangs (fed by combat, PLAN.md 8.12): a Molotov (the Party Starter: $150 at Lead Farm, no
// unlock) is a crime-free murder weapon. A throw files no crime (Combat.throwFrom files nothing, and a Molotov's blast is
// deliberately no 'explosion'); its splash files none (a hit is never a crime by itself); and the burning that does the
// killing is hurt with by: null (Combat.burnBody; Ped.ignite keeps no source), so the death is nobody's: the 'kill' and
// the 'murder' go out with by null. With an officer watching, the police file nothing (PLAN.md 8.13: assault, murder);
// a gang's member burned to death costs that gang nothing and earns its rival nothing (PLAN.md 8.14: -5 and +1). (The
// Hot Mess's afterburn, and anyone who walks into the fire, die the same way.)
//   node --test tests/review/wanted/fire-kills.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

const clearAround = (gtm, x, y, r) => { const C = gtm.life.crowd; for (const m of [...C.members]) if (Math.hypot(m.ped.x - x, m.ped.y - y) < r) C._drop(m); };
// one Molotov from the player, thrown at a body's feet (the mouse's ground point on it: no lock-on, nobody "aimed at")
function molotov(game, gtm, who) {
  const P = gtm.crew.ped, M = gtm.motor, I = M.makeIntent(); let n = 0;
  P.inv.give('partystarter', 5, true); P.inv.select('partystarter'); game.advance(.3);
  gtm.pilot(() => { M.clearIntent(I); I.aimPoint = [who.x, who.y, 0]; if (n++ === 1) { I.tap.attack = true; I.down.attack = true; } return I; });
  game.advance(1.5); gtm.pilot(null);
}
const listen = (gtm, names) => { const log = []; for (const n of names) gtm.BUS.on(n, e => log.push({ n, t: +gtm.life.t.toFixed(2), ...e }), 'world'); return log; };

test('a passer-by set alight by the player\'s Molotov burns to death in front of an officer: the death is the player\'s, a crime is filed, the stars come', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } }); game.advance(2);
  const P = gtm.crew.ped, W = gtm.life.wanted, C = gtm.life.crowd, M = gtm.motor;
  clearAround(gtm, P.x, P.y, 700);
  const log = listen(gtm, ['explode', 'hit', 'kill', 'crime', 'report']);
  const [m] = C.group({ n: 1, arch: ['office'], rIn: 0, where: q => { const d = Math.hypot(q.x - P.x, q.y - P.y); return d > 50 && d < 90 && q.x > P.x + 30; } });
  assert.ok(m, 'a passer-by 50-90 u off'); const V = m.ped; V.vitals.health = 30;   // (hurt already: one Molotov's fire is enough)
  // an officer 60 u behind the player, looking on (held at his post, as a roadblock's officer is: at no stars a lone
  // officer is otherwise handed to the crowd and walks off)
  const ax = V.x - P.x, ay = V.y - P.y, al = Math.hypot(ax, ay), Pol = gtm.life.police;
  const cop = Pol._newCop(M.get('peds', 'mpd'), P.x - ax / al * 60, P.y - ay / al * 60, 0); cop.mover.facing = Math.atan2(V.y - cop.y, V.x - cop.x); Pol._addCop(cop, { post: [cop.x, cop.y], block: { cars: [], cops: [] } });
  molotov(game, gtm, V);
  for (let t = 0; t < 8; t += .5) game.advance(.5);
  const kill = log.find(e => e.n === 'kill' && e.target === V.id), byPlayer = log.filter(e => e.n === 'crime' && e.by === P.id).map(e => e.type);
  const hits = log.filter(e => e.n === 'hit' && e.target === V.id), first = hits[0];
  console.log(JSON.stringify({ blast: log.find(e => e.n === 'explode'), firstHit: first && { by: first.by, kind: first.kind }, burnHits: hits.filter(e => e.by === null).length, kill, crimesByThePlayer: byPlayer, reports: log.filter(e => e.n === 'report').map(e => ({ crime: e.crime, by: e.by })), stars: W.stars, heat: W.heat }));
  assert.ok(V.dead && kill && kill.kind === 'fire', 'the passer-by burned to death');
  assert.equal(kill.by, P.id, 'the death is the player\'s (their Molotov lit them): kill.by');
  assert.ok(byPlayer.length > 0, 'a crime of the player\'s is filed for it');
  assert.ok(W.stars >= 1, 'and the officer who watched it brings the stars');
});

test('a hostile Saint, shooting at the player, set alight by the player\'s Molotov, burns to death: -5 with the Saints, +1 with the Gnomes', async () => {
  // (the game at the road cell nearest tile (120, 60), in Neon Mile: tests/sim/gangs.test.mjs's at())
  const g = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear' } }), { game, gtm } = g, Cm = gtm.city; game.advance(1);
  let best = null; for (let r = 0; r < 20 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) if (Cm.surfaceAt(120 + dx, 60 + dy) === 'road' && Cm.walkable(120 + dx, 60 + dy)) best = [120 + dx, 60 + dy];
  gtm.teleport((best[0] + .5) * 16, (best[1] + .5) * 16); game.advance(2);
  const G = gtm.life.gangs, P = gtm.crew.ped, C = gtm.life.crowd;
  for (const q of [...C.members]) C._drop(q); gtm.TUNE.gangHangout = 0; gtm.TUNE.gangPatrol = 0; gtm.TUNE.crowdDensity = 0; gtm.TUNE.gangCars = 0; game.advance(.5);
  G.respect.saints = -30;   // (hostile: a Saint in Neon who sees the player comes for them, and stands to shoot)
  const [m] = C.group({ n: 1, arch: ['saint-grunt'], rIn: 0, where: q => { const d = Math.hypot(q.x - P.x, q.y - P.y); return d > 60 && d < 100 && Cm.map.ray({ x: q.x, y: q.y, z: 0 }, P, { eye: 18, target: 18 }).clear; }, tag: ped => { ped.gang = 'saints'; } });
  assert.ok(m, 'a Saint 60-100 u off'); const S = m.ped; S.mover.facing = Math.atan2(P.y - S.y, P.x - S.x); S.vitals.health = 30;
  P.vitals.addArmor(100); game.advance(1.5);
  assert.ok(G.fighters.some(f => f.ped === S && f.target === P), 'the Saint is on the player');
  const log = listen(gtm, ['kill', 'respect', 'explode', 'hit']), before = { ...G.respect };
  molotov(game, gtm, S);
  for (let t = 0; t < 8 && !S.dead; t += .5) game.advance(.5);
  const kill = log.find(e => e.n === 'kill' && e.target === S.id), hits = log.filter(e => e.n === 'hit' && e.target === S.id);
  console.log(JSON.stringify({ blast: log.find(e => e.n === 'explode'), saintHits: { byPlayer: hits.filter(e => e.by === P.id).length, byNobody: hits.filter(e => e.by === null).length }, kill, before, after: { ...G.respect }, respect: log.filter(e => e.n === 'respect') }));
  assert.ok(S.dead && kill && kill.kind === 'fire', 'the Saint burned to death');
  assert.equal(G.get('saints'), before.saints - 5, 'the Saints: -5 for their member');
  assert.equal(G.get('gnomes'), before.gnomes + 1, 'the Gnomes: +1 (the Saints are their rival)');
});
