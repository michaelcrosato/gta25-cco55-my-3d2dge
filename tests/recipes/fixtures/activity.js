// The activity recipe's fixture (docs/CONTENT-GUIDE.md, "An activity"), as src/game/activities/job-leaflets.js: a
// job with two levels (each a drop more), started on foot at the safehouse, paying by the level. A stage per drop;
// its setup skips the drops the level leaves out. tests/recipes/activity.test.mjs plays both levels with the bot.
import { defActivity } from '../../motor/index.js';

const DROPS = ['greasy-spoke', 'gas-n-sip'];
const BOSS = { name: 'Printer', color: '#e8c040' };
defActivity('job_leaflets', {
  title: 'Leaflets', kind: 'job', levels: 2, start: { at: 'safehouse', foot: true, radius: 20 },
  brief: ['Moonlighting for the print shop: leaflets through the doors.', 'A door more each level.'],
  rewardsFor: level => ({ cash: 100 * level }),
  stages: [
    { id: 'call', setup() {}, *run(m) { yield m.say([`${m.level} door${m.level > 1 ? 's' : ''}. Mind the dogs.`], BOSS); } },
    ...DROPS.map((poi, k) => ({ id: 'drop' + (k + 1), setup() {},
      *run(m) { if (k >= m.level) return; yield m.reach(poi, { text: 'A leaflet through the door', foot: true, radius: 24 }); } })),
  ],
});
