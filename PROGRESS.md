# Progress: GRAND THEFT MOTO

Now: M4 is done (vehicles: 7 classes, 13 models, 19 definitions). At the owner's request the run is handed off here
(DECISIONS D16): the next session starts M5 from `docs/HANDOFF.md`, which holds its `/goal`. Blockers: none. The run
started inside the planning session (DECISIONS D5); the owner launched the `/goal` itself after M3's bulk had landed.

| Milestone | Status | Evidence (commits · tests · shots · perf) |
|---|---|---|
| M0 Bootstrap | done | see the acceptance log · `npm test` all steps pass (lint, boundary, vendor, goal-sync, dist current, 9 unit + sim, e2e smoke 6/6, engine check) |
| M1 Core + spikes | done | core, input, attract loop (`c76395c`); S2 floor and scale (`064fcae`): GTM-PATCHes 1-3, floor chunks, the scale yard · ISO 5.4-6.1 ms standing, 7.6 ms lap, 10.0 ms lap at zoom .65; S1 depth renderer (`dda0356`): SIDE7, TOP, the Stage, the view lab · TOP 6.1-6.2 ms, SIDE7 11.3-11.9 ms with 41 rigs; S3 vehicle physics (`7039af1`): the handling suite, the pad, the replay round-trip; the frozen contracts, D10 budgets · 69 unit + sim tests, 2 e2e · `docs/media/m1/` |
| M2 Lowtown + ISO | done | the world layer, Lowtown, the street painter, the city renderer, the cut-away (`b781439`); the quarter turn, the speed zoom, the clock and sky, night ISO in budget (`fe4f6dc`); weather, the drawbridge, the stand-in crowd and the gate (`8f175be`); roofs, shopfronts, yards, the shot matrix and the acceptance (this commit) · ISO at the gate 9.3-10.0 ms · 86 unit + sim tests · `docs/media/lowtown-map-sheet.png`, `docs/media/shots/` |
| M3 On foot + combat | done | saves, weapons, vitals, fire (`edec102`); the crew on foot, combat, the wheels, the switch, the range (`42c3054`); the accept tests, the view lab, the self-tests, perf (this commit) · ISO at the gate the same as M2's build, interleaved · 114 unit + sim tests, 3 e2e suites · `docs/media/m3/` |
| M4 Vehicles | done | the models registry, the class bodies, the Fleet, boarding, damage, the renderer, the handling bench (`b442d89`); Lowtown's fleet, driving in play, the accept tests (`f198207`, `a7eb6ae`, `87c52c9`); FAN-OUT A1's 19 definitions, the painter's order, the fixes its reviews found (`f61bf2e` to `c9e3ef6`); the acceptance and the handoff (this commit) · 172 unit + sim tests, 3 e2e suites · ISO at the gate the same as M3's build, interleaved; TOP 9.1 ms · `docs/media/m4/` (the model sheet, 15 shots) |
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
- **M2 · section 8.3, the city builder:**
  - Lowtown builds headless in about 80 ms (a sim test holds it under 1.5 s);
  - the validator finds no errors on seeds 1999, 7 and 42;
  - every point of interest is reachable on foot and by road (the validator's flood fills, checked in the same test);
  - the map sheet is `docs/media/lowtown-map-sheet.png`.

  Verdict: the sheet reads as the district in PLAN.md 9.1: four neighbourhoods, the Loop round the middle with its
  gap stub, the L down Motor Avenue, the canal with three bridges, the harbour, every landmark where the plan puts it.
- **M2 · section 8.4, ISO and the floor chunks**, measured as in D10 (medians over 8-10 s, ±10% between runs):

  | Scenario (`tools/perf.mjs`) | Draw median | p99 |
  |---|---|---|
  | `lowtown-walk`: standing at the bank at night | 6.0-6.6 ms | 11-12 ms |
  | `lowtown-tour`: the tour at 300 u/s at night | 8.3-9.7 ms | 17-20 ms |
  | `lowtown-tour-rain`: the same in the rain | 7.4 ms | 18 ms |
  | `lowtown-gate`: in the rain at night, 40 walkers and 20 cars in view (D13) | 9.3-10.0 ms | 18-21 ms |
  | `lowtown-gate-top`: the gate in TOP-DOWN | 8.4 ms | 17 ms |
  | `lowtown-gate-side7`: the gate in MODE 7 | 14.4-16.0 ms | 42-52 ms |

  - ISO and TOP-DOWN are inside the gate (10.4 and 12.7 ms). MODE 7's crowd lever is M7's, as D10 set it; with no crowd
    it draws in 11.8-13.1 ms.
  - Night went from 24.4 ms to 6.0 ms on the way (D11): GTM-PATCH 7, MOTOR's glows, the screen cull, sign images.
  - `check.mjs` raises no look notes (208-216 colours in play, every view).
- **M2 · the neighbourhood screenshots** (`tools/shot-matrix.mjs`): `docs/media/shots/` holds ISO by day, dusk and
  night for each neighbourhood. Contact sheets: `sheet-iso-clear.jpg`, `sheet-top-clear.jpg`, `sheet-side7-clear.jpg`,
  and `sheet-iso-rain.jpg`. Verdicts against section 10:
  - **Palm Terraces:** pass.
    - Seen: pastel stucco and balconies, the red Gas'n'Sip and its pumps, palms along every walk, billboards, shop neon.
  - **Neon Mile:** pass, with a note.
    - Seen: the Hotel Marquee's lit tower and sign, rooftop clutter, lamps.
    - Note: the street-level neon is thinner here than the name promises. More shop signs go in with the shop
      interiors and gang fronts (M6, M8).
  - **Brickyard:** pass.
    - Seen: brick warehouses, the Boom Box, billboards, and the Loop overhead on its pillars.
    - MODE 7 used to show a grey wall under the Loop. Now the deck overhead between the camera and the player is cut
      away.
  - **Harborfront:** pass.
    - Seen: the cranes, containers, crates and pallets in the yards, bollards on the quay, glinting water, and the
      drawbridge (`docs/media/m2/drawbridge-up.png`, `?bridge=up`).
  - **Every neighbourhood, night and rain:** sodium pools and warm halos, broken streaks on the wet street, rain and
    splashes. The known gap (D11): roofs catch light pools from the street behind them.
- **M2 · the views:** all three draw Lowtown by day, dusk and night in every weather, with these fixes:
  - the cut-away drops a whole building to stubs round a floor (GTM-PATCH 1 `cutTop`; `docs/media/m2/cutaway-bank.png`);
  - the quarter turn orbits (D12; `docs/media/m2/turn-orbit-flat-blocks.png` is a frame of it);
  - the speed zoom steps behind a quarter-second scale;
  - x-ray shows the player through decks.
- **M2 · the gate:** `npm test` passes every step (86 unit and sim tests, both e2e suites, the engine checker).
- **M3 · section 8.12, combat** (`tests/sim/combat.test.mjs`, `tests/unit/combat.test.mjs`):
  - **DPS within spec for each weapon**, on the range's bench (`measureDps`: a shooter at the starting stats locked on
    an anchored dummy, whole reload cycles from an empty magazine):

    | Weapon | Spec DPS | Measured | Ratio |
    |---|---|---|---|
    | Fists | 20.8 | 21.4 | 103% |
    | Lowtown Slugger | 33.6 | 35.6 | 106% |
    | Snub .38 | 33.75 | 33.75 | 100% |
    | Buzzsaw | 62.4 | 62.4 | 100% |
    | Persuader (8 pellets) | 55.0 | 55.0 | 100% |
    | Hot Mess | 35.3 | 35.3 | 100% |

    The others have their own tests: a rocket's direct hit kills and its splash hurts less behind; a grenade's damage
    falls off from where it went off; the Zap-O-Matic stuns and the fourth zap in a row kills; the Snap tells the BUS
    what it photographed.
  - **Lock-on selection:** the press locks the nearest dummy in the gallery's 70° screen cone; a threat comes first;
    a flick moves the lock to the next dummy that way; letting go unlocks.
  - **Molotov spread:** thrown on the lawn it catches 60+ cells and burns out; on the bare apron it burns little more
    than its petrol. In Lowtown's park the same (`tests/sim/lowtown.test.mjs`).
  - **z-aware hits:** from the shed's roof a locked shot pitches down and hits the street target; a level one (no
    assist) flies over its head; the shed's wall takes a level street shot at the roof's dummy.
  - **Drive-bys on both sides:** riding east at 120 u/s, the Buzzsaw hits the target off the left by the stick, then
    the right, then whatever is off a side by the auto-target; the car itself is never hit.
  - Also: knockdown slides with the hit and the body gets up; pickups heal and arm (Lowtown's own).

  Verdict: pass.
- **M3 · section 8.11, the crew:**
  - **a switch between every pair** (six in a row): the camera climbs to the switch height, crosses and drops, control
    passes, and a protagonist left long enough is found at their vignette, which plays and ends;
  - in play the character wheel switches by the keys (hold Z, point, let go) and the switch camera flies in TOP;
  - **abilities:** OVERDRIVE halves the game's time; DEAD CALM slows it to .35 only while aiming; RED MIST halves the
    hurt (unit tests for the meters, a sim test in the play scene);
  - **stats** grow by doing and come back the same through the game's save store.

  Verdict: pass.
- **M3 · moving on foot:** sprinting outruns running and lasts the stamina's four seconds, then winds; a jump climbs the
  24-high shed but not the 48-high wall (the climb limit is 34; the jump itself was lowered to knee height, D14); a
  low wall vaults at a run; a roll stops short of a wall; crouching sneaks. Verdict: pass.
- **M3 · the Proving Ground's first zones:** `#proving/range` (the combat range) and `#proving/views` (the view lab, now
  with the scale yard: the crew holding a pistol, an SMG and the Boom Tube beside a Cortez). Both pass their
  `?selftest=1` in Chromium (`tests/e2e/selftest.mjs`, in `npm test`): the bench, the dummies and a lane in reach; the
  same spot drawn with its bodies in ISO (8), TOP (44) and MODE 7 (44).
- **M3 · the shots** (`docs/media/m3/`), with verdicts:
  - `night-iso-2-aim-fire`: Dex aims the Snub .38 at the safehouse wall; the sight sits on the wall, the HUD shows the
    rounds. Pass.
  - `night-iso-3-weapon-wheel`: the wheel's eight slots, the one in hand named with its rounds; empty slots named dim.
    Pass.
  - `night-iso-5-switch-wheel`, `-6-switch-up`, `-8-vignette`: the crew's portraits (Dex left, Viv up, Gus right); the
    camera over Lowtown's lamps with the signs as strokes of colour; Viv in her booth at the Greasy Spoke with her
    line. Pass.
  - `range-iso-2-smg`, `range-side7-smg`: tracers, casings, the muzzle's flash, the lock's mark over a dummy. Pass.
  - `range-top-fire`, `range-side7-fire`: the Hot Mess sets the lawn alight; flames per cell, lit. Pass.
  - `viewlab-iso`, `-top`, `-side7`: the three protagonists and their weapons read in every view; Gus's left hand on
    the Boom Tube. Pass.
  - Look notes fixed: the HUD's weapon name sat off the top edge; blood sprayed every step from a burning body; the
    signs stayed full size from the switch camera's height; the scale yard stood behind a building in ISO.
  - Known gap, for M7: in TOP-DOWN a body standing on a roof is drawn under the roof.
- **M3 · performance:** the HUD and the pickups' tokens are drawn once and kept (the pixel font fills a rectangle a
  pixel); the idle protagonists are kept images (D13). The ISO gate, interleaved with M2's build on the same machine
  (which ran slower than M2's own measurement): M2 11.4, 12.0, 12.1 ms; M3 10.8, 11.5, 12.3 ms. The same within noise.
  TOP 9.2 ms; MODE 7 15.2 ms (M7's lever, D10).
- **M3 · engine:** GTM-PATCH 8 (`weaponDraw`, tested in both rig styles). Mouse chords are kept in step by MOTOR,
  with no patch. Decisions in D14.
- **M3 · the gate:** `npm test` passes every step (lint, boundary, vendor, goal-sync, dist current, 114 unit and sim
  tests, the e2e smoke, replay and self-tests, the engine checker).
- **M4 · section 8.8, the handling suite** (`tests/unit/handling.test.mjs`, `sim/vehicle/handling.js`, in headless Node
  at the fixed 1/120 s step). Every definition is measured on its class's bench against its own spec. A land
  vehicle's bench covers:
  - 0-200 u/s (or 0-100 for slow vehicles) within 10%;
  - top speed within 5%;
  - dry braking within 10%;
  - wet braking at least 15% longer;
  - skidpad grip at least half the tyres' grip;
  - a handbrake drift past the class's yaw and slip thresholds;
  - no tunnelling into a wall at 400 u/s.

  Boats, the heli and the L have their own checks. All 19 definitions pass every check:

    | Definition | Class | Launch (spec) | Top (spec) | Braking dry / wet | Skidpad | Handbrake | Checks |
    |---|---|---|---|---|---|---|---|
    | Bilge Rat (`bilgerat`) | boat | 0-100 2.60 s (2.6), on water | 228.7 (230) | - | - | the rudder turns it 1.97 rad/s at 120 u/s; a quay stops it | 4/4 |
    | Brute (`brute`) | car | 0-200 2.00 s (2) | 294.7 (295) | 44.6 / 53.6 u | 300 | 7.26 rad/s, 90° | 7/7 |
    | Cortez (`cortez`) | car | 0-200 2.41 s (2.4) | 259.8 (260) | 41.0 / 51.0 u | 283 | 5.87 rad/s, 89° | 7/7 |
    | Retiree (`retiree`) | car | 0-200 3.41 s (3.4) | 224.8 (225) | 46.7 / 57.8 u | 233 | 4.33 rad/s, 65° | 7/7 |
    | Fed Sedan (`fedsedan`) | car | 0-200 2.21 s (2.2) | 279.7 (280) | 39.1 / 48.7 u | 301 | 5.36 rad/s, 90° | 7/7 |
    | MPD Cruiser (`cruiser`) | car | 0-200 2.11 s (2.1) | 304.6 (305) | 38.1 / 47.5 u | 309 | 5.78 rad/s, 89° | 7/7 |
    | MPD Eye (`eye`) | heli | its point 600 u off in 4.15 s, held there | 240.0 (240) | - | - | climbs 90 u/s | 4/4 |
    | Hauler (`hauler`) | truck | 0-100 2.12 s (2.2) | 200.3 (195) | 15.8 / 19.8 u | 160 | 1.16 rad/s, 17° | 7/7 |
    | Medic (`medic`) | truck | 0-100 1.95 s (2) | 214.3 (210) | 14.4 / 18.0 u | 176 | 1.46 rad/s, 25° | 7/7 |
    | MPD Rhino (`rhino`) | truck | 0-100 2.58 s (2.6) | 196.2 (190) | 16.7 / 20.9 u | 151 | 1.46 rad/s, 26° | 7/7 |
    | Strongbox (`strongbox`) | truck | 0-100 2.91 s (3) | 175.3 (170) | 17.8 / 22.3 u | 140 | 1.22 rad/s, 19° | 7/7 |
    | Hookline (`hookline`) | tow | 0-100 2.29 s (2.3) | 199.3 (200) | 15.1 / 18.9 u | 166 | 1.80 rad/s, 37° | 7/7 |
    | Drill Rig (`drillrig`) | tow | 0-100 2.59 s (2.6) | 184.3 (185) | 16.2 / 20.2 u | 155 | 1.56 rad/s, 31° | 7/7 |
    | Pumper (`pumper`) | truck | 0-100 2.77 s (2.8) | 180.3 (180) | 17.6 / 22.0 u | 142 | 1.24 rad/s, 19° | 7/7 |
    | Saint (`saint`) | car | 0-200 2.70 s (2.7) | 284.6 (285) | 40.5 / 50.5 u | 256 | 4.58 rad/s, 79° | 7/7 |
    | Sparrow (`sparrow`) | bike | 0-100 2.34 s (2.4) | 149.6 (150) | 13.3 / 16.6 u | 192 | 2.60 rad/s, 19° | 7/7 |
    | The L (`thel`) | rail | - | 210.0 (210) | - | - | stops at all 4 platforms 0.0 u off; waits 5.49 s (dwell 5 ±.6) | 3/3 |
    | Vandal 600 (`vandal`) | bike | 0-200 2.01 s (2) | 319.6 (320) | 40.2 / 50.0 u | 361 | 3.08 rad/s, 34° | 7/7 |
    | Zephyr GT (`zephyr`) | car | 0-200 1.60 s (1.6) | 339.7 (340) | 34.0 / 42.5 u | 406 | 6.53 rad/s, 89° | 7/7 |

  Verdict: pass.
- **M4 · getting in and out** (`tests/sim/vehicles.test.mjs`, 17 tests):
  - getting in, getting out and carjacking from all four sides (the driver is yanked out and thrown down; BUS
    `carjack`);
  - a police car's break-in (TUNE.breakIn seconds, a crime); a bike mounted at once;
  - the dive roll above the bail-out speed; the door across when the driver's door is blocked;
  - a boat is left only beside dry ground;
  - in play, through the real bindings: E gets in, W drives, E gets out, and parked cars sleep.

  Verdict: pass.
- **M4 · towing, damage, chains:**
  - a tow joint stays stable for 60 s of driving round a loop, and lets go on ○;
  - chained explosions: a car blown up sets off the cars beside it, and a burning car goes up TUNE.burnTime later;
  - a car rolled over in the air lands on its roof and burns; a crashing bike throws its rider;
  - fast cars knock peds down, slow ones push them aside; a lamp falls and a hydrant bursts;
  - a land vehicle in deep water sinks and its driver swims ashore;
  - the Loop gap's open end: a car flies off, lands below and drives on;
  - the car bomb (ignition and remote) and the mods: nitro, the oil slick, a mine, the roof MG, the water cannon,
    the tow hook.

  Verdict: pass.
- **M4 · Lowtown's fleet:** when the city loads, 84 cars and bikes park along the curbs by neighbourhood (each definition's zones and weight) and 17 landmark vehicles at their landmarks; the Bilge Rat moors at the marina, two L trains run the elevated line and the MPD Eye patrols: 103 vehicles (88 cars, 5 trucks, 2 tow trucks, 6 bikes, a boat, a heli) and 2 trains.
  - Every parked vehicle stands wholly on the road, out of the junctions and from under the ramps, and none is moved
    by play's first second (a test). Cars had been parked under the Loop's ramp ends, and the first step shoved them
    out: the Medic went 109 u onto the sidewalk.
  - Landmarks' vehicles stand by their doors: two cruisers and the Rhino at the precinct, the Medic by the hospital,
    and so on.
  - The L's two trains run the elevated loop and stop at its stations (both tracks); they kill what stands on the track (a test).
  - The MPD Eye flies its patrol at 150 over the four neighbourhoods, its spotlight sweeping the street ahead.
  - The Bilge Rat waits in the marina's slip, alongside the south pier, bow out to sea (it had faced into the pier).
- **M4 · the model sheet** (`docs/media/m4/model-sheet.png`, `node tools/model-sheet.mjs`): every definition alone in
  the garage, in ISO by day and by night (lights and sirens on), TOP-DOWN and MODE 7. 19 rows of 4 shots. Verdict: every definition reads as what it is in every view, the variants apart from their base
  (the Retiree's wood and rack, the Fed Sedan's beacon and grille lamps, the Medic's crosses and bars, the Rhino's
  armour, the Strongbox's plates, the Drill Rig's mast); lights and sirens light at night; TOP-DOWN shows every vehicle
  whole. Fixed on the way: the far end's lamps showing through (the painter's order), the TOP-DOWN rear cut off
  (kept images), the heli framed off the top (the garage now frames a vehicle at its height), the boat invisible (its
  bob was NaN). Pass.
- **M4 · the renderer** (D16):
  - box models are drawn in a painter's order: parts a plane separates go far one first, and overlapping parts keep
    their roles' order, with outside parts placed by the face they poke out of;
  - a parked vehicle's kept image is sized for the view drawing it (TOP-DOWN no longer cuts the rear off a car
    facing up the screen);
  - faces tipped slightly down by a pitch or a lean are drawn (they went missing on a towed car's tail);
  - the water cannon leaves from its model's nozzle;
  - a bike or boat swings no door slabs, and a wheelie pivots on the rear tyre.

  Unit tests cover the order on a long truck: far end, flanks, roof bar, heading, roof, doors.
- **M4 · the shots** (`docs/media/m4/`), with verdicts:
  - `night-iso-precinct`, `night-top-precinct`, `night-side7-precinct`: the precinct's cruisers at night. Bars red
    and blue, beams lit, the break-in prompt. ISO is turned to look from the north, because the Loop's deck runs
    over the avenue. Pass.
  - `carjack-iso`: the driver's door open, mid-beat. Pass.
  - `chain-1`, `-2`, `-3-wrecks`: three cars going up in turn, ending as wrecks that burn and smoke. Pass.
  - `tow-hookline`: a Cortez on the Hookline's hook, its nose lifted. Pass.
  - `pad-lap-skids`: a lap of the pad, with skid marks and tyre smoke. Pass.
  - `marina-bilgerat`: the Bilge Rat moored in the slip, Dex on the quay. Pass.
  - `thel-iso`, `thel-top`, `thel-side7`: an L train on its deck over Neon Mile (ISO, the camera at its height),
    its roofs from above (TOP-DOWN), the line's pillars and deck up the street with the train small at its far end
    (MODE 7: a level camera puts the deck's 100 u above the view, the sheet has the train's own MODE 7). Pass.
  - `eye-night-spot`: the MPD Eye hovering over the precinct at night, its light bar lit and its spotlight on Dex. Pass.
  - `bike-greasy-spoke`: a Vandal 600 at the Greasy Spoke's curb, the ride prompt over it. Pass.
- **M4 · performance:** the gate scenario's stand-in cars now only top up the real parked cars near the focus to its 20 (they had been
  drawn on top of them). The ISO gate (`lowtown-gate`: the tour at night in the rain, 40 walkers, 20 cars),
  interleaved with M3's build on the same machine: M3 10.5, 13.1, 11.9 ms; M4 10.9, 11.4, 10.4 ms. The same within
  noise, and M4 adds every vehicle, the trains and the heli. This machine runs slower than the one the gate was set on
  (D13 measured M2 at 9.3-10.0 ms): both builds sit about the 10.4 ms gate, not inside it. That margin is carried to
  M7 and M13 (D10's levers; HANDOFF.md). TOP 9.1 ms (gate 12.7). MODE 7 14.0 ms, over its 12.7 as at M3 (15.2): M7's
  lever (D10). Update 0.5 ms a frame.
- **M4 · FAN-OUT A1** (D15, D16): 7 workers, one per class group, each in its own worktree. Each was held to its
  class's handling test and to a review of its own model sheet and close-ups. The main session merged each group,
  re-checked its looks under the renderer as it stood, and fixed in MOTOR what the workers reported:
  - the draw order;
  - TOP-DOWN's kept images;
  - parked cars creeping;
  - the cannon's nozzle;
  - bike doors;
  - the wheelie pivot.

  The worktrees came up at the first commit, and each worker checked out the branch head first (HANDOFF.md says
  how).
- **M4 · the gate:** `npm test` passes every step: lint, boundary, vendor, goal-sync, dist current, 172 unit and
  sim tests, the e2e smoke, replay and self-tests (the garage's: every definition's model and handling), and the engine
  checker.
