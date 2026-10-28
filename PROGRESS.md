# Progress: GRAND THEFT MOTO

Now: done (2026-10-23). M0-M13 are done, and every item of PLAN.md 15's Definition of Done holds as DECISIONS
amends it (D29: performance is out of it): `npm run test:full` passed every step on `154eb02` (the bot campaign at
100.0%, every mission and activity level through the bot on seeds 1-3 and through a pad, the soaks, the UI audit
also at HUD Huge, the shots matrix), CI is green, and the release docs are final. M13's acceptance, item by item, is
the last entry of the log below. The owner's directions of 2026-10-22 (D29): performance leaves the Definition of
Done (the hardware is unlimited; FPS targets and optimization come later), and the bots may play invulnerable (the
campaign plays `--god`; the mission bot's runs stay mortal).

Merged: the owner merged PR 2 (M5-M13) into `main` on 2026-10-23 (`1a1f955`), after PR 1 (M0-M4).

Next: `docs/HANDOFF.md`'s "What's left" list, L1-L8 in order (D32). L1, determinism across runtimes, is done (D33);
then the known limits (L2, D34), performance (D29's later), PLAN.md 19's backlog on Lowtown, the expansion's plan and
then its build, the platforms, and the owner's items. The `/goal` at the end of HANDOFF finishes the list.

Blockers: none. The run started inside the planning session (DECISIONS D5). At M4's close it was handed off (D16),
and the next sessions carried it from M5 on the branch `claude/compassionate-shannon-h7k7zk`, which is now spent.
New work goes on a fresh branch cut from `main`, in a new draft PR. A new session picks it up from
`docs/HANDOFF.md`'s `/goal`.

| Milestone | Status | Evidence (commits · tests · shots · perf) |
|---|---|---|
| M0 Bootstrap | done | see the acceptance log · `npm test` all steps pass (lint, boundary, vendor, goal-sync, dist current, 9 unit + sim, e2e smoke 6/6, engine check) |
| M1 Core + spikes | done | core, input, attract loop (`c76395c`); S2 floor and scale (`064fcae`): GTM-PATCHes 1-3, floor chunks, the scale yard · ISO 5.4-6.1 ms standing, 7.6 ms lap, 10.0 ms lap at zoom .65; S1 depth renderer (`dda0356`): SIDE7, TOP, the Stage, the view lab · TOP 6.1-6.2 ms, SIDE7 11.3-11.9 ms with 41 rigs; S3 vehicle physics (`7039af1`): the handling suite, the pad, the replay round-trip; the frozen contracts, D10 budgets · 69 unit + sim tests, 2 e2e · `docs/media/m1/` |
| M2 Lowtown + ISO | done | the world layer, Lowtown, the street painter, the city renderer, the cut-away (`b781439`); the quarter turn, the speed zoom, the clock and sky, night ISO in budget (`fe4f6dc`); weather, the drawbridge, the stand-in crowd and the gate (`8f175be`); roofs, shopfronts, yards, the shot matrix and the acceptance (this commit) · ISO at the gate 9.3-10.0 ms · 86 unit + sim tests · `docs/media/lowtown-map-sheet.png`, `docs/media/shots/` |
| M3 On foot + combat | done | saves, weapons, vitals, fire (`edec102`); the crew on foot, combat, the wheels, the switch, the range (`42c3054`); the accept tests, the view lab, the self-tests, perf (this commit) · ISO at the gate the same as M2's build, interleaved · 114 unit + sim tests, 3 e2e suites · `docs/media/m3/` |
| M4 Vehicles | done | the models registry, the class bodies, the Fleet, boarding, damage, the renderer, the handling bench (`b442d89`); Lowtown's fleet, driving in play, the accept tests (`f198207`, `a7eb6ae`, `87c52c9`); FAN-OUT A1's 19 definitions, the painter's order, the fixes its reviews found (`f61bf2e` to `c9e3ef6`); the acceptance and the handoff (this commit) · 172 unit + sim tests, 3 e2e suites · ISO at the gate the same as M3's build, interleaved; TOP 9.1 ms · `docs/media/m4/` (the model sheet, 15 shots) |
| M5 Roads, traffic, peds | done | the roads and the traffic (`6e94f04`); the sidewalks, the crowd, its reactions and witnesses, the emergency services, the Marching Mimes, the AutoPlayer core, the soaks and the evidence (this commit) · 184 unit + sim tests, 3 e2e suites, the 10-minute city soak in test:full · ISO at the gate 12-23% faster than M4's build, TOP-DOWN and MODE 7 the same, interleaved (measured with M5's tour stuck at its start: corrected at M6) · `docs/media/m5/` (13 filmstrips, 5 shots) |
| M6 Wanted, police, gangs | done | the crimes and the wanted level, the police by tier with the Eye, roadblocks and spikes, NABBED and WRECKED, the respray and the bribes, the gangs with respect, turf, cars and turf wars, the radar (`a1a65cb`); what the 10-minute city soak found with gangs and police about, and the gate (this commit) · 201 unit + sim tests (wanted 11, gangs 5), 3 e2e suites, the 5-minute gang sim and both city soaks pass in test:full · ISO and TOP-DOWN the same as M5's build, MODE 7 within the tolerance, interleaved (the tour fixed in both) · `docs/media/m6/` (10 filmstrips) |
| M7 TOP + SIDE7 + bank | done | the view manager, MODE 7's lens, Auto-rail and sky, the camera rig (`a856add`); the bank with its guards, CCTV, doors and takedowns, the indoor cut-aways, the occluder fixture, the draw levers and the acceptance (this commit) · 220 unit + sim tests (the bank 9), 3 e2e suites (the occluder's self-test), `check.mjs` on `#interior/bank` · TOP-DOWN inside its gate; ISO (about 11.4 against 10.4) and MODE 7 (about 18 against 12.7) carried to M13 (D20) · `docs/media/m7/` (16 shots, the chase strip) |
| M8 Missions + economy | done | the runtime and its ops, the mission bot and the pad pilot, the economy, the activity frameworks, the career's cards and saves, S1 (`e88f1e2`); the screens at 10 feet (`ddab2bf`); the bot campaign and `--par` (`571b184`); FAN-OUT A2: the Rats (`eaf255b`), H4 and the Gnomes (`4d51758`), the MOTOR backlog (`b4a2344`), H1-H3 (`7e10815`), the jobs, races, MAYHEMs, tokens, stunts, events, S2, S3 and P0 (`5550aad`); the campaign's fixes (`e8a38a7`, `047726b`) · 312 unit + sim tests · all 14 missions and every activity level through the bot on seeds 1-3 (96/96) and through the pad (32/32); the bot gym 13/13 both ways · `docs/media/m8/` (8 shots) · the bot campaign at 100.0% in 2.15 h of game, every mission at its first try (`5c7c2ef`, M13 part 5) |
| M9 10-foot UI | done | the UI layer and kit, the HUD on it, every screen of 8.18, our own pause, settings that reach play, onboarding, the audit (`b1ff7bb`, D23) · `tools/ui-audit.mjs` 238/238 stops at 1080p and 720p by pad, keyboard and mouse · 268 unit + sim tests (ui 8 + 5) · `docs/media/m9/` (18 shots) · perf: M13's pass, interleaved |
| M10 Audio + radio | done | GTM-PATCH 5 (the buses), MOTOR's sequencer, composer, radio and voices, four stations, the score cues (`b2ea884`, D24) · unit audio, sim audio (the hash the same with sound), e2e audio (each station's RMS, the music bus, mute, a bounded soak) · 277 tests |
| M11 Attract + kiosk | done | the Director and its five reels, cards, the camera plan, the watchdog, leaving on any input, the kiosk and phone (`52b3980`, D25) · the soak 30 min x seeds 1-3 headless and 5 min drawn, all pass · director 4, attract sim 18, attract e2e 24 checks · `docs/media/m11/` (11 shots, the Joyride MP4 and GIF) |
| M12 Proving Ground, docs | done | photo mode, the dev menu, overlays and tuning pages, the Proving Ground's zones with their self-tests (`13af740`); the 15 content recipes and their tests, District 2, songs and signs as content (`d5fd83a`, D26) · 312 unit + sim tests, 15 recipe tests, 12 self-tests · `docs/media/m12/` (21 shots) |
| M13 Polish + release | done | the rumble profiles, TUNING.md generated, draw-side profiling, the look notes (part 1, `ad788f4`, D28); the respray's bay, the sodium streetlamps (part 2, `839a4c5`); the perf pass's levers, the gate read against M2's build (part 3, `f7847f0`); FAN-OUT B's 47 findings fixed, performance out of the Definition of Done, bots that may play god (part 4, `7b1980f`, D29); the bot after FAN-OUT B, busier roofs and Neon Mile's neon (part 5, `9843969`), the shots matrix with its verdicts, the campaign's stalls fixed to its 100% (part 5, `6efaf9c` to `5c7c2ef`, D30); what test:full and the audit found on the way: the gang shoot-out's tip, the page from a static server, the 10-foot UI at HUD Huge (`293a2b9` to `154eb02`); test:full on `154eb02`, every step, and the Definition of Done item by item · 343 unit + sim tests, 78 review tests (`tests/review/`), 15 recipes · `docs/media/shots/` (12 ISO shots, 4 contact sheets, the bank in each view) |
| L1 Determinism across runtimes | done | MOTOR's deterministic Math (`src/motor/core/dmath.js`, V8 12.4's fdlibm and `hypot` in plain arithmetic, bit for bit Node 22's own) installed by the prelude before the engine; a car's drawn explosion no longer stops the clock; `tests/e2e/cross-runtime.mjs` in the gate (D33) · test:full passed every step on `81a34ee` (100 min 36 s, the campaign at 100%), the gym 13/13 both ways · see the acceptance log |
| L2 The known limits | done | the glows' halos cut by the walls in front, riders at their saddles, the bot's cover on the lanes under the decks, the last stretch's unstick, the pocket's restart, a tow truck lined up in the road, the campaign's jobs from the middle of town, the gym in test:full; three stars, a passer-by and a long truck's corners kept (D34) · closed on b7b7556: test:full passed, alone, in 107 min 43 s · see the acceptance log |
| L3 Performance | done | crowd bodies redrawn into a pixel array and put by the box they cover, MODE 7's faces and images stopped where nearer walls hide them, its decks a row at a time, its city gathered from the lens's wedge, its far bodies, cars, props and decks faded into the haze, a body by its lens kept and enlarged; the Graphics setting (part 1); the perf gate back in test:full, five rounds (D35) · the reading of record: ISO 10.25 ms (10.4), TOP-DOWN 9.05 (12.7), MODE 7 12.13 (12.7) · closed on a70cd51: test:full passed, alone, in 117 min 20 s (its perf gate: 10.01, 8.86, 12.07) · see the acceptance log |
| L4 PLAN.md 19's backlog | done | the chase camera (a fourth view), photo filters, SURF CITY and VELVET, Paramedic and Tow Truck, the player-flown helicopter (SkyCam), boarding the L (L Courier), Club Chrome's interior, CHROME RAIDERS on its cabinet and Arcade high scores on the checklist (D36) · each through the bot on seeds 1-3 and a pad, the gym's rail, fly and arcade fixtures both ways, a recipe for each new kind · the look read and fixed (docs/media/l4) · see the acceptance log |
| L5 The expansion's plan | done | `docs/EXPANSION.md` in PLAN.md's form: Ironside and Glass Heights, three gangs a district (seven in all), 18 missions with two heists (32 in the game), the bridges opening with the story one map at a time, planes, boats and three weapons; milestones X1-X8 with their acceptance and a Definition of Done; its scope recorded before any of it is built (D37) |
| X1 Districts in play, Ironside's map | done | Ironside, District 2, grown from its stub (128 x 112: the Foundry, Scrapyard Flats, Voltage Row); the west bridge between it and Lowtown, closed until The Big Withdrawal is done; a crossing carries the vehicle, the crew, the time, the stars and the view, one map at a time across a fade; the career per district, `save.district` (D38) · the districts' sim tests in every view, Ironside's 10-minute soak, all merged content again (D21) · the look read (docs/media/x1) |
| X2 Planes | done | a `plane` class (on its gear a slow car, in the air banked turns, a climb that costs speed, a stall, a landing level, slow and gentle); the Duster on Ironside Airstrip's apron and the Gull on the water; the bot flies them, off a clear run, to a point, down on a strip and taxiing (D39) · the planes' sim tests, the handling suite's plane checks, the gym's `plane` fixture on seeds 1-3 and through a pad, all merged content again (D21) · the look read (docs/media/x2) |
| X3 Ironside's gangs and missions | done | the Rust Monks (the Scrap Cathedral, the Scrapper, the Nail Gun) and the Volt Boys (Substation 9, the Bucket, the Tesla Coil), the Gnomes' Ironside turf and HQ (a gang's HQ and rival per district); nine missions (Picket Line, Scab Labour, Holy Scrap, Sermon on the Mound, Live Wire, Short Circuit, and Blackout's Grid Map, The Lineman and finale) with the Power Station, an interior (D40) · each mission through the bot on seeds 1-3 and through a pad, the interior's validation and sim tests, the gangs', vehicles' and weapons' tests, all merged content again (D21) · the look read (docs/media/x3) |
| X4 Ironside's side content | done | Crop Duster (a flown job, three levels: rings over the allotments), the Ironside Air Race (the Duster through twelve gates, against the board's three best times), MAYHEM: Nail the Scrappers, three stunts (the Flyover's End, the Slag Heap, the Crusher Yard), 15 Moto Tokens, two properties (Sudsy's Launderette, the Airstrip), the Ironside Kwik-Lux's hold-up and the attract reel CROP DUSTER (D41) · each through the bot on seeds 1-3 and a pad, Ironside's side-content sim test, the campaign through Lowtown and Ironside to 100%, all merged content again (D21) · the look read (docs/media/x4) |
| X5 Glass Heights' map and the Causeway | done | Glass Heights, District 3 (128 x 112: Cathedral Hill, the Strip, Marina Heights; the Glass Tower and its jetty, St. Chrome's, the Bellevue's penthouse, the Observatory, the Velvet Casino, the Hotel Riviera, the Grand Palms, Heights PD, Heights General, the Yacht Club and the marina's piers, the Gull at its moorings); the Loop Causeway over the bay, shut in Lowtown's sea wall until Blackout is done (D42) · Glass Heights' sim tests in every view, its 10-minute soak, all merged content again (D21) · the look read (docs/media/x5) |
| X6 Boats, Glass Heights' gangs and missions | done | the Velvet Syndicate (the Velvet Casino, the Velvet limo) and the Yacht Club (the Club's pier, the Regatta, the Flare Gun), the Saints uptown at St. Chrome's; the Splash, the Regatta and Moneybags on the water, the AutoPlayer sailing round what lies moored; nine missions (Communion, High Mass, The Comp, Loaded Dice, Overboard, Flare Up, and House Edge's Floor Plan, The Gull and finale) with the Velvet Casino, an interior whose vault opens (D43) · each mission through the bot on seeds 1-3 and through a pad, the casino's validation and sim tests, the gangs', boats', planes' and mission verbs' tests, the gym's `boat` fixture on seeds 1-3 and through a pad, all merged content again (D21) · the look read (docs/media/x6) |
| X7 Glass Heights' side content | done | Limo (fares to the Heights' doors, smoothly: three levels), the Heights Regatta (ten buoys round the Heights by sea, against the Yacht Club's board), MAYHEM: Flare the Limos, three stunts (the Villa Pool, the Velvet Fountain, the Palms Newsstand), 15 Moto Tokens, two properties (the Glass Tower penthouse, the Marina berth), the Strip's Kwik-Lux's hold-up, Villa Marisol, the attract reel THE STRIP; the AutoPlayer's `smooth` style, TOP's sea past Glass Heights' edge (D44) · each activity through the bot on seeds 1-3 and a pad, Glass Heights' side-content sim test, the campaign over its tokens, stunts and properties, all merged content again (D21) · the look read (docs/media/x7) |
| X8 The full game, verified | done | the bot campaign across the three districts to 100% from the title's NEW GAME; the perf gate in each district and each view; the screenshot matrix in every district (the ten neighbourhoods by day, dusk and night in ISO, TOP-DOWN and MODE 7); the HUD's words on plates; what the campaign, test:full's soaks and D21 found, mended where it lives (traffic round wrecks and in boxes, a panicking driver seen in the box, the tyres at a crawl, the gangs' fights, the crowd's spawns, an ally's drive-by, the bot's way past dead ends; D45); the bot gym at peace, its tow's spot cleared · test:full alone on d9542e1: the campaign at 100.0% (5.63 h of game), D21 219 of 219 and through a pad 73 of 73, the gym 60 of 60 and 20 of 20, the soaks, the perf gate, the cross-runtime and UI checks · the look read (docs/media/x8) |
| L7 Platforms | done | a desktop wrapper (`desktop/`, Electron, its own package and lock: the page loaded unchanged from its file, full screen, sandboxed, the network shut, a DualSense granted to WebHID with no chooser) and the DualSense's own output report by WebHID (`input/dualsense-hid.js`, by USB and by Bluetooth) played from the game (`input/haptics.js`: R2 and L2 by the gun or the vehicle in hand, the light bar the character's colour and the stars, the rumble in the same report; the Gamepad API's rumble the fallback); SETTINGS, CONTROLS, DualSense haptics; QA-DUALSENSE 6-7 for the owner (D46) · CI's `desktop` job on 9890e8f: Electron under a virtual display, the game up, WebHID there, the network shut, a popup refused; the Linux build packed (an artifact) · test:full alone on 9890e8f · the look read (docs/media/l7) |
| L8 The owner's items | with the owner | prepared, nothing sent: the seven patches' issue texts (unchanged since the slice) with what L1-L7 put on them, and feedback F7 brought up to date (its header and F7.17-F7.22); the release docs final for the full game (ENGINE-ANALYSIS, the Source Information in README and on Credits & About); Credits' pages kept whole (a heading with its text, no paragraph's last line alone) and the UI audit through every page; the DualSense checklist and the PR's review for the owner (D47) · the audits 244 of 244 and 59 of 59 · the look read (docs/media/l8) · test:full alone on the PR's head, 5b55a08 |
| D48 The camera turns | done | the owner's request after L8: in every view a tap of the turn buttons turns a quarter, eased round, and held they spin; let go, ISO settles on the next of its eight rests (Final Fantasy Tactics and Xenogears), TOP-DOWN and MODE 7 stay at any angle (MODE 7 then drawn as the chase camera is); in the step, so the stick maps alike headless and in the page; the simulation never reads it (D48) · `tests/sim/camera-turn.test.mjs`, `tests/unit/depth.test.mjs` · the look read in each view by day, at night in the rain and in the bank (docs/media/d48) · test:full alone on 6600f53 |

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
- **M5 · section 8.7, the roads** (`tests/unit/roadgraph.test.mjs`, 5 tests; D17): every lane can be driven to and
  on from but the marked dead ends; turns are arcs a turning circle fits; crossing and merging connectors conflict;
  A* finds what Dijkstra finds on 1,000 random pairs, and a route across the city takes under 2 ms; NS and EW are never
  open together, each phase lasts its time, junctions are offset. Verdict: pass.
- **M5 · sections 8.9 and 8.10, the 10-minute soaks** (`tests/full/city-soak.mjs` in `npm run test:full`; 90 s of it in
  `tests/sim/city-life.test.mjs`): Lowtown in play, the focus hopping its 30-odd sights every 20 s (each hop fills the
  disc afresh), watched every step.

  | | Day, clear (600 s) | Night, rain (300 s) | Bound |
  |---|---|---|---|
  | Cars seen (at most at once) | 1,119 (39) | 333 (19) | |
  | Cars inside each other | 0 | 0 | 0 |
  | Longest stall without a cause | 1.6 s | 0.4 s | under 20 s |
  | Red runs by calm drivers | 0 | 0 | 0 |
  | Mean speed (stops and queues in) | 40.8 u/s | 44.7 u/s | 20-90 |
  | Cars or peds put down in sight | 0 | 0 | 0 (the fills aside) |
  | Peds seen (at most at once) | 3,560 (193) | 630 (58) | |
  | Longest a ped stood stuck | 12.5 s | 0.25 s | 15 s |
  | Longest wait at a crossing | 28 s | 13.5 s | a cycle, 30 s |

  The first runs found what the probes had missed, each fixed at its cause (D18): cars put down on top of one another
  in the same step; cars put down in a junction's mouth, already past their stop line on a red; the long file of a
  troupe reaching inside its ring; a car far off its lane put back on it onto the car beside it; a dozen peds held 54 s
  at the long crossing over an avenue, on their own walk light. Verdict: pass.
- **M5 · the reactions** (`tests/sim/city-life.test.mjs`, 7 tests):
  - a shot among ten peds 30-110 u off: the ones that flee (at least eight; the rest may stand back and phone it in)
    are all farther off 2 s later, on average by more than 60 u;
  - an assault seen is phoned in: a `report`, the police sent and on the scene; killing or scaring the witnesses
    first cancels the call (the killing itself is another crime, and may be reported);
  - a body brings the Medic, a paramedic kneels at it and the unit leaves; a fire brings the Pumper, and its cannon
    puts cells out;
  - the Marching Mimes: six in single file 18 u apart, on their leader's trail; hurt one and all six fight the one
    who did it; flatten all six with a vehicle and ENCORE! comes once;
  - the same seed gives the same city (traffic, crowd and services) after 20 s, in ISO, TOP-DOWN and MODE 7.

  The page and the harness run the same city step for step (compared frame by frame for 12 s at the Greasy Spoke).
  Verdict: pass.
- **M5 · the AutoPlayer core** (8.20; `?auto=<poi>`): from the Greasy Spoke it runs the 355 u to the safehouse on the
  sidewalks (3.3 s); from the safehouse it takes the nearest car (in it at 6 s), drives the GPS route to the precinct,
  1,255 u off, through the traffic and its lights, gets out at the lane point nearest it and walks the rest: there at
  91 s. Verdict: pass.
- **M5 · the filmstrips** (`docs/media/m5/strip-*.png`, `node tools/reaction-strips.mjs`: seeded, virtual time; a step
  that waits for a unit is timed headless first, on the same simulation), with verdicts:
  - `idles`: six peds lined up before the Greasy Spoke, each in another idle (phone, chat, dance, smoke, text, hailing
    a cab). Pass.
  - `bench`: a ped seated on a bench, facing the street. Pass.
  - `flee`: six peds round Dex; on the shot they turn and run, each away from him, out of frame within a second. Pass.
  - `cower`: three peds aimed at raise their hands and hold. Pass (the crouch under the clip is slight).
  - `fight`: a tough ped hit by Dex squares up and trades punches, sparks on the hits. Pass.
  - `knockdown`: two peds hit hard fly back, land and lie. Pass.
  - `witness`: of four peds who saw an assault, one stops, faces it and lifts a phone to its ear. Pass.
  - `police`: the cruiser at the curb, its light bar going; an officer walks up from it and looks round the scene, a
    second searches beyond the lamp. Pass.
  - `medic`: the body at the corner by the lamp, a paramedic kneeling at it and another standing by, Dex beside them
    (the passers-by round it cleared for the shot: the corner is busy at noon). Pass.
  - `pumper`: petrol alight in the street, spread by its burning runners; the Pumper parks in it with its lights
    going, and its roof cannon throws a white jet across the flames, which die back where it lands (Dex given the
    health to stand in it for the shot). Pass (the jet had never drawn: D18).
  - `mimes`: six white-faced mimes in black caps walk in file along the sidewalk past Dex. Pass (13 u apart they read
    as a clump; 18 now: D18).
  - `mimesAttack`: Dex hits one; the troupe closes on him at once, a brawl of sparks and blood. Pass.
  - `rain`: dusk in the rain: a few of the crowd sheltering under the café's awning beside Dex, the street empty.
    Pass.
- **M5 · the shots** (`docs/media/m5/`, `node tools/shots.mjs`, 1920×1080), with verdicts:
  - `crowd-iso`: noon at the Greasy Spoke in Palm Terraces: about thirty people on the corners and the crossings, a
    knot waiting at the far crossing, cars parked and passing, Dex by the café. Pass (the first take, with the crowd
    spread over the traffic's disc, showed two people: D18).
  - `crowd-top`: the same corner in TOP-DOWN: people on both crossings and along the sidewalks, seen from above. Pass.
  - `crowd-side7`: the same corner in MODE 7: the sidewalk and the crossing busy up to the park. Pass.
  - `traffic-plaza`: the Neon Mile plaza at noon: people round its edges, traffic and parked cars round it, the MPD
    Eye on its patrol over Dex. Pass (its searchlight beam showed at noon: now drawn only after dark).
  - `night-rain-neon`: the First Lowtown Bank at night in the rain: the street lamps' pools, a few people out in the
    wet, one crossing. Pass.
- **M5 · performance** (`tools/perf.mjs`, interleaved with M4's build, `main`, on the same machine). The session's
  machine was replaced during M5 by a slower one: M4's own build now draws the ISO gate in 25.8-30.9 ms (10.4-10.9 ms
  at M4), so only the comparison reads across machines.

  | Scenario (night, rain; the gate's 40 peds and 20 cars in view) | M4 draw | M5 draw | M4 update | M5 update |
  |---|---|---|---|---|
  | ISO, the tour at 300 u/s (`lowtown-gate`, 4 rounds) | 25.8-30.9 ms | 20.4-26.2 ms | 2.0-2.6 ms | 4.2-6.1 ms |
  | TOP-DOWN, the tour (2 rounds) | 20.0-20.3 ms | 20.5 ms | 1.9 ms | 3.6-3.7 ms |
  | MODE 7, the tour (2 rounds) | 31.7-34.8 ms | 30.2-33.3 ms | 2.1-2.3 ms | 5.0-6.0 ms |
  | ISO, standing at the bank (`lowtown-walk`, no stand-ins, 2 rounds) | 14.1-15.2 ms | 16.9-17.1 ms | 1.2-1.4 ms | 4.5-4.7 ms |

  - **The draw:** ISO 12-23% faster than M4's build in every round (p90 30-32 ms against 45-51), TOP-DOWN the same,
    MODE 7 the same within noise. The crowd's own ring puts real peds where the gate's stand-ins stood, and a body
    off the screen no longer queues a shadow. Standing at the bank, with no stand-ins, the real crowd and traffic cost
    about 2 ms. Scaled to the gate's machine: ISO about 9 ms (gate 10.4) and TOP-DOWN about 9 ms (gate 12.7), inside;
    MODE 7 about M4's 14 ms, over its 12.7 as at M3 and M4: M7's lever (D10). (Corrected at M7: that scaling used M4's
    ratio for every view and read low. Read against M2's own build, view by view in the same rounds (D20), M5's ISO
    was about 11-12 ms on the gate's machine, over its 10.4; see M7's performance.)
  - **The update** is per frame: at the 22-28 fps this machine reaches, a frame takes 4-5 steps of 1/120 s, so the
    city costs about 1 ms a step here (budget 1.5 ms, D10), less than half that on the gate's machine.
  - **Found on the way** (D18): every body within 600 u queued its contact shadow before the on-screen test, and the
    depth views (TOP-DOWN, MODE 7) drew every crowd body in reach, on the screen or not: TOP-DOWN had been 30-45%
    slower than M4's build before both were culled. MODE 7's far, small bodies are redrawn half as often.
  - **Corrected at M6:** M5's build never toured in these runs. The tour's body stopped dead against a car or a body
    on its line, and in M5's build one stood at the tour's start: the M5 column above was measured standing still, so
    "12-23% faster than M4" does not hold. M6 fixed the tour and measured again against M5's build with the same fix
    (M6 · performance).
- **M5 · the gate:** `npm test` passes every step: lint, boundary, vendor (28 files with the mocap cut set, 6
  patches), goal-sync, dist current, 184 unit and sim tests, the e2e smoke, replay and self-tests, and the engine
  checker. `npm run test:full` adds the city soak (`tests/full/city-soak.mjs`: 10 minutes by day, 5 at night in the
  rain), and passes. Decisions in D17 and D18.
- **M6 · section 8.13, the wanted level and the police** (`tests/sim/wanted.test.mjs`, 11 tests; D19):
  - a crime nobody sees earns nothing; four onlookers who see a murder phone it in: one star, 45 heat, filed as a
    report; the same four killed before their calls go through: no report, no stars;
  - an assault in an officer's sight is filed by the cop at once with 22.5 heat (half again a report's 15): one star;
    speeding with nobody watching earns nothing, past a cop it is filed;
  - the stars come at 20 / 60 / 150 / 300 / 600 heat, one at a time; each tier's response goes out within 4 s of its
    stars (a cruiser at 1 and 2, the Eye at 3, SWAT at 4, the Feds at 5; no Eye below 3, no SWAT or Feds below 4);
  - at 3 stars at night the Eye is over the player within 30 s, its light on them; at 2 it goes back to its patrol;
  - a chase (the AutoPlayer driving, 4 stars): a roadblock and a spike strip go down ahead of the car, inside the
    annulus; a car driven over the strip goes flat;
  - hiding: seen, then out of every unit's sight, the stars clear 15.15 s later at 2 stars (`evade2` 15), the search
    circle widening meanwhile;
  - 96 u up an alley a unit with a 160 u sight doesn't see the player (on a street, the same line does); under the
    Loop the Eye sees nothing, out in the open it does;
  - the respray: at Spray & Pray out of sight, 2 stars gone for $100 and another colour; with a cop watching, nothing;
  - NABBED: cuffed standing armed, or running unarmed; not running armed; at the door of a stopped car after 1.5 s;
    not in a moving one; never at no stars; then the precinct, $250 bail, the guns taken and the Snap kept, the stars
    cleared. WRECKED: the card, the hospital, its $100 bill, the stars cleared;
  - a chase is the same in every view: 3 stars and the Saints hostile for 20 s hash alike in ISO, TOP-DOWN and MODE 7.
- **M6 · section 8.14, the gangs** (`tests/sim/gangs.test.mjs`, 5 tests; `tests/full/gang-soak.mjs` in test:full):
  - respect: a Saint killed by the player -5 with the Saints and +1 with the Gnomes (their rivals are the Saints); a
    Rat -5 with the Rats and +1 with the Saints; one killed by someone else, nothing; a Rats car shot -2, again at once
    nothing, 10 s later -2 again; capped at 100 and -100; each change on the BUS;
  - hostility: at -19 two Saints in Neon let the player be, at -20 both come for them; at -40 in Palm Terraces (not
    their turf) nobody comes;
  - friendly: at 40 a Saint lets one punch go and not a second, and the Saints near go for a Rat who hits the player;
    at 39 the first punch starts a fight;
  - gang cars: at Neon's middle the Saints' cars (a share of the traffic, a Saint at each wheel) stay in Neon (under
    5% of a minute's samples out). By the Neon / Harbor line the one-way streets carry some over the border; out of
    their turf they are routed home;
  - a turf war breaks out by itself on seed 1 by the Neon / Harbor line, the Saints against the Rats, 18 s in, and
    ends 10 s later;
  - the 5-minute gang sim (seed 1, the focus touring the borders and HQs a minute at a time): no errors, 5 turf wars,
    all ended, at most 23 members and 17 fighters at once, the longest fight 15 s, nobody's respect moved.
- **M6 · the filmstrips** (`docs/media/m6/strip-*.png`, `node tools/reaction-strips.mjs --set m6`), with verdicts:
  - `cuffed`: at 1 star an officer runs up the sidewalk to Dex, standing unarmed at the Greasy Spoke's door (Viv a few
    steps along), and stops face to face; the bust camera closes in, NABBED. Pass.
  - `door`: Dex in a stopped Cortez; the officer walks up its side to the driver's door and waits there; the bust
    camera, NABBED. Pass.
  - `shootout`: at 2 stars two officers stand off and fire in bursts, one on the sidewalk, one across the street
    stepping round the parked car in his line of fire; a muzzle flash in the last frame. Pass.
  - `eye`: 3 stars at night: the Eye flies in over the roofs, its beam down across the Greasy Spoke to a white pool at
    Dex's feet. Pass.
  - `roadblock`: a cruiser across the lane with its officer at his post, a spike strip before it; a Cortez sent over
    the strip throws sparks off its rims and runs on to the cruiser. Pass (the strip had been dark on dark asphalt:
    now steel with bright teeth and yellow ends).
  - `hostile`: the Saints at -20: Dex crossing a Neon street; two Saints on its far sidewalk turn to him, aim and
    fire, and from the seventh frame he is hit. Pass.
  - `turfwar`: three Saints and three Rats at the Neon / Harbor line: the Rats cross the avenue to the Saints' corner,
    shots, blood and a Molotov's flames among the Saints; Dex looks on from the side, his feet in x-ray behind a
    planter's wall. Pass.
  - `respray`: at 2 stars Dex rolls a red Cortez into Spray & Pray; it comes out blue, RESPRAYED -$100, the stars gone.
    Pass.
  - `wrecked`: shot dead at 3 stars: the fall, WRECKED, then a cut to the sidewalk in front of Lowtown General, Dex on
    his feet in the first frame there. Pass.
  - `lineup`: along the sidewalk, each gang's grunt and enforcer (the Saints in cyan, the Rats in yellow, the Gnomes in
    pink with their pointed hats), an MPD officer, a SWAT trooper (helmet and mask) and a Fed (white shirt). Pass.
- **M6 · look notes fixed on the way:**
  - The Greasy Spoke's sign was drawn over Dex at its door (a lamp beside it lifted the board's order) and then,
    ordered by one end, under its own wall: boards are now drawn in slices along their wall, each ordered at its own
    spot.
  - The radar had drowned in red (every car's and the Eye's sight filled, the turf hatched densely): cones show only
    while wanted, a car's or the Eye's sight as a faint ring, the hatching sparser, the empty stars outlined.
  - **Viv's hangout is the Greasy Spoke**, and `#play/greasy-spoke` put Dex on her very spot: every strip taken there,
    M5's too, showed the two as one body (Viv's grey over Dex's red: the "officer cuffs Dex" of the first takes cuffed
    that blend). A deep link to another member's hangout now puts that member a few steps aside.
  - WRECKED: the revived body had still shown the fall for a frame (the rig's get-up eases over a third of a second):
    it is played out at once. And the hospital's respawn stood behind its forecourt's palm: it is now the sidewalk in
    front.
  - The strips' framing: the filmstrip page draws a 432×243 buffer, not 480×270, so the radar had sat in some crops and
    the lineup's gangs behind it; a crop past the right edge showed black; the turf war and the hostile Saints had Dex
    in their line of fire, the shootout's second officer was out of the frame and the Eye above it, and the respray's
    car had stopped short of the shop (no paint). Restaged and reframed.
- **M6 · performance** (`tools/perf.mjs`, interleaved with M5's build, `04f8c94`, on the same machine; both builds with
  the tour fix below, M5's applied to a worktree of `04f8c94`):

  | Scenario (night, rain; the gate's 40 walkers and 20 cars in view) | M5 draw | M6 draw | M5 update | M6 update |
  |---|---|---|---|---|
  | ISO, the tour at 300 u/s (`lowtown-gate`, 3 rounds) | 24.9-31.0 ms | 25.9-28.1 ms | 4.6-7.1 ms | 4.7-5.4 ms |
  | TOP-DOWN, the tour (2 rounds) | 15.8-17.5 ms | 17.6 ms | 3.4-3.9 ms | 3.8-3.9 ms |
  | MODE 7, the tour (2 rounds) | 28.6-29.5 ms | 30.8-35.0 ms | 5.3-5.7 ms | 5.8-6.4 ms |
  | ISO, standing at the bank (`lowtown-walk`, clear, 2 rounds) | 17.3-19.0 ms | 17.8-19.4 ms | 4.7-5.2 ms | 5.7-6.4 ms |

  - **The draw:** the same as M5's build in ISO, touring and standing; TOP-DOWN within noise. MODE 7 came out 13%
    slower over its two rounds (inside the gates' 15%), so it was profiled: a 10-second CPU profile of each build's
    MODE 7 tour drew alike (medians 38.2 and 39.1 ms under the profiler), every function's time within about a
    millisecond a second of the other's. The rounds' spread is where the tour's 12-second window falls.
  - **The update:** the police and the gangs (their senses, lines of sight and fighters) add about 1 ms a frame
    standing at the bank, about 0.25 ms a step at this machine's 4 steps a frame, and nothing measurable on the tour:
    about 1.5 ms a step here, about 0.5 on the gate's machine (budget 1.5, D10).
  - **Found on the way:** since M3 the perf tour had ridden at about twice its 300 u/s (its body placed along the leg,
    then moved on again by the velocity it was given), and it stopped dead wherever a car or a body stood on its line.
    M5's build stood at the tour's start in every M5 perf run and in this milestone's first runs too, where its ISO
    "tour" drew 19.5-22.5 ms against M6's 28.4-30.5: a 40% gap that was only M6's tour moving. The tour now keeps its own
    point, rides at 300 u/s and can't be held up. M5's record is corrected above.
- **M6 · the gate:** `npm test` passes every step (lint, boundary, vendor, goal-sync, dist current, 201 unit and sim
  tests, the e2e smoke, replay and self-tests, the engine checker), and test:full passes: the 5-minute gang sim (5 turf
  wars, all ended; at most 24 members and 25 fighters; the longest fight 22 s), and the city soak, by day for 10
  minutes (1121 cars and 3744 peds seen, at most 40 and 188 at once; mean speed 42.5; no overlaps, no red runs; the
  longest stall with no cause 11.9 s, the longest wait behind a unit at its scene 21.7 s; the worst stuck ped 9.75 s,
  the worst crossing wait 26 s) and at night in the rain for 5 (361 cars, 650 peds; mean speed 44.5; the longest stall 0.4 s, the worst crossing
  wait 13.5 s). Part 1 (`a1a65cb`) went up with the day soak
  still failing; what it found, the first with gangs and the police about, and what was fixed (D19):
  - units parked inside junctions, and kept for crews that were dead: they stop only on a lane, and a dead crew's car is
    left as any abandoned car, which the tow takes once it is out of sight;
  - a unit stopped just out of a junction (its call by the corner) left the car behind it on the connector, over the
    crossing, where no driver may go round: 30.5 s of a crossing held. A unit now stands with a car's room behind it
    past its lane's `clearS` (where a car's tail is out of the junction and off the zebra), on the nearest lane with
    room for that (and for a pass ahead, where there is one);
  - drivers entered a junction with no room to stop past the zebra beyond it, and a queue backed up over the crossing:
    a driver now waits at its line until there is room;
  - a car behind a unit at its scene with no way round (no room before the junction, the far lane busy, the crew in the
    street) stood with no cause: 23.5 s. It still tries to go round, and its cause is the scene; the soak reports that
    wait apart (10.4 s at most). The longest stall with no cause is now 1.8 s;
  - (part 2) a parked car shoved off its curb onto a zebra by the traffic held a ped (fleeing, then walking) 37.5 s at
    the curb: a ped held at a crossing's curb 20 s, longer than any light keeps it, now turns and takes another way;
  - (part 2) a far car going round something drove through it on its line (5 overlaps, a Medic in a Sparrow): it is
    now put beside its line by the pass's offset, as a near car steers;
  - (part 2) the probe's other "37 s at a lit crossing with no car on it" was a body lying at the curb, which the soak
    already leaves out.
  `tests/sim/city-life.test.mjs` holds the three rules: a unit at its call stands with a car's room behind it past its
  lane's `clearS` and room ahead; a driver at the line waits while the car past the zebra leaves no room behind it, and
  goes when it does; a ped at the curb of a crossing a car stands on goes another way after 20 s (201 tests).
- **M7 · section 8.2, the view manager** (`tests/unit/views.test.mjs`, 4 tests; one in `tests/sim/city-life.test.mjs`):
  - memory (TUNE `camMemory`): the view chosen on foot and the one in a vehicle each come back on getting out and in;
    the view the scene opens in (a deep link's) stays until the player picks another;
  - Auto (TUNE `camAuto`, off by default): ISO on foot, TOP-DOWN past 55% of top speed in a vehicle, ISO again below
    30%; the player's own R3 holds until they get in or out;
  - every switch, and every turn of MODE 7's rail, dissolves the last frame into the live view through a 4x4 Bayer
    order over 0.35 s (TUNE `viewFade`), over the world and under the HUD; into ISO, the buildings stand as flat
    blocks under it while the walls bake;
  - switching views (R3's cycle) and turning the camera mid-run, the AutoPlayer driving across Lowtown, leaves the sim
    hash unchanged (every view visited, the car driven over 300 u).
- **M7 · section 8.5, the depth renderer** (`tests/unit/depth.test.mjs`, 4 new tests):
  - MODE 7's lens on foot (h 70, the focus 110-260 ahead, fov 50) and in a vehicle (h 90, 160-380 ahead, the fov
    widening to 62 at top speed), eased between them;
  - Auto-rail (TUNE `autoRail`): the rail turns to the axis a vehicle has held for 1.5 s, through the crossfade; not to
    a wobble, a crawl or the way it already faces;
  - the TOP climb is continuous: H rises with speed with no step over 10 u a frame, and comes back down;
  - the camera rig (`stage.setRig`): every view held on a point, a zoom and a heading (photo mode, cut-scenes);
  - MODE 7's sky: the hour's backdrop above the horizon, its skyline turning with the rail (the yaw parallax), its
    foot fading into the haze. Shots in `docs/media/m7/`, with verdicts:
    - `side7-sky-day`: sky, clouds and sun, the skyline hazed at its foot. Pass (the first take had a dark band under
      the skyline, hard against the pale fog below it: farther must be paler, so the band's foot now fades to the haze);
    - `side7-sky-dusk`: the purple skyline, the sun going down behind it, the street lamps lit. Pass;
    - `side7-sky-night-rain`: the moon, lit windows in the skyline, rain. Pass;
    - `side7-vehicle-rail`: the AutoPlayer in a Medic; Auto-rail has turned the rail east along its drive, the camera
      higher and farther back. Pass.
  - (part 2) MODE 7 indoors has a room's own lens (h 50, the focus 64-190 ahead, 58 degrees): the city's had put the
    camera outside the bank's walls with a quarter of the screen black. A body between the lens and the player, over
    them on screen, is drawn see-through (the first rule, every body nearer than the focus ever comes, ghosted the
    whole near sidewalk in a car: found in the chase strip below).
  - (part 2) TOP-DOWN: a body up on a roof is drawn after the roof it stands on (M3's known gap), and a shop sign's
    slices after the building they hang on (the bank's read "T LOWTOWN": a building sorts by its footprint's nearest
    point to the centre, so most of the board's slices sorted before it).
  - (part 2) `tests/unit/depth.test.mjs`: the player shrinks walking north up the rail and grows coming back, on foot
    and indoors, no jump in size between frames (the stress test's own check).
  - (part 2) **The occluder fixture** (`#proving/occluder`): a tall block between MODE 7's camera and a magenta marker
    a body high. Its self-test, in the e2e suite, counts the marker's pixels in the drawn frame: 0 behind the block, 240
    stepped out past its end. Shots: `occluder-behind`, `occluder-aside`. Pass.
  - (part 2) **The chase filmstrip** (`docs/media/m7/side7-chase-strip.png`; the engine's filmstrip tool, seed 1: the
    AutoPlayer in a Medic from the safehouse with 2 stars, 200 frames a twentieth of a second apart, every other one in
    the sheet at half size): the Medic drives east, Auto-rail turns the rail north through the dissolve (frames 44-48),
    the police come up the avenue, the stars go out. Nothing behind a building shows through it in any frame: the
    buildings hide the street behind them, the Greasy Spoke's board is cut by the corner in front of it, a passer-by
    crosses in front of the board. Pass (the first take had the near sidewalk's passers-by ghosted: fixed above).
  - (part 2) `top-lean-bank`: TOP-DOWN at the bank, the tallest building, by day: its front leans toward the centre
    over its door, the roof grown with its height, its board whole. Pass. `top-body-on-roof`: Dex on a 72-unit roof,
    drawn on it. Pass.
- **M7 · section 8.21, the bank** (`tests/sim/interior.test.mjs`, 9 tests; `check.mjs` on `#interior/bank` joins
  `npm test`):
  - the First Lowtown Bank (`src/game/interiors/bank.js`): a 40×30 TileMap in ASCII: the lobby (marble, pillars,
    benches), the counter and the tellers, the staff corridor, the records office (carpet, desks, cabinets), the vault
    (steel, deposit boxes, its door shut), and the sewer wing under it all, its hatch into the vault. Three guards on
    rounds, four cameras, eight lights. The validator: no errors; the front door reaches the lobby, the tellers, the
    corridor and the records office, never the vault; only the sewer does (QUIET's way, H4);
  - in and out: △ at the bank's door on Neon Mile (or the grate round its west side) fades through black into it; △
    at a door inside goes back out. The city stands still meanwhile, its BUS scope muted: its hash going in and coming
    out is the same, and 5 s later the same as a twin's that never went in after as long in the city (test). Out by
    the sewer you come up at the grate (test);
  - stealth (tests): seen past the counter, a guard notices, searches, then raises the alarm, and the police are told
    (2 stars); a shot in the records office, out of every guard's sight, is heard through the walls and the guards come
    to look; a camera that sees you in the vault, with no guard there, raises the alarm by itself; a takedown from
    behind drops a guard quietly (no alarm, no stars) and it stays down; a scripted walk past the counter into the
    corridor, switching views and turning the camera all the way, hashes the same as without (every view visited, the
    alarm up, the guards' fire);
  - shots in `docs/media/m7/`, at night (the bank after closing), with verdicts:
    - `bank-door-city`: Dex at the bank's door, its yellow ring, "ENTER  FIRST LOWTOWN BANK". Pass;
    - `bank-lobby-iso`, `bank-lobby-top`, `bank-lobby-side7`: the lobby in the three views, the guards on their
      rounds with their pale cones, the front door's green ring. Pass (the first ISO take kept the lobby's east wall
      standing between the camera and Dex: the dollhouse cut reached 9 cells, now 16; the guards' cones were too
      faint on the marble: now an edge and a stronger wash);
    - `bank-alarm-iso`, `bank-alarm-top`, `bank-alarm-side7`: Dex behind the counter and in the corridor: a camera's
      red cone on him, the guards' red marks, ALARM, 2 stars, the guards drawing on him in MODE 7. Pass;
    - `bank-vault-side7`: in the vault from the sewer, its camera's alarm, the guards come; the two between the lens
      and Dex see-through. Pass (the first take had them a wall of body: the lens fade, above).
- **M7 · section 8.2, transitions:** every switch dissolves over 0.35 s and none moves the simulation (the tests
  above, outdoors and in the bank). Frame times while switching every 1.5 s on the gate's tour at 300 u/s in the rain
  (`tools/_switchperf.mjs`, a local probe), on the gate's machine's scale: the dissolving frames' medians about 28 ms
  into ISO, 19 into TOP-DOWN, 24 into MODE 7; but the first frame into a view (its caches filling: TOP-DOWN's face
  textures the first time, ISO's walls each time on the tour) and, in ISO, the frame the walls' bake-in times out run
  to 40-80 ms. Over 33 ms: carried to M13 with the view budgets (D20).
- **M7 · performance** (`tools/perf.mjs`'s gate scenarios, 30 s medians, M2's build (`0c3d575`), M6's (`15078bc`) and
  M7's interleaved in two rounds on this machine; a build on the gate's machine's scale is its median over M2's in the
  same round, times M2's gate figure, D20):

  | The gate (night, rain, 40 walkers and 20 cars in view) | M2 draw | M6 draw | M7 draw | M7 on the gate's machine | Gate |
  |---|---|---|---|---|---|
  | ISO, the tour at 300 u/s | 21.0, 20.2 ms | 25.4, 25.9 ms | 23.7, 24.8 ms | 10.9, 11.8 ms | 10.4 |
  | TOP-DOWN, the tour | 13.8, 15.3 ms | 18.5, 19.0 ms | 16.2, 18.0 ms | 9.9, 9.9 ms | 12.7 |
  | MODE 7, the tour | 24.8, 25.9 ms | 29.5, 35.4 ms | 29.1, 30.7 ms | 17.8, 18.0 ms | 12.7 |

  - **TOP-DOWN is inside its gate; ISO is over by about a tenth, MODE 7 by about two fifths** (M2's own MODE 7 was
    over already, 14.4-16.0; the city has since filled with traffic, crowds, police, gangs and the decks, and against
    M2's build MODE 7 has grown as much as ISO, 1.18 times). The rest of both is M13's (D20 names the levers).
  - **What M7 took off** (each measured with that part switched off or changed, against a fresh baseline beside it,
    20-30 s windows; ms on this machine): the depth views' light pass at a quarter size (the pass had cost 4.4 ms in
    MODE 7, now 0.8); near MODE 7's lens, parked cars drawn rather than kept as images hundreds of pixels a side (3.9
    million pixels a frame of drawImage gone); ISO's sky backdrop only where the map's edge shows (the gate's tour never
    sees it); moving cars kept as images in ISO; ISO's floor chunks projected once per view and copied (the turned
    blits had been the floor's whole cost: 4.9 ms against 4.3 for no floor at all); far crowd bodies redrawn every 6
    frames (2.5 ms for all bodies at 6); far deck cells drawn plainly. Against M6's build in the same rounds: ISO 4-7%
    faster, TOP-DOWN 5-12%, MODE 7 1-13% (its p90 from 47-52 ms to 41-47).
  - **Where MODE 7's frame goes now** (the same way): the bodies about 7 ms, the shapes about 5 (decks about 3 of
    them), the spans about 7, the sky about 3, the floor about 3 (about 420 drawImage calls a frame, one per screen row
    a chunk), here; drawImage is 37% of all the time in a CPU profile.
- **M7 · the gate:** `npm test` passes every step (lint, boundary, vendor, goal-sync, dist current, 220 unit and sim
  tests, the e2e smoke, replay and self-tests with the occluder's, the engine checker on the city and on
  `#interior/bank`). `test:full` passes (part 3): the 10-minute day soak (1,096 cars and 3,648 peds seen, no overlaps,
  no red runs, the longest stall with no cause 11.9 s, the worst crossing wait 21 s), the night soak, and the 5-minute
  gang sim (5 turf wars, all ended).
- **M7 · what the day soak found (part 3):** at first it failed on one crossing wait of 38.5 s (its limit 30). The soak
  hops the player between the city's points of interest, and the bank's sewer grate was a new one, so the route
  changed and met a crossing M6's never did (the simulation itself was the same). There a lorry stopped on the zebra
  held two peds at the curb: one had fled there, calmed down there and started its 20 s wait (D19's give-up) again
  from nothing, being put back on its line facing the way it was going. The wait now counts at the spot where a ped
  stands at the curb, whatever it is doing, until it has moved away; the worst wait in the same run fell to 21 s.

- **M8 · section 8.15, the runtime (part 1)** (`tests/sim/missions.test.mjs`, 6 tests): a stage's setup run twice
  changes nothing (ensure, place within, the kit); every fail fires with its reason (a `failIf`, the timer, WRECKED,
  NABBED, the delivery lost, the escort dead) and JOB BLOWN shows it; a retry releases what the stage spawned and starts
  its op again, and a quit leaves nothing of the mission behind; a pass pays, grades the medal by the bonus objectives
  and the retries, and keeps the save's best; the bot plays the verbs (on foot, into a car, a delivery across town)
  and each op's markers go with it; a stage's kit of only a bat gives the player's own weapons back at the end, and the
  bat dents a parked car (vandalism) till it burns. Verdict: the contract holds.
- **M8 · the deep links and the lint** (`tests/sim/mission-links.test.mjs`): every stage of every mission, and every
  activity at level 1, lands from `#mission/<id>/<stage>` running at that stage with its objective set, no errors; a
  stage of lines only goes on to the next. The lint checks each mission's id against the slice's 14, its giver, its
  cash reward, its `requires` and its bonus objectives. Verdict: lands.
- **M8 · section 8.16, the economy (part 1)** (`tests/sim/economy.test.mjs`, 7 tests and 1 waiting for the content):
  Lead Farm's purchases and refusals (cash, a full slot, the Buzzsaw locked until S1, a confirm above $5,000); the shop
  card by keys (E, Enter, Escape); a property's till filling at midnight to its cap and collected; the cab skip, refused
  with stars; a Kwik-Lux hold-up through the scene's own pilot seam; a stunt fixture scored; tokens kept across a save
  and a load. Completion's weights (1000 tenths) wait for the categories' content. Verdict: pays and refuses right.
- **M8 · the bot gym (part 1):** a local probe (`tools/_botgym.mjs`) plays one fixture mission per hint kind: walk,
  board, deliver, kill, ram, bat, evade, follow, race, photo, stealth, tow, spray. All 13 pass with the bot and all 13
  through the pad (the deliver and tow fixtures run again after the last two fixes). What it found and what
  changed (D21): the bat never dented a car (a swing met peds only); the player's best gun went unused through the pad
  (the fighter took the first one carried); a ram stalled pushing its target at a crawl; a tow backed into a lamp post
  from a lane beside the car; the curb search turned down every spot that traffic passed and put a car 440 u off; a
  walk slid along a wall toward a sidewalk node behind it, and its timers ran 30 times slow at the bot's quarter-second
  step; jams held the bot for minutes (a parked car shoved into a lane, a junction box held by a car that could not
  leave it, a jammed exit, a ped standing in the road, a queue up the Loop): it now squeezes past a still queue, takes
  a box that stays shut, keeps off a jammed exit, backs round a ped, drives off the road out of a jam, rejoins the road
  when lost, and leaves a car stuck for good. Verdict: every hint kind plays.
- **M8 · S1, Holy Rollers (part 1)** (`node tools/bot.mjs --mission saints_holy_rollers`): seeds 1, 2 and 3 pass gold
  (349 s), gold (350 s) and silver (322 s, one retry after a bust); through the pad (`--pad`, the bot's wishes pressed
  on a gamepad and read through the bindings) it passes silver in 349 s with no retry. Verdict: the reference mission plays both ways.
- **M8 · the gate (part 1):** `npm test` passes every step (lint, boundary, vendor, goal-sync, dist current, 237 unit
  and sim tests with 1 skipped until the content, the e2e smoke, replay and self-tests, the engine checker on the city
  and on `#interior/bank`).
- **M8 · FAN-OUT A2, the Harbor Rats (part 2a)** (`src/game/missions/r1-rat-run.js`, `r2-below-deck.js`,
  `r3-crane-game.js`, by the `rats` worker in its own worktree, merged as written but for the ports below): R1 Rat Run
  (a Hauler taken at the Rats' payphone brings two stars; arrive at the Brickyard drop with none: lose them, or the
  Spray & Pray), R2 Below Deck (as Viv with the Snap only: a stealth path behind four guards' backs at Club Chrome's
  lot, a takedown, the ledger photographed), R3 Crane Game (the container yard held with three Rats against three
  waves, red barrels, Molotovs, then the Saints' captain rammed in the Rats' Brute). The worker's ten MOTOR findings
  were each checked and fixed with a test (D21: among them a determinism leak, the player's shots leaving from a rig
  whose clock the engine starts at random; the fighters' line of fire blind to solids; `m.place` throwing on a
  vehicle; a fleeing car's stop read as NaN), and R2 and R3 now use the new public pieces (`m.alerted`, explosive
  props, `m.ally`) instead of reaching into Combat and the gangs. Running the chains again on the fixed MOTOR and
  tracing each death turned up four more combat bugs (point blank, a reload held off by a beating, a stunlock, a burn
  that never went out) and what the bot lacked (D21); R3's bat-carrying Saints now have 55 health (75). Runs
  (`node tools/bot.mjs`, the final ones): R1 silver on seeds 1-3 (106, 60, 75 s: it now resprays) and through the pad
  (104 s); R2 gold on seeds 1-3 (95, 108, 120 s) and the pad (90 s); R3 silver, silver, gold on seeds 1-3 (106, 166,
  145 s; one retry on seed 2) and silver through the pad (89 s); S1 again: silver, gold, gold (728, 426, 408 s; two
  busts on seed 1's long Brute) and silver through the pad (297 s, one retry). The bot gym's 13 kinds pass with the
  bot and through the pad (evade 26 s, it was 127; ram 38 s, it was 152). New tests: the same shots twice (the rig's
  clock), the chains' MOTOR needs (place, flee, barrels, ally, alerted, the cap lifted), the Snap and crouched sight,
  the line of fire through solids, point blank, a reload while stunned, a burn that goes out. Verdict: the Rats'
  chain plays both ways.
- **M8 · the career's screens (part 1b)** (`docs/media/m8/`, from `dist/index.html` at 1920x1080): `job-card.png` (S1's
  JOB card at the Saints' payphone: the brief wrapped, the pay and the respect, ✕ START THE JOB), `stage-marker.png` (a
  running stage: the objective on its band, the floor ring, the GPS line), `deliver.png` (the bot driving the Zephyr to
  the car wash at dusk), `job-blown.png` (the reason, RETRY THIS STAGE / QUIT TO FREE ROAM), `job-done.png` (the medal,
  the rewards, the bonus objectives ticked and not), `shop-card.png` (Lead Farm, page 1 of 2, a refused row saying why),
  `phone.png` and `cabs.png` (the destinations with their fares). Look notes found and fixed: a card's last body line sat
  under its first item's frame (JOB BLOWN, the shop, the cabs: the body is now measured as it wraps, with a gap); the
  objective line was lost on a busy street (it now sits on a dark band); a target off the radar's edge was not shown
  (mission blips now pin to the rim); a refused shop row showed no reason (it now says NO GUN, NOT ENOUGH CASH, FULL,
  beside the price). Verdict: every screen reads at 10 feet; M9 rebuilds them with the UI kit.
- **M8 · the bot campaign (part 1c)** (`tools/bot-campaign.mjs`, in test:full; PLAN.md 15.4): a new game from the
  title's NEW GAME, played by the mission bot through the scene's own seams (D21). On the content there is, the bot
  walked to S1's giver from a new game (the prologue marked done, since P0 isn't in yet), accepted its JOB card,
  passed it (silver), and bought both properties at their doors through the BUY prompt and the confirm card. Jobs
  from the phone, races, MAYHEM, tokens and stunts are written but wait for their content. `tools/bot.mjs --par 3`
  runs test:full's sweeps three at a time, each in its own process. Verdict: the campaign's seams work; 100% waits for
  the content.
- **M8 · FAN-OUT A2, the heist's finale and the Lawn Gnomes (part 2b)** (`src/game/missions/h4-big-withdrawal.js`,
  `g1-lawn-order.js`, `g2-bingo-night.js` and `g3-gutter-ball.js`, by the `heist-finale` and `gnomes` workers, merged
  as written).
  - **The missions:**
    - **H4 The Big Withdrawal** opens with the planning board's choice. LOUD rams the Strongbox in the Hookline and
      holds the lobby with the Buzzsaw. QUIET drills at the sewer and walks into the vault while the helper gang
      loops the cameras. Both end with the getaway, MODE 7's window, the tow, home, the split and the credits.
    - **G1 Lawn Order:** eight Saints cars smashed with a bat in two minutes, then a star lost or hidden at the lanes.
    - **G2 Bingo Night:** Nana out of the raid in her wagon, then the heat lost.
    - **G3 Gutter Ball:** the Rats' boathouse pier burned, the Rats held off, then out.
  - **The runs** (`node tools/bot.mjs`, on part 2a's MOTOR):

    | Mission | Seeds 1-3 | Through the pad (seed 1) |
    |---|---|---|
    | H4 | gold, silver, gold (228, 256, 185 s; seed 2 retried once: Dex left the getaway car) | gold (249 s) |
    | G1 | gold, silver, gold (117, 119, 113 s) | silver (127 s; one retry after a bust) |
    | G2 | gold on all three (65, 74, 55 s) | gold (79 s) |
    | G3 | silver on all three (159, 84, 86 s) | silver (123 s) |

    Every stage of the four deep-links (`tests/sim/mission-links.test.mjs`).
  - **The MOTOR requests:** the two workers filed 24, for 23 gaps (H4 and G1 are the same one). Each was checked
    against the code (`docs/handoff/m8-a2/motor-requests.md`):
    - 1 was done in part 2a;
    - 18 are real gaps the content works round. They are prepared as one patch (`motor-patch.py`), which applies
      cleanly, and the lint, the boundary check and three sim suites pass with it, but it hasn't been through the
      bot;
    - 4 are left for a call (D21).
  - Verdict: the four play both ways as written. The patch is the next step.
- **M8 · paused at the weekly usage limit (part 2b):** the workflow was stopped with `heist-setups` and `jobs`
  mid-way. Their files are kept in `docs/handoff/m8-a2/wip/`, outside the build, with their last runs:
  - H1 passed seed 1;
  - H2 failed at its alarm;
  - H3 passed seed 1, and failed seeds 2-3 at the tow;
  - the Firefighter and the Moto Courier passed seeds 1-3;
  - MAYHEM `mayhem_zap_rats` passed seeds 1-2;
  - the races were still being tuned.

  `saints`, `prologue` and `extras` never started. `docs/handoff/m8-a2/` holds everything the next session needs:
  the briefs, the workflow, each worker's notes and result, the MOTOR backlog with its patch, and the merges' probes.
- **M8 · the gate (part 2b):** `npm test` passes every step: lint, boundary, vendor, goal-sync, dist current,
  243 unit and sim tests with 1 skipped until the content, the e2e smoke, replay and self-tests, and the engine
  checker on the city and on `#interior/bank`.
- **M8 · the MOTOR backlog validated, the open requests settled (part 3a, DECISIONS D22):** `motor-patch.py` applied
  (H2-H12, G1-G4, G6, G8, G10, G11), and H13 (MODE 7's heading from a mission), G9 (the Boathouse and the Lighthouse
  stand on their piers) and J1 (a checkpoint's height) done; G5 and G7 settled in content. The content moved onto
  the new pieces (G1-G3, H4: no content reaches into `m.W` now). What the validation itself turned up, each fixed
  with a test: the pad pilot aimed off in MODE 7 (`groundDirToScreen`), a pressed trigger read as a full one (a real
  DualSense's R2 would have been on or off), a calm driver held for a minute by a crowd about a crossing (patience),
  and a fighter walking into the same parked car for good (a step aside). New tests:
  `tests/sim/mission-motor.test.mjs` (11), the stick's round trip in every view (`tests/unit/views.test.mjs`), a
  pressed trigger's travel (`tests/unit/input.test.mjs`).
  - **The runs** (`node tools/bot.mjs --all`, on this MOTOR): all 24 pass on seeds 1-3 and all 8 through the pad.

    | Mission | Seeds 1-3 | Through the pad (seed 1) |
    |---|---|---|
    | S1 | gold, silver, silver (363, 391, 261 s; seed 3 retried once: busted) | silver (344 s) |
    | R1 | silver on all three (110, 60, 75 s) | silver (100 s) |
    | R2 | gold on all three (99, 108, 120 s) | gold (90 s) |
    | R3 | silver on all three (127, 131, 120 s; seed 3 retried once: wrecked) | silver (108 s) |
    | G1 | gold, silver, gold (118, 119, 113 s) | silver (127 s; one retry: busted) |
    | G2 | gold on all three (65, 75, 55 s) | gold (79 s) |
    | G3 | silver on all three (88, 84, 87 s) | silver (101 s; one retry: wrecked) |
    | H4 | gold on all three (220, 665, 618 s: the ram's chase round the bank's block is long on seeds 2-3) | gold (220 s) |
  - **The bot gym** (`tools/_botgym.mjs`): 13/13 with the bot and 13/13 through the pad (`kill`, `ram` and `follow`
    through the pad on a retry).
  - **The gate:** `npm test` passes every step, 255 unit and sim tests with 1 skipped until the content (a city-life
    test's ped at a curb is deaf to the street now: on the moved city a crime nearby had sent it off before its wait was
    up).
  - Verdict: the eight merged missions play both ways on the fixed MOTOR; the rest of A2 starts from here.
- **M8 · FAN-OUT A2, the heist's setups (part 3b)** (`src/game/missions/h1-getaway.js`, `h2-blueprints.js`,
  `h3-big-drill.js`, finished from the `heist-setups` worker's saved work in `docs/handoff/m8-a2/wip/`):
  - **The missions:** H1 Getaway (the Saints' Zephyr GT out of Club Chrome's window and into the garage; H4 drives
    it), H2 Blueprints (the vault's plans photographed in the bank's records office, quietly or with the janitor's
    mop: a staff pass, in and out with no takedown, the bribe PLAN.md 9.4 offers), H3 The Big Drill (the Drill Rig
    towed from the Construction Site to the Brickyard).
  - **The worker's seven requests (H14-H20),** each in MOTOR with a test: the bot's idle stop and the AutoPlayer's
    arrival never hold the brake on a car rolling back; a hooked tow is held through a jam, its end chosen by the
    parked cars; `m.inside.run.watch()` (a copy of the guards' rounds and the CCTV's sweep) and `pass()`; a leash for
    a mission's enemies and guards; the stealth bot backs off when an uneasy guard sees it. H2 and H4 read the
    interior through `watch()`.
  - **The runs:** H1-H3 gold on seeds 1-3 and through the pad; H2's bribe on seeds 1-3. Every merged mission again:
    33/33 on seeds 1-3, 11/11 through the pad, the bot gym 13/13 both ways.
  - Verdict: the heist plays from its first setup to its finale.
- **M8 · the rest of FAN-OUT A2 (part 3c)** (`src/game/activities/`, `collectibles/`, `stunts/`, `events/`,
  `missions/s2-confession-booth.js`, `s3-drag-mass.js`, `p0-prologue.js`, from the `jobs`, `saints`, `prologue` and
  `extras` workers):
  - **The content:** the jobs at three levels each (Moto Courier, Vigilante, Firefighter), the races (Loop Sprint,
    Harbor Hustle), the three MAYHEMs, the 25 tokens, the 5 stunt jumps, the 4 random events, S2 Confession Booth
    (Fender's booth escorted from the club to the chapel), S3 Drag Mass (twice round the Loop in Fender's Zephyr GT)
    and P0 Two Wheels, No Brakes (Gus's lunch on a borrowed moped: the tutorial).
  - **Their 34 MOTOR requests,** each done with a test or settled (`motor-requests.md`, D22), among them: a mission
    point with no height is the ground's; a route's point off the lanes counts, once stopped, as near as the lanes
    go; `drive.siren`; a spawned car's crew rides in its seats; `place` into another seat; fire's vigor and spread;
    `kill`'s vehicle hint; `aimable: false`; curb `within`; stunt ramps as landmark decks (kind `ramp`, no lanes);
    the bot's drive-bys only with a clear line, one press a beat at a prompt, saves kept in memory headless; a
    gridlock breaker for rings of stopped drivers (`TUNE.gridlock`); free roam's offers only to a slow car, never for
    the marker the player starts in; H4's getaway lane cleared of the alarm's parked police cars; Firefighter's
    burning cars take no hurt while their call runs (a turf war's strays had set one off, and the blast chained into
    the engine).
  - **The runs** (`node tools/bot.mjs --all`): 96/96 on seeds 1-3 (the 14 missions, the 9 job levels, the 2 races,
    the 3 MAYHEMs and the 4 events), 32/32 through the pad, the bot gym 13/13 both ways.
  - **The gate:** `npm test` passes every step, 266 unit and sim tests.
  - Verdict: the slice's content is all in, and every piece plays both ways.
- **M8 · the campaign's diagnostics (part 4a):** the bot campaign reached 59.8% on the full content. What held it
  back, found with a new `--only` filter (those items alone, every mission done) and each run's stage failures in its
  log, each fixed:
  - the vehicle pick scored a far Pumper below the starting best, so Firefighter never started, and passed over the
    player's own vehicle, so its second level found no Pumper either;
  - a drive-in shop's card (stopping at Spray & Pray) kept the phone shut;
  - a stealth stage left the player crouched (a toggle), and a crouched ped climbs nothing: 13 roof and ledge tokens
    were never reached, and the MAYHEMs played crouched. The mission bot stands up once the stealth is over;
  - a stunt or race with no car near its start takes one from anywhere.
- **M8 · M9-M12 (part 1) merged in (`4074245`):** two conflicts (the built page, rebuilt; career.js's constants). On
  another district than Lowtown (the Proving Ground, District 2) the career offers no missions and no activity
  starts: the prologue's giver stands at a point named `safehouse`, which the Proving Ground's town has too, and the
  mission bench's bot had walked into it between jobs. `npm test` passes every step with the twelve Proving Ground
  self-tests.
- **M8 · a driverless car in the lane, the jobs' clocks, H4's truces (part 4b):**
  - the DriverBrain goes round a car nobody drives in its lane (a unit whose crew never came back, a wreck) even
    where the pass runs on through the junction's box beside it, as an assertive driver goes round a unit parked at
    its scene; with no way round at all it shoves the car aside at a creep after 4 × `TUNE.gridlock` seconds (a sim
    test covers both);
  - Moto Courier's level 3 has one red light's grace (22 s); Firefighter's level 3 has level 2's grace;
  - The Big Withdrawal holds a truce with the three gangs through every stage (a bumped Saints car no longer brings
    their guns on the Hookline);
  - the Proving Ground's mission bench: each job takes its car away when it passes (the next job's car had spawned
    on top of it), the evade job drives across town before its star, the town has its four corners as points of
    interest, and the bench holds the traffic at 14 cars (no queue at a light with a cop at the door).

  `npm test` passes every step. The full validation after it (`p4b`) failed four runs: S1 on seeds 2 and 3 and S2
  on seed 2 (the getaway car wrecked) and the bot gym's `follow` through the pad. Part 4c is about them.

- **M8 · a bot with manners, a gang's own job in peace (part 4c, `e323867`, D27):** what the validation after part 4b
  and the next bot campaigns found, each fixed with a test:
  - the AutoPlayer looks before it backs or swings out (never into someone on foot), and at a star or more pulls away
    from a cop on foot at its stopped car (S1 and S2 had been busted in their queues);
  - wedged 5 s with nothing to wait for, it goes round off the road (H4's Hookline sat 50 s in a corner through the
    pad);
  - a delivery that must arrive whole is driven with care, and the bot holds its fire with a bystander in its line;
  - a car nobody drives gives when the gridlock breaker shoves it (a car parked broadside had stood like a wall), but
    never a job's car (H4's roadblock, shoved off its lane, had put the Hookline's hook-up point off the Loop's deck);
  - a mission's own gang leaves the player be while it runs (the campaign reaches S1 with the Saints hostile);
  - `m.standDown('fire')`: Firefighter holds the city's own engine off (it had come to the same fires and jammed the
    street with the player's);
  - the campaign's tool: a mission past its cap is quit (it had run on into the next item), and each failure says
    what hurt the player and their vehicle, by source.

  The runs on this MOTOR: 96/96 on seeds 1-3, 32/32 through the pad, the bot gym 13/13 both ways; `npm test`: 319
  unit and sim tests, 15 recipes, every step passed. The campaign on it reached 71% (S1 against the hostile Saints, the
  level-3 jobs, the races and two stunts left: part 4d).

- **M8 · crossfire spares the player, the police nab on your level, a bot that doesn't wait for the cop (part 4d,
  D27):** what the runs after part 4c found (two campaigns, three validations, the bot gym), each fixed with a test
  where the game was at fault:
  - **The game:** a truce holds for a gang's members already coming for the player, and for its cars (S1's Saints,
    hostile by then, had kept coming at the player doing their own job); **crossfire spares the player**: a gang that
    isn't after the player holds its fire while the player or their car is anywhere its shots could go, throws nothing
    that would land near them, and shoots at no car beside them (`tests/sim/gangs.test.mjs`: a Rat's fire goes through
    a player standing between when the Rats are hostile, and none of it reaches them when they aren't); **the police
    nab on the player's level**: a cop on the street under the Loop had arrested a player stopped on the ramp above
    (`tests/sim/wanted.test.mjs`: the door arrest up on the deck, none from the street under it; the test fails without
    the fix); `m.clearSpot(at, r)`: H4's lobby and H2's front door tow a car left on the bank's door step (the
    campaign's H4 had stood 40 minutes at the bank); S2's last Rats are called off after 45 s with none in the window's
    reach (the fight could never end); Moto Courier rides in a truce; both races start on their grids
    (`m.clearTraffic`).
  - **The bot:** wanted, its unstick moves never wait for a cop on foot, and with one within 45 of the car they wait for
    nobody (S1 on seed 2 had been NABBED three times holding still for the cop himself, or for a bystander while the
    cop walked up); its stall count starts again once the last stall is 300 behind (Drag Mass's race car had been left
    the moment it came down the ramp from the deck); the mission bot's 12 s for getting into a car count the scene's
    walks to a door it can't reach (the campaign's bot had stood 8 minutes by a parked Brute); an empty car before a
    carjack (a witnessed carjack is a star); the cars it gave up on stay given up on while the trip lasts; a U-turn
    route when the lane it faces leads nowhere (`tests/unit/bot-manners.test.mjs` covers each rule).
  - **The campaign's tool:** a long mission's state every 5 minutes; a teleport takes the player out of a car first; an
    activity's start is driven to the short way; items started on the way are quit; **a rescue**: a car two minutes
    within 40 u at the bot's wheel is put back on the nearest lane that leads on (a hauler in the north edge's dead-end
    stub, or wedged among the Loop's pillars at its south-west corner, which a player backs out of and the bot can't),
    each one logged and counted.
  - **The retries:** the bot plays a failed stage up to 4 more times (2 before) and a run has 1,800 s of game (900
    before); the gym's fixtures 900 s (400 before).
  - **The runs (`p4g`):** 94/96 on seeds 1-3, 31/32 through the pad, the bot gym 13/13 and 12/13 through the pad, with
    the old budget. Every run that passed did so within two retries and plays the same under the new budget (the runs
    are deterministic, and a retry comes only after a failure); the four that failed, run again under it:
    Firefighter level 2 on seed 1 passes silver after 3 retries (its Pumper had shoved a parked car into the street to
    the fire, and three calls went up in that jam), S1 on seed 2 bronze after 4 (wrecked three times by two Rats its
    driving had provoked, beating it on foot by the Fish Market, and busted once), Harbor Hustle level 1 on seed 1
    through the pad silver after 2. So: **96/96 and 32/32**. The gym's `kill` through the pad still fails: the bot
    loses the opening gunfight with two armed Rats (it walks at them firing an SMG at long range, through a pad's aim),
    and its retries are spent jammed with stars on the north edge's road. The gym is the bot's own harness, not a
    mission: noted, with the bot's missing self-defence on foot, as what a stronger bot would fix.
  - Tried and dropped: a car picked to take only on the walker's level, and a bail-out rule kept per place (they changed
    which car the bot took in the gym's `kill` and the next run's busts; with the tried cars kept, it no longer loops).

- **M8 · the bot campaign at 100%, M8's acceptance (M13 part 5, D30):** `node tools/bot-campaign.mjs --seed 1
  --verbose` on `5c7c2ef` (god, D29): a new game from the title's NEW GAME to the phone's COMPLETION at **100.0%**
  after 2.15 h of game (32 minutes on this machine), no rescue. Every one of the 14 missions passed at its first try
  (8 gold, 6 silver: the prologue, the Gnomes', the heist's four, the Rats', the Saints'); the three jobs to level 3
  (Firefighter, Moto Courier, Vigilante: 9 levels, each at its first try); the three MAYHEMs; Harbor Hustle (silver,
  after two retries) and Loop Sprint; all 25 Moto Tokens at their first try; the five stunt jumps (the Car Park Roof
  at its second); both properties. On the same MOTOR: every merged mission and activity through the bot on seeds
  1-3 (96/96) and through the pad (32/32), and the bot gym 13/13 both ways. What the campaign found on its way there,
  each fixed where it lives with a test, is part 5's entry under M13 and D30. **Verdict: M8 done.**
- **M9 · section 8.18, the UI layer and the kit (`b1ff7bb`, D23):** the HUD and every menu draw on MOTOR's own
  canvas (`#ui`) at the HUD size's scale (Standard is the game's S, Large S + 1, Huge S + 2, never under 320 × 180 UI
  pixels), in the 5 × 7 font only, inside the 5% safe area. The kit: Pen (recorded for the audit), List (6 a page at
  most, paged "2/4"), Tabs (L1/R1), Cards, toggle, slider and choice rows, the focus frame (2 px, pulsing, lifted),
  the glyph legends, a sound on move, confirm, back and error. Verdict: one kit for every screen.
- **M9 · the screens:** the title over a live night fly-over of Lowtown (CONTINUE, NEW GAME, LOAD, SETTINGS, EXTRAS
  with the Proving Ground, Credits & About and the field guide); the pause (MAP, BRIEF, STATS, SETTINGS, HELP; ○
  resumes; QUIT asks first); the big map (pan, zoom, the legend, a waypoint, the filter; the GPS line on the radar);
  the settings in five tabs (paged rebinding per context with capture, the layout in glyphs, Sharp MODE 7, the HUD
  size, subtitles, colourblind markers, the speedometer, difficulty, aim assist, autosave, hold or toggle); load and
  save as slot cards; the phone (CONTACTS, TEXTS, JOBS, SNAP, SETTINGS); the shops, the job card, JOB DONE (the medal
  and the cash big) and JOB BLOWN; NABBED and WRECKED; Credits & About (the Source Information, the engine analysis,
  the engine's credit and MIT notice); first-time hints for 13 verbs. Our own pause is read in the step (the hash
  stands still under it) and the engine's auto-pause is handed to it.
- **M9 · the audit** (`node tools/ui-audit.mjs`, `docs/ui-audit.md`): 238 stops, 238 pass: 51 by pad, 51 by keyboard
  and 17 by mouse at each of 1920 × 1080 and 1280 × 720 (the focus seen, 6 items a page at most, scale 1 or more,
  every glyph resolved, inside the safe area). Verdict: the audit is clean at 1080p and 720p, and the controller-only,
  keyboard-only and mouse-only passes reach every screen.
- **M9 · the tests:** `tests/unit/ui.test.mjs` (8), `tests/sim/ui.test.mjs` (5); `npm test` passes every step, 268
  tests with 1 skipped until the content.
- **M9 · the shots** (`docs/media/m9/`, 18, from `dist/index.html`):
  - `title-1080p.png`, `title-720p.png`: the logo and the menu over the fly-over, legible at both sizes. Look note
    (M13): the tagline has no backing, and a neon sign in the fly-over runs into its end;
  - `hud-car-gps-1080p.png`, `hud-huge-1080p.png`: the HUD in a Medic with five stars, the GPS line on the radar; the
    Huge size keeps every corner inside the safe area;
  - `pause-map-1080p.png`, `pause-map-720p.png`, `pause-map-zoom-mouse-1080p.png`: the big map with its legend and
    the glyphs of each device (the mouse shot zoomed to 150%);
  - `pause-stats-1080p.png`: the stats as cards (shot before the content: it says MISSIONS 0/8; M13 re-shoots it);
  - `settings-display-1080p.png`, `rebind-capture-1080p.png`, `save-1080p.png`: the tabs and rows, the capture
    prompt with its cancel, three slot cards;
  - `phone-1080p.png`, `phone-720p.png`, `shop-1080p.png`, `job-done-1080p.png`, `weapon-wheel-1080p.png`,
    `wrecked-1080p.png`, `side7-sharp-1080p.png`: the phone, a diner's menu with FULL beside each row, the medal and
    the bonus objectives, the wheel's eight slots, WRECKED with the hospital bill, Sharp MODE 7 at night. Look note
    (M13): a world label (SAFEHOUSE) shows over WRECKED.

  Verdict: every screen reads at 10 feet; the two look notes go to M13's polish pass.
- **M10 · section 8.17, audio and radio (`b2ea884`, D24):** GTM-PATCH 5 hands MOTOR the engine's music, sfx and
  master buses (`audio.bus`, in PATCHES.md and PATCHES.json, tested), so the volume settings and mute hold for every
  sound. MOTOR's audio: the note syntax, a look-ahead sequencer on any audio context (per-sequence timelines, a voice
  cap), the composer (each station's genre and each score cue from a seed: the same songs every game), the radio's
  timelines on the save's play clock (songs, DJ lines, ads, jingles, the talk show's calls, as subtitles), the
  continuous voices (engines, sirens, the rain and the street), the director (the station and a job's score on the
  music bus, the radio ducked under a cue), the SFX map from the BUS. The content: four stations (CRASH FM, WHEELZ,
  NEON DRIVE and LOWDOWN TALK) with their songs, DJs, six ads and jingles; the title's theme; chase and
  tension cues in R1, R2, G2 and H4.
- **M10 · the tests:** `tests/unit/audio.test.mjs` (notes, the composer, the radio, the sequencer, the SFX map);
  `tests/sim/audio.test.mjs` (headless hears nothing; the hash is the same with sound); `tests/e2e/audio.mjs` in
  Chromium: each station's first 10 s rendered offline is not silent (RMS: CRASH FM 0.078, WHEELZ 0.078, NEON DRIVE
  0.034, LOWDOWN TALK 0.048), the radio is heard on the engine's music bus (peak RMS 0.075), mute silences the master bus,
  the radio's own volume holds (0.0001 at 0), the live voices stay bounded over 20 s (7-8 voices, none dropped, the
  same count in both halves); `test:full` adds a 10-minute soak. `npm test`: 277 tests, 1 skipped. Verdict: every
  station plays, and all sound goes through the engine's buses.
- **M11 · section 8.20, the attract mode (`52b3980`, D25):**
  - **In:** 9.9 s idle on the title stays, 10.0 s goes; a menu opened from the title counts as activity, a rebind
    waiting for its button doesn't. A kiosk or a phone goes at once.
  - **Out, within one step, on any input:** a key, an unbound key, a click, a mouse move, the wheel, a pad's button,
    a stick, a trigger (in the sim with the raw state; in Chromium with real events and a stand-in pad). The title's
    idle clock restarts, and what woke it does nothing there.
  - **The show:** MOTOR's Director plays the five reels (Joyride, Hot Pursuit, Turf War, Switch!, Heist Tease), each
    in a fresh world and played by the mission bot, with a card every two or three (the title, HOW TO PLAY on a
    DualSense with every button's job, LOWTOWN'S MOST WANTED), a camera plan over the three views and the bank,
    captions, the DEMO bug and PRESS ANY BUTTON; a watchdog cuts a stalled reel.
  - **The soak** (`node tools/attract-soak.mjs`), 30 virtual minutes a seed, headless:

    | Seed | Reels | Ended / cut (at its time, stalled or failed) | Views, bank | Stars, explosions, switches | Cards | Heap growth |
    |---|---|---|---|---|---|---|
    | 1 | 79 (15-16 of each) | 68 / 10 | all three, yes | 4, 61, 46 | 31 | 5.9% |
    | 2 | 80 (16 of each) | 62 / 17 | all three, yes | 5, 75, 48 | 31 | 4.5% |
    | 3 | 74 (14-15 of each) | 58 / 15 | all three, yes | 4, 47, 45 | 29 | 2.4% |

    And 5 minutes drawn in Chromium (`--chromium`): 15 reels (3 of each), 12 ended and 2 cut, all three views and the
    bank, 3 stars, 11 explosions, 6 switches, 5 cards, heap growth 3.9%, no errors. Its first run found a draw crash
    (an interior lot's flat walls with no rect), fixed in MOTOR before the commit.
  - **Kiosk and mobile** (`tests/e2e/attract.mjs`, a 390 × 844 phone at 3x with touch): it boots into the demo; no
    touch controls; a MENU button opens sound, the volume, the view and About; taps never leave; a controller or a
    key opens the title.
  - **The tests:** `tests/unit/director.test.mjs` (4), `tests/sim/attract.test.mjs` (18), `tests/e2e/attract.mjs`
    (24 checks); `test:full` runs both soaks. `npm test`: 297 tests, 1 skipped.
  - **Capture:** `tools/record-attract.mjs` (ffmpeg): `docs/media/m11/attract-joyride.mp4` and `.gif`.
  - **The shots** (`docs/media/m11/`, 11): the three cards (`card-title`, `card-howto`, `card-wanted`), a frame of
    each reel (`joyride-deck`: MODE 7 on the Loop's deck; `pursuit-respray`: three stars at night in the rain;
    `turf-shootout`; `switch-viv`: TOP-DOWN with Viv's line as a subtitle; `heist-getaway`), and the phone
    (`phone-street`, `phone-kiosk`, `phone-menu`). Look note (M13): a reel's caption has no backing, and a
    billboard runs into TURF WAR. Verdict: the show reads as the game playing itself, every view and the bank in it.
- **M12 · section 8.22, photo mode (part 1, `13af740`, D26):** a free camera off the simulation, the Snap's frame for
  `m.photo`, a PNG saved; sim tests (the world held still while the camera pans, zooms and turns through the views, then
  all of it put back; a photo completes a photo objective; the phone's SNAP opens it) and a Chromium e2e (Space
  saves a PNG). `photo-mode.png`: the legend (SNAP, ZOOM, VIEW, BACK) over a park, the HUD gone.
  Verdict: works.
- **M12 · the dev tools:** the dev menu (`?dev=1`, the backquote, the pause's DEV row): TUNING pages (every knob a
  slider), OVERLAYS (lanes, junctions, sidewalks, minds, boxes, perf), WORLD (hour, weather, stars, teleport, spawn),
  GO (any mission at a stage, an activity at a level, a zone). Shots: `dev-tuning.png` (the camera page), and
  `dev-overlays-iso.png` and `-side7.png` (the lanes and the perf box, which part 2 moved to the right edge, off
  the radar). Verdict: works.
- **M12 · section 8.23, the Proving Ground** (`tests/e2e/selftest.mjs`, each zone's `?selftest=1`):

  | Zone | Its self-test |
  |---|---|
  | the handling ground (a district of its own) | stops from 180 lengthen dry to ice (33 < 42 < 55 < 65 < 124 < 193 u); the skidpad (17); the slalom clean; off the kicker at 16 u and landed on its wheels; the boat 182 u in 3 s |
  | the traffic and crowd lab | 8 cars moving, 49 on the sidewalks, 9 junctions crossed |
  | the combat range | each weapon's damage a second as specified (fists 1.03, the slugger 1.06, the rest 1.00); 9 dummies; a lane target in reach |
  | the wanted sandbox | two stars bring 2 units; cleared, the sirens go off |
  | the mission bench | one job per objective kind, 13/13 passed (reach, enter, deliver, follow, chase, kill, protect, collect, photo, evade, race, timer, choice) |
  | the stress pad | 45 cars in traffic, a crowd of 268, 52 vehicles; draw 12.7 ms, update 3.9 ms (medians) |
  | the UI gallery and jukebox | 31 screens × 4 glyph sets audited, 124/124 clean; 4 stations, 31 segments with music; 9 songs; 50/50 effects |
  | the views, the garage, the occluder, the scale yard, the pad | each view draws its bodies; all 19 vehicles sound and within spec; MODE 7's block hides the marker whole; a lap of 1,573 u, 35 chunks, draw 10.2 ms; the pad 1,650 u at up to 226 u/s, in one piece |

  The shots (`docs/media/m12/`): `handling-skidpad`, `handling-strips`, `handling-slalom-top`, `handling-boat`,
  `traffic-junctions`, `range`, `wanted`, `bench`, `stress`, `ui-gallery`, `views-iso`, `views-side7`, `garage`,
  `scale`, each with its zone's panel (the zone, draw and update, its counts). Verdict: every zone works and says
  what it is testing.
- **M12 · the handoff docs and District 2 (part 2, `d5fd83a`, D26):**
  - **The recipes:** `docs/CONTENT-GUIDE.md` has one per content type (vehicle, variant, weapon, ped, outfit, gang,
    mission, activity, station, song, shop, property, interior, reel, district), each naming its test. Each
    `tests/recipes/<type>.test.mjs` follows its recipe to the letter: its fixture is the one file the recipe
    describes, bundled in as if at the path the recipe names (`loadGame` and the bundle take `extra`; nothing else is
    edited), and the test proves it in play (the fleet drives the new car, the bot passes the new mission and both
    levels of the new job, Threads sells the new outfit, the new district loads...). 15/15 pass in `npm test`.
  - **What the recipes needed:** songs are content (`def('songs')` in the note syntax, played on their station);
    a prop may be painted (`paint`) and a district may hang a sign on a wall (`signs`, drawn only: the simulation is
    the same), so Lowtown has its "BRIDGE CLOSED: GNOMES ON STRIKE" at Loop Avenue's west end (PLAN.md 9.1).
  - **District 2:** the block behind the closed bridge (48 × 40: the bridge's barricaded span with its parapets and
    the strikers' hoarding, Loop Avenue on the west, four streets, three doors), loaded only with `?dev=1` (the dev
    menu's GO, or `&district=district2`); `tests/sim/dev.test.mjs` covers it. Shots: `district2-bridge-iso.png`,
    `district2-bridge-side7.png` (the span, the sign, the hoarding) and `lowtown-closed-bridge.png` (the sign on
    Lowtown's side). Verdict: a new district is content.
  - **The gate:** `npm test` passes every step, 312 unit and sim tests, 15 recipes, the twelve self-tests.
- **M13 · the rumble, the knob list, where a frame goes, the look notes (part 1, D28):**
  - **The rumble profiles** of PLAN.md 8.1 play through the engine's `input.rumble` (`src/motor/input/rumble.js`):
    a crash by how hard, the player's shots by the weapon, a blow landed, a blast by its nearness, a heartbeat under a
    quarter of the health, a landing; scaled by the Vibration setting; never headless or in the attract mode
    (`tests/unit/rumble.test.mjs`).
  - **`docs/TUNING.md`:** every knob, generated by `tools/tuning-doc.mjs`; `npm test`'s "tuning current" fails when it
    is stale.
  - **`?prof=1`:** a depth view's frame timed by section and by kind of item (faces, bodies, cars, deck cells,
    glows), for the perf pass.
  - **The look notes from M9 and M11:** the title's tagline and the attract mode's captions on bands; WRECKED and
    NABBED on a band of their own.
  - **The docs begun:** `docs/ENGINE-ANALYSIS.md`, `docs/FEEDBACK-FOR-ENGINE.md` (the engine's FEEDBACK-LOG format),
    `docs/QA-DUALSENSE.md` (the 15-minute checklist with a real pad), README.md's Source Information and the engine
    analysis in a section of its own, the Credits & About screen's text (`src/about.js`).
  - **The gate:** `npm test` passes every step: 320 unit and sim tests, 15 recipes, the e2e suites, the engine's
    check outdoors and in the bank.
- **M13 · the respray's bay, sodium streetlamps (part 2, D28):**
  - **Spray & Pray** respray within reach of a bay at the curb in front of its door: a car stopped on Canal Street
    there is resprayed, and the bot's evade drives in from down the street (`tests/sim/wanted.test.mjs`; the test fails
    on the old rule: from the street the nearest a car got to the door was 50, and the reach is 44).
  - **The streetlamps** light, glow and streak sodium orange (`render/city-render.js`, the depth views' pools in
    `render/stage.js`). Shots: `docs/media/shots/` (M13's matrix, below).
- **M13 · the perf pass's levers (part 3, D28):** found with switches in a scratch build (each part of a frame left
  out in turn, interleaved, three or four rounds) and a CPU profile of each gate scenario. In MODE 7 the textured faces
  were paid by the pixel: in this GPU-less Chromium an affine pattern fill costs about ten times a flat fill a pixel,
  with or without its acceleration flags, and a plain scaled blit about a fifth of a pattern; and the near slices of a
  wall ran off the screen, seven screens of pixels a frame. What landed (each exact, or within a pixel where a kept
  image lands on whole pixels; checked against the previous build's frames: under 1% of the pixels differ at each of
  MODE 7's four headings and in ISO, all of it bodies at another step of their walk or a car that had moved on):
  - **MODE 7:** a textured quad's outline cut to the screen before it is filled; the front faces (square on to the
    level camera, an upright rectangle on screen) drawn as scaled blits; the floor as one raster (each row's pixels
    read from the chunks' own, one putImageData, where it was about 420 drawImage calls a frame); what the nearer walls
    hide left out (the camera is level and the walls stand on the floor, so a face wholly nearer hides a thing over its
    columns from its top down: faces, bodies, deck cells, cars, lamps and props, about 70 of the 510 items a frame on
    the tour); a moving car kept as an image while it is small on screen and its bearing from the lens holds; the
    lamps' warmth added over the pools' box only.
  - **ISO:** the props and pillars of one model and facing, and the deck cells and railings of one variant, share one
    kept image (ISO's projection is the same everywhere on the screen); the walls prebaked in a screen's window a third
    of a second ahead of the camera, not in a ring round it (on the move the ring's sides and back were baked and
    never shown).
  - **Every view:** the 10-foot kit's text drawn once into an image and put in place pixel for pixel (the pixel font
    fills a rectangle a run, six times over with the outline). **Found on the way:** the floor chunks' cap of 48 never
    held in TOP-DOWN and MODE 7 (only ISO moved the chunks' frame on, so the depth views kept every chunk they ever
    baked: 68-70 on the tour); it holds in every view now.
  - **Interleaved with the previous build** (the gate scenarios, 7 s windows, four rounds, on a machine shared with
    the bot campaign and the reviewers): MODE 7 22.5 → 18.1 ms (-20%), and with the culling widened 26.2 → 20.0 ms
    (-24%); ISO 21.5 → 18.8 ms (-13%); TOP-DOWN 12.5 → 11.9 ms (-5%).
  - **The gate as D20 reads it:** `tools/perf.mjs --gate` now measures M2's own build (its dist/index.html from git)
    in turn with the build in each round, the order swapped each round, and puts each view on the gate's machine
    (the build's median over M2's, times M2's figure there); the update is read a step from each frame's step count.
    Two rounds on the shared machine (M2's own medians swung 14-22 ms between them): ISO 10.2 and 11.0 ms (gate 10.4),
    TOP-DOWN 9.6 (12.7), MODE 7 12.3 and 14.9 (12.7), the update 0.9-1.0 ms a step (1.5). The reading of record waits
    for a quiet machine (below).
  - **The look note on the title:** its logo panel darker (.82): the KARAOKE KING sign of the fly-over had shown
    through the words.
- **M13 · FAN-OUT B (part 4, D29):** eight adversarial reviewers, one an area (vehicles, traffic and peds, wanted and
  gangs, missions, the 10-foot UI, the attract mode, perf and memory, determinism and saves), each in its own worktree
  on `839a4c5`, each finding a test that failed (`tests/review/<area>/`; three browser repros as scripts). 47 findings,
  every one fixed and its test green, the suite a step of `npm test` ("review"); the calls they made are D29's. The
  ones a player would meet first: a job could be started with four stars and quit at once to lose them (a job never
  starts while wanted now); a giver on the chapel's door hid its SAVE; a load dropped the stats, the outfit, the meter
  and the weather, and CONTINUE could load an older slot; ○ RESUME also rolled the player (or fired a drive-by); a
  trigger at half travel was full throttle in a browser; the Proving Ground had no way back; cars rammed each other
  without a dent; the drawbridge was never closed to traffic. Two existing tests moved with the fixes: the city-life
  junction check now queues a driven car (a parked one is gone round, D29), and a ped held at a curb by a still car
  goes another way after a moment.
  - **The owner's directions (D29):** performance is out of the Definition of Done (the "perf gates" step left
    test:full; `tools/perf.mjs` stays); the bots may play invulnerable: `?god=1` / `--god` (the crew and their rides
    take no harm, the gun in hand stays full); the campaign plays god, the mission bot's runs stay mortal.

- **M13 · the bot after FAN-OUT B, the shots matrix and its look pass (part 5):**
  - **Every merged mission and activity through the mission bot on FAN-OUT B's MOTOR** (`7b1980f`, seeds 1-3): 95 of
    96 passed. H4 on seed 3 failed at the ram ("Gus left the Hookline" four times, then NABBED): the AutoPlayer's
    pull-away from a cop on foot had come to fire for any cop within 80, also one holding off at range and shooting,
    and backed and swung the Hookline out round and round. It now pulls away only from a cop coming for the door
    (close, or closing on the car: `tests/unit/bot-manners.test.mjs`); H4 seed 3 passes again. **On part 5's bot
    (`9843969`): 96 of 96** on seeds 1-3 (H4 seed 3 silver, once NABBED at the ram).
  - **The campaign at three stars:** god mode showed the same loop with no end (the crew can't die, so the police's
    guns never close it): Bingo Night's escape stood still at three stars. With the Eye up, no drive away loses it, so
    the mission bot's evade now goes under a deck (the L, the Loop), out of the Eye's sight, and holds there while the
    stars flash out; seen there, on to another stretch away from the police (`_cover`, tested). Four starts with three
    and four stars lost them in 51-154 s. The free-roam evade (the campaign's between jobs) never moved its goal after
    the first change of it: its retarget clock now runs.
  - **The stunts in the campaign:** "Back Across the Canal" never landed: the runner's stop, lining up, held the brake
    while the car rolled back, which in this engine drives it back, at 80 u/s into the canal behind the run-up. It
    stops against the way it rolls now, and the canal lands. A failed jump now says why (how it came down, or that it
    never left the ground in its circle).
  - **The campaign's stalls, each fixed where it lives** (D30): H1's bike ride queued for good behind a long truck turned
    across Dock Road at the Loop's foot (a car off its line, out of the full simulation, never went over to the far
    LOD: one wedged 8 s is now put back on its path, a sim test); a retry of H1's garage put Dex the far side of where
    the Loop's ramp meets the sidewalk from Lefty (now beside him); H4's getaway gave its car up in a jam ("Dex left
    the getaway car": `m.reach`'s `inVehicle` now reaches the bot, which holds the car); the gym's kill found the
    player's fighter stepping to and fro behind a parked truck while two Rats shot it (it now goes round once 3 s of
    steps clear nothing, a unit test). Then (`97e9c37` and after): S1's bot walked at one Zephyr out of reach for 40
    minutes (a car given up on now stays so for a minute whatever goals follow); Harbor Hustle "did not start" 10 u
    from its start (its card asks a stopped car: the campaign holds still there); the only Pumper, once out of reach,
    was passed over for good (now for ten minutes). And the root of the late stalls: the AutoPlayer's per-trip counts
    (boxed in, the unstick moves, the walk to a door, the hops on foot) ran on from trip to trip in the two AutoPlayers
    that live for hours in the campaign, so it left cars at their first box, gave cars up at a glance and never walked
    straight; a new goal starts them afresh (a unit test). A job started on the way during a token, a stunt or a
    property is quit at once (Lawn Order, begun by a teleport beside its giver, had taken the controls from a stunt's).
    On that, S1's bot got out on the Loop over Gutterball Lanes for the Gnomes' Brute below and walked the deck for
    good: a vehicle off the bot's level is now far, driven to at its level, and a car boxed in on a deck is never left.
    On that, every mission passed at its first try; then the courier's bike sat behind the Pumper the campaign had left
    across its road (nothing towed a car the player got out of: now out of sight it is towed, or one parked as the
    world was made goes back to its spot, a sim test), and Vigilante never started (its cruiser, broken into, brought
    stars, and the phone offers no job while wanted: the campaign loses them in it first). Then every job, race, MAYHEM
    and token passed, and three stunts failed on the drive to their run-ups (a junction's exit held on the way up to
    the Loop Gap's stub; 30 u short of the canal's with no room to turn): a stunt's car is now put down at its run-up
    by the dev teleport, and all five land in a probe.
  - **test:full and the campaign at 96% on part 5i** (`d64b788`): test:full stopped at the 10-minute city soak (a far
    car stood 25.7 s behind a Medic that had run past its stop and stood at its lane's end, its speed running on: a
    goal passed on the way's last lane is now where it stops, `a5d4d0b`, a sim test; both soaks pass again). The
    campaign passed everything but the two stunts over the drawbridge, which never lifted: a cop stood on its span,
    a unit's crew left as a body when the traffic despawned their car out of sight, then knocked along Dock Road onto
    the bridge (a despawned car now takes its crew with it, a sim test).
  - **test:full on `a4c9742`** (M8's acceptance) passed through the attract soaks and stopped at the 5-minute gang sim:
    an idle player's respect moved (the Saints +3, the Rats -2), the random gang shoot-out come up beside them and won
    by the crew on its own, its tip paid all the same. The tip is now for a hand in it (a rival hit by the player; else
    it ends quietly, a sim test); the gang sim passes again, and the event through the bot on seeds 1-3 and the pad.
  - **The page from a static server** (PLAN.md 15.3): served by `tools/serve.mjs`, it played, but the browser asked the
    server for `/favicon.ico` (a 404 in the page's console; from file:// nothing is asked). The page now carries its
    tab icon inline (MOTO's M in the title's colours, an SVG in the page's head), and `tests/e2e/smoke.mjs` plays the
    page both ways, from file:// and from a static server on a free port: the title, NEW GAME, a walk, a deep link, no
    error and no request beyond the page. Three builds hash the same (a rebuild is byte-identical). The icon
    (`docs/media/shots/tab-icon.png`, at 128, 32 and 16 px): legible down to 16 px, the title's yellow, orange and
    magenta on its near-black; good.
  - **The UI audit before test:full:** run alone first, the audit found its own walk out of step (the prologue's giver
    stands at the safehouse's door since A2, so a new game's first card there is the prologue's JOB card, not the
    save's slots: the walk now visits the save after the job stops), then 238/238 at the Standard size. At HUD Huge
    by pad (320 x 180 UI pixels), 48/51: the pause map's legend, shown, and the STATS tab's second row of cards ran 2
    px under the safe area. The map now lays its legend out in columns when it is too short for one, and a card grid
    pages fewer rows when its screen is short of room (a test in `tests/review/ui/hud-size-overflow.test.mjs`,
    failing before); 51/51. The shots at Huge (720p): the legend in two columns of four, clear of the district's
    name; STATS one row of three cards, 1/4, MORE to page; good. Credits & About at 1080p: the Source Information,
    then under its own heading the Game Engine Analysis, legible; good.
  - **The shots** (`tools/shot-matrix.mjs`, PLAN.md 10's matrix): `docs/media/shots/`: the 4 neighbourhoods by day,
    dusk and night in ISO (`<hood>-<time>-iso.png`) and every view on the contact sheets (`sheet-iso-clear.jpg`,
    `sheet-top-clear.jpg`, `sheet-side7-clear.jpg`, and ISO in rain, `sheet-iso-rain.jpg`); the bank's lobby in each
    view (`bank-iso.png`, `bank-top.png`, `bank-side7.png`, `--bank`). The UI screens are the UI audit's (M9's
    `docs/media/m9/`, the audit's 238 stops). The notes the review raised, and what was done:
    - the big flat roofs (the Brickyard's warehouses, Neon Mile's) were bare slabs: they now carry a stair hut,
      skylights, a duct, a chimney on brick, an aerial or a dish on the tall ones and more units (the builder's own
      stream: nothing else shifts; none of it solid);
    - Neon Mile's neon was thin (M2's note): a style's neon (`style.neon`) puts tubes of light up its street corners
      (in ISO lit after the dark at night) and a shop sign on half its lots more;
    - TOP-DOWN drew every roof's clutter under its roof (each roof prop keyed by its own distance, the roof by its
      nearest edge, so the roof came after): a thing standing on a roof is now drawn after it, as a body up there
      already was (`tests/unit/depth.test.mjs`);
    - accepted, as at M2 (D11's known gap): at night the light field's dark lies in soft shapes between the lamps'
      pools (high roofs, open quays).
  - **Verdicts against PLAN.md 10** (each neighbourhood by day · dusk · night):

    | | ISO | TOP-DOWN | MODE 7 |
    |---|---|---|---|
    | Palm Terraces | pass · pass · pass | pass · pass · pass | pass · pass · pass |
    | Neon Mile | pass · pass · pass | pass · pass · pass | pass · pass · pass |
    | Brickyard | pass · pass · pass | pass · pass · pass | pass · pass · pass |
    | Harborfront | pass · pass · pass | pass · pass · pass | pass · pass · pass |
    | The bank (23:00) | pass | pass | pass |

    - **Palm Terraces:** pastel stucco and balconies, the red Gas'n'Sip, palms on every walk, billboards, roof
      clutter; sodium pools at dusk and night; rain streaks and the wet street's sheen.
    - **Neon Mile:** lit towers, tubes of neon at the corners, shop signs, the Hotel Marquee's sign, the busy roofs;
      MODE 7 looks up its lit facades.
    - **Brickyard:** brick warehouses with tanks, skylights and stair huts on their roofs, the Boom Box and the
      Gutterball signs, the Loop on its pillars overhead.
    - **Harborfront:** the cranes, containers, crates and pallets in the yards, the quay's bollards, the Loop's ramp,
      the glinting water.
    - **The bank:** the lobby's marble and benches, its guard, the cut-away indoors in each view.
- **M13 · test:full on the head, and the Definition of Done (PLAN.md 15 as D29 amends it): M13's acceptance:**
  `npm run test:full`, alone, on `154eb02`: every step passed (30 steps, 1.65 h of their own time):
  - the gate's steps: lint, boundary, vendor, goal-sync, dist current, tuning current; 343 unit and sim tests, the 15
    recipes, FAN-OUT B's 78 review tests; the browser suites (the smoke from file:// and from a static server, replay,
    the Proving Ground's 12 self-tests, audio, the attract mode, photo mode, the dev tools); the engine's checker on
    the city and the bank;
  - the city soak: day and clear for 600 s (1,035 cars and 3,907 peds seen, at most 40 and 196 at once; the longest
    stall 5.8 s, the worst stuck ped 11 s, the worst crossing wait 16.5 s; no overlap, no red run), night and rain
    for 300 s (344 cars, 641 peds; the longest stall 7.6 s);
  - the audio soak (600 s): the four stations heard, the radio on the music bus, mute and the radio's own volume
    hold, the live voices bounded and not growing;
  - the attract soak, 30 minutes a run, headless, on the shipped page and seeds 1-3: 62-74 reels ended and 4-14 cut
    a run, every reel 14-16 times, all three views and the bank, heap growth 0.6-8%; and 5 minutes drawn in Chromium
    (15 reels, 12 ended and 1 cut, heap 5.9%);
  - the gang sim (300 s on seed 1): 6 turf wars, all ended; at most 27 members and 29 fighters; the longest fight
    21 s; no respect moved with the player idle;
  - the UI audit: 238/238 stops (pad, keys and mouse, each alone, at 1080p and 720p), and 51/51 at HUD Huge by pad;
  - the shots matrix (36 shots and the sheet, drawn without an error; the sheet read: as part 5's look pass left it);
  - the mission bot (mortal): every mission and activity level on seeds 1-3, 96/96 (67 gold, 26 silver, 3 bronze;
    11 after a retry), and through a pad, 32/32 (24 gold, 7 silver, 1 bronze);
  - the bot campaign (god): a new game to **100.0%** after 2.15 h of game (28 minutes), no rescue; the 14 missions
    each at its first try, the jobs to level 3, both races, the MAYHEMs, the 25 tokens, the five stunts (the Car
    Park Roof at its second), both properties.
  CI is green on `154eb02`. And the page itself (D31): every one of the 14 missions played
  through to JOB DONE by the mission bot in `dist/index.html` from file:// in Chromium, drawn at the browser's frame
  rate (`?bot=1#mission/<id>`, each in about its game time): 13 on seed 1 (10 gold, 3 silver), and Gutter Ball on
  seeds 2 and 3 (silver both). On seed 1 the page's game had drifted from the headless one (D31), and in its escape
  the bot was pinned on foot: a truck it had left against a wall, two paramedics in the gap, both nearby cars given up
  for the trip (a limit of the bot, in HANDOFF's known limits; a player walks round or takes the truck).

  **The Definition of Done, item by item:**
  1. **Milestones:** M0-M13 each met its acceptance, with its evidence in this log and a verdict on every shot (M13's:
     the matrix's 12 ISO shots, 4 sheets and the bank in each view, part 5; the tab's icon; the screens at HUD Huge;
     Credits & About).
  2. **Tests:** `npm test` and `npm run test:full` pass (above); CI is green on the PR's head.
  3. **The file:** `dist/index.html` is one file of 2,515 KB; the engine's checker reports `external: []` on the city
     and the bank; it plays from file:// (every browser suite, the UI audit, the attract soak in Chromium, and the
     missions above in the page itself) and from a static server (the smoke test); three builds hash the same.
  4. **The slice:** the 14 missions, the side content, shops and properties, each through the bot on three seeds and
     through a pad; the headless campaign reaches 100%.
  5. **Views:** ISO, TOP-DOWN and SIDE-SCROLL MODE 7 outdoors and in the bank (the checker draws all three in each;
     M7's entries): a switch dissolves within 0.35 s (`tests/unit/views.test.mjs`) and leaves the simulation hash
     unchanged (the same city hashes alike in all three views, `tests/sim/city-life.test.mjs`).
  6. **Attract:** section 8.20's items (M11's entry: in at 10.0 s idle, out within one step on any input, the five
     reels, the cards, the camera plan), the soak above, kiosk and phone on a phone's emulation
     (`tests/e2e/attract.mjs`).
  7. **The 10-foot UI:** the audit above, by each device alone at both sizes, and at HUD Huge.
  8. **Determinism and replay:** the same-seed and view-independence hashes (the unit and sim tests), and a recorded
     drive replayed checksum for checksum in Chromium (`tests/e2e/replay.mjs`), each within its runtime (Node's V8 and
     Chromium's differ in the last bit of a few Math results: a seed played headless and in the page drift apart,
     D31). Performance: out of the Definition of Done (D29).
  9. **Extensibility:** the Proving Ground's self-tests (all twelve zones), the 15 recipe tests, and District 2's stub
     (`tests/sim/dev.test.mjs`).
  10. **Docs:** README.md (the Source Information, then apart the engine analysis, how to play, the controls, media);
      `docs/ARCHITECTURE.md`, `CONTENT-GUIDE.md`, `CONTROLS.md`, `TUNING.md` (generated, current), `DECISIONS.md`
      (D1-D31); `docs/ENGINE-ANALYSIS.md` (final), `FEEDBACK-FOR-ENGINE.md`, `QA-DUALSENSE.md`;
      `vendor/my-3d2dge/PATCHES.md`.
  11. **The built HTML:** its header comment carries the Source Information and, apart, the engine analysis's
      summary, and so does Credits & About (its first two pages, read at 1080p), from one source (`src/about.js`);
      "Model and Effort Level" names the AI lab and the effort, the exact model left to the chat report.
  12. **The chat report:** the run's last message.

  **Verdict: M13 done; every item of the Definition of Done holds.**

## After M13: what's left (HANDOFF L1-L8)

- **L1 · determinism across runtimes (D33), done:**
  - **The probe:** every Math function over 200,000 arguments, Node 22.22.0 (V8 12.4) against Chromium 153: `sin`
    5,961 differ, `cos` 5,990, `tan` 6,570, `asin` 11,940, `acos` 15,226, `atan` 4,693, `exp` 11,337, `pow` 19,624,
    `atan2` 35,444 (and every `log`, hyperbolic and `cbrt` function); `sqrt` and `hypot` alike.
  - **The port:** `src/motor/core/dmath.js` against Node's own Math: all equal over 10,000,000 arguments a function
    (and random bit patterns, specials); `hypot` all equal over 6.3 M calls of 2, 3 and 4 arguments; the same code in
    Chromium 153 gives the same bits (2.7 M results, 0 differ). `tests/unit/dmath.test.mjs` (3 tests) in the gate.
  - **The headless game unchanged:** four scenarios (free roam by day, Holy Rollers by the bot, the attract mode, a
    night in the rain) hash the same with the deterministic Math and with Node's own for 240 s, step for step.
  - **The cross-runtime check** (`tests/e2e/cross-runtime.mjs`): before, free roam parted at 20 s and Holy Rollers at
    35 s. With the Math installed, Holy Rollers still parted at 65 s, and only when the page drew: a car's explosion
    drawn by `VehicleFX` stopped the game for a hit-stop at the next frame drawn near it (`freeze: false` there now).
    After both: the three scenarios match at every 5 s for 60 s (the gate's step) and for 600 s.
  - **Closed on `81a34ee`:** `npm run test:full` passed every step, alone, in 100 min 36 s (the cross-runtime check
    600 s a scenario, every mission and activity through the bot on seeds 1-3 and through a pad, the campaign at
    100%), and the bot gym passed 13 of 13 fixtures with the bot (kill after two wrecks) and 13 of 13 through the pad
    (none retried). CI's `npm test` is green on the same commit, in the Chromium 141 that Playwright 1.56.1 installs
    there.
- **L2 · the known limits (D34), done:**
  - **Night glows:** a glow's halo is clipped along the tops of the walls in front of it, column by column
    (`Stage._frontTop`). The unit test walks a lamp back from a block (hidden, cut, whole), checks the columns and
    holds `_hidden` (a wet street's reflection asks it) to the same answer. In the night ISO at the bank a light just
    behind a low block had spilled over the block's roof; it stops at the block's slanted edge now (before and after,
    the same frame).
  - **Rider heights:** a seat's `z` (`seatHeight`): the Sparrow's rider at 7, the Vandal's at 8.2, the kit's bikes at
    their saddles, getting on ending at the riding height (a sim test).
  - **The bot gym** (`tools/botgym.mjs`) has three fixtures for the limits (`evade3`, `haul`, `passerby`), plays
    invulnerable with `--god`, and is a step of test:full both ways; `evade3` is reported, not gating.
    - `haul` (the long Brute to the Gnomes' HQ), seeds 1-5, before → after: 316 → 102 s, 35 → 35, 39 → 39, 769 → 769,
      167 → 38 s.
    - `evade3`, seeds 1-5, before (the L1 commit): passed on 2, 4 and 5 (1, 1 and 2 cars lost), failed on 1 and 3
      (3 and 4 lost in 900 s). After: passed on 1, 2, 4 and 5 (3, 3, 1 and 2 tries lost to a wreck or a bust first),
      missed on 3 (5 lost). Invulnerable (`--god`, the campaign's way, where only the hiding counts), before: passed on
      2 only (406 s); after: passed on 1, 4 and 5 (743, 254 and 583 s), missed on 2 and 3.
    - `passerby`: the bot walks on to the diner in 8 s on seeds 1-3.
  - **S1's delivery** (the long Brute, D22's limit): seeds 1-3 passed with no retry, gold in 442 s, gold in 316 s and
    silver in 419 s.
  - **The pocket:** the 20 s restart (a unit test); no run has met the pocket since L1.
  - **The pad:** the gym through the pad passed 13 of 13 with none retried on the L1 commit.
  - **The tow (the first closing run):** test:full on `3fe54b8` failed one step, the gym's `tow` on seed 3 (900 s:
    the Hookline staged on the car's axis up a one-way street, turned wide, backed while still rolling forward, then
    wedged across the street at the corner). The truck now lines up on the lane beside the car's end, facing the way
    it must stand (D34). The gym's `tow`, seeds 1-5: 92, 93, 124 and 105 s on 1, 2, 3 and 5; seed 4's truck, parked by
    a junction facing the map's edge, still never leaves its spot (it never had: the long truck's tight corner). The
    whole gym on that code: 45 of 45 on seeds 1-3 (the kept limit `evade3` 2 of 3) and 15 of 15 through the pad.
  - **The campaign (the second closing run):** test:full on `b7df89d` passed every step but the campaign, at 96%:
    the moto courier's level 3 failed three times at its first drop, its Sparrow taken where the last item had left
    the player, in a far corner at rush hour. The campaign now takes a job's vehicle from the middle of town, as a
    player setting out on a job would; the whole campaign on that code reached 100% after 2.87 h of game.
  - **Closed on `b7b7556`:** `npm run test:full` passed every step, alone, in 107 min 43 s (the gym on seeds 1-3
    and through a pad among them, every mission and activity through the bot on seeds 1-3 and a pad, the campaign at
    100%). CI's `npm test` is green on the same head.
- **L3 · performance (D35), done:**
  - **Where it stood** (`node tools/perf.mjs --gate`, three rounds, alone): on L2's closing commit ISO 10.60 ms,
    TOP-DOWN 9.07, MODE 7 13.77; on L2's head ISO 10.43, TOP-DOWN 9.39, MODE 7 13.51 (budgets 10.4, 12.7, 12.7).
  - **Where the frame went,** each part left out of every other frame in one page: MODE 7's bodies 2.3 ms of about
    9 (cars 1.0, the light pass 0.83, decks 0.67, the floor 0.49, props 0.4); ISO's light field 1.76 ms of about 7.5
    (the city's shapes 1.54, the crowd 1.23, the walls 1.0, headlight beams 0.28, the HUD 0.2-0.46).
  - **Each change against L2's head,** builds measured in turn on fresh pages (MODE 7's gate scenario, the mean of
    four rounds' frame means): faces stopped at nearer walls -1.4%; bodies in a pixel array -1% (ISO -3.5%), with
    their covered box only -5.7% in all; decks a row at a time -2%; the wedge -1.3%; the haze -2.5% (-7.1% in all
    that run); decks and railings in the haze too -0.6%; a body by the lens kept and enlarged -3.6%. The pixel
    array's bodies: every redraw in 8 s compared with the canvas's, 2,438 in ISO and 1,404 in MODE 7, all equal.
  - **The reading of record,** five rounds, alone, on the commit: ISO 10.25 ms (7.8-8.9 against M2's 7.5-8.1), TOP-DOWN
    9.05, MODE 7 12.13 (7.8-8.2 against M2's 9.9-10.5); the update 0.81-0.97 ms a step. ISO over six five-round
    runs on these builds: 10.08-10.25.
  - **The look:** the same frames before and after (MODE 7 at night in the rain and by day on the Loop, ISO at night):
    near the lens nothing moves but a walker right by it, now a little soft; far down the street the cars and walkers
    fade into the haze with the buildings, and a car's lights still show through it; the decks' tops, undersides and
    edges are unchanged.
  - **Closed on `a70cd51`:** `npm run test:full` passed every step, alone, in 117 min 20 s: its perf gate (five
    rounds) read ISO 10.01 ms, TOP-DOWN 8.86 and MODE 7 12.07 against 10.4, 12.7 and 12.7; the gym on seeds 1-3 and
    through a pad, every mission and activity through the bot on seeds 1-3 and a pad, the campaign at 100%. CI's
    `npm test` is green on the same head.

- **L4 · PLAN.md 19's backlog on Lowtown (D36), done:**
  - **What's in:** the chase camera, a fourth view behind what the player drives or the way they walk (R3 cycles to
    it); photo mode's five looks; SURF CITY 97.3 and VELVET 92.1, each with a genre of its own; Paramedic and Tow
    Truck at three levels; the SkyCam, a helicopter the player flies, and its job; the L boarded and ridden, and L
    Courier on it; Club Chrome's inside (the hall, the bar, the dance floor, the VIP lounge, the office, its bouncers,
    dancers and VELVET on the speakers); and CHROME RAIDERS, the engine's own shooter starter kit, on a cabinet in the
    lounge, its 10,000 a checklist line (Arcade high scores, 2%).
  - **The bot, on `816fe9f`'s code:** Paramedic 9 of 9 on seeds 1-3 (4 gold; 7 retries over the nine: the Medic
    wrecked three times, once by a burning car that blew up beside it in a jam on the Loop's ramp, and four patients
    who couldn't wait); Tow Truck 9 of 9 (8 gold, 2 retries); SkyCam
    9 of 9 (8 gold); L Courier 9 of 9 (8 gold, none retried); CHROME RAIDERS 3 of 3. Through a pad, seed 1: Paramedic
    3 of 3 (1 retry), Tow Truck 3 of 3 (5 retries), SkyCam 3 of 3, L Courier 3 of 3, CHROME RAIDERS 1 of 1. The gym's
    new fixtures (`rail`, `fly`, `arcade`): 9 of 9 on seeds 1-3 and 3 of 3 through a pad.
  - **What the pad's runs found** (D36): the bot's driving now sees a drawbridge's gates shut; a driver held at a stop
    sign behind a car nobody drives goes round it (the halt never came, and the street behind it waited for good);
    the tow bot tries a car's other end only when a lane runs that way, and a retry's Hookline starts a block behind
    the car in its lane, facing its way. Before these, Tow through the pad passed 2 levels of 3.
  - **Its clocks:** L Courier's counts the longest wait for a train (about 43 s: the loop over its two trains), which
    is most of a parcel's time; with the ride and a grace alone level 3 had needed 1-2 retries on every seed.
  - **The recipes:** a helicopter a player flies, an L line's stations, an interior's patrons and spots, an arcade
    kit, an arcade high score, and a station's genre of its own (the station recipe's fixture now brings one).
  - **The look,** read shot by shot (`docs/media/l4`): the cabinet had never been drawn indoors (only the street's
    frame drew it) and, drawn, showed one grey pixel stretched (a canvas sized to where it sits on the page, and it
    sits nowhere); the kit's own buffer is drawn now, and its drawing missed `lerp` (found with ESLint's no-undef over
    the kit: none missing now); at the cabinet the street's HUD is off. Photo mode's look now shows indoors too
    (VAPOR over the dance floor). A helicopter at 120 sat cut off at the top of ISO and above the chase camera's
    frame: every view now follows the focus's height, and in MODE 7 and the chase camera the objective's band sits
    over the skyline, off the player's vehicle. No notes left on Club Chrome's hall, the platforms, the ride, a tow
    on the hook or the ambulance on a call.
  - **The tests it needed:** the views' sim-hash tests switch through four views now; the fleet holds 14 models and
    20 definitions; the mission lint lets a job start on foot at a spot (L Courier's); the radio's and the sound's
    hooks for the tests had been commented out by a line's comment, and are back; docs/TUNING.md regenerated.
  - **`npm test`** passed every step on the commit's code.
  - **What the campaign found** (it sets out as a player does: the job's vehicle taken in town, the job from the
    phone; its first run with L4 in reached 91.3%): the SkyCam's pad had been laid on Marquee Plaza's fountain, out of
    a ped's reach (moved south of it); the campaign hadn't counted the helicopter the player was still flying as the
    next level's; the Car Park Roof's run-up had started on Chapel Street, where a parked car could stand across it
    (it starts in the site's frontage now; it had passed before only on the cars it met); a failed activity had been
    tried again at once, in the same jam (now after the rest); a Medic driven past the end of Loop Avenue had gone
    into the bay, and the next lent where it went in after it (a sea wall stands there now, and a retry is lent a Medic
    at Lowtown General's bay); a wrecked SkyCam or Medic had been gone for good (the landmarks' vehicles are kept now:
    a fresh one at home, out of sight); and the bot's SkyCam had hung against a tower's corner that its look ahead
    missed (it climbs when it goes nowhere now). Each a commit of its own (`63bcf53`, `ec30826`, `6ddd0b9`), each with
    `npm test` green.
  - **The campaign** on `6ddd0b9`'s code: 100.0% after 3.05 h of game, in 29 min.
  - **What test:full found** (on `e2f61c4`, then `ae8bb79`, then `5cf9f52`): the day soak's seed played out differently
    on L4's city and met two old faults: a car holding its junction stood blocked at the line with its nose over it, and
    went on its old green once the box cleared, after the light had turned (a held box now lapses at red for a car still
    short of the box); and a turf war went on after the focus left it, three of its fighters standing in a junction with
    the traffic queued behind them (a war whose middle the focus leaves beyond the crowd's ring is over now: its
    fighters walk off). Both soaks then: day 600 s, longest stall 4.0 s, no red runs; night 300 s, 9.3 s, none
    (`ae8bb79`). The HUD-size-Huge audit (320 x 180) found the BUTTON LAYOUT screen's L1 / R1 outside the safe area, the
    cabinet's tab having widened the strip: the tab is ARCADE, a tab strip closes its gaps where it would leave the safe
    area, and the screen's rows, read by eye, had stood on one another at every size since M9 (twelve to a column in a
    fixed 86 units): its body is as tall as the screen allows and what doesn't fit goes on a page more, △ MORE
    (`5cf9f52`, both audits 51 of 51). The traffic's red lights then tipped two mission-bot runs: Harbor Hustle L1 on
    seed 3 took a rival waiting at a red for a box (the AutoPlayer read a leader's waiting from a city car's brain,
    which a job's car has not: a job's driving car carries its brain as `drivenBy` now), swung round it, and the route
    from the swerve went round the block; and Firefighter L3 on seed 2 had its retry's engine put on the next street's
    lane the other way, the call a lap of the city (a retry keeps the engine's heading first, and only a car in the lane
    counts). Both pass on seeds 1-3 (`081a33c`). The pad pass then failed two of L4's own jobs: MAYHEM's meet had
    Channel 6's SkyCam standing on its pad inside the ring of cars by the fountain (the meet's marshals clear the plaza
    now); and Tow Truck L3 on seed 1, a run the pad pass had never yet passed, met a city a turf war had wrecked: a
    burnt-out hauler at Loop Avenue and Marquee Street's mouth, a burnt-out Cortez at the kerb beside it, the units sent
    to them queued behind wrecks at the next junction. Traffic shoved a car nobody drives only after 16 s blocked, so
    the streets round them stood for minutes; a wreck is shoved after 4 s now (nobody comes back for it), and the bot
    with a car on its hook never tries to go round (backing folds the rig; it pushes a car nobody drives on, and waits
    out anything else), and a mission car that has stopped driving no longer shows its driver's last wait to the bot
    behind it. Tow L3 passes by pad (silver, one retry, where every try at its first ticket had run out) and on seeds
    1-3 (`8be7162`). test:full on that then failed Paramedic L3 on seed 2: an ambulance its crew had left in the lane,
    and the bot's Medic behind it rocked through four retries, each round dropping its brain before the shove came;
    boxed in by a car nobody drives, the bot now shoves it every other time (`b2a285d`). Its campaign then reached
    98.2%: the stunt over the drawbridge never left the ground in three tries, a Cortez its driver had run from standing
    on the span and the bridge, its gate shut for a lift, waiting on it (the tow takes a car nobody drives only out of
    sight, and the campaign waits in sight of it); a car left by its driver on a drawbridge's span is towed once the
    gate is shut and it has stood a minute, in sight too (`de2e5b0`).
  - **The campaign** on `de2e5b0`'s code: 100.0% after 3.14 h of game, in 31 min.
  - **`npm run test:full`** on `de2e5b0`'s code, alone: every one of its 34 steps passed, in 2 h 14 min (the perf gates,
    the soaks, the mission bot on seeds 1-3 and through a pad, the bot gym both ways, the campaign at 100.0%).

- **L5 · the expansion's plan (D37), done:**
  - **`docs/EXPANSION.md`:** the full game at a glance (3 districts, 7 gangs, 32 missions, 3 heists, 9 jobs, 4 races,
    5 MAYHEMs, 11 stunt jumps, 55 Moto Tokens, 6 properties, 4 interiors, 29 vehicle definitions, 14 weapons); the
    world (travel between districts, Ironside west across the canal, Glass Heights east across the bay at the end of
    the Loop Causeway); the gangs, the 18 missions and the side content a district; the content packs; MOTOR's work;
    milestones X1-X8, planes before the missions that fly them and boats with the ones that sail; the Definition of
    Done (a bot campaign at 100% across the three districts); the risks.
  - **Its scope** is D37's, recorded before any of it is built; PLAN.md stays the contract for what it doesn't change.
  - **`npm run test:full`** on `b8138c5`'s code, alone: every one of its 34 steps passed, in 2 h 11 min (ISO's draw
    10.03 ms on the gate's machine against its 10.4). Its first run, on the same code, had failed only the perf gate:
    ISO at 10.64, M2's build reading fast in its rounds; L4's code had passed there at 10.05, and two gate runs alone
    then passed at 10.19 and 10.31. ISO's margin is 1-3% (MODE 7's 2-5%): a known risk for the expansion's perf step in
    each district (X8), where the headroom is to be found.

- **X1 · districts in play, and Ironside's map (D38), done:**
  - **What's in:** Ironside, District 2, grown from its stub to 128 x 112 (the Foundry, Scrapyard Flats and Voltage
    Row, the canal and the river, Ironside Avenue on the Flyover, its doors, landmarks, fleet, traffic and crowd); the
    west bridge between it and Lowtown, closed on a new game (Lowtown's embankment and the strike's notice across Loop
    Avenue's west end, Lowtown hashing as before X1) and open once The Big Withdrawal is done; a crossing by car or on
    foot, one map at a time across the engine's fade, carrying the vehicle, the crew, the hour, the stars and the view;
    only a job holds a bridge; the career per district and `save.district`; the map's bridges, a closed one greyed.
  - **The tests:** `tests/sim/districts.test.mjs`: the west bridge closed on a new game and open once The Big
    Withdrawal is done; over it and back by car in ISO, TOP-DOWN, MODE 7 and the chase camera, the district, the car
    (its paint and damage), the fund, the hour, the stars and the view carried; on foot over it and back in each view;
    two runs from one seed hashing the same after a crossing; a job holding the bridge; Ironside validating, playing
    with its traffic, crowd and doors, its hospital, and a save made there loading there.
  - **D21, on `34bc156`'s code:** the mission bot on seeds 1-3, 135 of 135, and through a pad, 45 of 45; the city soak,
    Lowtown's day 600 s (longest stall 4.0 s) and night 300 s (9.3 s) as before X1, and Ironside's day 600 s: 636 cars
    and 2,214 peds seen, mean speed 29.3, longest stall 8.5 s, no car in another, no red run. The districts' tests and
    Ironside's validation (the district recipe's checks) pass in `npm test`.
  - **The look,** read shot by shot (`docs/media/x1`: its three neighbourhoods by day and night in ISO, TOP-DOWN,
    MODE 7 and the chase camera, the sheet and six kept): no defects; the Power Station stands a plain block till X3
    lays out its yard, and its roof is dark at night as Lowtown's roofs are.

- **X2 · planes (D39), done:**
  - **What's in:** a vehicle class, `plane` (`sim/vehicle/plane.js`): on its gear it rolls as a slow car and past its
    rotation speed lifts off; in the air the stick banks it and the bank turns it, the throttle sets its speed, a climb
    costs speed and a dive gives it, R1 / L1 climb and descend with the height held between (the helicopter's buttons);
    under its stall speed its wings let go until it is 15% past it again; it sets down level, slow and gently on what
    it can land on (a landplane the ground, a seaplane the water), and anything else is a crash. It meets things with
    its fuselage, never leaves its district (it banks round at the world's edge) and crosses no bridge in the air. The
    Duster stands on Ironside Airstrip's apron (a pad, kept as the SkyCam is); the Gull flies off and onto the sea. The
    bot flies them (`AutoPlayer._plane`): off along a clear run, to a point at a cruising height clear of what stands
    below and ahead, and with a `goto`'s `land` down on a strip (an approach 700 back at 150, the glide in lined up and
    slow, round again when off the line).
  - **The tests:** `tests/sim/planes.test.mjs` (the Duster off the runway, round a circuit at 200 and down again
    unharmed; a stall and its recovery, a dive and a wall flown into crashes; boarded and left only on the ground, the
    world's edge; the Gull off the water and onto it, a landplane on the water going under); the handling suite's plane
    checks (its takeoff, its climb, its top speed, its height held, a banked turn, a stall, a gentle landing).
  - **The bot:** the gym's `plane` fixture (the Duster off the strip, over Union Hall and down on the strip again) on
    seeds 1-3, 3 of 3, and through a pad, 1 of 1.
  - **D21, on `08366b8`'s code:** the mission bot on seeds 1-3, 135 of 135, and through a pad, 45 of 45 (the planes'
    changes to the vehicle, the fleet, the driver and the AutoPlayer leave every merged mission and activity passing).
  - **The look,** read shot by shot (`docs/media/x2`: the Duster on the apron in ISO, and aloft at 167 over the
    Foundry in ISO, TOP-DOWN, MODE 7 and the chase camera): no defects. The biplane reads at every view, MODE 7's and
    the chase camera's lens riding up with it; an aircraft casts no shadow on the ground, as the slice's helicopter
    doesn't.

- **X3 · Ironside's gangs and missions (D40), done:**
  - **What's in:** the Rust Monks (Scrapyard Flats; the Scrap Cathedral, their HQ and payphone; the Scrapper, a crane
    truck on the Hookline's chassis; the Nail Gun) and the Volt Boys (Voltage Row; Substation 9; the Bucket, a cherry
    picker on the Hauler's; the Tesla Coil), each with its grunt and enforcer, turf and rival; the Lawn Gnomes' Ironside
    turf and HQ, the Union Hall (a gang's HQ and rival per district: `hqs`, `rivals`). Nine missions: Picket Line and
    Scab Labour (the Gnomes), Holy Scrap and Sermon on the Mound (the Monks), Live Wire and Short Circuit (the Volt
    Boys), and Blackout's setups Grid Map and The Lineman and its finale, played by all three. The Ironside Power
    Station, an interior: its lobby, corridor, control room under its camera, turbine hall and switchyard, its valves
    spots with a verb.
  - **The tests:** `tests/sim/ironside-gangs.test.mjs` (specs clean; turf, HQs and rivals by district; the Monks at
    the Cathedral, hostile, going for the player; the Buckets and Scrappers keeping to their turf; the Nail Gun and the
    Tesla Coil at Lead Farm once their jobs are done, the coil's arc jumping); `tests/sim/power-station.test.mjs` (it
    validates, its door is Ironside's, the lobby reaches every room; the corridor's east aisle out of the guard's
    sight; the camera's sweep and the plans; △ at a valve told on the BUS); the handling suite's per-vehicle checks
    (the Scrapper's and the Bucket's handling within their spec, their models sound); the range bench (the Nail Gun's
    and the Tesla Coil's DPS within 10%); the gang, vehicle and weapon recipe tests beside them (the weapon's fixture a
    Staple Gun now: the Nail Gun is Ironside's).
  - **The bot:** each of the nine on seeds 1-3, 27 of 27, and through a pad, 9 of 9 (in the runs below).
  - **D21, on `e56dc10`'s code:** the mission bot on seeds 1-3, 162 of 162, and through a pad, 54 of 54. The re-run
    found two of the slice's: The Big Withdrawal on seed 3 losing its Strongbox at the ram (a back-off left standing
    while the Strongbox was out of reach braked the bot as it caught up; seed 3 had taken 619 s of game before X3, and
    passes gold in 209 s now), and Sermon on the Mound's Brute stuck behind a hostile Volt Boy in the lane (the box
    clock started again with each new brain of a chase: it reads the last brain's cause now; held over every fresh
    brain at first, it rounded queues in chases, and Scab Labour's Brute missed its buses).
  - **The look,** read shot by shot (`docs/media/x3`: the Power Station in ISO, TOP-DOWN, MODE 7 and the chase camera
    at night; each HQ, the Union Hall, the Scrap Cathedral and Substation 9, in each view by day; six kept): no
    defects. The Power Station's white plaster is lit at night and the void outside its walls shows in MODE 7, the
    chase camera and TOP-DOWN, as the bank's side door's does (the slice's interior look). Each HQ has its crew by it:
    the Gnomes in pink at the Union Hall, the Volt Boys in hard hats by their Bucket at Substation 9; the Monks' hangout
    is put down across Crusher Lane from the Cathedral's door (the crowd puts no one down in its inner ring round the
    player), out of the ISO frame of a start at the door, as the gangs' test reads it from across the street.

- **X4 · Ironside's side content (D41), done:**
  - **What's in:** Crop Duster (the Duster from the phone's JOBS: rings hung low over the allotments' rows and round
    the runway, flown through in order against the clock; 12, 16 and 24 rings, 30, 38 and 52 s), the Ironside Air Race
    (taxied to the line on the runway, a countdown, twelve gates round the works; the board's three best times are the
    racers: 21, 24 and 28 s), MAYHEM: Nail the Scrappers (the Nail Gun, ten of the Monks' Scrappers round their
    cathedral, eight in 1:30), three stunt jumps (the Flyover's End, a spur off the Flyover's west side over the Monks'
    yard; the Slag Heap, a kicker and a landing of dross on the slag tip; the Crusher Yard, a kicker beside Monk &
    Sons' crusher), 15 Moto Tokens, two properties (Sudsy's Launderette under the crew's flat, $20,000; the Airstrip's
    hangar, $40,000), the Ironside Kwik-Lux on Crusher Lane (its till for a hold-up), and the attract reel CROP DUSTER
    (in Ironside: off the runway, low over the beans, slowly past the Power Station's stacks). The map's new lots: the
    allotments and the slag tip (of the runway's kind: no trees, lamps or crates), the Kwik-Lux; no car parks at a
    kicker's foot.
  - **The tests:** `tests/sim/ironside-side.test.mjs` (the Kwik-Lux's hold-up: the till at the counter, two stars;
    the two properties bought at their doors in Ironside and paying at midnight, neither door in Lowtown; the three
    stunts on their ramps, each kicker's lip 32 up, the spur 64 up and no lane on it; the 15 tokens laid out in
    Ironside alone, Lowtown its 25); the planes' sim tests (a plane flown into a wall drops); the districts' (Ironside
    offers its own activities, none of Lowtown's).
  - **The bot:** Crop Duster at each level on seeds 1-3, 9 of 9 (gold), and through a pad, 3 of 3; the Air Race on seeds
    1-3, 3 of 3, and a pad, 1 of 1 (21.8 s each time: second on the board); MAYHEM on seeds 1-3, 3 of 3 (gold), and a
    pad, 1 of 1; the reel to its end eleven times running in `#attract/crop_duster`, no cut.
  - **The campaign,** a new game through Lowtown and over the west bridge once The Big Withdrawal opens it, through
    Ironside, on `3499cb1`'s code: 100.0% in 4.94 h of game, 53 minutes (Missions 23/23, Jobs at level 3 8/8,
    Street races 3/3, MAYHEM 4/4, the arcade's high score 1/1, Unique stunt jumps 8/8, Moto Tokens 40/40, Properties
    4/4). Four took more than one try: Scab Labour and Holy Scrap passed at their second (Holy Scrap's Hookline put back
    on its lane four times in the first), the Container Stack at its second (its run-up's line-up knocked aside) and the
    Slag Heap at its third (a Cortez standing on its kicker).
  - **D21, on `3499cb1`'s code:** the mission bot on seeds 1-3, 177 of 177, and through a pad, 59 of 59 (on `4db01cf`'s before
    it, the same).
  - **What the runs found,** each mended (D41): the save dropped the Rust Monks' and the Volt Boys' respect at every
    load and crossing; Sermon on the Mound's Bucket, free to flee anywhere, had wedged itself at the world's edge while
    the bot's Brute stood in the west bridge's jam (it runs rings round the crusher yard's block now, caught on its
    tail), and the Brute had waited on hostile Volt Boys in the road; the Duster had circled the Air Race's start at a
    taxi, and Blackout's had turned for the hangar into the strip's wall till the police shot it to a wreck; The
    Lineman's yard and Scab Labour's Loop Avenue were cleared for their stages; the campaign had taken Sermon on the
    Mound's offer at the Monks' payphone with every step on its way to the Flyover's End token; Crop Duster's Duster,
    left on the runway under the first ring, had sat there arrived (a plane on the ground under a goal in the air takes
    off for it now); and Sermon on the Mound's held-back heat had come down on the crew as four stars as it ended, Live
    Wire then played with the police on it (it is cleared with the cap now).
  - **The look,** read shot by shot on `4db01cf`'s page (`docs/media/x4`: Crop Duster's ring in the chase camera, the
    Air Race's gate in MODE 7, the slag tip, the spur over the Scrap Cathedral, the crusher yard, the hangar with its
    BUY prompt and the reel low over the beans; seven kept of thirteen). Three notes fixed: a car parked at the Slag
    Heap's foot (no car parks at a kicker's foot now), the kickers were concrete on dirt (the Slag Heap's are dross now:
    a deck's `surface`), and the reel's frame had caught the Duster low over the street, overlapping a truck in ISO
    (the frame kept is over the beans). The hoops hang upright across the way they are flown, green for the field and
    cyan for the race; in TOP-DOWN a gate reads as a flat ring. As the slice's, the HUD's lines sit over the world's
    labels with no panel under them.
- **X5 · Glass Heights' map and the Loop Causeway (D42), done:**
  - **What's in:** Glass Heights, District 3, 128 x 112: Cathedral Hill along the north (the Glass Tower over the bay
    with its jetty, St. Chrome's Cathedral, the Bellevue, whose penthouse is the safehouse, the Observatory), the Strip
    either side of Loop Avenue (the Velvet Casino behind its fountain, the Hotel Riviera, the Grand Palms, Heights PD,
    Spray & Pray Heights) and Marina Heights above the sea (Heights General, the Yacht Club and its pier, the marina's
    piers); the bay down the west edge, the sea east and south; its streets, cars and people (the slice's, their spawn
    zones naming its three neighbourhoods), the Gull afloat at its moorings by the Club's pier. The Loop Causeway: Loop
    Avenue on east from Lowtown's sea wall, over the bay into Glass Heights; shut on a new game (the sea wall, CAUSEWAY
    CLOSED on it), open once Blackout is done (its last card says so), Lowtown with it shut the city it was.
  - **The tests:** `tests/sim/glass-heights.test.mjs`: the Causeway shut on a new game and open once Blackout is done
    (the sea wall's column cut, the deck out over the bay, the notice gone, the west bridge as it was); over it and
    back by car in ISO, TOP-DOWN, MODE 7 and the chase camera, the district, the car (its paint and damage), the fund,
    the hour, the stars and the view carried; on foot over it and back in each view; two runs from one seed hashing the
    same after a crossing; Glass Heights validating with no warning, playing with its traffic, crowd and doors, the
    Gull afloat off the pier, its hospital after WRECKED, a save made there loading there, and nothing registered twice;
    the attract mode as it was (`npm test`'s attract run).
  - **D21, on b15d80b's code:** the mission bot on seeds 1-3, 177 of 177, and through a pad, 59 of 59; the city soak,
    Glass Heights' day 600 s: 737 cars and 3,090 peds seen, mean speed 27.4, longest stall 16.7 s (a far car at Heights
    Avenue and Observatory Lane, kinematic), no car in another, no red run, worst stuck ped 6 s, worst wait to cross 16 s.
  - **The look,** read shot by shot (`docs/media/x5`: its three neighbourhoods by day and night in ISO, TOP-DOWN, MODE 7
    and the chase camera, read on the matrix's sheet, four kept; the Causeway at each end, along its deck in MODE 7 and
    from above, Lowtown's sea wall shut and open; the Gull at the Club's pier). Four notes fixed: the Causeway's road had
    stopped at the water in Lowtown once open (its deck goes on to the map's edge now); the Velvet Casino's roof was a bare
    plum slab from above (its plant on it now); CAUSEWAY CLOSED, on the sea wall's west face, was half hidden by the wall
    from the ISO camera (a board on posts on the wall's top now); Lowtown's span had no railings (railed now, MOTOR's
    `rails` on an opening). As the slice's, a building's north face is out of the ISO camera's sight (the casino's front
    on Loop Avenue among them), and the deck past Lowtown's gate is unmarked (a road's markings come with its band; it is
    never driven: the crossing is at the gate).
- **X6 · Boats, and Glass Heights' gangs and missions (D43), done:**
  - **What's in:** the Velvet Syndicate (plum and gold, a spade, damask: the Strip, the Velvet Casino, the Velvet limo,
    the Buzzsaw and the Persuader) and the Yacht Club (navy and white, an anchor, bands: Marina Heights, the Club's pier,
    the Regatta and the Zephyr, the Snub and the Flare Gun), the Saints uptown at St. Chrome's; rivals by district. On
    the water the Splash (the marina's), the Regatta (the Club's) and Moneybags (the Syndicate's floating casino), the
    AutoPlayer sailing a course round the shore and what lies moored; the Velvet limo and a white one for hire; the Flare
    Gun (a flare sets what it hits burning and leaves a pool of fire; Lead Farm's once Overboard is done). The Velvet
    Casino (the floor and the hall the public's, the staff corridor, the cage, the vault that opens once cracked, the
    roof and its fire escape; three hoods, four cameras, patrons). Nine missions: Communion and High Mass (the Saints),
    The Comp and Loaded Dice (the Syndicate), Overboard and Flare Up (the Club), and House Edge's Floor Plan, The Gull
    and finale (all three of the crew: the vault from inside, the cage van rammed, the take flown out in the Gull, four
    stars). MOTOR: a seated rider's drive-by, a chase that keeps its distance, a guard that minds only its own hurt, a
    phone's camera no gun indoors, the flare, an interior's guard's own weapons and `R.open(mark)`, `m.peace()`, a
    seaplane afloat boarded from the shore, the planes' approach inside the world's edge and their edge guard on a
    predicted exit.
  - **The tests:** `tests/sim/heights-gangs.test.mjs` (the two gangs and the Saints uptown: specs clean, turf, HQs,
    rivals by district, hostile on sight at the casino, the limos and the Club's Zephyrs in their turf, the Flare Gun on
    the shelf and a flare setting a car burning with its pool of fire, a job's peace holding turf wars off);
    `tests/sim/casino.test.mjs` (it validates, its two doors the city's, the vault sealed from both; a guest on the
    floor, the corridor on a staff pass and off it; △ at the vault's door and at the take, the vault opened and walked
    into); `tests/sim/boats.test.mjs` (the boats afloat at their moorings, the Regatta sailed home round the moored Gull,
    never pushing it); `tests/sim/mission-motor.test.mjs` (a seated rider's drive-by, a chase's keep, m.peace held and
    lifted); `tests/sim/planes.test.mjs` (along the world's edge a plane flies on); the mission lint and every stage's
    deep link with the nine missions; the bot gym's `boat` and `plane` fixtures on seeds 1-3 and through a pad, 6 of 6
    each way.
  - **Each mission through the bot** (in D21 on f3947b4, below): on seeds 1-3, 27 of 27, all but three without a retry
    (High Mass seed 1, busted once at the grid; Flare Up seeds 2 and 3, Dex down once, by a crowd cop who squared up to
    the Flare Gun aimed past him, and in the water); through a pad, all nine, Floor Plan and Communion after X6's last
    commit (Loaded Dice and The Comp after a retry).
  - **From the runs of all merged content** (D43's addendum): the AutoPlayer's off-route replan kept off a goal near
    or to be faced (Holy Scrap's tow and Tow at level 3 had been led off their stops; it still re-plans after .6 s, a
    Medic stuck on the Loop's deck at 2.5); a shot from the shoulder at a car lower than the muzzle at its flank (the car
    under the point, or the first on a free aim's line, beating the assist's pull past it; the assist with a point never
    more than 40 u past it), the bot's shots at a car with the aim free; the Snap's aim free (Floor Plan through a pad);
    the services' crews back in past a parked car (a unit left in a one-way street's lane had held traffic for good);
    Flare Up's and Communion's peace, Flare Up's truce with the Syndicate, Communion's Zephyrs armoured.
  - **D21, on f3947b4's code:** the mission bot on seeds 1-3, 204 of 204; through a pad, 66 of 68, Floor Plan (the
    Snap swung to a guard) and Communion (a turf war on the hill) fixed in X6's last commit: Floor Plan through the pad,
    gold; Communion through the pad, gold, and on seeds 1-3, 3 of 3. All merged content again on X7's head (X7's
    entry).
  - **The look,** read shot by shot (`docs/media/x6`: the casino by night, dusk and from the back, its floor in ISO,
    TOP-DOWN and MODE 7, the cage in the chase camera, the vault opened; the Yacht Club, St. Chrome's, the marina from
    above, the limos, Moneybags with the Regatta and a Splash, a flare's fire, House Edge's rams). Three notes fixed:
    the ALARM banner had covered the location line (centred in the space beside it now); the objective band had met a
    first-time tip's box (below it now); St. Chrome's sign read "ST. CHROME'S." with a stray stop (gone).
- **X7 · Glass Heights' side content (D44), done:**
  - **What's in:** Limo (Heights Limousines' fares, met at the Heights' doors and driven to the door they name, their
    patience worn by every knock, the tip by how smooth it was: two fares at level 1, three at 2, four at 3); the
    Heights Regatta (any boat round the Heights by sea through ten buoys, against the Yacht Club's board of three times);
    MAYHEM: Flare the Limos (seven of the Syndicate's nine limos round the casino set alight in 1:30); three stunts (the
    Villa Pool over Villa Marisol's pool, the Velvet Fountain up the casino's forecourt, the Palms Newsstand up the Grand
    Palms'); 15 Moto Tokens; the Glass Tower penthouse and the Marina berth; the Strip's Kwik-Lux and its hold-up; the
    Grand Palms' white limo for hire; the attract reel THE STRIP (night down Heights Avenue in MODE 7, Casino Row in ISO,
    the marina from above). MOTOR: the AutoPlayer's `smooth` style, `m.deliver`'s and a `goto` hint's `style`, TOP's
    ground past the map in a district's sea colour (`beyond`).
  - **The tests:** `tests/sim/heights-side.test.mjs` (the Strip's Kwik-Lux emptying its till with two stars; the
    penthouse and the berth bought at their doors and paying at midnight, neither door in Lowtown; the three stunts'
    kickers at their heights and the Villa's pool between the kicker and the landing, each approach behind its run-up;
    the 15 tokens in Glass Heights alone, every token id its own across the districts; the hire limo at the Grand
    Palms); Glass Heights' sim test offering the Heights' own race and MAYHEM alone; the attract soak's list naming
    every reel.
  - **Each activity through the bot** (in D21 on 409066b, below): Limo at each level on seeds 1-3, 9 of 9 (seed 2's
    three after a retry: a fare late, or out of patience with the bumps) and each level through the pad; the Regatta 3
    of 3, gold, and through the pad; Flare the Limos 3 of 3 (seed 2 after a retry) and through the pad. The reel THE STRIP ten times running from the attract seed: nine to their end, one cut by the
    watchdog at a queue for Casino Row's lights (Hot Pursuit's are three in ten).
  - **The campaign tool over the Heights' items** (`--only`, `--ready`): the 15 tokens and the three stunts (the Palms
    Newsstand at its second try).
  - **What the runs found,** each mended (D44 and its addendum): Limo's clocks at first too short for a limo driven
    gently (late a light short of the door) and the `player` style's squeeze wedging the limo on the walk past a jam
    (`smooth` now); a Medic's crew stranded by a Fed Sedan parked against its door, the unit left in Casino Row's lane for
    good (X6's last commit); the Velvet Fountain's run-up from the avenue's middle held in the Strip's traffic (from its
    west walk now); the Heights' marina token sharing Lowtown's id; a turf war round Flare the Limos (its peace); the
    reel's start in a queue at the Loop's lights; and in all merged content and the campaign, Blackout's Duster circling
    its approach at Ironside's edge (a plane's turn out at 600, Blackout landing east), Scab Labour's Brute going round
    the blocks to the next bus (the head-on ram), the Crusher Yard's run-up in Crusher Lane's traffic, and Paramedic's
    level 3 a little short of time.
  - **D21, on 409066b's code (X7's last):** the mission bot on seeds 1-3, 219 of 219 (155 gold, 50 silver, 14 bronze;
    20 after a retry); through a pad, 72 of 73, the Lineman's evade wedged at a curb short of the airstrip's hangar,
    fixed in X8's first commit and run again (X8's entry). Two runs of all merged content before it, on e834dc3, had
    found Vigilante's level 3 sat behind a queue by the head-on ram and The Big Withdrawal's seed 2 with a car in its line
    of fire: both fixed in 409066b (D44's addendum).
  - **The look,** read shot by shot (`docs/media/x7`: the Villa Pool's jump in ISO and MODE 7 and its pool from above,
    the Velvet Fountain's and the Palms Newsstand's jumps, the Kwik-Lux, the penthouse's and the berth's doors, a
    fare picked up and a ride in the chase camera, the Regatta's line from above and the race, Flare the Limos, the reel
    THE STRIP). One note fixed: TOP's ground past the map's edge had been a flat grey off Glass Heights' bay (the
    district's sea colour now, `beyond`).

- **X8 · The full game, verified (D45), done:**
  - **The campaign across the three districts** (`tools/bot-campaign.mjs`, a new game from the title's NEW GAME): 100.0%
    after 5.63 h of game, in 48 min, in test:full on d9542e1 (32 of 32 missions, the nine jobs at level 3, 4 of 4 races,
    5 of 5 MAYHEMs, the cabinet's high score, 11 of 11 stunts, 55 of 55 Moto Tokens, 6 of 6 properties). Four campaigns
    before it found, each mended (D44's and D45's): the crossing from Ironside to Glass Heights only by way of Lowtown
    (a district between); the Heights Regatta never started (boats passed over, then a Splash gliding on out of the
    start on its handbrake); the Palms Newsstand's car put in the sea past Bluewater Drive; the Grand Palms' limo,
    burnt, never back (a wreck beside it never towed: MOTOR tows wrecks out of sight now); the Limo's level 3 late fare
    after fare (its clocks, the ride timed from the limo) and its limo held in a crash scene's jam (the rescue tows the
    wrecks round a spot it rescues twice). test:full's closing runs then stopped at the campaign three times, at 98.5%,
    98.5% and 99.2%: the Heights Regatta off the podium (a Splash come to the line bow north had turned round at the
    green; then the two Gulls The Gull and House Edge set down in the bay lay across its course, and the Splash swung
    round them into the shallows), and the Villa Pool's stunt never off the ground (a car queued at a light across its
    run-up, its tail in the line, shoved along the whole run). The Regatta lines a boat up on its start and clears its
    course at the start; the campaign's stunt run waits for a clear run-up (D45).
  - **The city soaks** (test:full's first run on 76bc12d stopped there): Ironside's and Glass Heights' 10-minute day
    soaks had failed since X6 gave Glass Heights its gangs (a turf war's wrecks in the streets; Ironside's own near the
    bounds): units with sirens standing with no cause behind a queue held by a wreck, far cars creeping through wrecks
    and parked units, a car pinned on a wreck's corner with another behind it, a ped trapped by a car left on its
    crossing, a ped on its feet just out of a line's reach, a second Medic for a body already served, a pass merging
    onto what it passed as it pulled away; and one bike counted a red run past its stop line before the red. Each mended
    (D45's list). test:full's second run then stopped at the gang sim: a Saint two minutes in one fight, shooting at a
    Rat the crowd had put away (a fight with one the world has let go of ends now: the longest fight 50 s). That moved
    every soak, and its third run stopped at them again, on what they had not reached before: a parked unit left the
    speed of a knock, traffic's GPS routes into a dead end's stub at a district's edge, far cars behind a turf war's
    wrecks to a lane's end and a parked car knocked into a box, a pass's obstacle moving off, parked cars swinging side
    to side and a car held at a red creeping on (the tyres at a crawl), a hauler taking the box from a stand on amber,
    far cars breaking a gridlock by driving through, a squeezer and a panicking bike into a held box, a wedged car put
    down in a box on its red, a fleeing ped against the Flyover's ramp, a mime's file put down in sight; and two of the
    soak's own measures (a siren's crossing, two bikes side by side). Each mended (D45's list). The fourth run (69828f8)
    passed every step to the screenshot matrix and stopped at D21: 10 of 209 runs (Communion's chrome Saint wrecked
    beside a car Lugnut shot to a wreck, Holy Rollers' Saint driven into the sea by the Harbor's stub, Drag Mass held at
    the Harbor by a limo's turn, five Tow tickets lost behind a car the Saint had brushed, two MAYHEMs short). Each
    mended (D45's list: an ally's drive-by spares a car beside its own; the bot's way never by a dead end's stub; the
    long-vehicle rule gone; a pass's obstacle a leader only once knocked well on; the two MAYHEMs pass on that code),
    and all merged content run again found three more: two scared cars, unseen by each other, nose to nose in Drag
    Mass's c45 (panic taken as a siren's turn instead had the Monks' blockade queue Picket Line's soup van under their
    guns, so panic still ignores the lights and the reservations, the scared car now seen in the box); a far Scrapper's
    ring hop short of the lane in Ironside's j13; and the soak's stop line read by the car's centre (a car in at j3 on
    the green, queued with its centre still in the box behind, counted on the red). Seeing a scared car's way through a
    box stays the other scared ones' alone: a squeezer that waited on it had stood 100 s at j28 behind one stuck there,
    a Tow ticket lost. The four soaks after, in test:full (on 4b1f149 and the later heads alike, d9542e1's the closing
    run): Lowtown by day (600 s, 1,082 cars and 4,016 peds seen) the longest stall 4.3 s, at night in the rain 0.4 s,
    Ironside 2.4 s, Glass Heights 1.4 s (the bound 20), no overlap and no red run in any; the gang sim's two turf wars
    both ended, the longest fight 60 s.
  - **D21 runs on X8's code** (test:full on 4b1f149, and again on each later head to the closing d9542e1): every mission
    and activity level through the bot on seeds 1-3, 219 of 219 (151 gold, 51 silver, 17 bronze; 21 after a retry), and
    through a pad 73 of 73 (47 gold, 17 silver, 9 bronze). The 4b1f149 run stopped at the bot gym, two fixtures on seed
    3 (the gym had last passed whole at L4's close; seed 3's tow had failed from X6's close on): a turf war by the
    follow's mark had shot its Saint to a wreck beside the bot, and the tow's car stood with another parked nose to its
    front on a one-way street, no end left to hook. The gym keeps the city's gangs at peace now (it measures the bot at
    each hint; the wars are the missions' and the campaign's), and the tow fixture's spot is cleared as the Tow job's is
    (D45). The gym on 86dd433 and after: 60 of 60 on seeds 1-3 (the kept limit `evade3` 1 of 3) and 20 of 20 through a
    pad (`evade3` 1 of 1).
  - **The perf gate in each district** (`tools/perf.mjs --gate --rounds 5`, in test:full on d9542e1, alone): the draw on
    the gate's machine, ms, against D10's budgets (ISO 10.4, TOP-DOWN 12.7, MODE 7 12.7): Lowtown 10.05, 9.09 and 12.32;
    Ironside 8.25, 7.92 and 10.49; Glass Heights 9.37, 9.22 and 11.79; the update at most 0.98 ms a step (the budget
    1.5).
- **The screenshot matrix in every district** (`tools/shot-matrix.mjs`, the ten neighbourhoods by day, at dusk and at
    night in ISO, TOP-DOWN and MODE 7: 90 shots), read one neighbourhood at a time (`docs/media/x8`: a sheet each). One
    note, in every district: the HUD's words over a big sign, a white crossing or a pale wall had not read (the Glass
    Tower's sign behind the place line in TOP-DOWN, the Gilded Lily's and Zappo Cola's behind the weapon and the stars,
    "DEX $250" over Palm Terraces' pink walls). Fixed: the place line, the protagonist and the cash, the weapon's name
    and the stars on translucent plates, the weapon's box less see-through; read again in Cathedral Hill, the Strip and
    Palm Terraces by day and night in each view. Read again on X8's last head, its test:full's own 90 shots (on 4b1f149:
    nothing drawn changed after it) (`docs/media/x8/<neighbourhood>-matrix.jpg`: day, dusk and night down, ISO, TOP-DOWN
    and MODE 7 across): every neighbourhood reads in every view and hour, the words on their plates over the Glass
    Tower, the Gilded Lily, Zappo Cola, the Causeway's sign and Palm Terraces' walls; the context prompt over a white
    truck's roof (the Foundry by day in MODE 7) reads by its outline. No note.
  - **The docs:** README for the full game (three districts, 32 missions, the side content, the deep links); D45;
    ARCHITECTURE's proofs.
  - **EXPANSION.md 9, item by item:**
    1. Every milestone's acceptance met, its evidence in this log (X1-X8, a verdict for each look read).
    2. `npm test` and `npm run test:full` pass (test:full alone on d9542e1, below), and CI is green on the PR's head.
    3. `dist/index.html` is still one self-contained file: the engine's `check.mjs` (`external: []`, both its steps), it
       plays from `file://` (the e2e smoke), and it rebuilds byte-identical (`dist current`).
    4. The full game can be finished: 32 missions and section 5's side content, every mission and level through the bot
       on seeds 1-3 and a pad (above), and the campaign at 100% across the three districts (100.0% after 5.63 h of
       game).
    5. Every view in every district (the matrix above) and interior (the Power Station's and the Velvet Casino's shots,
       `docs/media/x3`, `docs/media/x6`); a crossing and a view switch leave the hash unchanged
       (`tests/sim/districts.test.mjs`, `glass-heights.test.mjs`: two runs from one seed the same after a bridge's and
       the Causeway's crossing; `proving.test.mjs`: one drive, one hash, in ISO, TOP-DOWN and MODE 7).
    6. The attract mode (30 min x the shipped page and seeds 1-3, and 5 min drawn in Chromium), the 10-foot UI audit
       (pad, keys and mouse at 1080p and 720p, and the HUD at Huge), determinism across Node and Chromium (10 min x 3
       scenarios) and the replay pass, all in test:full.
    7. Performance: each district's medians within the budgets (the perf gate above).
    8. The docs current (README, ARCHITECTURE's proofs, CONTENT-GUIDE, CONTROLS, TUNING, DECISIONS D38-D45), and the
       report in chat.
  - **Closed on `d9542e1`:** `npm run test:full` passed every one of its 34 steps, alone, in 2 h 43 min (the perf gates,
    the four city soaks, the audio, attract and gang soaks, determinism across Node and Chromium, the UI audits, the
    screenshot matrix, the mission bot on seeds 1-3 and through a pad, the bot gym both ways, the campaign at 100.0%),
    and CI is green on the PR's head.

- **L7 · platforms: a desktop wrapper, and the DualSense's own haptics by WebHID (D46), done:**
  - **The wrapper:** Electron, not Tauri (Tauri's Linux webview, WebKitGTK, has no WebHID and numbers a DualSense's
    buttons otherwise: D46). `desktop/` is a package of its own (Electron 44.7.0 and `@electron/packager` 20.3.0 its dev
    dependencies, its own lock), so the game's install, CI's `npm test` job and a session's setup never fetch it;
    `npm run desktop` runs it in the tree and `npm run desktop:build` packs it into `desktop/out/` (ignored). The page
    is `dist/index.html`, unchanged, beside the app once packed.
  - **The DualSense by WebHID:** its output report as the Linux driver writes it, by USB (0x02) and by Bluetooth (0x31,
    with its sequence and CRC-32), each part behind its own valid flag, at most one report a frame of what changed;
    the triggers in Sony's zone forms. Opened where the page has one granted: in the desktop app at once; in Chrome and
    Edge by SETTINGS, CONTROLS, DualSense haptics, switched on with a key or a click.
  - **What it plays** (presentation only, never headless): a gun's break by its kick, an automatic's buzz at its rate,
    slack when empty; a car's throttle and brake by its weight, a cough when it smokes, slack in the air; a plane's
    stall; the light bar the character's colour (Dex red, Viv teal, Gus orange), red and blue under stars, a red pulse
    badly hurt; the player lights the stars; the pause, the map and the menus free the triggers, the attract mode rests
    them.
  - **Tests** (in `npm test`): `tests/unit/dualsense-hid.test.mjs` (6: the CRC is zlib's, the trigger forms, the common
    report's layout, the USB and Bluetooth reports, the device opened, written and let go), `haptics.test.mjs` (3: the
    triggers by what is held, the light bar, the presenter at rest and headless), `desktop.test.mjs` (4: the wrapper
    against a stand-in Electron: the page found, the session's rules, the window's, the app's life).
  - **Electron itself** in CI's `desktop` job (its binary from Electron's releases, which this container's network
    policy doesn't reach): `xvfb-run electron desktop/smoke.cjs` reported `{"scene":"title","hid":true,
    "gamepads":true,"net":"shut","popup":"refused","url":"file:","fullscreen":true}`, then the Linux x64 build was
    packed and uploaded (72 files, 125 MB; on `9890e8f`, run 40677846081).
  - **The 10-foot UI:** the haptics row is in CONTROLS, between VIBRATION and BUTTON SYMBOLS; the audit walks past it
    (`tools/ui-audit.mjs`: 238 of 238 stops by pad, keys and mouse at 1080p and 720p). The look, read at 1080p and
    720p (`docs/media/l7`): the row and its two-line help in the frame, the focus on it; no note.
  - **The owner's:** how it feels (QA-DUALSENSE 6, the triggers and the light bar, by USB and Bluetooth; 7, the
    desktop app on a desktop and the Steam Deck).
  - **Closed on `9890e8f`:** `npm run test:full` passed every one of its 34 steps, alone, in 2 h 46 min. The perf gate
    (five rounds; ISO, TOP-DOWN, MODE 7 against 10.4, 12.7 and 12.7 ms): Lowtown 10.01, 9.10 and 12.27; Ironside 8.78,
    7.72 and 10.60; Glass Heights 9.76, 8.94 and 11.91; the update at most 1.08 ms a step (1.5). The mission bot 219 of
    219 on seeds 1-3 (151 gold, 51 silver, 17 bronze) and 73 of 73 through a pad, the gym 60 of 60 and 20 of 20, the
    UI audits 238 of 238 and 51 of 51 (HUD Huge), the campaign at 100.0% after 5.63 h of game: the same as on
    `d9542e1`, since L7 moves no run. CI's `test` and `desktop` jobs are green on the same head.

- **L8 · the owner's items (D47), prepared and with the owner:**
  - **The offer upstream** (not sent): `vendor/my-3d2dge/PATCHES.md`'s seven issue texts stand as written, since no
    patch was added or changed after the slice (the engine's files last moved at M10, `b2ea884`), with a note on what
    L1-L7 put on them; `docs/FEEDBACK-FOR-ENGINE.md`'s F7 has the full game's header and F7.17-F7.22, each point checked
    against the code (the districts' sizes, the counts, the crossing, the quality setting as D35 has it).
  - **The release docs** (PLAN.md 15.10-11): `docs/ENGINE-ANALYSIS.md` brought up to date with L1-L7 (its call-site
    counts recounted); the Source Information in README and `src/about.js`: Claude Code 2.1.311 at L1-L8's end, Chromium
    153 from L1 on, Electron 44.7.0 in CI, and the effort as the sessions' metadata gives it (max for the slice, xhigh
    for L1-L8).
  - **Credits & About, read at 1080p, 720p and HUD Huge** (`docs/media/l8`): the game's credit had begun a page with
    its heading left at the foot of the one before, and a row's last word ("files)") had begun a page alone. MOTOR's
    `docScreen` now keeps a heading or a label with the line after it and a paragraph's last line with the one before;
    a gap at a page's foot no longer opens an empty page. `tests/unit/ui.test.mjs` failed on both before the fix, at
    page heights from 56 to 236 UI pixels, and passes after. The UI audit walks every page now (it had stopped at four
    of five, six and twelve): 244 of 244 stops by pad, keys and mouse at 1080p and 720p, and 59 of 59 at HUD Huge.
    Read again after the fix: every heading and label with its text, no line alone; no note.
  - **The PR's head, `5b55a08`:** `npm run test:full` passed every one of its 34 steps, alone, in 2 h 47 min (all merged
    content re-run after the MOTOR change): the perf gate (ISO, TOP-DOWN, MODE 7) Lowtown 10.05, 9.00 and 12.16 ms,
    Ironside 8.65, 7.78 and 10.73, Glass Heights 9.53, 9.15 and 11.62, the update at most 0.98 ms a step; 459 unit and
    sim tests; the mission bot 219 of 219 on seeds 1-3 (151 gold, 51 silver, 17 bronze, as before) and 73 of 73 through
    a pad; the gym 60 of 60 and 20 of 20; the UI audits 244 of 244 and 59 of 59; the campaign at 100.0% after 5.63 h of
    game. CI's `test` and `desktop` jobs are green on the same head.
  - **PLAN.md 15 on that head** (as DECISIONS and EXPANSION.md 9 amend it): every milestone's and item's evidence above
    (1); `npm test`, `npm run test:full` and CI (2); one file, `external: []` from the engine's checker, played from
    `file://` and a static server (`tests/e2e/smoke.mjs`), rebuilt byte for byte (`dist current`) (3); 32 missions and
    all the side content, the campaign at 100% across the three districts (4); the views outdoors and indoors, a switch
    within 0.35 s that leaves the hash as it was (`tests/unit/views.test.mjs`, the sim tests) (5); the attract mode's
    soaks, its leave-on-any-input matrix and the kiosk on phone emulation (`tests/e2e/attract.mjs`) (6); the UI audit by
    each device alone (7); the replay pass, one seed the same in Node and Chromium, and every view within its budget
    (8); the Proving Ground's self-tests, the 15 recipes and the districts loading (9); the docs (10); the Source
    Information and the engine-analysis summary in the page's header and on Credits & About, read on the screen (11);
    the chat report (12).
  - **For the owner:** the offer upstream above; the DualSense checklist (`docs/QA-DUALSENSE.md`, sections 1-7, about
    20 minutes with the pad and a TV); the PR's review and merge. HANDOFF's L8 box stays open until they are done.

- **D48 · the camera turns in every view (the owner's request), done:**
  - **Asked** after L8: the camera rotating as in Final Fantasy Tactics and Xenogears in ISO, smoothly in TOP-DOWN, and
    smoothly to any angle in MODE 7; then the merge (squash).
  - **Built:** the turn buttons ([ and ], or R3 held with the right stick pushed) in every view: a tap a quarter, eased
    round; held, a spin at 150° a second (TUNE `spinRate`); let go, ISO on the next of its eight 45° rests ahead,
    TOP-DOWN and MODE 7 where they stop (onto a quarter within 4°). `Stage.turnInput` each step (the play scene and the
    Proving Ground's zones); `TopView` at any heading (its projection, inverse, stick, chunk range, floor under the
    ground transform with the chunks' aprons, turned roofs, rigs' views in 3° steps); `Side7View` off its quarters with
    the chase camera's drawing, moved into it from `ChaseView` (the chase camera draws as before), its turn an orbit
    about the focus; decks a cell each off a quarter. Auto-rail and set pieces still crossfade to a quarter.
  - **Probed first:** ISO's textured walls at yaw offsets 0°, 45°, 90°, 135° and 30° (`docs/media/d48/iso-yaws-*`): all
    drawn right, so ISO's rests could be every 45°.
  - **Tests:** `tests/sim/camera-turn.test.mjs` (4: ISO's tap, spin and rest; TOP-DOWN's quarter, free heading and the
    stick by it; MODE 7's free heading, its axes, the next quarter and a set piece's hold; the same run hashing the same
    turned or not, and alike twice); `tests/unit/depth.test.mjs` (2 more: TOP-DOWN turned, north up unchanged; MODE 7 off
    a quarter and back). The mission, city-life and interior sims that turn mid-run pass as they were.
  - **The look, read** (`docs/media/d48`): each view after a tap, mid-spin and landed, by day on Neon Mile; at night in
    the rain; in the bank. TOP-DOWN's floor turns with no seam, its roofs, cars, people and road arrows turned with it;
    MODE 7 at 141°-167° draws its walls, floor, signs and crowd; ISO mid-spin shows the flat blocks, then the walls at
    the rest. One note looked into: a gap through DONUT DEPOT in MODE 7 was a street lamp's pole in front of it, as at
    a quarter; nothing to fix.
  - **`npm run test:full`** on `6600f53`, alone: every one of its 34 steps passed, in 2 h 54 min (all merged content
    re-run after the MOTOR change): the perf gate (ISO, TOP-DOWN, MODE 7) Lowtown 10.18, 9.35 and 12.25 ms, Ironside
    8.58, 7.78 and 10.75, Glass Heights 9.27, 9.05 and 12.10, the update at most 1.05 ms a step; 465 unit and sim tests;
    the mission bot 219 of 219 on seeds 1-3 (151 gold, 51 silver, 17 bronze, as before) and 73 of 73 through a pad; the
    gym 60 of 60 and 20 of 20; the UI audits 244 of 244 and 59 of 59; the campaign at 100.0% after 5.63 h of game. Its
    two runs before, on the same code, had failed only the perf gate, Lowtown's ISO at 10.52 and 10.48 ms. Measured in
    turn with L8's build (`5b55a08`) and M2's over six rounds, the two builds read it alike (a median of 10.30 ms each):
    ISO draws as it did while the camera isn't turning, and its margin is the 1-3% L5 found.
