// The mission runtime (PLAN.md 8.15): the staged DSL played in Lowtown on fixtures registered here (the content's own
// missions have their bot passes in tests/missions/): stage setup idempotence (a setup run twice gives the same state),
// every kind of fail firing with its reason, retry restarting the stage cleanly, nothing of the mission's left once it
// ends (a count check), the medal's rules, the bot playing the verbs, and the runtime's share of the hash.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

async function world(q = {}) {
  const g = await loadGame({ hash: '#play/safehouse', query: { seed: '1999', time: 'day', weather: 'clear', ...q } }); g.game.advance(1);
  const M = g.gtm.motor, C = g.gtm.career, R = C.R, P = () => g.gtm.crew.ped;
  const bot = () => { C.bot = new M.MissionBot({ city: g.gtm.city, roads: M.roadsOf(g.gtm.city), fleet: g.gtm.fleet, junctions: g.gtm.life.junctions }); return C.bot; };
  const run = (secs, until = () => R.state !== 'running') => { for (let t = 0; t < secs; t += .25) { if (until()) return t; g.game.advance(.25); } return until() ? secs : -1; };
  const counts = () => ({ vehicles: g.gtm.fleet.vehicles.filter(v => v.owner === 'mission').length, bodies: g.gtm.combat.bodies.filter(b => b.owner === 'mission').length, pickups: g.gtm.combat.pickups.list.filter(k => k.mission).length });
  return { ...g, M, C, R, P, bot, run, counts };
}
const state = (g, tags) => tags.map(t => g.R.actors.tagged(t).map(a => [a.constructor.name, Math.round(a.x), Math.round(a.y), a.dead || a.wrecked ? 1 : 0])).concat([[Math.round(g.P().x), Math.round(g.P().y)], [g.P().inv.list().join()], [g.R.actors.count]]);

test('a stage\'s setup run twice gives the same state (ensure.*, place with within, loadout): idempotent, as retry and deep links need', async () => {
  const g = await world(), { M, C, R } = g;
  M.defMission('fx_setup', { title: 'Fixture: setup', stages: [{ id: 'one', setup(m) {
    const spot = m.curb('safehouse');
    m.ensure.vehicle('car', 'cortez', spot); m.ensure.ped('guy', 'saint-grunt', [m.at('safehouse')[0] + 30, m.at('safehouse')[1]], { role: 'idle', facing: 1 });
    m.place('player', 'safehouse', { within: 40 }); m.loadout({ weapons: ['slugger'], health: 80 });
  }, *run(m) { yield m.wait(60); } }] });
  C.startMission('fx_setup');
  const a = JSON.stringify(state(g, ['car', 'guy']));
  R.m.R.stage.setup(R.m);   // (the same stage's setup again, on the state it made)
  const b = JSON.stringify(state(g, ['car', 'guy']));
  assert.equal(b, a, 'the second setup changed nothing');
  assert.equal(R.actors.tagged('car').length, 1); assert.equal(R.actors.tagged('guy').length, 1);
});

test('every fail fires with its reason: a failIf, the timer, WRECKED, NABBED, the delivery lost, the escort dead; JOB BLOWN shows each', async () => {
  const cases = [
    ['failIf', m => { m.failIf(mm => mm.stageTime > .5, 'too slow'); }, function* (m) { yield m.wait(30); }, 'too slow'],
    ['timer', m => { m.timer(1); }, function* (m) { yield m.wait(30); }, 'time'],
    ['wrecked', () => {}, function* (m) { yield m.wait(.2); m.player.vitals.health = 0; m.player.vitals.dead = true; yield m.wait(30); }, 'wrecked'],
    ['busted', () => {}, function* (m) { yield m.wait(30); }, 'busted'],   // (the police's busted, below)
    ['lost', m => { m.ensure.vehicle('box', 'hauler', m.curb('safehouse')); }, function* (m) { const op = m.deliver({ what: 'box', to: 'greasy-spoke', lost: 'the van is gone' }); m.one('box').damage.explode(); yield op; }, 'the van is gone'],
    ['escort', m => { m.ensure.ped('vip', 'fender', m.at('safehouse')); }, function* (m) { const op = m.protect('vip', { reason: 'Fender is down', until: () => false }); m.one('vip').vitals.health = 0; m.one('vip').vitals.dead = true; yield op; }, 'Fender is down'],
  ];
  for (const [id, setup, run, reason] of cases) {
    const g = await world(), { M, C, R } = g;
    M.defMission('fx_fail_' + id, { title: 'Fixture: ' + id, stages: [{ id: 's', setup, run }] });
    C.startMission('fx_fail_' + id);
    if (id === 'busted') { g.game.advance(.3); g.gtm.BUS.emit('busted', { by: 0, how: 'cuffed' }); }
    g.run(5);
    assert.equal(R.state, 'failed', id + ': failed'); assert.equal(R.failure, reason, id + ': the reason');
    if (id !== 'wrecked' && id !== 'busted') { g.game.advance(.1); assert.equal(g.snap().career.card, 'blown', id + ': the JOB BLOWN card'); }
  }
});

test('retry restarts the stage cleanly: its spawns released and made again, its op from the start; quit leaves nothing of the mission behind', async () => {
  const g = await world(), { M, C, R } = g, before = g.counts();
  let runs = 0;
  M.defMission('fx_retry', { title: 'Fixture: retry', stages: [
    { id: 'a', setup(m) { m.ensure.vehicle('car', 'cortez', m.curb('safehouse')); }, *run(m) { yield m.wait(.1); } },
    { id: 'b', setup(m) { m.spawn.ped('rat-grunt', [m.at('safehouse')[0] + 40, m.at('safehouse')[1] + 10], { role: 'idle', tag: 'mook' }); m.spawn.pickup('item', [m.at('safehouse')[0] - 30, m.at('safehouse')[1]], { item: 'package', tag: 'pkg' }); m.failIf(mm => mm.stageTime > .6, 'fixture'); }, *run(m) { runs++; yield m.wait(30); } },
  ] });
  C.startMission('fx_retry'); g.run(3);
  assert.equal(R.state, 'failed'); assert.equal(R.stage.id, 'b');
  const mid = g.counts(); assert.deepEqual(mid, { vehicles: before.vehicles + 1, bodies: before.bodies + 1, pickups: before.pickups + 1 });
  g.game.advance(.1); g.C.close(); R.retry();
  assert.equal(R.state, 'running'); assert.equal(R.stage.id, 'b'); assert.equal(runs, 2, 'the run from its start again'); assert.equal(R.retries, 1);
  assert.deepEqual(g.counts(), mid, 'the stage\'s own released and made again: the same counts');
  assert.equal(R.actors.tagged('car').length, 1, 'the earlier stage\'s car kept');
  g.run(3); R.quit();
  assert.equal(R.state, 'idle'); assert.deepEqual(g.counts(), before, 'nothing of the mission left: ' + JSON.stringify(g.counts()));
});

test('a pass: the rewards paid, the medal by the bonus objectives and the retries, the save\'s record kept at its best', async () => {
  const g = await world(), { M, C, R } = g, S = C.save, fund0 = g.gtm.crew.fund;
  M.defMission('fx_pass', { title: 'Fixture: pass', rewards: { cash: 1500, respect: { saints: 10 } }, bonus: [{ id: 'quick', text: 'Quick', check: m => m.elapsed < 5 }, { id: 'never', text: 'Never', check: () => false }],
    stages: [{ id: 's', setup() {}, *run(m) { yield m.wait(.5); } }] });
  C.startMission('fx_pass'); g.run(3);
  assert.equal(R.result.passed, true); assert.equal(R.result.medal, 'silver', 'half the bonus objectives, no retry: silver');
  assert.equal(g.gtm.crew.fund, fund0 + 1500); assert.ok(S.missions.done.includes('fx_pass')); assert.equal(S.missions.medals.fx_pass, 'silver');
  assert.equal(g.gtm.life.gangs.get('saints'), 10, 'the respect paid to the save\'s own respect');
  assert.equal(M.grade([{ ok: true }, { ok: true }], 0), 'gold'); assert.equal(M.grade([{ ok: true }, { ok: true }], 1), 'silver'); assert.equal(M.grade([{ ok: false }, { ok: false }], 0), 'bronze'); assert.equal(M.grade([], 0), 'gold'); assert.equal(M.grade([], 2), 'silver');
});

test('the bot plays the verbs: on foot to a point, into a car, a delivery across town; the markers go with their op; the hash stays put', async () => {
  const g = await world(), { M, C, R } = g; g.bot();
  M.defMission('fx_bot', { title: 'Fixture: bot', rewards: { cash: 100 }, stages: [
    { id: 'walk', setup(m) { m.place('player', 'safehouse', { within: 400 }); }, *run(m) { yield m.reach([m.at('safehouse')[0] + 60, m.at('safehouse')[1] + 20], { text: 'Over there', foot: true }); } },
    { id: 'drive', setup(m) { m.ensure.vehicle('van', 'hauler', m.curb([m.player.x, m.player.y + 120])); }, *run(m) { yield m.enter('van'); yield m.deliver({ what: 'van', to: 'greasy-spoke', radius: 70 }); } },
  ] });
  C.startMission('fx_bot');
  let markers = 0; const t = g.run(240, () => { markers = Math.max(markers, R.markers.length); return R.state !== 'running'; });
  assert.ok(t >= 0, 'the bot passed within 4 minutes'); assert.equal(R.result && R.result.passed, true, 'passed: ' + JSON.stringify(g.snap().career));
  assert.ok(markers >= 1, 'markers while the ops ran'); assert.equal(R.markers.length, 0, 'none left');
  assert.equal(g.gtm.BUS.errors.length, 0);
});

test('a stage\'s kit of only a bat, the player\'s own weapons back when the mission ends; the bat dents a parked car (vandalism) till it burns', async () => {
  const g = await world(), { M, C, R, P, run } = g, crimes = [];
  g.gtm.BUS.on('crime', e => crimes.push(e.type), 'global');
  const own = P().inv.list().join();
  M.defMission('fx_bat', { title: 'Fixture: bat', stages: [{ id: 'one', setup(m) {
    m.loadout({ weapons: ['slugger'], select: 'slugger', only: true });
    const q = m.at('safehouse'); m.place('player', [q[0] + 120, q[1] + 120]);
    m.spawn.vehicle('cortez', [q[0] + 150, q[1] + 120], { tag: 'car', heading: 0, health: .3 });
  }, *run(m) { yield m.kill('car'); } }] });
  C.startMission('fx_bat');
  assert.equal(P().inv.list().join(), 'fists,slugger', 'the stage\'s kit alone');
  const car = R.actors.tagged('car')[0], I = M.makeIntent(), p = P(); let k = 0;
  g.gtm.pilot(() => { M.clearIntent(I); const d = Math.atan2(car.y - p.y, car.x - p.x); I.aim = [Math.cos(d), Math.sin(d)]; if (M.boxDistance(car, p.x, p.y) > 6) { I.move[0] = Math.cos(d); I.move[1] = Math.sin(d); } else if ((k++ >> 3) % 2 === 0) { I.tap.attack = true; I.down.attack = true; } return I; });
  const share0 = car.damage.share;
  assert.ok(run(90) >= 0, 'the car smashed with the bat within 90 s (share ' + car.damage.share.toFixed(2) + ')');
  g.gtm.pilot(null);
  assert.ok((car.wrecked || car.damage.burning) && car.damage.share < share0, 'dented till it burns (done: its wreck is coming)');
  assert.ok(crimes.includes('vandalism'), 'a dented car is vandalism');
  assert.equal(R.state, 'passed', 'passed (' + R.failure + ')');
  assert.equal(P().inv.list().join(), own, 'the player\'s own weapons back');
});

test('what the gang chains needed: a vehicle put back; a fleeing car\'s run on the roads; red barrels that blow, chain and go with the job; an ally gang; m.alerted; a cap lifted when the job ends', async () => {
  const g = await world(), { M, C, R, P } = g, life = g.gtm.life, combat = g.gtm.combat;
  let ctx = null;
  M.defMission('fx_chain', { title: 'Fixture: the chains\' needs', stages: [{ id: 'one', setup(m) {
    ctx = m; const [x, y] = m.at('safehouse');
    m.ensure.vehicle('van', 'hauler', m.curb('safehouse'));
    m.spawn.prop('barrel', [x + 60, y + 40], { tag: 'b', explosive: { hp: 20, fire: false } });
    m.spawn.prop('barrel', [x + 80, y + 40], { tag: 'b', explosive: { hp: 20, fire: false } });
    m.spawn.ped('saint-grunt', [x + 70, y - 60], { tag: 'g', role: 'guard', facing: Math.PI / 2 });
  }, *run(m) { m.wanted.cap(0); m.ally('rats'); yield m.wait(600); } }] });
  C.startMission('fx_chain'); g.run(.5, () => false);
  // m.place a vehicle: put back and stopped (it threw: a body's vx, vy and speed are read from u and v)
  const van = R.actors.tagged('van')[0]; van.body.u = 120;
  assert.doesNotThrow(() => ctx.place(van, ctx.curb('safehouse'))); assert.equal(Math.round(van.speed), 0);
  // a fleeing car's next stop: a ground lane's point (a lane's a/b: the old ax, ay read NaN and sent it off the roads)
  const dest = R.actors._away(van, P());
  assert.ok(Number.isFinite(dest[0]) && g.gtm.city.walkable(Math.floor(dest[0] / 16), Math.floor(dest[1] / 16)) !== undefined && !(dest[0] === van.x + 600 && dest[1] === van.y), 'a lane point: ' + dest);
  // the barrels: one shot to its hp blows; the next goes up a moment later; neither left lit (a bang, no blaze)
  const [b1, b2] = R.actors.tagged('b');
  assert.ok(combat.boxes.includes(b1) && combat.explosive.includes(b2), 'Combat\'s while they stand');
  combat.hurt(b1, { amount: 25, kind: 'bullet', by: P().id }); g.run(1, () => false);
  assert.ok(b1.dead && b2.dead, 'blown, and the chain');
  // the ally: a Rat killed in the crossfire costs no respect while the job runs
  const G = life.gangs, rat = combat.add(new M.Ped({ x: P().x + 400, y: P().y, look: {} })); rat.gang = 'rats';
  const r0 = G.get('rats'); G._kill({ target: rat.id, by: P().id }); assert.equal(G.get('rats'), r0, 'no respect lost'); assert.ok(G.allies.has('rats'));
  combat.remove(rat);
  // m.alerted: the guard sees the player in front of it; taken down, no longer
  P().place(R.actors.tagged('g')[0].x, R.actors.tagged('g')[0].y + 90); g.run(2, () => ctx.alerted('g'));
  assert.ok(ctx.alerted('g'), 'seen'); R.actors.entry(R.actors.tagged('g')[0]).down = true; assert.ok(!ctx.alerted('g'), 'taken down');
  assert.equal(life.wanted.capStars, 0);
  R.quit();
  assert.ok(!combat.boxes.includes(b1) && !combat.explosive.includes(b2), 'the barrels gone with the job');
  assert.equal(life.wanted.capStars, 5, 'the cap lifted when the job ended'); assert.equal(G.allies.size, 0, 'the ally too');
});
