// The page's first script, before the engine (tools/build.mjs; the headless loaders run it first too): MOTOR's
// deterministic Math in place of the browser's transcendental functions (D33), so the engine, its mocap player, MOTOR
// and the content all compute alike in every runtime, the engine's load included (its preset views). The game bundle
// imports it as well (src/main.js), so a page or a tool that runs the bundle alone is covered too.
import { install } from './dmath.js';

install();
