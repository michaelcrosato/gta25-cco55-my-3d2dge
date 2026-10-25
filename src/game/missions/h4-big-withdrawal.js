// H4 · The Big Withdrawal (PLAN.md 9.4): the slice's finale, from the planning board in St. Christopher's Chapel, once
// the three setups are done. All three of the crew, switched between as the job goes:
//   - the plan is a choice: LOUD (Gus rams the bank's Strongbox in his Hookline, Viv storms the lobby and holds it:
//     four stars) or QUIET (Gus drills down from the sewer grate in the Drill Rig, Viv goes in through the sewer and up
//     the hatch into the vault, the Rats' hacker or the Saints' driver keeping the alarms off: two stars). QUIET is on
//     offer only with +40 respect with the Rats (their hacker) or the Saints (their driver);
//   - both end in the getaway on the Loop, its set piece in SIDE-SCROLL MODE 7: Dex drives the Zephyr H1 stashed (a
//     fresh one if it's gone) up onto the deck with the take, the stars behind him, to the MPD's roadblock at the west
//     ramp; Viv, out of the window, shoots the engine out of the SWAT van that pulls up behind them; Gus, waiting past
//     the roadblock in the Hookline, hooks the cruiser across the lane and drags it off the Loop; Dex drives through,
//     down, and home;
//   - then the split of the take at the chapel (the cash to the crew fund), the JOB DONE card (the medal, the
//     bonuses), and the credits: the Gnomes call their strike off, and the west bridge to Ironside opens.
// Every stage's setup puts the world as it needs it (the crew where they are, the cars, the roadblock), so a retry and
// #mission/heist_big_withdrawal/<stage> start it; a branch's stage started directly takes its plan (m.data.plan), and a
// stage of the other branch is passed over. The bot plays LOUD (the choice's bot); each QUIET stage has its link.
import { defMission } from '../../motor/index.js';

const ID = 'heist_big_withdrawal';
const DECK = 64;   // (the Loop's deck: its lanes, its cars, its points)
const VIV = { name: 'Viv', color: '#3ad0c8' }, DEX = { name: 'Dex', color: '#ff5a4a' }, GUS = { name: 'Gus', color: '#ff9a2a' };
const RADIO = { name: 'MPD Dispatch', color: '#5a9aff' };
const GANG_NAME = { saints: 'the Saints', rats: 'the Rats', gnomes: 'the Gnomes' };
// the set piece on the Loop's north leg, westbound (lane y 1240; the eastbound lane at 1272): where Dex stops behind
// the roadblock, the roadblock's cruiser, where Gus waits west of it with his hook toward its nose, and where Gus drags
// the cruiser off to (up Gnome Row, down the west ramp)
const RAMP_EAST = [2380, 1240], ON_DECK = [1960, 1240, DECK], STOP = [1010, 1240, DECK], BLOCK = [900, 1240];
const GUS_AT = [772, 1240], TOW_TO = [94, 560];
const RAMP_FOOT = [300, 1240], HOME = [300, 862];   // (the lower west ramp, whatever is queued at its foot; Lantern Lane in front of the chapel)
// where the getaway car waits at the curb while the job's on (on Lantern Lane past the bank's doors for LOUD, short of
// them for QUIET), and where it pulls out from, engine running: Lantern Lane past Dock Road, the way out to Seawall
// Drive and the east ramp
const CAR_LOUD = [1990, 884], CAR_QUIET = [1780, 884], CAR_OUT = [2130, 862];
// the bank inside (cells of 16 u, bank.js): the sewer's walkway north, along the top, the hatch, the vault; Viv's
// spot in the vault, out of the CCTV's way once it's looped
const C = (x, y) => [(x + .5) * 16, (y + .5) * 16];
const SEWER_IN = [C(2, 26), C(2, 14), C(2, 2), C(8, 2), C(13, 2), C(14, 2), C(16, 3), C(18, 4)];
const SEWER_OUT = [C(16, 3), C(14, 2), C(13, 2), C(8, 2), C(2, 2), C(2, 14), C(2, 26)];
const VAULT = C(18, 4), SEWER_DOOR = C(2, 27);
const SEWER_OUT_AT = C(2, 28), FRONT_OUT = C(26, 28);   // (the doors' own marked cells: △ there goes out)

// who helped: QUIET's hacker (the Rats, at +40) or driver (the Saints, at +40); LOUD's muscle, the gang the crew stands
// best with. The pass pays them +10 (rewards.respect reads it)
const respect = (m, g) => (m.save && m.save.respect && m.save.respect[g]) || 0;
const quietOk = m => respect(m, 'rats') >= 40 || respect(m, 'saints') >= 40;
const helperFor = (m, plan) => (plan === 'quiet' ? (respect(m, 'rats') >= 40 || respect(m, 'saints') < 40 ? 'rats' : 'saints')
  : ['saints', 'rats', 'gnomes'].reduce((a, g) => (respect(m, g) > respect(m, a) ? g : a), 'saints'));
const HELPED = { gang: null };   // (set as the take is split, read by the pass: the gang the respect goes to)

// a branch's stage: started directly it takes its plan; the other plan's stages are passed over
const branch = (plan, stage) => ({
  id: stage.id,
  setup(m) { m.data.plan ??= plan; if (m.data.plan === plan) stage.setup(m); },
  *run(m) { if (m.data.plan === plan) yield* stage.run(m); },
});
// a vehicle put on a spot (o.z: a deck's height; o.heading). MOTOR's place() sets a vehicle's spot, height and heading
// and then throws on the body's read-only velocity (motorRequests): the throw is caught, the body stilled by hand
function put(m, v, at, o = {}) {
  if (!v) return v;
  const [x, y] = m.at(at), z = o.z || 0;
  if (Math.hypot(v.x - x, v.y - y) < (o.within || 0) && Math.abs(v.z - z) < 8) return v;
  try { m.place(v, [x, y], { z, heading: o.heading }); } catch { /* (see above) */ }
  if (v.body) v.body.setVelocity(0, 0);
  m.fleet.wake(v);
  return v;
}
// a crew member into a seat (revived if down), and the possessed one by id
const seat = (m, id, v, s) => { const p = m.crewPed(id); if (p && v) m.place(p, { in: v, seat: s }); return p; };
const stand = (m, id, at, within = 40) => { const p = m.crewPed(id); if (p) m.place(p, at, { within }); return p; };
// the getaway car: the Zephyr H1 stashed (the save's garage), or a fresh one; at the job (o.at), its crew in it
function getaway(m, at, o = {}) {
  const kept = m.garaged('getaway');
  if (kept) m.adopt(kept, 'getaway');   // (the job's own: held where it is put, not left to roll about)
  const v = kept || m.ensure.vehicle('getaway', 'zephyr', at, { color: '#1e1e24', mods: { armor: true } });   // (Lefty's plates on a fresh one)
  m.data.kept = !!kept;
  if (o.place !== false) put(m, v, at, { z: o.z, heading: at.heading ?? o.heading, within: o.within ?? 60 });
  return v;
}
const carOk = v => v && !v.wrecked && !(v.damage && v.damage.burning);
// does a vehicle stand in a lane (within a car's width of the nearest lane's line), where it holds up the traffic?
const laneAt = (m, v) => { const q = m.lane([v.x, v.y], null, v.z); return Math.hypot(q.x - v.x, q.y - v.y) < 12; };
// the first spot in the lane eastward from a point with no vehicle on it but self ({ x, y, z, heading })
function laneSpot(m, from, self) {
  for (let x = from[0]; x < from[0] + 240; x += 12) {
    const q = m.lane([x, from[1]], 0);
    if (!m.fleet.near(q.x, q.y, 70).some(o => o !== self && o.body && Math.hypot(o.x - q.x, o.y - q.y) < 54)) return q;
  }
  return m.lane(from, 0);
}
// the roadblock on the deck: an MPD cruiser parked in the westbound lane, its siren going (Gus hooks it by the nose).
// Towed off the Loop, it is left where Gus dropped it (and gone once Dex has the wheel: parkTruck)
function roadblock(m) {
  if (m.data.towed) return m.one('block');
  const w = m.ensure.vehicle('block', 'cruiser', BLOCK, { heading: Math.PI });
  put(m, w, BLOCK, { z: DECK, heading: Math.PI, within: 20 });
  w.siren = true;
  return w;
}
// Gus in the Hookline west of the roadblock, its hook toward the cruiser's nose; the cruiser towed, the Hookline up
// Gnome Row where the tow ended (parked at the curb there, when it is anywhere else)
function gusTruck(m) {
  const t = m.ensure.vehicle('hookline', 'hookline', GUS_AT, { heading: Math.PI, color: '#e07a2a' });
  if (m.data.towed) { if (t.z > 20 || Math.hypot(t.x - TOW_TO[0], t.y - TOW_TO[1]) > 400) parkTruck(m, t); }
  else put(m, t, GUS_AT, { z: DECK, heading: Math.PI, within: 30 });
  seat(m, 'gus', t, 0);
  return t;
}
// the tow done: the cruiser off the hook and gone, the Hookline at the curb up Gnome Row (left in the lane, it and its
// cruiser hold up Gnome Row's traffic back to the foot of the west ramp, where Dex comes down)
function parkTruck(m, t = m.one('hookline')) {
  const w = m.one('block'); if (w) m.remove(w);
  if (!t) return;
  const c = m.curb(TOW_TO);
  put(m, t, c, { heading: c.heading });
}
// is the westbound lane round the roadblock's spot (and Gus's) clear of traffic, so neither is put on top of a car?
const laneClear = m => !m.fleet.near(BLOCK[0] - 70, BLOCK[1], 220).some(o => o.body && o.z > DECK - 16 && o.x > GUS_AT[0] - 60 && o.x < BLOCK[0] + 50 && Math.abs(o.y - BLOCK[1]) < 26);
// the standoff on the deck (a stage started there): the car behind the roadblock (where Dex stopped, or at STOP) with
// Dex and Viv in it, Gus waiting
// the city's gangs keep out of the job (m.truce, lifted when it ends): a bump in the getaway, a stray round in the
// lobby, a ram into a jam rallies nobody, so no gang's crew shoots the Hookline to pieces on its way to the Strongbox
const stayOut = m => { for (const g of ['saints', 'rats', 'gnomes']) m.truce(g); };
function standoff(m) {
  m.data.plan ??= 'loud';
  for (const tag of ['getaway', 'swat']) for (const v of m.tagged(tag)) if (v.wrecked) m.remove(v);   // (a retry: the wrecks cleared away)
  roadblock(m); gusTruck(m);
  const v = getaway(m, m.data.at || STOP, { z: DECK, heading: Math.PI, within: 60 });
  seat(m, 'dex', v, 0); seat(m, 'viv', v, 1);
  m.wanted.cap(0);
  return v;
}
// the SWAT van pulls up on the car's tail as it stops: in its lane, its nose a few units off the car's back bumper, so
// nothing gets between them (into Viv's line of fire: a car overtaking the van and cutting back in), once that spot is
// free of traffic; still taken after a while, the nearest spot further back with nothing between. Parked, its troopers
// in the back: nobody at the wheel, so it stays put (a mission driver held at its stop backs away, and a driven car
// with no orders rolls when the traffic behind nudges it: motorRequests), and Viv's aim has them to lock onto, not the
// drivers going by
const VAN_HL = 37, VAN_GAP = 8;   // (the Rhino's half length)
function vanSpot(m, car, far) {
  const y = car.y, near = m.fleet.near(car.x + 160, y, 260).filter(o => o.body && o !== car && Math.abs(o.z - car.z) < 16 && o.x > car.x && Math.abs(o.y - y) < 26);
  for (let x = car.x + car.hl + VAN_HL + VAN_GAP; x <= car.x + (far ? 250 : car.hl + VAN_HL + 30); x += 6) {
    if (!near.some(o => o.x - o.hl < x + VAN_HL + 4)) return [x, y];   // (nothing in the lane from the car's tail to the van's)
  }
  return null;
}
function swatVan(m, car, far = false) {
  const at = vanSpot(m, car, far) || (far ? [car.x + car.hl + VAN_HL + VAN_GAP, car.y] : null);
  if (!at) return null;
  const v = m.spawn.vehicle('rhino', at, { tag: 'swat', heading: Math.PI });
  put(m, v, at, { z: DECK, heading: Math.PI }); v.siren = true;
  for (const s of [1, 2]) m.place(m.spawn.ped('swat', [v.x, v.y], { tag: 'trooper' }), { in: v, seat: s });
  return v;
}
const DISABLED = .4;   // (a vehicle's share of its health with its engine shot out: smoking, not burning)
// is a vehicle (but the van and Viv's own car) in the line of fire from Viv to the van: on the deck, its box (and a
// little) across the line?
function inTheWay(m, van) {
  const P = m.player, own = m.vehicle, L = Math.hypot(van.x - P.x, van.y - P.y) || 1;
  for (const o of m.fleet.near((P.x + van.x) / 2, (P.y + van.y) / 2, L / 2 + 50)) {
    if (o === van || o === own || !o.body || o.wrecked || Math.abs(o.z - van.z) > 16) continue;
    const c = Math.cos(o.heading), s = Math.sin(o.heading);
    for (let k = 8; k < L - 8; k += 8) {
      const x = P.x + (van.x - P.x) * k / L - o.x, y = P.y + (van.y - P.y) * k / L - o.y;
      if (Math.abs(x * c + y * s) < o.hl + 4 && Math.abs(y * c - x * s) < o.hw + 4) return true;
    }
  }
  return false;
}
// the bank's guards, alive and standing (the interior's own; null: Viv is out of the bank)
const guardsUp = m => (m.inside ? m.inside.run.watch().guards.filter(g => !g.down) : null);   // (the interior's own: a copy)

// ---- the stages
const plan = {
  id: 'plan',
  setup(m) {
    m.as('viv');
    const q = m.at('safehouse');
    m.place('player', [q[0] + 48, q[1] + 30], { within: 40 });
    stand(m, 'dex', [q[0] - 22, q[1] + 6]); stand(m, 'gus', [q[0] + 22, q[1] + 6]);
  },
  *run(m) {
    yield m.reach('safehouse', { text: 'To the planning board', foot: true, radius: 20 });
    yield m.say(['The board, boys. First Lowtown Bank: sixty grand in the vault on a Thursday.', 'Two ways in. Pick one.'], VIV);
    const ok = quietOk(m);
    const pick = yield m.choice([
      { id: 'loud', text: 'LOUD', sub: 'RAM THE STRONGBOX  4 STARS' },
      { id: 'quiet', text: 'QUIET', sub: ok ? 'THE SEWER  2 STARS' : 'NEEDS +40 RATS OR SAINTS', disabled: !ok },
    ], { title: 'The plan', bot: 'loud' });
    m.data.plan = pick; m.data.helper = helperFor(m, pick);
    if (pick === 'quiet') yield m.say([`${m.data.helper === 'rats' ? 'Mama Bilge\'s nephew loops the cameras' : 'The Saints lend us a driver and a jammer'}. Gus drills, I go in under.`, 'Nobody hears a thing. Two stars, tops.'], VIV);
    else yield m.say(['Gus hits the Strongbox on its run. I take the lobby. Dex has the car.', 'It gets loud. Four stars loud.'], VIV);
    yield m.say(['And the Loop home. I know a way off it.'], DEX);
  },
};

// LOUD: Gus rams the Strongbox on its collection run round the bank's block until it stops; its guards run for the bank
const loudRam = {
  id: 'ram',
  setup(m) {
    stayOut(m);
    m.as('gus');
    const t = m.ensure.vehicle('ram', 'hookline', m.lane([1500, 862], 0), { color: '#e07a2a' });
    seat(m, 'gus', t, 0);
    // (the Strongbox on its round of the bank's block; its two guards the mission's own, at the wheel and beside it, so
    // they can bail out and run)
    const box = m.spawn.vehicle('strongbox', m.lane([1760, 862], 0), { tag: 'strongbox', driver: 'guard', drive: { route: [[2066, 1000], [1900, 1234], [1662, 1000], [1900, 862]], loop: true, style: 'calm' } });
    for (let i = 0; i < 2; i++) m.place(m.spawn.ped('guard', [box.x, box.y], { tag: 'boxguard', role: 'flee', weapons: ['fists', 'snub38'] }), { in: box, seat: i });
    m.data.hits = 0; m.data.contact = false; box.locked = true;
    stand(m, 'viv', [1830, 812]);
    const car = getaway(m, m.curb(CAR_LOUD));
    seat(m, 'dex', car, 0);
    m.loadout({ health: 100 });
  },
  *run(m) {
    yield m.say(['There she goes: the Strongbox, on its Thursday run. Hit it, Gus. Hit it till it stops.'], VIV);
    const box = () => m.one('strongbox');
    m.marker(box(), { color: '#ff5a4a', ring: false });
    m.objective('Ram the Strongbox: 0/3', { hint: { kind: 'kill', targets: 'strongbox', vehicle: 'ram' } });
    m.failIf(mm => !mm.vehicle || mm.vehicle !== mm.one('ram'), 'Gus left the Hookline');
    yield m.waitUntil(mm => {
      const b = box(), t = mm.one('ram'); if (!b || !t) return true;
      const near = Math.hypot(b.x - t.x, b.y - t.y) < b.hl + t.hl + 6;
      if (near && !mm.data.contact && t.speed + b.speed > 25) { mm.data.contact = true; mm.data.hits++; mm.objective(`Ram the Strongbox: ${mm.data.hits}/3`, { hint: { kind: 'kill', targets: 'strongbox', vehicle: 'ram' } }); }
      else if (!near && Math.hypot(b.x - t.x, b.y - t.y) > b.hl + t.hl + 24) mm.data.contact = false;
      return mm.data.hits >= 3;
    });
    // stopped: its guards out and running
    const b = box();
    m.tagged('boxguard').forEach((p, i) => { if (b && p.seat) m.place(p, b.toWorld(-12 + i * 24, -b.hw - 14)); });
    yield m.say(['That\'s stopped it. The guards are legging it inside.', 'Viv, you\'re up.'], GUS);
  },
};
// LOUD: Viv storms the lobby (the alarm, the guards come for her) and holds it while the vault's emptied, then out
const loudLobby = {
  id: 'lobby',
  setup(m) {
    stayOut(m);
    if (m.inside) m.outside();
    stand(m, 'viv', [1830, 812], 60);
    m.clearSpot('bank-door', 10);   // (a car left on the door step: towed)
    m.wanted.clear();
  },
  *run(m) {
    yield m.switchTo('viv');
    m.loadout({ weapons: ['buzzsaw'], ammo: { buzzsaw: 600 }, select: 'buzzsaw', health: 100, armor: 100, only: true });
    const door = m.at('bank-door');
    m.objective('Storm the bank', { hint: { kind: 'goto', at: door, radius: 16, foot: true, interact: true } });
    m.marker(door, { color: '#ffe066', r: 12 });
    let tow = 0;   // (and one left there while she walks up: looked for once a second)
    yield m.waitUntil(mm => { if (!mm.inside && mm.stageTime >= tow) { tow = mm.stageTime + 1; mm.clearSpot(door, 10); } return !!mm.inside; });
    m.loadout({ select: 'buzzsaw' });   // (in through the door, the gun put away: out again, and the CCTV's alarm with it)
    // the guards come for her: the hint's point follows the nearest one still up (the bot holds the trigger on it, from
    // inside the doors)
    // (out of the doors with guards still up, the lobby isn't clear: back in for them)
    const P0 = [m.player.x, m.player.y], hint = { kind: 'goto', at: P0, radius: 600, spray: [P0[0], P0[1] - 60], reach: 640 };
    const back = { kind: 'goto', at: door, radius: 16, foot: true, interact: true }; let out = false;
    m.objective('Take out the guards', { hint });
    yield m.parallel([m.say(['Everybody down! This is a withdrawal!'], VIV), m.waitUntil(mm => {
      const up = guardsUp(mm);
      if (!up) { if (!out) { out = true; mm.objective('Back in: take out the guards', { hint: back }); } return false; }
      if (out) { out = false; mm.objective('Take out the guards', { hint }); }
      if (!up.length) return true;
      const P = mm.player; let g = up[0], gd = 1e9; for (const q of up) { const d = Math.hypot(q.x - P.x, q.y - P.y); if (d < gd) { gd = d; g = q; } }
      hint.spray[0] = g.x; hint.spray[1] = g.y; hint.at[0] = P.x; hint.at[1] = P.y;
      return false;
    })]);
    m.objective('Hold the lobby', {});
    yield m.say(['Lobby\'s clear. The vault\'s open for the Strongbox run.', 'Bags, Dex! Thirty seconds!'], VIV);
    yield m.wait(2);
    m.objective('Out to the car', { hint: { kind: 'goto', at: FRONT_OUT, radius: 16, foot: true, interact: true } });
    yield m.waitUntil(mm => !mm.inside);
    m.objective('Out to the car', {});
  },
};

// QUIET: Gus parks the Drill Rig over the sewer grate and drills down; the hole goes through to the vault's hatch
const quietDrill = {
  id: 'drill',
  setup(m) {
    stayOut(m);
    m.as('gus');
    if (m.inside) m.outside();
    const rig = m.ensure.vehicle('rig', 'drillrig', m.lane([1662, 1060], -Math.PI / 2), { color: '#e8e8ec' });
    seat(m, 'gus', rig, 0);
    stand(m, 'viv', [1700, 712]);
    m.data.grate ??= m.curb('bank-sewer');   // (the rig's spot: the curb by the grate)
    const car = getaway(m, m.curb(CAR_QUIET));
    seat(m, 'dex', car, 0);
  },
  *run(m) {
    yield m.say(['Rig\'s warm. Park her over the grate round the side and let her chew.'], GUS);
    const spot = [m.data.grate.x, m.data.grate.y], hint = { kind: 'goto', at: spot, radius: 40, vehicle: 'rig' };
    const there = (mm, r) => !!mm.vehicle && mm.vehicle === mm.one('rig') && mm.dist(spot) < r && mm.vehicle.speed < 10;
    m.marker(spot, { color: '#ffe066', r: 24 });
    m.objective('Park the Drill Rig by the sewer grate', { hint });
    m.failIf(mm => !mm.one('rig'), 'the Drill Rig is wrecked');
    yield m.waitUntil(mm => there(mm, 40));
    const T = m.timer(14, { fail: false, label: 'DRILLING' });
    m.objective('Hold the rig steady while it drills', { hint });
    yield m.waitUntil(mm => { T.paused = !there(mm, 56); return T.left <= 0; });   // (the bit only bites while the rig stands there)
    yield m.say(['We\'re through. Right under the vault\'s hatch.', 'Viv, mind the drop.'], GUS);
  },
};
// QUIET: Viv down the grate, the cameras looped, along the sewer and up the hatch into the vault; the take; out again
const quietVault = {
  id: 'vault',
  setup(m) {
    stayOut(m);
    if (m.inside) m.outside();
    stand(m, 'viv', [1700, 712], 60);
    m.wanted.clear();
  },
  *run(m) {
    yield m.switchTo('viv');
    m.loadout({ health: 100, armor: 50 });
    const grate = m.at('bank-sewer');
    m.objective('Down the sewer grate', { hint: { kind: 'goto', at: grate, radius: 16, foot: true, interact: true } });
    m.marker(grate, { color: '#ffe066', r: 12 });
    yield m.waitUntil(mm => !!mm.inside);
    // the hacker (or the jammer) loops the CCTV: the cameras see nothing while the job lasts
    m.inside.run.loopCameras(true); m.music('tension');
    m.objective('Along the sewer to the hatch', { hint: { kind: 'stealth', path: SEWER_IN } });
    yield m.parallel([m.say([m.data.helper === 'saints' ? 'Saints\' jammer is on. Cameras are blind.' : 'Bilge\'s boy is in. Cameras are looping.', 'Go.'], VIV),
      m.waitUntil(mm => Math.hypot(mm.player.x - VAULT[0], mm.player.y - VAULT[1]) < 14)]);
    yield m.say(['Deposit boxes. All of them.'], VIV);
    yield m.wait(3);
    m.data.take = true;
    m.objective('Back out the way you came', { hint: { kind: 'stealth', path: SEWER_OUT } });
    yield m.waitUntil(mm => Math.hypot(mm.player.x - SEWER_DOOR[0], mm.player.y - SEWER_DOOR[1]) < 30);
    m.objective('Up the grate', { hint: { kind: 'goto', at: SEWER_OUT_AT, radius: 16, foot: true, interact: true } });
    yield m.waitUntil(mm => !mm.inside);
    m.objective('To the car', {});
    yield m.say(['The night man\'s found the hole. Go, go!'], VIV);
  },
};

// the getaway: Dex at the wheel, Viv beside him with the take; up the east ramp onto the Loop (the stars on the way),
// along the deck to the MPD's roadblock at the west ramp
const getawayStage = {
  id: 'getaway',
  setup(m) {
    stayOut(m);
    m.data.plan ??= 'loud';
    if (m.inside) m.outside();
    m.as('dex');
    const quiet = m.data.plan === 'quiet', at = laneSpot(m, CAR_OUT, m.garaged('getaway') || m.one('getaway'));
    const v = getaway(m, at, { within: 30 });
    for (const tag of ['strongbox', 'ram']) { const o = m.one(tag); if (o && laneAt(m, o)) put(m, o, m.curb(o), { heading: m.curb(o).heading }); }   // (LOUD's wrecks of the morning pushed to the curb, out of the way)
    for (const o of m.fleet.near(v.x + 150, v.y, 190)) if (o !== v && o.body && !o.driver && o.def.role === 'police' && laneAt(m, o)) put(m, o, m.curb(o), { heading: m.curb(o).heading });   // (and the cars the alarm brought, parked in the lane ahead with their crews out)
    if (v.damage.share < .5) v.damage.repair();   // (a retry: the car as it was at the bank)
    seat(m, 'dex', v, 0); seat(m, 'viv', v, 1);
    m.data.at = null;
    m.view('iso');
    m.wanted.cap(5); m.wanted.floor(0); m.wanted.set(quiet ? 2 : 4);   // (LOUD's four stars, QUIET's two: the MPD on its way)
    m.allowWanted();
  },
  *run(m) {
    const car = m.vehicle;
    m.failIf(() => !carOk(car), 'the getaway car is wrecked');
    let left = null;   // (out of the car 12 s: the getaway's off)
    m.failIf(mm => { left = mm.vehicle === car ? null : (left ?? mm.stageTime); return left !== null && mm.stageTime - left > 12; }, 'Dex left the getaway car');
    yield m.parallel([m.say([m.data.plan === 'quiet' ? 'Two cruisers and counting. Easy does it.' : 'Every cop in Lowtown. Hold on to something.', 'Seawall, then the east ramp.'], DEX),
      m.reach(RAMP_EAST, { text: 'To the Loop\'s east ramp', radius: 70, inVehicle: true })]);
    // (the MPD pulls back to its roadblock on the Loop: the units on the ground stand down, the scanner says where)
    m.wanted.cap(0);
    yield m.parallel([m.say(['All units hold back: the Loop is closed at the west ramp. We\'ll take them there.'], RADIO),
      m.reach(ON_DECK, { text: 'Up the ramp onto the Loop', radius: 40, inVehicle: true })]);
    m.view('side7');
    // west along the deck to the roadblock (put across the lane once the stretch round it is clear of traffic, or as
    // Dex comes near): stopped behind it, or behind whoever is held up at it; the SWAT van on his tail as he stops (the
    // rail turned to look back east along the deck: the van pulling up behind them in view)
    const hint = { kind: 'goto', at: STOP, radius: 30, vehicle: null };
    m.objective('West along the Loop', { hint }); m.marker(STOP, { color: '#ffe066' });
    let still = null, back = false;
    yield m.waitUntil(mm => {
      const v = mm.vehicle;
      if (!mm.one('block') && (laneClear(mm) || (v && v.x < 1560))) { roadblock(mm); gusTruck(mm); }
      const held = !!v && v === car && v.z > DECK - 12 && v.x < 1460 && v.x > BLOCK[0] && v.speed < 8 && !!mm.one('block');
      still = held ? (still ?? mm.stageTime) : null;
      if (held && !mm.one('swat')) { if (!back) { mm.view('side7', { heading: 'east' }); back = true; } swatVan(mm, car, mm.stageTime - still > 6); }
      return held && !!mm.one('swat') && mm.stageTime - still > .8;
    });
    m.data.at = [car.x, car.y]; m.data.carHealth = car.damage.share;
  },
};
// Viv, out of the window: the SWAT van on their tail, its engine shot out (only disabled: one burning there would go
// up beside the car)
const windowStage = {
  id: 'window',
  setup(m) {
    stayOut(m);
    const car = standoff(m);
    m.view('side7', { heading: 'east' });   // (MODE 7 looking back along the deck: the car, and the van on its tail)
    if (!m.one('swat')) swatVan(m, car, true); m.music('chase');
  },
  *run(m) {
    const car = m.data.kept ? m.garaged('getaway') : m.one('getaway');
    m.failIf(() => !carOk(car), 'the getaway car is wrecked');
    yield m.say(['Roadblock. And company behind us.'], DEX);
    yield m.switchTo('viv');
    m.view('side7', { heading: 'east' });
    m.loadout({ weapons: ['snub38'], ammo: { snub38: 120 }, select: 'snub38', only: true });   // (the snub: every round where it's aimed, none in the traffic)
    yield m.say(['SWAT. Keep your head down, Dex.'], VIV);
    const hint = { kind: 'kill', targets: 'swat' };
    m.objective('Shoot out the SWAT van\'s engine', { hint });
    m.marker(m.one('swat'), { color: '#ff5a4a', ring: false });
    // (a car in the line of fire: the bot's trigger off till it's by, as a player's would be)
    yield m.waitUntil(mm => { const c = mm.one('swat'); if (!c || c.damage.share < DISABLED) return true; hint.targets = inTheWay(mm, c) ? 'swat-hold' : 'swat'; return false; });
    m.loadout({ select: 'fists' });   // (the gun away at once: more would set it burning on their tail)
    m.objective('The SWAT van is going nowhere', {});
    yield m.say(['That van\'s going nowhere.'], VIV);
  },
};
// Gus, from the far side: the hook on the cruiser in the westbound lane, and off the Loop with it
const towStage = {
  id: 'tow',
  setup(m) {
    stayOut(m);
    standoff(m);
  },
  *run(m) {
    yield m.switchTo('gus');
    m.view('side7', { heading: 'east' });   // (Gus's truck facing the camera, its hook toward the roadblock; let go once it's hooked, the rail turns with the drag)
    yield m.say(['Morning, officer. You\'re parked in a tow-away zone.'], GUS);
    const to = m.at(TOW_TO), block = () => m.one('block');
    m.marker(to, { color: '#7aff8a', r: 28 }); m.marker(block(), { color: '#ff5a4a' });
    m.objective('Hook the cruiser and drag it off the Loop', { hint: { kind: 'deliver', what: 'block', to, tow: 'hookline' } });
    m.failIf(mm => !mm.one('block'), 'the cruiser is a wreck: no way through');
    m.failIf(mm => !mm.one('hookline'), 'the Hookline is wrecked');
    let hooked = false;
    yield m.waitUntil(mm => { const b = block(); if (b && b.towedBy && !hooked) { hooked = true; mm.view('side7'); } return !!b && b.z < 20 && Math.hypot(b.x - to[0], b.y - to[1]) < 160; });
    m.data.towed = true;
    yield m.say(['Lane\'s open. Go, Dex.'], GUS);
  },
};
// Dex through the gap, down the west ramp, and home to the chapel
const offRamp = {
  id: 'home',
  setup(m) {
    m.data.towed = true;   // (started here: the lane already clear)
    standoff(m);
  },
  *run(m) {
    const car = m.data.kept ? m.garaged('getaway') : m.one('getaway');
    m.failIf(() => !carOk(car), 'the getaway car is wrecked');
    yield m.switchTo('dex');
    m.view('side7');
    parkTruck(m);   // (Gus's end of it, out of sight now)
    let left = null;   // (out of the car 12 s: the getaway's off)
    m.failIf(mm => { left = mm.vehicle === car ? null : (left ?? mm.stageTime); return left !== null && mm.stageTime - left > 12; }, 'Dex left the getaway car');
    yield m.reach(RAMP_FOOT, { text: 'Through the gap and down off the Loop', radius: 60, inVehicle: true });
    m.view('iso'); m.wanted.clear();   // (lost on the Loop: the stars gone)
    yield m.say(['Off the Loop and nobody on us. Chapel.'], DEX);
    yield m.reach(HOME, { text: 'Back to the chapel', radius: 50, inVehicle: true, stopped: true });
    m.data.carHealth = Math.min(m.data.carHealth ?? 1, car ? car.damage.share : 0);
    if (car) m.stash(car, 'getaway');   // (kept in the garage: the getaway car, back where it was left)
  },
};
// the split of the take at the chapel, the results, the credits
const split = {
  id: 'split',
  setup(m) {
    m.data.plan ??= 'loud';
    m.data.helper ??= helperFor(m, m.data.plan);
    if (m.inside) m.outside();
    m.view('iso'); m.wanted.cap(5); m.wanted.clear();
    m.as('viv');
    const q = m.at('safehouse');
    m.place('player', [q[0] + 48, q[1] + 30], { within: 40 });
    stand(m, 'dex', [q[0] - 24, q[1] + 8], 60); stand(m, 'gus', [q[0] + 24, q[1] + 8], 60);
  },
  *run(m) {
    yield m.reach('safehouse', { text: 'The take, on the planning board', foot: true, radius: 20 });
    HELPED.gang = m.data.helper;
    yield m.say(['Sixty thousand, give or take a deposit box.', `Ten for ${GANG_NAME[m.data.helper] || 'our friends'}. The rest in the pot.`], VIV);
    yield m.say(['A Thursday well spent.'], GUS);
    yield m.say(['Same time next week?'], DEX);
    const q = m.at('safehouse');
    yield m.parallel([
      m.cutscene([{ at: 'bank-door', zoom: .8, secs: 3 }, { at: [1300, 1256], zoom: .6, secs: 3 }, { at: 'lighthouse', zoom: .7, secs: 3 }, { at: q, zoom: 1, secs: 2 }]),
      m.say(['GRAND THEFT MOTO', 'Lowtown: done.', 'The Gnomes call off their strike: the west bridge to Ironside is open.'], { name: 'The End', color: '#ffe066', per: 3 }),
    ]);
  },
};

defMission(ID, {
  title: 'The Big Withdrawal', giver: { at: 'safehouse' }, tier: 4, plays: 'any', allowSwitch: true,
  requires: ['heist_getaway', 'heist_blueprints', 'heist_big_drill'],
  brief: ['The First Lowtown Bank. All three of you.', 'LOUD or QUIET: the Loop home either way.'],
  // the take to the crew fund; +10 respect to the gang that helped (known once the plan is made: read at the pass)
  rewards: { cash: 60000, get respect() { return HELPED.gang ? { [HELPED.gang]: 10 } : {}; } },
  bonus: [
    { id: 'time', text: 'Under 12:00', check: m => m.elapsed < 720 },
    { id: 'car', text: 'The getaway car above half', check: m => (m.data.carHealth ?? 0) > .5 },
  ],
  stages: [plan, branch('loud', loudRam), branch('loud', loudLobby), branch('quiet', quietDrill), branch('quiet', quietVault), getawayStage, windowStage, towStage, offRamp, split],
});
