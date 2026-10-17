// The staged mission DSL (PLAN.md 8.15), frozen in M1: a mission is an ordered list of stages, each a setup that
// restores the world state it needs and a run generator that plays it. Retrying, and every deep link
// (#mission/<id>/<stage>), restart a stage from its setup, so a setup run twice must leave the same state. The runtime
// that plays them (the m API: objective, marker, waitUntil, spawn, deliver, chase, failIf, reward...) arrives in M8;
// this file fixes the shape content is written in, and checks it as content registers.
//   Every objective names a bot hint, data the AutoPlayer can act on, so any mission can be played by the bot (the
//   missions' pass test, and the attract mode's moves).
import { declare, def, get } from '../core/registry.js';
import { shape } from '../core/schema.js';

/** the bot hints an objective can carry, and the fields each needs ([x, y] points; tags name mission actors) */
export const HINTS = {
  goto: ['at'],                // at: [x, y] (or route: [[x, y], ...]); radius
  enterVehicle: ['vehicle'],   // vehicle: a tag
  kill: ['targets'],           // targets: a tag
  deliver: ['what', 'to'],     // what: a tag; to: [x, y]
  evade: [],                   // lose the wanted level
  follow: ['target'],          // target: a tag; dist
  race: ['line'],              // line: [[x, y], ...] checkpoints
  photo: ['target'],           // target: a tag; from: [x, y]
  stealth: ['path'],           // path: [[x, y], ...] waypoints; cover: [[x, y], ...]
};
/** the problems with a hint ({ kind, ...data }), as strings */
export function checkHint(h) {
  if (!h || typeof h !== 'object') return ['a hint is { kind, ...data }'];
  if (!HINTS[h.kind]) return [`unknown hint kind "${h.kind}" (${Object.keys(HINTS).join(', ')})`];
  return HINTS[h.kind].filter(f => h[f] === undefined && !(h.kind === 'goto' && h.route)).map(f => `hint "${h.kind}" needs "${f}"`);
}
const isGen = f => typeof f === 'function' && f.constructor && f.constructor.name === 'GeneratorFunction';
/** the problems with a stage list */
function checkStages(stages) {
  const out = [], ids = new Set();
  if (!Array.isArray(stages) || !stages.length) return ['needs stages: [{ id, setup(m), *run(m) }, ...]'];
  stages.forEach((s, i) => {
    if (!s || typeof s.id !== 'string') { out.push(`stage ${i} needs an id`); return; }
    if (ids.has(s.id)) out.push(`stage "${s.id}" twice`); ids.add(s.id);
    if (typeof s.setup !== 'function') out.push(`stage "${s.id}" needs setup(m)`);
    if (!isGen(s.run)) out.push(`stage "${s.id}" needs a generator *run(m)`);
    for (const h of s.hints || []) for (const p of checkHint(h)) out.push(`stage "${s.id}": ${p}`);
  });
  return out;
}
const missionShape = shape({
  title: { type: 'string', req: true },
  giver: { type: 'object', def: {} },          // { phone: gang | character } or { at: poi }
  gang: { type: 'string', def: '' },
  tier: { type: 'number', def: 1, min: 1, max: 5 },
  requires: { type: 'array', def: [] },        // mission ids passed first
  brief: { type: 'array', def: [] },           // lines shown on the job card
  rewards: { type: 'object', def: {} },        // { cash, respect: { gang: delta } }
  bonus: { type: 'array', def: [] },           // [{ id, text, check(m) }]: the medal's extra objectives
  stages: { type: 'array', req: true },
});
declare('missions', (spec, id) => [...missionShape(spec, id), ...checkStages(spec.stages)]);
const activityShape = shape({ title: { type: 'string', req: true }, start: { type: 'object', def: {} }, levels: { type: 'number', def: 1, min: 1 }, stages: { type: 'array', req: true } });
declare('activities', (spec, id) => [...activityShape(spec, id), ...checkStages(spec.stages)]);

/** register a mission: defMission(id, { title, giver, gang, tier, requires, brief, rewards, bonus, stages }) */
export const defMission = (id, spec) => def('missions', id, spec);
/** register a repeatable activity in the same staged form: defActivity(id, { title, start, levels, stages }) */
export const defActivity = (id, spec) => def('activities', id, spec);
/** a stage of a mission by ids, or null */
export const missionStage = (id, stage) => { const m = get('missions', id); return (m && m.stages.find(s => s.id === stage)) || null; };
