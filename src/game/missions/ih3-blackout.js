// IH3 · Blackout (EXPANSION.md 4, X3): Ironside's heist, from the planning board at the flat over Sudsy's once both
// setups are done. The Ironside Power Company flies its payroll in on Thursdays and keeps it overnight in the
// airstrip's hangar, behind an alarm that runs off the grid. All three of the crew, switched between as the job goes:
//   - Gus, in the Bucket The Lineman left under the pylons, raises it to the line into the Power Station and cuts it:
//     the station's CCTV dies with the line;
//   - Viv walks in at the Power Station's front door with the Buzzsaw, puts the night watch down, and shuts the three
//     turbines at their valves: Ironside goes dark, and the hangar's alarm with it, but for its battery;
//   - Dex, at the airstrip, takes the payroll from the hangar's door (the battery's alarm: three stars), flies it out
//     in the Duster to the Union Hall (the Gnomes' cut, dropped on their forecourt), and brings the Duster home to the
//     airstrip, where the Gnomes roll it into the hangar and the police lose it.
// Every stage's setup puts the world as it needs it (the crew where they are, the Bucket, the Duster), so a retry and
// #mission/heist_blackout/<stage> start it. Proves: three protagonists, an interior, a plane, three stars.
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, DEX = { name: 'Dex', color: '#ff5a4a' }, GUS = { name: 'Gus', color: '#ff9a2a' };
const BRAMBLE = { name: 'Shop Steward Bramble', color: '#ff8ac8' };
const LINE = [1504, 680], PYLON = [1568, 672];   // (the curb under the line: The Lineman's; the pylon whose line Gus cuts)
const DOOR = 'power-door', DOOR_WAIT = [1600, 432];   // (the station's front door; where Viv waits for the line, along Union Street)
// inside (cells of 16 u, power-station.js): the valves' cells, the floor south of each where she shuts it, the doors'
const C = (x, y) => [(x + .5) * 16, (y + .5) * 16];
const VALVES = [C(12, 14), C(20, 14), C(28, 14)], FRONT_OUT = C(2, 21);
// (the hall's way in from the lobby: its gap in the wall at the lobby's foot; the way out again to the front door)
const TO_HALL = [C(6, 17), C(7, 19), C(9, 19), C(12, 17)], TO_DOOR = [C(14, 17), C(9, 19), C(7, 19), C(3, 20)];   // (the valves' own cells, as a door's: walked up to, the bot stands by one; at the cell in front, it had stopped a cell short of △'s reach)
const APRON = [1616, 1472], PAYROLL = [1656, 1440], STRIP = [1160, 1480], RUNWAY = Math.PI, HANGAR = [1640, 1472];   // (the Duster's stand; the payroll at the hangar's door; the runway's west end; the hangar's apron)
const CUT = [304, 768], CUT_R = 110, LOW = 260;   // (the Gnomes' cut: dropped on the Union Hall's forecourt)
const onStrip = v => v.x > 70 * 16 && v.x < 112 * 16 && v.y > 85 * 16 && v.y < 96 * 16;
const spot = (m, at) => (q => ({ x: Math.round(q.x), y: Math.round(q.y), heading: +q.heading.toFixed(3) }))(m.curb(at));

// a protagonist not played put somewhere (on foot), or into a seat
function stand(m, id, at, within = 0) { const p = m.crewPed(id); if (!p || m.crew.active === id) return p; if (within && Math.hypot(p.x - at[0], p.y - at[1]) < within && !p.seat) return p; m.place(p, at); return p; }
// the Bucket: The Lineman's (in the garage), or a fresh one at the curb under the line
function bucket(m) {
  let v = m.one('bucket'); if (v && !v.wrecked) return v;
  v = m.garaged('bucket'); if (v && !v.wrecked) return m.adopt(v, 'bucket');
  const q = m.data.curb ||= spot(m, LINE); return m.spawn.vehicle('bucket', q, { tag: 'bucket', heading: q.heading, color: '#ffd23a' });
}
// the Duster: the job's, the airstrip's own (adopted), or a fresh one on the apron
function duster(m) {
  let d = m.one('duster'); if (d && !d.wrecked && d.damage.share > .5) return d;
  if (d) m.remove(d);
  d = m.fleet.vehicles.find(v => v.def.id === 'duster' && !v.wrecked && !v.driver && v.owner !== 'mission' && onStrip(v));
  if (d) { m.adopt(d, 'duster'); d.damage.repair(); return d; }
  return m.spawn.vehicle('duster', APRON, { tag: 'duster', heading: RUNWAY });
}
// the station's guards still standing (the interior's own; null: Viv is outside)
const guardsUp = m => (m.inside ? m.inside.run.watch().guards.filter(g => !g.down) : null);
const night = m => { if (!(m.hour >= 21 || m.hour < 4)) m.time(23); };

const plan = {
  id: 'plan',
  setup(m) {
    m.as('viv'); night(m);
    const q = m.at('ironside-board');
    m.place('player', [q[0] + 40, q[1] + 24], { within: 40 });
    stand(m, 'dex', [q[0] - 22, q[1] + 6]); stand(m, 'gus', [q[0] + 22, q[1] + 6]);
  },
  *run(m) {
    yield m.reach('ironside-board', { text: 'To the planning board', foot: true, radius: 20 });
    yield m.say(['Thursday. The Power Company\'s payroll sleeps in the airstrip\'s hangar.', 'Its alarm runs off the grid. So we take the grid away.', 'Gus cuts the line. I shut the turbines. Dex flies the money out.'], VIV);
    yield m.say(['The Gnomes take a cut for their strike fund. They\'ll hide the Duster after.'], DEX);
  },
};
// Gus raises the Bucket under the line and cuts it
const line = {
  id: 'line',
  setup(m) {
    night(m);
    if (m.inside) m.outside();
    m.as('gus');
    const v = bucket(m); if (v.damage.share < .6) v.damage.repair();
    if (m.vehicle !== v) m.place('player', { in: v });
    stand(m, 'viv', DOOR_WAIT, 80); stand(m, 'dex', [APRON[0] + 20, APRON[1] + 50], 120);
  },
  *run(m) {
    const q = m.data.curb ||= spot(m, LINE);
    m.objective('Park the Bucket under the line and raise it to the wires', { hint: { kind: 'goto', at: [q.x, q.y], radius: 40, vehicle: 'bucket' } });
    m.marker([q.x, q.y], { color: '#ffd23a', r: 24 });
    yield Object.assign(m.waitUntil(mm => { const v = mm.one('bucket'); return !!v && mm.vehicle === v && v.speed < 5 && Math.hypot(v.x - q.x, v.y - q.y) < 40; }), { nav: () => [q.x, q.y] });
    m.objective('Raising the bucket', {});
    yield m.parallel([m.say(['Going up. Mind the wires, Gus. Mind them a lot.'], VIV), m.wait(3)]);
    m.blast(PYLON, { damage: 0, splash: 4, z: 88, fire: false });   // (the line parts in a shower of sparks)
    yield m.say(['Line\'s cut! The station\'s on its own now. No cameras.'], GUS);
  },
};
// Viv in at the station's front door: the night watch, the three valves, out again
const turbines = {
  id: 'turbines',
  setup(m) {
    night(m);
    if (m.inside) m.outside();
    const v = bucket(m), q = m.data.curb ||= spot(m, LINE);
    if (!(m.crew.active === 'gus' && m.vehicle === v)) stand(m, 'gus', [q.x - 30, q.y - 30]);   // (on from the line, Gus stays up in the Bucket)
    if (m.crew.active !== 'viv') stand(m, 'viv', DOOR_WAIT, 80); else if (m.dist(DOOR) > 300) m.place('player', DOOR_WAIT);
    m.clearSpot(DOOR, 10);
    m.data.valves = [false, false, false];
  },
  *run(m) {
    yield m.switchTo('viv');
    m.loadout({ weapons: ['buzzsaw'], ammo: { buzzsaw: 600 }, select: 'buzzsaw', health: 100, armor: 100, only: true });
    m.allowWanted();
    const door = m.at(DOOR);
    m.objective('In at the Power Station\'s front door', { hint: { kind: 'goto', at: door, radius: 16, foot: true, interact: true } });
    m.marker(door, { color: '#ffe066', r: 12 });
    let tow = 0;
    yield m.waitUntil(mm => { if (!mm.inside && mm.stageTime >= tow) { tow = mm.stageTime + 1; mm.clearSpot(door, 10); } return !!mm.inside; });
    m.inside.run.loopCameras(true);   // (the line's cut: the CCTV is dark)
    m.loadout({ select: 'buzzsaw' });
    m.on('spot', e => { const i = ['valve1', 'valve2', 'valve3'].indexOf(e.spot); if (i >= 0) m.data.valves[i] = true; });
    // the night watch: the hint's point follows the nearest still up (the bot holds the trigger on it)
    const P0 = [m.player.x, m.player.y], hint = { kind: 'goto', at: P0, radius: 600, spray: [P0[0], P0[1] - 60], reach: 640 };
    m.objective('Put the night watch down', { hint });
    yield m.parallel([m.say(['Lights are on, cameras off. Hello, boys.'], VIV), m.waitUntil(mm => {
      const up = guardsUp(mm); if (!up) return false;
      if (!up.length) return true;
      const P = mm.player; let g = up[0], gd = 1e9; for (const q of up) { const d = Math.hypot(q.x - P.x, q.y - P.y); if (d < gd) { gd = d; g = q; } }
      hint.spray[0] = g.x; hint.spray[1] = g.y; hint.at[0] = P.x; hint.at[1] = P.y;
      return false;
    })]);
    for (let i = 0; i < 3; i++) {
      if (m.data.valves[i]) continue;
      m.objective(`Shut turbine ${i + 1} at its valve`, { hint: { kind: 'goto', at: VALVES[i], radius: 16, foot: true, interact: true, path: i === 0 ? TO_HALL : undefined } });
      m.marker(VALVES[i], { color: '#ff5a4a', r: 10 });
      yield Object.assign(m.waitUntil(mm => mm.data.valves[i]), { nav: () => VALVES[i] });
    }
    yield m.say(['Three turbines, spinning down. Say goodnight, Ironside.'], VIV);
    m.objective('Out by the front door', { hint: { kind: 'goto', at: FRONT_OUT, radius: 16, foot: true, interact: true, path: TO_DOOR } });
    yield m.waitUntil(mm => !mm.inside);
    m.objective('', {});
  },
};
// Dex: the payroll from the hangar's door, the Duster off the strip, the Gnomes' cut over the Union Hall, home again
const payroll = {
  id: 'payroll',
  setup(m) {
    night(m);
    if (m.inside) m.outside();
    if (m.crew.active !== 'dex') stand(m, 'dex', [APRON[0] + 20, APRON[1] + 50], 120);
    else if (m.dist(APRON) > 300 && !(m.vehicle && m.vehicle === m.one('duster'))) m.place('player', [APRON[0] + 20, APRON[1] + 50]);
    duster(m);
    for (const k of m.tagged('payroll')) m.remove(k);
    if (!m.data.haul) m.spawn.pickup('item', PAYROLL, { tag: 'payroll', item: 'payroll' });
    m.wanted.clear();
  },
  *run(m) {
    yield m.switchTo('dex');
    m.loadout({ health: 100 });
    if (!m.data.haul) {
      yield m.parallel([m.say(['Lights out across the river. The hangar\'s dark. Go, Dex.'], VIV), m.collect('payroll', { text: 'Take the payroll from the hangar\'s door' })]);
      m.data.haul = true;
    }
    m.wanted.set(3);   // (the hangar's battery: its alarm, straight to the precinct)
    m.allowWanted();
    yield m.parallel([m.say(['That\'s the battery alarm. Three stars, and the Duster\'s faster than any of them.'], DEX), m.enter('duster', { text: 'Into the Duster', lost: 'the Duster\'s gone' })]);
    m.failIf(mm => !mm.one('duster'), 'the Duster\'s a wreck');
    m.objective('Fly the Gnomes\' cut to the Union Hall: low over its forecourt', { hint: { kind: 'goto', at: CUT, radius: CUT_R, vehicle: 'duster' } });
    m.marker(CUT, { color: '#ff8ac8', r: 28 });
    yield Object.assign(m.waitUntil(mm => { const v = mm.vehicle; return !!v && v === mm.one('duster') && !v.body.landed && v.body.z < LOW && Math.hypot(v.x - CUT[0], v.y - CUT[1]) < CUT_R; }), { nav: () => CUT });
    yield m.say(['Strike fund, delivered. Bring her home, lad. The hangar door\'s open.'], BRAMBLE);
    m.objective('Land the Duster on the airstrip', { hint: { kind: 'goto', at: STRIP, radius: 60, vehicle: 'duster', land: RUNWAY } });
    m.marker(STRIP, { color: '#7aff8a', r: 28 });
    yield Object.assign(m.waitUntil(mm => { const v = mm.one('duster'); return !!v && mm.vehicle === v && v.body.landed && v.speed < 8 && onStrip(v); }), { nav: () => STRIP });
    m.objective('Taxi into the hangar', { hint: { kind: 'goto', at: HANGAR, radius: 48, vehicle: 'duster', taxi: true } });
    m.marker(HANGAR, { color: '#7aff8a', r: 24 });
    yield Object.assign(m.waitUntil(mm => { const v = mm.one('duster'); return !!v && mm.vehicle === v && v.body.landed && v.speed < 8 && Math.hypot(v.x - HANGAR[0], v.y - HANGAR[1]) < 48; }), { nav: () => HANGAR });
    m.wanted.clear();   // (the Gnomes roll the doors shut: the police drive past)
    yield m.say(['Doors shut. Cops drove right past.', 'That\'s Blackout, crew. Ironside\'s ours.'], DEX);
    yield m.say(['Ironside: done.', 'Across the bay the Velvet Syndicate is asking after the crew: the Loop Causeway to Glass Heights is open.'], { name: 'Blackout', color: '#ffe066', per: 3 });   // (EXPANSION.md 2.1, X5: it opens the Causeway)
  },
};

defMission('heist_blackout', {
  title: 'Blackout', giver: { at: 'ironside-board' }, tier: 3, requires: ['heist_lineman'], district: 'ironside', plays: 'viv', allowSwitch: true,
  brief: ['The Power Company\'s payroll sleeps in the airstrip\'s hangar.', 'Cut the line, shut the turbines, fly the money out.'],
  rewards: { cash: 30000, respect: { gnomes: 10, volts: -15 } },
  bonus: [
    { id: 'time', text: 'Under 12:00', check: m => m.elapsed < 720 },
    { id: 'clean', text: 'The Duster home unhurt', check: m => { const d = m.one('duster'); return !!d && d.damage.share > .95; } },
  ],
  stages: [plan, line, turbines, payroll],
});
