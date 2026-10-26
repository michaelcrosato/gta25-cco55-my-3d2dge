// GV2 · Loaded Dice (EXPANSION.md 4, X6): the Velvet Syndicate's second job. St. Chrome's runs the richest bingo on
// the hill (the Saints' own racket, Thursdays in the crypt) and Madame Velour wants her croupier, Dolores, calling the
// numbers. Viv drives her in the limo to Summit Road behind the cathedral, walks her down Velvet Row to the crypt's side
// door on the cathedral's west face, and walks her back out when the game is fixed, unseen: the Saints keep watch over
// the front (their men on the plaza and across the street, all looking down the hill), so the way in is from behind,
// down the side street out of their sight. Seen, the game's blown. Proves: a stealth escort (a follower, sight cones).
//   The Saints' watch stands its posts (mission guards: a sight cone each, the building in the way of its view); Dolores
//   follows Viv (an ally).
import { defMission } from '../../motor/index.js';

const VELOUR = { name: 'Madame Velour', color: '#c87aff' }, DOLORES = { name: 'Dolores', color: '#ff8af0' }, VIV = { name: 'Viv', color: '#3ad0c8' };
const T = 16, C = (x, y) => [(x + .5) * T, (y + .5) * T];
const CASINO = [50 * T, 59.5 * T];   // (the limo's curb at the casino's forecourt)
const DROP = [30 * T, 7.5 * T];   // (Summit Road, behind the cathedral to the west: the limo out of the watch's sight)
const DOOR = C(42, 16);   // (the crypt's side door, on Velvet Row's walk by the cathedral's west face)
// in: across Summit Road's walk to the corner, down Velvet Row's east walk to the door; out the same way back
const IN = [C(31, 9), C(41, 9), C(42, 12), DOOR], OUT = [C(42, 12), C(41, 9), C(31, 9)];
// the Saints' watch: on the plaza's corners and its steps and across Velvet Row, every one looking down the hill
const WATCH = [[43, 24], [50, 24], [57, 24], [36, 22]].map(([x, y]) => ({ at: C(x, y), facing: Math.PI / 2 }));
const GAME_T = 14;   // (s the bingo takes to fix)

const curbAt = (m, at, h) => (q => ({ x: Math.round(q.x), y: Math.round(q.y), heading: +q.heading.toFixed(3) }))(m.curb(at, { heading: h }));
function limo(m, near = CASINO) {
  let v = m.one('limo'); if (v && !v.wrecked) return v;
  const q = curbAt(m, near, 0); return m.spawn.vehicle('velvetlimo', [q.x, q.y], { tag: 'limo', heading: q.heading, color: '#16141c' });
}
// Dolores: in the limo's back seat on the way, on foot at Viv's heels at the cathedral
function dolores(m, v = null) {
  let d = m.one('dolores'); if (d && d.dead) { m.remove(d); d = null; }
  if (!d) d = m.spawn.ped('clubber', v ? [v.x, v.y] : [m.player.x + 20, m.player.y], { tag: 'dolores', name: 'Dolores', role: 'ally', health: 100 });
  if (v && !d.seat) m.place(d, { in: v, seat: 2 });
  return d;
}
function watch(m) {
  for (const a of m.tagged('watch')) m.remove(a);
  // (the job's own, of no gang: a turf war's stray, a Velvet patrol's pellet, had put one on his guard)
  for (const w of WATCH) m.spawn.ped('saint-grunt', w.at, { tag: 'watch', role: 'guard', facing: w.facing, weapons: ['fists', 'snub38'] });
}
// (gone: dead, or nowhere to be found while she isn't inside calling the game)
const lost = m => { const d = m.one('dolores'); return d ? d.dead : !m.data.inside; };
const seen = m => m.tagged('watch').some(a => { const e = m.R.actors.entry(a); return e && e.alerted; });
// a leg on foot out of the watch's sight (the bot's stealth hint), done at its end with Dolores at Viv's heels
function sneak(m, text, path) {
  const end = path[path.length - 1];
  const o = m.waitUntil(mm => { const d = mm.one('dolores'); return Math.hypot(mm.player.x - end[0], mm.player.y - end[1]) < 12 && !!d && Math.hypot(d.x - mm.player.x, d.y - mm.player.y) < 70; });
  return { ...o, start: mm => { mm.objective(text, { hint: { kind: 'stealth', path } }); mm.marker(end, { color: '#7ac8ff', r: 8 }); }, nav: () => end };
}

defMission('velvet_loaded_dice', {
  title: 'Loaded Dice', giver: { phone: 'velvet' }, gang: 'velvet', tier: 2, requires: ['velvet_comp'], district: 'glass-heights', plays: 'viv',
  brief: ['The Saints\' bingo at St. Chrome\'s needs a new caller: Velour\'s Dolores.', 'Walk her in by the side door and out again. If the Saints see you, it\'s off.'],
  rewards: { cash: 4000, respect: { velvet: 15, saints: -10 } },
  bonus: [{ id: 'time', text: 'Under 4:00', check: m => m.elapsed < 240 }],
  stages: [
    { id: 'call', setup(m) { m.as('viv'); }, *run(m) {
      yield m.say(['Thursday is bingo night at St. Chrome\'s, darling. The Saints\' little goldmine.', 'Dolores calls the numbers tonight. She calls them the way I like.', 'In by the crypt\'s side door, out the same way. Not a Saint sees her.'], VELOUR);
    } },
    {
      id: 'drive',
      // the limo at the casino's curb, Dolores in its back, Viv at its wheel
      setup(m) {
        m.as('viv'); const v = limo(m); dolores(m, v);
        if (m.vehicle !== v) m.place('player', { in: v });
        m.truce('saints'); m.truce('yacht');   // (the city's Saints and the Club leave a black limo be tonight: theirs to find out later)
        m.loadout({ weapons: ['fists'], only: true, select: 'fists' });
      },
      *run(m) {
        m.failIf(lost, 'Dolores is dead');
        yield m.parallel([
          m.say(['Velvet Row\'s the way. Behind the church, never past the front.'], DOLORES),
          m.reach(DROP, { vehicle: 'limo', radius: 90, stopped: true, text: 'Drive Dolores to Summit Road, behind St. Chrome\'s (keep off the cathedral\'s front)' }),
        ]);
      },
    },
    {
      id: 'in',
      // the limo stopped on Summit Road behind the cathedral, Viv and Dolores out of it, the watch at its posts
      setup(m) {
        m.as('viv'); const v = limo(m, DROP);
        if (Math.hypot(v.x - DROP[0], v.y - DROP[1]) > 200) { m.remove(v); for (const a of m.tagged('dolores')) m.remove(a); }
        const L = limo(m, DROP), d = m.one('dolores');
        if (m.vehicle || m.dist(L) > 120) m.place('player', [L.x, L.y + 30]);   // (out of the limo, beside it: a deep link too)
        if (!d || d.seat || d.dead) { for (const a of m.tagged('dolores')) m.remove(a); dolores(m); }
        m.loadout({ weapons: ['fists'], only: true, select: 'fists' });
        watch(m); m.wanted.clear(); m.data.inside = false;
      },
      *run(m) {
        m.failIf(lost, 'Dolores is dead');
        m.failIf(seen, 'the Saints saw you');
        yield m.parallel([m.say(['Quietly, now. Stay close.'], VIV), sneak(m, 'Walk Dolores down Velvet Row to the crypt\'s side door, out of the Saints\' sight', IN)]);
        yield m.say(['Wish me luck, honey. B-nine. Again.'], DOLORES);
        m.data.inside = true; const d = m.one('dolores'); if (d) m.remove(d);
        m.data.fixed = m.elapsed + GAME_T;
        m.objective('Wait by the side door while Dolores calls the game', { hint: { kind: 'stealth', path: [DOOR] } });
        yield m.waitUntil(mm => mm.elapsed >= mm.data.fixed);
        dolores(m); m.data.inside = false;
        yield m.say(['Full house for the house. Let\'s go.'], DOLORES);
        yield sneak(m, 'Walk Dolores back to the limo on Summit Road, unseen', OUT);
      },
    },
    {
      id: 'away',
      setup(m) {
        m.as('viv'); const v = limo(m, DROP); dolores(m); if (m.dist(v) > 300) m.place('player', [v.x, v.y + 30]); m.truce('saints'); m.truce('yacht');
        for (const a of m.tagged('watch')) m.remove(a);   // (the watch back inside for the game: one put on its guard had shot the limo up on its way)
      },
      *run(m) {
        m.failIf(lost, 'Dolores is dead');
        const v = m.one('limo'), d = m.one('dolores'); if (d && !d.seat) m.place(d, { in: v, seat: 2 });
        yield m.enter('limo', { text: 'Back in the limo', lost: 'the limo\'s gone' });
        yield m.reach(CASINO, { vehicle: 'limo', radius: 100, stopped: true, text: 'Dolores back to the Velvet Casino' });
        yield m.say(['The Saints paid out their own bingo to Velour\'s shills all night.', 'Delicious. Come back soon, darling.'], VELOUR);
      },
    },
  ],
});
