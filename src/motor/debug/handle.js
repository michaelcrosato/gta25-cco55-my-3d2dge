// The console handle, window.__gtm (globalThis in headless tests): every capability has a machine interface. Systems
// add to it with expose(name, value) as they are built; snapshot() is what tools/check.mjs prints after play.
const H = {};
export function expose(name, value) { H[name] = value; return value; }
export function installHandle(game) {
  globalThis.__gtm = H; H.game = game;
  game.debug = Object.assign(game.debug || {}, { snapshot: () => (H.snapshot ? H.snapshot() : { scene: game.sceneName }) });
  return H;
}
export const handle = H;
