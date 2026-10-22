// The bot gym (a local probe): one fixture mission per hint kind, played by the MissionBot (or through the pad), each
// reported passed or not with its time. node tools/_botgym.mjs [--only kill,race] [--pad] [--seed 1]
import { loadGame } from '../tests/harness.mjs';
import { pad as fakePad } from '../tests/fixtures/pads.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const only = arg('only', '') ? arg('only').split(',') : null, usePad = process.argv.includes('--pad'), seed = arg('seed', '1'), trace = process.argv.includes('--fine') ? 'fine' : process.argv.includes('--trace');
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
};

const names = Object.keys(FIX).filter(k => !only || only.includes(k));
if (import.meta.url === `file://${process.argv[1]}`) for (const name of names) {
  const P = usePad ? fakePad(0) : null;
  const g = await loadGame({ hash: '#play/safehouse', query: { seed, time: 'day', weather: 'clear', bot: usePad ? 'pad' : '1' }, pads: P ? [P] : null });
  const { game, gtm } = g, M = gtm.motor, C = gtm.career, R = C.R; game.advance(.5);
  const pilot = P ? new M.PadPilot(P, gtm.bindings, gtm.views, game.input) : null, idle = M.makeIntent();
  M.defMission('gym_' + name, { title: 'Gym: ' + name, rewards: { cash: 1 }, ...FIX[name]() });
  C.startMission('gym_' + name);
  const t0 = Date.now(); let t = 0; const step = pilot ? 1 / 120 : .25, fails = [];
  gtm.BUS.on('stageFail', e => fails.push(e.reason), 'global');
  while (t < 900) { game.advance(step); t += step; if (pilot) { const p = gtm.crew.ped; pilot.write(C.botI || M.clearIntent(idle), p.seat ? 'vehicle' : 'onFoot', p); } if (trace && Math.floor(t / (trace === 'fine' ? 1 : 5)) !== Math.floor((t - step) / (trace === 'fine' ? 1 : 5))) { const p = gtm.crew.ped, B = C.bot, tg = R.objective && R.objective.hint && (R.objective.hint.targets || R.objective.hint.target), a = tg ? R.actors.tagged(tg).filter(x => !x.dead && !x.wrecked && !x.out) : []; console.log(`  ${t.toFixed(0)}s ${R.state} ${R.objective ? R.objective.text : ''} @ ${Math.round(p.x)},${Math.round(p.y)} ${p.seat ? p.seat.vehicle.def.id + ' sp ' + Math.round(p.seat.vehicle.speed) : 'foot'} [${B.auto.state}${B.auto.brain && B.auto.brain.cause ? '/' + B.auto.brain.cause : ''}${B.auto.brain && B.auto.brain.pass ? '/PASS' : ''}${B.auto.goal ? ' goal ' + Math.round(B.auto.goal.x) + ',' + Math.round(B.auto.goal.y) : ''}] hp ${Math.round(p.health)} w ${p.inv.current}${p.inv.rounds(p.inv.current) ? ' ' + (p.inv.rounds(p.inv.current).mag + '/' + p.inv.rounds(p.inv.current).total) : ''} ${R.objective && R.objective.hint && R.objective.hint.tow ? 'towed ' + !!(R.actors.tagged('car')[0] && R.actors.tagged('car')[0].towedBy) + ' phase ' + (B.tow && B.tow.phase) + ' ' : ''}tg ${a.map(x => Math.round(x.x) + ',' + Math.round(x.y) + (x.vitals ? ' hp' + Math.round(x.vitals.health) : x.damage ? ' dmg' + x.damage.share.toFixed(2) : '')).join(' ')} stars ${gtm.life && gtm.life.wanted ? gtm.life.wanted.stars : '?'}`); }
    if (R.state === 'idle' && R.result) break; }
  const r = R.result, p = gtm.crew.ped;
  console.log(`${r && r.passed ? 'ok  ' : 'FAIL'} ${name.padEnd(8)} ${r && r.passed ? 'in ' + Math.round(t) + ' s' : 'at ' + Math.round(t) + ' s: ' + (R.objective ? R.objective.text : R.state) + ' @ ' + [Math.round(p.x), Math.round(p.y)] + ' ' + (p.seat ? p.seat.vehicle.def.id : 'on foot') + ' auto ' + C.bot.auto.state}${fails.length ? ' fails: ' + fails.join(', ') : ''}${R.errors.length ? ' ERR ' + R.errors.map(e => e.err.message).join(';') : ''} [${((Date.now() - t0) / 1000).toFixed(0)} s]`);
  game.dispose && game.dispose();
}
