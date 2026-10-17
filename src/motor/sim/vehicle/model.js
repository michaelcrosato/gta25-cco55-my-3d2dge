// Vehicle models (PLAN.md 8.8): what a vehicle looks like and where its people go, as data. def('vehicleModels', id,
// spec) from the game's content; def('vehicles', id, { model: id, kit, ... }) then gives a model its paint, handling and
// role, so one model carries several definitions (variants: the Retiree is a Cortez with the wagon kit). Frozen in M4
// (ARCHITECTURE.md).
//   parts: box parts in the model's own frame (x forward, y right, z up; units), each { box: [x0, y0, z0, x1, y1, z1],
//          color, role }: role 'body' takes the vehicle's paint; 'cabin', 'glass', 'wheel', 'light' (head, lit at
//          night), 'tail' (brake), 'siren' (alternating), 'bumper', 'trim', 'rotor' (a heli's, spun when drawn).
//          The builders below make the usual shapes from sizes (carParts, vanParts, truckParts, bikeParts, boatParts,
//          heliParts, trainParts); a model may also list its parts by hand.
//   wheels: [{ x, y, r, steer }] (front wheels steer visibly); seats: [{ x, y }] driver first; doors: [{ id, x, y,
//          side (-1 left, 1 right, 0 the back), seat }] where a body stands to get in; lights: { head: [[x, y, z]],
//          tail, siren } (where the lights shine from); hook: [x, y] (a tow truck's), hitch: [x, y] (where a towed car is
//          held: its front bumper by default), nozzle: [x, y, z] (where a water cannon's jet leaves).
//   kits: { name: { parts, lights, hook, hitch, about } }: extra parts (and lights) a definition switches on with
//          kit: 'name' (the Medic's stripe and light bar on the Hauler, the Drill Rig's flatbed on the Hookline).
import { declare, get } from '../../core/registry.js';
import { shape } from '../../core/schema.js';

export const CLASSES = ['car', 'truck', 'tow', 'bike', 'boat', 'heli', 'rail'];
/** the part roles the renderer knows */
export const ROLES = ['body', 'cabin', 'glass', 'wheel', 'light', 'tail', 'siren', 'bumper', 'trim', 'rotor'];
declare('vehicleModels', shape({
  name: { type: 'string', req: true }, class: { type: 'string', req: true, oneOf: CLASSES },
  length: { type: 'number', req: true, min: 8 }, width: { type: 'number', req: true, min: 4 }, height: { type: 'number', req: true, min: 4 },
  parts: { type: 'array', req: true }, wheels: { type: 'array', def: [] }, seats: { type: 'array', def: [] }, doors: { type: 'array', def: [] },
  lights: { type: 'object', def: { head: [], tail: [], siren: [] } }, hook: { type: 'array', def: null }, hitch: { type: 'array', def: null },
  nozzle: { type: 'array', def: null }, kits: { type: 'object', def: {} }, about: { type: 'string', def: '' },
}));
/** a model by id (throws on an unknown one: content asks for real models) */
export function vehicleModel(id) { const m = get('vehicleModels', id); if (!m) throw new Error('MOTOR: unknown vehicle model "' + id + '"'); return m; }
const resolved = new Map();
/** a model with a kit's parts and lights folded in: { ...model, parts, lights, hook, hitch } (one object per pair, kept) */
export function modelWithKit(id, kit = '') {
  const key = id + '|' + kit; let r = resolved.get(key); if (r) return r;
  const m = vehicleModel(id), k = kit ? m.kits[kit] : null;
  if (kit && !k) throw new Error('MOTOR: vehicle model "' + id + '" has no kit "' + kit + '": ' + Object.keys(m.kits).join(', '));
  const L = m.lights || {}, KL = (k && k.lights) || {};
  r = { ...m, kit, parts: k ? [...m.parts, ...(k.parts || [])] : m.parts,
    lights: { head: KL.head || L.head || [], tail: KL.tail || L.tail || [], siren: [...(L.siren || []), ...(KL.siren || [])] },
    hook: (k && k.hook) || m.hook, hitch: (k && k.hitch) || m.hitch || [m.length / 2, 0] };
  resolved.set(key, r); return r;
}
/** the problems with a model's data (for content tests): unknown roles, inverted boxes, seats outside the body */
export function checkModel(m) {
  const out = [], L = m.length / 2 + 1, W = m.width / 2 + 1;
  const all = [...m.parts, ...Object.values(m.kits || {}).flatMap(k => k.parts || [])];
  for (const p of all) {
    if (!ROLES.includes(p.role)) out.push('unknown role ' + p.role);
    if (!Array.isArray(p.box) || p.box.length !== 6 || p.box.some(v => typeof v !== 'number' || !isFinite(v))) { out.push('bad box ' + JSON.stringify(p.box)); continue; }
    const [x0, y0, z0, x1, y1, z1] = p.box; if (x1 < x0 || y1 < y0 || z1 < z0) out.push('inverted box ' + JSON.stringify(p.box));
    if (typeof p.color !== 'string') out.push('a part with no colour');
  }
  if (!all.some(p => p.role === 'body')) out.push('no body part (nothing takes the paint)');
  for (const s of m.seats) if (Math.abs(s.x) > L || Math.abs(s.y) > W) out.push('a seat outside the body ' + JSON.stringify(s));
  for (const d of m.doors) if (!(d.seat >= 0 && d.seat < Math.max(1, m.seats.length))) out.push('door ' + d.id + ' names no seat');
  if (m.class !== 'heli' && m.class !== 'rail' && m.class !== 'boat' && !m.wheels.length) out.push('no wheels');
  return out;
}

const P = (box, color, role = 'body') => ({ box, color, role });
const WHEEL = '#1a1a20', GLASS = '#3a4a5a', HEAD = '#fff4c8', TAIL = '#8a1a1a', DARK = '#2a2a30';
function wheels(L, W, r, fronts = [L * .62], rears = [-L * .62]) {
  const parts = [], list = [];
  for (const [fx, steer] of [...fronts.map(f => [f, true]), ...rears.map(f => [f, false])]) for (const sy of [-1, 1]) {
    parts.push(P([fx - r, sy < 0 ? -W - .5 : W - 3.5, 0, fx + r, sy < 0 ? -W + 3.5 : W + .5, r * 1.6], WHEEL, 'wheel'));
    list.push({ x: fx, y: sy * (W - 1.5), r, steer });
  }
  return { parts, list };
}
const lamps = (L, W, z, front = true) => (front ? [[L - 1, -W + 4, z], [L - 1, W - 4, z]] : [[-L + 1, -W + 4, z], [-L + 1, W - 4, z]]);
const doors4 = (L, W, cx) => [{ id: 'fl', x: cx + L * .12, y: -W - 6, side: -1, seat: 0 }, { id: 'fr', x: cx + L * .12, y: W + 6, side: 1, seat: 1 }, { id: 'rl', x: cx - L * .22, y: -W - 6, side: -1, seat: 2 }, { id: 'rr', x: cx - L * .22, y: W + 6, side: 1, seat: 3 }];

/** a car: a body, a cabin with glass, four wheels, head and tail lights; o.style 'sedan' | 'wagon' | 'coupe' |
 *  'muscle' | 'police' (a light bar) */
export function carParts(o = {}) {
  const { length = 58, width = 26, height = 22, cabin = .45, cabinAt = -.08, roof = DARK, wheel = 6, style = 'sedan', trim = '#c8c8d0' } = o;   // (roof: a colour of its own; by default the paint)
  const L = length / 2, W = width / 2, body = height * .55, cl = length * cabin, cx = length * cabinAt;
  const parts = [P([-L, -W, wheel * .5, L, W, body], o.color || '#c8423a'), P([cx - cl / 2, -W + 2, body, cx + cl / 2, W - 2, height - 2], GLASS, 'glass'),
    { ...P([cx - cl / 2 + 4, -W + 2.5, height - 2, cx + cl / 2 - 5.5, W - 2.5, height], roof, 'cabin'), paint: o.roof === undefined },   // (the roof in the paint unless given a colour; the glass shows ahead and behind it from above)
    ...lamps(L, W, body - 3.5).map(([x, y]) => P([x, y - 2, body - 5, x + 1.5, y + 2, body - 2], HEAD, 'light')),
    ...lamps(L, W, body - 3.5, false).map(([x, y]) => P([x - 1.5, y - 2, body - 5, x, y + 2, body - 2], TAIL, 'tail')),
    P([L - .5, -W + 1, wheel * .4, L + 1, W - 1, wheel * 1.2], trim, 'bumper'), P([-L - 1, -W + 1, wheel * .4, -L + .5, W - 1, wheel * 1.2], trim, 'bumper')];
  if (style === 'muscle') parts.push(P([L * .25, -3, body, L * .6, 3, body + 2.2], DARK, 'trim'));
  if (style === 'coupe') parts.push(P([-L, -W + 1, body, -L + 3, W - 1, body + 2.5], DARK, 'trim'));   // a spoiler
  if (style === 'police' || o.bar) for (const sy of [-1, 1]) parts.push(P([cx - 3, sy < 0 ? -W + 4 : 0, height + .5, cx + 3, sy < 0 ? 0 : W - 4, height + 3], sy < 0 ? '#c82a2a' : '#2a5ac8', 'siren'));
  const w = wheels(L, W, wheel); parts.push(...w.parts);
  return { parts, wheels: w.list, seats: [{ x: cx + 4, y: -5 }, { x: cx + 4, y: 5 }, { x: cx - 8, y: -5 }, { x: cx - 8, y: 5 }], doors: doors4(length, W, cx),
    lights: { head: lamps(L, W, body - 3.5), tail: lamps(L, W, body - 3.5, false), siren: style === 'police' || o.bar ? [[cx, 0, height + 2]] : [] } };
}
/** a van or a box truck: a cab at the front, a tall box behind; o.box (the box's colour), o.bar (a light bar), o.stripe */
export function vanParts(o = {}) {
  const { length = 72, width = 30, height = 34, cab = .3, wheel = 7, box = null, stripe = null, bar = false, armor = false } = o;
  const L = length / 2, W = width / 2, cabL = length * cab, low = height * .45, paint = o.color || '#e0e0e4';
  const parts = [P([L - cabL, -W, wheel * .5, L, W, low], paint), P([L - cabL + 2, -W + 2, low, L - 1, W - 2, height * .78], GLASS, 'glass'),
    { ...P([L - cabL, -W + 1.5, height * .78, L - 1, W - 1.5, height * .82], paint, 'cabin'), paint: true },
    P([-L, -W, wheel * .5, L - cabL - 1, W, height], box || paint, box ? 'trim' : 'body'),
    ...lamps(L, W, low - 4).map(([x, y]) => P([x, y - 2.5, low - 6, x + 1.5, y + 2.5, low - 2.5], HEAD, 'light')),
    ...lamps(L, W, low - 4, false).map(([x, y]) => P([x - 1.5, y - 2, low - 6, x, y + 2, low - 2], TAIL, 'tail')),
    P([L - .5, -W + 1, wheel * .4, L + 1.5, W - 1, wheel * 1.3], armor ? DARK : '#9a9aa2', 'bumper')];
  if (stripe) for (const sy of [-1, 1]) parts.push(P([-L + 2, sy < 0 ? -W - .3 : W - .2, height * .45, L - cabL - 3, sy < 0 ? -W + .2 : W + .3, height * .6], stripe, 'trim'));
  if (armor) parts.push(P([-L + 2, -W - .4, height * .2, L - cabL - 3, W + .4, height * .3], '#5a5a62', 'trim'));
  if (bar) for (const sy of [-1, 1]) parts.push(P([L - cabL + 1, sy < 0 ? -W + 3 : 0, height * .82, L - cabL + 7, sy < 0 ? 0 : W - 3, height * .82 + 3], sy < 0 ? '#c82a2a' : '#2a5ac8', 'siren'));
  const w = wheels(L, W, wheel, [L * .6], [-L * .55]); parts.push(...w.parts);
  return { parts, wheels: w.list, seats: [{ x: L - cabL * .5, y: -5 }, { x: L - cabL * .5, y: 5 }, { x: -L * .4, y: -5 }, { x: -L * .4, y: 5 }],
    doors: [{ id: 'fl', x: L - cabL * .5, y: -W - 6, side: -1, seat: 0 }, { id: 'fr', x: L - cabL * .5, y: W + 6, side: 1, seat: 1 }, { id: 'back', x: -L - 6, y: 0, side: 0, seat: 2 }],
    lights: { head: lamps(L, W, low - 4), tail: lamps(L, W, low - 4, false), siren: bar ? [[L - cabL + 4, 0, height * .82 + 2]] : [] } };
}
/** a truck: a cab and what it carries behind. o.kind 'pumper' (a tank and a ladder), 'tow' (a bed and a boom, the
 *  hook at the back), 'flatbed' (a long bare bed) */
export function truckParts(o = {}) {
  const { length = 80, width = 30, height = 32, wheel = 7.5, kind = 'pumper', trim = '#c8c8d0' } = o;
  const L = length / 2, W = width / 2, cabL = length * .3, low = height * .5, paint = o.color || '#c82a2a';
  const parts = [P([L - cabL, -W, wheel * .5, L, W, low], paint), P([L - cabL + 2, -W + 2, low, L - 1, W - 2, height * .85], GLASS, 'glass'),
    { ...P([L - cabL, -W + 1.5, height * .85, L - 1, W - 1.5, height * .9], paint, 'cabin'), paint: true },
    ...lamps(L, W, low - 4).map(([x, y]) => P([x, y - 2.5, low - 6, x + 1.5, y + 2.5, low - 2.5], HEAD, 'light')),
    ...lamps(L, W, low - 4, false).map(([x, y]) => P([x - 1.5, y - 2, wheel * 1.2, x, y + 2, wheel * 1.2 + 3], TAIL, 'tail')),
    P([L - .5, -W + 1, wheel * .4, L + 1.5, W - 1, wheel * 1.3], trim, 'bumper')];
  let hook = null;
  if (kind === 'pumper') parts.push(P([-L, -W, wheel * .5, L - cabL - 1, W, low + 6], paint), P([-L + 4, -W + 3, low + 6, L - cabL - 6, W - 3, low + 9], '#d8d8e0', 'trim'), P([-L + 2, -2, low + 9, L - cabL, 2, low + 11], '#e8c040', 'trim'), P([L - cabL + 2, -W + 3, height * .9, L - cabL + 8, W - 3, height * .9 + 3], '#c82a2a', 'siren'));
  if (kind === 'tow') { parts.push(P([-L, -W, wheel * .5, L - cabL - 1, W, wheel * 1.4], DARK, 'trim'), P([-L + 4, -2, wheel * 1.4, -L + 10, 2, height * .9], '#e8a030', 'trim'), P([-L - 2, -1.5, height * .7, -L + 6, 1.5, height * .9], '#e8a030', 'trim'), P([L - cabL + 2, -5, height * .9, L - cabL + 7, 5, height * .9 + 2.5], '#ffa030', 'siren')); hook = [-L - 4, 0]; }
  if (kind === 'flatbed') parts.push(P([-L, -W, wheel * 1.2, L - cabL - 1, W, wheel * 1.9], '#7a7a82', 'trim'));
  const w = wheels(L, W, wheel, [L * .62], [-L * .45, -L * .72]); parts.push(...w.parts);
  return { parts, wheels: w.list, hook: hook || undefined, seats: [{ x: L - cabL * .5, y: -5 }, { x: L - cabL * .5, y: 5 }],
    doors: [{ id: 'fl', x: L - cabL * .5, y: -W - 6, side: -1, seat: 0 }, { id: 'fr', x: L - cabL * .5, y: W + 6, side: 1, seat: 1 }],
    lights: { head: lamps(L, W, low - 4), tail: lamps(L, W, wheel * 1.2 + 1.5, false), siren: kind !== 'flatbed' ? [[L - cabL + 4, 0, height * .9 + 2]] : [] } };
}
/** a motorbike: two wheels, the frame, a tank and a seat (the rider sits astride it); o.style 'moped' | 'sport' */
export function bikeParts(o = {}) {
  const { length = 30, height = 14, wheel = 5, style = 'sport' } = o, L = length / 2, paint = o.color || '#c82a2a';
  const parts = [P([L - wheel * 2, -1.2, 0, L, 1.2, wheel * 2], WHEEL, 'wheel'), P([-L, -1.2, 0, -L + wheel * 2, 1.2, wheel * 2], WHEEL, 'wheel'),
    P([-L * .5, -2.5, wheel * 1.2, L * .55, 2.5, height * .7], paint), P([-L * .45, -3, height * .7, L * .05, 3, height * .82], DARK, 'cabin'),
    P([L * .5, -1, height * .6, L * .65, 1, height], '#9a9aa2', 'trim'), P([L * .55, -5, height * .95, L * .65, 5, height * 1.05], '#9a9aa2', 'trim'),
    P([L - 1.5, -1.5, height * .55, L, 1.5, height * .7], HEAD, 'light'), P([-L, -1.2, height * .55, -L + 1.2, 1.2, height * .68], TAIL, 'tail')];
  if (style === 'sport') parts.push(P([L * .1, -3.5, height * .6, L * .55, 3.5, height * .95], paint, 'body'));
  if (style === 'moped') parts.push(P([-L * .7, -2.5, height * .45, -L * .2, 2.5, height * .62], '#3a3a40', 'trim'));
  return { parts, wheels: [{ x: L - wheel, y: 0, r: wheel, steer: true }, { x: -L + wheel, y: 0, r: wheel, steer: false }],
    seats: [{ x: -L * .2, y: 0 }], doors: [{ id: 'l', x: -L * .1, y: -8, side: -1, seat: 0 }, { id: 'r', x: -L * .1, y: 8, side: 1, seat: 0 }],
    lights: { head: [[L, 0, height * .62]], tail: [[-L, 0, height * .62]], siren: [] } };
}
/** a speedboat: a pointed hull, a windscreen, an outboard motor */
export function boatParts(o = {}) {
  const { length = 56, width = 22, height = 12 } = o, L = length / 2, W = width / 2, paint = o.color || '#e8e8ec';
  const parts = [P([-L, -W, -2, L * .4, W, height * .6], paint), P([L * .4, -W * .7, -1, L * .75, W * .7, height * .6], paint), P([L * .75, -W * .3, 0, L, W * .3, height * .55], paint),
    P([-L, -W - .3, height * .1, L * .6, W + .3, height * .25], '#c82a2a', 'trim'), P([L * .05, -W * .7, height * .6, L * .2, W * .7, height * 1.25], GLASS, 'glass'),
    P([-L * .6, -W * .6, height * .6, L * .05, W * .6, height * .75], '#8a6a4a', 'cabin'), P([-L - 4, -2.5, 0, -L, 2.5, height * 1.1], DARK, 'trim'),
    P([L * .9, -1, height * .5, L, 1, height * .62], HEAD, 'light')];
  return { parts, wheels: [], seats: [{ x: -L * .1, y: -4 }, { x: -L * .1, y: 4 }], doors: [{ id: 'l', x: 0, y: -W - 6, side: -1, seat: 0 }, { id: 'r', x: 0, y: W + 6, side: 1, seat: 1 }],
    lights: { head: [[L, 0, height * .56]], tail: [[-L, 0, height * .5]], siren: [] } };
}
/** a helicopter: the body, the tail boom, skids and the rotor (spun by the renderer) */
export function heliParts(o = {}) {
  const { length = 60, width = 16, height = 18 } = o, L = length / 2, W = width / 2, paint = o.color || '#2a3a6a';
  const parts = [P([-L * .2, -W, 4, L * .55, W, height * .8], paint), P([L * .25, -W + 1.5, height * .4, L * .6, W - 1.5, height * .78], GLASS, 'glass'),
    P([-L, -1.5, height * .45, -L * .2, 1.5, height * .65], paint), P([-L - 1, -.6, height * .45, -L + 3, .6, height * 1.05], paint, 'trim'),
    P([-L * .25, -W - 1, 0, L * .5, -W + .5, 1.5], DARK, 'trim'), P([-L * .25, W - .5, 0, L * .5, W + 1, 1.5], DARK, 'trim'),
    P([-1.5, -1.5, height * .8, 1.5, 1.5, height], DARK, 'cabin'), P([-L * .9, -L * .9 * .04, height + .5, L * .9, L * .9 * .04, height + 1.2], '#3a3a44', 'rotor'),
    P([L * .5, -2, 4, L * .58, 2, 7], '#fff4c8', 'light'), P([-L * .2, -1, height * .8, -L * .1, 1, height * .84], '#ff3a2a', 'tail')];
  return { parts, wheels: [], seats: [{ x: L * .35, y: -4 }, { x: L * .35, y: 4 }], doors: [], lights: { head: [[L * .55, 0, 5]], tail: [], siren: [[0, 0, height]] } };
}
/** a car of the L: a long box with a row of windows and its bogies */
export function trainParts(o = {}) {
  const { length = 96, width = 24, height = 30 } = o, L = length / 2, W = width / 2, paint = o.color || '#9aa2aa';
  const parts = [P([-L, -W, 4, L, W, height], paint), P([-L + 4, -W - .3, height * .45, L - 4, W + .3, height * .75], '#ffe8a0', 'glass'), P([-L + 2, -W + 1, height, L - 2, W - 1, height + 1.5], '#6a7078', 'cabin'),
    P([L - 3, -W + 3, height * .3, L + .5, W - 3, height * .6], HEAD, 'light'), P([-L - .5, -W + 3, height * .3, -L + 3, W - 3, height * .6], TAIL, 'tail'),
    P([L * .55, -W + 2, 0, L * .85, W - 2, 4], DARK, 'wheel'), P([-L * .85, -W + 2, 0, -L * .55, W - 2, 4], DARK, 'wheel')];
  return { parts, wheels: [], seats: [], doors: [], lights: { head: [[L, 0, height * .45]], tail: [[-L, 0, height * .45]], siren: [] } };
}
