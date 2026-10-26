// IG2 · Scab Labour (EXPANSION.md 4, X3): the Lawn Gnomes' second job in Ironside. The Volt Boys are bussing scabs to
// the Smelting Co. to break the strike: three white buses waiting at their stops along Loop Avenue's east end, each
// pulling out west along it for the Foundry in turn, slowly (a full bus, a careful driver). Bramble lends Gus the
// Gnomes' Brute: stop all three before any of them reaches the Smelting Co.'s gates. A bus is ramming work: rammed by
// the Brute (a blow, not a push: the two closing at 60 or more) its engine dies and its scabs bail out (and a wrecked
// one is stopped too, however it was done); one that gets to the gates breaks the strike. Proves: moving targets,
// ramming.
//   The stops, the times each bus waits there and its way in are fixed (the same for every try); a retry starts the
//   buses at their stops again, and Gus in the Brute across Loop Avenue from the hall.
import { defMission } from '../../motor/index.js';

const BRAMBLE = { name: 'Shop Steward Bramble', color: '#ff8ac8' };
const GATES = [848, 880], ARRIVE = 96;   // (the Smelting Co.'s gates: Loop Avenue's lane in front of them)
const HALL = [304, 952];   // (across Loop Avenue from the Union Hall: the Brute at the eastbound curb, facing the way to the buses)
// each bus: its stop (a lane point near it: it waits there, scabs aboard) and how long it waits before it pulls out
// (along Loop Avenue's westbound lanes in Voltage Row: their way in is the avenue itself, so Gus meets each head on:
// buses at stops round the district had driven in by ways a Brute could only chase round the one-way blocks)
const BUSES = [
  { at: [1696, 872], wait: 15 },    // (by the Substation)
  { at: [1856, 872], wait: 40 },    // (by Canal Street)
  { at: [1968, 872], wait: 65 },    // (at the east bridge's end)
];
const BUS = { def: 'hauler', color: '#f0f0ec', health: .5 };   // (a hired bus, old and thin-skinned)
const RAMS = 1, BLOW = 60;   // (how many rams stop a bus; how fast the two must close for a ram to count)
const stopped = b => b.out || b.wrecked || !!(b.damage && b.damage.burning);
const aim = n => `Ram the scab buses off the road before they reach the Smelting Co.: ${n} to go`;

defMission('gnomes_scab_labour', {
  title: 'Scab Labour', giver: { phone: 'gnomes', at: 'phone-union' }, gang: 'gnomes', tier: 2, requires: ['gnomes_picket_line'], district: 'ironside', plays: 'gus',
  brief: ['The Volt Boys are bussing scabs in to break the strike.', 'Wreck all three buses before any of them reaches the Smelting Co.'],
  rewards: { cash: 4000, respect: { gnomes: 15, volts: -10 } },
  bonus: [
    { id: 'time', text: 'Under 3:00', check: m => m.elapsed < 180 },
    { id: 'stops', text: 'Two of them stopped at their stops', check: m => (m.data.atStop ?? 0) >= 2 },
  ],
  stages: [
    { id: 'call', setup(m) { m.as('gus'); }, *run(m) {
      yield m.say(['Gus, is it? Bramble. The Volt Boys are bussing scabs to the Smelting Co.', 'Three buses. None of them gets there.', 'The Brute\'s yours for the night. Mind the paint. Or don\'t.'], BRAMBLE);
    } },
    {
      id: 'buses',
      // Gus in the Brute by the Union Hall, the three buses at their stops (fresh each try), a bat and the Snub to hand
      setup(m) {
        m.as('gus');
        for (let i = 1; i <= BUSES.length; i++) for (const b of m.tagged('bus' + i)) m.remove(b);
        const q = m.data.rideAt ||= (c => ({ x: Math.round(c.x), y: Math.round(c.y), heading: +c.heading.toFixed(3) }))(m.curb(HALL, { heading: 0 }));
        const old = m.one('ride'); if (old && (old.damage.share < .6 || Math.hypot(old.x - q.x, old.y - q.y) > 80)) m.remove(old);
        const ride = m.ensure.vehicle('ride', 'brute', q, { heading: q.heading, color: '#ff8ac8' });
        if (m.vehicle !== ride) m.place('player', { in: ride });
        BUSES.forEach((b, i) => { const at = m.lane(b.at); m.spawn.vehicle(BUS.def, at, { tag: 'bus' + (i + 1), heading: at.heading, color: BUS.color, health: BUS.health, driver: 'volt-grunt', gang: 'volts' }); });
        m.data.atStop = 0; m.data.gone = [false, false, false];
      },
      *run(m) {
        const buses = BUSES.map((_, i) => m.one('bus' + (i + 1)));
        // each bus pulls out from its stop when its wait is up, slowly, for the gates; one there breaks the strike
        m.failIf(() => buses.some(b => !stopped(b) && Math.hypot(b.x - GATES[0], b.y - GATES[1]) < ARRIVE), 'the scabs got to the Smelting Co.');
        // each step: a bus pulls out when its wait is up; a ram by the Brute (the two touching, closing fast: H4's count)
        // breaks it down (its scabs bail out, its driver runs)
        const watch = m.waitUntil(mm => {
          const ride = mm.one('ride');
          buses.forEach((b, i) => {
            if (stopped(b)) { if (!b.counted) { b.counted = true; if (!mm.data.gone[i]) mm.data.atStop++; } return; }
            if (!mm.data.gone[i] && mm.stageTime >= BUSES[i].wait) { mm.data.gone[i] = true; mm.drive(b, { to: GATES, style: 'slow' }); }
            if (!ride || mm.vehicle !== ride) return;
            const near = Math.hypot(b.x - ride.x, b.y - ride.y) < b.hl + ride.hl + 6, R = b.ram || (b.ram = { n: 0, contact: false });
            if (near && !R.contact && ride.speed + b.speed > BLOW) { R.contact = true; R.n++; if (R.n >= RAMS) { b.out = true; mm.drive(b, null); if (b.damage) b.damage.health = Math.min(b.damage.health, b.damage.max * .2); } }
            else if (!near && Math.hypot(b.x - ride.x, b.y - ride.y) > b.hl + ride.hl + 24) R.contact = false;
          });
          return false;
        });
        // one bus at a time, in the order they pull out (the next to leave its stop is the next to stop: a player chasing
        // the nearest had let the first drive on to the gates while he rammed a bus still parked)
        const each = buses.map((b, i) => m.kill('bus' + (i + 1), { text: aim(buses.length - i), vehicle: 'ride', done: stopped }));
        yield m.first([watch, m.parallel([
          m.say(['They\'re lined up on Loop Avenue by the Substation. Go!'], BRAMBLE),
          m.sequence(each),
        ])]);
        yield m.say(['Three buses, no scabs. The Smelting Co. stays shut.', 'You\'re a natural on a picket line, Gus.'], BRAMBLE);
      },
    },
  ],
});
