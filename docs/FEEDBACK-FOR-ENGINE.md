# Feedback for the engine

Grand Theft Moto's feedback for my-3D2dge, written as one source in the engine's `docs/FEEDBACK-LOG.md` format (its
sources are numbered F1, F2, ...; this would be the next, F7 when written). Each point names the log's theme it adds to,
or a new one. The engine's maintainers decide each point's status; the game's own view of the engine is in
`docs/ENGINE-ANALYSIS.md`, and the patches it carries are in `vendor/my-3d2dge/PATCHES.md` with their issue text. It was
written at the slice's end (M13, F7.1-F7.16) and brought up to date with the work after it, HANDOFF's L1-L7 (the
header, F7.17-F7.22). Nothing here has been sent: offering it upstream is the owner's call (HANDOFF L8).

### F7 · 2026-10-28 · Grand Theft Moto (Grand Theft Auto 2 with Grand Theft Auto V's systems)

- **Builder:** Claude Code (an Anthropic model; the run's chat report names it), in Claude Code cloud sessions with a
  shell, Node 22 and headless Chromium (141 for the slice, 153 from L1 on), the slice at max effort, from 2026-10-17
  to 2026-10-28: the slice (M0-M13) to 2026-10-23, then L1-L7.
- **Handed:** the engine vendored at v0.46.1 (`cfa866a`): `engine/my-3d2dge.js` with `API.md`, `API-INDEX.md`,
  `AI_GUIDE.md`, the docs, the tools and the mocap, and a 2,400-line plan of its own (and for L5-L6 an expansion plan
  of its own, `docs/EXPANSION.md`).
- **Built:** an open-city crime game in one offline HTML file (3.0 MB): three districts (Lowtown at 160 × 160 cells,
  Ironside and Glass Heights at 128 × 112, one built at a time across the bridges the story opens) and four interiors
  (a bank, a club, a power station, a casino); four views the player switches at any moment (ISO, TOP-DOWN with
  GTA2's lean, SIDE-SCROLL MODE 7 from the stress test's depth view, and a chase camera), and none changes the
  simulation; cars, bikes, vans and trucks, the L, helicopters, planes and boats on a road graph and over the water,
  with traffic, a crowd, police with a wanted level and a helicopter, seven gangs with respect and turf; 32 missions,
  nine jobs (a paramedic's, a firefighter's and a tow truck's among them), four races and the rest of the side
  content on a staged mission runtime, all played through by a bot, which also plays a new game to 100%; a 10-foot
  UI for a controller on a TV; six radio stations composed at run time; an attract mode that plays the game by
  itself; an arcade cabinet running one of the engine's starter kits; a desktop wrapper (Electron) and a DualSense's
  adaptive triggers and light bar by WebHID. On top of the engine sits MOTOR, the game's own layer (about 18,700
  lines), and the content (about 12,500). Seven engine patches, all from the slice: none added or changed after it.
- **Used:** the loop's exact fixed step and headless `game.advance` (the whole test plan runs the real game in Node:
  about 460 unit and sim tests, the mission bot on three seeds and through a pad, a bot campaign to 100% across the
  three districts, soaks, and one seed played in Node and in Chromium to the same hash); scenes and fades; `expand`;
  the pixel primitives, colour helpers, textures and the font; `TileMap` for the buildings; `E.Backdrop`; the
  depth-sorted renderer; the `iso` view; canvas lighting; particles; `E.Humanoid` and its mocap, `E.Mover`,
  `E.ACTIONS`; `E.sees`, `E.hears`, `E.Suspicion`; `E.Bullets`, `E.Attack`, `E.Combo`; `E.FlowField` (indoors); the
  input with DualSense detection and rumble; `ChipAudio`; `E.store` and `game.settings`; the session recorder,
  `replay.mjs` and `check.mjs` in every gate; a starter kit as a second `E.Game` (F7.17).
- **Read:** `API-INDEX.md` by search first, then `API.md`'s sections; the engine's source to write each patch (each
  reaches private state) and to learn the stress test's depth view, which lives in page code.
- **Points:**
  - **F7.1** · passages under roofs and bridges (one column per cell) · Lowtown's elevated avenue (the Loop) and its
    drawbridge carry cars and peds over streets that carry their own. MOTOR builds decks as solids with a floor of
    their own and space under them, outside `TileMap`. The second source on the theme.
  - **F7.2** · a city-sized `TileMap` · **new theme.** At 160 × 160 cells: `queueWalls` scanned every cell each frame
    (GTM-PATCH 1); the wall cache kept every block of the last four views with no bound and baked synchronously as
    blocks entered (2); every body, query and drawing looped over every solid (3); canvas lighting with about 30 street
    lamps cost 8.2 ms a frame (7); `drawFloor` bakes the whole map per view (about 13 M px), so MOTOR bakes its own
    floor in chunks. Four of the seven patches exist only because the map is a city.
  - **F7.3** · `E.Shell` unused, the interface drawn on the canvas · built on v0.46.1, before v0.55.0 took the theme
    up. A TV at 10 feet needs what the shell's fixed 11-14 px CSS can't give: a UI scale, the controller's own glyphs
    (✕ ○ □ △, Xbox, Nintendo, keys), a focus frame a pad moves, lists paged at six. MOTOR draws its own layer at
    integer scales. A 10-foot mode for the shell (or the canvas `E.ui`) would have saved most of its 1,250 lines.
  - **F7.4** · raw input for a game's own bindings · **new theme.** Analog triggers for throttle and brake, a DualSense
    that isn't pad 0, an idle clock for an attract mode that any device resets, every key held whether bound or not,
    and contexts switched without `input.use()` (it clears held buttons, so a held trigger drops as the player gets
    in a car): GTM-PATCH 4 (`input.raw`).
  - **F7.5** · music written by the game for stealth and chases · the radio needs many timelines, each where its clock
    says (a station heard from the middle of a song), and a mission's score ducking it; `music()` has one slot, runs on
    `setInterval` and starts at step 0. MOTOR has its own look-ahead sequencer on the engine's buses (GTM-PATCH 5:
    `audio.bus`), so the volume settings and mute reach it.
  - **F7.6** · assists each game writes · hold or toggle for sprint, aim, crouch and the wheels; aim assist (off,
    low, standard); subtitles with the speaker's colour; colourblind markers. A second builder writing the same set.
  - **F7.7** · settings nothing honors yet · a HUD size (Standard, Large, Huge as integer scales), a default view,
    a speedometer, MODE 7 drawn at the screen's own resolution. Written by the game (the engine's vibration, dead
    zone, volumes, screen shake and reduce-motion settings are used as they are).
  - **F7.8** · saves, checkpoints and objectives written by the game · a staged mission runtime (each stage a setup and
    an op, retried from its setup, failures with reasons, medals from bonus objectives), three save slots and an
    autosave on `E.store`.
  - **F7.9** · one fixed custom view, views never switched · the opposite case: three views switched at any moment,
    outdoors and indoors. It needed one projector contract for all of them (to the screen, to the ground, a depth key,
    the cells in view) that the engine's views don't share, so MOTOR's Stage owns it.
  - **F7.10** · vehicles · **new theme.** `E.Body` is a circle with no heading, and `r.sprite` and `r.shape` turn in 32
    facing steps through a cache: a car needs an oriented box, tyre forces and any angle. MOTOR has its own body,
    models and painter. Boarding, carjacks and takedowns as `E.ACTIONS` worked as they are.
  - **F7.11** · the depth view lives in page code · **new theme.** The stress test's side scrolling with depth is the
    engine's most distinctive picture, but it is page code: MOTOR lifted it into a view with a level camera and a
    shifted lens (a pitched camera leans a city's towers), any heading, textured faces and occlusion indoors.
  - **F7.12** · a determinism leak in the rig · **new theme.** `E.Humanoid` starts its animation clock at a random
    time (its idle sway). A game whose shots leave from the posed hand gets different shots from the same seed and
    inputs. MOTOR starts each rig's clock from its ped's id.
  - **F7.13** · one weapon model a kind · eleven weapons (shotguns, a rocket tube, a bat, Molotovs) drawn over the rig
    can't sit behind the arm that holds them; GTM-PATCH 8 adds a `weaponDraw(api)` hook sorted with the limbs.
  - **F7.14** · the engine's auto-pause · it opens the engine's own pause menu on blur or a lost controller; a game with
    its own pause has to catch it (MOTOR's UI frame hands it to the game's pause, D23 in the game's DECISIONS).
  - **F7.15** · determinism across runtimes · **new theme.** `E.session` replays a recording in the browser it was made
    in, but not elsewhere: browsers' `Math.sin`, `cos`, `atan2`, `exp` and `pow` differ in the last bit between
    engines and versions (Node 22 against Chromium 153: all of them, for 3-18% of arguments), and `E.Mover` and the
    preset views compute with them. MOTOR installs a port of V8's fdlibm on `Math` before the engine loads (the game's
    D33), and a seed now plays the same game in Node and in Chromium. An engine-provided deterministic `E.math` (or a
    documented prelude) would make every game's sessions portable, and headless runs the page's own game.
  - **F7.16** · `particles.explosion` stops the clock from wherever it is called · its default hit-stop
    (`game.freeze`) is right in a game's update, but an explosion played as a drawing effect (a wreck seen going up)
    stops the simulation at the next frame drawn: the game then depends on its frame rate, and differs from a headless
    run that never draws. MOTOR passes `freeze: false` there (D33). A note in its doc, or `freeze` off when called
    during draw, would save the next game the hunt.
  - **F7.17** · a second game inside the first · **new theme.** Club Chrome's arcade cabinet runs the engine's own
    shooter slice (`reference/starter-30-shooter.js`, verbatim) as a second `E.Game` that never loops: the outer game
    steps it while the player stands at it and draws it into a bezel. Three things it needed: the five names a starter
    file shares with its slices (a best score, prompts, the corner, a padded score, no touch; `lerp`, read only in its
    drawing), given by the host; its dice its own (`Math.random` swapped for a seeded stream while it steps, so the
    outer game's stream is untouched and replays hold); and its picture from its own buffer at its own resolution (the
    engine sizes a canvas to where it sits on the page, and the cabinet's sits nowhere: it showed one grey pixel,
    stretched). A documented embed mode (a game with no page canvas, its buffer read by the host, its randomness
    injected) would make a starter kit a drop-in mini-game.
  - **F7.18** · one map at a time, three districts · the city-sized `TileMap` theme (F7.2), three times over: Lowtown
    (160 × 160 cells), Ironside and Glass Heights (128 × 112 each), joined by bridges the story opens. One district is
    built at a time (its `TileMap`, solids, decks, road graph, fleet and crowd) behind the engine's scene fade, with the
    player, the vehicle, the crew, the time, the weather and the stars carried over, and a seed crosses the same way
    each time (the same hash after it). GTM-PATCHes 1-3 carried the two new districts as they were. Two districts
    streamed at once is left for later; it would need a `TileMap` that unloads and loads a region in place.
  - **F7.19** · vehicles, again: planes and boats · F7.10's theme, two more classes on MOTOR's own body: a plane (on its
    gear a slow car, in the air banked turns and a stall; the seaplane off and onto water) and boats (a hull with a keel
    and a rudder over the water's cells). Nothing of `E.Body` could carry them either.
  - **F7.20** · the DualSense past the Gamepad API · F7.4's theme. The engine detects a DualSense and rumbles its two
    motors through the Gamepad API; the adaptive triggers, the light bar and the player lights need its own output
    report by WebHID. MOTOR writes it (`input/dualsense-hid.js`: by USB and by Bluetooth, each part behind its valid
    flag, the triggers in Sony's zone forms) and plays it from the game (a gun's break, a throttle's give, the
    character's colour, the stars), with the engine's rumble the fallback. An optional `E.dualsense` beside `E.input`
    (and the prompt only a key or a click can grant) would save the next game the report's layout.
  - **F7.21** · the one-file page in a desktop wrapper · nothing to change: `dist/index.html` runs unchanged in
    Electron (full screen, sandboxed, no network), which grants a DualSense to WebHID with no chooser. Tauri was passed
    over: its Linux webview (WebKitGTK) has no WebHID and numbers a DualSense's buttons as Firefox and Safari do, which
    the Gamepad API's standard mapping doesn't fix for that pad.
  - **F7.22** · performance at a city's size · F7.2's theme, measured: every view within the game's frame budgets in
    each district (the tour at night in the rain, 40 walkers and 20 cars in view), the look kept, came from the game's
    own drawing (a crowd body's redraw written into a pixel array, MODE 7 drawing nothing nearer walls hide and its
    decks a row at a time, the floor in chunks) and GTM-PATCH 7's coarse light field; a Graphics setting (Fast: the
    light maps coarser, the crowd animated less often, half the rain) is there for slower machines. When L3 began, the
    engine's light field (every light walking its box pixel by pixel) was a quarter of an ISO frame at night.
