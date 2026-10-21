// G2 · Bingo Night (PLAN.md 9.4): the Lawn Gnomes' second job. Friday night is bingo night at Gutterball Lanes (Nana's
// numbers racket in a pastel cardigan), and tonight the MPD raids it. Nana's wagon (a Retiree: soft, slow and heavy)
// waits double-parked up Loop Avenue with its engine running; bring it to the lanes' door and she hops in with the
// night's takings. The moment she is aboard the raid is on you: three stars (the MPD Eye overhead, its searchlight on
// the wagon, and roadblocks across the road ahead). Get her up Chapel Street and round onto Lantern Lane to the Greasy
// Spoke, where the cook owes her a favour and the walk-in fridge has room. Once she is in, her girls phone the precinct
// about a fire at the bank and the Eye goes to look: lose the cars still on you. Proves: three stars with the chopper,
// roadblocks, night, a heavy car.
import { defMission, boardingFor } from '../../motor/index.js';

const NANA = { name: 'Nana Petunia Gnorr', color: '#ff8ac8' };
const PHONE = 'phone-gnomes', WEST = Math.PI, EAST = 0;
const DOOR = [712, 1150];   // (the lanes' door, where Nana waits with the takings)
const DINER = [648, 862];   // (Lantern Lane, eastbound, at the Greasy Spoke's door: round the corner from Chapel Street)
const WAGON = '#9ad8b8', TOUGH = 600;   // (Nana: a tough old bird, and the wagon's doors are thick)
// the places the stages start from, the same for every stage and retry (kept in m.data): where the wagon waits, double-
// parked in Loop Avenue's westbound lane up from the lanes; that lane at the lanes' door; the lane at the diner
const parked = m => (m.data.parked ||= m.lane([960, 1234], WEST));
const front = m => (m.data.front ||= m.lane([712, 1234], WEST));
const diner = m => (m.data.diner ||= m.lane(DINER, EAST));
// the night: bingo is at ten
const night = m => { if (m.hour > 5 && m.hour < 20) m.time(22); };
const nanaIn = m => { const n = m.one('nana'), v = m.one('wagon'); return !!(n && v && n.seat && n.seat.vehicle === v); };
const burning = m => { const v = m.one('wagon'); return !v || !!(v.damage && v.damage.burning); };
// the wagon at a spot (a fresh one when the old is gone, wrecked or elsewhere: a retry starts the stage where it starts)
function wagonAt(m, at, far = 150) {
  const old = m.one('wagon');
  if (old && Math.hypot(old.x - at.x, old.y - at.y) > far) m.remove(old);
  const v = m.ensure.vehicle('wagon', 'retiree', at, { heading: at.heading, color: WAGON });
  if (v.damage.share < .6) v.damage.repair();
  return v;
}

defMission('gnomes_bingo_night', {
  title: 'Bingo Night', giver: { phone: 'gnomes' }, gang: 'gnomes', tier: 2, requires: ['gnomes_lawn_order'], plays: 'any',
  brief: ['The MPD is raiding bingo night at Gutterball Lanes.', 'Get Nana out in her wagon, and lose the heat.'],
  rewards: { cash: 3500, respect: { gnomes: 15 } },
  bonus: [
    { id: 'time', text: 'Under 5:00', check: m => m.elapsed < 300 },
    { id: 'wagon', text: 'The wagon above half at the diner', check: m => (m.data.wagon ?? 0) > .5 },
  ],
  stages: [
    { id: 'call', setup(m) { night(m); }, *run(m) {
      yield m.say(['B-7! Oh, it\'s you, dear. Nana here.', 'The MPD is at the front door of my bingo night.', 'My wagon\'s up the avenue with the engine running. Come and get me.'], NANA);
    } },
    {
      id: 'wagon',
      // the wagon double-parked up Loop Avenue (a deep link from across town: the player at the lanes' payphone)
      setup(m) {
        night(m);
        const at = parked(m), v = m.ensure.vehicle('wagon', 'retiree', at, { heading: at.heading, color: WAGON });
        if (v.damage.share < .6) v.damage.repair();
        if (m.dist(v) > 600) m.place('player', PHONE);
      },
      *run(m) { yield m.enter('wagon', { text: 'Take Nana\'s wagon, up Loop Avenue', lost: 'the wagon\'s gone' }); },
    },
    {
      id: 'pickup',
      // the player at the wagon's wheel (a deep link: in it where it was parked); Nana at the lanes' door
      setup(m) {
        night(m);
        const v = wagonAt(m, parked(m), 400);
        if (m.vehicle !== v) m.place('player', { in: v });
        m.ensure.ped('nana', 'nana', DOOR, { facing: Math.PI / 2, health: TOUGH });
      },
      *run(m) {
        m.failIf(m => !m.one('nana'), 'Nana didn\'t make it');
        yield m.reach(front(m), { vehicle: 'wagon', stopped: true, radius: 40, text: 'Pull up at the door of Gutterball Lanes, on Loop Avenue' });
        // she comes out with the takings and gets in (held up a moment, she is helped in)
        const n = m.one('nana'), v = m.one('wagon');
        if (n && v && !n.seat) { const plan = boardingFor(n, v, 1); if (plan) n.board(plan); }
        yield m.parallel([m.say(['Coming, dear! Mind the takings.'], NANA), m.waitUntil(nanaIn, { timeout: 5 })]);
        if (!nanaIn(m) && m.one('nana') && m.one('wagon')) m.place(m.one('nana'), { in: m.one('wagon'), seat: 1 });
      },
    },
    {
      id: 'escape',
      // the raid on: the wagon at the lanes' door, the player at its wheel, Nana beside them, three stars. Drive her up
      // Chapel Street and right onto Lantern Lane, to the diner
      setup(m) {
        night(m);
        const v = wagonAt(m, front(m));
        if (m.vehicle !== v) m.place('player', { in: v });
        const n = m.ensure.ped('nana', 'nana', [v.x, v.y], { health: TOUGH });
        m.place(n, { in: v, seat: 1 });
        if (m.stars < 3) m.wanted.set(3);
        m.allowWanted();   // (the escape is driven with the stars on)
      },
      *run(m) {
        let safe = false;   // (Nana in the diner: what happens to the wagon now is the police's business)
        m.failIf(m => !safe && !m.one('nana'), 'Nana didn\'t make it');
        m.failIf(m => !safe && burning(m), 'Nana\'s wagon went up');
        yield m.parallel([
          m.say(['That\'s the Eye! And they\'ll put up roadblocks.', 'The Greasy Spoke, dear: up Chapel Street, right on Lantern Lane.', 'The cook owes me. The walk-in fridge has room.'], NANA),
          m.reach(DINER, { vehicle: 'wagon', radius: 72, text: 'Get Nana up Chapel Street and onto Lantern Lane, to the Greasy Spoke' }),
        ]);
        const v = m.one('wagon'); m.data.wagon = v ? v.damage.share : 0; safe = true;
        m.remove(m.one('nana'));   // (in at the kitchen door, with the takings)
        // her girls phone the precinct about a fire at the bank: the Eye goes to look, the roadblocks with it
        if (m.stars >= 3) m.wanted.set(2);
        m.data.hot = m.stars;
        yield m.say(['Bless you, dear. My girls just phoned in a fire at the bank.', 'That\'s the Eye gone. Lose the rest before they come knocking.'], NANA);
      },
    },
    {
      id: 'lose',
      // the police still on the wagon at the diner (a retry or a deep link: a fresh wagon there and the two stars
      // again, unless they were shaken off on the way); lose them
      setup(m) {
        night(m);
        const at = diner(m), v = m.one('wagon');
        if (!v || m.dist(at) > 400) { const w = wagonAt(m, at); if (m.vehicle !== w) m.place('player', { in: w }); }
        if (m.stars < 2 && (m.data.hot ?? 2) > 0) m.wanted.set(2);
      },
      *run(m) {
        if (m.stars > 0) { m.music('chase'); yield m.evade({ text: 'Lose the police' }); m.music(null); }
        yield m.say(['B-I-N-G-O, dear! The takings are safe and so are you.'], NANA);
      },
    },
  ],
});
