// FAN-OUT B (missions and activities). The ways to lose stars are out of sight, Spray & Pray, or a bribe (PLAN.md 8.13,
// play.js). But the activities' "blind eye" ops wipe whatever heat the player brings to them, and give none of it back:
// MAYHEM's blindEye (cap 0 at its start, clear() at its end), the races' (clear() and cap 0 at the start), Vigilante's
// onDuty, Firefighter's lights, and Lawn Order's setup (m.wanted.clear()); none of them can be refused while wanted.
// So four stars go to none the moment a MAYHEM skull's card or the phone's JOBS is answered START, and QUIT THE JOB at
// once keeps them at none. The random events show the intended contract: "the player's own stars from before it began
// are back after" (events/*.js quiet()).
// The fix (D28): a job or an activity never starts with stars on (NOT WHILE WANTED on its card and the phone's rows, as
// for a switch or a cab): the player loses them first, so no stage's clean slate is a way out of them.
//   node --test tests/review/missions/job-start-wipes-wanted-level.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

async function wanted4(hash) {
  const g = await loadGame({ hash, query: { seed: '1', time: 'day', weather: 'clear' } });
  g.game.advance(1);
  const w = g.gtm.life.wanted; w.set(4); g.game.advance(.5);
  return { ...g, C: g.gtm.career, w };
}

test('four stars stay four after starting a MAYHEM at its skull and quitting it, or a job from the phone in a police car', async () => {
  const out = {};
  {   // MAYHEM: Zap Rats, on foot at its skull at the Fish Market: its card's START, then the pause's QUIT THE JOB
    const { game, gtm, C, w } = await wanted4('#play/safehouse'), p = gtm.crew.ped, q = gtm.city.poi('fish-market');
    p.place(q.x + 80, q.y, 0); game.advance(.25); p.place(q.x, q.y, 0); p.mover.vx = p.mover.vy = 0; game.advance(.25);
    assert.equal(C.card && C.card.id, 'activity', 'the skull\'s card');
    assert.deepEqual([C.card.items[0].disabled, C.card.items[0].sub], [true, 'NOT WHILE WANTED'], 'START is refused while wanted');
    const before = w.stars; C.card.items[0].act();
    for (let i = 0; i < 40 && !C.R.timer; i++) game.advance(.25);   // (its lines, then the clock)
    const running = w.stars; C.R.quit('player'); game.advance(3);
    out.mayhem = { before, running, afterQuit: w.stars };
  }
  {   // Vigilante: at the wheel of a police cruiser, the phone's first row (the job the car can start), then QUIT THE JOB
    const { game, gtm, C, w } = await wanted4('#play/safehouse'), p = gtm.crew.ped;
    const v = gtm.fleet.spawn('cruiser', p.x + 40, p.y + 40, 0); v.sit(p, 0); p.place(v.x, v.y, v.z); game.advance(.25);
    C.phone(); const row = C.card && C.card.items[0];
    assert.equal(row && row.label, 'VIGILANTE', 'the phone offers the job the car can start');
    assert.deepEqual([row.disabled, row.sub], [true, 'NOT WHILE WANTED'], 'not while wanted');
    const before = w.stars; row.act(); game.advance(2);
    const running = w.stars; C.R.quit('player'); game.advance(3);
    out.vigilante = { before, running, afterQuit: w.stars };
  }
  assert.deepEqual([out.mayhem.afterQuit, out.vigilante.afterQuit], [4, 4], 'the stars brought to the job, after QUIT THE JOB: ' + JSON.stringify(out));
});
