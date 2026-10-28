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
import { BUS } from './core/bus.js';
import { TUNE } from './core/tune.js';
import { syncMouseButtons } from './input/mouse-chords.js';
import { UILayer } from './ui/layer.js';
import { Screens } from './ui/screens.js';
import { Pen } from './ui/tenfoot.js';
import { defineSettings } from './ui/settings.js';
import { DualSenseHID } from './input/dualsense-hid.js';

export function createApp({ game, links }) {
  const views = new ViewManager(game), bindings = Bindings.load(game.input), activity = new Activity(game.input);
  const seed = +(links.query.get('seed') || 1) >>> 0;
  RNG.seed(seed); syncMouseButtons(game);
  const app = { game, links, views, bindings, activity, human: new HumanController(bindings, views, game), footprint: new Footprint(), kiosk: kioskWanted(links), seed, stage: new Stage(game, views) };
  // the UI layer (PLAN.md 7.7, 8.18): the HUD and the menus on a canvas of their own, at the HUD size's scale, over
  // the player's settings (the engine's store with MOTOR's own); took: a screen had the step's input (the scene's
  // controls read nothing of it)
  game.haptics = !game.headless && DualSenseHID.supported() ? new DualSenseHID(navigator.hid) : null;   // (a DualSense's own report by WebHID, L7: the setting opens it)
  defineSettings(game);
  // no touch controls (PLAN.md 8.20): the engine's floating stick off (no scene asks for its touch buttons either)
  if (game.input) { game.input.touchEnabled = false; game.input.touchFilter = () => false; }
  const layer = new UILayer(game, { base: () => (app.stage.sharp ? app.stage.baseS : null) });
  app.ui = { layer, screens: new Screens({ app, layer }), took: false, held: false, record: () => layer.rec.snapshot() };
  for (const [k, v] of Object.entries(app)) expose(k, v);
  expose('BUS', BUS); expose('TUNE', TUNE);
  return app;
}
/** make each registered scene with the app: each step the bindings are read, then the screens open over the scene
 *  take their input (one that pauses holds the scene still: our own pause, PLAN.md 8.18), then the scene updates;
 *  after its draw, the UI layer's frame: the scene's HUD (scene.hud(pen)) and the screens */
export function wrapScenes(app, specs) {
  const out = {}, U = app.ui.screens;
  for (const spec of specs) {
    const s = spec.make(app), update = s.update ? s.update.bind(s) : null, draw = s.draw ? s.draw.bind(s) : null;
    s.update = dt => {
      app.bindings.update(dt);
      app.ui.took = U.isOpen; if (U.isOpen) { U.update(dt); if (!U.isOpen) app.bindings.spendHeld(); }   // (the press that closed the last screen is spent: play never reads it)
      const held = U.pausing; if (held !== app.ui.held) { app.ui.held = held; try { app.game.audio.duck(held); } catch (e) { /* no audio yet */ } }   // (the music quieter under the pause)
      if (held) { if (app.game.haptics) app.game.haptics.rest(); return; }   // (the scene stands still under the pause, the map, the settings from it; the triggers free)
      if (update) update(dt);
    };
    s.draw = r => { if (draw) draw(r); uiFrame(app, s); };
    const exit = s.exit ? s.exit.bind(s) : null;
    s.exit = () => { U.closeAll(); if (exit) exit(); };   // (a scene's screens go with it)
    out[spec.id] = s;
  }
  return out;
}
/** one frame of the UI layer over a scene. The engine's own pause (the page hidden, the window left, the controller
 *  unplugged: its auto-pause) is handed to the scene's pause screen here, the one hook that runs while it holds: the
 *  engine lets go and the scene's openPause(reason) opens ours, which holds the scene still in the step */
export function uiFrame(app, s) {
  const L = app.ui.layer, g = app.game; L.frame(Math.max(0, Math.min(.1, g.real - (L._real ?? g.real)))); L._real = g.real;
  if (g.paused && s && s.openPause) { const why = g.pauseReason; g.resume(); s.openPause(why); }
  const P = new Pen(L, app.bindings, g.input);
  if (s && s.hud) s.hud(P);
  app.ui.screens.draw(P);
  return P;
}
