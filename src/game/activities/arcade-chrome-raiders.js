// CHROME RAIDERS (PLAN.md 19's backlog, HANDOFF L4): the high score on the cabinet in Club Chrome's VIP lounge
// (arcade/chrome-raiders.js: the engine's shooter starter kit). Started at the club's doors on the plaza: in, through
// the floor to the lounge, and a play that ends on 10,000 or more. It counts on the checklist's Arcade high scores.
// Proves: an interior's spot (the cabinet), a starter kit run inside the game, a play's score read back.
import { defActivity } from '../../motor/index.js';

const TARGET = 10000;
const C = ([x, y]) => [Math.round((x + .5) * 16), Math.round((y + .5) * 16)];   // (a club cell's middle)
// the way from the club's doors to the cabinet: up the hall, along the floor's east side, through the lounge's door
const PATH = [[19, 21], [33, 18], [33, 9], [35, 9], [35, 7], [37, 7]].map(C), AT = C([37, 5]);
const DESK = { name: 'Father Fender', color: '#7ae0ff' };

defActivity('arcade_chrome_raiders', {
  title: 'Chrome Raiders', kind: 'arcade', start: { at: 'club-chrome-door', foot: true, radius: 16 },
  brief: ['The Saints keep a cabinet in the VIP lounge.', `CHROME RAIDERS: a play of ${TARGET.toLocaleString('en-US')} or more.`],
  rewards: { cash: 300 },
  bonus: [{ id: 'double', text: `A play of ${(TARGET * 2).toLocaleString('en-US')}`, check: m => (m.data.best ?? 0) >= TARGET * 2 }],
  stages: [
    {
      id: 'in', setup() {},
      *run(m) {
        if (m.inside && m.inside.id === 'club-chrome') return;
        const door = m.at('club-chrome-door');
        m.objective('Into Club Chrome', { hint: { kind: 'goto', at: door, radius: 16, foot: true, interact: true } });
        yield m.waitUntil(mm => !!mm.inside && mm.inside.id === 'club-chrome');
      },
    },
    {
      id: 'cabinet',
      setup(m) { m.on('arcadeEnd', e => { if (e.kit === 'shooter') m.data.best = Math.max(m.data.best || 0, e.score); }); },
      *run(m) {
        m.objective(`CHROME RAIDERS in the VIP lounge: ${TARGET.toLocaleString('en-US')} in a play`, { hint: { kind: 'arcade', at: AT, path: PATH, score: TARGET } });
        yield m.waitUntil(mm => (mm.data.best || 0) >= TARGET);
        yield m.say(['Not bad, kid. The Saints\' high score board has a new name.'], DESK);
      },
    },
  ],
});
