// MOTOR: the open-city engine layer over my-3D2dge. This file is MOTOR's public API: src/game imports nothing else.
export { E } from './engine.js';
export { declare, def, get, all, kinds } from './core/registry.js';
export { readLinks, route } from './debug/deeplinks.js';
export { expose, installHandle, handle } from './debug/handle.js';
export { ViewManager } from './render/view-manager.js';
