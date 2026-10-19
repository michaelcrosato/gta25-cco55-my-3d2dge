// G3 · Gutter Ball (PLAN.md 9.4): the Lawn Gnomes' third job. The Harbor Rats tipped off the MPD about bingo night,
// and Nana wants their boathouse pier, at the end of Wharf Street, burned to the waterline. Their boat fuel stands in
// drums on the pier: set them going (a Party Starter lobbed onto the planks, or a lick of Lefty's Hot Mess) and the
// drums go up and the pier with them (pier planking burns well, and the blaze spreads from plank to plank). Then the
// Rats come running: hold Dock Road's corner up the street with two of Nana's girls, and get out, by the Rats' own
// speedboat from the marina (out to sea past the harbour wall) or by road, in the Gnomes' Brute up Wharf Street to the
// L's Harbor station. Proves: fire spread, explosions, boats, a gang war. Unlocks the Boom Tube at Lead Farm (its
// unlock is this mission's id).
import { defMission } from '../../motor/index.js';

const NANA = { name: 'Nana Petunia Gnorr', color: '#ff8ac8' }, GIRL = { name: 'Gnome', color: '#8affc8' };
// the pier's foot: the end of Wharf Street, where the Rats' footbridge goes out to the boathouse pier (the road's
// asphalt doesn't burn: the place to work from). The quay's sheds either side of the footbridge differ from night to
// night: the way along the footbridge is the one sure line of sight onto the pier
const FOOT = [2196, 2224];
// the Rats' fuel: three drums on the pier's landward side, the first straight out along the footbridge (the others
// within a blast's reach of it: one going up lights the rest through the planks). The objective points at them in this
// order
const DRUMS = [[2304, 2216], [2290, 2252], [2290, 2164]];
// the blaze once they go: the boathouse pier's planking, from the footbridge out to the far end
const BLAZE = [[2300, 2180], [2330, 2230], [2360, 2180], [2360, 2280], [2400, 2220], [2320, 2300]];
const REACH = 112, LIT = .5, FUSE = .8;
// the fight: up Wharf Street at Dock Road's corner, where Nana's girls wait (the burning planks well behind)
const HOLD = [2000, 2232];
// the escape: the Rats' own speedboat, moored at the marina's north pier (out east past the harbour wall, to the open
// sea), or the Gnomes' Brute up the street (west along Wharf Street, one way, to the L's Harbor station)
const MOOR = [2290, 1758], SEA = [2520, 1760], STATION = [1296, 2232];
const KIT = { weapons: ['partystarter', 'hotmess'], ammo: { partystarter: 10, hotmess: 300 }, only: true };
const WAVES = [
  { tag: 'w1', from: [[1768, 2216], [1784, 2256], [1800, 2200]], line: 'Here come the Rats, up Wharf Street!' },
  { tag: 'w2', from: [[2056, 2128], [2072, 2120], [2040, 2140]], line: 'More of them down Dock Road! North!' },
  { tag: 'w3', from: [[1780, 2232], [2064, 2124], [1800, 2264, 'boss']], line: 'That big one\'s their enforcer. Go on, dear!' },
];
// the Rats of the counter-attack: dockside muscle (short bursts, wide of the mark), a fair fight for a player at the
// pier's foot with the girls beside them. No gang of the city's: a stray hit rallies none of the city's Rats, and a
// kill costs no respect beyond the job's own
const AIM = { range: .45, burst: .45, pause: 1.2, aimOff: .16 };
const rat = (m, at, tag, kind) => m.spawn.ped(kind === 'boss' ? 'rat-enforcer' : 'rat-grunt', at, { tag, role: 'enemy', attack: true, profile: AIM,
  health: kind === 'boss' ? 160 : 75, weapons: kind === 'boss' ? ['fists', 'persuader'] : ['fists', 'snub38'] });
const girls = m => { for (const [i, at] of [[1984, 2200], [1984, 2264]].entries()) m.ensure.ped('girl' + i, 'gnome-grunt', at, { role: 'ally', health: 160, armor: 60, weapons: ['slugger'] }); };

// ---- the fuel drums: mission props that catch from the fire grid (a cell burning by them) and go up a moment later
function drums(m) {
  if (m.tagged('fuel').length) return;
  DRUMS.forEach(([x, y]) => {
    m.spawn.prop('barrel', [x, y], { tag: 'fuel' });
    m.spawn.prop('barrel', [x + 9, y + 3], { tag: 'stack' }); m.spawn.prop('barrel', [x + 3, y + 10], { tag: 'stack' });   // (the rest of the stack: dressing)
  });
  for (const [x, y, k] of [[2348, 2168, 'crate'], [2380, 2196, 'pallet'], [2340, 2260, 'crate'], [2392, 2288, 'pallet'], [2410, 2240, 'crate']]) m.spawn.prop(k, [x, y], { tag: 'dock' });
}
const standing = q => !q.blown;
// each step: a drum with fire at its foot is lit; FUSE s later it goes up (a blast, and the planks round it ablaze). The
// blast is nobody's (the fire did it): no crime of the player's, no respect lost to the Rats burned on their own pier
function fuse(m) {
  const C = m.W.combat;
  for (const q of m.tagged('fuel')) {
    if (q.blown) continue;
    if (q.lit === undefined && m.heat([q.x, q.y], 24) > LIT) q.lit = m.stageTime;
    if (q.lit !== undefined && m.stageTime - q.lit >= FUSE) {
      q.blown = true; q.dead = true;
      if (C) C.explosives.blast({ x: q.x, y: q.y, z: 6, damage: 80, splash: 56, by: null, source: 'drum' });
      m.fire([q.x, q.y], 40, 30);
      for (const s of m.tagged('stack')) if (Math.hypot(s.x - q.x, s.y - q.y) < 20) s.dead = true;
    }
  }
}
// the objective while the drums stand: the next standing one in DRUMS' order, the bot's way to it (in reach, the fire
// button held at it)
function torching(m) {
  let key = null;
  return m.waitUntil(mm => {
    fuse(mm);
    const left = mm.tagged('fuel').filter(standing); if (!left.length) return true;
    const t = left[0], k = t.x + ',' + t.y + ':' + left.length; if (key === k) return false; key = k;
    mm.objective(`Torch the Rats' fuel drums on the boathouse pier (${left.length} left): a Party Starter, or a lick of the Hot Mess`,
      { hint: { kind: 'goto', at: [t.x, t.y], spray: [t.x, t.y], reach: REACH } });
    return false;
  });
}
// an op that never ends, doing f(m, dt) each step, run beside a stage's own in m.first. While it runs the precinct is
// busy with bingo night's paperwork (no stars: the explosions and the gunfire on the pier earn no heat, and the officers
// who come with the fire brigade have other things to do), and a Rat of the city's that the player kills costs no
// respect beyond the job's own. However it ends (the stage won, the stage failed, the job quit) the heat is forgotten
// and the cap lifted
const war = (m, f = () => {}) => {
  let last = m.stageTime, un = null;
  return Object.assign(m.waitUntil(mm => { const t = mm.stageTime; f(mm, Math.max(0, t - last)); last = t; return false; }), {
    start: mm => {
      mm.wanted.cap(0);
      const G = mm.W.life && mm.W.life.gangs;
      if (G) un = mm.on('respect', e => { if (e.gang === 'rats' && e.delta < 0 && (e.why === 'kill' || e.why === 'car')) G.add('rats', -e.delta, 'war'); });
    },
    end: mm => { mm.wanted.set(0); mm.wanted.clear(); if (un) un(); un = null; },   // (the heat gone before the cap lifts: no star shows)
  });
};
// the player at the pier's foot (a deep link, a retry: there, on foot)
const atFoot = (m, far = 300) => { if (m.dist(FOOT) > far || m.vehicle) m.place('player', FOOT); };

defMission('gnomes_gutter_ball', {
  title: 'Gutter Ball', giver: { phone: 'gnomes' }, gang: 'gnomes', tier: 3, requires: ['gnomes_bingo_night'], plays: 'any',
  brief: ['The Harbor Rats tipped off the MPD about bingo night.', 'Burn their boathouse pier, hold off the Rats, and get out.'],
  rewards: { cash: 5000, respect: { gnomes: 20, rats: -15 } },
  bonus: [
    { id: 'time', text: 'Under 6:00', check: m => m.elapsed < 360 },
    { id: 'boat', text: 'Away in the Rats\' own speedboat', check: m => !!m.data.byBoat },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['The Rats tipped off the MPD about my bingo night, dear.', 'Their boathouse pier is all planks and boat fuel.', 'Lefty\'s left you a crate of Party Starters and his Hot Mess. Burn it.'], NANA);
    } },
    {
      id: 'arrive',
      setup() {},
      *run(m) { yield m.reach(FOOT, { foot: true, radius: 20, text: 'Get to the Rats\' boathouse pier, at the end of Wharf Street (on foot for the last of it)' }); },
    },
    {
      id: 'torch',
      // at the pier's foot with the bottles and the flamer (the job's alone), the drums stacked on the planks
      setup(m) {
        atFoot(m, 40);
        m.loadout({ ...KIT, select: 'hotmess', health: 100, armor: 50 });
        drums(m);
      },
      *run(m) {
        yield m.first([war(m), torching(m)]);
        for (const [x, y] of BLAZE) m.fire([x, y], 36, 40);   // (and the planks between them: the boathouse pier ablaze)
        yield m.say(['Lovely. That\'s burning nicely, dear.'], NANA);
      },
    },
    {
      id: 'fight',
      // the Rats come for whoever lit their pier: three lots of them, up the street and down Dock Road. Lefty's
      // Buzzsaw, a fresh vest, and two of Nana's girls with bats at Dock Road's corner (a retry, a deep link: there)
      setup(m) {
        if (m.dist(HOLD) > 400 || m.vehicle) m.place('player', HOLD);
        m.loadout({ weapons: ['buzzsaw'], ammo: { buzzsaw: 400 }, select: 'buzzsaw', health: 100, armor: 100 });
        girls(m);
        if (m.data.wave === undefined) m.data.wave = 0;
      },
      *run(m) {
        m.failIf(m => m.dist(HOLD) > 520, 'you ran from the fight');
        if (m.dist(HOLD) > 48) yield m.first([war(m), m.reach(HOLD, { foot: true, radius: 40, text: 'Back up Wharf Street to Nana\'s girls at Dock Road\'s corner' })]);
        for (let i = m.data.wave; i < WAVES.length; i++) {
          const W = WAVES[i];
          if (!m.tagged(W.tag).length) for (const [x, y, k] of W.from) rat(m, [x, y], W.tag, k);
          yield m.first([war(m), m.parallel([m.say([W.line], GIRL), m.kill(W.tag, { text: 'Hold Dock Road\'s corner: the Rats are coming' })])]);
          m.data.wave = i + 1;
          if (i + 1 < WAVES.length) m.loadout({ health: 100, armor: 100 });   // (the girls patch you up between them)
        }
      },
    },
    {
      id: 'escape',
      // away before the fire brigade: the Rats' own speedboat at the marina, or the Gnomes' Brute up Wharf Street
      setup(m) {
        if (m.dist(HOLD) > 520) m.place('player', HOLD);
        m.ensure.vehicle('boat', 'bilgerat', MOOR, { heading: 0 });
        const at = m.lane([1880, 2232], Math.PI); m.ensure.vehicle('ride', 'brute', at, { heading: at.heading, color: '#ff8ac8' });
      },
      *run(m) {
        const text = 'Get away: steal the Rats\' speedboat at the marina and head out to sea, or take the Brute up Wharf Street to the L';
        // (out at sea only a boat can be: the Rats' moored one, or the marina's own)
        const r = yield m.first([war(m), m.first([m.reach(SEA, { inVehicle: true, radius: 90, text }), m.reach(STATION, { radius: 90, text })])]);
        m.data.byBoat = !!(r.value && r.value.index === 0 && m.vehicle && m.vehicle === m.one('boat'));
        yield m.say(['Gutter ball, dear! Lead Farm will sell you a Boom Tube now.', 'Tell them Nana sent you.'], NANA);
      },
    },
  ],
});
