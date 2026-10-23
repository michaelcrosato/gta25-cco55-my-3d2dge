// H2 · Setup: Blueprints (PLAN.md 9.4): Viv's second setup for the bank job, from her booth at the Greasy Spoke. Played
// as Viv, at night. The vault's plans are in the First Lowtown Bank's records office: past the tellers' counter, up the
// staff corridor and its guard, under the CCTV (src/game/interiors/bank.js). At the bank the night janitor is out on his
// smoke break, and Viv chooses (m.choice):
//   - go in quietly: through the lobby as a customer, then behind the counter only when the moment is right, which Dex,
//     parked outside on the bank's security frequency, calls on the radio (the corridor's guard walking away, the east
//     camera swept past, the lobby's round on its far side);
//   - or pay the janitor $500: he loops the CCTV and walks her in as the new cleaner, so the guards don't look twice at
//     her anywhere (only the camera in her hand gives her away).
// Either way she photographs the plans with the Snap (it leaves her gun in the car) and walks back out by the front
// door. The alarm blows it. Proves: the interior (in and out by its own door), stealth, the CCTV, a choice.
//   The bot plays the quiet way (o.bot); the bribe is played by setting it there. Indoors the bot walks stealth paths
//   (straight legs between the bank's cells) and presses △ at the doors.
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, DEX = { name: 'Dex (radio)', color: '#ff5a4a' }, JANITOR = { name: 'Janitor', color: '#a8b890' };
const BRIBE = 500, BOT_WAY = 'stealth';
const DOOR_OUT = 'bank-door', JANITOR_AT = [1904, 812], CURB = [1864, 816];   // (outside: the front door, the janitor smoking by it on the sidewalk)
const AWAY = [1640, 820];   // (back along Lantern Lane's sidewalk, round the corner from the bank)
// inside, by the bank's cells (16 u each; a cell's middle)
const T = 16, C = (x, y) => [(x + .5) * T, (y + .5) * T], cell = v => v / T - .5;
const DOOR_IN = C(26, 26.6), WAIT = C(26, 15.6), OFFICE = C(27, 4.5), PLANS = C(28.5, 2);   // (the door's cell, the lobby by the counter's gate, the records office's quiet corner, the cabinet with the vault's plans)
const LOBBY = [C(26, 22), WAIT];
const LEG_IN = [C(26, 14), C(26, 13.2), C(34.5, 13.2), C(34.5, 11.2), C(27.5, 10.6), C(26.6, 9), C(26.6, 7), OFFICE];
const LEG_OUT = [C(26.6, 7), C(26.6, 9), C(27.5, 10.6), C(34.5, 11.2), C(34.5, 13.2), C(26, 13.2), C(26, 14), WAIT];
const TO_DOOR = [C(26, 20), DOOR_IN];

const night = m => { const h = m.W.clock ? m.W.clock.hour : 23; if (!(h >= 21 || h < 4)) m.time(23); };
const way = m => m.data.way || 'stealth';
const run = m => (m.inside ? m.inside.run : null);
// the moments Dex calls (the interior's live state: its guards' rounds, its cameras' sweeps): the corridor's guard
// (the third) walking away west, the east camera swept past the tellers' row, the lobby's round not on its north side
const phase = (R, i) => { const c = R.cameras[i]; return ((R.t / c.period) % 1 + 1) % 1; };
const away = (g, at, lo, hi) => g.down || (g.at === at && cell(g.ped.x) > lo && cell(g.ped.x) < hi);   // (taken down, or on that leg of its round between those cells)
const GATES = {
  in: R => away(R.guards[2], 3, 31, 34) && (R.guards[0].down || R.guards[0].at !== 1) && phase(R, 1) > .38 && phase(R, 1) < .6,
  out: R => away(R.guards[2], 3, 22, 27),
};

/** a stealth leg: the objective (the bot's stealth hint: the path's waypoints walked crouched), done at its end */
function sneak(m, text, path) {
  const end = path[path.length - 1];
  const o = m.waitUntil(mm => Math.hypot(mm.player.x - end[0], mm.player.y - end[1]) < 10);
  return { ...o, start: mm => { mm.objective(text, { hint: { kind: 'stealth', path } }); mm.marker(end, { color: '#7ac8ff', r: 8 }); }, nav: () => end };
}
/** wait at a spot (the bot stands there, crouched) until the moment: gate(run), or at once the cleaner's way */
function moment(m, text, at, gate, go) {
  const o = m.waitUntil(mm => way(mm) === 'bribe' || (Math.hypot(mm.player.x - at[0], mm.player.y - at[1]) < 12 && !!run(mm) && gate(run(mm))));
  return m.sequence([{ ...o, start: mm => mm.objective(text, { hint: { kind: 'stealth', path: [at] } }), nav: () => at }, m.say([go], DEX)]);
}
/** a door: △ at it (the bot's goto with interact), done when the player is through it (inside or out) */
function door(m, text, at, inside) {
  const q = m.at(at), o = m.waitUntil(mm => !!mm.inside === inside);
  return { ...o, start: mm => { mm.objective(text, { hint: { kind: 'goto', at: q, interact: true, foot: true } }); mm.marker(q, { color: '#ffe066', r: 10 }); }, nav: () => q };
}
// The Snap's shutter is filed as a gunshot (MOTOR: combat.js shoot() emits the 'shooting' crime before it takes the
// photo), and the bank's guards would come running to it. A photo makes no noise, so whatever the shutter stirred in
// them is put back as it was the step before: their minds and the look round a shot sends them on (motorRequests)
function quiet(m, op) {
  let before = null;
  m.on('photo', e => { if (e.by !== m.player.id || !before) return; for (const b of before) { Object.assign(b.g.mind, b.mind); b.g.probe = b.probe; } });
  const look = m.waitUntil(mm => { const R = run(mm); before = R ? R.guards.map(g => ({ g, mind: { level: g.mind.level, since: g.mind.since, last: g.mind.last }, probe: g.probe })) : null; return false; });
  return m.first([op, look]);
}

defMission('heist_blueprints', {
  title: 'Setup: Blueprints', giver: { at: 'greasy-spoke' }, tier: 2, requires: ['heist_getaway'], plays: 'viv',
  brief: ['The vault\'s plans are in the bank\'s records office.', 'Photograph them tonight: quietly, or with the janitor\'s help.'],
  rewards: { cash: 2000 },
  bonus: [{ id: 'ghost', text: 'Nobody noticed you', check: m => !m.data.noticed }, { id: 'kept', text: 'Kept the $500', check: m => m.data.way !== 'bribe' }],
  stages: [
    { id: 'call', setup(m) { m.as('viv'); night(m); },
      *run(m) {
        yield m.say(['The vault\'s plans are in the records office at First Lowtown.', 'Night shift: three guards, four cameras, one janitor.', 'Dex sits outside on their radio. I go in.'], VIV);
      } },
    { id: 'bank',
      setup(m) { m.as('viv'); night(m); m.ensure.ped('janitor', 'janitor', JANITOR_AT, { facing: Math.PI }); },
      *run(m) {
        yield m.reach(CURB, { radius: 40, text: 'To the First Lowtown Bank' });
        yield m.say(['The janitor\'s on his smoke break. He looks underpaid.'], VIV);
        const broke = m.crew.fund < BRIBE;
        m.data.way = yield m.choice([{ id: 'stealth', text: 'Go in quietly' }, { id: 'bribe', text: `Pay the janitor $${BRIBE}`, sub: broke ? 'NOT ENOUGH CASH' : '', disabled: broke }], { title: 'The plans', bot: BOT_WAY });
      } },
    { id: 'bribe',
      setup(m) { m.as('viv'); night(m); if (!m.data.way) m.data.way = 'bribe'; m.ensure.ped('janitor', 'janitor', JANITOR_AT, { facing: Math.PI }); if (way(m) === 'bribe' && m.dist(JANITOR_AT) > 300) m.place('player', CURB); },
      *run(m) {
        if (way(m) !== 'bribe') return;
        const j = m.one('janitor');
        yield m.reach(j ? [j.x, j.y] : JANITOR_AT, { foot: true, radius: 20, text: `Pay the night janitor ($${BRIBE})` });
        if (m.W.cash) m.W.cash(-BRIBE, 'bribe');
        yield m.say(['Five hundred? Cameras go on a loop, lady.', 'Walk in like you mop floors. Nobody looks at the cleaner.'], JANITOR);
      } },
    { id: 'door',
      setup(m) { m.as('viv'); night(m); m.ensure.ped('janitor', 'janitor', JANITOR_AT, { facing: Math.PI }); if (!m.inside && m.dist(DOOR_OUT) > 300) m.place('player', CURB); },
      *run(m) {
        if (!m.inside) yield door(m, way(m) === 'bribe' ? 'In by the front door: the janitor holds it' : 'In by the front door (a customer, for now)', DOOR_OUT, true);
      } },
    { id: 'inside',
      setup(m) {
        m.as('viv'); night(m);
        const R = run(m), fresh = R && !R.alarm && Math.hypot(m.player.x - DOOR_IN[0], m.player.y - DOOR_IN[1]) < 40;
        if (!fresh) { if (m.inside) m.outside(); m.wanted.clear(); m.place('player', DOOR_OUT); m.interior('bank', 'front'); }   // (a deep link or a retry: in at the front door, the bank as it was, the alarm's stars gone)
        m.loadout({ weapons: ['snap'], only: true, select: 'fists' });   // (the gun stays in the car: the Snap only)
        if (way(m) === 'bribe' && run(m)) {   // (the cleaner: the guards mind her nowhere, the CCTV loops)
          const B = run(m); B.lobby = [0, 0, B.map.w, B.map.h]; for (const c of B.cameras) c.range = 0;
        }
        m.failIf(mm => {
          const B = run(mm); if (!B) return false;
          if (B.guards.some(g => g.mind.state !== 'calm') || B.cameras.some(c => c.mind.state !== 'calm')) mm.data.noticed = true;
          return !!B.alarm;
        }, 'the alarm went up: the plans are moved');
      },
      *run(m) {
        const bribe = way(m) === 'bribe';
        yield sneak(m, bribe ? 'Through the lobby, mop in hand' : 'Through the lobby, a customer', LOBBY);
        yield moment(m, bribe ? 'Behind the counter: nobody looks at the cleaner' : 'Wait by the counter\'s gate for Dex\'s word', WAIT, GATES.in, 'Corridor\'s clear. Go.');
        yield sneak(m, 'Behind the counter, up the staff corridor, into the records office', LEG_IN);
        yield quiet(m, m.photo(PLANS, { from: OFFICE, text: 'Photograph the vault\'s plans in the cabinet (the Snap)' }));
        m.loadout({ select: 'fists' });   // (the Snap away: in the lobby a camera in hand gives her away)
        yield moment(m, 'Wait in the office for Dex\'s word', OFFICE, GATES.out, 'Guard\'s heading west. Out.');
        yield sneak(m, 'Back down the corridor, behind the counter, into the lobby', LEG_OUT);
        yield sneak(m, 'Across the lobby to the front door', TO_DOOR);
        yield door(m, 'Out by the front door', DOOR_IN, false);
      } },
    { id: 'away',
      setup(m) { m.as('viv'); night(m); if (m.inside) m.outside(); if (m.dist(AWAY) > 900) m.place('player', CURB); },
      *run(m) {
        yield m.reach(AWAY, { foot: true, radius: 30, text: 'Walk away. Nice and slow.' });
        yield m.say(['Every wire in that vault, on film.', 'Gus is next. We need a drill.'], VIV);
      } },
  ],
});
