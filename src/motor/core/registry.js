// Registries: content registers itself with def(kind, id, spec) when its module is imported (the build imports every
// file under src/game, sorted by path), and systems read it back with get / all. A kind is created by its first def or
// by declare(kind, schema). Registering an id twice warns and the last one wins, as in Emberdeep (00-core.js:78-88).
import { E } from '../engine.js';

const REG = new Map(), SCHEMA = new Map();

/** declare a registry kind with an optional schema check: check(spec, id) returns a list of problems (strings) */
export function declare(kind, check = null) { if (!REG.has(kind)) REG.set(kind, new Map()); if (check) SCHEMA.set(kind, check); return REG.get(kind); }

/** register spec under kind/id; returns the spec (with spec.id set) */
export function def(kind, id, spec) {
  const m = declare(kind);
  if (m.has(id)) E.warn('motor:def:' + kind + ':' + id, `MOTOR: ${kind} "${id}" registered twice (the last one wins)`);
  spec.id = id;
  const check = SCHEMA.get(kind), problems = check ? check(spec, id) : [];
  for (const p of problems) E.warn('motor:schema:' + kind + ':' + id + ':' + p, `MOTOR: ${kind} "${id}": ${p}`);
  m.set(id, spec);
  return spec;
}

/** the spec registered as kind/id, or undefined */
export const get = (kind, id) => REG.get(kind)?.get(id);
/** every spec of a kind, in registration order (deterministic: content modules load sorted by path) */
export const all = kind => [...(REG.get(kind)?.values() || [])];
/** the kinds registered so far */
export const kinds = () => [...REG.keys()];
