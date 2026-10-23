// MAYHEM (PLAN.md 9.5): the three rampages. Each starts on foot at its skull marker in a gang's corner of town, hands
// over its weapon (the stage's alone: the player's own come back after) and counts against the clock:
//   - Zap Rats: the Zap-O-Matic among the Harbor Rats on the Fish Market's quay and round it (its arc chains through a
//     huddle; four zaps in a row kill). Any Rat zapped down counts, the city's own too;
//   - Bat Saints: the Lowtown Slugger on the Chrome Saints' cars parked round Marquee Plaza: beaten to half, a car's
//     tank catches (stand back: it goes up a few seconds later, and takes its neighbours with it);
//   - Boom Gangs: the Boom Tube on gang vehicles round the L depot, all three gangs' (parked, and some cruising the
//     block). Any gang vehicle blown up counts, the city's own too.
// While a rampage runs the precinct turns a blind eye (no stars); however it ends, that's lifted. Proves: MAYHEM's
// frame (a skull, a weapon, a count, a clock), kills counted by the BUS, a stage's loadout alone.
import { defActivity } from '../../motor/index.js';

const SKULL = { name: 'MAYHEM', color: '#ff3a3a' };
// an op held beside the count: the stars held at none while the rampage runs (lifted however it ends)
const blindEye = m => Object.assign(m.waitUntil(() => false), { start: mm => mm.wanted.cap(0), end: mm => mm.wanted.clear() });
// a spot near p a body can stand on: a walkable cell with nothing solid on it
function clearSpot(m, p) {
  const C = m.city, T = C.T, map = C.map;
  for (let r = 0; r <= 96; r += 8) for (let k = 0; k < (r ? 12 : 1); k++) {
    const a = k / 12 * Math.PI * 2, x = p[0] + Math.cos(a) * r, y = p[1] + Math.sin(a) * r;
    if (!C.walkable(Math.floor(x / T), Math.floor(y / T))) continue;
    if (map.solidsNear && map.solidsNear(x, y, 12).some(s => !s.deck && s.top > 4 && Math.abs(x - s.x) < s.hx + 9 && Math.abs(y - s.y) < s.hy + 9)) continue;
    return [Math.round(x), Math.round(y)];
  }
  return p;
}
// a rampage: spec { title, at (its skull's point of interest), brief, kit (the loadout), need, secs, label, tag (the
// targets the bot is pointed at), text, spawn(m) (its targets, made once a try), count(m) (how many so far), lines,
// done (the line once it's over), rewards }
function rampage(id, S) {
  defActivity(id, {
    title: S.title, kind: 'mayhem', start: { at: S.at, foot: true, radius: 20 }, brief: S.brief, rewards: S.rewards,
    bonus: [{ id: 'fast', text: `Done with ${S.spare} s to spare`, check: m => (m.data.left ?? 0) >= S.spare }],
    stages: [{
      id: 'rampage',
      setup(m) {
        if (m.dist(S.at) > 300) m.place('player', clearSpot(m, m.at(S.at)));   // (a deep link: at the skull)
        m.loadout({ ...S.kit, health: 100, armor: 100, only: true });
        m.data.city = 0; S.spawn(m);
        if (S.listen) S.listen(m);
      },
      *run(m) {
        yield m.say(S.lines, SKULL);
        const T = m.timer(S.secs, { label: `${S.label} 0/${S.need}` });
        const count = Object.assign(m.waitUntil(mm => { const n = Math.min(S.need, S.count(mm)); T.label = `${S.label} ${n}/${S.need}`; return n >= S.need; }), {
          nav: mm => { const P = mm.mover; let b = null, bd = 1e9; for (const a of mm.tagged(S.tag)) { if (a.dead || a.wrecked || (a.damage && a.damage.burning)) continue; const d = Math.hypot(a.x - P.x, a.y - P.y); if (d < bd) { bd = d; b = a; } } return b; },
          start: mm => { mm.objective(S.text, { hint: { kind: 'kill', targets: S.tag } }); for (const a of mm.tagged(S.tag)) mm.marker(a, { color: '#ff3a3a', ring: false }); },
        });
        yield m.first([blindEye(m), count]);
        m.data.left = T.left; T.stop();
        yield m.say([S.done], SKULL);
      },
    }],
  });
}
const dead = a => a.dead || a.out;
const blown = v => v.wrecked || !!(v.damage && v.damage.burning);

// ---- Zap Rats: the Harbor Rats round the Fish Market, in huddles of three spread over the harbour's blocks, each a
// good way from the next (no huddle hears another's fight); a huddle comes at the player once they're close (or it's
// hurt), fists and a bat
const RAT_HUDDLES = [[1220, 1360], [1480, 1300], [1760, 1350], [2000, 1400], [1270, 1610], [1800, 1620], [1200, 1850], [1460, 1850], [1720, 1840], [1990, 1840]];
rampage('mayhem_zap_rats', {
  title: 'MAYHEM: Zap Rats', at: 'fish-market', brief: ['The Zap-O-Matic. The Harbor Rats. The Fish Market.', 'Zap 24 Rats in 1:30. Four zaps in a row drop one; the arc chains through a huddle.'],
  kit: { weapons: ['zapomatic'], ammo: { zapomatic: 200 }, select: 'zapomatic' }, need: 24, secs: 90, spare: 20, label: 'RATS', tag: 'rat',
  text: 'MAYHEM: zap 24 Rats (the city\'s count too)', lines: ['MAYHEM!', 'Zap 24 Rats in ninety seconds.'], done: 'MAYHEM over. The Rats will remember that.',
  rewards: { cash: 2000, respect: { rats: -10 } },
  spawn(m) {
    if (m.tagged('rat').length) return;
    RAT_HUDDLES.forEach((c, i) => { for (let k = 0; k < 3; k++) {
      const p = clearSpot(m, [c[0] + (k % 2) * 20 - 10, c[1] + (k >> 1) * 20 - 10]);
      m.spawn.ped(k === 0 && i % 2 ? 'rat-enforcer' : 'rat-grunt', p, { tag: 'rat', role: 'enemy', alert: 110, weapons: k === 2 ? ['fists', 'slugger'] : ['fists'], health: 100, armor: 0, facing: m.rng.next() * 6.28 });
    } });
  },
  listen(m) { m.on('kill', e => { if (e.by !== m.player.id) return; const b = m.W.combat && m.W.combat.bodies.find(q => q.id === e.target); if (b && b.gang === 'rats' && b.owner !== 'mission') m.data.city++; }); },
  count: m => m.tagged('rat').filter(dead).length + (m.data.city || 0),
});

// ---- Bat Saints: Chrome Saints cars parked round Marquee Plaza and Club Chrome's street; a car beaten to half its
// health catches fire (and goes up a few seconds later)
const SAINT_SPOTS = ['plaza', [1940, 300], [1790, 300], [1864, 180], [1864, 420], [2000, 420], [1730, 420], [1730, 180], [2000, 180], [1864, 520], [1990, 520], [1740, 520]];
rampage('mayhem_bat_saints', {
  title: 'MAYHEM: Bat Saints', at: 'plaza', brief: ['The Lowtown Slugger. The Chrome Saints\' rides. Marquee Plaza.', 'Smash 7 Saints cars in 2:30. Beat one to half and its tank catches: stand back.'],
  kit: { weapons: ['slugger'], select: 'slugger' }, need: 7, secs: 150, spare: 30, label: 'SAINTS CARS', tag: 'scar',
  text: 'MAYHEM: smash 7 Saints cars with the bat (half-wrecked, they catch fire)', lines: ['MAYHEM!', 'Seven Saints cars. One bat. Two and a half minutes.'], done: 'MAYHEM over. Fender\'s going to cry.',
  rewards: { cash: 2000, respect: { saints: -10 } },
  spawn(m) {
    if (m.tagged('scar').length) return;
    SAINT_SPOTS.forEach((p, i) => { const s = m.curb(p); m.spawn.vehicle(i % 3 === 2 ? 'zephyr' : 'saint', s, { tag: 'scar', heading: s.heading, gang: 'saints', color: i % 2 ? '#c8c8d0' : '#5af0ff' }); });
    // (beaten to half, a car's tank catches: it goes up a few seconds later)
    m.on('hit', e => { const v = m.tagged('scar').find(q => q.id === e.target); if (v && !blown(v) && v.damage.share <= .5) v.damage.flip(); });
  },
  count: m => m.tagged('scar').filter(blown).length,
});

// ---- Boom Gangs: gang vehicles of all three round the L depot (parked along the streets, and a few cruising the
// block slowly), all fair game for the Boom Tube
const GANG_CARS = [
  { def: 'saint', gang: 'saints', at: [1080, 1650] }, { def: 'zephyr', gang: 'saints', at: [880, 1650] }, { def: 'hauler', gang: 'rats', at: [1280, 1760] },
  { def: 'retiree', gang: 'gnomes', at: [1080, 1906] }, { def: 'brute', gang: 'gnomes', at: [880, 1906] }, { def: 'hauler', gang: 'rats', at: [1300, 1906] },
  { def: 'saint', gang: 'saints', at: [760, 1760] }, { def: 'brute', gang: 'gnomes', at: [1240, 1650] }, { def: 'zephyr', gang: 'saints', at: [940, 1760] },
  { def: 'retiree', gang: 'gnomes', at: [1180, 1840], drive: true }, { def: 'hauler', gang: 'rats', at: [960, 1840], drive: true }, { def: 'saint', gang: 'saints', at: [1100, 1700], drive: true },
];
const DRIVERS = { saints: 'saint-grunt', rats: 'rat-grunt', gnomes: 'gnome-grunt' };
const BLOCK = [[1288, 1650], [1288, 1906], [904, 1906], [904, 1650]];   // (round the L depot's block)
rampage('mayhem_boom_gangs', {
  title: 'MAYHEM: Boom Gangs', at: 'l-depot', brief: ['The Boom Tube. Every gang\'s wheels round the L depot.', 'Blow up 9 gang vehicles in 2:00. Keep your distance.'],
  kit: { weapons: ['boomtube'], ammo: { boomtube: 30 }, select: 'boomtube' }, need: 9, secs: 120, spare: 25, label: 'GANG WHEELS', tag: 'gcar',
  text: 'MAYHEM: blow up 9 gang vehicles (the city\'s count too)', lines: ['MAYHEM!', 'Nine gang rides. One Boom Tube. Two minutes.'], done: 'MAYHEM over. Every gang in town wants a word.',
  rewards: { cash: 2500, respect: { saints: -5, rats: -5, gnomes: -5 } },
  spawn(m) {
    if (m.tagged('gcar').length) return;
    GANG_CARS.forEach((c, i) => {
      if (c.drive) { const q = m.lane(c.at); m.spawn.vehicle(c.def, q, { tag: 'gcar', heading: q.heading, gang: c.gang, driver: DRIVERS[c.gang], drive: { route: BLOCK.slice(i % 4).concat(BLOCK.slice(0, i % 4)), loop: true, style: 'calm' } }); }
      else { const s = m.curb(c.at); m.spawn.vehicle(c.def, s, { tag: 'gcar', heading: s.heading, gang: c.gang }); }
    });
  },
  listen(m) { m.on('vehicleDestroyed', e => { if (e.by !== m.player.id) return; const v = m.fleet.byId ? m.fleet.byId(e.vehicle) : null; if (v && v.gang && v.owner !== 'mission') m.data.city++; }); },
  count: m => m.tagged('gcar').filter(blown).length + (m.data.city || 0),
});
