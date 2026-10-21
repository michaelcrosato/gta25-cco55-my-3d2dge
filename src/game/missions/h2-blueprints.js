// H2 · Setup: Blueprints (PLAN.md 9.4): Viv's second setup for the bank job, from her booth at the Greasy Spoke. Played
// as Viv, at night. The vault's plans are in the First Lowtown Bank's records office: past the tellers' counter, up the
// staff corridor and its guard, under the CCTV (src/game/interiors/bank.js). At the bank the night janitor is out on his
// smoke break, and Viv chooses (m.choice):
//   - go in quietly, the cameras live;
//   - or pay the janitor $500 (m.pay): he puts the CCTV on a loop (m.inside.run.loopCameras) and lets her in as the
//     new cleaner (m.inside.run.pass: nobody minds staff past the counter, so long as no camera is out where a guard
//     sees it): she walks the same way to the records office, no takedown and no waiting.
// The quiet way, Dex, parked outside on the bank's security frequency, calls the moments on the radio: she waits by the
// counter's gate in the lobby (the public's: nobody minds her there) and takes the lobby guard down from behind as his
// round brings him past her; then, on Dex's word each time, behind the counter and along the tellers' row to the foot
// of the east gap in the staff corridor's wall (a spot no guard or camera sees), up through it behind the corridor guard
// walking away west and into the records office; the plans photographed with the Snap (it leaves her gun in the car);
// out behind him again, back to the gap, and across to the lobby and the front door. The alarm blows it. Proves: the
// interior (in and out by its own door), stealth, a takedown, the CCTV, a choice.
//   Dex's moments are read off the interior's live state (m.inside.run.watch(): its guards' rounds, the CCTV's sweep): each leg is walked
// crouched in one go from its word, timed so the corridor guard's back is to her the whole way and the lobby's inner
// guard and the east camera look elsewhere while she is behind the counter. The bot plays the quiet way (o.bot); the
// bribe is played from its own stage (#mission/heist_blueprints/bribe). Indoors the bot walks the stealth paths
// (straight legs between the bank's cells) and presses △ at the doors.
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, DEX = { name: 'Dex (radio)', color: '#ff5a4a' }, JANITOR = { name: 'Janitor', color: '#a8b890' };
const BRIBE = 500, BOT_WAY = 'stealth';
const DOOR_OUT = 'bank-door', JANITOR_AT = [1904, 812], CURB = [1864, 816];   // (outside: the front door, the janitor smoking by it on the sidewalk)
const AWAY = [1640, 820];   // (back along Lantern Lane's sidewalk, round the corner from the bank)
// inside, in the bank's cells (16 u each; W(x, y): a point in cell units, 26.5 the middle of column 26)
const W = (x, y) => [x * 16, y * 16];
const DOOR_IN = W(26.5, 27.5), EXIT = W(26.5, 28.4);   // (where the front door lets her in; its marked cells, where △ leaves)
const WAIT = W(26.5, 15.7);      // (the lobby by the counter's gate: the lobby guard's round passes a step south of it)
const FOOT = W(35, 13.5);        // (the tellers' row at the foot of the east gap: seen by no guard and no camera)
const OFFICE = W(27.5, 5);       // (the records office's quiet corner), and the cabinet with the vault's plans
const PLANS = W(29, 2.5);
const TO_FOOT = [W(26.5, 14.5), W(26.5, 13.5), FOOT];                              // (through the gate, east along the row)
const TO_OFFICE = [W(35, 11.8), W(27, 10.6), W(27, 9), W(27, 7.5), OFFICE];       // (up the gap, along the corridor, in by its door)
const TO_GAP = [W(27, 7.5), W(27, 9), W(27, 10.6), W(35, 11.8), FOOT];            // (and back)
const TO_DOOR = [W(26.5, 13.5), W(26.5, 14.5), W(25.6, 15.6), W(25.6, 22), DOOR_IN];   // (west along the row, through the gate, across the lobby: by the downed guard, clear of the pillar)
const LOBBY = [W(26.5, 22), WAIT];

const night = m => { if (!(m.hour >= 21 || m.hour < 4)) m.time(23); };
const way = m => m.data.way || 'stealth';
// the interior's live state, read for Dex's calls (a copy: m.inside.run.watch()): a guard's round (its `at`: the corner
// it walks to), where it is (in cells), taken down or not; the east camera's sweep (0..1 of its period)
const run = m => (m.inside ? m.inside.run.watch() : null);
const down = g => g.down;
const gx = g => g.cx;
const sweep = (R, i) => R.cameras[i].phase;
// the lobby guard (the first) taken down; the inner lobby round (the second) not at its top-left corner, facing the
// counter's gate; the corridor guard (the third) neither about to face west at the corridor's east end while she is
// below the gap, nor anywhere but walking away west as she goes up it, through the corridor or back down it; the east
// camera (the second) swept south of the tellers' row while she crosses it (unless the CCTV is looped)
const innerAway = (g, back) => down(g) || (g.at === 1 && gx(g) > 23.5) || g.at === 2 || (!back && g.at === 3 && gx(g) > 24.3);
const GATES = {
  lobby: R => down(R.guards[0]),
  in: (R, looped) => innerAway(R.guards[1], false) && (down(R.guards[2]) || !(R.guards[2].at === 1 && gx(R.guards[2]) > 24.5 && gx(R.guards[2]) < 29.6))
    && (looped || (sweep(R, 1) >= .3 && sweep(R, 1) <= .59)),
  up: R => down(R.guards[2]) || (R.guards[2].at === 3 && gx(R.guards[2]) >= 31.5 && gx(R.guards[2]) <= 34.5),
  outOfOffice: R => down(R.guards[2]) || (R.guards[2].at === 3 && gx(R.guards[2]) >= 26 && gx(R.guards[2]) <= 31),
  across: (R, looped) => innerAway(R.guards[1], true) && (down(R.guards[2]) || !(R.guards[2].at === 2 || (R.guards[2].at === 1 && gx(R.guards[2]) > 36) || (R.guards[2].at === 3 && gx(R.guards[2]) > 35.4)))
    && (looped || (sweep(R, 1) >= .21 && sweep(R, 1) <= .51)),
};

/** a stealth leg: the objective (the bot's stealth hint: the path's waypoints walked crouched), done at its end */
function sneak(m, text, path) {
  const end = path[path.length - 1];
  const o = m.waitUntil(mm => Math.hypot(mm.player.x - end[0], mm.player.y - end[1]) < 10);
  return { ...o, start: mm => { mm.objective(text, { hint: { kind: 'stealth', path } }); mm.marker(end, { color: '#7ac8ff', r: 8 }); }, nav: () => end };
}
/** wait at a spot (the bot stands there, crouched) until the moment gate(run, looped) comes */
function moment(m, text, at, gate) {
  const o = m.waitUntil(mm => { const R = run(mm); return Math.hypot(mm.player.x - at[0], mm.player.y - at[1]) < 12 && !!R && gate(R, R.looped); });
  return { ...o, start: mm => mm.objective(text, { hint: { kind: 'stealth', path: [at] } }), nav: () => at };
}
/** Dex's word, and the leg it calls for at once (the line said as she goes) */
const go = (m, word, text, path) => m.parallel([m.say([word], DEX), sneak(m, text, path)]);
/** a door: △ at it (the bot's goto with interact), done when the player is through it (inside or out) */
function door(m, text, at, inside) {
  const q = m.at(at), o = m.waitUntil(mm => !!mm.inside === inside);
  return { ...o, start: mm => { mm.objective(text, { hint: { kind: 'goto', at: q, interact: true, foot: true } }); mm.marker(q, { color: '#ffe066', r: 10 }); }, nav: () => q };
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
        const broke = m.fund < BRIBE;
        m.data.way = yield m.choice([{ id: 'stealth', text: 'Go in quietly' }, { id: 'bribe', text: `Pay the janitor $${BRIBE}`, sub: broke ? 'NOT ENOUGH CASH' : 'THE CCTV LOOPED, A CLEANER\'S PASS', disabled: broke }], { title: 'The plans', bot: BOT_WAY });
      } },
    { id: 'bribe',
      setup(m) {
        m.as('viv'); night(m);
        if (!m.data.way) m.data.way = 'bribe';   // (started here: the janitor's way)
        m.ensure.ped('janitor', 'janitor', JANITOR_AT, { facing: Math.PI });
        if (way(m) === 'bribe' && m.dist(JANITOR_AT) > 300) m.place('player', CURB);
      },
      *run(m) {
        if (way(m) !== 'bribe') return;
        const j = m.one('janitor');
        yield m.reach(j || JANITOR_AT, { foot: true, radius: 20, text: `Pay the night janitor ($${BRIBE})` });
        m.pay(-BRIBE, 'bribe');
        yield m.say(['Five hundred? Cameras go on a loop, lady.', 'Here, the mop. Nobody looks twice at the new cleaner.', 'Keep that camera of yours out of sight.'], JANITOR);
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
        if (way(m) === 'bribe' && m.inside) { m.inside.run.loopCameras(true); m.inside.run.pass(true); }   // (the janitor's loop: the CCTV shows yesterday's tape; and his mop: staff)
        m.failIf(mm => {
          const B = run(mm); if (!B) return false;
          if (B.guards.some(g => !down(g) && g.state !== 'calm') || (!B.looped && B.cameras.some(c => c.state !== 'calm'))) mm.data.noticed = true;
          return !!B.alarm;
        }, 'the alarm went up: the plans are moved');
      },
      *run(m) {
        if (way(m) === 'bribe') {   // (the new cleaner: the same way in and out, nobody minding her)
          yield sneak(m, 'Through the lobby, mop in hand', LOBBY);
          yield go(m, 'You\'re staff tonight. Behind the counter like you work there.', 'Behind the counter and along the tellers\' row to the east gap', TO_FOOT);
          yield sneak(m, 'Up through the gap, along the staff corridor, into the records office', TO_OFFICE);
          yield m.photo(PLANS, { from: OFFICE, range: 120, text: 'Photograph the vault\'s plans in the cabinet (the Snap)' });
          m.loadout({ select: 'fists' });   // (the Snap away before a guard sees it)
          yield m.say(['Got them. Mopping my way out.'], VIV);
          yield sneak(m, 'Back along the corridor and down the gap', TO_GAP);
          yield sneak(m, 'Back along the tellers\' row and across the lobby to the front door', TO_DOOR);
          yield door(m, 'Out by the front door', EXIT, false);
          return;
        }
        yield sneak(m, 'Through the lobby, a customer', LOBBY);
        yield m.parallel([m.say(['Lobby guard walks his round right past you. Let him go by, then take him. Quietly.'], DEX),
          moment(m, 'By the counter\'s gate: take the lobby guard down from behind as he passes (attack)', WAIT, GATES.lobby)]);
        yield moment(m, 'Wait by the counter\'s gate for Dex\'s word', WAIT, GATES.in);
        yield go(m, 'Now. Behind the counter, east to the gap.', 'Behind the counter and along the tellers\' row to the foot of the east gap', TO_FOOT);
        yield moment(m, 'Wait at the foot of the gap for Dex\'s word (the corridor guard)', FOOT, GATES.up);
        yield go(m, 'He\'s past the gap, heading west. Up behind him, into the records office.', 'Up through the gap, along the staff corridor, into the records office', TO_OFFICE);
        yield m.photo(PLANS, { from: OFFICE, range: 120, text: 'Photograph the vault\'s plans in the cabinet (the Snap)' });
        m.loadout({ select: 'fists' });   // (the Snap away: past the counter a camera in hand gives her away)
        yield m.say(['Got them. Now out the way I came.'], VIV);
        yield moment(m, 'Wait in the office for Dex\'s word', OFFICE, GATES.outOfOffice);
        yield go(m, 'He\'s walked past the door. Out behind him, back to the gap.', 'Out of the office, back along the corridor and down the gap', TO_GAP);
        yield moment(m, 'Wait at the foot of the gap for Dex\'s word', FOOT, GATES.across);
        yield go(m, 'Lobby\'s clear. Walk out like you belong.', 'Back along the tellers\' row, through the gate and across the lobby to the front door', TO_DOOR);
        yield door(m, 'Out by the front door', EXIT, false);
      } },
    { id: 'away',
      setup(m) { m.as('viv'); night(m); if (m.inside) m.outside(); if (m.dist(AWAY) > 900) m.place('player', CURB); },
      *run(m) {
        yield m.reach(AWAY, { foot: true, radius: 30, text: 'Walk away. Nice and slow.' });
        yield m.say(['Every wire in that vault, on film.', 'Gus is next. We need a drill.'], VIV);
      } },
  ],
});
