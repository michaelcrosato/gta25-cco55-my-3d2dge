// A probe: S1 on a seed, each second in a window: the bot's state, its car, the brain's cause, the stars
import { botRun } from './bot.mjs';
const seed = +(process.argv[2] || 1), t0 = +(process.argv[3] || 330), t1 = +(process.argv[4] || 430); let last = -1;
await botRun({ id: 'saints_holy_rollers', seed, secs: t1 + 5, onStep: (t, g) => {
  if (t < t0 || Math.floor(t) === last) return true; last = Math.floor(t);
  const { gtm } = g, p = gtm.crew.ped, C = gtm.career, B = C.bot, A = B.auto, v = p.seat && p.seat.vehicle, w = gtm.life.wanted;
  const brute = C.R.actors && C.R.actors.tagged(process.argv[5] || 'brute')[0];
  console.log(`${t.toFixed(0)} ${C.R.stage && C.R.stage.id} ${C.R.state} ${v ? v.def.id + (v === brute ? '*' : '') + ' sp ' + Math.round(v.speed) : 'foot'} @ ${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.z)} | auto ${A.state} ${A.brain ? (A.brain.cause && (A.brain.cause.kind || A.brain.cause)) || '' : ''} esc ${!!A.esc} car ${A.car ? A.car.def.id : '-'} tried ${A.tried.size} | stars ${w.stars} hint ${C.R.objective && C.R.objective.hint ? C.R.objective.hint.kind : '-'} | brute ${brute ? Math.round(brute.damage.share * 100) + '% ' + Math.round(Math.hypot(brute.x - p.x, brute.y - p.y)) + 'u' : '-'}`);
  return true;
} });
