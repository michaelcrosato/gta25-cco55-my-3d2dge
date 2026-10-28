// GH3 · House Edge (EXPANSION.md 4, X6): Glass Heights' heist, from the planning board in the penthouse once both
// setups are done. The Velvet Casino's take sleeps in the vault behind the cage. All three of the crew, switched between
// as the job goes:
//   - Viv walks in at the front doors by night in a croupier's black, on the staff pass Dolores (Loaded Dice's croupier)
//     got her: nobody minds staff past the floor. Through the staff door, along the corridor, into the cage; she cracks
//     the Hollister 9 on the vault's door (it swings open) and bags the take, and the bag's dye pack sets the alarm off:
//     the Syndicate's hoods at her (the house never calls the police on its own vault). The Buzzsaw out of the bag, and
//     out with the take up the stairs to the roof and down the fire escape to Casino Row;
//   - the alarm brings the Syndicate's cage van round to the back, pulled up under the fire escape to take the take off
//     her: Gus, in a Brute down Casino Row, rams it till it's wrecked past driving (its hoods run). Half the Strip saw
//     that: three stars. He picks Viv up at the fire escape's foot and drives her and the take to Marina Drive by the
//     south shore, where the Gull rides off the walk with Dex at its controls;
//   - Dex flies the take out along the shore (a seaplane off the beach at midnight: four stars) to Bilge's boat off the
//     south-east point (the Harbor Rats fence it: low over the boat, the bag out of the door), comes round and sets the
//     Gull down on the sea off the south shore again, dark: the police lose a plane on the water at night.
// Every stage's setup puts the world as it needs it (the crew where they are, the Brute, the van, the Gull, the boat), so
// a retry and #mission/heist_house_edge/<stage> start it. Proves: three protagonists, an interior's staff rooms, a vault
// opened, ramming, the seaplane, four stars.
//   Indoors no walk graph runs: the ways across the floor and along the corridor are paths of cells (velvet-casino.js;
//   the bot walks them straight, point to point).
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, DEX = { name: 'Dex', color: '#ff5a4a' }, GUS = { name: 'Gus', color: '#ff9a2a' };
const BILGE = { name: 'Bilge', color: '#ffd23a' }, T = 16;
const DOOR = 'casino-door', BACK = 'casino-back';
const C = (x, y) => [(x + .5) * T, (y + .5) * T];   // (a casino cell's middle: velvet-casino.js)
// (the front doors up the floor's middle, along its foot to the east end, up past the bar's end to the staff door; along
// the corridor to the cage's door and up the cage's east side to the vault's door)
const IN = [C(19, 22), C(32, 21), C(32, 10), C(33, 9), C(33, 7.5), C(13, 7.5), C(11, 7), C(11, 4)];
const CRACK = C(11, 4), TAKE = [C(12, 3.5), C(15, 3), C(18.5, 2)];   // (the vault's door from the cage; in to the take's pallet)
const OUT = [C(15, 3), C(12, 3.5), C(11, 5), C(11, 7), C(13, 7.5), C(33, 7.5), C(33.5, 6), C(35, 4.5), C(37, 5)];   // (back through the cage, the corridor east, the stairs, the roof to the fire escape's door)
// outside: the Brute on Casino Row west of the casino, the cage van pulled up at the curb under the fire escape,
// Marina Drive by the south shore's walk (stopped on the road: on the walk, a car run on had gone into the sea), the
// Gull off the walk, Bilge's boat
const BRUTE_AT = [30 * T, 80 * T], VAN_AT = [51 * T, 78.5 * T];
const SHORE = [40 * T, 101 * T], GULL_AT = { x: 40 * T, y: 106 * T, heading: 0 };   // (bow east: the run along the shore's sea, the piers' ends north of it)
const DROP = [124.5 * T, 107.5 * T], DROP_R = 110, LOW = 260;   // (Bilge's boat in the sea off the south-east point; low over it: the bag out of the door)
const BAY = [36 * T, 109.5 * T], BAY_R = 64, DOWN_R = 360, WEST = Math.PI;   // (down again off the south shore, in from the east along it: GH2's)

const night = m => { if (!(m.hour >= 21 || m.hour < 4)) m.time(23); m.peace(); };   // (midnight; and no turf war on the Strip the night of the job: the Yacht Club's flares in one on Casino Row had set the cars round the Brute alight)
const stand = (m, id, at, within = 0) => { const p = m.crewPed(id); if (!p || m.crew.active === id) return p; if (within && !p.seat && Math.hypot(p.x - at[0], p.y - at[1]) < within) return p; m.place(p, at); return p; };
const seat = (m, id, v, s) => { const p = m.crewPed(id); if (p && v && !(p.seat && p.seat.vehicle === v)) m.place(p, { in: v, seat: s }); return p; };
const heat = (m, n, fresh = false) => { m.allowWanted(); if (fresh) m.wanted.clear(); m.wanted.cap(n); if (m.wanted.stars < n) m.wanted.set(n); for (const g of ['velvet', 'yacht', 'saints']) m.truce(g); };   // (three stars from the rams on Casino Row, four once the Gull's up: at four the drive's police had shot the Brute alight and Gus down on the walk; fresh, a retry's: the police far off again, not standing at the wheel. The Heights' gangs gone to ground with the police all over them)
const house = m => { m.wanted.clear(); m.wanted.cap(0); };   // (the house's own business till then: no police)
const flying = v => !!v && !!v.body && !v.body.landed;
// a walk across the casino: the bot's goto with the path's points, done at its end (or, interact, when done(m) says)
function walk(m, text, path, o = {}) {
  const end = path[path.length - 1];
  const w = m.waitUntil(mm => (o.done ? o.done(mm) : !!mm.inside && Math.hypot(mm.player.x - end[0], mm.player.y - end[1]) < 12));
  return { ...w, start: mm => { mm.objective(text, { hint: { kind: 'goto', at: end, radius: 10, foot: true, interact: !!o.interact, path } }); mm.marker(end, { color: o.color || '#7ac8ff', r: 8 }); }, nav: () => end };
}
// the Brute: the job's, or a fresh one on Casino Row (a burning one, a wreck or one half gone: replaced, the wrecks
// left at its spot towed first: a retry's fresh one had gone up among the last try's)
const brute = m => { const v = m.one('brute'); if (v && !v.wrecked && !v.damage.burning && v.damage.share > .5) return v; if (v) m.remove(v); m.clearSpot(BRUTE_AT, 120); return m.ensure.vehicle('brute', 'brute', m.lane(BRUTE_AT, 0), { color: '#ff9a2a', mods: { armor: true } }); };   // (Lefty's plates on it: three rams into an armoured van)
// the Gull: the job's, or a fresh one riding off the south shore's walk
function gull(m) {
  let v = m.one('gull'); if (v && (v.wrecked || v.sinking || v.sunk || v.damage.share < .5)) { m.remove(v); v = null; }
  return v || m.spawn.vehicle('gull', [GULL_AT.x, GULL_AT.y], { tag: 'gull', heading: GULL_AT.heading });
}
// Bilge's boat, at anchor off the point, a Rat at its wheel
function boat(m) {
  let b = m.one('bilge'); if (b && !b.wrecked) return b;
  for (const tag of ['bilge', 'rat']) for (const a of m.tagged(tag)) m.remove(a);
  b = m.spawn.vehicle('bilgerat', DROP, { tag: 'bilge', heading: -Math.PI / 2, gang: 'rats' });
  const r = m.spawn.ped('rat-grunt', DROP, { tag: 'rat', role: 'ally', gang: 'rats', name: 'Bilge' }); m.place(r, { in: b, seat: 0 });
  return b;
}
// the crew outside while Viv works: Gus at the Brute's wheel, Dex at the Gull's controls
function crewOut(m) { seat(m, 'gus', brute(m), 0); seat(m, 'dex', gull(m), 0); boat(m); }

const plan = {
  id: 'plan',
  setup(m) {
    m.as('viv'); night(m);
    const q = m.at('heights-board'); m.place('player', [q[0] + 40, q[1] + 20], { within: 60 });
    stand(m, 'dex', [q[0] - 22, q[1] + 6]); stand(m, 'gus', [q[0] + 22, q[1] + 6]);
  },
  *run(m) {
    yield m.reach('heights-board', { text: 'To the planning board', foot: true, radius: 20 });
    yield m.say(['Midnight. The Velvet Casino\'s take goes into the vault behind the cage, and sleeps there till Monday.', 'Dolores got me a croupier\'s black and a staff pass. Staff go where they like.', 'I open the vault. Gus gets me off the Strip. Dex flies it away.'], VIV);
    yield m.say(['The bag has a dye pack in it, Viv. The second you lift it, every hood in the house knows.'], DEX);
    yield m.say(['The house won\'t call the police on its own vault. It\'ll send the cage van round the back for me.', 'Gus stops the van.'], VIV);
  },
};
// Viv to the front doors and in
const casino = {
  id: 'casino',
  setup(m) { m.as('viv'); night(m); if (m.inside) m.outside(); m.wanted.clear(); m.loadout({ weapons: ['fists', 'buzzsaw'], ammo: { buzzsaw: 600 }, only: true, select: 'fists', health: 100, armor: 100 }); crewOut(m); },
  *run(m) {
    const door = m.at(DOOR);
    m.objective('Into the Velvet Casino (its front doors on the forecourt off Loop Avenue)', { hint: { kind: 'goto', at: door, radius: 16, foot: true, interact: true } });
    m.marker(door, { color: '#ffe066', r: 12 });
    let tow = 0;
    yield m.waitUntil(mm => { if (!mm.inside && mm.stageTime >= tow) { tow = mm.stageTime + 1; mm.clearSpot(door, 10); } return !!mm.inside; });
  },
};
// Viv inside: the staff door, the corridor, the cage, the vault cracked, the take bagged (the alarm), the hoods put
// down, up to the roof and out by the fire escape
const vault = {
  id: 'vault',
  setup(m) {
    m.as('viv'); night(m); m.data.out = false; m.data.crack = m.data.bag = false;
    if (m.inside && m.retries) m.outside();
    if (!m.inside) { crewOut(m); if (m.dist(DOOR) > 60) m.place('player', DOOR); m.interior('velvet-casino', 'front'); }
    m.loadout({ weapons: ['fists', 'buzzsaw'], ammo: { buzzsaw: 600 }, only: true, select: 'fists', health: 100, armor: 100 });
    m.wanted.clear();
  },
  *run(m) {
    const R = () => m.inside && m.inside.run;
    R().pass(true);   // (Dolores's pass: staff go where they like)
    m.on('spot', e => { if (e.spot === 'vault') m.data.crack = true; if (e.spot === 'take' && m.data.open) m.data.bag = true; });
    m.failIf(mm => !mm.data.bagged && !!R() && !!R().watch().alarm, 'the alarm went off too soon');
    m.failIf(mm => !mm.inside && !mm.data.out, 'you left the casino');
    yield m.parallel([m.say(['Evening, boys. New girl.'], VIV), walk(m, 'Through the staff door at the floor\'s east end, along the corridor, into the cage', IN)]);
    yield walk(m, 'Crack the vault\'s door', [CRACK], { interact: true, color: '#d8b04a', done: mm => mm.data.crack });
    m.objective('Cracking the Hollister 9', {});
    yield m.parallel([m.say(['Come on, you old thing. Left, left, right...'], VIV), m.wait(4)]);
    R().open('vault-door'); m.data.open = true;   // (the round door swings back)
    yield m.say(['Click.'], VIV);
    yield walk(m, 'Into the vault: bag the take', TAKE, { interact: true, color: '#7aff8a', done: mm => mm.data.bag });
    // the dye pack: the alarm, every hood in the place
    m.data.bagged = true; house(m); R().raise('vault', m.player); m.allowWanted();
    m.loadout({ select: 'buzzsaw' });
    // out with the take: on along the way out, and a hood that has her in its sights shot at first (the nearest; it had
    // stood in the vault firing at hoods through its walls while they shot her through its door)
    const hint = { kind: 'goto', at: OUT[OUT.length - 1], radius: 10, foot: true, interact: true, path: OUT };
    m.data.out = true;
    m.objective('The alarm! Out with the take: up to the roof and down the fire escape', { hint });
    m.marker(OUT[OUT.length - 1], { color: '#ffe066', r: 8 });
    yield m.parallel([m.say(['There\'s the dye pack. Hello, boys.'], VIV), m.waitUntil(mm => {
      const r = R(); if (!r) return true;
      const P = mm.player; let g = null, gd = 1e9;
      for (const q of r.watch().guards) if (!q.down && q.sees) { const d = Math.hypot(q.x - P.x, q.y - P.y); if (d < gd) { gd = d; g = q; } }
      if (g) { hint.spray = [g.x, g.y]; hint.reach = 640; } else delete hint.spray;
      return false;
    })]);
  },
};
// Gus: the cage van on its way round to the back, rammed till it stops
const ram = {
  id: 'ram',
  setup(m) {
    night(m); if (m.inside) m.outside();
    m.as('gus'); const v = brute(m); if (m.vehicle !== v) m.place('player', { in: v });
    seat(m, 'dex', gull(m), 0); boat(m);
    stand(m, 'viv', m.at(BACK), 30);
    for (const tag of ['cagevan', 'vanhood']) for (const a of m.tagged(tag)) m.remove(a);
    const q = m.curb(VAN_AT), van = m.spawn.vehicle('strongbox', [q.x, q.y], { tag: 'cagevan', heading: q.heading, color: '#5a2a5e', gang: 'velvet', driver: 'velvet-grunt' });   // (at the curb, its engine running)
    for (let i = 0; i < 2; i++) m.place(m.spawn.ped('velvet-grunt', [van.x, van.y], { tag: 'vanhood', role: 'flee', gang: 'velvet' }), { in: van, seat: i });   // (its crew the mission's own, at the wheel and beside it, so they can bail out and run: out, it stops)
    van.locked = true; m.data.hits = 0; m.data.contact = false;
    m.loadout({ health: 100 }); house(m); m.allowWanted();
  },
  *run(m) {
    const van = () => m.one('cagevan');
    yield m.say(['Gus! The cage van\'s pulled up under the fire escape, and its boys are getting out. Do something!'], VIV);
    m.marker(van(), { color: '#ff5a4a', ring: false });
    const goal = () => ({ kind: 'kill', targets: 'cagevan', vehicle: 'brute' });
    m.objective('Ram the cage van: 0/3', { hint: goal() });
    m.failIf(mm => !mm.vehicle || mm.vehicle !== mm.one('brute'), 'Gus left the Brute');
    yield m.waitUntil(mm => {
      const b = van(), t = mm.one('brute'); if (!b || !t || b.wrecked) return true;
      const near = Math.hypot(b.x - t.x, b.y - t.y) < b.hl + t.hl + 6;
      if (near && !mm.data.contact && t.speed + b.speed > 25) { mm.data.contact = true; mm.data.hits++; mm.objective(`Ram the cage van: ${mm.data.hits}/3`, { hint: goal() }); }
      else if (!near && Math.hypot(b.x - t.x, b.y - t.y) > b.hl + t.hl + 24) mm.data.contact = false;
      return mm.data.hits >= 3;
    });
    const b = van();
    m.tagged('vanhood').forEach((p, i) => { if (b && p.seat) m.place(p, b.toWorld(-12 + i * 24, -b.hw - 14)); });   // (out and running)
    heat(m, 3);   // (the whole Strip saw that)
    yield m.say(['That van\'s going nowhere. And that\'s the police. Coming down, Viv?'], GUS);
  },
};
// Gus picks Viv up at the fire escape's foot and drives her and the take to the south shore, where the Gull waits
const shore = {
  id: 'shore',
  setup(m) {
    night(m); if (m.inside) m.outside();
    m.as('gus'); const v = brute(m); if (m.vehicle !== v) m.place('player', { in: v });
    seat(m, 'dex', gull(m), 0); boat(m); heat(m, 3, m.retries > 0);
  },
  *run(m) {
    const v = m.one('brute');
    if (v && m.dist(BACK) < 300) { yield m.say(['Down the fire escape with a bag of money. Drive, Gus!'], VIV); }
    seat(m, 'viv', m.one('brute'), 1);   // (down the fire escape and in)
    m.failIf(mm => { const p = mm.crewPed('viv'); return !p || p.dead; }, 'Viv is down');
    yield m.reach(SHORE, { radius: 56, stopped: true, text: 'Drive Viv and the take to Marina Drive by the south shore: the Gull waits off the walk' });
    seat(m, 'viv', gull(m), 1);   // (out along the walk and aboard)
    yield m.say(['Take care of her, Dex. And the money.'], GUS);
  },
};
// Dex: the take out to Bilge's boat, the Gull round and down on the sea off the south shore again, dark
const flight = {
  id: 'flight',
  setup(m) {
    night(m); if (m.inside) m.outside();
    const v = gull(m); seat(m, 'viv', v, 1);
    if (m.crew.active !== 'dex') seat(m, 'dex', v, 0); else if (m.vehicle !== v) m.place('player', { in: v });
    boat(m); heat(m, 3, m.retries > 0);
  },
  *run(m) {
    yield m.switchTo('dex');
    m.loadout({ health: 100 });
    m.failIf(mm => { const v = mm.one('gull'); return !v || v.wrecked || v.sinking > 0 || v.sunk; }, 'the Gull went down');
    const up = m.waitUntil(mm => { if (flying(mm.one('gull')) && !mm.data.up) { mm.data.up = true; heat(mm, 4); } return false; });   // (a seaplane off the beach at midnight: four stars)
    yield m.first([up, m.sequence([
      m.say(['Off the water, along the shore, Bilge\'s boat off the point. Hold on to that bag, Viv.'], DEX),
      Object.assign(m.waitUntil(mm => { const v = mm.one('gull'); return flying(v) && v.body.z < LOW && Math.hypot(v.x - DROP[0], v.y - DROP[1]) < DROP_R; }),
        { start: mm => { mm.objective('Fly the take out to Bilge\'s boat off the south-east point: low over it', { hint: { kind: 'goto', at: DROP, radius: DROP_R, vehicle: 'gull' } }); const b = mm.one('bilge'); if (b) mm.marker(b, { color: '#ffd23a' }); }, end: mm => { mm.data.dropped = true; }, nav: () => DROP }),
      m.say(['Bag\'s out the door!'], VIV),
      m.say(['Got it! Every last chip. Pleasure doing business, crew.'], BILGE),
      Object.assign(m.waitUntil(mm => { const v = mm.one('gull'); return !!v && v.body.landed && v.z < 2 && v.speed < 6 && Math.hypot(v.x - BAY[0], v.y - BAY[1]) < DOWN_R; }),
        { start: mm => { mm.objective('Set the Gull down on the sea off the south shore, dark', { hint: { kind: 'goto', at: BAY, radius: BAY_R, vehicle: 'gull', land: WEST } }); mm.marker(BAY, { color: '#7aff8a', r: 28 }); }, nav: () => BAY }),
    ])]);
    m.wanted.clear();   // (lights off on the water at night: the police helicopter looks for a plane in the air)
    yield m.say(['Lights off. They\'re searching the sky.', 'That\'s House Edge. The house always loses.'], DEX);
    yield m.say(['Glass Heights: done.', 'Lowtown, Ironside, Glass Heights: every gang in Motopolis knows the crew\'s name.'], { name: 'House Edge', color: '#ffe066', per: 3 });
  },
};

defMission('heist_house_edge', {
  title: 'House Edge', giver: { at: 'heights-board' }, tier: 3, requires: ['heist_the_gull'], district: 'glass-heights', plays: 'viv', allowSwitch: true,
  brief: ['The Velvet Casino\'s take sleeps in the vault behind the cage.', 'Open the vault from inside, stop the cage van, fly the money out.'],
  rewards: { cash: 40000, respect: { velvet: -25 } },
  bonus: [
    { id: 'time', text: 'Under 12:00', check: m => m.elapsed < 720 },
    { id: 'clean', text: 'The Gull down unhurt', check: m => { const v = m.one('gull'); return !!v && v.damage.share > .9; } },
  ],
  stages: [plan, casino, vault, ram, shore, flight],
});
