// The app: the pieces every scene shares (the view manager, the player's bindings, the activity monitor, the human
// controller, the footprint), made once and handed to each scene's make(app). Bindings read the devices once per step,
// before any scene updates: wrapScenes does that for every scene.
import { ViewManager } from './render/view-manager.js';
import { Stage } from './render/stage.js';
import { Bindings } from './input/bindings.js';
import { Activity, kioskWanted } from './input/activity.js';
import { HumanController } from './input/human.js';
import { Footprint } from './sim/footprint.js';
import { RNG } from './core/rng.js';
import { expose } from './debug/handle.js';

export function createApp({ game, links }) {
  const views = new ViewManager(game), bindings = Bindings.load(game.input), activity = new Activity(game.input);
  const seed = +(links.query.get('seed') || 1) >>> 0;
  RNG.seed(seed);
  const app = { game, links, views, bindings, activity, human: new HumanController(bindings, views, game), footprint: new Footprint(), kiosk: kioskWanted(links), seed, stage: new Stage(game, views) };
  for (const [k, v] of Object.entries(app)) expose(k, v);
  return app;
}
/** make each registered scene with the app, reading the bindings before its update */
export function wrapScenes(app, specs) {
  const out = {};
  for (const spec of specs) {
    const s = spec.make(app), update = s.update ? s.update.bind(s) : null;
    s.update = dt => { app.bindings.update(dt); if (update) update(dt); };
    out[spec.id] = s;
  }
  return out;
}
