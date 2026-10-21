// H1 · Setup: Getaway (PLAN.md 9.4): the first of Viv's setups for the bank job, offered from her booth at the Greasy
// Spoke once any one gang's third job is done. Played as Dex. He steals the Zephyr GT out of the Chrome Saints' showroom
// window at Club Chrome (two bouncers watch it), shakes the star its alarm brings, and leaves it with Lefty at the curb
// by the Boom Box Garage: stashed, so it stays in the save's garage and stands where it was left in later missions (the
// Big Withdrawal finds it with m.garaged('getaway')). Then he rides the Vandal 600 Lefty tuned to the foot of the Loop's
// east ramp and leaves it at the curb there, the getaway's plan B (stashed as 'vandal'). Proves: garages and persistent
// vehicles.
//   Each stage's setup restores what it needs (s1-holy-rollers.js is the template): the car it is about, the player near
// enough to it; the bike's stage also stashes a getaway car when a deep link skipped the theft. Lefty's curb and the
// ramp's are the free curb spots nearest the garage and the ramp (m.curb: never on a parked car), found once and kept in
// m.data, so every stage and retry uses the same; whatever Dex leaves is parked there by hand (m.place) as he steps off
// onto the sidewalk, so nothing is left standing in a lane. The bouncers who chase him off the lot give up once he has
// shaken the alarm's star.
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, LEFTY = { name: 'Lefty', color: '#ff5a3a' };
// the gang chains whose third job unlocks the heist (PLAN.md 9.4)
const CHAINS = [['saints_holy_rollers', 'saints_confession_booth', 'saints_drag_mass'], ['rats_rat_run', 'rats_below_deck', 'rats_crane_game'],
  ['gnomes_lawn_order', 'gnomes_bingo_night', 'gnomes_gutter_ball']];
const SHOWROOM = [2264, 760], BOUNCERS = [[2232, 784], [2300, 784]];   // (Club Chrome's plaza: the car in the front window, its bouncers by the curb)
const ACROSS = [2216, 920];   // (the sidewalk across Lantern Lane from the club)
const GARAGE = [700, 1580], RAMP = [2290, 1180];   // (the Boom Box Garage's yard; the foot of the Loop's east ramp: the free curbs nearest them)
const ZEPHYR = { color: '#d01c1c' }, VANDAL = { color: '#84d22a' };

// a curb spot ({ x, y, heading }: a parked car's place; its right-hand side is the sidewalk), found once and kept
const spot = (m, key, near) => (m.data[key] ||= (q => ({ x: Math.round(q.x), y: Math.round(q.y), heading: +q.heading.toFixed(3) }))(m.curb(near)));
/** a point by a curb spot: d along it (the way it faces) and r out to its right, onto the sidewalk */
const by = (q, d, r) => [q.x + Math.cos(q.heading) * d - Math.sin(q.heading) * r, q.y + Math.sin(q.heading) * d + Math.cos(q.heading) * r];
/** the showroom's Zephyr (lit in the window), or the one Dex took */
const zephyr = (m, at = SHOWROOM, heading = Math.PI / 2) => { const v = m.ensure.vehicle('zephyr', 'zephyr', at, { ...ZEPHYR, heading }); v.showLights = true; return v; };
/** Lefty, on the sidewalk by his curb, facing it */
const lefty = m => { const q = spot(m, 'curb', GARAGE); return m.ensure.ped('lefty', 'lefty', by(q, 30, 30), { facing: q.heading - Math.PI / 2 }); };
/** Dex off a vehicle and onto the sidewalk beside its curb spot, and the vehicle parked on the spot (the car by Lefty,
 *  the bike by Dex), kept in the save's garage under id */
function park(m, v, q, id) {
  if (m.vehicle === v) m.place('player', by(q, -6, Math.max(v.hw, 13) + 16));
  m.place(v, [q.x, q.y], { heading: q.heading });
  m.stash(v, id, [q.x, q.y, q.heading]);
}
/** the getaway car kept in the garage: the one Dex left there, or (a deep link past the theft) one parked there now */
function keepGetaway(m) {
  if (m.garaged('getaway')) return;
  const q = spot(m, 'curb', GARAGE), v = m.spawn.vehicle('zephyr', [q.x, q.y], { ...ZEPHYR, heading: q.heading, tag: 'kept' });
  m.stash(v, 'getaway', [q.x, q.y, q.heading]);
}

defMission('heist_getaway', {
  title: 'Setup: Getaway', giver: { at: 'greasy-spoke' }, tier: 1, requires: ['prologue'], plays: 'dex',
  unlock: save => CHAINS.some(chain => chain.every(id => save.missions.done.includes(id))),
  brief: ['Viv needs wheels nobody in Lowtown can catch.', 'The Saints keep a Zephyr GT in the window at Club Chrome.'],
  rewards: { cash: 2000 },
  bonus: [{ id: 'time', text: 'Under 7:00', check: m => m.elapsed < 420 }, { id: 'clean', text: 'The Zephyr in the garage above 80%', check: m => (m.data.zephyr ?? 0) > .8 }],
  stages: [
    { id: 'call', setup(m) { m.as('dex'); },
      *run(m) {
        yield m.say(['Dex. The bank job needs wheels nobody can catch.', 'The Saints keep a Zephyr GT in the window at Club Chrome.', 'Bring it to Lefty at the Boom Box. Then a bike by the Loop, in case.'], VIV);
      } },
    { id: 'showroom',
      setup(m) {
        m.as('dex');
        zephyr(m);
        // (big, and unarmed: they come with their fists. No gang on them: a swing at one rallies no Saint in the street)
        BOUNCERS.forEach((at, i) => m.spawn.ped('saint-grunt', at, { tag: 'bouncer', role: 'guard', facing: Math.PI / 2, weapons: ['fists'], health: 140, name: 'Bouncer ' + (i + 1) }));
        m.data.tries = (m.data.tries || 0) + 1;
        if (m.data.tries > 1 && m.dist(SHOWROOM) > 900) m.place('player', ACROSS);   // (a retry: back across the street from the club)
      },
      *run(m) {
        yield m.enter('zephyr', { text: 'Steal the Zephyr GT from the Club Chrome showroom', lost: 'the Zephyr\'s gone' });
        m.wanted.set(1);   // (the showroom's alarm)
        yield m.evade({ text: 'The showroom\'s alarm: lose the cops before you go near the garage' });
        for (const b of m.tagged('bouncer')) m.remove(b);   // (the bouncers give up the chase)
      } },
    { id: 'garage',
      setup(m) {
        m.as('dex');
        lefty(m);
        if (m.garaged('getaway')) { if (m.dist(m.one('lefty')) > 300) m.place('player', by(spot(m, 'curb', GARAGE), -40, 30)); return; }   // (a retry once it is kept: the keys to Lefty)
        const v = zephyr(m, m.curb('saints-hq'), null);
        if (m.vehicle !== v && m.dist(v) > 240) m.place('player', { in: v });   // (a deep link: in the car, at Club Chrome)
      },
      *run(m) {
        const q = spot(m, 'curb', GARAGE);
        if (!m.garaged('getaway')) {
          yield m.deliver({ what: 'zephyr', to: [q.x, q.y], radius: 48, stopped: true, lost: 'the getaway car is gone', text: 'Take the Zephyr to Lefty, at the curb by the Boom Box Garage' });
          const v = m.one('zephyr');
          m.data.zephyr = v.damage.share;
          v.showLights = false;
          park(m, v, q, 'getaway');
        }
        yield m.reach(m.one('lefty') || by(q, 30, 30), { foot: true, radius: 26, text: 'Leave the keys with Lefty' });
        yield m.say(['Nice paint. Nobody sees it till the day.', 'Your Vandal\'s right here. Don\'t drop her.'], LEFTY);
      } },
    { id: 'bike',
      setup(m) {
        m.as('dex');
        keepGetaway(m);
        lefty(m);
        const q = spot(m, 'curb', GARAGE), b = spot(m, 'bikeCurb', by(q, 70, 0));   // (the free curb nearest, past the Zephyr)
        m.ensure.vehicle('vandal', 'vandal', [b.x, b.y], { ...VANDAL, heading: b.heading });
        if (m.dist(m.one('lefty')) > 300) m.place('player', by(q, 10, 40));   // (a deep link: with Lefty)
      },
      *run(m) {
        yield m.enter('vandal', { text: 'Take Lefty\'s Vandal 600', lost: 'the Vandal is gone' });
        const q = spot(m, 'rampCurb', RAMP);
        yield m.deliver({ what: 'vandal', to: [q.x, q.y], radius: 40, stopped: true, lost: 'the Vandal is gone', text: 'Leave it at the curb by the foot of the Loop\'s east ramp' });
        park(m, m.one('vandal'), q, 'vandal');
        yield m.say(['Wheels with Lefty, a bike by the Loop.', 'Next: the plans. Mine.'], VIV);
      } },
  ],
});
