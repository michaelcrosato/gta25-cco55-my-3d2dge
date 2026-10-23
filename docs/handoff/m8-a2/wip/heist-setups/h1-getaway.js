// H1 · Setup: Getaway (PLAN.md 9.4): the first of Viv's setups for the bank job, offered from her booth at the Greasy
// Spoke once any one gang's third job is done. Played as Dex. He steals the Zephyr GT out of the Chrome Saints' showroom
// window at Club Chrome (two bouncers watch it), shakes the star its alarm brings, and leaves it with Lefty at the curb
// outside the Boom Box Garage: stashed, so it stays in the save's garage and stands where it was left in later missions
// (the Big Withdrawal finds it with m.garaged('getaway')). Then he rides the Vandal 600 Lefty tuned to the foot of the
// Loop's east ramp, two blocks from the bank, and leaves it there for the getaway's plan B (stashed as 'vandal').
// Proves: garages and persistent vehicles.
//   Each stage's setup restores what it needs (s1-holy-rollers.js is the template): the car it is about, the player near
//   enough to it; the bike's stage also stashes a getaway car when a deep link skipped the theft. Nobody is left standing
//   in the road while lines are said: Lefty waits on the sidewalk, the bike is left at the curb and Dex steps off it.
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, LEFTY = { name: 'Lefty', color: '#ff5a3a' };
// the gang chains whose third job unlocks the heist (PLAN.md 9.4)
const CHAINS = [['saints_holy_rollers', 'saints_confession_booth', 'saints_drag_mass'], ['rats_rat_run', 'rats_below_deck', 'rats_crane_game'],
  ['gnomes_lawn_order', 'gnomes_bingo_night', 'gnomes_gutter_ball']];
const SHOWROOM = [2264, 760], BOUNCERS = [[2232, 784], [2300, 784]];   // (Club Chrome's plaza: the car in the front window, its bouncers by the curb)
const ACROSS = [2216, 920];   // (the sidewalk across Lantern Lane from the club)
// Lefty's curb: Chapel Street's east curb outside the Boom Box Garage (the car nose north, the Vandal at the curb ahead
// of it), Lefty on the sidewalk beside it, between the Loop's pillars and the lamps
const GARAGE = { x: 545, y: 1528, heading: -Math.PI / 2 }, LEFTY_AT = [576, 1520], BIKE = [545, 1456];
const RAMP = [2290, 1180];   // (the foot of the Loop's east ramp, two blocks south of the bank)
const ZEPHYR = { color: '#d01c1c' }, VANDAL = { color: '#84d22a' };

/** the showroom's Zephyr (lit in the window), or the one Dex took */
const zephyr = (m, at = SHOWROOM, heading = Math.PI / 2) => { const v = m.ensure.vehicle('zephyr', 'zephyr', at, { ...ZEPHYR, heading }); v.showLights = true; return v; };
/** the sidewalk beside a curb spot (a car parks at the right-hand curb: the sidewalk is on its right), d out from it */
const curbside = (q, d = 26) => [q.x - Math.sin(q.heading) * d, q.y + Math.cos(q.heading) * d];
/** out of a vehicle on its curb side, as a garage's drop-off puts the driver (m.remove's way): never into the traffic */
function outCurbside(m, v) { if (m.vehicle === v) m.place('player', curbside({ x: v.x, y: v.y, heading: v.heading }, v.hw + 10)); }
// Lefty's curb kept free: the city's cars parked on it (nobody in them) moved off
function clearGarage(m) {
  for (const v of [...m.fleet.vehicles]) {
    if (v.owner !== 'world' || v.stashed || v.seats.some(Boolean) || v.cls === 'rail' || v.cls === 'heli') continue;
    if (Math.abs(v.x - GARAGE.x) < 24 && v.y > BIKE[1] - 50 && v.y < GARAGE.y + 70) m.fleet.remove(v);
  }
}
/** the getaway car kept in the garage: the one Dex left there, or (a deep link past the theft) one put there now */
function keepGetaway(m) {
  if (m.garaged('getaway')) return;
  clearGarage(m);
  const v = m.spawn.vehicle('zephyr', [GARAGE.x, GARAGE.y], { ...ZEPHYR, heading: GARAGE.heading, tag: 'getaway' });
  m.stash(v, 'getaway', [GARAGE.x, GARAGE.y, +GARAGE.heading.toFixed(3)]);
}
const lefty = m => m.ensure.ped('lefty', 'lefty', LEFTY_AT, { facing: Math.PI });

defMission('heist_getaway', {
  title: 'Setup: Getaway', giver: { at: 'greasy-spoke' }, tier: 1, requires: ['prologue'], plays: 'dex',
  unlock: save => CHAINS.some(chain => chain.every(id => save.missions.done.includes(id))),
  brief: ['Viv needs wheels nobody in Lowtown can catch.', 'The Saints keep a Zephyr GT in the window at Club Chrome.'],
  rewards: { cash: 2000 },
  bonus: [{ id: 'time', text: 'Under 7:00', check: m => m.elapsed < 420 }, { id: 'clean', text: 'The Zephyr in the garage above 80%', check: m => (m.data.zephyr ?? 0) > .8 }],
  stages: [
    { id: 'call', setup(m) { m.as('dex'); },
      *run(m) {
        yield m.say(['Dex. The bank job needs wheels nobody can catch.', 'The Saints keep a Zephyr GT in the window at Club Chrome.', 'Bring it to Lefty. Then a bike by the Loop, in case.'], VIV);
      } },
    { id: 'showroom',
      setup(m) {
        m.as('dex');
        zephyr(m);
        BOUNCERS.forEach((at, i) => m.spawn.ped('saint-grunt', at, { tag: 'bouncer', role: 'guard', facing: Math.PI / 2, weapons: ['fists'], health: 140, name: 'Bouncer ' + (i + 1) }));   // (big, and unarmed: they come with their fists)
        m.data.tries = (m.data.tries || 0) + 1;
        if (m.data.tries > 1 && m.dist(SHOWROOM) > 900) m.place('player', ACROSS);   // (a retry: back across the street from the club)
      },
      *run(m) {
        yield m.enter('zephyr', { text: 'Steal the Zephyr GT from the Club Chrome showroom', lost: 'the Zephyr\'s gone' });
        m.wanted.set(1);   // (the showroom's alarm)
        yield m.evade({ text: 'The showroom\'s alarm: lose the cops before you go near the garage' });
      } },
    { id: 'garage',
      setup(m) {
        m.as('dex');
        clearGarage(m);
        lefty(m);
        if (m.garaged('getaway')) { if (m.dist(LEFTY_AT) > 300) m.place('player', [LEFTY_AT[0], LEFTY_AT[1] + 20]); return; }   // (a retry once it is kept: the keys to Lefty)
        const v = zephyr(m, m.curb('saints-hq'), null);
        if (m.vehicle !== v && m.dist(v) > 240) m.place('player', { in: v });   // (a deep link: in the car, at Club Chrome)
      },
      *run(m) {
        if (!m.garaged('getaway')) {
          yield m.deliver({ what: 'zephyr', to: [GARAGE.x, GARAGE.y], radius: 40, stopped: true, lost: 'the getaway car is gone', text: 'Take the Zephyr to Lefty, at the curb outside the Boom Box Garage' });
          const v = m.one('zephyr');
          m.data.zephyr = v.damage.share;
          v.showLights = false;
          outCurbside(m, v);
          m.stash(v, 'getaway', [Math.round(v.x), Math.round(v.y), +v.heading.toFixed(3)]);
        }
        yield m.reach(LEFTY_AT, { foot: true, radius: 28, text: 'Leave the keys with Lefty' });
        yield m.say(['Nice paint. Nobody sees it till the day.', 'Your Vandal\'s right here. Don\'t drop her.'], LEFTY);
      } },
    { id: 'bike',
      setup(m) {
        m.as('dex');
        keepGetaway(m);
        lefty(m);
        m.ensure.vehicle('vandal', 'vandal', BIKE, { ...VANDAL, heading: -Math.PI / 2 });
        if (m.dist(LEFTY_AT) > 400) m.place('player', [LEFTY_AT[0], LEFTY_AT[1] - 16]);   // (a deep link: with Lefty)
      },
      *run(m) {
        yield m.enter('vandal', { text: 'Take Lefty\'s Vandal 600', lost: 'the Vandal is gone' });
        const at = m.curb(RAMP);
        yield m.deliver({ what: 'vandal', to: [at.x, at.y], radius: 30, stopped: true, lost: 'the Vandal is gone', text: 'Ride it to the foot of the Loop\'s east ramp' });
        const b = m.one('vandal');
        outCurbside(m, b);
        m.stash(b, 'vandal', [Math.round(b.x), Math.round(b.y), +b.heading.toFixed(3)]);
        yield m.reach(curbside(at, 30), { foot: true, radius: 16, text: 'Leave it there for the getaway: onto the sidewalk' });
        yield m.say(['Wheels with Lefty, a bike by the Loop.', 'Next: the plans. Mine.'], VIV);
      } },
  ],
});
