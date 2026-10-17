// MOTOR: the open-city engine layer over my-3D2dge. This file is MOTOR's public API: src/game imports nothing else.
export { E } from './engine.js';
export { declare, def, get, all, kinds } from './core/registry.js';
export { shape } from './core/schema.js';
export { BUS } from './core/bus.js';
export { TUNE, knob, tuneSet, knobs, sections, tuneReset, tuneLoad, tuneSave, tuningMarkdown } from './core/tune.js';
export { RNG, hash32 } from './core/rng.js';
export { readLinks, route } from './debug/deeplinks.js';
export { expose, installHandle, handle } from './debug/handle.js';
export { ViewManager } from './render/view-manager.js';
export { Actor, resetActorIds } from './sim/actor.js';
export { makeIntent, clearIntent, tapButton, BUTTONS } from './sim/intent.js';
export { Footprint } from './sim/footprint.js';
export { Bindings, DEFAULT_BINDINGS } from './input/bindings.js';
export { Activity, kioskWanted } from './input/activity.js';
export { drawGlyph, glyphWidth, glyphSet } from './input/glyphs.js';
export { drawPrompt, promptWidth, parsePrompt, codeFor } from './input/prompts.js';
export { HumanController } from './input/human.js';
export { createApp, wrapScenes } from './app.js';
