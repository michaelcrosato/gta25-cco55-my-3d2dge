// The bot gym (PLAN.md 8.15; D21, HANDOFF L2): one fixture mission per hint kind, and one per known limit of the bot,
// each played by the MissionBot (or through the pad) and reported passed or not with its time. It started as FAN-OUT
// A2's probe (docs/handoff/m8-a2/tools/); test:full runs it both ways. A limit the bot keeps (LIMITS, D34) is played and
// reported all the same, but its runs don't fail the gym: it measures how far off the bot is.
//   node tools/botgym.mjs [--only kill,race] [--pad] [--seeds 1,2,3] [--god] [--fine | --trace]  ·  exit 0 when every run
//   passed (--god: the bot and its ride take no harm, as the campaign plays, D29)
import { loadGame } from '../tests/harness.mjs';
import { pad as fakePad } from '../tests/fixtures/pads.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const only = arg('only', '') ? arg('only').split(',') : null, usePad = process.argv.includes('--pad'), god = process.argv.includes('--god'), seeds = (arg('seeds', arg('seed', '1'))).split(','), trace = process.argv.includes('--fine') ? 'fine' : process.argv.includes('--trace');
export const FIX = {
  walk: m => ({ stages: [{ id: 's', setup() {}, *run(m) { yield m.reach('greasy-spoke', { text: 'Walk to the diner', foot: true, radius: 30 }); } }] }),
  board: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('car', 'cortez', m.curb([m.player.x + 260, m.player.y + 200])); }, *run(m) { yield m.enter('car'); } }] }),
  deliver: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('van', 'hauler', m.curb([m.player.x + 120, m.player.y + 140])); }, *run(m) { yield m.enter('van'); yield m.deliver({ what: 'van', to: 'lead-farm', radius: 70, health: .5 }); } }] }),
  kill: m => ({ stages: [{ id: 's', setup(m) { const q = m.at('palm-park'); for (let i = 0; i < 2; i++) m.spawn.ped('rat-grunt', [q[0] + i * 30, q[1] + 20], { tag: 'mooks', role: 'enemy', alert: 200 }); m.loadout({ weapons: ['buzzsaw'], ammo: { buzzsaw: 300 }, select: 'buzzsaw', health: 100, armor: 100 }); }, *run(m) { yield m.kill('mooks', { text: 'Take out the Rats' }); } }] }),
  ram: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('mine', 'brute', m.curb([m.player.x + 100, m.player.y + 150])); m.spawn.vehicle('cortez', m.curb('greasy-spoke'), { tag: 'targets', health: .3 }); }, *run(m) { yield m.enter('mine'); yield m.kill('targets', { text: 'Wreck the Cortez' }); } }] }),
  bat: m => ({ stages: [{ id: 's', setup(m) { m.loadout({ weapons: ['slugger'], select: 'slugger' }); for (let i = 0; i < 2; i++) m.spawn.vehicle('saint', m.curb([m.player.x + 200 + i * 90, m.player.y + 100]), { tag: 'cars', health: .25 }); }, *run(m) { yield m.kill('cars', { text: 'Smash the Saints\' cars' }); } }] }),
  evade: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('car', 'zephyr', m.curb([m.player.x + 100, m.player.y + 140])); }, *run(m) { yield m.enter('car'); m.wanted.set(2); yield m.evade({ text: 'Lose the cops' }); } }] }),
  follow: m => ({ stages: [{ id: 'in', setup(m) { m.ensure.vehicle('mine', 'cortez', m.curb([m.player.x + 100, m.player.y + 140])); }, *run(m) { yield m.enter('mine'); } },   // (the mark pulls out once the player is at the wheel, as the missions' do)
    { id: 's', setup(m) { m.spawn.vehicle('saint', m.lane([m.player.x + 200, m.player.y]), { tag: 'mark', driver: 'saint-grunt', drive: { to: 'lead-farm', style: 'calm' } }); }, *run(m) { yield m.follow('mark', { text: 'Tail the Saint', to: 'lead-farm', radius: 120, lose: 500 }); } }] }),
  race: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('car', 'zephyr', m.curb([m.player.x + 100, m.player.y + 140])); }, *run(m) { yield m.enter('car'); const p = yield m.race([m.lane('greasy-spoke'), m.lane('palm-park'), m.lane('gas-n-sip')].map(q => [q.x, q.y]), { text: 'Race' }); m.data.place = p; } }] }),
  photo: m => ({ stages: [{ id: 's', setup(m) { m.loadout({ weapons: ['snap'] }); m.spawn.ped('fender', [m.at('palm-park')[0], m.at('palm-park')[1] + 30], { tag: 'vip', facing: 0 }); }, *run(m) { yield m.photo('vip', { text: 'Snap Father Fender', from: m.at('palm-park') }); } }] }),
  stealth: m => ({ stages: [{ id: 's', setup(m) { const q = m.at('palm-park'); m.spawn.ped('saint-grunt', [q[0] + 120, q[1]], { tag: 'g', role: 'guard', facing: Math.PI / 2 }); }, *run(m) { const q = m.at('palm-park'); m.objective('Sneak past', { hint: { kind: 'stealth', path: [[q[0], q[1] - 150], [q[0] + 60, q[1] - 150], [q[0] + 200, q[1] - 150]] } }); yield m.waitUntil(mm => mm.dist([q[0] + 200, q[1] - 150]) < 20); } }] }),
  tow: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('truck', 'hookline', m.curb([m.player.x + 100, m.player.y + 140])); m.ensure.vehicle('car', 'cortez', m.curb([m.player.x + 500, m.player.y + 140])); }, *run(m) { m.objective('Tow it to the diner', { hint: { kind: 'deliver', what: 'car', to: m.at('greasy-spoke'), tow: 'truck' } }); yield m.waitUntil(mm => { const c = mm.one('car'); return c && c.towedBy && Math.hypot(c.x - mm.at('greasy-spoke')[0], c.y - mm.at('greasy-spoke')[1]) < 140; }); } }] }),
  spray: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('truck', 'pumper', m.curb([m.player.x + 100, m.player.y + 140])); const f = m.lane('greasy-spoke'); m.data.fire = [f.x + 30, f.y]; m.fire(m.data.fire, 16, 60); }, *run(m) { yield m.enter('truck'); m.objective('Put it out', { hint: { kind: 'goto', at: m.data.fire, spray: m.data.fire, reach: 100 } }); yield m.waitUntil(mm => mm.heat(mm.data.fire, 24) < .05); } }] }),
  // the known limits (HANDOFF L2, D34): three stars with the Eye up, a long truck through the corners to the Gnomes' HQ,
  // a passer-by who keeps swinging at the bot on its way
  evade3: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('car', 'zephyr', m.curb([m.player.x + 100, m.player.y + 140])); }, *run(m) { yield m.enter('car'); m.wanted.set(3); yield m.evade({ text: 'Lose the cops' }); } }] }),
  haul: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('truck', 'brute', m.curb([m.player.x + 120, m.player.y + 140])); }, *run(m) { yield m.enter('truck'); yield m.deliver({ what: 'truck', to: 'gnomes-hq', radius: 80 }); } }] }),
  passerby: m => ({ stages: [{ id: 's', setup(m) { m.spawn.ped('docker', [m.player.x + 24, m.player.y + 10], { tag: 'tough', role: 'enemy', alert: 200, health: 60 }); }, *run(m) { yield m.reach('greasy-spoke', { text: 'Walk to the diner', foot: true, radius: 30 }); } }] }),
  // L4's hint kinds: the L ridden to a stop, a helicopter flown over a point and held there, the cabinet played to a score
  rail: m => ({ stages: [{ id: 's', setup() {}, *run(m) { m.objective('Take the L to Harbor', { hint: { kind: 'rail', to: 'Harbor' } }); yield m.waitUntil(mm => { const T = mm.fleet.transit, at = T && !mm.player.onTrain && T.sideAt(mm.player); return !!at && at.station.name === 'Harbor'; }); } }] }),
  fly: m => ({ stages: [{ id: 's', setup(m) { const q = m.lane([m.player.x + 120, m.player.y + 100]); m.ensure.vehicle('heli', 'skycam', q, { heading: q.heading }); }, *run(m) { yield m.enter('heli'); const at = m.at('lead-farm'); m.objective('Fly over Lead Farm', { hint: { kind: 'goto', at, radius: 60, vehicle: 'heli', hover: true } }); yield m.waitUntil(mm => !!mm.vehicle && mm.vehicle.cls === 'heli' && Math.hypot(mm.vehicle.x - at[0], mm.vehicle.y - at[1]) < 60 && mm.vehicle.speed < 40); } }] }),
  // X2's: the Duster off Ironside's airstrip, over Union Hall, and down on the runway again (land: the strip's heading)
  plane: m => ({ district: 'ironside', stages: [{ id: 's', setup(m) { m.ensure.vehicle('plane', 'duster', [95.5 * 16, 90.5 * 16], { heading: Math.PI }); m.place('player', [95.5 * 16, 94 * 16], { within: 400 }); },
    *run(m) {
      yield m.enter('plane'); const over = m.at('union-hall'), strip = [72.5 * 16, 92.5 * 16];
      m.objective('Fly over Union Hall', { hint: { kind: 'goto', at: over, radius: 90, vehicle: 'plane' } });
      yield m.waitUntil(mm => !!mm.vehicle && mm.vehicle.cls === 'plane' && !mm.vehicle.body.landed && Math.hypot(mm.vehicle.x - over[0], mm.vehicle.y - over[1]) < 90);
      m.objective('Land on the airstrip', { hint: { kind: 'goto', at: strip, radius: 60, vehicle: 'plane', land: Math.PI } });
      yield m.waitUntil(mm => !!mm.vehicle && mm.vehicle.cls === 'plane' && mm.vehicle.body.landed && mm.vehicle.speed < 5 && !mm.vehicle.wrecked && Math.hypot(mm.vehicle.x - strip[0], mm.vehicle.y - strip[1]) < 240);
    } }] }),
  // X6's: a boat boarded alongside the marina's north pier, out past the lighthouse to a point at sea, and in to the quay
  boat: m => ({ stages: [{ id: 's', setup(m) { m.ensure.vehicle('boat', 'bilgerat', [144.5 * 16, 113.7 * 16], { heading: 0 }); m.place('player', [139.5 * 16, 111.5 * 16], { within: 60 }); },   // (the player on the quay: the sail measured, not a drive across Lowtown's jams)
    *run(m) {
      yield m.enter('boat'); const sea = [156.5 * 16, 144.5 * 16], quay = [139.5 * 16, 114.5 * 16];
      const on = (mm, q, r) => !!mm.vehicle && mm.vehicle === mm.one('boat') && Math.hypot(mm.vehicle.x - q[0], mm.vehicle.y - q[1]) < r;
      m.objective('Out to sea past the lighthouse', { hint: { kind: 'goto', at: sea, radius: 60, vehicle: 'boat' } });
      yield m.waitUntil(mm => on(mm, sea, 90));
      m.objective('Back in to the marina', { hint: { kind: 'goto', at: quay, radius: 60, vehicle: 'boat' } });
      yield m.waitUntil(mm => on(mm, quay, 110) && mm.vehicle.speed < 20);
    } }] }),
  arcade: m => ({ stages: [
    { id: 'in', setup() {}, *run(m) { const door = m.at('club-chrome-door'); m.objective('Into Club Chrome', { hint: { kind: 'goto', at: door, radius: 16, foot: true, interact: true } }); yield m.waitUntil(mm => !!mm.inside && mm.inside.id === 'club-chrome'); } },
    { id: 's', setup(m) { m.on('arcadeEnd', e => { m.data.best = Math.max(m.data.best || 0, e.score); }); }, *run(m) { const C = ([x, y]) => [x * 16 + 8, y * 16 + 8]; m.objective('3,000 on the cabinet', { hint: { kind: 'arcade', at: C([37, 5]), path: [[19, 21], [33, 18], [33, 9], [35, 9], [35, 7], [37, 7]].map(C), score: 3000 } }); yield m.waitUntil(mm => (mm.data.best || 0) >= 3000); } }] }),
};
export const LIMITS = new Set(['evade3']);
const names = Object.keys(FIX).filter(k => !only || only.includes(k));
let failed = 0, runs = 0, limits = 0, limitsOk = 0;
if (import.meta.url === `file://${process.argv[1]}`) for (const seed of seeds) for (const name of names) {
  const P = usePad ? fakePad(0) : null;
  const spec = FIX[name](), where = spec.district ? { dev: '1', district: spec.district } : {};   // (a fixture in another district: played there)
  const g = await loadGame({ hash: '#play/safehouse', query: { seed, time: 'day', weather: 'clear', bot: usePad ? 'pad' : '1', ...(god ? { god: '1' } : {}), ...where }, pads: P ? [P] : null });
  const { game, gtm } = g, M = gtm.motor, C = gtm.career, R = C.R; game.advance(.5);
  const pilot = P ? new M.PadPilot(P, gtm.bindings, gtm.views, game.input) : null, idle = M.makeIntent();
  M.defMission('gym_' + name, { title: 'Gym: ' + name, rewards: { cash: 1 }, ...spec });
  C.startMission('gym_' + name);
  const t0 = Date.now(); let t = 0; const step = pilot ? 1 / 120 : .25, fails = [];
  gtm.BUS.on('stageFail', e => fails.push(e.reason), 'global');
  while (t < 900) { game.advance(step); t += step; if (pilot) { const p = gtm.crew.ped; pilot.write(C.botI || M.clearIntent(idle), gtm.context ? gtm.context() : p.seat ? 'vehicle' : 'onFoot', p); } if (trace && Math.floor(t / (trace === 'fine' ? 1 : 5)) !== Math.floor((t - step) / (trace === 'fine' ? 1 : 5))) { const p = gtm.crew.ped, B = C.bot, tg = R.objective && R.objective.hint && (R.objective.hint.targets || R.objective.hint.target), a = tg ? R.actors.tagged(tg).filter(x => !x.dead && !x.wrecked && !x.out) : []; console.log(`  ${t.toFixed(0)}s ${R.state} ${R.objective ? R.objective.text : ''} @ ${Math.round(p.x)},${Math.round(p.y)} ${p.seat ? p.seat.vehicle.def.id + ' sp ' + Math.round(p.seat.vehicle.speed) : 'foot'} [${B.auto.state}${B.auto.brain && B.auto.brain.cause ? '/' + B.auto.brain.cause : ''}${B.auto.brain && B.auto.brain.pass ? '/PASS' : ''}${B.auto.goal ? ' goal ' + Math.round(B.auto.goal.x) + ',' + Math.round(B.auto.goal.y) : ''}] hp ${Math.round(p.health)} w ${p.inv.current}${p.inv.rounds(p.inv.current) ? ' ' + (p.inv.rounds(p.inv.current).mag + '/' + p.inv.rounds(p.inv.current).total) : ''} ${R.objective && R.objective.hint && R.objective.hint.tow ? 'towed ' + !!(R.actors.tagged('car')[0] && R.actors.tagged('car')[0].towedBy) + ' phase ' + (B.tow && B.tow.phase) + ' ' : ''}tg ${a.map(x => Math.round(x.x) + ',' + Math.round(x.y) + (x.vitals ? ' hp' + Math.round(x.vitals.health) : x.damage ? ' dmg' + x.damage.share.toFixed(2) : '')).join(' ')} stars ${gtm.life && gtm.life.wanted ? gtm.life.wanted.stars : '?'}`); }
    if (R.state === 'idle' && R.result) break; }
  const r = R.result, p = gtm.crew.ped;
  console.log(`${r && r.passed ? 'ok  ' : LIMITS.has(name) ? 'miss' : 'FAIL'} ${name.padEnd(8)} s${seed} ${r && r.passed ? 'in ' + Math.round(t) + ' s' : 'at ' + Math.round(t) + ' s: ' + (R.objective ? R.objective.text : R.state) + ' @ ' + [Math.round(p.x), Math.round(p.y)] + ' ' + (p.seat ? p.seat.vehicle.def.id : 'on foot') + ' auto ' + C.bot.auto.state}${fails.length ? ' fails: ' + fails.join(', ') : ''}${R.errors.length ? ' ERR ' + R.errors.map(e => e.err.message).join(';') : ''} [${((Date.now() - t0) / 1000).toFixed(0)} s]`);
  if (LIMITS.has(name)) { limits++; if (r && r.passed) limitsOk++; } else { runs++; if (!(r && r.passed)) failed++; }
  game.dispose && game.dispose();
}
if (import.meta.url === `file://${process.argv[1]}`) { console.log(`\n${runs - failed}/${runs} passed${limits ? `; the kept limits ${limitsOk}/${limits}` : ''}`); process.exit(failed ? 1 : 0); }
