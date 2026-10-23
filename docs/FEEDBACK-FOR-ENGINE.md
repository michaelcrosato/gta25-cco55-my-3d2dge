# Feedback for the engine

Grand Theft Moto's feedback for my-3D2dge, written as one source in the engine's `docs/FEEDBACK-LOG.md` format (its
sources are numbered F1, F2, ...; this would be the next, F7 when written). Each point names the log's theme it adds to,
or a new one. The engine's maintainers decide each point's status; the game's own view of the engine is in
`docs/ENGINE-ANALYSIS.md`, and the patches it carries are in `vendor/my-3d2dge/PATCHES.md` with their issue text.

### F7 · 2026-10-22 · Grand Theft Moto (Grand Theft Auto 2 with Grand Theft Auto V's systems)

- **Builder:** Claude Code (an Anthropic model; the run's chat report names it), in a Claude Code cloud session with a
  shell, Node 22 and headless Chromium 141, at max effort, over several sessions from 2026-10-17 to 2026-10-23.
- **Handed:** the engine vendored at v0.46.1 (`cfa866a`): `engine/my-3d2dge.js` with `API.md`, `API-INDEX.md`,
  `AI_GUIDE.md`, the docs, the tools and the mocap, and a 2,400-line plan of its own.
- **Built:** an open-city crime game in one offline HTML file (2.5 MB): one district, Lowtown (160 × 160 cells), and an
  enterable bank; three views the player switches at any moment (ISO, TOP-DOWN with GTA2's lean, and SIDE-SCROLL MODE 7
  from the stress test's depth view), and none changes the simulation; 19 vehicles in 7 classes on a road graph with
  traffic, a crowd, police with a wanted level and a helicopter, three gangs with respect and turf; 14 missions and
  their side content on a staged mission runtime, played through by a bot; a 10-foot UI for a controller on a TV;
  four radio stations composed at run time; an attract mode that plays the game by itself. On top of the engine sits
  MOTOR, the game's own layer (about 16,100 lines), and the content (about 8,500). Seven engine patches.
- **Used:** the loop's exact fixed step and headless `game.advance` (the whole test plan runs the real game in Node:
  over 300 unit and sim tests, the mission bot, a bot campaign, soaks); scenes and fades; `expand`; the pixel primitives, colour helpers,
  textures and the font; `TileMap` for the buildings; `E.Backdrop`; the depth-sorted renderer; the `iso` view;
  canvas lighting; particles; `E.Humanoid` and its mocap, `E.Mover`, `E.ACTIONS`; `E.sees`, `E.hears`,
  `E.Suspicion`; `E.Bullets`, `E.Attack`, `E.Combo`; `E.FlowField` (indoors); the input with DualSense detection and
  rumble; `ChipAudio`; `E.store` and `game.settings`; the session recorder, `replay.mjs` and `check.mjs` in every gate.
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
