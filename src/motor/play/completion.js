// Completion (PLAN.md 8.16): one checklist that sums to 100%. A game registers its categories (def('completion')) with
// their weight in tenths of a percent (the weights sum to 1000: exactly 100%), and each counts what is done of its own
// kind from the save:
//   'missions' (all('missions'), save.missions.done), 'jobs' (activities of kind 'job' passed at their top level),
//   'races' and 'mayhem' (activities of those kinds passed), 'stunts' (all('stunts'), save.stunts), 'tokens' (the
//   collectible sets' spots, save.collectibles), 'properties' (all('properties'), save.properties).
// Its share of a category is the weight times done/of, so a save with everything done reads exactly 100.
//   completion(save) -> { pct, tenths, items: [{ id, label, kind, done, of, weight }] }
import { declare, all } from '../core/registry.js';
import { shape } from '../core/schema.js';

export const COMPLETION_KINDS = ['missions', 'jobs', 'races', 'mayhem', 'stunts', 'tokens', 'properties'];
declare('completion', shape({ label: { type: 'string', req: true }, kind: { type: 'string', req: true, oneOf: COMPLETION_KINDS }, weight: { type: 'number', req: true, min: 0, max: 1000 }, order: { type: 'number', def: 0 } }));

/** how much of a kind is done: [done, of] */
export function countOf(kind, save) {
  const acts = k => all('activities').filter(a => a.kind === k), A = save.activities || {};
  switch (kind) {
    case 'missions': { const ids = all('missions').map(m => m.id); return [ids.filter(id => save.missions.done.includes(id)).length, ids.length]; }
    case 'jobs': { const l = acts('job'); return [l.filter(a => (A[a.id] || 0) >= (a.levels || 1)).length, l.length]; }
    case 'races': case 'mayhem': { const l = acts(kind === 'races' ? 'race' : 'mayhem'); return [l.filter(a => (A[a.id] || 0) >= 1).length, l.length]; }
    case 'stunts': { const ids = all('stunts').map(s => s.id); return [ids.filter(id => save.stunts.includes(id)).length, ids.length]; }
    case 'tokens': { const ids = all('collectibles').flatMap(c => c.spots.map(s => s.id)); return [ids.filter(id => save.collectibles.includes(id)).length, ids.length]; }
    case 'properties': { const ids = all('properties').map(p => p.id); return [ids.filter(id => save.properties.some(q => q.id === id)).length, ids.length]; }
    default: return [0, 0];
  }
}
/** the checklist: each category's count and its share; pct to a tenth of a percent */
export function completion(save) {
  const cats = all('completion').slice().sort((a, b) => a.order - b.order);
  let tenths = 0; const items = [];
  for (const c of cats) { const [done, of] = countOf(c.kind, save); items.push({ id: c.id, label: c.label, kind: c.kind, done, of, weight: c.weight }); tenths += of ? c.weight * done / of : 0; }
  return { tenths, pct: Math.round(tenths) / 10, items, weights: cats.reduce((a, c) => a + c.weight, 0) };
}
