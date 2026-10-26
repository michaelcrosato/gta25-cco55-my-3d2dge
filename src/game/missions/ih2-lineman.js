// IH2 · Setup: The Lineman (EXPANSION.md 4, X3): Viv's second setup for Blackout, from the planning board at the flat
// over Sudsy's, played as Gus. The line into the Power Station runs on the pylons down Pylon Street, and only a cherry
// picker reaches it: the Volt Boys park one in Substation 9's yard. Gus steals it (the Substation's alarm: two stars),
// loses the police, and parks it at Pylon Street's curb under the line: stashed, so it stands there in the save's
// garage and Blackout finds it (m.garaged('bucket')). Proves: a heavy vehicle, the wanted level.
//   Each stage's setup restores what it needs: the Bucket in the yard (or, past the theft, at the wheel), the curb
//   under the line found once and kept in m.data.
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, GUS = { name: 'Gus', color: '#ff9a2a' };
const YARD = [1304, 776], YARD_H = Math.PI / 2;   // (Substation 9's yard, south of the hall, nose to Loop Avenue between two of its lamps: nose west, it had a truck's turn to make in four cells of yard, and sawed at the lamps till the police had it)
const LINE = [1504, 680];   // (Pylon Street's east curb between the two pylons north of Loop Avenue)
const ACROSS = [1264, 816];   // (the sidewalk on Loop Avenue outside the yard)
const spot = m => (m.data.curb ||= (q => ({ x: Math.round(q.x), y: Math.round(q.y), heading: +q.heading.toFixed(3) }))(m.curb(LINE)));
/** a point by a curb spot: d along it (the way it faces) and r out to its right, onto the sidewalk */
const by = (q, d, r) => [q.x + Math.cos(q.heading) * d - Math.sin(q.heading) * r, q.y + Math.sin(q.heading) * d + Math.cos(q.heading) * r];
const bucket = (m, at = YARD, heading = YARD_H) => m.ensure.vehicle('bucket', 'bucket', at, { heading, color: '#ffd23a' });

defMission('heist_lineman', {
  title: 'Setup: The Lineman', giver: { at: 'ironside-board' }, tier: 1, requires: ['heist_grid_map'], district: 'ironside', plays: 'gus',
  brief: ['The station\'s line runs on the pylons down Pylon Street.', 'Steal the Volt Boys\' cherry picker and park it under the line.'],
  rewards: { cash: 2500 },
  bonus: [{ id: 'time', text: 'Under 5:00', check: m => m.elapsed < 300 }, { id: 'clean', text: 'The Bucket above 80%', check: m => (m.data.health ?? 0) > .8 }],
  stages: [
    { id: 'call', setup(m) { m.as('gus'); }, *run(m) {
      yield m.say(['Gus. The station\'s line runs on the pylons down Pylon Street.', 'Only a cherry picker reaches it. The Volt Boys keep one in the Substation\'s yard.', 'Borrow it. Park it under the line.'], VIV);
    } },
    {
      id: 'steal',
      setup(m) {
        m.as('gus');
        const v = bucket(m); if (v.damage.share < .6) v.damage.repair();
        if (m.dist(v) > 700) m.place('player', ACROSS);   // (a deep link: across the street from the yard)
      },
      *run(m) {
        yield m.enter('bucket', { text: 'Steal the Volt Boys\' Bucket from Substation 9\'s yard', lost: 'the Bucket\'s gone' });
        m.wanted.set(2);   // (the Substation's alarm)
        yield m.parallel([m.say(['There goes the alarm. Lose them before you go near the line.'], VIV), m.evade({ text: 'The Substation\'s alarm: lose the police' })]);
      },
    },
    {
      id: 'park',
      setup(m) {
        m.as('gus');
        if (m.garaged('bucket')) return;
        const v = bucket(m); if (v.damage.share < .6) v.damage.repair();
        if (m.vehicle !== v) m.place('player', { in: v });
      },
      *run(m) {
        const q = spot(m);
        if (!m.garaged('bucket')) {
          yield m.deliver({ what: 'bucket', to: [q.x, q.y], radius: 48, stopped: true, lost: 'the Bucket\'s gone', text: 'Park the Bucket at Pylon Street\'s curb, under the line' });
          const v = m.one('bucket'); m.data.health = v.damage.share;
          if (m.vehicle === v) m.place('player', by(q, -6, v.hw + 16));
          m.place(v, [q.x, q.y], { heading: q.heading });
          m.stash(v, 'bucket', [q.x, q.y, q.heading]);
        }
        yield m.say(['She\'s parked under the line. Bucket reaches the wires with a foot to spare.'], GUS);
        yield m.say(['Good. The plans, the picker. Now the big one.'], VIV);
      },
    },
  ],
});
