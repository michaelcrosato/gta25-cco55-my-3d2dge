// The engine handle. my-3D2dge is a classic script that defines the global My3D2dge; the page inlines it before the
// game bundle, and the headless tests run it first in the same vm context. MOTOR reaches it only through its public API
// (tools/boundary-check.mjs holds that line; the vendored patches are listed in vendor/my-3d2dge/PATCHES.md).
export const E = globalThis.My3D2dge;
if (!E) throw new Error('MOTOR: my-3D2dge (My3D2dge) must be loaded before the game bundle');

let MOCAP_LIB;
/** the engine's mocap player and GTM's cut of its clips ({ Mocap, lib }: classic scripts the page loads after the engine,
 *  tools/build.mjs; the tests load them too), or null where they are not loaded (unit tests on the bare engine) */
export function mocap() {
  if (MOCAP_LIB !== undefined) return MOCAP_LIB;
  /* global Mocap */
  const M = typeof Mocap !== 'undefined' ? Mocap : null, sets = globalThis.MOCAP;
  MOCAP_LIB = M && sets && sets.GTM ? { Mocap: M, lib: M.load(sets.GTM) } : null;
  return MOCAP_LIB;
}
