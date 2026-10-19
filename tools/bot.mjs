// The mission bot's runs (PLAN.md 8.15, 14): every mission (and activity, at each of its levels) played headless from
// its deep link by the MissionBot, on seeds 1-3, passed or not. --pad plays the same through a gamepad (the scripted
// human-style pass): the bot's wishes pressed on a pad by the PadPilot each step, the game reading the pad.
//   node tools/bot.mjs --mission saints_holy_rollers [--seeds 1,2,3] [--pad] [--stage deliver] [--level 2] [--secs 900] [--verbose | --trace]
//   node tools/bot.mjs --all [--pad] [--seeds 1]  ·  exit 0 when every run passed
import { loadGame } from '../tests/harness.mjs';
import { pad as fakePad } from '../tests/fixtures/pads.mjs';

/** one run: { id, seed, pad, passed, medal, secs (game time), retries, stage, failures, errors }. onStep(t, g) each
 *  step (a probe's: false stops the run) */
export async function botRun({ id, seed = 1, pad = false, stage = null, level = null, secs = 900, verbose = false, query = {}, onStep = null }) {
  const P = pad ? fakePad(0) : null, q = { seed: String(seed), bot: pad ? 'pad' : '1', ...query }; if (level) q.level = String(level);
  const g = await loadGame({ hash: '#mission/' + id + (stage ? '/' + stage : ''), query: q, pads: P ? [P] : null });
  const { game, gtm } = g, C = gtm.career, R = C.R, M = gtm.motor;
  const pilot = P ? new M.PadPilot(P, gtm.bindings, gtm.views, game.input) : null, idle = M.makeIntent();
  const fails = []; let t = 0, last = '', lastStage = R.stage ? R.stage.id : null;
  const un = gtm.BUS.on('stageFail', e => fails.push(`${e.stage}: ${e.reason}`), 'global');
  const step = pilot ? 1 / 120 : .25;
  while (t < secs) {
    game.advance(step); t += step;
    if (pilot) { const p = gtm.crew.ped; pilot.write(C.botI || M.clearIntent(idle), p.seat ? 'vehicle' : 'onFoot', p); }
    if (R.stage) lastStage = R.stage.id;
    if (verbose) { const s = g.snap(), k = [s.career.state, s.career.stage, s.career.objective, s.vehicle].join(' | '), every = Math.floor(t / 10) !== Math.floor((t - step) / 10);
      if (k !== last || (verbose === 'all' && every)) { const A = C.bot && C.bot.auto; console.log(`  ${t.toFixed(1)}s ${k} @ ${s.hero}${A ? ' [' + A.state + (A.brain ? ' ' + (A.brain.cause && (A.brain.cause.kind || A.brain.cause) || '') : '') + '] sp ' + s.speed : ''}`); last = k; } }
    if (R.state === 'idle' && R.result) break;
    if (onStep && onStep(t, g) === false) break;
  }
  un();
  const r = R.result, out = { id, seed, pad, passed: !!(r && r.passed), medal: r && r.medal, secs: Math.round(t), retries: r ? r.retries : null, stage: lastStage, failures: fails, errors: [...R.errors.map(e => String(e.err && e.err.message || e.err)), ...gtm.BUS.errors.map(e => String(e.err && e.err.message || e.err))], presses: pilot ? pilot.presses : 0 };
  game.dispose && game.dispose();
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; }, has = k => process.argv.includes('--' + k);
  const seeds = arg('seeds', '1,2,3').split(',').map(Number), pad = has('pad'), secs = +arg('secs', 900), verbose = has('trace') ? 'all' : has('verbose');
  let jobs = [];
  if (has('all')) {
    const { gtm } = await loadGame({ hash: '#title' });
    for (const m of gtm.motor.all('missions')) jobs.push({ id: m.id });
    for (const a of gtm.motor.all('activities')) if (a.kind !== 'event') for (let l = 1; l <= (a.levels || 1); l++) jobs.push({ id: a.id, level: l });
  } else jobs.push({ id: arg('mission'), stage: arg('stage', null), level: arg('level', null) ? +arg('level') : null });
  let bad = 0;
  for (const j of jobs) for (const seed of seeds) {
    const t0 = Date.now(), r = await botRun({ ...j, seed, pad, secs, verbose });
    const ok = r.passed && !r.errors.length; if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${j.id}${j.level ? ' L' + j.level : ''}${j.stage ? '/' + j.stage : ''} seed ${seed}${pad ? ' (pad)' : ''}: ${r.passed ? 'passed ' + (r.medal || '') : 'not passed (at ' + r.stage + ')'} in ${r.secs} s of game, ${r.retries ?? '-'} retries${r.failures.length ? '; fails: ' + r.failures.join(', ') : ''}${r.errors.length ? '; ERRORS: ' + r.errors.join(' | ') : ''} [${((Date.now() - t0) / 1000).toFixed(0)} s]`);
  }
  console.log(bad ? `\n${bad} run(s) failed` : `\nall ${jobs.length * seeds.length} run(s) passed`);
  process.exit(bad ? 1 : 0);
}
