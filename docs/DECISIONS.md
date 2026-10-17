# Decisions

This log records every deviation, exception, and call made without an answer. It is never cleaned up. The format
follows the engine's own log (`docs/DECISIONS.md` in my-3D2dge): the call, its principle, why, whether it was answered,
and where it landed.

## D1 · 2026-10-17 · ES modules bundled by esbuild, not the engine's shared-scope join
- **Principle:** common ground (the doctrine's principle 7). The repository chose its own tech stack.
- **Call:** MOTOR and the game are ES modules. `tools/build.mjs` bundles them with esbuild into one IIFE and inlines it
  after the engine in `dist/index.html`. Content is discovered at build time, so adding content never edits an index
  file.
- **Why:**
  - explicit imports give seams that parallel workers can't collide on;
  - modules can be imported in Node tests;
  - it is standard tooling.

  The engine's own join (its D5) is grandfathered there and doesn't bind this repository.
- **Answered:** no (a reversible call). **Landed in:** M0.

## D2 · 2026-10-17 · A canvas 10-foot UI instead of E.Shell and the HTML standard menus
- **Principle:** standard features ("don't build your own").
- **Call:** `new E.Game({ menu: false, corner: false })`. MOTOR draws its own pause, settings, controls and HUD on a
  canvas UI layer at integer scales. `game.settings` and the engine's input APIs stay underneath.
- **Why:** E.Shell's CSS is fixed at 11-14 px with no UI scale (`ENG:7412-7444`), so it isn't readable at 10 ft. The
  canvas font has no ✕ ○ □ △.
- **Answered:** no. **Landed in:** M0, with the UI itself in M9. This is also engine feedback.

## D3 · 2026-10-17 · Model identifiers stay out of repository files
- **Principle:** an environment rule. Model identifiers belong in chat replies, not in pushed files.
- **Call:** the Source Information in `README.md`, `src/about.js` and the built HTML gives the AI lab and the effort
  level. Each run's chat report names the exact model.
- **Answered:** the brief asked for the model in the README and the HTML; this rule takes precedence, and the owner can
  add the line by hand. **Landed in:** planning, then M0.

## D4 · 2026-10-17 · "Side Scroll mode 7" is the engine's side scrolling with depth
- **Principle:** reading the brief.
- **Call:** the third view is my-3D2dge's own *Side scrolling with depth (Mode 7)* (`src/labs.json:37`,
  `src/stress.game.js:615-844`), generalized for a city as SIDE7. A free-turning chase camera is in the backlog.
- **Answered:** no. The owner was told and can override before or during the run. **Landed in:** PLAN.md v1.1.

## D5 · 2026-10-17 · Implementation started inside the planning session
- **Principle:** process.
- **Call:** this session's `/goal` stop hook judged the brief's "Done" clause, the full build, and kept blocking the
  session from ending once planning was done.
- **What happened instead:** rather than idle in a loop, the run started M0 at once and goes milestone by milestone,
  committing and pushing as it goes.
- **Resuming:** a later `/clear` plus the `GOAL.md` run resumes from `PROGRESS.md`.
- **Answered:** no. The owner was told and can stop the run at any time with `/goal clear`. **Landed in:** M0.

## D6 · 2026-10-17 · Playwright pinned to 1.56.1
- **Principle:** pin what agents know.
- **Call:** `playwright@1.56.1` is the release built for Chromium build 1194, the one `/opt/pw-browsers` ships. The
  engine repo's `^1.56.0` resolves to 1.64.1, which expects Chromium 156.
- **Answered:** no. **Landed in:** M0.

## D7 · 2026-10-17 · The M0 hello block draws its floor with `TileMap.drawFloor`
- **Principle:** PLAN.md section 8.4 ("never call `drawFloor` on the city map").
- **Call:** the 32×32 test block is small enough for the engine's whole-map bake. The chunked floor replaces it for
  Lowtown in M2.
- **Answered:** no. **Landed in:** M0.

## D8 · 2026-10-17 · SIDE7 uses a level camera with a shifted lens, not a pitched one
- **Principle:** respect the look (GTA2's upright city, the SNES Mode 7 games the view is named after).
- **Call:** the stress test's depth view pitches its camera 14° down, so walls converge toward a point below the screen.
  In a hall that is barely seen; in a city of 8-storey towers beside the camera, the towers lean. MOTOR's SIDE7 keeps
  the camera level and shifts the lens to put the horizon where the 14° pitch puts it:
  - the floor recedes exactly as from the pitched camera (the same rows, the same horizon);
  - walls, lamp posts and figures stay upright, as in Super Mario Kart and F-Zero;
  - a wall's front face projects to a rectangle and its side faces have vertical edges, so textured faces need about
    half the quads (609 → 251 in the view lab).
- **Answered:** no (a reversible call: `Side7View.frame` holds the projection). **Landed in:** M1, spike S1.

## D9 · 2026-10-17 · The M1 hello block moves to the chunked floor (D7 superseded)
- **Principle:** one floor path for every view.
- **Call:** every scene now draws through MOTOR's Stage, whose depth views read the floor chunks. The hello block paints
  its chunks from its own `floorTex` (`paintTileMapFloor`). `?floor=engine` still draws the engine's bake in ISO, for
  the side-by-side check (`docs/media/m1/s2-floor-engine-vs-chunks.png`: 1.0% of pixels differ).
- **Answered:** no. **Landed in:** M1.

## D10 · 2026-10-17 · The performance budgets, from the M1 spikes' measurements
- **Principle:** PLAN.md 7.11 ("budgets come from measurement"), measured where the gates run: headless Chromium 141
  with no GPU, at 1920×1080 (a 480×270 buffer), medians over 8-10 s after a 3 s warm-up (`tools/perf.mjs`).
- **What was measured** (PROGRESS.md has the tables):

  | Scenario | Draw median |
  |---|---|
  | baseline: the title (the upscale to the screen alone is 1.3-1.5 ms) | 2.5 ms |
  | ISO, 160×160 city, standing / lapping at 300 u/s / lapping at zoom .65 | 5.4-6.1 / 7.6 / 10.0 ms |
  | ISO, the view lab with 41 rigs (crowd on the fast path) | 7.0-7.5 ms |
  | TOP-DOWN, the view lab / the 160×160 city | 6.1-6.2 / 5.5-5.7 ms |
  | MODE 7, the view lab with 41 rigs / the 160×160 city | 11.3-11.9 / 9.0-9.4 ms |
  | update, per frame (two 1/120 s steps): five cars, or 41 walkers | 0.2-0.4 ms |

- **Call:** the plan's targets stand: draw medians of 9 ms in ISO and 11 ms in TOP and SIDE7, and 1.5 ms of update per
  step. The gates allow 15% over a target (ISO ≤ 10.4 ms, TOP and SIDE7 ≤ 12.7 ms) and run on the M2+ perf scenarios
  (Lowtown at night in the rain, 20 cars and 40 peds in view). p99 is reported, not gated.
- **Where the time goes, and the levers:**
  - ISO's walls cost about 2.5 µs per wall-block `drawImage` (about 600 at zoom .65), not pixels. The lever: merging a
    building's roof-only blocks into one image, if Lowtown's gate fails at the driving zoom.
  - MODE 7's rigs cost about 3.5 ms for 41. The lever: crowd rigs drawn every other frame from a cached image, as the
    engine's `every` does in ISO. M7 takes it, since the view lab sits over the 11 ms target, though inside the gate.
  - The present (the upscale to the screen, and the raster of the frame's queued drawing) is 3-7 ms in this GPU-less
    browser and near zero on a real GPU. The gates keep it in, as the worst case.
- **Answered:** no. **Landed in:** M1.

## D11 · 2026-10-17 · Night in ISO: GTM-PATCH 7 for the lighting, and MOTOR's own glows instead of the engine's glow mask
- **Principle:** budgets come from measurement (PLAN.md 7.11); patch only where an extension can't reach (PLAN.md 12).
- **What was measured:** Lowtown at night in ISO drew in 24.4 ms standing at the bank and 22.9 ms on the tour (the
  budget is 10.4). `lights.render` cost 8.2 ms (its tint curve alone, `Math.exp` three times a lit pixel, 17% of the
  frame); the engine's glow mask, which redraws every glow after the dark and masks it behind whatever stands in
  front, cost three full-frame composites (about 3 ms in this GPU-less browser); and the city renderer queued 1,626
  deck slabs a frame, almost all off screen (7.1 ms).
- **Call:**
  - GTM-PATCH 7 (not in the plan's list of six; 5 is still audio, 6 still unneeded): a light-field table for the
    tint, and `lights.res`, the light field on a grid twice as coarse, scaled up smoothly. `TUNE.lightRes` is 2.
  - Lamp halos and neon are MOTOR glows (`stage.glow`): drawn after the lights in an overlay, each only where no wall
    drawn this frame stands in front of it (checked down the screen from the point against the walls' drawn heights,
    the cut-away included). Nothing is queued as emissive, so the engine never builds its mask. A glow is all or
    nothing: one half behind a corner shows whole (rare at these sizes). Turning the mask off instead let halos float
    over rooftops.
  - The city renderer culls to the screen (`stage.onScreen`); sign boards are drawn once per size and blitted.
- **Result:** 6.0 ms standing and 7.6 ms on the tour at night (p99 15.8); 5.7 ms by day. TOP 6.6 ms, MODE 7 11.6 ms
  on the night tour.
- **Known gap:** the canvas light has no heights, so roofs catch pools from the street behind them (a light patch,
  or a dark one where no lamp reaches). The GPU path's height buffer is the lever if it reads badly in the
  neighbourhood screenshots.
- **Answered:** no. **Landed in:** M2.

## D12 · 2026-10-17 · The ISO quarter turn orbits, with flat blocks while it turns
- **Principle:** the plan's reason, not its letter. PLAN.md 5.1 says never rotate continuously, because every new yaw
  re-bakes every wall block.
- **Call:** a quarter turn orbits the camera in 3° steps for 0.3 s, but the walls are drawn as flat-shaded boxes (one
  `r.box` a building lot, at its cut-away height) while it turns, so nothing bakes at the in-between yaws. The final
  yaw's wall blocks bake within a time budget during the orbit (9 ms a frame, 14 while it waits at the end; a fresh
  screenful is about 120-145 ms of baking), and the textured walls return when they are ready, or after 0.45 s at
  most. An image-space turn of the last frame was tried first: rotating the ground plane under ISO's projection
  smears everything upright into streaks.
- **Answered:** no. **Landed in:** M2.

## D13 · 2026-10-17 · The perf gate measured with stand-ins; crowds drawn as kept images of the classic rig
- **Principle:** measure what will ship (PLAN.md 7.11). PLAN.md 8.4's gate is ISO at night in the rain with 20 cars
  and 40 peds in view, but cars arrive in M4 and peds in M5.
- **Call:**
  - `?crowd=1` puts stand-ins in view: 40 walkers and 20 parked cars at fixed offsets round the focus, drawn the way
    the real ones will be. They are presentation only. `tools/perf.mjs` runs them as `lowtown-gate` (ISO),
    `lowtown-gate-top` and `lowtown-gate-side7`.
  - A crowd body is the engine's classic rig, not the detailed one. The protagonists and named characters keep HD:
    a classic rig draws about three times cheaper, and reads as GTA2's simple peds against the detailed hero.
  - A crowd body is drawn into an image of its own every `TUNE.crowdEvery` frames: 4, so 15 a second, the rate of
    classic townsfolk. Its rig is posed only then. The image is reused where the body stands in between, and the
    redraws are staggered across the crowd. The engine's own `every` does this on its composite path only, which costs
    more than the fast path it would replace.
  - A shape that looks the same each frame, such as a parked car, can be kept the same way (`stage.shape(..., {
    kept })`). Its image is redrawn when the view or its size on screen changes.
- **Measured:** ISO at the gate, 9.3-10.0 ms median over three runs (the gate is 10.4); TOP 8.4 ms. MODE 7 is 14-16 ms
  against 12.7, and 11.8-13.1 ms with no crowd. D10 gave MODE 7's crowd lever to M7, and M7 keeps it.
- **Answered:** no. **Landed in:** M2.
