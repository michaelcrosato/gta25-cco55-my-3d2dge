# Progress: GRAND THEFT MOTO

Now: M1 in progress. Core, input and the attract loop are done; spike S2 (floor and scale) is done and kept; S1 (the
depth renderer) is next, then S3 (vehicle physics) and the contracts. Blockers: none. The run started inside the
planning session (DECISIONS D5).

| Milestone | Status | Evidence (commits · tests · shots · perf) |
|---|---|---|
| M0 Bootstrap | done | see the acceptance log · `npm test` all steps pass (lint, boundary, vendor, goal-sync, dist current, 9 unit + sim, e2e smoke 6/6, engine check) |
| M1 Core + spikes | in progress | core, input, attract loop (`c76395c`); S2 floor and scale: GTM-PATCHes 1-3, floor chunks, the scale yard, `tools/perf.mjs` · 13 patch tests + 4 render + 2 sim · `docs/media/m1/s2-*` · ISO 5.4-6.1 ms standing, 7.6 ms lap, 10.0 ms lap at zoom .65 |
| M2 Lowtown + ISO | | |
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

