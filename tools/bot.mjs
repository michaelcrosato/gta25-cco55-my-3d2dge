// The mission bot's runs (PLAN.md 8.15, 14): every mission (and activity, at each of its levels) played headless from
// its deep link by the MissionBot, on seeds 1-3, passed or not. --pad plays the same through a gamepad (the scripted
// human-style pass): the bot's wishes pressed on a pad by the PadPilot each step, the game reading the pad.
//   node tools/bot.mjs --mission saints_holy_rollers [--seeds 1,2,3] [--pad] [--stage deliver] [--level 2] [--secs 1800] [--verbose | --trace]
//   node tools/bot.mjs --all [--pad] [--seeds 1] [--par 3] [--god]  ·  exit 0 when every run passed (--par: that many
//   runs at once, each in a process of its own; --god: the crew and their rides take no harm and their guns never run
//   dry, D29)
import { spawn } from 'node:child_process';
import { loadGame } from '../tests/harness.mjs';
import { pad as fakePad } from '../tests/fixtures/pads.mjs';

/** one run: { id, seed, pad, passed, medal, secs (game time), retries, stage, failures, errors }. onStep(t, g) each
 *  step (a probe's: false stops the run); extra: content files bundled in (a recipe test's fixtures, harness.mjs) */
export async function botRun({ id, seed = 1, pad = false, stage = null, level = null, secs = 1800, verbose = false, query = {}, onStep = null, extra = [] }) {
  const P = pad ? fakePad(0) : null, q = { seed: String(seed), bot: pad ? 'pad' : '1', ...query }; if (level) q.level = String(level);
  const g = await loadGame({ hash: '#mission/' + id + (stage ? '/' + stage : ''), query: q, pads: P ? [P] : null, extra });
  const { game, gtm } = g, C = gtm.career, R = C.R, M = gtm.motor;
  if (C.saves) C.saves.backend = M.memoryBackend();   // (no localStorage headless: a save in memory, written as a player's is)
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
  const seeds = arg('seeds', '1,2,3').split(',').map(Number), pad = has('pad'), secs = +arg('secs', 1800), verbose = has('trace') ? 'all' : has('verbose'), god = has('god');
  let jobs = [];
  if (has('all')) {
    const { gtm } = await loadGame({ hash: '#title' });
    for (const m of gtm.motor.all('missions')) jobs.push({ id: m.id });
    for (const a of gtm.motor.all('activities')) for (let l = 1; l <= (a.levels || 1); l++) jobs.push({ id: a.id, level: l });   // (the random events too: each plays from its deep link)
  } else jobs.push({ id: arg('mission'), stage: arg('stage', null), level: arg('level', null) ? +arg('level') : null });
  let bad = 0;
  const par = +arg('par', 1);
  if (par > 1) {   // (each run a child process: the same command for one run, its line passed on as it ends)
    const runs = jobs.flatMap(j => seeds.map(seed => ({ ...j, seed }))), queue = runs.slice();
    const one = r => new Promise(done => {
      const a = ['tools/bot.mjs', '--mission', r.id, '--seeds', String(r.seed), '--secs', String(secs)];
      if (r.level) a.push('--level', String(r.level)); if (r.stage) a.push('--stage', r.stage); if (pad) a.push('--pad'); if (god) a.push('--god');
      const c = spawn(process.execPath, a, { stdio: ['ignore', 'pipe', 'inherit'] }); let o = '';
      c.stdout.on('data', d => { o += d; }); c.on('close', code => { const line = o.split('\n').find(l => /^(ok|FAIL)/.test(l)); console.log(line || `FAIL ${r.id} seed ${r.seed}: no result (exit ${code})`); if (code !== 0) bad++; done(); });
    });
    await Promise.all(Array.from({ length: Math.min(par, queue.length) }, async () => { while (queue.length) await one(queue.shift()); }));
    console.log(bad ? `\n${bad} run(s) failed` : `\nall ${runs.length} run(s) passed`);
    process.exit(bad ? 1 : 0);
  }
  for (const j of jobs) for (const seed of seeds) {
    const t0 = Date.now(), r = await botRun({ ...j, seed, pad, secs, verbose, query: god ? { god: '1' } : {} });
    const ok = r.passed && !r.errors.length; if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${j.id}${j.level ? ' L' + j.level : ''}${j.stage ? '/' + j.stage : ''} seed ${seed}${pad ? ' (pad)' : ''}: ${r.passed ? 'passed ' + (r.medal || '') : 'not passed (at ' + r.stage + ')'} in ${r.secs} s of game, ${r.retries ?? '-'} retries${r.failures.length ? '; fails: ' + r.failures.join(', ') : ''}${r.errors.length ? '; ERRORS: ' + r.errors.join(' | ') : ''} [${((Date.now() - t0) / 1000).toFixed(0)} s]`);
  }
  console.log(bad ? `\n${bad} run(s) failed` : `\nall ${jobs.length * seeds.length} run(s) passed`);
  process.exit(bad ? 1 : 0);
}
