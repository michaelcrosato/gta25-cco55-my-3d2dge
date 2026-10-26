// IV2 · Short Circuit (EXPANSION.md 4, X3): the Volt Boys' second job, played as Dex. The Gnomes are rallying the
// Foundry for the strike, and Sparky wants it shorted out: the Volt Boys' leaflets (POWER CUTS FOR STRIKERS) over the
// rally's three marks, from the air. Dex takes the Duster off Ironside Airstrip, flies over the Smelting Co.'s gates,
// the rail yard and the Union Hall's forecourt (low enough to drop on them: under 260), and brings it down on the
// airstrip again. Proves: the plane, flying to points.
//   The Duster is the airstrip's own (the fleet's, lent to the job), or a fresh one on its apron.
import { defMission } from '../../motor/index.js';

const SPARKY = { name: 'Sparky', color: '#ffd23a' }, DEX = { name: 'Dex', color: '#ff5a4a' };
const APRON = [1616, 1472], STRIP = [1160, 1480], RUNWAY = Math.PI;   // (the Duster's stand by the hangar, nose west; the runway's west end, landed on heading west)
const MARKS = [
  { at: [848, 672], name: 'the Smelting Co.\'s gates' },
  { at: [752, 288], name: 'the rail yard' },
  { at: [304, 768], name: 'the Union Hall\'s forecourt' },
];
const DROP_R = 110, LOW = 260;
const onStrip = v => v.x > 70 * 16 && v.x < 112 * 16 && v.y > 85 * 16 && v.y < 96 * 16;
// the Duster: the job's, the airstrip's own (adopted), or a fresh one on the apron
function duster(m) {
  let d = m.one('duster'); if (d && !d.wrecked && d.damage.share > .5) return d;
  if (d) m.remove(d);
  d = m.fleet.vehicles.find(v => v.def.id === 'duster' && !v.wrecked && !v.driver && v.owner !== 'mission' && onStrip(v));
  if (d) { m.adopt(d, 'duster'); d.damage.repair(); return d; }
  return m.spawn.vehicle('duster', APRON, { tag: 'duster', heading: RUNWAY });
}

defMission('volts_short_circuit', {
  title: 'Short Circuit', giver: { phone: 'volts' }, gang: 'volts', tier: 2, requires: ['volts_live_wire'], district: 'ironside', plays: 'dex',
  brief: ['The Gnomes are rallying the Foundry for the strike.', 'Drop the Volt Boys\' leaflets over the rally\'s three marks from the Duster.'],
  rewards: { cash: 4000, respect: { volts: 15, gnomes: -10 } },
  bonus: [{ id: 'time', text: 'Under 3:00', check: m => m.elapsed < 180 }, { id: 'clean', text: 'The Duster unhurt', check: m => !!m.data.clean }],
  stages: [
    { id: 'call', setup(m) { m.as('dex'); }, *run(m) {
      yield m.say(['Sparky again. The Gnomes are rallying the whole Foundry.', 'We\'ve leaflets in the Duster at the airstrip. POWER CUTS FOR STRIKERS.', 'Drop them on the rally. Low and slow.'], SPARKY);
    } },
    {
      id: 'plane',
      setup(m) { m.as('dex'); const d = duster(m); if (m.dist(d) > 700) m.place('player', [d.x + 10, d.y + 44]); },   // (a deep link: on the apron beside it)
      *run(m) { yield m.enter('duster', { text: 'Take the Duster at Ironside Airstrip', lost: 'the Duster\'s gone' }); },
    },
    {
      id: 'leaflets',
      // Dex in the Duster on the apron (or wherever he is in it: a retry from the air starts with the marks again)
      setup(m) {
        m.as('dex'); const d = duster(m);
        if (m.vehicle !== d) { if (!d.body.landed) m.remove(d); const q = duster(m); m.place('player', { in: q }); }
        m.data.dropped = 0;
      },
      *run(m) {
        m.failIf(mm => !mm.one('duster'), 'the Duster\'s a wreck');
        for (let i = 0; i < MARKS.length; i++) {
          const k = MARKS[i];
          m.objective(`Fly low over ${k.name} and drop the leaflets (${i + 1} of ${MARKS.length})`, { hint: { kind: 'goto', at: k.at, radius: DROP_R, vehicle: 'duster' } });
          m.marker(k.at, { color: '#ffd23a', r: 28 });
          yield Object.assign(m.waitUntil(mm => { const v = mm.vehicle; return !!v && v === mm.one('duster') && !v.body.landed && v.body.z < LOW && Math.hypot(v.x - k.at[0], v.y - k.at[1]) < DROP_R; }), { nav: () => k.at });
          m.data.dropped++;
          if (i < MARKS.length - 1) yield m.say([['Leaflets away!', 'Bombs away. Paper ones.'][i]], DEX);
        }
        yield m.say(['That\'s the rally papered. Bring her home.'], SPARKY);
        m.objective('Land the Duster on the airstrip', { hint: { kind: 'goto', at: STRIP, radius: 60, vehicle: 'duster', land: RUNWAY } });
        m.marker(STRIP, { color: '#7aff8a', r: 28 });
        yield Object.assign(m.waitUntil(mm => { const v = mm.one('duster'); return !!v && mm.vehicle === v && v.body.landed && v.speed < 8 && onStrip(v); }), { nav: () => STRIP });
        const d = m.one('duster'); m.data.clean = !!d && d.damage.share >= .999;
        yield m.say(['Smooth. The Gnomes will be picking paper out of their beards for a week.'], SPARKY);
        yield m.say(['Lead Farm will sell you a Tesla Coil now. Don\'t point it at me.'], SPARKY);
      },
    },
  ],
});
