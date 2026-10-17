# Progress: GRAND THEFT MOTO

Now: M0 complete; next M1, the core architecture and spikes S1-S3. Blockers: none. The run started inside the planning
session (DECISIONS D5).

| Milestone | Status | Evidence (commits · tests · shots · perf) |
|---|---|---|
| M0 Bootstrap | done | see the acceptance log · `npm test` all steps pass (lint, boundary, vendor, goal-sync, dist current, 9 unit + sim, e2e smoke 6/6, engine check) |
| M1 Core + spikes | next | |
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
