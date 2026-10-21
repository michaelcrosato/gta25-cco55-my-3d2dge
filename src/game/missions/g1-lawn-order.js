// G1 · Lawn Order (PLAN.md 9.4): the Lawn Gnomes' first job, from their payphone outside Gutterball Lanes. The Chrome
// Saints have taken to parking their chrome in Palm Terraces, on Nana's lawn as good as. Nana hands Gus a Slugger (the
// bat alone: his own kit comes back at the end) and two minutes: smash eight of their cars about the hood. A car is
// smashed once it smokes (it counts, and the next one is the job); beat it on and it burns, and a burning car goes up.
// Every dent is property damage that the street phones in: for the two minutes Nana's girls keep the precinct's
// switchboard busy (the heat piles up, but no car is sent), and once the eighth is done a call gets through (a star):
// lose the police, or get back to the lanes, where the girls hide Gus in the back. Proves: melee against vehicles,
// property-damage heat, the timer. Unlocks the Pineapple at Lead Farm (its unlock is this mission's id).
import { defMission, boxDistance } from '../../motor/index.js';

const NANA = { name: 'Nana Petunia Gnorr', color: '#ff8ac8' };
const START = 'phone-gnomes';
// the lanes' door on Loop Avenue (the way in at the back is the girls' business): within reach of the avenue's lanes, so
// a car driven up to it is there
const DOOR = [712, 1150], HIDE = 100;
const CHROME = '#c8c8d0', CYAN = '#5af0ff', SILVER = '#e8e8ec';
// the Saints' cars about Palm Terraces, each at the curb nearest its point: Loop Avenue by the lanes and the hospital,
// Chapel Street and Palm Walk either side of the lanes, Lantern Lane by the Greasy Spoke, the chapel and the Kwik-Lux.
// Saints drive them hard: each is at three quarters already (a bat dents a car slowly), and locked (a getaway in one is
// a window to break first)
const CARS = [
  { def: 'zephyr', near: [600, 1200], color: CYAN },
  { def: 'saint', near: [312, 1200], color: CHROME },
  { def: 'saint', near: [520, 1040], color: CHROME },
  { def: 'zephyr', near: [520, 760], color: SILVER },
  { def: 'zephyr', near: [648, 872], color: CYAN },
  { def: 'saint', near: [904, 872], color: CHROME },
  { def: 'zephyr', near: [904, 1040], color: SILVER },
  { def: 'saint', near: [1032, 1200], color: CHROME },
];
const N = CARS.length, TIME = 120, WORN = .75, AT = 10, OFF = 24;
const standing = v => !v.out && !v.wrecked && !(v.damage && v.damage.burning);
const left = m => m.tagged('saints').filter(standing).length;
const aim = n => `Smash the Saints' cars about Palm Terraces with the bat: ${n} to go`;
// the objective as the smashing goes: how many are left, and the way to the next (the nearest standing). Until Gus is
// up against it the hint walks him over (the sidewalks, round the lamp posts and the passers-by); against it, it is
// the bat's
function smashing(m) {
  let key = null;
  return m.waitUntil(mm => {
    const P = mm.player; let t = null, td = 1e9;
    for (const v of mm.tagged('saints')) if (standing(v)) { const d = boxDistance(v, P.x, P.y); if (d < td) { td = d; t = v; } }
    if (!t) return false;
    const walk = key && !key.walk ? td > OFF : td > AT, n = left(mm), k = walk + ':' + t.id + ':' + n;
    if (key && key.k === k) return false;
    key = { k, walk };
    mm.objective(aim(n), { hint: walk ? { kind: 'goto', at: [Math.round(t.x), Math.round(t.y)], radius: 8, foot: true } : { kind: 'kill', targets: 'saints' } });
    return false;
  });
}
// while the clock runs no star shows (the heat the dents earn piles up all the same). The eighth car done, one call gets
// through (a star at most: the heat stage takes it from there, and lifts it); the time run out or the job quit, they
// all do
const switchboard = m => Object.assign(m.waitUntil(() => false), { start: mm => mm.wanted.cap(0), end: mm => mm.wanted.cap(left(mm) ? 5 : 1) });
// the one call's worth of police (a patrol to arrest: no shooting, so no stray rounds into a smoking Saint beside Gus),
// however the op ends (lost them, wrecked, nabbed, quit) the cap lifted
const oneCall = m => Object.assign(m.waitUntil(() => false), { start: mm => mm.wanted.cap(1), end: mm => mm.wanted.cap(5) });

defMission('gnomes_lawn_order', {
  title: 'Lawn Order', giver: { phone: 'gnomes' }, gang: 'gnomes', tier: 1, requires: ['prologue'], plays: 'gus',
  brief: ['The Chrome Saints keep parking on Nana\'s lawn.', 'Smash eight of their cars in Palm Terraces with a bat. Two minutes.'],
  rewards: { cash: 2500, respect: { gnomes: 15, saints: -5 } },
  bonus: [
    { id: 'spare', text: 'Thirty seconds to spare', check: m => (m.data.spare ?? 0) >= 30 },
    { id: 'light', text: 'Not one of them in flames', check: m => !m.data.burnt },
  ],
  stages: [
    { id: 'call', setup(m) { m.as('gus'); }, *run(m) {
      yield m.say(['Gus, dear. Nana here.', 'The Saints keep parking their tin cans on my lawn.', 'Teach them some manners. With a bat.'], NANA);
    } },
    {
      id: 'smash',
      // Gus at the lanes' payphone (a deep link, a retry from the hospital: brought back), the bat alone in hand, no heat
      // on him, the eight cars fresh at their curbs, the two minutes from the top
      setup(m) {
        m.as('gus');
        if (m.dist(START) > 300) m.place('player', START);
        m.loadout({ weapons: ['slugger'], select: 'slugger', only: true, health: 100, armor: 100 });   // (and Nana's knitted vest)
        m.wanted.clear();
        for (const c of CARS) { const at = m.curb(c.near); m.spawn.vehicle(c.def, at, { tag: 'saints', heading: at.heading, color: c.color, health: WORN, locked: true }); }
        m.timer(TIME, { reason: 'time' });
        m.data.burnt = false;
      },
      *run(m) {
        // a car smoking is smashed: it counts (the kill op's done), and the next one is the job. Nana's girls, watching
        // from the lawns, hand Gus a fresh vest for each (a passer-by a swing catches may well swing back)
        m.on('hit', e => {
          const v = m.tagged('saints').find(a => a.id === e.target); if (!v || !v.damage) return;
          if (v.damage.burning || v.wrecked) m.data.burnt = true;
          if (!v.out && v.damage.smoking) { v.out = true; m.loadout({ armor: 100 }); }
        });
        // and a passer-by who swings back (a skater the bat caught, his mates with him) gets shooed off by the girls
        // before a brawl eats the two minutes: it runs, and its troupe with it
        m.on('hit', e => { if (m.player && e.target === m.player.id) m.shoo(e.by); });
        yield m.first([switchboard(m), smashing(m), m.parallel([
          m.say(['Eight of them. Two minutes.', 'Chrome dents lovely.'], NANA),
          m.kill('saints', { count: N, text: aim(N) }),
        ])]);
        m.objective('');   // (the count's objective is the smashing's own: done with it)
        const T = m.countdown; m.data.spare = T ? T.left : 0; if (T) T.stop();
        if (m.tagged('saints').some(v => v.wrecked || (v.damage && v.damage.burning))) m.data.burnt = true;
      },
    },
    {
      id: 'heat',
      // the street's call got through: lose the police, or get back to the lanes, where the girls hide Gus in the back
      // till they've gone (none on you, a retry, a deep link: nothing to lose)
      setup(m) { m.as('gus'); },
      *run(m) {
        if (m.stars > 0) {
          const text = 'The street called the police: lose them, or get back to Gutterball Lanes and the girls will hide you';
          m.allowWanted();   // (the way back is made with the star on)
          yield m.first([oneCall(m), m.parallel([
            m.say(['That\'s eight. Lovely work, dear.', 'The girls let a call through to the precinct now.', 'Lose the fuzz, or come back to the lanes and we\'ll hide you.'], NANA),
            m.first([m.evade({ text }), m.sequence([m.reach(DOOR, { radius: HIDE, text }), m.waitUntil(mm => { mm.wanted.clear(); return true; })])]),
          ])]);
        } else { m.wanted.cap(5); yield m.say(['That\'s eight. Lovely work, dear.'], NANA); }
        yield m.say(['Lead Farm will sell you a Pineapple now.', 'Tell them Nana sent you.'], NANA);
      },
    },
  ],
});
