// The headless harness: the vendored engine and the game bundle run in one node:vm context with no screen (new E.Game is
// headless where there is no DOM), driven by fixed steps (game.advance) and scripted input (input.tap / hold). The same
// pattern as the engine's handoff test (vendor/my-3d2dge/reference/handoff-test.mjs). Draw never runs headless.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { bundle, ENGINE, MOCAP } from '../tools/build.mjs';

const codes = new Map();
/** a fresh game: { E, game, gtm, input, snap(), warns (the quiet console's warnings) }. hash and query stand in for
 *  the page's #hash and ?query; extra ([{ file, as }]): content files bundled as if each were at src/game/<as> (a
 *  recipe test's fixtures) */
export async function loadGame({ hash = '', query = {}, quiet = true, pads = null, extra = [] } = {}) {
  const key = JSON.stringify(extra); if (!codes.has(key)) codes.set(key, await bundle({ extra }));
  const code = codes.get(key);
  const warns = [], con = quiet ? { log() {}, info() {}, warn: (...a) => { warns.push(a.join(' ')); }, error: (...a) => console.error(...a) } : console;   // (warns: kept, for a test to read)
  // an ordinary global object (DONT_CONTEXTIFY): a contextified sandbox answers every global lookup through an
  // interceptor, and Math.floor in the game's hot loops then costs a hundred times what it costs in a browser
  const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  ctx.console = con; ctx.__GTM_OPTIONS__ = { hash, query };
  if (pads) ctx.navigator = { getGamepads: () => pads };   // fake gamepads: tests change the array in place
  vm.runInContext(readFileSync(ENGINE, 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  // (the mocap scripts as the page loads them; a clip set writes window.MOCAP, which here is the context's global)
  for (const f of MOCAP) { const src = readFileSync(f, 'utf8'); vm.runInContext(f.includes('/sets/') ? '(function (window) {\n' + src + '\n})(globalThis);' : src, ctx, { filename: f.split('/').pop() }); }
  vm.runInContext(code, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, gtm: ctx.__gtm, input: game.input, snap: () => game.debug.snapshot(), warns };
}

/** the engine on this process's global, for unit tests that import MOTOR modules directly */
export function engineGlobal() {
  if (!globalThis.My3D2dge) vm.runInThisContext(readFileSync(ENGINE, 'utf8'), { filename: 'my-3d2dge.js' });
  return globalThis.My3D2dge;
}

/** hold a raw code (a key, 'Mouse0', 'Pad0') for some seconds of game time, then let go and run one more step */
export function holdCode(game, code, seconds = 1 / 30) {
  game.input.press(code); game.advance(seconds); game.input.release(code); game.advance(1 / 120);
}
