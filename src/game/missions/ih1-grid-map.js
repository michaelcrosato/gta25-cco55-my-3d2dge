// IH1 · Setup: Grid Map (EXPANSION.md 4, X3): Viv's first setup for Blackout, from the planning board at the flat over
// Sudsy's, once two of Ironside's gangs have given the crew their first jobs. Played as Viv, at night. The station's
// switchyard plans hang on the control room's west wall (src/game/interiors/power-station.js): in at the front door,
// through the lobby (the public's: nobody minds her there), up the corridor's east aisle (the wall down its middle
// hides it from the guard whose round keeps to the west aisle), in at the control room's door, under the camera in its
// north-west corner, and a photo of the plans with the Snap; then out the same way. The alarm blows it. Proves: the
// interior, stealth, the CCTV, the photo.
//   Dex, outside on the station's security frequency, calls the moments, read off the interior's live state
//   (m.inside.run.watch()): into the corridor once the guard is on his way up its west aisle (the bottom of the east
//   aisle is the one place he sees it from: facing east at his round's foot); across the control room only while the
//   camera's sweep keeps its cone off the whole leg for as long as the leg takes at a crouch (the camera's sweep is a
//   clock: base + sweep x sin(phase), so where it will look is known ahead). The bot walks the legs crouched, in one go
//   from each word.
import { defMission, get } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, DEX = { name: 'Dex (radio)', color: '#ff5a4a' };
const DOOR = 'power-door';
// inside, in the station's cells (16 u each; C(x, y): a cell's middle)
const C = (x, y) => [(x + .5) * 16, (y + .5) * 16];
const EXIT = C(2, 21);   // (the front door's own marked cell, as the bank's: △ there goes out)
const LOBBY = [C(2, 19), C(5, 18), C(6, 16)];   // (across the lobby, round reception's desk, to the corridor's gap)
const UP = [C(6, 15), C(6, 14), C(6, 10), C(6, 8)];   // (through the gap, up the east aisle to its top, below the control room's door)
const IN = [C(6, 7), C(6, 6), C(2, 6), C(1, 5)];   // (in at the door, along the room's south wall, under the plans: the camera's blind corner)
const BACK = [C(2, 6), C(6, 6), C(6, 7), C(6, 8)];
const DOWN = [C(6, 10), C(6, 14), C(6, 15), C(6, 16)];
const OUT = [C(5, 18), C(2, 19), EXIT];
const PLANS = [24, 60], SPOT = C(1, 5);
const CROUCH = [26, 30, 34, 38];   // (u/s: the crouched walks the gate's sums allow for, about the bot's, 32: the camera sweeps the way the legs go, so one quicker than the sums catches its cone up; 22 alone had sent the bot out into it)

const night = m => { if (!(m.hour >= 21 || m.hour < 4)) m.time(23); };
const run = m => (m.inside ? m.inside.run.watch() : null);
// the corridor's guard on his way up the west aisle's east side, past the aisle's foot (cy < limit): his round will not
// bring him back to its foot, facing east, for some six seconds
const guardUp = (R, limit) => R.guards[0].down || (R.guards[0].at === 1 && R.guards[0].cy < limit);
// will the control room's camera keep its cone off a leg (points, walked at any of CROUCH's speeds from the first) the
// whole time it takes? Its facing is a clock (base + sweep x sin 2 pi phase): checked every tenth of a second ahead,
// with a margin
const camClear = (R, path) => CROUCH.every(v => camClearAt(R, path, v));
function camClearAt(R, path, v) {
  const spec = get('interiors', 'power-station').cameras[0], cam = R.cameras[0], cx = (spec.at[0] + .5) * 16, cy = (spec.at[1] + .5) * 16;
  const legs = []; let len = 0; for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); legs.push([path[i - 1], path[i], len, l]); len += l; }
  const T = len / v + .6;
  for (let t = 0; t <= T; t += .1) {
    const s = Math.min(len, t * v), L = legs.find(q => s <= q[2] + q[3]) || legs[legs.length - 1], k = L[3] ? (s - L[2]) / L[3] : 0;
    const x = L[0][0] + (L[1][0] - L[0][0]) * k, y = L[0][1] + (L[1][1] - L[0][1]) * k, d = Math.hypot(x - cx, y - cy);
    if (d > spec.range + 8) continue;
    const f = spec.facing + spec.sweep * Math.sin(2 * Math.PI * (cam.phase + t / spec.period));
    let a = Math.atan2(y - cy, x - cx) - f; a = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(a) < spec.fov / 2 + .12) return false;
  }
  return true;
}
/** a stealth leg: the objective (the bot's stealth hint: the path's waypoints walked crouched), done at its end */
function sneak(m, text, path) {
  const end = path[path.length - 1];
  const o = m.waitUntil(mm => Math.hypot(mm.player.x - end[0], mm.player.y - end[1]) < 10);
  return { ...o, start: mm => { mm.objective(text, { hint: { kind: 'stealth', path } }); mm.marker(end, { color: '#7ac8ff', r: 8 }); }, nav: () => end };
}
/** wait at a spot (the bot stands there, crouched) until the moment gate(run) comes */
function moment(m, text, at, gate) {
  const o = m.waitUntil(mm => { const R = run(mm); return Math.hypot(mm.player.x - at[0], mm.player.y - at[1]) < 12 && !!R && gate(R); });
  return { ...o, start: mm => mm.objective(text, { hint: { kind: 'stealth', path: [at] } }), nav: () => at };
}
const go = (m, word, text, path) => m.parallel([m.say([word], DEX), sneak(m, text, path)]);

defMission('heist_grid_map', {
  title: 'Setup: Grid Map', giver: { at: 'ironside-board' }, tier: 1, requires: ['heist_big_withdrawal'], district: 'ironside', plays: 'viv',
  unlock: save => ['gnomes_picket_line', 'monks_holy_scrap', 'volts_live_wire'].filter(id => save.missions.done.includes(id)).length >= 2,
  brief: ['Blackout needs the Power Station\'s switchyard plans.', 'They hang in its control room. In at night, a photo, out. No alarm.'],
  rewards: { cash: 2000 },
  bonus: [{ id: 'time', text: 'Under 6:00', check: m => m.elapsed < 360 }, { id: 'ghost', text: 'Nobody so much as wondered', check: m => !m.data.noticed }],
  stages: [
    { id: 'call', setup(m) { m.as('viv'); }, *run(m) {
      yield m.say(['Ironside\'s lights run on one station. Turn it off and the town goes dark.', 'First I want its switchyard plans. They hang in the control room.', 'Dex will sit outside on their frequency. I go in.'], VIV);
    } },
    {
      id: 'station',
      setup(m) { m.as('viv'); night(m); if (m.inside) m.outside(); m.wanted.clear(); },
      *run(m) {
        const door = m.at(DOOR);
        m.objective('Get into the Ironside Power Station (its front door on Union Street)', { hint: { kind: 'goto', at: door, radius: 16, foot: true, interact: true } });
        m.marker(door, { color: '#ffe066', r: 12 });
        let tow = 0;
        yield m.waitUntil(mm => { if (!mm.inside && mm.stageTime >= tow) { tow = mm.stageTime + 1; mm.clearSpot(door, 10); } return !!mm.inside; });
      },
    },
    {
      id: 'plans',
      // Viv inside at the front door (a retry or a deep link: outside it, and in: a fresh station, its alarm off; a retry
      // still inside had kept the last try's alarm, and failed at once), the Snap and nothing else
      setup(m) {
        m.as('viv'); night(m); m.data.out = false;
        if (m.inside && m.retries) m.outside();
        if (!m.inside) { if (m.dist(DOOR) > 60) m.place('player', DOOR); m.interior('power-station', 'front'); }
        m.loadout({ weapons: ['snap'], only: true, select: 'fists' });
        m.wanted.clear();
      },
      *run(m) {
        m.failIf(mm => { const R = run(mm); return !!R && !!R.alarm; }, 'the alarm');
        m.failIf(mm => !mm.inside && !mm.data.out, 'you left the station');   // (till the way out: out by the front door is the end)
        m.music('tension');
        const watchNotice = m.waitUntil(mm => { const R = run(mm); if (R && R.guards.some(g => g.state !== 'calm' && !g.down)) mm.data.noticed = true; return false; });
        yield m.first([watchNotice, m.sequence([
          sneak(m, 'Through the lobby to the corridor', LOBBY),
          moment(m, 'Wait in the lobby for Dex\'s word', LOBBY[LOBBY.length - 1], R => guardUp(R, 13)),
          go(m, 'Guard\'s heading up the far aisle. Go.', 'Up the corridor\'s east aisle: keep the wall between you and the guard', UP),
          moment(m, 'Wait below the control room\'s door for Dex\'s word', UP[UP.length - 1], R => camClear(R, [UP[UP.length - 1], ...IN])),
          go(m, 'Camera\'s looking at the consoles. Now.', 'In, and under the plans on the west wall: the camera\'s blind corner', IN),
          m.photo(PLANS, { from: SPOT, range: 70, text: 'Photograph the switchyard plans (the Snap)' }),
          m.say(['Got them. Every breaker in the yard.'], VIV),
          moment(m, 'Wait in the corner for Dex\'s word', SPOT, R => camClear(R, [SPOT, ...BACK])),
          go(m, 'Clear. Out you come.', 'Back out to the corridor', BACK),
          moment(m, 'Wait at the top of the aisle for Dex\'s word', BACK[BACK.length - 1], R => guardUp(R, 13.5)),
          go(m, 'He\'s turned up the far side. Down you go.', 'Down the east aisle to the lobby', DOWN),
          sneak(m, 'Across the lobby to the front door', OUT.slice(0, 2)),
        ])]);
        m.data.out = true;
        m.objective('Out by the front door', { hint: { kind: 'goto', at: EXIT, radius: 16, foot: true, interact: true } });
        yield m.waitUntil(mm => !mm.inside);
        yield m.say(['Plans in the bag. Not a peep out of them.', 'Next we need something that reaches the wires.'], VIV);
      },
    },
  ],
});
