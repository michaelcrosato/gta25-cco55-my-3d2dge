// R3 · Crane Game (PLAN.md 9.4): the Harbor Rats' third job. The Chrome Saints want the container yard back (the
// Loop's infield in the Harborfront, the cranes across Dock Road), and Mama Bilge wants it held. Three Rats (they swing
// bats) and Lefty's guns (a Buzzsaw and a Persuader, the job's alone) wait at the yard's gate on Brick Lane, and they
// hold its east side: the Saints come in waves, pistols and bats, across Dock Road from the cranes (a second lot behind
// the first), then in two cars down Dock Road (their crews pile out where the cars pull up), then over Brick Lane and
// round the cranes' south end with their enforcer; the later waves each bring a Molotov thrower. Red barrels stand by
// the yard's east side and over Dock Road (a shot, a blast or a fire sets them off, and they set each other off); the
// containers and crates the yard happens to hold are the cover. Tonight the precinct is paid to look the other way (no
// stars while the Rats fight) and the Rats on the streets round the yard know the player is with them (a stray shot of
// the player's is a mate's, not a reason to turn on them). Then the Saints' captain runs for it in Fender's chrome
// Saint, up the yard's west street and along Loop Avenue: take the Rats' Brute, waiting in that street, and ram him,
// box him in or set his car going. Proves: combat waves, cover-lite, Molotovs and barrels, fire, the chase. Unlocks the
// Hot Mess at Lead Farm (its unlock is this mission's id).
import { defMission } from '../../motor/index.js';

const BILGE = { name: 'Mama Bilge', color: '#ffd23a' }, RAT = { name: 'Rat', color: '#ffd23a' };
const YARD = [1864, 1464], HOLD_R = 520;   // (the container yard's middle; stray farther and the yard is lost)
// the yard's gate on Brick Lane, where the Rats wait; the post they hold, at the yard's east side over Dock Road (the
// Saints come at it from the cranes and down Dock Road, so the shots that miss fly out over the quay and the harbour)
const GATE = [1864, 1600], POST = [1960, 1472];
const ALLIES = [{ tag: 'rat1', at: [1936, 1440] }, { tag: 'rat2', at: [1936, 1504] }, { tag: 'rat3', at: [1904, 1472] }];
const KIT = { weapons: ['buzzsaw', 'persuader'], ammo: { buzzsaw: 300, persuader: 48 }, select: 'buzzsaw', only: true };
// the waves: where each Saint comes from ('fire': a Molotov thrower; 'bat': a Slugger; 'boss': the enforcer)
const EAST = [[2168, 1400], [2200, 1488], [2248, 1552, 'bat']], EAST2 = [[2296, 1432], [2304, 1520, 'bat']];   // (across Dock Road from the cranes)
// down Dock Road (one way, south) from Loop Avenue to the yard's east side, the second behind the first: each pulls up
// and its crew piles out
const CARS = [{ def: 'saint', from: [2066, 1328], to: [2066, 1512], color: '#c8c8d0' }, { def: 'zephyr', from: [2066, 1248], to: [2066, 1424], color: '#5af0ff' }];
const SOUTH = [[1888, 1696, 'bat'], [1952, 1696, 'fire'], [2016, 1696], [2152, 1600, 'boss'], [2216, 1600, 'bat']];   // (over Brick Lane, and the cranes' south end)
// red barrels by the yard's east side and over Dock Road, where the Saints come in
const BARRELS = { b1: [[1992, 1400], [1992, 1528], [2120, 1468]], b2: [[2120, 1400], [2120, 1536]], b3: [[1944, 1560], [2120, 1592], [2000, 1440]] };
const RED = { parts: [{ box: [-3.2, -3.2, 0, 3.2, 3.2, 10], color: '#b8322a', role: 'body' }, { box: [-3.4, -3.4, 3.5, 3.4, 3.4, 4.5], color: '#8a2420', role: 'cabin' }, { box: [-1, -1, 10, 1, 1, 10.6], color: '#e8c040', role: 'body' }] };
// the chase: the Rats' Brute in the lane of the yard's west street (one way, north), away from the fight's wrecks and
// fire engines; the captain pulls out ahead of it and runs up the street and west along Loop Avenue (where it ends, he
// stops)
const NORTH = -Math.PI / 2, RIDE = [1662, 1540], RUN = [[1450, 1234], [1000, 1234]];
const LEFT = 'you left the yard';

// ---- the yard's places
// a spot near p a body can stand on: a walkable cell with no solid on it (the yard's containers and crates differ by seed)
function clearSpot(m, p) {
  const C = m.city, T = C.T, map = C.map;
  for (let r = 0; r <= 96; r += 8) for (let k = 0; k < (r ? 12 : 1); k++) {
    const a = k / 12 * Math.PI * 2, x = p[0] + Math.cos(a) * r, y = p[1] + Math.sin(a) * r;
    if (!C.walkable(Math.floor(x / T), Math.floor(y / T))) continue;
    if (map.solidsNear(x, y, 12).some(s => !s.deck && s.top > 4 && Math.abs(x - s.x) < s.hx + 9 && Math.abs(y - s.y) < s.hy + 9)) continue;
    return [Math.round(x), Math.round(y)];
  }
  return p;
}
// a point of a lane near p, running heading's way, with no vehicle on it (traffic, a parked car): along the lane, 40 at
// a time (ks: how many forty ahead, a negative one back, in the order tried)
function freeLane(m, p, heading, ks) {
  for (const k of ks) {
    const q = m.lane([p[0] + Math.cos(heading) * 40 * k, p[1] + Math.sin(heading) * 40 * k], heading);
    if (!m.fleet.near(q.x, q.y, 30).length) return q;
  }
  return m.lane(p, heading);
}
// ---- red barrels: mission props that blow when shot, blasted or stood in fire a moment, and set each other off (a bang,
// not a blaze)
const barrel = (m, at, tag) => m.spawn.prop('barrel', clearSpot(m, at), { tag, model: RED, explosive: { hp: 20, damage: 70, splash: 48, fire: false } });
const barrels = (m, tag) => { if (!m.tagged(tag).length) for (const q of BARRELS[tag]) barrel(m, q, tag); };
// ---- the people
// the Rats swing bats: no shot of theirs finds the player's back in the crossfire. The mission's Rats and Saints wear
// their colours but carry no gang of the city's: a stray hit on one rallies no member of the city's gangs against the
// player, and a kill costs no respect beyond the job's own
function allies(m) {
  for (const a of ALLIES) m.ensure.ped(a.tag, 'rat-grunt', clearSpot(m, a.at), { role: 'ally', weapons: ['fists', 'slugger'], health: 160, armor: 60 });
}
// a Rat down is remembered (the bonus: every Rat walked away), though the next wave brings a fresh one
const losses = m => { if (ALLIES.some(a => m.tagged(a.tag).some(p => p.dead))) m.data.lost = true; };
// a Saint of a wave, coming for the player: street muscle, not marksmen (short bursts, long pauses, wide of the mark),
// so a player in the yard's cover with the Rats beside them wins a fair fight; one with a bat runs in, and drops sooner
const AIM = { range: .45, burst: .45, pause: 1.2, aimOff: .16 };
const GUNS = { boss: ['fists', 'snub38'], fire: ['fists', 'snub38', 'partystarter'], bat: ['fists', 'slugger'] };
const saint = (m, at, tag, kind) => m.spawn.ped(kind === 'boss' ? 'saint-enforcer' : 'saint-grunt', clearSpot(m, at), { tag, role: 'enemy', attack: true, profile: AIM,
  health: kind === 'boss' ? 160 : kind === 'bat' ? 55 : 75, weapons: GUNS[kind] || ['fists', 'snub38'] });
const standing = (m, tag) => m.tagged(tag).filter(a => !a.dead && !a.out).length;
// the player in the yard (a deep link, a retry: on its middle), armed, patched up and in a fresh vest (the Rats see to
// it between the waves); the Rats about them
function hold(m) {
  if (m.dist(YARD) > 260) m.place('player', clearSpot(m, YARD));
  m.loadout({ ...KIT, armor: 100, health: 100 });
  allies(m);
}
// ---- the fight's ops
// an op that never ends, doing f(m, dt) each step, run beside a stage's own in m.first. While it runs the precinct looks
// the other way (the stars held at none), the city's Rats count the player one of theirs (m.ally: a stray hit on one
// of them rallies no one, and one killed in the crossfire, or a car of theirs shot up, costs the player no respect
// tonight), and the city's own Saints stay out of it (m.truce: the assault is the crew Fender sent, no more). However it ends (the wave won, the stage failed, the job quit) the cap is lifted and the heat the gunfire
// earned forgotten; the runtime lifts the ally when the job ends
const each = (m, f) => {
  let last = m.stageTime;
  return Object.assign(m.waitUntil(mm => { const t = mm.stageTime; f(mm, Math.max(0, t - last)); last = t; return false; }), {
    start: mm => { mm.wanted.cap(0); mm.ally('rats'); mm.truce('saints'); },
    end: mm => { mm.wanted.clear(); },
  });
};
// a Saint that has got nowhere a while (no nearer the player and not hurt for 15 s: stuck behind a pillar or a
// container, where neither side's shots get through) breaks and runs: off the job
function stalls(m, tag, S) {
  const t = m.stageTime;
  for (const a of m.tagged(tag)) {
    if (a.dead || a.out) continue;
    const d = m.dist(a), h = a.health, s = S.get(a);
    if (!s) { S.set(a, { t, d, h }); continue; }
    if (h < s.h || d < s.d - 12) { s.t = t; s.d = d; s.h = h; continue; }
    if (t - s.t > 15) m.remove(a);
  }
}
const step = mm => { losses(mm); };
const wave = (m, tag, text) => { const S = new Map(); return m.first([each(m, (mm, dt) => { step(mm, dt); stalls(mm, tag, S); }), m.kill(tag, { text })]); };
// each car of the cars wave lets its crew out where it pulls up (or once it is stopped, wrecked or burning, or has not
// got there in 20 s): two Saints beside it, on the yard's side
function unload(m, dt) {
  m.tagged('wcar').forEach((v, i) => {
    if (m.data.unloaded[i]) return;
    const c = CARS[i], there = Math.hypot(v.x - c.to[0], v.y - c.to[1]) < 40;
    m.data.slow[i] = m.stageTime > 4 && (v.speed || 0) < 3 ? m.data.slow[i] + dt : 0;   // (held up in the traffic)
    if (!there && !v.wrecked && !(v.damage && v.damage.burning) && m.data.slow[i] < 3 && m.stageTime < 20) return;
    m.data.unloaded[i] = true;
    const sx = Math.cos(v.heading + Math.PI / 2), sy = Math.sin(v.heading + Math.PI / 2), fx = Math.cos(v.heading), fy = Math.sin(v.heading);
    for (const k of [-1, 1]) saint(m, [v.x + sx * 24 + fx * k * 10, v.y + sy * 24 + fy * k * 10], 'w', i === 1 && k === 1 ? 'fire' : null);
  });
}
// the captain caught: his Saint stopped with the Brute on it, or wrecked, burning or rammed half to bits
const caught = m => { const L = m.tagged('leader')[0]; return !!L && (L.wrecked || !!(L.damage && (L.damage.burning || L.damage.share < .5))); };

defMission('rats_crane_game', {
  title: 'Crane Game', giver: { phone: 'rats' }, gang: 'rats', tier: 3, requires: ['rats_below_deck'], plays: 'any',
  brief: ['The Saints are coming for the container yard.', 'Hold it with the Rats, then run their captain down.'],
  rewards: { cash: 5000, respect: { rats: 20, saints: -10 } },
  bonus: [
    { id: 'time', text: 'Under 7:00', check: m => m.elapsed < 420 },
    { id: 'crew', text: 'Every Rat walked away', check: m => !m.data.lost },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['Ahoy. Fender\'s sore about his ledger.', 'He\'s sending the Saints for my container yard tonight.', 'Three of my boys are there, and Lefty\'s guns. Hold it.'], BILGE);
    } },
    {
      id: 'yard',
      setup(m) { allies(m); },
      *run(m) {
        yield m.reach(GATE, { radius: 90, text: 'Get to the container yard\'s gate on Brick Lane: the Rats are waiting' });
        yield m.reach(clearSpot(m, POST), { foot: true, radius: 40, text: 'Join the Rats at the yard\'s east side' });
        m.loadout({ ...KIT, armor: 100, health: 100 });
        yield m.say(['Buzzsaw and a Persuader, from Lefty. Vest on.', 'The precinct\'s been paid. Tonight it\'s just us.', 'Here they come, from the cranes!'], RAT);
      },
    },
    {
      id: 'east',
      setup(m) { hold(m); barrels(m, 'b1'); if (!m.tagged('e').length) for (const [x, y, k] of EAST) saint(m, [x, y], 'e', k); },
      *run(m) {
        m.failIf(m => m.dist(YARD) > HOLD_R, LEFT);
        // the first three, then two more behind them (once the first are nearly down, or after a while)
        m.objective('Hold the yard: the Saints coming across from the cranes', { hint: { kind: 'kill', targets: 'e' } });
        const S = new Map();
        yield m.first([each(m, (mm, dt) => { step(mm, dt); stalls(mm, 'e', S); }), m.waitUntil(mm => standing(mm, 'e') <= 1 || mm.stageTime > 14)]);
        for (const [x, y, k] of EAST2) saint(m, [x, y], 'e', k);
        yield m.parallel([m.say(['More of them, behind!'], RAT), wave(m, 'e', 'Hold the yard: the Saints coming across from the cranes')]);
      },
    },
    {
      id: 'cars',
      setup(m) {
        hold(m); barrels(m, 'b2');
        if (m.tagged('wcar').length) return;
        m.data.unloaded = CARS.map(() => false); m.data.slow = CARS.map(() => 0);
        for (const c of CARS) { const at = m.lane(c.from, Math.PI / 2); m.spawn.vehicle(c.def, at, { tag: 'wcar', heading: at.heading, color: c.color, driver: 'saint-grunt', drive: { to: c.to, style: 'fast' } }); }
      },
      *run(m) {
        m.failIf(m => m.dist(YARD) > HOLD_R, LEFT);
        // (the crews are the targets: the bot fights the first out while the second car is still coming)
        m.objective('Two Saints cars, down Dock Road: meet them', { hint: { kind: 'kill', targets: 'w' } });
        yield m.first([each(m, (mm, dt) => { unload(mm, dt); step(mm, dt); }), m.waitUntil(mm => mm.data.unloaded.every(Boolean))]);
        yield m.parallel([m.say(['They\'re out of the cars!'], RAT), wave(m, 'w', 'Take out the Saints from the cars')]);
      },
    },
    {
      id: 'south',
      setup(m) { hold(m); barrels(m, 'b3'); if (!m.tagged('s').length) for (const [x, y, k] of SOUTH) saint(m, [x, y], 's', k); },
      *run(m) {
        m.failIf(m => m.dist(YARD) > HOLD_R, LEFT);
        yield m.parallel([m.say(['Over Brick Lane! And round the cranes!', 'That big one\'s their enforcer. Mind the bottles.'], RAT), wave(m, 's', 'Hold the yard: the last of them, over Brick Lane and round the cranes')]);
      },
    },
    {
      id: 'chase',
      // the Rats' Brute in the west street's lane; once the player is at its wheel, the captain's Saint pulls out ahead
      // of it and runs (made in the run: the chase starts close)
      setup(m) {
        if (m.dist(YARD) > 260 && m.dist(RIDE) > 260) m.place('player', clearSpot(m, [1776, 1520]));
        m.loadout({ ...KIT, armor: 100, health: 100 });   // (patched up once more)
        if (!m.one('ride')) { const r = freeLane(m, RIDE, NORTH, [0, 1, 2, -1, 3]); m.ensure.vehicle('ride', 'brute', r, { heading: r.heading, color: '#e8c040' }); }
      },
      *run(m) {
        // (the precinct's blind eye lasts the chase too: one op for the whole of it, the say, the boarding and the catch)
        const pullOut = Object.assign(m.waitUntil(() => true), { start: mm => {   // (he pulls out 150 u ahead of the Brute, and runs)
          const v = mm.one('ride'), at = freeLane(mm, [v.x + Math.cos(v.heading) * 150, v.y + Math.sin(v.heading) * 150], v.heading, [0, -1, 1, -2]);
          mm.spawn.vehicle('saint', at, { tag: 'leader', heading: at.heading, color: '#e8e8ec', driver: 'saint-enforcer', drive: { route: RUN, style: 'fast' } });
        } });
        yield m.first([each(m, () => {}), m.sequence([
          m.parallel([m.say(['Their captain! In Fender\'s Saint, on the west street!', 'Take the Brute. Run him off the road.'], RAT),
            m.enter('ride', { text: 'Take the Rats\' Brute on the yard\'s west street', lost: 'the Brute\'s gone' })]),
          pullOut,
          m.parallel([m.say(['Box him in and he\'s ours. Lead Farm sells you a Hot Mess after.'], BILGE),
            m.first([m.chase('leader', { reach: 72, text: 'Catch the Saints\' captain: ram him, box him in' }), m.waitUntil(caught)])]),
        ])]);
        yield m.reward();   // (caught, or wrecked: the job's done there, and what blows up after is the city's business)
      },
    },
  ],
});
