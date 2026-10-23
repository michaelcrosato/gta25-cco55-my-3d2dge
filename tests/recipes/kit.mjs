// The recipe tests' kit (PLAN.md M12: "each recipe followed to the letter, adding a new instance through the public
// API and proving it works end to end"): a game bundled with one recipe's fixture, tests/recipes/fixtures/<name>.js,
// as if it were the content file the recipe names (src/game/<as>, imported in its sorted place). Nothing else is
// edited: the fixture is the whole change.
import { loadGame, holdCode } from '../harness.mjs';

export { holdCode };
/** the game with the fixture in: { game, gtm, M (MOTOR), snap(), input } */
export async function withRecipe(name, as, o = {}) {
  const g = await loadGame({ ...o, extra: [{ file: `tests/recipes/fixtures/${name}.js`, as }] });
  return { ...g, M: g.gtm.motor };
}
/** the registries' warnings about a recipe's ids (a bad spec warns once as it loads: none for a recipe's) */
export const specWarnings = (g, ids) => g.warns.filter(w => /MOTOR: /.test(w) && ids.some(id => w.includes(`"${id}"`)));
/** a quick press of a key (a tap), then a moment */
export function tap(game, code, after = .2) { holdCode(game, code, 1 / 30); game.advance(after); }
/** a defId parked where one of the city's parked cars was, the road round it cleared, and the player in it through
 *  the real bindings (E at its door): the vehicle */
export function boardParked(g, defId) {
  const { game, gtm } = g, F = gtm.fleet, p = gtm.crew.ped, old = F.near(p.x, p.y, 3000).find(q => q.cls === 'car');
  const v = F.spawn(defId, old.x, old.y, old.heading, { owner: 'world' }); F.remove(old);
  for (const o of F.near(v.x, v.y, 260)) if (o !== v) F.remove(o);
  const [x, y] = v.toWorld(0, -v.hw - 14); gtm.teleport(x, y); game.advance(.5);
  tap(game, 'KeyE', 1.5);
  return v;
}
/** a stand-in audio context (no sound headless): nodes that remember when they start */
export function fakeAudio() {
  const started = [], node = () => ({ connect() {}, disconnect() {}, gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} }, frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, Q: { value: 1 } });
  const src = kind => ({ ...node(), kind, start(t) { started.push({ kind, t }); }, stop() {}, setPeriodicWave() {}, type: '' });
  return { started, ctx: { currentTime: 0, sampleRate: 8000, createGain: node, createBiquadFilter: node, createOscillator: () => src('osc'), createBufferSource: () => src('noise'), createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createPeriodicWave: () => ({}) } };
}
