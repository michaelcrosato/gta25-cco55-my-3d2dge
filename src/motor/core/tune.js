// TUNE: every gameplay number is a knob (PLAN.md 7.4). knob(section, id, label, def, min, max, step, about) declares one
// and returns its value; TUNE[id] is the current value (read it where it is used, every time, so tuning is live);
// tuneSet clamps and applies; overrides persist apart from the save. docs/TUNING.md is generated from the list.
import { E } from '../engine.js';

const KNOBS = new Map();
/** the live values: TUNE.carTop */
export const TUNE = {};
const KEY = 'GrandTheftMoto-5S:tune';

/** declare a knob; returns its current value */
export function knob(section, id, label, def, min, max, step = 0, about = '') {
  if (KNOBS.has(id)) E.warn('motor:tune:' + id, `MOTOR: knob "${id}" declared twice`);
  KNOBS.set(id, { section, id, label, def, min, max, step, about });
  if (!(id in TUNE)) TUNE[id] = def;
  return TUNE[id];
}
/** set a knob (clamped and stepped); returns the value applied */
export function tuneSet(id, v) {
  const k = KNOBS.get(id); if (!k) { E.warn('motor:tune:unknown:' + id, `MOTOR: no knob "${id}"`); return undefined; }
  if (typeof k.def === 'number') { v = E.clamp(+v, k.min, k.max); if (k.step) v = Math.round(v / k.step) * k.step; }
  return (TUNE[id] = v);
}
/** every knob, or a section's */
export const knobs = section => [...KNOBS.values()].filter(k => !section || k.section === section);
/** the knobs' sections, in declaration order */
export const sections = () => [...new Set([...KNOBS.values()].map(k => k.section))];
/** put every knob back to its default */
export function tuneReset() { for (const k of KNOBS.values()) TUNE[k.id] = k.def; }
/** load saved overrides (the browser only; headless runs keep the defaults) */
export function tuneLoad() { const o = E.store.get(KEY, {}) || {}; for (const [id, v] of Object.entries(o)) if (KNOBS.has(id)) tuneSet(id, v); }
/** save the knobs that differ from their defaults */
export function tuneSave() { const o = {}; for (const k of KNOBS.values()) if (TUNE[k.id] !== k.def) o[k.id] = TUNE[k.id]; E.store.set(KEY, o); return o; }
/** docs/TUNING.md: one table per section */
export function tuningMarkdown() {
  let md = '# Tuning\n\nEvery gameplay number is a knob in `src/game/tune.js`, live in the dev menu (`?dev=1`). This file is generated (`node tools/tuning-doc.mjs`).\n';
  for (const s of sections()) {
    md += `\n## ${s}\n\n| Knob | Default | Range | What it does |\n|---|---|---|---|\n`;
    for (const k of knobs(s)) md += `| \`${k.id}\` ${k.label} | ${k.def} | ${k.min}..${k.max} | ${k.about} |\n`;
  }
  return md;
}
