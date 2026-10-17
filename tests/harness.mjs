// The headless harness: the vendored engine and the game bundle run in one node:vm context with no screen (new E.Game is
// headless where there is no DOM), driven by fixed steps (game.advance) and scripted input (input.tap / hold). The same
// pattern as the engine's handoff test (vendor/my-3d2dge/reference/handoff-test.mjs). Draw never runs headless.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { bundle, ENGINE } from '../tools/build.mjs';

let code = null;
/** a fresh game: { E, game, gtm, input, snap() }. hash and query stand in for the page's #hash and ?query */
export async function loadGame({ hash = '', query = {}, quiet = true } = {}) {
  code ||= await bundle();
  const con = quiet ? { log() {}, info() {}, warn() {}, error: (...a) => console.error(...a) } : console;
  const ctx = { console: con, __GTM_OPTIONS__: { hash, query } };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(ENGINE, 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(code, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, gtm: ctx.__gtm, input: game.input, snap: () => game.debug.snapshot() };
}

/** the engine on this process's global, for unit tests that import MOTOR modules directly */
export function engineGlobal() {
  if (!globalThis.My3D2dge) vm.runInThisContext(readFileSync(ENGINE, 'utf8'), { filename: 'my-3d2dge.js' });
  return globalThis.My3D2dge;
}
