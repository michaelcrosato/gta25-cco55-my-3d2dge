// Grand Theft Moto's save (PLAN.md 7.8): the schema, a blank game, the field checks and the migrations, over MOTOR's
// SaveStore. Every field is checked and defaulted on load, so a save from any build loads.
import { SaveStore } from '../motor/index.js';

export const GAME_ID = 'GrandTheftMoto-5S', SCHEMA = 1;
export const PROTAGONISTS = ['dex', 'viv', 'gus'];
export const STATS = ['driving', 'shooting', 'stamina', 'stealth', 'strength'];
const GANGS = ['saints', 'rats', 'gnomes'];

const num = (v, d, lo = -Infinity, hi = Infinity) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v, d) => (typeof v === 'string' ? v : d);
const arr = (v, f = x => x) => (Array.isArray(v) ? v.map(f).filter(x => x !== undefined) : []);
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** one protagonist's saved state (pos null: at their own start point) */
export function blankProtagonist() {
  return { pos: null, map: 'lowtown', outfit: 0, weapons: ['fists'], ammo: {}, health: 100, armor: 0, stats: Object.fromEntries(STATS.map(s => [s, 10])), ability: 0 };
}
/** a new game */
export function blankSave() {
  return { schema: SCHEMA, game: GAME_ID, slot: '1', label: 'Lowtown', playtime: 0, gameDay: 0, clock: 23, weather: 'clear', active: 'dex',
    protagonists: Object.fromEntries(PROTAGONISTS.map(p => [p, blankProtagonist()])), crewFund: 250,
    respect: Object.fromEntries(GANGS.map(g => [g, 0])), missions: { done: [], medals: {} }, activities: {}, collectibles: [], stunts: [], properties: [], garage: [],
    completion: 0, rngSeed: 1 };
}
function normProtagonist(p) {
  const b = blankProtagonist(), q = obj(p), pos = Array.isArray(q.pos) && q.pos.length >= 2 && q.pos.every(Number.isFinite) ? q.pos.slice(0, 3) : null;
  const stats = obj(q.stats);
  const weapons = ['fists', ...arr(q.weapons, w => (typeof w === 'string' && w !== 'fists' ? w : undefined))];   // (fists always)
  return { pos, map: str(q.map, b.map), outfit: num(q.outfit, 0, 0, 2) | 0, weapons, ammo: Object.fromEntries(Object.entries(obj(q.ammo)).filter(([, v]) => Number.isFinite(v)).map(([k, v]) => [k, Math.max(0, v | 0)])),
    health: num(q.health, 100, 0, 100), armor: num(q.armor, 0, 0, 100), stats: Object.fromEntries(STATS.map(s => [s, num(stats[s], b.stats[s], 0, 100)])), ability: num(q.ability, 0, 0, 1) };
}
/** check every field and fill what is missing or wrong (PLAN.md 7.8: loading checks every field) */
export function normalizeSave(d) {
  const b = blankSave(), p = obj(d.protagonists), m = obj(d.missions), r = obj(d.respect);
  const out = { ...b, schema: SCHEMA, game: GAME_ID, slot: str(d.slot, b.slot), label: str(d.label, b.label), playtime: num(d.playtime, 0, 0), gameDay: num(d.gameDay, 0, 0) | 0,
    clock: num(d.clock, b.clock, 0, 24), weather: str(d.weather, b.weather), active: PROTAGONISTS.includes(d.active) ? d.active : b.active,
    protagonists: Object.fromEntries(PROTAGONISTS.map(k => [k, normProtagonist(p[k])])), crewFund: num(d.crewFund, b.crewFund, 0) | 0,
    respect: Object.fromEntries(GANGS.map(g => [g, num(r[g], 0, -100, 100)])), missions: { done: arr(m.done, x => (typeof x === 'string' ? x : undefined)), medals: obj(m.medals) },
    activities: obj(d.activities), collectibles: arr(d.collectibles), stunts: arr(d.stunts), properties: arr(d.properties), garage: arr(d.garage, g => (g && typeof g === 'object' ? g : undefined)),
    completion: num(d.completion, 0, 0, 100), rngSeed: num(d.rngSeed, 1) >>> 0, savedAt: num(d.savedAt, 0) };
  return out;
}
/** v0 (the prototype's single hero and money) -> v1 (three protagonists and the crew fund) */
export const MIGRATIONS = {
  0: d => {
    const h = obj(d.hero), out = { ...d, schema: 1, protagonists: { dex: { ...blankProtagonist(), pos: Array.isArray(h.pos) ? h.pos : null, health: h.health ?? 100, weapons: h.weapons || ['fists'] } }, crewFund: d.money ?? 250 };
    delete out.hero; delete out.money; return out;
  },
};
/** the game's save store (o.backend: storage for tests) */
export function makeSaves(o = {}) { return new SaveStore({ game: GAME_ID, schema: SCHEMA, blank: blankSave, normalize: normalizeSave, migrations: MIGRATIONS, ...o }); }
