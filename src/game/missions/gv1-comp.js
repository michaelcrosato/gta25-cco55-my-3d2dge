// GV1 · The Comp (EXPANSION.md 4, X6): the Velvet Syndicate's first job, from their payphone on the Velvet Casino's
// forecourt. Madame Velour comps the high rollers who pay and collects from the ones who don't: four markers round the
// Strip tonight, collected in the Syndicate's own black limo. Two of them pay at the window (Mrs. Pomeroy at Spray &
// Pray Heights, the Riviera's night manager); two run (Lucky Lou on Velvet Row, Dr. Vane at the Grand Palms): out of
// the limo after them on foot, put them down (fists: dead men pay no debts) and they pay. Then the limo back to the
// casino. Proves: foot chases, takedowns.
//   Each stage's setup restores what it needs: the limo (kept: the job's own) and the player at its wheel near the
//   stop before, the debtor at his door.
import { defMission } from '../../motor/index.js';

const VELOUR = { name: 'Madame Velour', color: '#c87aff' }, T = 16;
const C = (x, y) => [x * T, y * T];
const CASINO = C(50, 59.5);   // (Loop Avenue's eastbound curb at the casino's forecourt)
// the four, in the order of the round: where they stand (on the walk at their door), where the limo stops for them
const DEBTS = [
  { id: 'lou', name: 'Lucky Lou', arch: 'jogger', at: C(41.5, 70), stop: C(38, 70), runs: true, owes: 800,
    meet: ['Lou! Madame Velour sends her love.'], after: ['Okay, okay! Here! It\'s all there!'], text: 'Lucky Lou, on Velvet Row by the casino' },
  { id: 'pomeroy', name: 'Mrs. Pomeroy', arch: 'retiree', at: C(21, 62), stop: C(21, 59), runs: false, owes: 600,
    meet: ['Madame Velour\'s compliments, Mrs. Pomeroy.'], after: ['Oh, the slots were very naughty this month. Here, dear. Tell Velour I said hello.'], text: 'Mrs. Pomeroy, outside Spray & Pray Heights' },
  { id: 'manager', name: 'The Riviera\'s night manager', arch: 'office', at: C(79, 50.5), stop: C(79, 53), runs: false, owes: 1500,
    meet: ['The Velvet Casino. You know why.'], after: ['Of course. The Riviera always settles. Discreetly, please.'], text: 'The night manager, at the Hotel Riviera' },
  { id: 'vane', name: 'Dr. Vane', arch: 'office', at: C(104, 76.5), stop: C(104, 79), runs: true, owes: 2400,
    meet: ['Doctor Vane. House call.'], after: ['Stop! I\'ll pay! Ow. Everything. Take it.'], text: 'Dr. Vane, outside the Grand Palms' },
];
const STOP_R = 110, REACH = 30;

const curbAt = (m, at, h) => (q => ({ x: Math.round(q.x), y: Math.round(q.y), heading: +q.heading.toFixed(3) }))(m.curb(at, { heading: h }));
// the limo: the job's own (kept), else a fresh one at a curb (a deep link: at the casino's, or by the stop before)
function limo(m, near = CASINO) {
  let v = m.one('limo'); if (v && !v.wrecked) return v;
  const q = curbAt(m, near, 0); return m.spawn.vehicle('velvetlimo', [q.x, q.y], { tag: 'limo', heading: q.heading, color: '#16141c' });
}
// a stage's start: the limo (by the stop before when it is far, on a retry or a deep link) and the player at its wheel
function aboard(m, i) {
  const near = i ? DEBTS[i - 1].stop : CASINO, v = limo(m, near);
  if (m.vehicle !== v) { if (Math.hypot(v.x - near[0], v.y - near[1]) > 600) { m.remove(v); return aboard(m, i); } m.place('player', { in: v }); }
  return v;
}
// the debtor at his door, fresh for each try (a runner flees the player once he is close)
function debtor(m, d) {
  for (const a of m.tagged(d.id)) m.remove(a);
  return m.spawn.ped(d.arch, d.at, { tag: d.id, name: d.name, role: d.runs ? 'flee' : 'idle', facing: Math.PI / 2 });
}
function stage(i) {
  const d = DEBTS[i];
  return {
    id: d.id,
    setup(m) { aboard(m, i); debtor(m, d); m.loadout({ weapons: ['fists'], only: true, select: 'fists' }); },
    *run(m) {
      if (d.runs) m.failIf(mm => { const p = mm.one(d.id); return !p || p.dead; }, 'dead men pay no debts');
      yield m.reach(d.stop, { vehicle: 'limo', radius: STOP_R, stopped: true, text: 'Drive the limo to ' + d.text });
      yield m.say(d.meet, { name: 'Gus', color: '#ff9a2a' });
      if (d.runs) {
        yield m.chase(d.id, { reach: REACH, text: d.name + ' is running: after him on foot and put him down (fists)' });
      }
      yield m.say(d.after, { name: d.name, color: '#e8e8ec' });
      m.data.got = (m.data.got || 0) + d.owes;
    },
  };
}

defMission('velvet_comp', {
  title: 'The Comp', giver: { phone: 'velvet' }, gang: 'velvet', tier: 1, requires: ['heist_blackout'], district: 'glass-heights', plays: 'gus',
  brief: ['Four markers round the Strip, collected in the Syndicate\'s limo.', 'Two pay. Two run: put them down, gently. Dead men pay no debts.'],
  rewards: { cash: 3500, respect: { velvet: 15, saints: -5 } },
  bonus: [
    { id: 'time', text: 'Under 5:00', check: m => m.elapsed < 300 },
    { id: 'clean', text: 'The limo above 80%', check: m => (m.data.health ?? 0) > .8 },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['Darling. Four of my high rollers have forgotten their manners.', 'Take my limo and collect. The ones who pay, thank. The ones who run...', 'Persuade. No guns. A corpse never settles its tab.'], VELOUR);
    } },
    {
      id: 'limo',
      setup(m) { const v = limo(m); if (m.dist(v) > 700) m.place('player', [v.x - 30, v.y - 46]); },
      *run(m) { yield m.enter('limo', { text: 'Take Madame Velour\'s limo on the casino\'s forecourt', lost: 'the limo\'s gone' }); },
    },
    ...DEBTS.map((d, i) => stage(i)),
    {
      id: 'home',
      setup(m) { aboard(m, DEBTS.length); },
      *run(m) {
        yield m.reach(CASINO, { vehicle: 'limo', radius: 100, stopped: true, text: 'The limo back to the Velvet Casino' });
        const v = m.one('limo'); m.data.health = v ? v.damage.share : 0;
        yield m.say(['All four. My, my. You\'re wasted on that crew of yours, darling.', 'Velvet always remembers a friend.'], VELOUR);
      },
    },
  ],
});
