// The review's helper (not a test): the game headless as tests/harness.mjs boots it, but with a browser's localStorage
// in the vm context (a Map underneath), so the title's, the play scene's and the settings' stores all persist the way
// they do in a page. Two boots sharing one Map are two visits to the same page.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { bundle, prelude, ENGINE, MOCAP } from '../../../tools/build.mjs';

let code = null;
/** a Storage over a Map (getItem, setItem, removeItem, key, length, clear) */
export function storage(map = new Map()) {
  return {
    map,
    getItem: k => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: k => { map.delete(String(k)); },
    key: i => [...map.keys()][i] ?? null,
    get length() { return map.size; },
    clear: () => map.clear(),
  };
}
/** a fresh game over a storage: { E, game, gtm, snap(), store } */
export async function bootWithStorage({ hash = '', query = {}, store = storage() } = {}) {
  code ||= await bundle();
  const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  ctx.console = { log() {}, info() {}, warn() {}, error: (...a) => console.error(...a) };
  ctx.__GTM_OPTIONS__ = { hash, query };
  ctx.localStorage = store;
  vm.runInContext(prelude(), ctx, { filename: 'prelude.js' });   // (first, as in the page: D33)
  vm.runInContext(readFileSync(ENGINE, 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  for (const f of MOCAP) { const src = readFileSync(f, 'utf8'); vm.runInContext(f.includes('/sets/') ? '(function (window) {\n' + src + '\n})(globalThis);' : src, ctx, { filename: f.split('/').pop() }); }
  vm.runInContext(code, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, gtm: ctx.__gtm, snap: () => game.debug.snapshot(), store };
}
/** the key a slot is stored under in localStorage */
export const slotKey = slot => 'my3d2dge:GrandTheftMoto-5S:save:' + slot;
