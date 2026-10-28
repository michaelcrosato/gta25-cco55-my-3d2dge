// SkyCam (PLAN.md 19's backlog, HANDOFF L4): the sixth job, and the one flown. In Channel 6's SkyCam (on its pad on
// Marquee Plaza), the phone's JOBS put the player on the news desk: a story breaking across town; fly there against
// the clock and hold the camera on it (over it, below the clouds, slow enough for a steady shot) till the producer has
// the seconds she needs, then the next. A smash is a wreck smoking at a kerb; a chase is a stolen Saint with a cruiser
// on its tail, filmed as it runs. Level 1 is two smashes, level 2 two smashes and a chase, level 3 two of each, the
// shots longer. Started on foot (a deep link, a retry after the SkyCam went down), Channel 6 lends one at the nearest
// open lane. Proves: the player's helicopter, flown to a point, held over a mover, and set down.
import { defActivity } from '../../motor/index.js';

const DESK = { name: 'Channel 6', color: '#ff7a1e' };
// where the smashes happen: points of interest with a kerb close by
const SPOTS = [
  ['palm-park', 'Palm Park'], ['greasy-spoke', 'the Greasy Spoke'], ['gnomes-hq', 'Gutterball Lanes'], ['threads', 'Threads'],
  ['pixel-palace', 'the Pixel Palace'], ['bank-door', 'the First Lowtown Bank'], ['kwik-lux-neon', 'the Neon Mile Kwik-Lux'],
  ['spray-pray', 'Spray & Pray'], ['car-wash', 'the Palm Car Wash'], ['kwik-lux-harbor', 'the Harbor Kwik-Lux'], ['lead-farm', 'Lead Farm'],
].map(([id, name]) => ({ id, name }));
// where a chase starts and where the Saint runs to (far apart: a chase lasts)
const RUNS = [['greasy-spoke', 'crush-hour'], ['lead-farm', 'car-wash'], ['palm-park', 'kwik-lux-harbor'], ['spray-pray', 'hotel-marquee']];
const KINDS = [null, ['smash', 'smash'], ['smash', 'smash', 'chase'], ['smash', 'chase', 'smash', 'chase']];
const MAX = 4;
const count = m => KINDS[m.level].length;
const FILM = [0, 5, 6, 7];   // (the seconds of steady footage a story needs)
const R = 80, HIGH = 220, STEADY = 60;   // (on the shot: within R across, below HIGH, slower than STEADY)
const GRACE = [0, 30, 26, 22], SLACK = [0, 2.2, 2.0, 1.8];   // (a story's clock: the flight there at the SkyCam's pace, stretched, and a grace)
const clock = (m, at) => Math.round(GRACE[m.level] + Math.hypot(at[0] - m.mover.x, at[1] - m.mover.y) / 150 * SLACK[m.level] + FILM[m.level]);

const inCam = m => !!m.vehicle && m.vehicle.def.id === 'skycam' && m.vehicle.driver === m.player;
const spot = (m, id) => { const q = m.lane(id); return [Math.round(q.x), Math.round(q.y)]; };
// the SkyCam: the one the player flies ('ride'), else Channel 6's own on the nearest open lane, the player at the controls
function freeLane(m, p) {
  for (const k of [0, 1, -1, 2, -2, 3]) {
    const q = m.lane([p[0] + k * 40, p[1] + k * 24]);
    if ((q.z || 0) < 4 && !m.fleet.near(q.x, q.y, 50).some(v => !v.wrecked && Math.hypot(v.x - q.x, v.y - q.y) < 50)) return q;
  }
  return m.lane(p);
}
function ride(m) {
  if (inCam(m)) {
    const b = m.one('ride'); if (b === m.vehicle) return b;
    if (b) m.remove(b);
    return m.adopt(m.vehicle, 'ride');
  }
  let b = m.one('ride');
  if (!b || m.dist(b) > 240) { if (b) m.remove(b); const q = freeLane(m, [m.player.x, m.player.y]); b = m.ensure.vehicle('ride', 'skycam', q, { heading: q.heading }); }
  m.place('player', { in: b });
  return b;
}
const neutral = m => { for (const g of ['saints', 'rats', 'gnomes']) m.truce(g); };   // (the press: nobody's target)
// story k's spot (a smash's kerb, a chase's start and end), picked as its stage comes and kept for a retry
function storyFor(m, k) {
  const D = m.data.stories || (m.data.stories = []); if (D[k]) return D[k];
  const kind = KINDS[m.level][k], used = new Set(D.filter(Boolean).map(s => s.id));
  if (kind === 'chase') { const left = RUNS.filter(r => !used.has(r[0])), r = left[Math.floor(m.rng.next() * left.length) % left.length]; return (D[k] = { kind, id: r[0], to: r[1] }); }
  const left = SPOTS.filter(s => !used.has(s.id)).map(s => ({ s, d: m.dist(spot(m, s.id)) })).filter(q => q.d > 300 && q.d < 1500);
  const pool = left.length ? left : SPOTS.filter(s => !used.has(s.id)).map(s => ({ s }));
  return (D[k] = { kind, id: pool[Math.floor(m.rng.next() * pool.length) % pool.length].s.id });
}
const nameOf = id => (SPOTS.find(s => s.id === id) || { name: id.replace(/-/g, ' ') }).name;
// on the shot of a: over it, low enough, steady
const onShot = (m, a) => inCam(m) && !!a && Math.hypot(m.vehicle.x - a.x, m.vehicle.y - a.y) < R && m.vehicle.z < HIGH && m.vehicle.speed < STEADY + (a.speed || 0);

const storyStage = k => ({
  id: 'story' + (k + 1),
  setup(m) {
    if (k >= count(m)) return;
    neutral(m); ride(m);
    const S = storyFor(m, k), tag = 'story' + k;
    if (!m.one(tag)) {
      if (S.kind === 'smash') {
        const q = m.curb(spot(m, S.id)), v = m.spawn.vehicle(['cortez', 'zephyr', 'retiree'][k % 3], q, { tag, heading: q.heading, health: .3 });
        v.damage.hit(1);   // (smoking at the kerb: under a third of its health, over the share that burns)
        for (let i = 0; i < 2; i++) m.spawn.ped(['tourist', 'office'][i], [q.x + 30 - i * 60, q.y + 26], { tag: tag + 'crowd', role: 'idle' });
      } else {
        const q = m.lane(S.id), to = spot(m, S.to);
        m.spawn.vehicle('saint', q, { tag, heading: q.heading, driver: 'saint-grunt', drive: { to, style: 'fast' } });
        const c = m.lane([q.x - Math.cos(q.heading) * 90, q.y - Math.sin(q.heading) * 90]);
        m.spawn.vehicle('cruiser', c, { tag: tag + 'cops', heading: c.heading, driver: 'mpd', drive: { chase: tag, style: 'fast' } });
      }
    }
    m.failIf(mm => !inCam(mm) && !mm.one('ride'), 'the SkyCam\'s down');
    m.failIf(mm => !mm.one(tag), 'the story\'s gone: nothing to show');
  },
  *run(m) {
    if (k >= count(m)) return;
    const S = m.data.stories[k], tag = 'story' + k, n = count(m), a = m.one(tag), need = FILM[m.level];
    const T = m.timer(clock(m, [a.x, a.y]), { label: 'STORY', reason: 'the story went to Channel 9' });
    const text = S.kind === 'smash' ? `Story ${k + 1} of ${n}: a smash at ${nameOf(S.id)}: get it on camera` : `Story ${k + 1} of ${n}: a chase from ${nameOf(S.id)}: stay on it`;
    const hint = S.kind === 'smash' ? { kind: 'goto', at: [Math.round(a.x), Math.round(a.y)], radius: R * .6, vehicle: 'ride', hover: true } : { kind: 'follow', target: tag, dist: R, vehicle: 'ride' };
    m.objective(text, { hint });
    m.marker(a, { color: '#ff7a1e' });
    let film = 0, t0 = m.elapsed;
    yield Object.assign(m.waitUntil(mm => {
      const dt = mm.elapsed - t0; t0 = mm.elapsed;
      const on = onShot(mm, mm.one(tag)); if (on) film += dt;
      T.label = on ? `ON AIR ${Math.min(need, Math.floor(film))}/${need}` : 'STORY';
      return film >= need;
    }), { nav: mm => mm.one(tag) });
    m.data.spare = Math.min(m.data.spare ?? 1e9, T.left); T.stop();
    if (k < n - 1) yield m.say([['Got it. That\'s the six o\'clock.', 'Lovely shot. Another one\'s breaking.', 'That\'ll lead the hour. Next.'][k % 3]], DESK);
    else yield m.say(['That\'s the bulletin. Bring her home, ace.'], DESK);
  },
});

defActivity('job_skycam', {
  title: 'SkyCam', kind: 'job', levels: 3, start: { vehicle: ['skycam'] },
  brief: ['Channel 6 News: get the story on camera before Channel 9 does.', 'More stories, chases, and longer shots, level by level.'],
  rewardsFor: level => ({ cash: [0, 600, 1200, 2000][level] || 600 }),
  bonus: [{ id: 'spare', text: 'Every story with 15 s to spare', check: m => (m.data.spare ?? 0) >= 15 }],
  stages: [
    { id: 'shift', setup(m) { neutral(m); ride(m); }, *run(m) { yield m.say([`Channel 6 News. ${count(m)} stories on the board.`, 'Hold the shot steady. Below the clouds.'], DESK); } },
    ...Array.from({ length: MAX }, (_, k) => storyStage(k)),
  ],
});
