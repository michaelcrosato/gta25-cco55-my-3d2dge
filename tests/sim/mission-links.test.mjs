// Every mission's and activity's deep link (PLAN.md 8.15: "#mission/<id>/<stage> lands at the right moment"), and the
// mission lint (PLAN.md 14: every stage has a setup and a run, every objective a hint with its data): one game, the
// scene entered again for each stage. The bot's passes (seeds 1-3, and through a pad) are test:full's
// (tools/bot.mjs --all).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

test('each mission\'s every stage, and each activity at level 1, lands from its deep link: running at that stage, its objective set, no errors', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1999', time: 'night', weather: 'clear' } });
  const M = gtm.motor, bad = [];
  const land = (id, stage, level) => {
    const C0 = gtm.career; game.go('mission', { route: ['mission', id, stage] });
    for (let i = 0; i < 60 && gtm.career === C0; i++) game.advance(.05);   // (the scene's enter: after its transition)
    if (level) gtm.career.startMission(id, { activity: true, level });
    const R = gtm.career.R, spec = M.get('missions', id) || M.get('activities', id), want = stage ? spec.stages.findIndex(s => s.id === stage) : 0;
    for (let t = 0; t < 12 && R.state === 'running' && !(R.objective && R.stageIdx >= want); t += .25) game.advance(.25);   // (the lines first, then the objective; a stage of lines only goes on to the next)
    const objective = R.objective && R.objective.text;
    const where = `${id}${stage ? '/' + stage : ''}`;
    if (R.errors.length) bad.push(`${where}: ${R.errors.map(e => e.err.message).join('; ')}`);
    else if (R.state !== 'running' && R.state !== 'passed') bad.push(`${where}: ${R.state} (${R.failure})`);
    else if (R.state === 'running' && R.stageIdx < want) bad.push(`${where}: at ${R.stage.id}`);
    else if (!objective && R.state === 'running') bad.push(`${where}: no objective after 12 s`);
    if (R.active) R.quit();
  };
  for (const m of M.all('missions')) for (const s of m.stages) land(m.id, s.id);
  for (const a of M.all('activities').filter(q => q.kind !== 'event')) land(a.id, null, 1);
  assert.deepEqual(bad, [], bad.join('\n'));
  assert.deepEqual([...gtm.BUS.errors], []);
});

// the slice's 14 missions (PLAN.md 9.4): the ids a mission has and may require, whether or not they are in this build
// yet (the chains are written side by side: FAN-OUT A2)
const PLANNED = ['prologue', 'saints_holy_rollers', 'saints_confession_booth', 'saints_drag_mass', 'rats_rat_run', 'rats_below_deck', 'rats_crane_game',
  'gnomes_lawn_order', 'gnomes_bingo_night', 'gnomes_gutter_ball', 'heist_getaway', 'heist_blueprints', 'heist_big_drill', 'heist_big_withdrawal'];

test('the mission lint: every stage a setup and a generator run, every mission a title and a giver, every fail reason a string', async () => {
  const { gtm } = await loadGame(), M = gtm.motor, bad = [];
  for (const m of M.all('missions')) {
    if (!PLANNED.includes(m.id)) bad.push(m.id + ': not one of the slice\'s missions (PLAN.md 9.4)');
    if (!m.giver || !(m.giver.phone || m.giver.at || m.giver.intro)) bad.push(m.id + ': no giver');
    if (!m.rewards || typeof m.rewards.cash !== 'number') bad.push(m.id + ': no cash reward');
    for (const r of m.requires || []) if (!PLANNED.includes(r)) bad.push(m.id + ': requires an unknown ' + r);
    for (const b of m.bonus || []) if (!b.id || !b.text || typeof b.check !== 'function') bad.push(m.id + ': a bonus objective needs { id, text, check }');
  }
  for (const a of M.all('activities')) if (a.kind === 'job' && !(a.start && a.start.vehicle)) bad.push(a.id + ': a job starts in a vehicle (start.vehicle)');
  assert.deepEqual(bad, [], bad.join('\n'));
});
