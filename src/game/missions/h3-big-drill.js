// H3 · Setup: The Big Drill (PLAN.md 9.4): Viv's third setup for the bank job, from her booth at the Greasy Spoke.
// Played as Gus. The vault sits on two feet of steel, so the job needs the Drill Rig the builders keep at the
// Construction Site: no keys and no engine in it, so Gus backs his Hookline onto its nose, hooks it, and tows it out
// onto Chapel Street and round to the Boom Box Garage's yard in the Brickyard, where Lefty hides it for the job. The
// rig carries the builders' tracker: from the moment it is on the hook the MPD follow it at two stars all the way (a
// floor: they never lose it; a cap: it never comes to more), and a truck with a rig on its hook is slow. At the yard
// the tracker comes off, the stars go, and the yard keeps the rig (stashed as 'drill': in the save's garage). Proves:
// towing, a heavy vehicle, the wanted level.
//   The rig stands double-parked in Chapel Street's lane along the site's east fence (the builders' way), nose north,
// the builders' car parked behind it, and Gus's Hookline waits in the lane in front of it, its hook a short reverse off
// the rig's nose: the city's cars park at every curb round the site on every seed, and from there the tow is straight
// up Chapel Street and three right turns to the yard. Each stage's setup restores what it needs (s1-holy-rollers.js is
// the template): the truck and the rig at the site, Gus by his truck; a retry finds them where the tow stopped (NABBED,
// WRECKED: back at the wheel, the rig hooked again if it came off), or, one of them wrecked, starts again at the site.
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, GUS = { name: 'Gus', color: '#ff9a2a' }, LEFTY = { name: 'Lefty', color: '#ff5a3a' };
const NORTH = -Math.PI / 2, EAST = 0, HL = 40;   // (the Hookline's and the rig's half length: one chassis)
const SITE = [510, 1490], GUS_AT = [484, 1374];   // (Chapel Street by the site, northbound; Gus on the sidewalk beside his truck)
// the Brickyard's drop: the street south of the Boom Box Garage's yard (one way, west), at the yard's gate. The truck
// drives on to GOAL so the rig on its hook comes to rest by the gate; the yard keeps the rig in its back lot (YARD)
const GATE = [700, 1650], GOAL = [636, 1650], YARD = { x: 770, y: 1540, heading: EAST };
const LEFTY_AT = [712, 1596];   // (at the yard's gate, on the sidewalk)
const RIG = { color: '#24503a' }, HOOKLINE = { color: '#e07a2a' };

// the rig's spot in the lane, the truck's in front of it where the bot lines up for the hook (its centre 100 u off the
// rig's nose: a 60 u reverse onto it), and the builders' car parked behind it (nothing to hook from that end, so the
// Hookline always comes in from the front, whatever squeezes past at the moment it is chosen; gone once it's hooked)
const rigAt = m => (m.data.rigAt ||= (q => ({ x: Math.round(q.x), y: Math.round(q.y), heading: NORTH }))(m.lane(SITE, NORTH)));
const truckAt = m => { const q = rigAt(m); return { x: q.x, y: q.y - (2 * HL + 60), heading: NORTH }; };
const behind = m => { const q = rigAt(m); return [q.x, q.y + HL + 36]; };
/** the rig at the site (or where it is now), and Gus's Hookline (at the site, or where he left it) */
const rig = m => { const q = rigAt(m); return m.ensure.vehicle('rig', 'drillrig', [q.x, q.y], { ...RIG, heading: q.heading }); };
const builders = m => m.ensure.vehicle('builders', 'cortez', behind(m), { color: '#e8c040', heading: NORTH, locked: true });
const truck = m => { const q = truckAt(m); return m.ensure.vehicle('hookline', 'hookline', [q.x, q.y], { ...HOOKLINE, heading: q.heading }); };
const hooked = m => { const r = m.one('rig'), t = m.one('hookline'); return !!(r && t && r.towedBy === t); };
// the tow's objective: a deliver hint naming the truck (the bot backs the Hookline onto the rig and hooks it, then
// drives it to GOAL)
const towHint = () => ({ kind: 'deliver', what: 'rig', to: GOAL, tow: 'hookline' });
// the rig has no engine: whoever climbs into its cab climbs down again, told to tow it
const noDriving = text => m => {
  const r = m.one('rig');
  if (r && m.vehicle === r) { m.place('player', r.toWorld(0, -r.hw - 14)); m.objective(text, { hint: towHint() }); }   // (down by its door)
  return false;
};
// the site as the job starts it: the rig on its spot (a fresh one, off any hook), the Hookline in front of it, Gus at
// the wheel; whatever of theirs a retry finds wrecked or burning is cleared away first (a wreck in the lane blocks the
// rig's nose, and a burning one goes up beside the new truck)
function atSite(m) {
  for (const v of [...m.tagged('hookline'), ...m.tagged('rig')]) if (v.wrecked || (v.damage && v.damage.burning)) m.remove(v);
  const old = m.one('rig'); if (old) m.remove(old);
  const r = rig(m), t = truck(m), q = truckAt(m);
  builders(m);
  if (r.damage.share < .9) r.damage.repair();
  m.place(t, [q.x, q.y], { heading: q.heading });
  if (t.damage.share < .6) t.damage.repair();
  m.place('player', { in: t });
}
// hooked: the truck and the rig held where they stand (Gus on the handbrake). The reverse onto the nose leaves them
// rolling back, and a brake held on a truck rolling back drives it on backwards (motorRequests)
function hold(m) {
  for (const v of [m.one('hookline'), m.one('rig')]) if (v) m.place(v, [v.x, v.y], { heading: v.heading });
  for (const b of m.tagged('builders')) m.remove(b);   // (the lane behind free again)
}
// the hook: back the truck onto the rig's nose and hook it (the stage's own op); in the rig's cab, Gus is put down again
function hookOp(m, text) {
  const hook = m.waitUntil(mm => hooked(mm) || noDriving(text)(mm));
  return { ...hook, start: mm => { mm.objective(text, { hint: towHint() }); const r = mm.one('rig'); if (r) mm.marker(r, { color: '#7ac8ff' }); }, nav: mm => mm.one('rig') };
}

defMission('heist_big_drill', {
  title: 'Setup: The Big Drill', giver: { at: 'greasy-spoke' }, tier: 3, requires: ['heist_blueprints'], plays: 'gus',
  brief: ['The vault sits on two feet of steel. The job needs a drill.', 'Tow the Drill Rig from the Construction Site to the Brickyard.'],
  rewards: { cash: 2000 },
  bonus: [{ id: 'time', text: 'Under 5:00', check: m => m.elapsed < 300 }, { id: 'clean', text: 'The rig above 75%', check: m => (m.data.rig ?? 0) > .75 }],
  stages: [
    { id: 'call', setup(m) { m.as('gus'); },
      *run(m) {
        yield m.say(['Gus. The vault sits on two feet of steel.', 'There\'s a Drill Rig at the Construction Site. No keys, no engine.', 'Tow it to Lefty at the Boom Box. It has a tracker: the cops follow it all the way.'], VIV);
      } },
    { id: 'truck',
      setup(m) {
        m.as('gus');
        rig(m); truck(m); if (!hooked(m)) builders(m);
        if (m.dist(GUS_AT) > 300) m.place('player', GUS_AT);   // (Gus at the site, his Hookline by him)
      },
      *run(m) {
        yield m.enter('hookline', { text: 'Get in your Hookline at the Construction Site', lost: 'the Hookline is wrecked' });
      } },
    { id: 'hook',
      setup(m) {
        m.as('gus');
        const t = m.one('hookline'), r = m.one('rig');
        if (!t || !r || m.dist(rigAt(m)) > 600) atSite(m);   // (a deep link, or a wreck: at the wheel in front of the rig at the site)
        else if (m.vehicle !== t) m.place('player', { in: t });   // (a retry: back at the wheel, where the truck stands)
        m.failIf(mm => !mm.one('rig'), 'the Drill Rig is wrecked');
        m.failIf(mm => !mm.one('hookline'), 'the Hookline is wrecked');
      },
      *run(m) {
        yield hookOp(m, 'Back the Hookline onto the Drill Rig\'s nose and hook it (fire)');
        hold(m);
        yield m.say(['Easy, old girl.', 'You weigh more than my opinions.'], GUS);
      } },
    { id: 'tow',
      setup(m) {
        m.as('gus');
        m.wanted.clear();
        const t = m.one('hookline'), r = m.one('rig');
        if (!t || !r) atSite(m);   // (a deep link, or a wreck: the tow again from the site, the rig off the hook)
        else if (m.vehicle !== t) m.place('player', { in: t });   // (a retry, NABBED or WRECKED: back at the wheel where the tow stopped)
        m.ensure.ped('lefty', 'lefty', LEFTY_AT, { facing: Math.PI / 2 });
        m.marker(GATE, { color: '#7aff8a', r: 28 });
      },
      *run(m) {
        let there = false;   // (till the yard has it, the truck and the rig are the job)
        m.failIf(mm => !there && !mm.one('hookline'), 'the Hookline is wrecked');
        m.failIf(mm => !there && !mm.one('rig'), 'the Drill Rig is wrecked');
        if (!hooked(m)) { yield hookOp(m, 'Hook the Drill Rig (back onto its nose, fire)'); hold(m); }
        m.wanted.set(2); m.wanted.floor(2); m.wanted.cap(2); m.allowWanted();   // (the tracker: two stars, and the police never lose it)
        const text = 'Tow the rig to Lefty at the Boom Box Garage (the cops track it: they follow all the way)';
        const arrive = m.waitUntil(mm => { noDriving(text)(mm); const r = mm.one('rig'); return !!r && hooked(mm) && Math.hypot(r.x - GATE[0], r.y - GATE[1]) < 100 && (r.speed || 0) < 10; });
        yield m.parallel([m.say(['Tracker\'s live. Here they come.'], GUS),
          { ...arrive, start: mm => mm.objective(text, { hint: towHint() }), nav: mm => (hooked(mm) ? GOAL : mm.one('rig')) }]);
        there = true; hold(m);
        const r = m.one('rig');
        m.data.rig = r.damage.share;
        m.wanted.clear();
        yield m.say(['Tracker\'s off. Round the back with her.', 'Nobody looks for a drill in a body shop.'], LEFTY);
        // the yard unhooks it (off the hook, the rig made again in its back lot) and keeps it for the job
        m.remove(r);
        m.stash(m.spawn.vehicle('drillrig', [YARD.x, YARD.y], { ...RIG, heading: YARD.heading, health: m.data.rig, tag: 'kept' }), 'drill', [YARD.x, YARD.y, YARD.heading]);
        yield m.say(['Plans, wheels, a drill. Now we need a bank.'], VIV);
      } },
  ],
});
