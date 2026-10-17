# Progress: GRAND THEFT MOTO

Now: M2 in progress (in: the world layer, Lowtown, the street painter, the city renderer, the ISO cut-away, the quarter
turn, the speed zoom, the clock and day/night in every view, night ISO inside budget; next: rain and the water
shimmer, the drawbridge, the measured walk-through with screenshots). Blockers: none. The run started inside the planning
session (DECISIONS D5).

| Milestone | Status | Evidence (commits · tests · shots · perf) |
|---|---|---|
| M0 Bootstrap | done | see the acceptance log · `npm test` all steps pass (lint, boundary, vendor, goal-sync, dist current, 9 unit + sim, e2e smoke 6/6, engine check) |
| M1 Core + spikes | done | core, input, attract loop (`c76395c`); S2 floor and scale (`064fcae`): GTM-PATCHes 1-3, floor chunks, the scale yard · ISO 5.4-6.1 ms standing, 7.6 ms lap, 10.0 ms lap at zoom .65; S1 depth renderer (`dda0356`): SIDE7, TOP, the Stage, the view lab · TOP 6.1-6.2 ms, SIDE7 11.3-11.9 ms with 41 rigs; S3 vehicle physics (`7039af1`): the handling suite, the pad, the replay round-trip; the frozen contracts, D10 budgets · 69 unit + sim tests, 2 e2e · `docs/media/m1/` |
| M2 Lowtown + ISO | in progress | the world layer and Lowtown (builds in ~80 ms, validator clean on 3 seeds), the street painter, the city renderer, the cut-away (GTM-PATCH 1: `cutTop`) (`b781439`); the quarter turn (D12), the speed zoom, the clock and sky, GTM-PATCH 7 and MOTOR glows (D11) · night ISO 6.0 ms standing, 7.6 ms touring; TOP 6.6, MODE 7 11.6 · 83 unit + sim tests · `docs/media/lowtown-map-sheet.png`, `docs/media/m2-cutaway-bank.png` |
| M3 On foot + combat | | |
| M4 Vehicles | | |
| M5 Roads, traffic, peds | | |
| M6 Wanted, police, gangs | | |
| M7 TOP + SIDE7 + bank | | |
| M8 Missions + economy | | |
| M9 10-foot UI | | |
| M10 Audio + radio | | |
| M11 Attract + kiosk | | |
| M12 Proving Ground, docs | | |
| M13 Polish + release | | |

## Acceptance log

- **M0 · the engine is vendored at the exact SHA:** `vendor-check` reports my-3D2dge 0.46.1 @ cfa866a, 27 files, 0
  patches. Verdict: pristine.
- **M0 · `dist/index.html` plays from `file://`:** the e2e smoke passes (title → Enter → play → walk; `#play`
  deep link; no errors; no network). Verdict: plays.
- **M0 · the engine checker:** `check.mjs` reports no errors at 60 fps, draw about 5 ms.
  - title: 71% filled, 27 colours;
  - play: 91% filled, 77 colours.

  Verdict: the hello block reads as a city street (lit facades, lane dashes, sidewalks); the title is legible.
- **M0 · the build is repeatable:** `tests/unit/build.test.mjs` passes. Verdict: byte-identical.
- **M0 · the headless harness:** `tests/sim/boot.test.mjs` passes (title → play, the protagonist walks, the console
  handle and the view list). Verdict: headless works.
- **M1 · S2 floor and scale, on the 160×160 scale yard (`#proving/scale`) in ISO:** GTM-PATCHes 1-3 and MOTOR's
  `floor-chunks`. Measured with `node tools/perf.mjs` in headless Chromium 141 with no GPU, at 1920×1080 (a 480×270
  buffer), as medians of 8-10 s after a 3 s warm-up. Runs vary by about ±10%.

  | Scenario | Draw median | p90 / p99 | Update median |
  |---|---|---|---|
  | title (baseline: the upscale to the screen alone is 1.3-1.5 ms) | 2.5 ms | | |
  | scale yard, standing, zoom 1 | 5.4-6.1 ms | 6.6-8.5 / 9.3-11.7 ms | 0.2 ms |
  | lap at 300 u/s, zoom 1 | 7.6 ms | 9.9-12 / 12.6-16.5 ms (21 ms before `prebakeWalls`) | 0.2 ms |
  | lap at 300 u/s, zoom .65 (the widest driving zoom) | 10.0 ms | 13.9 / 17.3 ms | 0.2 ms |

  - **Floor:** 9-16 affine chunk blits cost about 0.8 ms a frame. A chunk bakes in about 0.3 ms. No seams show (each
    chunk has a 2-texel apron).
  - **Walls:** the cost is the block count: about 2.5 µs per block `drawImage` (about 600 blocks at zoom .65), plus
    bakes (about 1.1 ms a frame at 300 u/s, spread by `prebakeWalls`). Blending area is not the cost: cropping block
    images to what they draw cut the cache from 14.6M to 6.1M pixels for 3,000 blocks, with no change in draw time.
  - **The floor check, side by side** (`docs/media/m1/s2-floor-engine-vs-chunks.png`, the hello block): left is the
    engine's own bake, right is MOTOR's chunks. 1.0% of pixels differ by more than 24 levels, along mortar edges.
    Verdict: they match, so the per-view crisp bakes (the fallback in PLAN.md 8.4) are not needed.
  - **Screens** (`docs/media/m1/s2-scale-yard-iso.png`, `s2-scale-yard-lap-zoom65.png`): streets with lane paint,
    zebra crossings, curbs and lamps; lit facades, 1-8 storeys. Verdict: reads as a GTA2-scale city.
  - **Verdict:** keep. The city scales to 160×160. The driving zoom is over the 9 ms target before any actors; the
    measured budgets go in DECISIONS with S1's numbers, and merging roof-only blocks per building is the lever to pull
    if M2's gates fail.
- **M1 · S1 the depth renderer, on the view lab (`#proving/views`: 64×64 cells, 4×4 chunks, 40 walkers and the hero,
  a lap at 300 u/s):** `render/depth/` (spans, textures, textured faces, `side7.js`, `top.js`) and `render/stage.js`.
  Measured as for S2 (two runs each).

  | Scenario | Draw median | p90 / p99 | Update median |
  |---|---|---|---|
  | view lab, ISO (crowd on the engine's fast path) | 7.0-7.5 ms | 11.3-11.7 / 17.6-17.8 ms | 0.4 ms |
  | view lab, TOP-DOWN (H at its driving height) | 6.1-6.2 ms | 8.5-8.8 / 12.7-13.2 ms | 0.4 ms |
  | view lab, MODE 7 | 11.3-11.9 ms | 14.3-15.5 / 19.5-22.3 ms | 0.4 ms |
  | scale yard 160×160, MODE 7 (no walkers) | 9.0-9.4 ms | 12.1-13.7 / 15.5-19.2 ms | 0.2 ms |
  | scale yard 160×160, TOP-DOWN (no walkers) | 5.5-5.7 ms | 7.6-8.9 / 11.3-11.4 ms | 0.2 ms |

  - **Where MODE 7's time goes** (`tools/profile-frame.mjs`): the 41 rig draws at their distance's scale are about 3.5
    ms of script; floor rows 0.5 ms (about 350 `drawImage` calls); faces 0.5 ms; the rest is raster, at present time.
    It is 3-8% over the 11 ms target. The lever, for M7: crowd rigs drawn every other frame from a cached image, as the
    engine's `every` does in ISO.
  - **Screens:** `docs/media/m1/s1-view-lab-{iso,top,side7}.png` (one scene, one draw path, three views);
    `s1-side7-rails-east-south-west.png` (the floor rows on all four rail headings); `s1-hello-block-three-views.png`
    (the engine checker's own shots of the three views). Verdicts:
    - MODE 7 reads as a SNES-style city street: textured facades recede on both sides, walkers shrink with distance,
      and walls and figures stay upright (the shifted lens, DECISIONS D8);
    - TOP-DOWN reads as GTA2: buildings lean out from the centre, showing their centre-facing walls and lit windows;
    - ISO is unchanged.
  - **Correctness:** projection inverses at every rail heading, the TOP lean, span coverage and the face splitter are
    unit-tested. Walking stays screen-relative in each view (a sim test: up is north on the north rail). The rail
    keeps the focus between `near` and `far`.
  - **Verdict:** keep. No fallback was needed (PLAN.md 8.5's fallback cut SIDE7 to one heading; all four work).
- **M1 · S3 vehicle physics, on the vehicle pad (`#proving/pad`):** `sim/vehicle/body.js` (a bicycle-model rigid body),
  `sim/vehicle/defs.js` (the `vehicles` registry), the Cortez (`src/game/vehicles/cortez.js`), `render/box-model.js`
  (box-part models drawn through the projector, so a car looks right in every view), the Proving Ground's zones
  (`src/game/proving/`) and GTM-PATCH 3's public `map.solidsNear`.
  - **The handling suite** (`tests/unit/vehicle.test.mjs`, 11 tests; PLAN.md 8.8's Accept):
    - 0-200 u/s in 2.42 s (spec 2.4, ±10%), top speed 260 (spec 260, ±5%);
    - braking from 200 u/s: 41 u dry (spec 41), 51 u wet (+24%; the plan asks at least +20%), never into reverse (a
      stopped car reverses only after the brake is held 0.2 s);
    - the skidpad: about 283 u/s² of lateral grip at full lock, less wet and on grass;
    - a handbrake drift: yaw 3.3 rad/s and 42° of rear slip (2 and 12° are the thresholds), against 1.4 rad/s and 4°
      without it; a 0.4 s pull turns the car about 50° and it recovers by itself, a 0.6 s pull with throttle spins it
      round (a J-turn);
    - no tunnelling at 400 u/s into a wall one cell thick (the front stops at the face);
    - a glancing hit spins the car and a square one stops it straight; car on car keeps momentum along the hit and ends
      apart; a lamp post (a map solid) stops it; a 3-unit curb is climbed; reverse to the reverse top speed;
    - deterministic to the bit.
  - **Driving through the real bindings** (a sim test): W drives, D steers right, collisions with the parked cars.
  - **The replay round-trip** (`tests/e2e/replay.mjs`, in the gate): a 321-frame session of the pad, recorded with the
    engine's own recorder (`?record=1`), replayed frame by frame by its `tools/replay.mjs`. 6 of 6 checksums matched,
    each including every car's position and heading (`game.stateHash`).
  - **Perf:** the pad draws in 3.4 ms (p99 6.1) with 0.2 ms of update for five cars at 120 Hz.
  - **Screens:** `docs/media/m1/s3-vehicle-pad-three-views.png`. The Cortez is a box model: side-on in MODE 7, from
    above in TOP-DOWN, isometric in ISO. Verdict: it reads as a car in every view; the model gets its detail in M4.
  - **Verdict:** keep.
- **M1 · the contracts are frozen** in `docs/ARCHITECTURE.md`: the Intent; the projector and the Stage; the registry
  kinds and their schemas; the BUS catalogue with payloads (`src/motor/core/events.js`); the staged mission API and
  bot hints (`src/motor/mission/dsl.js`, checked as content registers). Tests: the mission shape and hint checks, the
  catalogue, the view event. Verdict: frozen.
- **M1 · the proofs:**
  - the headless harness runs every sim test;
  - the same drive gives the same `game.stateHash` in ISO, TOP-DOWN and MODE 7;
  - a recorded session replays with every checksum matching.

  Verdict: deterministic and view-independent.
- **M1 · the budgets** are logged as DECISIONS D10, from the spikes' measurements. No fallback was taken.
- **M1 · the gate:** `npm test` passes every step (lint, boundary, vendor, goal-sync, dist current, 69 unit and sim
  tests, the e2e smoke, the e2e replay, and the engine checker across all three views).

