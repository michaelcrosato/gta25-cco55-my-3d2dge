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

## D14 · 2026-10-17 · M3's calls: weapons drawn in the rig (GTM-PATCH 8), the crew's shared fund, climbing, lock-on on screen
- **Principle:** extend first, patch only past a private member (PLAN.md 12); the simulation never reads the frame
  being drawn (7.3).
- **Calls:**
  - **GTM-PATCH 8.** The engine draws one model per weapon kind (a pistol, a sword, a staff). A rig's
    `weaponDraw(api)` hook lets MOTOR draw its eleven weapons among the limbs. A gun on the far side is behind the
    arm that holds it, which drawing over the rig afterwards can't do without the rig's private projection. The
    engine's own kind still sets the pose ('gun' points, 'sword' swings).
  - **Long guns.** A two-handed model brings the left hand to its foregrip by two-bone IK after the rig's pose. Where
    the grip is out of reach, the hand stops short at the shoulder: a stylized shouldered pose.
  - **The crew fund.** The three protagonists share one wallet: a simplification of GTA V's three.
  - **Climbing.** A jump climbs a ledge up to `TUNE.climbMax` 34: one-storey roofs (24), garages (32) and containers.
    The engine's default of 82 would put most of Lowtown's roofs one jump away.
  - **Lock-on.** The 70° cone is judged on screen through each view's linear, camera-free projection
    (`views.screenVec`): a player input, like the stick turned into the world, not the frame being drawn.
  - **Mouse buttons.** A second mouse button pressed while one is held fires no pointerdown: aim with the right
    button, fire with the left. MOTOR keeps the engine's held buttons in step with `e.buttons`
    (`input/mouse-chords.js`), with no patch.
  - **Weapon rates.** Melee chains at the weapon's rate; the engine's combo alone cuts each move's recovery short.
    A dry magazine reloads once its last shot has cycled, so a magazine takes mag / rate + reload. The bench measures
    every gun at its spec's DPS exactly, and fists and the bat within 6%.
- **Answered:** no. **Landed in:** M3.

## D15 · 2026-10-17 · M4's calls: models by id with kits, one tyre model for land vehicles, sleeping fleets, boarding as engine actions
- **Principle:** grow by content, not architecture (PLAN.md 7.4); the simulation is plain arithmetic at the fixed step
  (7.3); reuse the engine's actions (8.8).
- **Calls:**
  - **The `vehicles` contract changed.** `model` was a size object; it is now a `vehicleModels` id, and `kit` names
    a set of extra parts on that model. Variants are definitions over one model and a kit: the Retiree is the Cortez
    with the wagon kit; the Medic, the MPD Rhino and the Strongbox are kits on the Hauler; the Drill Rig is the
    Hookline's flatbed. That keeps the slice's 13 models and 19 definitions.
  - **One tyre model.** Cars, trucks, tow trucks and bikes share the bicycle-model body; classes differ by handling
    numbers. The body follows the ground: deck tops and ramps, drawbridge leaves. Where the ground falls away it flies,
    and it lands with a squash. Boats (`BoatBody`) and the heli (`HeliBody`) have bodies of their own. The L's cars run
    on a `RailLine` with no body. A bike's lean and wheelie are drawn, not simulated.
  - **The towed car rides on one axle.** The end on the hook has no grip and doesn't steer. The joint is a
    spring-damper whose stiffness is set from the pair's effective mass, a frequency (`TUNE.towHz`) and a damping
    ratio, so it stays stiff and stable at the fixed step.
  - **Fleets sleep.** A vehicle nobody drives that has come to rest is skipped until something touches it: a car, a
    shot, a blast, a ped getting in, a tow. A 128-unit grid finds neighbours, so Lowtown's 60-odd parked cars cost
    nothing until hit. Parked cars draw as kept images, redrawn when their dents, lights or doors change.
  - **Boarding is the engine's actions.** Entering, a carjack, a break-in, mounting, exiting and a bail-out are
    `E.ACTIONS` entries played against the vehicle's live pose. The carjack is a paired action that moves the victim,
    the takedown's pattern. The walk to the door is the ped's own and is cancelled by pushing away. The driver's seat
    can be reached by any door: from the passenger side the ped slides across.
  - **Chains.** A vehicle's explosion is a Combat blast, so it hurts, lights fires and sets off barrels. Any vehicle
    whose box is within `TUNE.carChain` (48 u) of the blast's centre goes up after `TUNE.chainDelay`: a car's half
    length plus a parking gap, so cars parked nose to tail chain. A blast also sets off any burning vehicle it reaches.
  - **Street furniture gives way.** Lamps, hydrants, bins, benches, newsstands and payphones are breakable solids. A
    vehicle above `TUNE.propBreak` knocks them over: their solid drops flat (`map.solids` is never rebuilt) and the city
    renderer draws them down. A city outlives scenes, so a new Fleet stands them up again.
  - **The radio is a stub.** A `stations` registry with Lowtown's four names; d-pad left and right step through
    them and 'off', and the HUD names the one tuned in. M10 brings the music.
  - **The handling suite runs per definition.** `sim/vehicle/handling.js` measures every definition by its class
    against its spec: 0-200 (or 0-100) within 10%, the top speed within 5%, dry braking within 10%, wet braking at
    least 15% longer, skidpad grip, a handbrake drift, no tunnelling at 400 u/s. Boats, the heli and the L have their
    own checks. FAN-OUT A1's workers tuned against it.
- **Answered:** no. **Landed in:** M4.

## D16 · 2026-10-17 · M4's close: box models in a painter's order, three reactions carried, the run handed off
- **Principle:** fix every look note at its cause (the renderer, not each model); keep the architecture and one
  working instance; never cut silently (the `/goal`); the owner's word on scope.
- **Calls:**
  - **Box models are drawn in a painter's order.** The models were first drawn in a fixed role order (wheels, body,
    trim, glass, roof, lamps, siren). Far-end lamps and bumpers then showed through the body, so content had to layer
    lids and end caps against it. A first fix sorted the outside parts by their centres against the model's middle.
    FAN-OUT A1's review found where that fails:
    - a light bar on a cab roof is lost from behind;
    - on a long body, a locker on the near flank at the far end vanishes, and one on the far flank at the near end
      shows through.

    The order is now pairwise: two parts a plane separates go far one first, by the side of the plane the camera is
    on. That side comes from the view's depth gradient (`P.depth3`) in the model's frame. Overlapping parts keep their
    roles' order, except an outside part sunk into a core box: it is drawn after the box only when the face it pokes
    out of faces the camera. The order is kept per model for each of the 8 octants, so a frame only reads it. Open
    doors are fitted in each frame. A wreck on its roof needs no special case. The models made for the role order
    look the same or better (checked from 8 headings in every view).
  - **The gate's stand-in cars top up the real ones.** PLAN.md 8.4's gate has 20 cars and 40 peds in view. With
    M4's fleet real, `?crowd=1` draws stand-in cars only to make up 20 with the real vehicles near the focus; before,
    they were drawn on top of them. Interleaved with M3's build, M4 measures the same within noise. This machine
    puts both builds at about the 10.4 ms gate, not inside it, so the margin is carried to M7 and M13 (HANDOFF.md).
  - **Carried, not cut.** Three reactions need systems that come later. Until then the hooks fire and the BUS carries
    the event:
    - the carjacked driver's flee-or-fight comes with PedBrain (M5): the driver is thrown down and `carjack` is
      emitted;
    - the heat from a break-in or a carjack comes with the wanted system (M6): `crime` is emitted;
    - the Boom Box Garage's shop screen comes with M8. The mods (paint, armour, nitro, oil, mines, the roof MG, the
      car bomb) work and are tested.
  - **The run is handed off after M4.** The owner asked for M4 to be finished, for M5 not to be started, and for
    the pull request to be merged, with a fresh session to continue.
    - Work begun on M5 during M4 is parked in `docs/handoff/m5-draft/`, out of the build, lint and tests. It holds
      the lane graph, the GPS and the signals, which work and are tested, and a draft DriverBrain that still stalls.
    - `docs/HANDOFF.md` says where the next session starts, and gives its `/goal` prompt.
    - `GOAL.md` and PLAN.md section 20 keep the original prompt unchanged: it is the contract's.
- **Answered:** the handoff was the owner's request. **Landed in:** M4.

## D17 · 2026-10-19 · M5's roads: one-way streets beside their parking, arcs a turning circle fits, the L raised
- **Principle:** grow by content, not architecture (PLAN.md 7.4); PLAN.md 8.9's Accept (no deadlock, no cars inside
  each other, zero signal violations by calm drivers); fix a look or a stall at its cause.
- **What the M5 draft ran into:** M4's curb parking stands in the draft's street lanes (a parked car spans 12..38 u
  from a street's centre line, the lane's car 7..33), so traffic drove into parked cars; every car's turning circle
  (53-79 u) was wider than the junctions' corners (about 47 u), so turns swung into other lanes; and several pieces of
  geometry trapped long vehicles.
- **Calls:**
  - **One-way streets, single moving lanes.** Lowtown's streets are one-way (`oneway` on a road: 'N' 'S' 'E' 'W'),
    parked at their right-hand curb, the lane 7 u left of the middle. A clockwise ring (Terrace Road, Seawall Drive,
    Brick Lane, Gnome Row) holds alternating streets inside it; Canal Street and Wharf Street run west, so the south
    of the canal stays connected. The two avenues are two-way with one lane each way beside the median: their outer
    lanes are the parking lanes, as painted. Decks and ramps have one lane each way, 16 u from the centre line (the
    inside of a bend clears the inner railing). Less than a tenth of the road (stubs where one-way streets run off the
    network) is unreachable and pruned. The painter draws one-way arrows and the parking lane's line.
  - **Turns are arcs.** A turn connector is a circular arc of `TURN_R` 72 tangent to both lanes; where the box is too
    tight, it leaves its lane before the box and joins the next one past it (`fromS`, `toS`), or takes the largest
    radius a short lane leaves room for (63 at the least). Connectors are kept as point paths.
  - **Every road vehicle turns inside 60 u at full lock.** The Cortez, Retiree, Fed Sedan, Brute and Cruiser get
    .58 of lock; the Hauler, Medic, Rhino, Strongbox and Saint .62; the Pumper .66. The handling suite passes for all
    19 definitions. A driver takes each turn at the speed its lock, fading with speed, still holds that arc.
  - **Junction reservations** (`nav/junctions.js`) replace the draft's claims: connectors whose paths come within a
    car's width conflict; a ready driver is granted its connector when no holder and no driver ready longer has a
    conflicting one. All-way stops take turns; a left turn on a green gets its gap; a red queue or a full exit blocks
    nobody.
  - **The L at z 112** (the plan's 100): the Pumper (42 tall) and the vans clear it where it crosses the Loop (64).
  - **Builder fixes:** no railing stands between two road decks at one height (the gap's stub had walled off the Loop's
    lane); nothing is planted where a deck's slab would cut through it (palms under the west ramps); no pillar stands
    within four cells of a junction's box; a road deck's square notches get a three-step apron (a turning van's body
    swings across them); lanes avoid static solids.
  - **Body fixes:** a deck's tread is driven onto within a step plus a slope's rise along the body, ahead or behind
    (a long van could neither start up a ramp nor come down one); a body's second collision pass runs only after a push.
  - **LOD and slicing (PLAN.md 7.11):** within `fpFull` of the focus a traffic car drives on its physics; beyond it, its
    brain moves it along its lane, sensing every third step. The Fleet keeps sleeping vehicles in a grid of their own.
  - **Traffic density:** `trafficCars` 34 at full density (the neighbourhood, night .6 and rain .8 scale it). The plan's
    cap of 28 moving vehicles was for physics; most traffic is kinematic beyond 400 u, and 22 cars spread over the 760 u
    disc put barely two in sight.
- **Measured:** 30 cars for 10 minutes on Lowtown's lanes (`tools/traffic-probe.mjs`, physical and kinematic, seeds 7, 31,
  97): no cars inside each other, no unexplained stall longer than 1.7 s, mean speed about 50 u/s, no crash damage.
- **Answered:** no. **Landed in:** M5.

## D18 · 2026-10-19 · M5's city: gliding crowds, fills on arrival, units that get there, sirens that leave room
- **Principle:** PLAN.md 7.11 (LOD and time-slicing to stay inside D10's budgets), 8.10's Accept, and fix a look or a
  stall at its cause; reuse the engine where it serves (`E.sees`, `E.hears`, the mocap libraries, the engine's own
  `tools/anim-set.mjs`).
- **Calls:**
  - **The sidewalks are a graph of lines** (`nav/sidewalks.js`): each walk band's middle line, cut at corners and at the
    crosswalks (crossing edges tied to their junction's signal), with a clearance mask for every 16 u piece (where on it
    a body fits past lamps, hydrants, benches and palms). A piece no body fits through drops its edge.
  - **A calm ped glides** (`ai/pedbrain.js`): it moves along its line with no physics, on half the steps near the focus
    and a quarter far; one that reacts (flees, fights, is hurt, floored or burning, stands off its line) runs on its
    feet, on its physics. Its rig is posed only when it is drawn. Peds keep to their lines' free offsets and step round
    the player.
  - **The crowd keeps a disc of its own** (`crowdIn` 420, `crowdOut` 540), smaller than the traffic's 620-760: peds are
    slow and only the near ones are seen. Spread over the traffic's disc, 140 peds put two to five on screen, and the
    street at noon read empty; in their own disc at `crowdDensity` 2 peds per 100 u of sidewalk line (the same total,
    about 140 by day; `crowdNight` and `crowdRain` .55 each, at most 200; by neighbourhood: Neon Mile 1.25, Palm Park
    1, Brick .8, the harbour .7) there are 24-40 within 250 u. A new arrival fades in over .8 s, so one put down at a
    corner of a zoomed-out view never pops. Foot cops patrol near the precinct; the gangs' hangouts come with M6's
    gangs.
  - **The disc fills when the focus arrives somewhere** (the scene starts, a teleport, a switch, the hospital: a jump
    of more than half the annulus's inner radius). Nothing round it has been seen, so the crowd fills it (beyond 60 u)
    and the traffic too (beyond 100 u); otherwise both come in only through the annulus. The play scene moves the
    footprint to the focus before the city steps, so a jump never spawns round the old place. Traffic is put down short
    of a stop line by 40 u, at a speed it can stop from, and never on a car put down the same step.
  - **Witnesses** (`E.sees` in a 3.6 rad cone to 260 u, `E.hears` for shots and blasts): at most three phone in a
    crime, each by its phone trait; a violent crime's witness stands back beyond 120 u (nearer, everyone runs, the
    brave aside). The call goes through after 2-4 s unless the witness is hurt, scared or killed first; a `report`
    sends the police.
  - **Crossing on the signal:** on its walk light a ped steps off unless a car is on the crossing or a third of a second
    from rolling onto it (the cars yield: the plan's "crosses at crosswalks on the signal"); at an unlit crossing it
    waits for a gap. Measuring the approach from a crossing's middle had kept a dozen peds 54 s at the long crossing
    over an avenue. A ped at a crossing's curb is never asked to stop and chat.
  - **Emergency units** (`ai/emergency.js`) come from the annulus, picked by one reverse Dijkstra from the scene
    (`GPS.costsTo`: a one-way street can make the nearest spawn the farthest), sirens on, by the GPS. A unit parks where
    it stops while its crew is out (kinematic, passed like any stopped car); a crew held up near the scene for 3 s (by
    another unit parked there, on a street with no way round) gets out and walks the rest, round vehicles by the
    corners of their boxes. The Medic comes 6 s after a body; its paramedics kneel 4-6 s, and a non-story ped is
    revived 6 times in 10. The Pumper comes 3 s after a fire and turns its cannon on what burns within its reach (150 u)
    near the scene. The police search a report's scene for about 9 s.
  - **Sirens:** a car with a siren coming up behind pulls over into a gap on its right wide enough to clear the siren's
    way (the two half-widths and room), and waits there; with none (a street parked up on both sides) it drives on at
    its own speed, and one that has stood 3 s with the siren stopped behind it leads it on instead. The draft's "ease
    right and slow" pushed parked cars along at 3 u/s with the Medic crawling behind.
  - **The one-way lane 10 u left of the middle** (D17's 7): the Medic and the Pumper pass a car parked at the curb.
  - **The far LOD takes a car only near its line** (12 u): one pulled over or pushed further off stays physical until it
    is back; putting it on its line had landed one on the car stopped beside it.
  - **The Marching Mimes:** six in single file 18 u apart (13 read as a clump in ISO), spawned only with the whole file
    in the annulus; hurt one and all six come for the attacker at once (a fellow's stray punch in the brawl doesn't
    count); flatten all six with a vehicle and the BUS hears `encore` (the toast: ENCORE!).
  - **Fire spreads a patch, not the park** (`fireHop` .8 to .62, as `sim/fire.js` says it should): a 4-second Molotov on
    Palm Park's grass grew to about 700 cells at .8, to about 40 now. The Pumper's cannon douses from 12 u off its
    nozzle (it began at 30 u, past a fire at the truck's feet).
  - **Two M4 effects never showed:** the water cannon's jet and a burst hydrant's spray gave their particles `life`
    equal to `max` (`life` is a particle's age), so each died on its first step. Fixed; the jet fans out wider. And
    one showed when it shouldn't: the MPD Eye's searchlight beam at noon; it is drawn after dark only.
  - **Mocap:** the clips GTM plays (the crowd's idles, the paramedics' kneel, the cower) are cut from the vendored
    Quaternius and Mesh2Motion sets by the engine's own `tools/anim-set.mjs` into `vendor/my-3d2dge/mocap/sets/gtm.js`
    (8 clips, 38 KB), its hash in `VERSION.json` (`tools/mocap-cut.mjs`): PLAN.md 6.2's "our cut clip set".
  - **The AutoPlayer core** (`ai/autoplayer.js`) writes the same Intent a pad does: it walks the sidewalk graph, takes
    the nearest car it can reach for a trip beyond 420 u (carjacking its driver, as a player would), and drives the GPS
    route with a quicker DriverBrain that still stops for lights. `?auto=<poi>` sends the possessed protagonist there.
  - **The headless harness runs the game in an ordinary global object** (`vm.constants.DONT_CONTEXTIFY`): a
    contextified sandbox answers every global lookup through an interceptor, and `Math.floor` in the crowd's loops cost
    a hundred times what it costs in a browser. The page and the harness then run the same city step for step
    (compared frame by frame for 12 s).
  - **Costs found on the way:** aim assist tests sight last and gives up after four candidates (with a crowd in the
    cone it had cost 13 ms a step); Bindings caches its derived maps; map solids share one shape (V8 keeps the
    collision loop monomorphic); the Fleet's ped and train passes test bounding boxes first.
  - **Drawing the crowd** (PROGRESS.md has the measurements): an actor off the screen is skipped in every view (in ISO
    its contact shadow had still been queued; TOP-DOWN and MODE 7 had drawn every crowd body in reach), and in MODE 7
    a body drawn smaller than .7 has its kept image redrawn half as often (ISO's bodies draw at 1.41, TOP-DOWN's at
    1.1: neither is touched). Against M4's build on one machine, interleaved, M5 draws the ISO gate 12-23% faster,
    TOP-DOWN and MODE 7 the same; scaled to the gate's machine ISO and TOP-DOWN are inside their gates, and MODE 7
    stays about M4's 14 ms, over its 12.7: M7's lever (D10). The update costs about 1 ms a step on a machine twice as
    slow as the gate's (budget 1.5).
  - **The soak's terms** (`tests/city-soak.mjs`): a red run is a calm driver onto a signalled connector red for half a
    second (one committed on amber may reach its connector just after the change); a wait at a crossing up to one
    signal cycle (30 s) is a wait, not stuck; the traffic's mean-speed band is 20-90 u/s (stops, queues and crossings
    included; about 40 by day, 45 at night).
- **Answered:** no. **Landed in:** M5.

## D19 · 2026-10-19 · M6's law and order: heat a cop sees, units that get there unseen, NABBED and WRECKED, gangs on their turf
- **Principle:** PLAN.md 8.13 and 8.14 and M6's Accept, GTA V's search-and-evade; the engine's perception where it
  serves (`E.sees`, `E.Suspicion`); one fighting brain for everyone who fights on foot; a look fixed at its cause.
- **Calls:**
  - **Crimes are content** (`def('crimes')`: heat, `report`, `violent`, `severity`; `src/game/crimes.js`, 15 of
    them). A crime earns heat only when the police hear of it: a cop's own eyes file it with half again
    (`copSeenMul` 1.5), a civilian's report at its face value. A crime against someone counts once a victim for 30 s (a
    beating's punches; the cop and the witness telling of the same thing); against no one, once in 6 s within 120 u (an
    SMG's burst). Heat to stars at 20 / 60 / 150 / 300 / 600.
  - **Traffic offences** (speeding over 230 u/s, a red light entered) are crimes only in a cop's sight, and nobody else
    minds them (`report: false`, severity 0: no witness phones them in, no driver panics).
  - **The police's own violence is `lawful`** (a field on the crime event): nobody phones in an officer's shots, though
    the crowd still runs from them; and an officer on its beat is never a witness for the crowd (it files what it sees).
  - **Who sees:** an officer on foot in a 2.6 rad cone to 240 u, a crew in its car or at a roadblock all round to 300
    (240), the Eye all round to 520 from above. An alley halves every sight; under a deck the ground units see .6 as
    far and the Eye nothing. A crime in a cop's sight fills its `Suspicion` (a violent or grave one at once, a mild one
    over a moment's look), and its alert files the crime.
  - **The tiers are content** (`def('policeTiers', '1'..'5')`): 1★ a cruiser, arresting; 2★ two, shooting; 3★ three, the
    Eye and a roadblock; 4★ two cruisers, two SWAT vans, two roadblocks and a spike strip; 5★ two cruisers, a SWAT van,
    three Feds' sedans (they flank) and two strips. **The Feds carry the Buzzsaw:** the plan says rifles, and the
    slice's arsenal (9.7's eleven) has none; SWAT carry the Persuader. SWAT and the Feds are new archetypes (9.8 names
    them), armoured 60 and 40.
  - **Units come from the annulus** (Traffic.dispatch) and are driven by `police/pursuit.js`: the GPS route re-planned
    as the player moves; within 170 u on a clear line, straight at them (a stop short of a body on foot or a stopped
    car; a PIT at a moving car's rear quarter), braking for anyone on foot in the way. **Out of every view's sight**
    (beyond the spawn ring's inner edge) a unit held up in a queue slips ahead along its route past it: nobody pulls
    over for a siren they can't see, and the first units had sat in a jam at a light half a kilometre off. In sight it
    waits like anyone. Its crew gets out at the player on foot or stopped (within 90 u and seen, or held up 3 s within
    320 u), and runs back to drive on when the player drives off (beyond 140 u at over 60 u/s).
  - **One fighter brain** (`ai/fighter.js`) for the police's officers and the gangs' members: close to range and a clear
    line of fire (round a wall's corner; a step aside when a car stands in the line, which had soaked up a whole gang's
    fire until it blew up and took them with it), then bursts a little off each time; a bat swung in close; a Molotov or
    a grenade now and then at a throw's distance.
  - **Bodies posed only when drawn shoot from their body** (a hand held out at the shoulder), never their rig's joints:
    the officers' first shots had come from wherever their rig was last drawn (a view would have moved a shot).
  - **Officers already about join in:** a patrol officer of the crowd, or the pair a report sent to look round
    (emergency.js), who sees the player wanted is handed to the chase (`Crowd.release`, `Emergency.handOver`).
  - **Roadblocks and spike strips** go down on the lane ahead of a driving player, at its first point in the annulus,
    clear of each other; the police's own cars never ride their strips. A strip bursts a car's tyres (`flats`: grip and
    drive down 45%, the wheel tugging, sparks off the rims). Both go once passed and out of sight.
  - **NABBED** (`busted`): a cop within 12 u of the player on foot while slow (under 35 u/s) or unarmed for .8 s, or
    within 16 u of the driver's door of their stopped car (under 4 u/s) for 1.5 s. The police hold still; the bust
    camera (zoom 1.6) and the card for 3.2 s; then the precinct, bail ($250), every weapon taken but a job's tools
    (the weapons' new `keep`: the Snap), the stars cleared. **WRECKED** (D14's WASTED renamed, the plan's word): the
    card, the hospital, its bill ($100). Every fee a TUNE knob. The respawn is the sidewalk in front of the door (the
    hospital's forecourt palm had stood in front of the protagonist), the camera cuts to it (it had slid across town),
    and a revived body is on its feet at once (its rig's get-up played out).
  - **Respray:** in a car at Spray & Pray (within 44 u, under 40 u/s), wanted, and nobody seeing: $100, the next colour
    of the car's palette, its tyres mended, the stars gone. Seen: "NOT WHILE THEY'RE WATCHING". **Bribes:** four in
    Lowtown's alleys, a star each, left lying with none.
  - **Switching is refused while wanted:** the crew wheel and the switch pass the stars to `Crew.canSwitch`.
  - **The radar** (`ui/radar.js`, ahead of M9 because M6 needs its cones): round, at the bottom left, north-up on foot
    and the vehicle's heading up in one; the city baked a pixel a tile; each gang's turf hatched sparsely in its colour
    and pattern; police blips (cars red and blue by turns, officers dots, the Eye a diamond, pinned to the rim beyond
    it); while wanted, the search circle and the cops' sight (TUNE `radarCones`: an officer's cone, a car's or the
    Eye's all-round sight a faint ring; filled, they had turned the radar red). The stars: five outlined, the earned
    ones gold, flashing while the police search. M9 adds the GPS line and the rest.
  - **Gangs are content** (`def('gangs')`, `src/game/gangs.js`) with one field the plan's list lacks: `beats`, where its
    patrols walk by its borders, so rival patrols meet. Respect (the save's, -100..100): -5 for a member killed, +1 with
    the gang whose rival it was, -2 for a gang car damaged (once a car in 10 s). Hostile at -20: members in their turf
    come for the player on sight; friendly at 40: a punch let go once in 10 s, and members go for whoever goes for the
    player. Three hang out at each HQ and two walk each beat while the place is near (the crowd's ring, `Crowd.group`);
    gang cars are 30% of a turf's traffic and keep to it (`DriverBrain` `keep`); a hostile gang's driver who sees the
    player near gets out to fight. Rival members who see each other start a turf war: every member of both sides within
    240 u joins; it ends when a side is down or gone, or after 60 s; the same two not again there within 45 s.
  - **The BUS catalogue grows** (`core/events.js`): M5's dispatch, onScene, revived and encore; M6's roadblock, spikes,
    spiked, respray, respawn, confiscated, turfWar and turfWarEnd; crime gains vehicle and lawful, report its by,
    victim, witness and severity, busted how, wanted why, respect value and why.
  - **Shop signs are drawn in slices along their wall**, each ordered at its own spot on the wall's foot: the
    protagonist at the Greasy Spoke's door had been drawn under its sign (the lamp beside it lifted the board's order),
    and one sort key for the whole board put it under its own wall.
  - **A unit never parks inside a junction, nor where nobody can pass it, and a dead crew doesn't keep its car** (found
    by the 10-minute soak, the first with gangs and police about). A unit stopped with its front at its call's point:
    by a lane's start its body was still on the junction's connector, and its crew got out there; a second unit called
    to the same scene stood behind it in the junction for good. A unit now stands only where it may (Traffic.parkable):
    on a lane, short of its end by room for the traffic to go round it, and far enough along it to leave a car room
    behind it past the lane's `clearS` (the road graph's point where a car's tail is out of the junction and off the
    zebra: one stopped just out of a junction had left the car behind it on the connector, over the crossing, for its
    whole call). Its stop is on the nearest lane with room for that and for a pass ahead, else for that alone, else the
    nearest (the Pumper aside: it stops as near the fire as it can, and sprays, as before); a unit held up waits until
    it stands where it may before its crew gets out (a call's, and the police's own in a jam), unless it is held behind
    a car that won't move, when the way is blocked already. A driver enters a junction only when the lane beyond has
    room for it past `clearS`: a queue no longer backs up over a crossing. A car behind a unit at its scene with no way
    round has a cause, the scene ('scene', in the soak's causes, its longest wait reported apart): it still tries to go
    round, every 0.75 s. A call's crew all dead ends the call: a living one aboard takes
    the wheel, and with none the car is left as any abandoned car (it had waited for them for good). One Medic serves a
    street's bodies (calls merge within 180 u, not 90: three units had parked nose to tail at one fight). **The tow:** a
    car the traffic left with nobody alive at the wheel (its driver killed in a fight, or out to fight) is taken away
    once it has stood 10 s beyond the spawn ring's inner edge, out of every view's sight: one had blocked its lane, and
    a crossing beside it, for good. A gang car is sent home only from a lane with room to stop (a new way taken just
    short of a light had run its red), and a way with no goal (the GPS's road home) ends in ordinary driving.
  - **The AutoPlayer core's long drive** (`city-life.test.mjs`) gets 180 s instead of 120: the gangs' fights in the
    street and the police's calls slow the city (it arrives in about 150 s).
- **Answered:** no. **Landed in:** M6.
