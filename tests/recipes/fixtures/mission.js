// The mission recipe's fixture (docs/CONTENT-GUIDE.md, "A mission"), as src/game/missions/x1-pizza-run.js, after the
// template (s1-holy-rollers.js): each stage's setup restores what it needs, so a retry or a deep link to a stage
// starts it; each op's hint is the bot's. tests/recipes/mission.test.mjs plays it with the mission bot.
import { defMission } from '../../motor/index.js';

const DINER = 'greasy-spoke', COOK = { name: 'Cook', color: '#ff5a5a' };
// the scooter outside the diner (the job's own: put back at the curb on a retry), and the player near it
const scooter = m => m.ensure.vehicle('scooter', 'sparrow', m.curb(DINER), { color: '#ff5a5a' });

defMission('pizza_run', {
  title: 'Pizza Run', giver: { at: DINER }, tier: 1, requires: ['prologue'],
  brief: ['The Greasy Spoke\'s delivery kid quit.', 'Three pies to the Palm Car Wash, hot.'],
  rewards: { cash: 300 },
  bonus: [{ id: 'time', text: 'Under 3:00', check: m => m.elapsed < 180 }],
  stages: [
    { id: 'order', setup(m) { scooter(m); if (m.dist(DINER) > 400) m.place('player', DINER); },
      *run(m) { yield m.say(['Three large. The car wash. Go!'], COOK); yield m.enter('scooter', { text: 'Get on the scooter outside the Greasy Spoke' }); } },
    { id: 'deliver', setup(m) { const v = scooter(m); if (m.dist(v) > 300) m.place('player', { in: v }); },
      *run(m) {
        const kerb = m.curb('car-wash');   // (the curb by its door: somewhere a scooter can stop)
        yield m.deliver({ what: 'scooter', to: [kerb.x, kerb.y], radius: 50, text: 'Take the pies to the Palm Car Wash' });
        yield m.say(['Still warm. Good kid.'], COOK);
      } },
  ],
});
