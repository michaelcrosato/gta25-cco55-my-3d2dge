// S2 · Confession Booth (PLAN.md 9.4): the Chrome Saints' second job, from their payphone outside Club Chrome. Father
// Fender hears the Saints' sins in the back of his chrome Saint (the booth), and on Thursdays he hears them at St.
// Christopher's, where the old priest lets him have the back pew. The Harbor Rats have read his ledger and know it.
// Take the Saints' armoured Saint behind the club and follow the booth west along Sunset Strip; at the Hotel Marquee
// Brother Ike takes your wheel and you take the window, and Bilge's boys come up behind the convoy in their yellow
// Brutes. Ike takes it round the block by the chapel (Sunset Strip, Gnome Row, Terrace Road, Palm Walk) till they're
// done: shoot them off the booth, and Fender gets out at the chapel's back door as it comes round (held up in a jam, he
// walks the last block). Proves: follow and protect, drive-bys, gang vehicle AI.
//   The Rats' Brutes chase the booth (a mission car's drive { chase }), a Rat at the wheel and a gunman at the window;
// they come up the convoy's own street from behind, so the escort is in their way. A Brute shot till it smokes, or its
// driver shot, is out of it: who's left of its crew bails out and legs it, and it rolls to a stop (towed once out of
// sight, so the convoy finds its lane clear next time round). The cars' people are the mission's own, each seated by
// the script (they ride in their seats, where a shot finds them). The north side of town keeps the job off the
// precinct's beat.
import { defMission } from '../../motor/index.js';

const FENDER = { name: 'Father Fender', color: '#5af0ff' }, IKE = { name: 'Brother Ike', color: '#c8c8d0' };
const CHROME = '#c8c8d0', CYAN = '#5af0ff', RAT = '#e8c040';
const W = Math.PI;
// Sunset Strip (one way, west): its lane; the Hotel Marquee, where Ike takes the escort's wheel; St. Christopher's back
// door, where Fender gets out
const LANE_Y = 498, HOTEL_X = 1500, CHAPEL = [300, LANE_Y];
// the booth's way: west along Sunset Strip from behind the club past the hotel; then round the block by the chapel
// (west on Sunset Strip past its back door, north up Gnome Row, east along Terrace Road, south down Palm Walk) three
// times at most, and to the chapel's back door (each point on its lane mid-block, clear of the junctions' boxes)
const ROUND = [[700, LANE_Y], [300, LANE_Y], [94, 300], [300, 94], [700, 94], [914, 300]];
const WAY = [[HOTEL_X, LANE_Y], [1100, LANE_Y], ...ROUND, ...ROUND, ...ROUND, CHAPEL];
const wayFrom = x => WAY.slice(WAY.findIndex(p => p[0] < x - 60));   // (from the first point ahead of x on Sunset Strip)
// the Rats: three Brutes, two at a time at most, each turning onto the convoy's street out of sight behind the escort
// (the first as the convoy passes the hotel, the next a while after the last)
const RATS = 3, AT_ONCE = 2, NEXT_T = 6, BEHIND = [340, 400, 460, 300, 520];
// the Rats' aim from a moving car (once their gunmen shoot: MOTOR's drive-by): wild (long pauses, wide of the mark)
const AIM = { range: .5, burst: .45, pause: 1.6, aimOff: .2 };
const KIT = { weapons: ['buzzsaw'], ammo: { buzzsaw: 600 }, select: 'buzzsaw', only: true };   // (the drive-by's gun: ○ out of the window)
const LOST_T = 12;   // (a Brute held up out of sight this long, at a light or in a jam: another in its place)
const REACH = 240;   // (the window's reach: a Brute further off is let come, not sprayed at through the traffic)
const GONE_R = 420;   // (out of the player's sight: a Brute out of it this far off towed, one held up this far off replaced)
const JAM_T = 20;   // (the booth stood this long on the way to the chapel, the fight over: Fender walks the last of it)
const LOST = 'you lost the booth', DEAD = 'Father Fender is dead', WRECK = 'the booth went up';

// ---- the places (the same for every stage and retry: kept in m.data)
// the booth parked at the curb behind Club Chrome, the Saints' car behind it
function spots(m) {
  if (!m.data.spots) {
    const bo = m.curb([2210, 463]), esc = [2300, 2330, 2270, 2360].map(x => m.curb([x, 463])).find(q => Math.abs(q.y - 463) < 12 && q.x > bo.x + 70) || m.lane([bo.x + 110, LANE_Y], W);
    m.data.spots = { booth: { x: bo.x, y: bo.y, heading: bo.heading }, escort: { x: esc.x, y: esc.y, heading: esc.heading } };
  }
  return m.data.spots;
}
const laneAt = (m, x) => { const q = m.lane([x, LANE_Y], W); return { x: q.x, y: q.y, heading: q.heading }; };
// ---- the cars and the people in them
// a mission ped into a vehicle's seat: the script's own (it rides there, where a shot finds it), in place of the crew
// the vehicle came with
const seat = (m, v, arch, tag, i, o = {}) => { const p = m.spawn.ped(arch, [v.x, v.y], { tag, ...o }); m.place(p, { in: v, seat: i }); return p; };
// the booth: Fender's chrome Saint (armoured), a Saints driver at the wheel, Fender in the back; made afresh at a spot,
// parked (no route) or on its way
function makeBooth(m, at, route = null) {
  for (const tag of ['fender', 'boothman', 'booth']) for (const a of m.tagged(tag)) m.remove(a);
  const v = m.spawn.vehicle('saint', [at.x, at.y], { tag: 'booth', heading: at.heading ?? W, color: CHROME, mods: { armor: true }, driver: 'saint-grunt', drive: route ? { route, style: 'calm' } : undefined });
  seat(m, v, 'saint-grunt', 'boothman', 0);
  seat(m, v, 'fender', 'fender', 2);
  m.data.rolling = !!route;
  return v;
}
// the Saints' armoured Saint, for the player to drive (left where it is when it is about)
const escortCar = (m, at) => m.ensure.vehicle('escort', 'saint', [at.x, at.y], { heading: at.heading, color: CYAN, mods: { armor: true } });
// the player at the escort's wheel at a spot (a deep link, a retry), unless already in it
function driveEscort(m, at) {
  let v = m.one('escort');
  if (v && (v.wrecked || (v.damage && v.damage.smoking) || Math.hypot(v.x - at.x, v.y - at.y) > 300)) { m.remove(v); v = null; }
  v = v || escortCar(m, at);
  if (m.vehicle !== v) m.place('player', { in: v });
  return v;
}
// the escort with Brother Ike at its wheel, after the booth on its way, and the player at its window with the Buzzsaw:
// made afresh where the player's car is (or a spot)
function ikeDrives(m, at, x) {
  for (const tag of ['ike', 'escort']) for (const a of m.tagged(tag)) m.remove(a);
  const v = m.spawn.vehicle('saint', [at.x, at.y], { tag: 'escort', heading: at.heading ?? W, color: CYAN, mods: { armor: true }, driver: 'saint-grunt', drive: { route: wayFrom(x), style: 'fast' } });
  seat(m, v, 'saint-grunt', 'ike', 0);
  m.place('player', { in: v, seat: 1 });
  m.loadout({ ...KIT, health: 100 });
  return v;
}
// the Rats' roster (kept in m.data: made afresh with the stage): each Brute's vehicle id, whether it is out of it, how
// long it has been held up far behind
const roster = m => (m.data.rats ||= Array.from({ length: RATS }, () => ({ id: null, out: false, far: 0 })));
const ratCar = (m, r) => (r.id === null ? null : m.tagged('rats').find(v => v.id === r.id) || null);
// is a vehicle (but those in skip) across the line from a to b? (the window's line of fire; a Brute's run up the lane)
function across(m, a, b, skip) {
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  for (const o of m.fleet.near((a.x + b.x) / 2, (a.y + b.y) / 2, L / 2 + 40)) {
    if (skip.includes(o) || !o.body || o.wrecked || Math.abs((o.z || 0) - (b.z || 0)) > 16) continue;
    const c = Math.cos(o.heading), s = Math.sin(o.heading);
    for (let k = 10; k < L - 10; k += 8) { const x = a.x + (b.x - a.x) * k / L - o.x, y = a.y + (b.y - a.y) * k / L - o.y; if (Math.abs(x * c + y * s) < o.hl + 3 && Math.abs(y * c - x * s) < o.hw + 3) return true; }
  }
  return false;
}
// a bystander's car across the window's line to a target would take the burst and go up beside the escort: the
// trigger off till it's by, as a player's would be
const blocked = (m, t) => across(m, m.player, t, [t, m.vehicle]);
// where a Brute turns onto the convoy's street out of sight behind the escort: on the escort's lane straight behind it
// (not round a corner), nothing standing there and nothing between it and the escort, so it comes straight up the lane
// into the window's reach; null: nowhere yet (a corner just behind, traffic)
function behind(m) {
  const e = m.one('escort'); if (!e) return null;
  const c = Math.cos(e.heading), s = Math.sin(e.heading);
  for (const d of BEHIND) {
    const q = m.lane([e.x - c * d, e.y - s * d], e.heading), dx = q.x - e.x, dy = q.y - e.y;
    if (Math.abs(dx * s - dy * c) > 24 || Math.abs(dx * c + dy * s + d) > 60 || Math.cos(q.heading - e.heading) < .95) continue;
    if (m.fleet.near(q.x, q.y, 48).some(o => o.body && Math.hypot(o.x - q.x, o.y - q.y) < 48) || across(m, q, e, [e])) continue;
    return q;
  }
  return null;
}
// a Brute of the Rats' (armoured: a Buzzsaw takes a while) at a spot, after the booth: a Rat at the wheel and a gunman
// at the window (the Snub: MOTOR's drive-by)
function ratAt(m, i, q) {
  const v = m.spawn.vehicle('brute', q, { tag: 'rats', heading: q.heading, color: RAT, mods: { armor: true }, driver: 'rat-grunt', drive: { chase: 'booth', style: 'race' } });
  seat(m, v, 'rat-grunt', 'ratwheel' + i, 0, { role: 'flee' });
  seat(m, v, 'rat-grunt', 'ratgun' + i, 1, { role: 'flee', weapons: ['fists', 'snub38'], profile: AIM, shoot: 'booth' });
  Object.assign(roster(m)[i], { id: v.id, far: 0 }); m.data.spawnT = m.stageTime;
}
// the Rats each step: the next one in when fewer than two are after the convoy (a while after the last); one held up out
// of sight a while (a light, a jam, the wrong way round the block) quietly taken off the street and another put in
// behind the escort; one done for (smoking or wrecked, or its driver shot: the window's burst finds the crew over the
// doors) out of it: who's left of its crew out on either side and running, the Brute rolling to a stop
const smoking = v => !!(v.damage && v.damage.smoking);
const doneFor = v => v.wrecked || smoking(v) || !v.driver || v.driver.dead;
function rats(m, dt) {
  const R = roster(m), P = m.player, live = R.filter(r => r.id !== null && !r.out).length, next = R.findIndex(r => r.id === null);
  if (next >= 0 && live < AT_ONCE && (!live || m.stageTime - (m.data.spawnT ?? -1e9) > NEXT_T)) { const q = behind(m); if (q) ratAt(m, next, q); }
  R.forEach((r, i) => {
    const v = ratCar(m, r); if (r.out || !v) return;
    if (doneFor(v)) {
      r.out = true;
      if (!v.wrecked) [m.one('ratwheel' + i), m.one('ratgun' + i)].forEach((p, k) => { if (p && p.seat) m.place(p, v.toWorld(-6 + k * 12, (k ? 1 : -1) * (v.hw + 12))); });
      return;
    }
    r.far = Math.hypot(v.x - P.x, v.y - P.y) > GONE_R ? r.far + dt : 0;
    if (r.far > LOST_T) { const q = behind(m); if (q) { for (const a of [m.one('ratwheel' + i), m.one('ratgun' + i), v]) if (a) m.remove(a); ratAt(m, i, q); } }
  });
}
const left = m => roster(m).filter(r => !r.out).length;
// a Brute out of it (stalled in the lane, its driver shot, or a burnt shell) once it is out of the player's sight: towed
// off the street with what's left of its crew there, so the convoy finds its lane clear the next time round the block
function tow(m) {
  const P = m.player, far = a => Math.hypot(a.x - P.x, a.y - P.y) > GONE_R;
  roster(m).forEach((r, i) => {
    const v = ratCar(m, r); if (!r.out || !v || !far(v)) return;
    for (const p of [m.one('ratwheel' + i), m.one('ratgun' + i)]) if (p && (p.dead || p.seat || far(p))) m.remove(p);
    m.remove(v);
  });
}
const boothOk = m => { const v = m.one('booth'); return !!v && !v.wrecked && !(v.damage && v.damage.burning); };
const fenderOk = m => { const f = m.one('fender'); return !!f && !f.dead; };
// an op that never ends, doing f(m, dt) each step, beside a stage's own in m.first. While it runs the precinct is at the
// Saints' charity supper (no stars: the MPD stays out of the Rats' business), the city's Saints know the player rides
// for Fender, and the Rats and the Gnomes on the sidewalks leave it to Bilge's boys (a stray from the window rallies
// nobody); however it ends, the cap is lifted and the heat forgotten (the runtime lifts the truces when the job ends)
const blessed = (m, f = () => {}) => {
  let last = m.stageTime;
  return Object.assign(m.waitUntil(mm => { const t = mm.stageTime; f(mm, Math.max(0, t - last)); last = t; return false; }),
    { start: mm => { mm.wanted.cap(0); mm.ally('saints'); mm.truce('rats'); mm.truce('gnomes'); }, end: mm => mm.wanted.clear() });
};

defMission('saints_confession_booth', {
  title: 'Confession Booth', giver: { phone: 'saints' }, gang: 'saints', tier: 2, requires: ['saints_holy_rollers'], plays: 'any',
  brief: ['Father Fender hears confession at St. Christopher\'s. The Rats know.', 'Ride escort on his booth from the club to the chapel.'],
  rewards: { cash: 3500, respect: { saints: 15, rats: -10 } },
  bonus: [
    { id: 'time', text: 'Under 4:00', check: m => m.elapsed < 240 },
    { id: 'booth', text: 'The booth above 75%', check: m => (m.data.health ?? 0) > .75 },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['My son. Thursday is confession night at St. Christopher\'s.', 'Bilge\'s rats have been reading my mail.', 'My booth needs an escort. Behind the club, on Sunset Strip.'], FENDER);
    } },
    {
      id: 'car',
      // the booth parked at the curb behind Club Chrome, the Saints' armoured Saint behind it (a deep link from across
      // town: the player at the Saints' payphone)
      setup(m) {
        const P = spots(m);
        escortCar(m, P.escort);
        if (!boothOk(m) || !fenderOk(m) || m.data.rolling) makeBooth(m, P.booth);
        if (m.dist([P.escort.x, P.escort.y]) > 1400) m.place('player', 'phone-saints');
      },
      *run(m) {
        yield m.enter('escort', { text: 'Take the Saints\' armoured Saint behind Club Chrome, on Sunset Strip', lost: 'the Saints\' car is gone' });
        yield m.say(['Bless you, my son. Stay on my bumper.', 'Brother Ike meets us at the Hotel Marquee.'], FENDER);
      },
    },
    {
      id: 'escort',
      // the booth pulls out west along Sunset Strip (a deep link, a retry: the player at the escort's wheel behind the
      // club, the booth pulling out afresh)
      setup(m) {
        const P = spots(m), b = m.one('booth');
        driveEscort(m, P.escort);
        if (!boothOk(m) || !fenderOk(m) || !m.data.rolling || Math.hypot(b.x - P.booth.x, b.y - P.booth.y) > 150) makeBooth(m, P.booth, wayFrom(P.booth.x));
      },
      *run(m) {
        m.failIf(mm => !boothOk(mm), WRECK);
        const past = mm => { const v = mm.one('booth'); return !!v && v.x < HOTEL_X && mm.dist(v) < 320; };
        yield m.first([m.follow('booth', { text: 'Follow Father Fender\'s booth west along Sunset Strip', dist: 110, lose: 560, grace: 8, reason: LOST, lost: WRECK, until: past }),
          m.protect('fender', { reason: DEAD }), blessed(m)]);
      },
    },
    {
      id: 'ambush',
      // by the Hotel Marquee: Ike at the escort's wheel, the player at its window with the Buzzsaw, the convoy on west and
      // round the block by the chapel, the Rats behind (a deep link, a retry: the convoy at the hotel)
      setup(m) {
        const b = m.one('booth'), at = laneAt(m, HOTEL_X - 20), fresh = !boothOk(m) || !fenderOk(m) || !m.data.rolling || b.x > HOTEL_X + 60 || b.x < 760 || Math.abs(b.y - LANE_Y) > 30;
        if (fresh) {   // (the convoy afresh at the hotel: the booth, the escort behind it, the Rats to come)
          makeBooth(m, at, wayFrom(at.x));
          for (let i = 0; i < RATS; i++) for (const tag of ['ratwheel' + i, 'ratgun' + i]) for (const a of m.tagged(tag)) m.remove(a);
          for (const a of m.tagged('rats')) m.remove(a);
        }
        const B = m.one('booth'), v = m.vehicle, own = v && v.driver === m.player && Math.hypot(v.x - B.x, v.y - B.y) < 400;
        if (fresh || !m.one('ike') || m.vehicle !== m.one('escort')) ikeDrives(m, own ? { x: v.x, y: v.y, heading: v.heading } : laneAt(m, B.x + 130), B.x);
        if (!m.tagged('rats').length) { m.data.rats = null; m.data.spawnT = null; }   // (the Rats afresh)
      },
      *run(m) {
        m.failIf(mm => !boothOk(mm), WRECK);
        m.failIf(mm => !mm.one('escort'), 'the escort is wrecked');
        // (the bot's targets: the Brutes still in it, within the window's reach, with no bystander's car in the way)
        const hint = { kind: 'kill', targets: 'rats', done: v => doneFor(v) || Math.hypot(v.x - m.mover.x, v.y - m.mover.y) > REACH || blocked(m, v) }, aim = n => `The Rats, behind! Shoot them off the booth: ${n} left`;
        let n = -1;
        const fight = blessed(m, (mm, dt) => { rats(mm, dt); tow(mm); const k = left(mm); if (k !== n) { n = k; mm.objective(aim(k), { hint }); } });
        yield m.first([m.parallel([m.waitUntil(mm => left(mm) === 0), m.sequence([m.say(['Ike drives. You take the window, my son.'], FENDER),
          m.say(['Rats! Bilge\'s boys, coming up behind!'], IKE)])]), m.protect('fender', { reason: DEAD }), fight]);
        for (let i = 0; i < RATS; i++) for (const p of [m.one('ratwheel' + i), m.one('ratgun' + i)]) if (p && !p.seat) m.remove(p);   // (legged it)
        const v = m.one('booth'); m.data.health = v ? v.damage.share : 0;
        // round to the chapel's back door, where Fender gets out (held up in a jam a good while, or a long way round, he
        // walks the last of it); the window's watch kept with nothing left to shoot (the Brutes done for are all counted
        // out: the bot holds its fire)
        m.objective('Ride round to St. Christopher\'s with Fender', { hint });
        const there = mm => { const b = mm.one('booth'); return !b || Math.hypot(b.x - CHAPEL[0], b.y - CHAPEL[1]) < 90; };
        let held = 0, last = m.stageTime;
        const jammed = mm => { const b = mm.one('booth'), t = mm.stageTime; held = b && b.speed < 3 ? held + t - last : 0; last = t; return held > JAM_T; };
        yield m.first([m.parallel([m.say(['That\'s the last of them. The chapel, Ike.'], FENDER), m.waitUntil(mm => there(mm) || jammed(mm), { timeout: 60 })]),
          m.protect('fender', { reason: DEAD }), blessed(m, tow)]);
        const walk = !there(m), f = m.one('fender'); if (f) m.remove(f);   // (in at the back door, or out to walk it)
        m.objective('');
        yield m.say([walk ? 'Let me out here, Ike. I\'ll walk the last block.' : 'Here\'s my door. Confession won\'t hear itself.', 'Bless you, my son. Go with God. And with a Buzzsaw.'], FENDER);
      },
    },
  ],
});
