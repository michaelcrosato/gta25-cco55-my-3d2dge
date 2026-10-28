// GH2 · Setup: The Gull (EXPANSION.md 4, X6): Dex's setup for House Edge, from the planning board once Floor Plan is
// done. The take needs a way out the Syndicate's cars can't follow: the Yacht Club's seaplane, the Gull, moored
// alongside the Club's pier. Dex walks out along the pier, takes it, runs it off the water and flies it out of the
// Club's sight, then sets it down on the sea off the south shore, west of the marina, in along the shore over its low
// roofs: left riding there for the night, where House Edge takes off. The Club notices (two stars) once it is off the
// water, and loses it once it is down. Proves: the seaplane: a take-off from the water, a landing on it.
//   Every stage's setup puts the world as it needs it: the Gull at its moorings (the Club's own, adopted), or where it
//   was left; a deep link to the flight puts Dex at its controls on the water.
import { defMission } from '../../motor/index.js';

const DEX = { name: 'Dex', color: '#ff5a4a' }, VIV = { name: 'Viv', color: '#3ad0c8' }, T = 16;
const MOORING = { x: 110.8 * T, y: 106.6 * T, heading: Math.PI / 2 };   // (alongside the Club's pier's east side: the fleet's own place for it)
const BAY = [36 * T, 109.5 * T], BAY_R = 64, DOWN_R = 360, WEST = Math.PI;   // (the sea off the south shore, west of the marina: landed heading west along it, in low over the shore's low roofs, the piers' ends north of the line; down and stopped anywhere along that stretch)

// the Gull: the job's own, the Club's at its moorings (adopted), or a fresh one there
function gull(m) {
  let v = m.one('gull'); if (v && (v.wrecked || v.sinking || v.sunk)) { m.remove(v); v = null; }
  if (v) return v;
  const w = m.fleet.vehicles.find(q => q.def.id === 'gull' && !q.wrecked && !q.driver && q.owner !== 'mission');
  return w ? m.adopt(w, 'gull') : m.spawn.vehicle('gull', [MOORING.x, MOORING.y], { tag: 'gull', heading: MOORING.heading });
}
const flying = v => !!v && !!v.body && !v.body.landed;

defMission('heist_the_gull', {
  title: 'Setup: The Gull', giver: { at: 'heights-board' }, tier: 2, requires: ['heist_floor_plan'], district: 'glass-heights', plays: 'dex',
  brief: ['House Edge needs a way out the Syndicate can\'t drive after.', 'Steal the Yacht Club\'s seaplane and set it down off the south shore, out of the Club\'s sight.'],
  rewards: { cash: 3000, respect: { yacht: -10 } },
  bonus: [{ id: 'time', text: 'Under 4:00', check: m => m.elapsed < 240 }, { id: 'clean', text: 'The Gull above 80%', check: m => (m.data.health ?? 0) > .8 }],
  stages: [
    { id: 'plan', setup(m) {
      m.as('dex'); const q = m.at('heights-board'); m.place('player', [q[0] + 40, q[1] + 20], { within: 60 });
    }, *run(m) {
      yield m.reach('heights-board', { text: 'To the planning board', foot: true, radius: 20 });
      yield m.say(['Out of the casino, the Syndicate own every road on the Strip.', 'So we don\'t take a road. The Yacht Club keep a seaplane off their pier.'], VIV);
      yield m.say(['The Gull. Floats, a high wing, and the Commodore never flies it.', 'I\'ll put her down off the south shore, past the marina. Nobody looks for a plane on the open sea.'], DEX);
    } },
    {
      id: 'steal',
      setup(m) { m.as('dex'); const v = gull(m); if (m.dist(v) > 1200) m.place('player', 'club-pier'); m.wanted.clear(); },
      *run(m) { yield m.enter('gull', { text: 'Take the Gull, moored off the Yacht Club\'s pier', lost: 'the Gull\'s gone' }); },
    },
    {
      id: 'fly',
      // Dex at the Gull's controls (a deep link, a retry from far off: on the water at its moorings)
      setup(m) {
        m.as('dex'); let v = m.one('gull');
        if (v && (v.damage.share < .6 || (!flying(v) && Math.hypot(v.x - MOORING.x, v.y - MOORING.y) > 600 && Math.hypot(v.x - BAY[0], v.y - BAY[1]) > 600))) m.remove(v);
        v = gull(m); if (m.vehicle !== v) m.place('player', { in: v });
      },
      *run(m) {
        m.failIf(mm => { const v = mm.one('gull'); return !v || v.wrecked || v.sinking > 0 || v.sunk; }, 'the Gull went down');
        const heat = m.waitUntil(mm => { if (flying(mm.one('gull')) && !mm.data.seen) { mm.data.seen = true; mm.allowWanted(); mm.wanted.set(2); } return false; });   // (off the water: the Club phones it in; flown on with the stars, down on the water they lose it)
        yield m.first([heat, m.sequence([
          m.say(['Off the water, round, and down along the shore. Easy.'], DEX),
          Object.assign(m.waitUntil(mm => { const v = mm.one('gull'); return !!v && v.body.landed && v.z < 2 && v.speed < 6 && Math.hypot(v.x - BAY[0], v.y - BAY[1]) < DOWN_R; }),
            { start: mm => mm.objective('Fly the Gull round and set it down on the sea off the south shore, west of the marina', { hint: { kind: 'goto', at: BAY, radius: BAY_R, vehicle: 'gull', land: WEST } }), nav: () => BAY }),
        ])]);
        const v = m.one('gull'); m.data.health = v ? v.damage.share : 0;
        m.wanted.clear();
        yield m.say(['Riding at anchor off the south shore. The Club will be looking for her up the coast.'], DEX);
      },
    },
  ],
});
