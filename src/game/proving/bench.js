// The mission bench (PLAN.md 8.23): one tiny job per kind of objective, in the Proving Ground's lab, each played by the
// mission bot from its hints alone (the bench zone runs them in turn and its self-test wants every one passed). They pay
// nothing and are never recorded (def('bench', ...): a reel's terms). The lab is 64 x 64 tiles: three avenues each way
// (centre lines at 136, 504 and 872), the safehouse door at (312, 408), the clinic's at (680, 408), the precinct's at
// (312, 600).
import { defBench } from '../../motor/index.js';

const HOME = [312, 408];
// each job starts from the safehouse door on foot, the stars gone, and takes its car away with it when it passes (one
// left at the wheel is the world's: the next job's car would be spawned on top of it at the one curb)
const start = m => { m.wanted.clear(); m.place('player', HOME); };
const job = (id, title, op, play, setup = () => {}, time = 120) => defBench(id, { title, op, time, stages: [{ id: 'go', setup(m) { start(m); setup(m); },
  *run(m) { yield* play(m); for (const v of m.tagged('car')) m.remove(v); } }] });
// a parked car beside the door (a job's own: put back at the curb on a retry), the player at its wheel
const car = (m, def = 'cortez') => { const at = m.curb([360, 420]); const v = m.ensure.vehicle('car', def, at, { heading: at.heading }); return v; };

job('bench_reach', 'REACH', 'reach', function* (m) { yield m.reach('hospital', { text: 'Walk to the clinic', foot: true }); });
job('bench_enter', 'ENTER', 'enter', function* (m) { yield m.enter('car', { text: 'Get in the car' }); }, m => { car(m); });
job('bench_deliver', 'DELIVER', 'deliver', function* (m) {
  yield m.enter('car');
  const to = m.lane([760, 504], 0);
  yield m.deliver({ what: 'car', to: [to.x, to.y], text: 'Take the car east along Centre Avenue' });
}, m => { car(m); });
job('bench_follow', 'FOLLOW', 'follow', function* (m) {
  yield m.enter('car');
  yield m.follow('lead', { text: 'Follow the van round the block', until: mm => mm.stageTime > 25, lose: 520, grace: 8 });
}, m => {
  car(m);
  const pts = [m.lane([320, 136], 0), m.lane([504, 320], Math.PI / 2), m.lane([320, 504], Math.PI), m.lane([136, 320], -Math.PI / 2)].map(q => [q.x, q.y]);
  const at = m.lane([400, 504], Math.PI);
  m.spawn.vehicle('hauler', at, { tag: 'lead', heading: at.heading, driver: 'docker', drive: { route: [pts[2], pts[3], pts[0], pts[1]], loop: true, style: 'calm' } });
});
job('bench_chase', 'CHASE', 'chase', function* (m) { yield m.chase('runner', { text: 'Stop the runner' }); }, m => {
  m.loadout({ weapons: ['snub38'], ammo: { snub38: 60 }, select: 'snub38' });
  m.spawn.ped('skater', [HOME[0] + 90, HOME[1] - 10], { tag: 'runner', role: 'flee', health: 30 });
});
job('bench_kill', 'KILL', 'kill', function* (m) { yield m.kill('foe', { text: 'Take them out' }); }, m => {
  m.loadout({ weapons: ['snub38'], ammo: { snub38: 60 }, select: 'snub38' });
  for (const dx of [110, 140]) m.spawn.ped('saint-grunt', [HOME[0] + dx, HOME[1] - 6], { tag: 'foe', role: 'enemy', attack: true, health: 30, weapons: ['fists'] });
});
job('bench_protect', 'PROTECT', 'protect', function* (m) {
  yield m.protect('friend', { text: 'Keep your friend safe for a while', until: mm => mm.stageTime > 12 });
}, m => { m.spawn.ped('office', [HOME[0] + 20, HOME[1]], { tag: 'friend', role: 'ally', health: 200 }); });
job('bench_collect', 'COLLECT', 'collect', function* (m) { yield m.collect('parcel', { text: 'Pick up the three parcels' }); }, m => {
  for (const [dx, dy] of [[70, 0], [150, 4], [100, -40]]) m.spawn.pickup('item', [HOME[0] + dx, HOME[1] + dy], { tag: 'parcel', item: 'parcel' });
});
job('bench_photo', 'PHOTO', 'photo', function* (m) { yield m.photo([HOME[0] + 100, HOME[1]], { text: 'Snap the corner', from: [HOME[0] + 20, HOME[1]] }); }, m => {
  m.loadout({ weapons: ['snap'], select: 'snap' });
});
job('bench_evade', 'EVADE', 'evade', function* (m) {   // (in a car, across town first: the precinct is next door to the safehouse)
  yield m.enter('car');
  const far = m.lane([872, 300], Math.PI / 2);
  yield m.reach([far.x, far.y], { text: 'Across town, to East Avenue', radius: 60 });
  m.wanted.set(1); yield m.evade({ text: 'Lose the star' });
}, m => { m.allowWanted(); car(m, 'zephyr'); }, 240);
job('bench_race', 'RACE', 'race', function* (m) {
  yield m.enter('car');
  const line = [m.lane([320, 504], Math.PI), m.lane([136, 320], -Math.PI / 2), m.lane([320, 136], 0), m.lane([504, 320], Math.PI / 2)].map(q => [q.x, q.y]);
  yield m.race(line, { text: 'Round the block: the checkpoints in turn' });
}, m => { car(m, 'zephyr'); });
job('bench_timer', 'TIMER', 'timer', function* (m) { m.timer(45, { reason: 'too slow' }); yield m.reach('hospital', { text: 'To the clinic before the clock runs out', foot: true }); });
job('bench_choice', 'CHOICE', 'choice', function* (m) {
  const c = yield m.choice([{ id: 'north', text: 'NORTH' }, { id: 'south', text: 'SOUTH' }], { title: 'WHICH WAY?', bot: 'south' });
  yield m.reach(c === 'south' ? 'precinct' : [HOME[0], HOME[1] - 150], { text: c === 'south' ? 'South, to the precinct' : 'North', foot: true });
});
