// P0 · Two Wheels, No Brakes (PLAN.md 9.4): the prologue a new game starts with. Morning at St. Christopher's Chapel,
// the crew's safehouse: Dex Moreno, courier, owes everybody, and his own bike is in hock. Viv has a job for him: Gus's
// lunch, bagged at the Greasy Spoke, wanted hot at the Palm Car Wash. Dex walks out of the chapel, sprints to a moped
// at the curb and takes it, rides to the diner, hops off for the bag and back on, and races the clock across Palm
// Terraces and down Palm Walk to the car wash. On the way home, up Chapel Street through the lights at Loop Avenue, a
// cruiser parked by the junction sees him run the red (one star): lose the police, get back to the chapel and save the
// game at its door. Each objective names its control ({action} glyphs, as the career's prompts write them).
// Proves: the onboarding (walk, sprint, getting in and out, a bike), the GPS, a timer, one star and the evade, saving.
// Every stage's setup puts the world back as it starts (the moped where that stage finds it, the player near it), so a
// retry and #mission/prologue/<stage> start it.
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, DEX = { name: 'Dex', color: '#ff5a4a' }, GUS = { name: 'Gus', color: '#ff9a2a' };
const MPD = { name: 'MPD', color: '#5a9aff' };
const NORTH = -Math.PI / 2, EAST = 0, WEST = Math.PI;
const DOOR = 'safehouse';             // (the chapel's door, on its lawn north of Lantern Lane: where Dex starts and saves)
const STREET = [296, 824];            // (the sidewalk at the chapel's gate, on Lantern Lane)
const SPOKE = [648, 862], BAG = [632, 824];   // (Lantern Lane at the Greasy Spoke's door; the lunch on the sidewalk by it)
const WASH = [760, 1906];             // (Canal Street, westbound, at the Palm Car Wash)
const FRONT = [296, 862];             // (Lantern Lane at the chapel's gate)
// home by road: up Chapel Street (one-way north) to Lantern Lane, the chapel a step west of the corner. Lantern Lane
// runs east, so the chapel's own front is reached only up Gnome Row, through the lights at its Loop Avenue junction:
// there a closed stub west of the box turns cars round into it, and the ramp's traffic merges, and it jams for minutes
const CORNER = [510, 940];
const MOPED = { def: 'sparrow', color: '#f2a7c3' };
// the curbs the moped and the cop park at, as runs of spots in the order they are tried (m.curb's nearest free spot can
// be a street away, or across town, when the city has parked on these): the moped across Lantern Lane from the chapel,
// a sprint east of its gate (the Medic is parked at 312 on every seed, and Chapel Street's junction starts at 480), else
// short of Gnome Row; the cop at Chapel Street's east curb (x 545, facing north) by the lights at Loop Avenue (its box
// y 1184-1328), north of them nearest the junction first, else south
// (along(a, b, axis, at): the spots every 4 u from a to b along x or y, the other coordinate at)
const along = (a, b, axis, at) => { const out = []; for (let v = a, s = Math.sign(b - a) * 4; (b - v) * s >= 0; v += s) out.push(axis === 'x' ? [v, at] : [at, v]); return out; };
const MOPED_CURB = { heading: EAST, half: 50, spots: [...along(440, 344, 'x', 897), [448, 897], ...along(176, 160, 'x', 897)], near: [440, 897] };
const COP_CURB = { heading: NORTH, half: 62, spots: [...along(1136, 960, 'y', 545), ...along(1360, 1560, 'y', 545)], near: [545, 1100] };

// the places the stages start from, the same for every stage and retry (kept in m.data)
const spokeLane = m => (m.data.spoke ||= m.lane(SPOKE, EAST));
const washLane = m => (m.data.wash ||= m.lane(WASH, WEST));
const cornerLane = m => (m.data.corner ||= m.lane(CORNER, NORTH));
// the first spot of a curb's run with nothing parked on it ({ x, y, heading }): no vehicle's centre within C.half along
// the curb and 24 across it (the city parks 64 u apart); none free, m.curb's
function curbOf(m, C) {
  const c = Math.cos(C.heading), s = Math.sin(C.heading);
  const free = ([x, y]) => !m.fleet.near(x, y, C.half + 40).some(v => v.body && !v.wrecked && Math.abs((v.x - x) * c + (v.y - y) * s) < C.half && Math.abs(-(v.x - x) * s + (v.y - y) * c) < 24);
  const q = C.spots.find(free);
  return q ? { x: q[0], y: q[1], heading: C.heading } : m.curb(C.near);
}
const mopedSpot = m => (m.data.mopedAt ||= curbOf(m, MOPED_CURB));
const copSpot = m => (m.data.copAt ||= curbOf(m, COP_CURB));
const pt = q => [Math.round(q.x), Math.round(q.y)];
const near = (m, q, r) => Math.hypot(m.mover.x - q[0], m.mover.y - q[1]) < r;
// a new day: the courier's morning (a new game's clock says night)
const morning = m => { if (m.hour < 6 || m.hour > 19) m.time(8); };
// Dex, and the precinct not minding him until the story says so (a first-timer's bumps and scrapes earn no star)
function dex(m, cap = 0) { m.as('dex'); morning(m); m.wanted.cap(cap); }
// the moped at a spot ({ x, y, heading }): the one about when it is near, else a fresh one there (the old one removed);
// o.seat: the player put on it
function mopedAt(m, at, o = {}) {
  const old = m.one('moped');
  if (old && Math.hypot(old.x - at.x, old.y - at.y) > (o.far ?? 300)) m.remove(old);
  const v = m.ensure.vehicle('moped', MOPED.def, at, { heading: at.heading, color: MOPED.color });
  if (v.damage && v.damage.share < .6) v.damage.repair();
  if (o.seat && m.vehicle !== v) m.place('player', { in: v });
  return v;
}
const onMoped = m => { const v = m.one('moped'); return !!v && m.vehicle === v && v.driver === m.player; };
// the lunch walked over and taken. The bot's walk ends 14 u short of its goal (TUNE.autoArrive) and a pickup is taken
// within 12, so the hint's point is a step past the bag, on from where Dex is as the step starts: the walk ends on it
const taken = m => m.tagged('bag').some(k => k.taken);
function grab(m, text) {
  return Object.assign(m.waitUntil(taken), {
    nav: mm => { const k = mm.tagged('bag').find(q => !q.taken); return k ? [k.x, k.y] : null; },
    start: mm => {
      const k = mm.tagged('bag').find(q => !q.taken); if (!k) return;
      const P = mm.mover, dx = k.x - P.x, dy = k.y - P.y, d = Math.hypot(dx, dy) || 1;
      mm.objective(text, { hint: { kind: 'goto', at: [Math.round(k.x + dx / d * 12), Math.round(k.y + dy / d * 12)], radius: 8, foot: true } });
      mm.marker([k.x, k.y], { color: '#7aff8a', r: 10 });
    },
  });
}

// the game saved at the chapel's door: the career offers its SAVE there while this step's hint is a goto with interact,
// and BUS 'save' says it was written (m.data.saved). Storage can refuse it (a private window, a headless run): then the
// step ends once Dex has stood at the door 6 s. Its objective and marker go with it (the bot stops pressing)
function saveAtDoor(m, text) {
  const door = m.at(DOOR); let since = null;
  return Object.assign(m.waitUntil(mm => {
    if (mm.data.saved) return true;
    if (mm.vehicle || Math.hypot(mm.player.x - door[0], mm.player.y - door[1]) >= 18) { since = null; return false; }
    since ??= mm.stageTime;
    return mm.stageTime - since > 6;
  }), {
    nav: () => door,
    start: mm => {
      mm.on('save', () => { mm.data.saved = true; });
      mm.objective(text, { hint: { kind: 'goto', at: door, radius: 16, foot: true, interact: true } });
      mm.marker(door, { color: '#7af0ff', r: 12 });
    },
  });
}

defMission('prologue', {
  title: 'Two Wheels, No Brakes', giver: { intro: true, at: 'safehouse' }, tier: 1, requires: [], plays: 'dex',
  brief: ['Gus wants his lunch hot, and Dex owes him.', 'Borrow a moped, beat the clock, and stay out of trouble. Mostly.'],
  rewards: { cash: 500 },
  bonus: [
    { id: 'hot', text: 'Lunch delivered with 20 s to spare', check: m => (m.data.spare ?? 0) >= 20 },
    { id: 'shook', text: 'Lost the cop in under 30 s', check: m => (m.data.lostIn ?? 1e9) < 30 },
  ],
  stages: [
    {
      id: 'wake',
      // Dex at the chapel's door (a deep link from elsewhere: put there), the moped waiting at the curb
      setup(m) {
        dex(m);
        mopedAt(m, mopedSpot(m), { far: 60 });
        if (m.dist(DOOR) > 120) m.place('player', DOOR);
      },
      *run(m) {
        // (a player ahead of the lesson, already on the moped (or in anything): on to the next at once, Viv's lines
        // playing on)
        const riding = mm => !!mm.vehicle;
        yield m.first([
          m.parallel([
            m.say(['Dex. You up? Gus wants his lunch.', 'The Greasy Spoke has it bagged, and he wants it hot.'], VIV),
            m.reach(STREET, { foot: true, radius: 20, text: 'Walk out of the chapel to the street' }),
          ]),
          m.waitUntil(riding),
        ]);
        if (m.vehicle) return;
        const v = m.one('moped'), at = v ? [Math.round(v.x), Math.round(v.y)] : pt(mopedSpot(m));
        yield m.first([
          m.parallel([
            m.say(['Your bike\'s in hock, I know. There\'s a moped at the curb.'], VIV),
            m.reach(at, { foot: true, radius: 36, text: 'Hold {sprint} to sprint to the moped at the curb' }),
          ]),
          m.waitUntil(riding),
        ]);
      },
    },
    {
      id: 'moped',
      // the moped at its curb, Dex beside it (a deep link: on the sidewalk across from it); one ahead of the lesson, on
      // it already, rides on
      setup(m) {
        dex(m);
        if (onMoped(m)) return;
        const at = mopedSpot(m), v = mopedAt(m, at, { far: 60 });
        if (!m.vehicle && m.dist(v) > 200) m.place('player', [at.x - 30, at.y - 70]);
      },
      *run(m) {
        yield m.enter('moped', { text: 'Steal the moped: {interact} to hop on', lost: 'the moped\'s a wreck' });
      },
    },
    {
      id: 'pickup',
      // Dex on the moped (wherever it is: a deep link puts him on it at its curb); the lunch on the sidewalk by the diner
      setup(m) {
        dex(m);
        const v = m.one('moped') || mopedAt(m, mopedSpot(m));
        if (!m.vehicle && m.dist(v) > 150) m.place('player', { in: v });
        m.spawn.pickup('item', BAG, { item: 'lunch', tag: 'bag' });
      },
      *run(m) {
        m.failIf(mm => !mm.one('moped'), 'the moped\'s a wreck');
        yield m.first([
          m.parallel([
            m.say(['Borrowing. It\'s called borrowing.'], DEX),
            m.reach(pt(spokeLane(m)), { vehicle: 'moped', stopped: true, radius: 40, text: 'Ride to the Greasy Spoke, east on Lantern Lane: {vehicle:throttle} to go, {vehicle:brake} to stop' }),
          ]),
          m.waitUntil(taken),
        ]);
        yield grab(m, 'Hop off with {interact} and grab the lunch by the diner\'s door');
        yield m.say(['Chili dogs. Two. Get them to the car wash hot, Dex.'], VIV);
      },
    },
    {
      id: 'run',
      // the lunch in the moped's box, the clock running: Dex at the diner (a retry: on a fresh moped there), the drop
      // at the Palm Car Wash on Canal Street. The clock is the road's own time there, three times over and a grace
      setup(m) {
        dex(m);
        const at = spokeLane(m), v = m.one('moped');
        if (!v || Math.hypot(v.x - at.x, v.y - at.y) > 300) mopedAt(m, at, { far: 0, seat: true });   // (in the lane at the door: the Vandal the city parks there has the curb)
        m.data.T ||= Math.max(45, Math.min(120, Math.round((m.eta(pt(washLane(m))) ?? 15) * 3 + 15)));
        m.timer(m.data.T, { reason: 'the lunch went cold', label: 'LUNCH' });
      },
      *run(m) {
        m.failIf(mm => !mm.one('moped'), 'the moped\'s a wreck');
        if (!onMoped(m)) yield m.enter('moped', { text: 'Back on the moped: {interact}', lost: 'the moped\'s a wreck' });
        yield m.reach(pt(washLane(m)), { vehicle: 'moped', stopped: true, radius: 40, text: 'Get the lunch to Gus at the Palm Car Wash, on Canal Street: {vehicle:handbrake} to slide round corners' });
        const T = m.countdown; m.data.spare = T ? T.left : 0; if (T) T.stop();
        yield m.say(['Still warm. The universe provides.', 'Tell Viv we\'re square. She\'ll know I\'m lying.'], GUS);
      },
    },
    {
      id: 'home',
      // back to the chapel: Canal Street west, then up Chapel Street through the lights at Loop Avenue, where an MPD
      // cruiser waits at the curb. Riding past it is running the red in front of a cop: one star (Dex on the moped at
      // the car wash, a retry or a deep link: put there)
      setup(m) {
        m.wanted.clear(); dex(m);
        const at = washLane(m), v = m.one('moped');
        if (!v || Math.hypot(v.x - at.x, v.y - at.y) > 400) mopedAt(m, at, { far: 0, seat: true });   // (in the lane where the drop leaves it: the nearest free curb can be a street away)
        const c = copSpot(m), cop = m.ensure.vehicle('cop', 'cruiser', c, { heading: c.heading, driver: 'mpd' });
        cop.siren = false;
      },
      *run(m) {
        const cop = () => m.one('cop');
        // past him: on Chapel Street and level with him (riding north: out of the junction, so the chase starts on the
        // straight, not mid-turn in the box), or close by from any side
        const past = mm => {
          const c = cop(), P = mm.mover; if (!c) return false;
          return (Math.abs(P.x - c.x) < 90 && P.y < c.y + 12 && P.y > c.y - 200) || Math.hypot(P.x - c.x, P.y - c.y) < 48;
        };
        // (the ride is the moped's delivery home: the bot keeps to it in a jam, driving round again and again, as a
        // moped slips through one. Home by another way, in anything, is home too)
        const corner = pt(cornerLane(m));
        yield m.first([
          m.waitUntil(past),
          m.waitUntil(mm => near(mm, corner, 56) || near(mm, FRONT, 64)),
          m.deliver({ what: 'moped', to: corner, radius: 56, lost: 'the moped\'s a wreck', text: 'Ride home: west on Canal Street, then up Chapel Street to Lantern Lane' }),
        ]);
        const c = cop(); if (c) c.siren = true;
        m.wanted.cap(1); m.wanted.set(1);
      },
    },
    {
      id: 'lose',
      // one star: lose them (a retry, after the precinct: Dex on a fresh moped up Chapel Street, the star again)
      setup(m) {
        dex(m, 1);
        if (m.stars < 1) {
          const c = copSpot(m);
          if (m.dist([c.x, c.y]) > 500) mopedAt(m, m.lane([510, 1000], NORTH), { far: 0, seat: true });
          m.wanted.set(1);
        }
      },
      *run(m) {
        yield m.parallel([
          m.say(['That light was red, courier! Pull over!'], MPD),
          m.evade({ text: 'Lose the cops: stay out of their sight till the star goes out' }),
        ]);
        m.data.lostIn = m.stageTime;
        const c = m.one('cop'); if (c) c.siren = false;
        yield m.say(['Two wheels, no brakes, no ticket.'], DEX);
      },
    },
    {
      id: 'save',
      // home: back to the chapel, and the game saved at its door (saveAtDoor; storage refused, the pass's autosave
      // tries again). From across town the ride home comes first (up Chapel Street to the corner: Lantern Lane is
      // one-way); nearer, the door is the objective, walked or ridden
      setup(m) { dex(m, 1); },
      *run(m) {
        if (m.dist(DOOR) > 700) yield m.first([m.waitUntil(mm => near(mm, FRONT, 64)), m.reach(pt(cornerLane(m)), { radius: 56, text: 'Ride home: up Chapel Street to Lantern Lane' })]);
        m.data.saved = false;
        yield saveAtDoor(m, 'Save the game: {interact} at the chapel door');
        yield m.say(m.data.saved ? ['Saved. Rent\'s paid. For today.'] : ['Home. Rent\'s paid. For today.'], DEX);
      },
    },
  ],
});
