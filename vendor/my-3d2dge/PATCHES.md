# Patches to the vendored my-3D2dge

The engine here is my-3D2dge v0.46.1 @ `cfa866aa45474868350cad1a7fc015e612f9305f` (see `VERSION.json`).

**Policy** (PLAN.md section 12):
- Extend first.
- Patch only where an extension would have to reach into private state.
- Mark each patch `// GTM-PATCH(n): <why>` in the code, and test it in `tests/unit/engine-patches.test.js`.
- Each patch is written so it could be offered upstream. Record it here and in `PATCHES.json`; `tools/vendor-check.mjs`
  checks both.

| # | File | What | Why | Test | Upstream issue text |
|---|---|---|---|---|---|
| 4 | `engine/my-3d2dge.js` (Input: the constructor, listeners, `press`, `clear`, `tick`) | `input.raw = { keys, pads, active, activity }`:<br>• every key code held, bound or not;<br>• every connected pad's buttons as `{ pressed, value }`, plus its axes;<br>• the active pad, which is the last one used;<br>• an activity clock: keys, mouse move, click, wheel, touch, pad buttons, sticks past the dead zone, triggers;<br>• `raw.pressed`: the codes pressed since the step before, so a tap shorter than a step still counts once.<br><br>The engine's own pad is now the active one, not the first connected. | Analog triggers for driving. A DualSense that isn't pad 0. An idle timer for attract modes. Game-owned per-context bindings that never call `use()`, which clears held buttons. | `tests/unit/engine-patches.test.mjs` | "Input: expose raw device state and an activity clock. `anyPressed()` sees only bound actions, `tick()` reads only the first pad's `pressed` flags, and nothing records the time of the last input of any kind. Games need these for attract modes, analog triggers and their own binding layers." |

GTM-PATCHes 1-3 (TileMap, solids) and 5 (audio buses) are still to come (PLAN.md section 12).
