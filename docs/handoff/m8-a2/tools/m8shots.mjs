// A probe: M8's evidence shots (docs/media/m8/): the JOB card at a payphone, a running stage with its marker and GPS
// line, JOB BLOWN, JOB DONE, Lead Farm's shop card, the phone, the cab list, the delivery on its way.
import { shot } from './shots.mjs';
const out = 'docs/media/m8/';
const S = [
  { name: 'job-card', at: '#play/safehouse', query: 'time=day&weather=clear', wait: 2500,
    evaluate: `(() => { const g = window.__gtm, C = g.career; C.save.missions.done.push('prologue'); const q = g.city.poi('phone-saints'); g.teleport(q.x, q.y); })()` },
  { name: 'stage-marker', at: '#mission/saints_holy_rollers/zephyr', query: 'time=day&weather=clear', wait: 6000 },
  { name: 'deliver', at: '#mission/saints_holy_rollers/zephyr', query: 'time=dusk&weather=clear&bot=1', wait: 26000 },
  { name: 'job-blown', at: '#mission/saints_holy_rollers/zephyr', query: 'time=day&weather=clear', wait: 2500,
    evaluate: `(() => { setTimeout(() => window.__gtm.career.R.fail('the car is a wreck: no blessing'), 1500); })()` },
  { name: 'job-done', at: '#mission/saints_holy_rollers/brute', query: 'time=night&weather=clear', wait: 2500,
    evaluate: `(() => { setTimeout(() => window.__gtm.career.R.pass(), 1500); })()` },
  { name: 'shop-card', at: '#play/safehouse', query: 'time=day&weather=clear', wait: 2500,
    evaluate: `(() => { const g = window.__gtm, C = g.career, q = g.city.poi('lead-farm'); g.teleport(q.x, q.y + 6); setTimeout(() => { C._shopCard(g.motor.get('shops', 'lead-farm'), { ped: g.crew.ped }); }, 800); })()` },
  { name: 'phone', at: '#play/safehouse', query: 'time=night&weather=rain', wait: 2500,
    evaluate: `(() => { setTimeout(() => window.__gtm.career.phone(), 1200); })()` },
  { name: 'cabs', at: '#play/safehouse', query: 'time=day&weather=clear', wait: 2500,
    evaluate: `(() => { setTimeout(() => { const C = window.__gtm.career; C.phone(); C._cabs(); }, 1200); })()` },
];
const only = process.argv[2] ? process.argv[2].split(',') : null;
for (const s of S.filter(q => !only || only.includes(q.name))) {
  const r = await shot({ ...s, out: out + s.name + '.png' });
  console.log(s.name, r.errors.length ? 'ERRORS ' + r.errors.join(' | ') : 'ok', JSON.stringify(r.snapshot.career || {}).slice(0, 160));
}
