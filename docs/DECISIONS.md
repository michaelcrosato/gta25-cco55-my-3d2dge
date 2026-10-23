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
    short of a light had run its red), and a way with no goal (the GPS's road home) ends in ordinary driving. A ped
    held at a crossing's curb for 20 s, longer than any light keeps it (a parked car shoved onto the zebra by the
    traffic had held one there 37 s), turns and takes another way from its corner. A far car going round something is
    put beside its path by the pass's offset, as a near car steers it: on its line it had driven through the car it was
    going round.
  - **The AutoPlayer core's long drive** (`city-life.test.mjs`) gets 180 s instead of 120: the gangs' fights in the
    street and the police's calls slow the city (it arrives in about 150 s).
- **Answered:** no. **Landed in:** M6.

## D20 · 2026-10-19 · M7's views and the bank: memory and a dissolve, MODE 7's lenses, a city that stands still, guards that come to look
- **Principle:** PLAN.md 5.2-5.5, 8.2, 8.5 and 8.21 and M7's Accept; the engine's perception and paired actions where
  they serve (`E.sees`, `E.hears`, `E.Suspicion`, `E.FlowField`, `E.ACTIONS.takedown`); presentation never read back.
- **Calls:**
  - **The view manager remembers a view per context** (on foot, in a vehicle), each back on getting out or in; a deep
    link's view stays until the player picks another. **Auto** (off by default, a TUNE knob) picks ISO on foot and
    TOP-DOWN at speed; the player's own switch holds until they get out.
  - **A switch, and a turn of MODE 7's rail, dissolve** the last frame into the live view over 0.35 s in a 4x4 Bayer
    order (`render/crossfade.js`), over the world and under the HUD; into ISO the buildings stand as flat blocks under
    it while the walls bake a few milliseconds a frame (the quarter turn's way).
  - **MODE 7's lenses** (`RIGS`): on foot h 70 with the focus 110-260 ahead; in a vehicle h 90, 160-380 ahead, the
    field widening by up to 12 degrees with speed; **indoors h 50, 64-190 ahead, 58 degrees** (the room's own: the
    city's put the camera outside the bank's walls with a quarter of the screen black). Eased, never cut. **Auto-rail**
    (a knob, on) turns the rail, through the dissolve, to the axis a vehicle has held for 1.5 s at over 40 u/s with nine
    tenths of its speed along it. A body right in front of MODE 7's lens (nearer than .7 of the near distance), the
    player's aside, is drawn see-through: two guards between the camera and the player had filled the screen.
  - **MODE 7's sky** is the hour's backdrop above the horizon, its skyline turning with the rail, its foot fading into
    the haze; indoors a dark ceiling, no backdrop past the walls in ISO (`indoorSky`).
  - **The camera rig** (`stage.setRig`) holds every view on a point, a zoom and a heading, for photo mode and
    cut-scenes; the scene's focus follows it.
  - **The depth views' light pass works at a quarter of the buffer's size** (`TUNE.depthLightRes` 4: the dark and the
    lamps' pools, scaled up smoothly). Measured with every other part kept, side by side with a fresh baseline: the
    whole pass cost 4.4 ms a frame here, the quarter-size one 0.8; the pools are soft gradients, and the coarser field
    doesn't show.
  - **The interior's data** (`def('interiors')`) is PLAN.md 8.21's list as the builder needs it: its size is its
    ASCII `blocks`' own; `legend` and `types` say what each character is; the `doors` carry the spawns (`at`) and the
    exits (`from`, the city's door point of interest); `rooms` name the parts, one `public` (the lobby); `guards`,
    `cameras`, `lights` and `music` as listed. `validateInterior` checks it and reports which rooms each door reaches.
  - **The BUS gains a scope and a mute** (`interior`; `BUS.mute(scope)` / `unmute`: a muted scope's listeners hear
    nothing) and three events (`interior` in and out, `alarm`, `takedown`), catalogued in `core/events.js`.
  - **Inside, the city stands still**: its clock, weather, bridges, traffic, crowd, police, gangs and the crew's other
    two are not stepped, its BUS scope ('world') is muted, and its share of the hash counts the player where they went
    in. Out by the door you came in, you are back on that spot (the city's hash the same as going in, and the same as a
    twin's that never went in, after as long in the city); out by another door, at its own point of interest. A fresh
    `InteriorRun` each visit (its own RNG streams and combat): the bank is as it was each time; missions H2 and H4 will
    hold their own runs (M8).
  - **Through a door the gun is put away** (fists) and given back outside: a gun drawn inside is the player's own act,
    and the guards' cue. The protagonists carry one in hand in the city, and every visit had begun with the guards on
    the alarm.
  - **What the guards and cameras mind:** the player outside a public room (past the counter), a gun out, aiming,
    wanted, or the alarm up. A guard's mind is an `E.Suspicion` (rise 1.8, decay .25): it notices (turns to look),
    searches (goes where it last saw them), then fights with the police's and the gangs' fighter brain, round the
    counter and through the doorways by a flow field. Seeing the player while alert, a guard raises **the alarm**: every
    guard alerted where the player is, and the crime `bankAlarm` (60 heat: 2 stars) filed at the city's door: the
    police are waiting outside. A camera that sees what a guard would mind fills its own mind (rise 2.4) and raises
    the alarm by itself; a guard killed raises it too.
  - **Noise:** a sprint close by (60 u) turns a guard to look; **a shot** (heard to 280 u, half as far through a wall)
    **sends every guard who hears it to where it came from**, to look round there for 2.5 s (where it can't walk, a look
    that way). `Suspicion.hear` alone caps at searching and decays below it within a fraction of a second: the guards
    had turned and gone back to their rounds.
  - **A takedown** is offered from behind (within 1.1 rad of the guard's back) and close (20 u) on a guard that isn't
    hunting the player; the attack button does it instead of a swing (the prompt says so). The engine's paired action
    holds the guard (`Ped.held`), then it is down for good. Quiet: no alarm, unless another guard or a camera sees it.
  - **Cut-aways indoors:** ISO's is a dollhouse's (every wall on the camera's side within 16 cells of the player drops
    to its stub: an interior's wall cells are each their own lot, and the city's rule had dropped single cells round the
    player's box); MODE 7 drops every wall nearer than the focus; TOP-DOWN needs none. Furniture lower than a body
    (`cut: false`) stays.
  - **A ped's wait at a crossing's curb counts at the spot where it stands** (D19's 20 s give-up, amended), whatever
    its state, until it has moved 4 u away: a ped that fled to a curb and calmed down there had started its wait again
    from nothing (the day soak's new route: 38.5 s behind a lorry stopped on the zebra).
  - **8.5's see-through verdict has a fixture:** `#proving/occluder`, a tall block between MODE 7's camera and a
    magenta marker; its self-test (in the e2e suite) counts the marker's pixels: none behind the block, all of it
    stepped out.
  - **The gate's figures are read against M2's own build**, measured in the same rounds as the build being judged (this
    machine is slower than the gate's, by a different factor in each view, and its own speed drifts by up to 8% from one
    run to the next): a build's median over M2's in that round, times M2's median on the gate's machine (ISO 9.65 ms,
    TOP-DOWN 8.4, MODE 7 15.2). M5's and M6's "scaled to the gate's machine" figures had used M4's ratio for every view
    and read low; PROGRESS.md corrects them.
  - **The draw levers M7 landed** (each measured against a fresh baseline beside it, then interleaved with the build
    before): the depth views' light pass at a quarter size; a kept image only for a shape small on screen (parked cars
    near MODE 7's lens had kept images hundreds of pixels a side, redrawn every few frames: 3.9 million pixels a frame);
    ISO's sky backdrop drawn only where the map's edge is in sight; a moving car's image kept in ISO (its look the same
    wherever it is) while its heading (2 degree steps), lean, steering and lights hold; **ISO's floor chunks projected
    once per view and copied** (the turned blit was the floor's whole cost, about 5 ms a frame here; the copies match
    the blits pixel for pixel, but for a 2% alpha fringe at the map's edge and a few texel-edge samples at zoom .65); a
    crowd body more than 160 u (|dx| + |dy|) from the player redrawn every 6 frames instead of 4; a deck cell a few pixels
    across drawn plainly.
  - **What they reach, and what M13 carries** (PLAN.md 16's polish pass; the gate stands): TOP-DOWN 9.9 ms against its
    12.7, inside. ISO about 11.4 against 10.4 (over by about a tenth: 10.9 and 11.8 in two rounds). MODE 7 about 18
    against 12.7: M2's own MODE 7 was already over its gate (14.4-16.0, the crowd lever then to come), and since then the
    city has filled with real traffic, crowds, police, gangs and the elevated decks; against M2's own build it has grown
    as much as ISO has (1.18 times each). A view switch's dissolve is 0.35 s and
    never moves the simulation, but at the gate (the tour at 300 u/s in the rain) the first frame into a view, and in ISO
    the frame the walls' bake-in times out, run past 33 ms on the gate's machine (the caches filling: TOP-DOWN's face
    textures, ISO's walls). M13's levers: MODE 7's floor as one raster (a row of pixels per screen row, read from the
    chunks' pixels, not 420 drawImage calls), deck cells merged into runs, far bodies and cars as simple shapes, the
    spans' textures to a nearer distance, the sky band kept between frames; ISO's roofs merged into one image a building
    (D10's lever); each view's caches warmed before a switch needs them, and the walls' bake-in finished under its
    budget rather than all at once. M7's own Accept ("medians within budget in all views") passes for TOP-DOWN and moves
    to M13 for ISO and MODE 7.
- **Answered:** no. **Landed in:** M7.

## D21 · 2026-10-19 · M8's career: ops that clean up after themselves, a bot that plays from the hints, a pad pass, interim cards
- **Principle:** PLAN.md 8.15, 8.16, 9.4, 9.5 and M8's Accept; the staged contract frozen in M1 kept whole (stages of
  a setup and a generator run), everything added to it optional.
- **Calls:**
  - **An op is `{ step, start, end, nav }`**: `start` when the run yields it, `step` each simulation step until it
    returns `{ value }`, `end` when it finishes or the stage stops under it, `nav` where it wants the player (the
    GPS line's and the bot's goal). Markers made, and the objective set, while an op starts are its own and go with
    it: a delivery's ring and its line never outlive it. The m API grew the verbs content needed (`reach`, `enter`,
    `evade`, `kill` with a count, `collect`, `photo` of a ped or a point, `sequence`, `remove`, `curb` and `lane`
    spots, `as`, `interior` and `outside`, `on`, `fire` and `heat`, `allowWanted`, `crewPed`, `stash` and `garaged`,
    `view`), all listed in docs/CONTENT-GUIDE.md. The mission and activity shapes gained optional fields (`plays`,
    `allowSwitch`, `unlock`; an activity's `kind`, `brief`, `rewardsFor`, `where`); the BUS's `photo` gained the
    Snap's `dir` (a photo of a point needs it), and four events (`purchase`, `property`, `holdup`, `cab`).
  - **One slot for a mission or an activity**; the random events run in a second runtime (the BUS scope `event`) only
    while the first is idle and the player is outdoors, and a job starting quits one. Tokens, stunt jumps and hold-ups
    are passive frameworks, on in free roam (the stunts always).
  - **A retry starts the stage from its setup** with what the stage spawned released first, and the player put out of
    a mission car that goes too (a retried delivery had left its wreck across the lane, and the bot behind it).
    Content code that throws fails the job with the reason `error`, logged and kept in `R.errors`, instead of stopping
    the scene.
  - **The bot** (`ai/missionbot.js`) plays any objective from its hint's kind and data, through the AutoPlayer's
    moves, which M8 widens: into one given vehicle (its door, another door when one is blocked; a door walked to before
    △, so the scene's own straight walk is a step), a stop seated at the goal, an off-road last stretch at a crawl,
    straight walks where the way is open (a palm's trunk or a post in the way counted), a sidestep and then another
    start node when a walk is stuck or no nearer its waypoint, a goal's height (a deck's lanes). It drives as a player
    does: through the lights and stop signs, first into a junction's box (the driver brain's siren mode, with no siren
    sounding), round a queue that has not moved for a few seconds mid-lane (the brain's `squeeze`; never at a
    junction's line, where a pass overshoots the turn), into a box that stays shut past that, off a jammed exit when
    the other way costs little more (a route that keeps off the lane past it; a lorry's U-turn at the map's edge is
    worse than waiting), off the road toward a point farther along its route when a jam still holds it, back onto
    the nearest lane when lost far from its goal, and out of a car stuck for good (not taken again); carefully when a
    delivery's health counts. It never takes a police car, an ambulance or a fire engine on its own. On the way
    somewhere it loses any stars first, unless a timer runs or the stage allows them; it fights with its best loaded
    gun, from farther off and in longer bursts than a gang's grunt, backing off as it fires from one come close; it rams (backing off for another run when pressed
    against the target at a crawl), tows (lined up on the car's axis past whichever end has room, backed straight onto
    it), shoots from a passenger seat, sprays the Pumper's cannon, photographs, and sneaks a stealth path (an outdoor
    guard that has seen it is fought: outdoors there is no unease to wait out). A retry starts it afresh, and it
    retries a failed stage up to TUNE.botRetries (2) times. `m.curb` turns down only the spots a stopped vehicle
    stands in (traffic going by is no matter: the old rule had sent a stage's car 440 u off).
  - **What the slice's content needed of MOTOR**, found by a gym of one fixture mission per hint kind before the
    fan-out: a swing now meets vehicles and props too (the nearest side of each box in reach and in the arc; a car
    dented is `vandalism`), since G1's bat had no way to dent a Saints car; a stage's kit can be the mission's alone
    (`loadout({ only: true })`, the player's own weapons back when it ends); a `kill` counts a vehicle on fire as done
    (its wreck is coming, and its blast kills whoever stands at it: the bot backs away); a point can carry a height
    (`[x, y, z]`, the Loop's deck: `reach` and `race` count it, `m.lane` snaps to it, the bot routes up there); and
    `m.save` reads the save (QUIET's respect terms).
  - **Two MOTOR bugs the gym turned up:** a goal behind the car on the lane it is on was a one-lane route the brain
    took for arrived (the GPS now routes round the block back onto it, and the brain skips a goal behind it: a tow
    hooked facing away from its drop-off had driven off-road at it); and a roadblock with no room ahead (traffic where
    its two cars go) waited the whole 18 s before the next try (now 3 s; a spike strip the same).
  - **What the workers found in MOTOR** (each verified, fixed, and covered by a test; the workers worked round them in
    content meanwhile): the player's shots left from the posed hand, and the engine starts a Humanoid's clock at a
    random time (its idle sway), so the same game did not play the same twice: a PedRig now starts it at a phase from
    its ped's id; `m.place` threw on a vehicle (a body's speed is read from its axes); a fleeing car's next stop read
    lane fields that do not exist (NaN), and it drove off the roads and stopped for good; a fighter's line of fire saw
    the map's cells only, not the solids the shots stop at (pillars, containers, crates: it emptied its gun into
    one), and now samples the line as a bullet does; the engine's sight reads a target's `crouch`, which a Ped never
    had (crouching now shows a body lower and less, outdoors and in the bank); one press of the Snap filed a
    `shooting` crime (the street panicked, the police came); a stage's wanted cap or floor outlived its job. And what
    the Rats' chain needed: an explosive prop (`explosive` on `m.spawn.prop`: Combat's `makeExplosive`, its fuse in
    fire, gone with the job), a gang on the player's side for a job (`m.ally`: strays on its members rally no one and
    cost no respect, and none go for the player on sight), and `m.alerted(tag)` for a stealth stage's fail.
  - **What the merge found after them** (the same chains run again on the fixed MOTOR, each death traced): a body
    nearer than the posed gun's muzzle (18 u out) took no shot at all, the bullet starting past it (now a point-blank
    hit); a reload only ran in a step the trigger was stepped, so a beating every second held it off for good (its
    clock now runs every step); a bat's floor-swing every second kept a player down for good (TUNE.upGrace: just up,
    a swing hurts but doesn't floor again); and a burning body lit the cell under it, which lit it again, so it burned
    till it died, running or seated (a body already alight, just out, or in a car isn't lit by the fire under it).
    The bot learned what those deaths asked of a player: it shoots the nearest target in the open first (a fighter
    in cover can wait); it runs from any car on fire, the one it just left too; on foot it never steps into fire
    (round it, else it waits for it to burn down; standing in it, out by a way it can walk); a ram that only shoves
    its target along is backed off for a harder run, and rams that do no harm for 20 s it finishes on foot (with
    fewer than two stars); a job's own car (a delivery's) is never given up in a jam, and its stars are lost in that
    car, not another; losing the stars it drives into Spray & Pray once out of sight (the career tells it where, and
    that the fee is in hand); and a turn it keeps failing (a long truck at a corner's post) is kept off its next route.
  - **FAN-OUT A2 runs eight workers, not six.** PLAN.md M8 names one per gang chain, one for P0, one for the heist and
    one for the jobs and activities. The heist's finale (LOUD and QUIET, the switching, the MODE 7 getaway, the
    credits) weighs as much as its three setups together, and the side content splits cleanly into the activities
    with levels (jobs, races, MAYHEM) and the placed things (tokens, stunt jumps, random events): each half has its own
    worker, each owning disjoint new files, two at a time (the machine's cores less two). S1 was written first, by
    hand, as the reference the workers copy.
  - **The scripted human-style pass is the same bot through a gamepad**: its wishes are pressed on a pad by the pad
    pilot (`ai/padpilot.js`) each step, and the game reads the pad through the bindings and the HumanController (the
    camera-relative sticks, the dead zone, presses and releases; weapons stepped with the d-pad, never picked from the
    inventory). Whatever passes that way a player with a DualSense could do. `node tools/bot.mjs --pad`.
  - **The bot campaign** (`tools/bot-campaign.mjs`, in test:full; PLAN.md 15.4): a new game from the title's NEW GAME,
    played to 100% by the mission bot. Between one thing and the next it travels by the dev teleport, on foot to the
    sidewalk nearest where it is going (PLAN.md 8.20 allows the campaign that, never the attract mode); the rest it
    does as a player would, through the scene's own seams: a giver's marker walked into (the bot accepts the JOB
    card), a job from the phone in its vehicle (taken where the fleet parks it: the precinct's cruisers, the depot's
    Pumper, a moped at the Gas'n'Sip), a race's start driven into in the fastest car near it, a MAYHEM's start walked
    into, a token walked and climbed onto (a jump up each ledge of its way), a stunt driven at flat out from its
    approach, a property's BUY prompt pressed and its confirm card accepted. Stars left over from a job are lost first
    (the bot's own evade, now public for free roam). A property short of cash waits for the pay of what comes after
    it, or of a job played again at its top level; anything that fails is tried again after the rest, three times in
    all. The career's `giverOf(m)` says where a mission's giver stands.
  - **The cards are M8's interim 10-foot screens** (≤ 6 items a page with a page count, ✕ confirms, ○ backs out, a
    focus frame that pulses, a legend in the player's glyphs): the JOB card at a giver, JOB BLOWN, JOB DONE, a choice,
    the shops, a confirm above $5,000, the phone (jobs in a job's vehicle, Lowtown Cabs, contacts, completion). M9
    rebuilds them with the UI kit. While a card is up, Esc and Options back out of it instead of pausing.
  - **Givers:** a mission is offered at its giver's point (a gang's payphone, a character's hangout, the planning
    board) once its `requires` (and `unlock`) hold; `giver.intro` starts with a new game. The title's ✕ continues the
    latest save, or starts a new game.
  - **The economy** keeps every price as a `Prices` knob, a weapon on Lead Farm's shelves once its mission is done (the
    M3 placeholders `m3`... now name the missions), the Kwik-Lux chain as three stores of one shop with a till each,
    Boom Box and Spray & Pray as drive-in shops; a property is bought once and pays into a till at every midnight (the
    clock's day turning) up to its cap, collected by walking up to it. Completion's seven categories weigh 420, 120,
    60, 90, 100, 100 and 110 tenths of a percent (missions, jobs at level 3, races, MAYHEMs, stunts, tokens,
    properties): exactly 100 with everything done.
  - **Saves:** △ SAVE at the safehouse writes slot 1, and the autosave follows each mission and job passed; during a
    mission only a step that asks for it (a `goto` hint with `interact`) offers a door's prompt (the prologue's save).
    A stashed vehicle is kept in the save's garage and stands where it was left after a load.
  - **Hold-ups:** a Kwik-Lux's clerk stands at the counter (its door); a gun held on them for TUNE.holdupTime empties
    the till at the counter and files a `holdup` (60 heat: two stars, the store's silent alarm); that store is shut to
    hold-ups for a game day.
  - **FAN-OUT A2 paused at the weekly usage limit** (part 2b). Three of the eight workers' results are merged: `rats`
    (part 2a), then `heist-finale` and `gnomes` as written (each of their four missions passes through the bot on
    seeds 1-3 and through the pad on part 2a's MOTOR). The workflow was stopped with `heist-setups` and `jobs` mid-way:
    their files are kept as work in progress in `docs/handoff/m8-a2/wip/`, outside the build, with their last runs in
    that folder's README. `saints`, `prologue` and `extras` never started. The H4 and Gnomes workers' MOTOR requests
    were each checked against the code. The 18 real gaps are prepared as one patch (`docs/handoff/m8-a2/motor-patch.py`)
    but not applied, because a MOTOR change moves every bot run, and validating it (all merged content again, both
    ways) would not fit before the limit. Four are left for a call: H13 (MODE 7's heading), G5 (fighting back a
    passer-by), G7 (three stars) and G9 (a pier's walls, which changes the harbour's map). Nothing is cut: the next
    session finishes M8 from `docs/HANDOFF.md`.

## D22 · 2026-10-21 · M8's close: the backlog validated, the four open requests settled, the rest of A2
- **Principle:** PLAN.md 8.15 (every mission through the bot on seeds 1-3) and M8's Accept (and through a pad); D21's
  rule that a MOTOR change re-runs every merged mission both ways; a worker's request is fixed in MOTOR with a test.
- **Calls:**
  - **The prepared patch applied** (`docs/handoff/m8-a2/motor-patch.py`: H2-H12, G1-G4, G6, G8, G10, G11) and checked
    as D21 said: `npm test`, then every merged mission through the bot on seeds 1-3 and through the pad, and the bot
    gym. Each fix has its test (`tests/sim/mission-motor.test.mjs`). The content's workarounds moved onto the new
    pieces: G1's passer-by (`m.shoo`) and its clock (`m.countdown`), G2's night (`m.hour`) and its rider (the runtime's
    own now), G3's drums (`m.blast`) and its truce (`m.truce('rats')`), H4's cameras (`loopCameras`) and its troopers
    (riding in their seats); with the heat dropped before the cap lifts (G8) a stage clears its stars in one call.
  - **H13, MODE 7's heading from a mission: done.** `m.view('side7', { heading })` holds the rail looking that way
    (Auto-rail and the player's quarter turns held off) till the next `m.view` or the job's end (`Stage.pointRail`).
    H4's standoff, Viv's window and the start of Gus's tow are now MODE 7 looking back east along the deck, the van
    and the roadblock in view (PLAN.md 9.4's set piece is MODE 7 throughout; the worker had put Viv's part in ISO).
  - **What H13 turned up: the pad pilot aimed off in MODE 7.** It turned a world direction into a stick with
    `screenVec`, whose depth is squashed (the lock-on's cone on screen), while the HumanController reads a stick back
    with `screenDirToGround`, which isn't: a target a little off the rail's axis was aimed at far off it. Views now
    give `groundDirToScreen`, the exact inverse (a unit test round-trips it in every view and on every rail). Nothing
    had aimed through the pad in MODE 7 before.
  - **And a pressed trigger read as a full one.** The bindings took a pad button's value as `max(value, pressed ? 1 :
    0)`; browsers call an analog trigger pressed from about an eighth of its travel (Chromium's 30/255), so on a real
    DualSense R2 would have been on or off (PLAN.md 8.1's analog throttle), and through the pad pilot a throttle over a
    half was a full one (the bot gym's follow lost its mark that way). Now a trigger's travel is its value; a press
    that reports none is a full one.
  - **A calm driver's patience with people about a crossing** (`TUNE.pedPatience`, 5 s by a calm driver's patience;
    the bot's own styles sooner): a crowd round a body at a corner kept crossing in front of a calm driver through
    every green, and held a mission's car (the bot gym's followed Saint) and the bot behind it for a minute and more.
    Out of patience, a driver gives up a crossing's wide berth (14 u) and keeps only a body's width (5 u): it edges
    past the people about the zebra, and still stops for one in its way. Every merged mission ran again on it, both
    ways, and the gym.
  - **A fighter stuck on its way steps aside** (`ai/fighter.js`): stuck, it routed by the sidewalks from the node
    nearest it, and when that node lay past a parked car it walked into the same car again every 0.8 s, for good (the
    bot gym's kill through the pad stood 190 s against a Brute; gang and police fighters use the same walk). Stuck a
    second time, it now takes a step to one side, then the other the time after (the AutoPlayer's remedy).
  - **What those two fixes moved:** with the city's fighters no longer stuck behind parked cars, two runs that had
    passed failed on seed 3, and each showed a gap rather than bad luck. R3: the city's own Saints, hostile, now
    reached the container yard's fight and shredded the bot (a third of its damage); the job's Saints are Fender's
    crew and no more, so R3 holds a truce with the city's Saints (`m.truce('saints')`), and a job may now hold several
    gangs out of its fight (the gangs' `allies` is a set). H4: the bot gave up the Hookline when it hadn't got nearer
    a Strongbox looping the bank's block for 45 s, and the stage fails when Gus leaves it; a `kill` hint can now name
    the vehicle the job is done from (`vehicle`: boarded first, held through any jam, never left on foot), and H4's ram
    names it.
  - **A police car left in the lane by its crew was never parked to the traffic** (`police.js` `_crewOut`; the
    emergency services' own already was): it kept the cause it last stopped for, so every driver behind took it for a
    queue and waited, and with the junctions round it the bank's block locked solid for minutes (H4's Strongbox, on its
    round, and the Hookline after it, seed 2). Its brain is parked now while the crew is out, and the traffic goes
    round it; and the bot's ram, held at a crawl short of its target behind a queue, backs off and slants past it.
  - **G5, fighting back a passer-by: left in content.** The bot is a player's proxy that keeps out of trouble: a
    civilian who swings back is sent running (`m.shoo`); it never starts a brawl with the street (the heat it earns
    would be the content's problem). CONTENT-GUIDE.md says so.
  - **G7, three stars: content never asks the bot to shake them.** The Eye sees 520 u except under the decks and the
    roadblocks sit on the routes: a player hides under the Loop and resprays (M6's tests prove both), but the bot's
    evade can't plan that. A stage the bot must get through stays below three stars, or drives its three through to
    a point where the story drops them (G2's diner). CONTENT-GUIDE.md says so; the workers' brief too.
  - **G9, a pier's buildings: done.** A pier's (or quay's) planks are ground a building lot can stand on
    (`world/builder.js`): the Harbor Rats' Boathouse and the Lighthouse stand on their piers, walls and roofs (they
    were bare planks with a sign). The Boathouse sits two cells back from its pier's landward end, so G3's fuel drums
    stand on open planks by the footbridge; its dressing moved off the building. R1-R3 and G3 re-run with the rest.
  - **J1, a checkpoint's height: done** (the jobs worker's trial): a racer's or a route's checkpoint with a height
    counts only up there (`within`), as the player's own already did.
  - **For the rest of A2, four small pieces of m** so content never reaches into the world (the WIP had used `m.W`):
    `m.fund` and `m.pay(n, why)` (H2's bribe), `m.eta(at)` (a job's fair clock by road), `m.byId(id)` (a BUS event's
    body or vehicle: MAYHEM's count); and a mission driver chases a tagged actor as well as the player (`drive: {
    chase: tag }`: S2's ambush on Fender's car).
  - **Part 3b, the heist setups merged (H1-H3)** with the heist-setups worker's seven requests (H14-H20 in
    `docs/handoff/m8-a2/motor-requests.md`), each settled in MOTOR with its test:
    - **The bot never holds the brake on a car rolling back** (H14, H15): `body.js` reads a brake held at u < -.5, or
      at a stop for .2 s, as reverse drive, so the bot's idle stop (a line said, no objective) ran H3's tow truck 200 u
      backwards down a one-way street, and an AutoPlayer at its stop backed off its drop. Now the throttle stops one
      rolling back and a stopped one sits on its handbrake. **A hooked tow is the job's own** (H16): held through a
      jam, never abandoned, and the end to hook is chosen by the parked cars round it, not the traffic going by.
    - **A running interior has a read interface** (H17): `m.inside.run.watch()`, a copy (each guard's round corner,
      cell, facing, mind and sight; each camera's sweep phase and mind; the alarm, the loop, the pass). H2's radio
      man times every leg from it and H4 counts the guards still up from it; nothing in content reads the run's
      insides any more.
    - **A staff pass** (H19): `m.inside.run.pass(on)`: nobody minds the player past the counter, though a gun out,
      a wanted face or the alarm still count. PLAN.md 9.4's H2 is "stealth past guards and cameras to photograph the
      plans, or bribe the janitor": the worker's bribe only looped the CCTV and left the guards to slip, which made it
      the stealth way with $500 less. With the pass, the bribe is the janitor's mop: in, through and out with no
      takedown and no waiting (silver by design: the $500 is the bonus lost), 62-64 s on seeds 1-3 against the quiet
      way's 130-137 s gold.
    - **A leash** (H18): `leash` (u) on `m.spawn.ped` for an enemy or a guard: past it from where it was put, it gives
      up and walks back, and only a fresh hurt turns it on the way (H1's showroom bouncers chased Dex 2,000 u; H1
      keeps its `m.remove` once the star is lost, which the bot runs prove).
    - **The stealth bot backs off when seen** (H20): it stood still whenever any guard indoors was uneasy, even in
      that guard's sight, so the suspicion climbed to the alarm. Seen by one that wonders, it now backs off the way it
      came; unseen, it waits at cover as before.
    - **H4 adopts H1's garaged Zephyr** (`m.adopt`): played after H1 the getaway car is the job's own and stays put.
      The worker also found H4's ram stage failing after another mission in the same game (Gus's Hookline never
      catching the Strongbox in the traffic an earlier job leaves): left for the bot campaign (M8.4), which plays the
      missions in sequence.
    - Every merged mission ran again on all of it: 33 runs on seeds 1-3, 11 through the pad, the gym 13/13 both
      ways, and H2's bribe branch on seeds 1-3.
  - **Part 3c, the rest of A2 merged**: the jobs worker's six activities (the Moto Courier, Vigilante and
    Firefighter jobs at three levels, the Loop Sprint and Harbor Hustle races, three MAYHEMs), the extras worker's
    25 Moto Tokens, five stunt jumps and four random events (with `tests/sim/side-content.test.mjs`), the saints
    worker's S2 and S3, and the prologue P0. Their 34 requests (J2-J16, E1-E6, S1-S6, P1-P6 in
    `docs/handoff/m8-a2/motor-requests.md`) were each checked against the code; the real gaps are in MOTOR with tests
    in `tests/sim/mission-motor.test.mjs` and `tests/sim/city-life.test.mjs`, the rest settled there with the reason:
    - **Mission drivers** (J5, J6, E4, S1): a point with no height is the ground's, from up on a deck too (the guess
      from the driver's own height routed Loop Sprint's ground checkpoints along the deck); a route's or a race's point
      off the lanes counts once the driver has stopped as near as the lanes go (it sat at its route's end for good);
      `drive: { siren: true }`; and the crew `m.spawn.vehicle` seats rides in its seats (the bodies stayed where the
      car was made, so shots at it never found them).
    - **Small m** (J7, J8, J9, E5, P3): `m.place(p, { in, seat })` moves a ped over to another seat of its car;
      `m.fire(at, r, fuel, { vigor, spread: false })`; `m.kill(tag, { vehicle })` keeps the vehicle in its hint;
      `m.spawn.ped(..., { aimable: false })` (the lock-on passes a victim over); `m.curb(at, { within })`.
    - **Stunt ramps are terrain** (E1): a landmark may carry decks, and kind `ramp` gets no lanes and nothing piled on
      it: the Container Stack's kicker and the half-built car park make two of the five jumps possible at all.
    - **The bot** (S3, P6, P2): a drive-by only at a target with a clear line (its own car no blocker); one press of
      △ each beat at a prompt (the chapel's SAVE wrote the slot 165 times in one stand); and headless runs keep their
      saves in memory, so the career's SAVE and autosave work as a player's. J10's held vehicle pick was tried and
      dropped: it sent Boom Gangs' rockets at far cars they never reached (seed 3 failed where the nearest-each-step
      pick passes gold).
    - **A gridlock breaker in traffic** (P4): a ring of stopped drivers, each waiting on the next with no room to back
      off (two nose to nose at the Loop's north-east corner held S1 seed 2's bot on the ramp for 570 s; Gnome Row x
      Loop Avenue gridlocked for minutes in the prologue worker's runs), breaks after `TUNE.gridlock` (4 s): the
      one with the lowest id creeps through a moment.
    - **Free roam's offers** (career.js): an activity's start asks only once the car in it is slow (driving past the
      Neon Mile Kwik-Lux opened Loop Sprint's card, which held the AutoPlayer's input and stopped the car among a
      gang war's dead); and a marker the player stands in when free roam begins (the prologue's giver at the chapel)
      asks only after they have left it.
    - **H4 after the stunt ramps**: the ramps change the city enough that a police car the bank's alarm brought was
      parked in the getaway lane on seeds 2 and 3; H4's getaway now moves those to the curb as it already moved the
      morning's wrecks (with the gridlock breaker, all three seeds pass).
    - **Firefighter's calls**: on L3 seed 1's pad run a Rats turf war broke out by the Neon Mile Kwik-Lux; their
      shotgun pellets set the call's car off (it is made at 30% health, smoking), and the blast chained through a
      parked Saint into Engine 9. While a call runs its cars now take no hurt (only its clock sets them off), and
      are cars like any other once it is out.
    - Every merged mission, activity level and event ran again on all of it: 96 of 96 runs on seeds 1-3 (26 ids,
      each activity at every level), 32 of 32 through the pad on seed 1 (Firefighter's L3 after the fix above;
      all twelve of its runs again, both ways), and the bot gym 13 of 13 both ways.
- **Answered:** no. **Landed in:** M8.

## D23 · 2026-10-21 · M9's 10-foot UI: our own layer and our own pause, cards on the kit, settings that reach play
- **Principle:** PLAN.md 8.18's rules (canvas UI primary; the UI layer at an integer scale by HUD size; six items a
  page; ✕/○/L1-R1/△/□/Options; 5% safe area; pad, keyboard and mouse; a sound on each move) and 7.3 (a deterministic,
  replayable simulation); the engine's public API only.
- **Calls:**
  - **The HUD and every menu draw on MOTOR's UI layer** (`#ui` over the game's canvas, `src/motor/ui/layer.js`): its
    scale is the game's S (Standard), S + 1 (Large) or S + 2 (Huge), never so big that 320 x 180 UI pixels no longer
    fit; text only in the 5 x 7 font at scale 1 or more. The HUD's labels had used the engine's 3 x 5 `tiny` font: all
    of them moved to the 5 x 7 one, and the HUD to the safe area (the radar a sixth of the screen's height, the
    ability's name left off where the foot's prompt needs the room, the vehicle's panel at the bottom right, the
    objective and the subtitles between them). Every frame records what it drew (text with its scale, prompts with any
    unresolved glyph token, the focus, each list's rows, panels, tabs) for `tools/ui-audit.mjs`.
  - **Our own pause, read in the step.** The pause button (Options, Esc, P) and the map button (the touchpad, M, Tab)
    are a step's input like any other: the pause screen opens in the step, and while a screen that pauses is open the
    scene's update doesn't run (the engine's timers and particles aside, which no simulation reads: the hash stands
    still, a test says so). The engine pauses by itself only for what it alone sees (the page hidden, the window left,
    a controller unplugged): the play scene's `pausable` is false while its own pause key is down or a screen is open,
    and the UI frame, the one hook that runs while the engine holds, hands its pause to ours (`uiFrame`). The engine's
    PAUSED overlay never shows, and the music ducks under our pause.
  - **The screen stack** draws the top screen alone over the game (a question draws over the screen it asks about);
    ○ goes back one; Options closes down to a sticky screen (the title's menu stays; a card answers it as ○).
  - **The career's cards keep their model** (`career.card`: id, items, act; the bot and `tools/bot-campaign.mjs`
    answer it) and are shown as screens of the kit (`cardScreen`). A purchase's question puts NO first (the safe answer
    under the thumb): the campaign tool picks BUY by its label. JOB DONE's medal and cash are big.
  - **The phone** is CONTACTS (each job's giver, a waypoint on a press, and Lowtown Cabs), TEXTS (a line from each giver
    with a job on offer), JOBS (each vehicle job, and the one the vehicle you sit in can start: also first on the
    phone itself), SNAP (photo mode: M12) and SETTINGS; big rows with an icon, one column, at the bottom right; back
    from an app returns to its row.
  - **Settings:** the engine's store with MOTOR's added (`ui/settings.js`), in five tabs. PLAN's controller
    *sensitivity* is the stick's dead zone (the twin-stick aim is a direction: there is no speed to scale); the button
    symbols are Auto, PlayStation, Xbox, Nintendo or Keyboard; *Sharp MODE 7* gives the game's buffer the screen's own
    resolution while MODE 7 is the view (the stress test's `depthResolution`: `screen.setOptions`), with the overlays'
    pixels drawn at the game's size and the UI layer keeping the game's scale; colourblind markers move the markers'
    hues onto the Okabe-Ito palette (the shapes and the turf's patterns say it as well). **Difficulty** (the damage the
    crew takes: 0.7, 1, 1.35) and **aim assist** (off, low, standard) are simulation inputs the player chooses: a
    session replays with the settings it was played with, and the bot and the tests always play the defaults.
    ACCESS: sprint and aim toggled latch on a press; crouch is a toggle by default (as it was) and can be held; the
    wheels toggled open on a press and pick on the next.
  - **Rebinding** is per context (on foot, in a vehicle, photo mode), paged by group (MOVING, DOING, FIGHTING, CAMERA
    AND MENUS), the device in use's buttons: ✕ waits for the next press (Options or Esc cancels), a button another
    action of the context holds is refused and said; the menus' keys, chords, held modifiers and release taps stay
    fixed. The capture ignores its first step: the engine's raw presses arrive a step after the bindings see them, and
    the ✕ that began it had bound itself.
  - **Keys PLAN left open:** △ (more) is R and □ (filter) is F on the keyboard; a right click goes back with the mouse;
    the map zooms on L2/R2, - and = and the wheel.
  - **The map** is the radar's own picture of the district, panned, zoomed, filtered by kind, with a legend and a
    waypoint; in a vehicle the radar draws the GPS line to the waypoint, or to the running job's marker.
  - **Onboarding:** a hint the first time each verb becomes possible (`ui/onboarding.js`, the verbs in
    `src/game/ui/tips.js`), once ever (kept in the settings as `tipsSeen`), never for the bot.
- **Why:** the engine's HTML menus are not TV-scaled (PLAN 8.18, rule 1); a pause handled in a draw would leave a
  headless replay stuck paused; the cards' model is what the bot plays.
- **Answered:** no. **Landed in:** M9.

## D24 · 2026-10-21 · M10's sound: MOTOR's own sequencer on the engine's buses, radio timelines on the play clock
- **Principle:** PLAN.md 8.17 (the engine's `music()` not reused for the radio; its note syntax kept; everything through
  the engine's buses); 7.3 (sound is presentation: no simulation reads it); section 12 (patch only to reach private
  state).
- **Calls:**
  - **GTM-PATCH 5:** `audio.bus('sfx' | 'music' | 'master')`, the gain nodes the engine's own sounds and music play
    through, so MOTOR's voices follow the master volume, the effects and music levels, mute and the ducking.
  - **The sequencer** (`audio/sequencer.js`) schedules ahead on any context (the realtime one in play, an offline one
    in the tests), many sequences at once, each on its own timeline (a song started at t0 is heard (now - t0) in), with
    its own seeded noise and a voice cap that drops notes rather than grow the graph.
  - **The composer** (`audio/composer.js`) makes songs in the engine's note syntax from a genre's template and a seed:
    synth-punk (CRASH FM), boom-bap chip beats (WHEELZ), synthwave (NEON DRIVE), a talk bed (LOWDOWN TALK), and two
    score cues (chase, tension). The same seed makes the same song.
  - **The radio** (`audio/radio.js`): each station a timeline (song, the DJ's line, song, an ad, ... the jingle;
    LOWDOWN TALK's six call-ins and three ads over its bed), built from its spec and the game's seed. Its clock is the
    save's play time, so tuning in finds a station where it has got to, and a loaded game picks the radio up where it
    was. The DJs', the ads' and the callers' words show as subtitles with the speaker's name (Settings, Audio: DJ
    chatter); the radio has its own volume, under the music level.
  - **A job's score:** `m.music('chase' | 'tension' | null)`; the radio ducks to 35% under it, and the job's end lets
    it go. Cued in R1's stakeout, R2's sneak, G2's evade, H4's sewer and its deck chase.
  - **AudioX** (`audio/audiox.js`): the four nearest engines (the player's own first; the pitch from the speed, a
    squeal by the tyres' slip), up to three sirens (two-tone for the police, a wail for the rest) with a Doppler shift,
    rain and wind by the weather, the crowd's murmur by the people near and the city's hum; panned and falling off with
    distance, on the effects bus.
  - **The SFX map** (`audio/sfxmap.js`): the BUS's events (explosions, crashes, hits, pickups, cash, stunts, a respray,
    a job passed or failed, WRECKED, NABBED, a star gained, a save) heard near the listener and quieter farther off;
    doors and takedowns the player's own only; footsteps by the surface; horns held, by class; each gang's payphone
    ringing near a job on offer. The guns and swings stay combat's; the menus' sounds, the screens'.
  - **The title's tune** is the engine's `music()` (the one thing PLAN leaves it), a composed synthwave loop.
  - **Headless there is no sound** (the director never starts), and nothing in the simulation reads any of it.
- **Answered:** no. **Landed in:** M10.

## D25 · 2026-10-21 · M11's show: reels the bot plays, a director with a watchdog, the play scene as its stage, taps that stay
- **Principle:** PLAN.md 8.20 (into and out of the attract mode, the AutoPlayer, the director, kiosk and mobile, its
  Accept), 9.11 (the five reels) and M11; D21 (the bot plays any objective from its hint); the simulation deterministic
  and the views presentation only.
- **Calls:**
  - **Reels are content staged as missions** (`defReel`, `src/game/reels/`): the MissionRuntime plays one as kind
    `reel` (it pays nothing, is never recorded, and says each stage as an `attractBeat`), the mission bot plays it from
    its hints, and each stage names its view (the camera plan) and a caption. "The AutoPlayer's full behaviours" are the
    mission bot's (which drives through the AutoPlayer): drive, carjack, shoot and throw, take down, evade, follow hints.
  - **The play scene is the demo's stage** (`PLAY.make(app, demo)`): each reel in a fresh world (`RNG.seed(attract seed
    + the reels so far)`, its own state objects, the city's layout the game's own), a blank save never written, and the
    career's demo mode: no offers, random events, hold-ups or cards, never a write. No pause, no phone; the views are
    the director's; the HUD's place-and-time line gives way to the logo's bug and DEMO badge; a job's objective, timer and
    checkpoints are not shown (the captions say what is happening). The rumble is off; the streams are handed back as
    a boot leaves them (`RNG.seed(app.seed)`) when the demo ends, so it never shapes a game.
  - **MOTOR's Director** (`ai/director.js`): the reels in an order its seed shuffles each time round (never the same
    one twice running), a card after two reels, then after three (the title card, HOW TO PLAY with a DualSense drawn
    and every button's job read from the bindings, LOWTOWN'S MOST WANTED from the save slots and the city's legends),
    and the watchdog: a cut when the camera's focus has not moved and no op has begun for TUNE.attractStall (6 s), a
    reel past its time, or one failed. It counts what the show has shown for the soak (reels run, ended and cut; the
    views; the bank; the most stars; explosions; switches made by the switch camera, not a mission's possess).
  - **Any input leaves within one step:** MOTOR's `wokeBy` reads GTM-PATCH(4)'s raw state (a key bound or not, a pad's
    button, stick or trigger, a pad newly connected, the mouse, a touch); the pads are counted at the demo's first step
    (the engine fills them in its tick, so a pad there at boot is no new connection).
  - **The kiosk** (`?kiosk=1`, or a coarse pointer and no fine one): a tap stays in the demo; the MENU button (top right,
    in the margin over the HUD) opens sound, volume, the view (the show's, or one throughout) and About; a tap anywhere
    else says BEST WITH A CONTROLLER at most every 30 s; a key or a controller opens the title. A finger's tap is a
    click on the UI layer, so every M9 menu answers taps. `createApp` turns the engine's touch stick off everywhere.
  - **The title's menus count as the title** for the idle timer, except while a rebind waits for its button (it gives
    up after 8 s of its own).
  - **Where the bot needed a hand, the reels say so in their scripting:** Hot Pursuit's three stars run down Motor
    Avenue ahead of the roadblock 3★ brings, then cut to Spray & Pray's apron, because the shop's door is out of a car's
    reach from Canal Street (the bot's evade could never respray there: carried to M13 as a map fix); Joyride climbs
    the north-west ramp because the Loop's west leg runs south; Turf War's Gus leads with his Molotov (a fighter with
    no gun now throws first), backs off the fire and fights alone (his spray found his own ally); Heist Tease starts
    Viv at the counter's gate as the lobby guard's round comes by; Switch! plays the vignettes (`m.switchTo(id, {
    vignette: true })`).
  - **Small MOTOR pieces for it:** `m.slowmo(k)` (a job's slow motion, undone at its end), `m.weather` held till the
    job ends (`Weather.set`/`release`: the m API's call had nothing to call), the `drive` hint (full throttle on a
    heading), a `switch` event's `camera`.
  - **The soak** (`tools/attract-soak.mjs`): 30 virtual minutes on seeds 1-3 headless and 5 drawn in Chromium, judged
    as PLAN.md 8.20 asks (errors, counts, heap, every reel, the views, the bank, three stars, an explosion, a switch);
    `tools/record-attract.mjs` captures the show to MP4 and GIF with ffmpeg.
- **Answered:** no. **Landed in:** M11.

## D26 · 2026-10-22 · M12's tools: a photo is the Snap's, the Proving Ground as districts, a recipe a test, District 2 behind the bridge
- **Principle:** PLAN.md 8.22 (photo mode), 8.23 (the Proving Ground, its zones and their self-tests; the dev tools),
  M12 (the handoff docs: a recipe per content type, each followed to the letter by a test; District 2 as content);
  section 4's "content is added, not architecture".
- **Calls:**
  - **A photo is the Snap's event** (`play/photo.js`): Create (or the phone's SNAP) freezes the simulation and hands the
    camera to a free rig tethered to the player (TUNE.photoReach), its three views and zoom; ✕ emits the same `photo`
    BUS event the Snap does (its subjects: what lies within TUNE.photoFrame of the picture's middle), so `m.photo`
    completes either way, and a browser also saves the drawn frame as a PNG. The legend is on the UI layer, never in
    the picture.
  - **The dev tools are MOTOR's screens** (`ui/dev.js`, `debug/overlays.js`, `?dev=1`, the backquote key): the tuning
    pages are every knob by its section, live; the overlays draw what the simulation thinks in any view through the
    stage's projector and change nothing; GO starts any mission at any stage, any activity at a level, any zone, and
    District 2.
  - **The Proving Ground is districts** (`src/game/districts/proving/`): the town (64 x 64: three avenues each way, nine
    signalled junctions, the three doors the play scene needs, its four corners as points of interest so the bot's
    evade has somewhere to run) for the zones that need a city's simulation, and the handling ground (96 x 64: the
    slalom and its kicker, the skidpad, six surface strips, the boat basin). Each zone is a `provingZones` entry; most
    are `labZone`s over the play scene in one of them, its knobs held where the zone wants them. A lab district's
    career offers nothing (the prologue's giver stands at any safehouse).
  - **New surfaces** for the strips: wet, oil and ice (SURFACE_GRIP), painted and gripped like the others.
  - **The mission bench is a kind of its own** (`defBench`: a reel's terms, never paid or recorded): one tiny job per
    objective, each starting at the safehouse door and taking its car away when it passes, in a town held to 14 cars.
    `m.collect`'s hint now moves to the nearest piece still about.
  - **The 10-foot audit is MOTOR's** (`ui/record.js` auditRecord): the UI zone opens every screen in every glyph set in
    Chromium and audits each drawn frame by the same rules as `tools/ui-audit.mjs`.
  - **The stress pad** asks for the knobs' tops (200 cars, a crowd of 300); the town's lanes hold about fifty cars,
    so its self-test wants 40 and the crowd 240 (Lowtown's own budgets are the perf suite's).
  - **A recipe is a fixture and a test** (`tests/recipes/<type>.test.mjs`, `.mjs` as every test here): the fixture is the
    one file the recipe describes, bundled in as if it were at the path the recipe names (`loadGame({ extra })`,
    `bundle({ extra })`: its imports resolved from there, nothing else edited), and the test proves it end to end in
    play (the fleet drives the new car, the bot passes the new mission and job, Threads sells the new outfit, the new
    district loads...). Fifteen types; they run in `npm test` (about a minute).
  - **Songs are content** (`def('songs')`: PLAN.md 8.17's note syntax, by hand): a station plays its composer's songs,
    then the ones written for it. **Outfits stay data on the characters** (a look pushed onto each protagonist's
    `outfits`, the same index for all three, and a shop item naming it): no `outfits` registry. **A prop may be
    painted** (`paint`: a barricade's barrels), and **a district may hang a sign on a wall** (`signs`: Lowtown's
    "BRIDGE CLOSED: GNOMES ON STRIKE" at Loop Avenue's west end, PLAN.md 9.1's hook for District 2, missing until now).
    Both are drawn only: the simulation is the same.
  - **District 2 is the block behind the closed bridge** (`src/game/districts/district2/`, 48 x 40): Loop Avenue carries
    on west from the bridge the Gnomes have barricaded, a block of the Brickyard's warehouses between four streets, the
    three doors; loaded only with `?dev=1` (`&district=district2`, or GO), free roam alone.
- **Answered:** no. **Landed in:** M12.

## D27 · 2026-10-22 · M8's last: a bot with manners, a gang's own job in peace, a campaign that travels as a player does
- **Principle:** PLAN.md 15.4 (a headless bot campaign reaches 100%), M8's Accept (every mission through the bot and by a
  scripted human-style pass), D21 (the bot plays from the hints, as a player would).
- **Calls (part 4c):**
  - **The AutoPlayer looks before its unstick moves** (`_footIn`): it never backs into someone behind it or swings into
    someone ahead (a cop by a cruiser parked at its scene stands in the lane beside it); held, it waits a while (6 s)
    and then plans afresh.
  - **At a star or more, stopped, with a cop on foot near its door, it pulls away at once** (`_copAt`): round whatever
    holds it, away from the cop (backing first only when the cop is ahead), as a player floors it before the hand is on
    the door (NABBED is a cop at the door of a car going under 4 for 1.5 s).
  - **Wedged** (`_wedged`): 5 s with nothing to wait for (no light, no queue, nobody within 30 ahead) and no more than a
    rock back and forth (10 u), at street level: off the road round it, as the progress check's second try does, but
    without its 30 s wait (the brain's own back-off needs room behind, and a long truck in a corner has none: H4's
    Hookline through the pad sat 50 s like that).
  - **A delivery that must arrive whole is driven with care** (`deliver`'s hint carries `health`): the evade style
    'careful', and the bot's fighter holds its fire while a bystander stands in its line (`careful`).
  - **A car nobody drives gives when shoved** (`shoved`: its handbrake off, its tyres' grip at 3%, the low-speed
    kinematic clamp off while it slides): the gridlock breaker's shove now moves a car parked broadside. **Never a
    job's car** (`owner: 'mission'`): H4's roadblock cruiser, shoved off its lane by the queue behind it, put the
    Hookline's hook-up point off the Loop's deck.
  - **A gang's own job comes with its truce** (`MissionRuntime.start`, a mission's `gang`): the gang whose job it is
    leaves the player be while it runs, however they stand (the campaign reaches the Saints' S1 after the Rats' and the
    Gnomes' chains have turned them hostile), lifted when it ends like any truce. A player working for a gang isn't
    shot at by it.
  - **`m.standDown(kind)`:** a job that is the city's service holds the city's own off (Firefighter: the player is the
    engine on call, and the city's own Pumper, sent to the same fires, jammed the street with the player's).
  - **The campaign travels as a player does** (`tools/bot-campaign.mjs`): a mission that runs past its cap is quit (it
    had run on into the next item); a race's start is driven to after a teleport there, in a car parked near it, else
    one waiting at a red light there (jacked), else one parked anywhere; a job's first-named vehicle comes before the
    rest (Vigilante's cruiser, not the SWAT truck); a stunt's run-up is lined up at a crawl, backed to its start and
    stopped there before the run (a car still turning as it floors it misses a three-cell kicker); a car the player
    can't reach (one parked up on the Loop, walked to from the street under it) is passed over for the next; and each
    failure says what hurt the player and their vehicle, by source.
- **Calls (part 4d),** from the next campaign:
  - **A truce holds for the ones already coming:** a hostile gang's car that sees the player drives on in a truce (its
    driver no longer gets out to fight), and a member already going for the player stands down when one starts. Before,
    the truce only stopped new fights, so S1's Saints, hostile by then, kept coming at the player doing their own job.
  - **The Moto Courier rides in a truce with all three gangs** (as the other jobs do with theirs): a parcel van's rider
    is nobody's business, and a level-3 route across hostile turf was a gunfight on a bike.
  - **The races start on their grid** (`m.clearTraffic(at, r)`: the city's traffic within r of a point taken off the
    road at once, never a unit on a call): the marshals clear the grid's stretch, the leader waits at its front, and the
    race's setup puts the player's car in its slot. The old way in (drive up into the empty slot) jammed: a racer parked
    in a live lane stopped the traffic behind it, and nobody, player or bot, could get by it into the slot.
  - **The AutoPlayer routes from where it is, whichever way it faces:** no route along the lane it faces (a one-way
    leading off it) is tried after a U-turn, then from the nearest lane either way. A car left with no route wandered
    the lanes: a short trip went round the city. A car it gives up on stays given up on while the trip lasts
    (`board()` had forgotten them: the mission bot, given up on one it could not reach, had come back to it after the
    next, round and round).
  - **Crossfire spares the player** (the `Fighter`'s `spare`): a gang's member whose gang isn't after the player (not
    hostile to them, or in a truce) holds its fire while the player or their car is anywhere its shots could go (by its
    line of fire, as wide as its gun's spread makes it and on past its target; a moving car where it will be in a
    moment), throws nothing that would land near them, and shoots at no car beside them (a car shot at may blow up).
    S1's cars had been shot to wrecks driving past fights that weren't the player's: a turf war between the Rats and
    the Saints, and a Saint fighting a friendly Gnome by the player's car. A hostile gang's crossfire still flies.
  - **A door the stage needs is kept clear** (`m.clearSpot(at, r)`: a car left standing on a spot, nobody in it and not
    the job's own, towed at once): H4's lobby and H2's front door clear the bank's door step as the stage starts and
    once a second while the player walks up. The campaign's H4 had stood 40 minutes at the bank: a car left on the door
    step kept Viv out of the door's reach, as it would have kept a player out.
  - **S2's fight can always end:** the last Rats are called off once 45 s have gone by with none of them within the
    booth window's reach (the convoy jammed, no lane behind it clear for the next Brute: the fight could never end, for a
    player too).
  - **The police nab on the player's level:** the arrest at a stopped car's door took a cop at the door's x and y,
    whatever the height, so a cop on the street under the Loop arrested a player stopped on the ramp above (S1's first
    bust in the validation); both arrests (at the door, and cuffed on foot) now want the cop within 12 of the player's
    level.
  - **Wanted, the bot waits for no cop:** the AutoPlayer's unstick moves (back off, swing out, off the road) never wait
    for a cop on foot in their way while the player is wanted, and with one within 45 of the car they wait for nobody:
    they had held the car still for a bystander, or for the cop himself, while the cop walked up to the door.
  - **A jam left behind is forgotten:** the AutoPlayer's stall count (three stalls and it gets out, at street level)
    starts again once the last stall is 300 behind. Drag Mass's race car had been left the moment it came down the
    ramp, the stalls up on the deck counted against it.
  - **A car it can't get into is given up on by the clock:** the mission bot's 12 s for getting into the car it picked
    count the scene's walks to a door it can't reach (they had stopped the count: the campaign's bot stood 8 minutes by
    a parked Brute's door).
  - **An empty car before a carjack:** the AutoPlayer and the mission bot take an empty, parked car before one with
    someone in it, unless that one is 60 nearer: a carjack is a crime the witnesses phone in, and S1's trips had gone on
    with a star.
  - **The campaign's tool:** a long mission's state every 5 minutes in its log; a teleport takes the player out of a car
    first (campaign4 had sat an hour at one spot, every teleport after failing); an activity's start is driven to in the
    car the roads bring there quickest; items started on the way to another are quit. **A rescue:** a car two minutes
    within 40 u at the bot's wheel is put back on the nearest lane that leads on, facing its way, and the bot's route
    made afresh: a hauler in the north edge's dead-end stub, or wedged among the Loop's pillars at its south-west
    corner, which a player backs out of and the bot's driving can't. Each rescue is logged and counted in the result.
    The per-mission runs (`tools/bot.mjs`) have no rescue: each mission passes there on its own.
  - **The bot retries as a player does:** a failed stage is played again up to 4 times (`TUNE.botRetries`, 2 before),
    and a run in `tools/bot.mjs` has 1,800 s of game (900 before). The bot is a weaker driver than a player in a tight
    spot, and it doesn't defend itself on foot: a few runs failed three times in a row on what a later try gets past.
    S1 on seed 2 spent its 900 s on one long attempt (two Rats its driving had provoked beat it on foot by the Fish
    Market) and passes on its fifth; Firefighter's level 2 on seed 1 lost three quick calls in one jam of its own making
    (its Pumper had shoved a parked car into the street to the fire) and passes on its fourth. The retries are in each
    run's line of the log, so a mission that needs them is seen; a run that passes within two plays the same as before
    (the runs are deterministic, and the retries come only after a failure).
- **CI: the push is refused.** Since the run resumed on 2026-10-21, every push to the branch is refused with a 403 (the
  Claude GitHub App has no access to the repository for the owner's organization). PLAN.md 6.1's fallback, taken: the
  gate is `npm test` and `npm run test:full` run here, their evidence in PROGRESS.md; the commits wait locally, and the
  owner is told how to restore the access (install the app for the organization, or reconnect GitHub in claude.ai's
  settings), after which one push carries them all.
- **Answered:** no. **Landed in:** M8 (parts 4c and 4d).

## D28 · 2026-10-22 · M13: the controller's rumble, the knob list as a doc, where a frame goes, the look notes, the perf pass
- **Principle:** PLAN.md 13's M13 (polish, performance, FAN-OUT B, the writing, the release) and 15 (the Definition of
  Done); 8.1 (the rumble profiles), 7.4 (TUNE: every knob listed), 7.11 (budgets come from measurement), D10 and D20.
- **Calls:**
  - **The rumble profiles were never wired** (8.1 lists them; nothing played them): `input/rumble.js` plays them
    through the engine's `input.rumble`, scaled by the Vibration setting: a crash by how hard, the player's own shots
    by the weapon (each weapon's `rumble`), a blow the player lands, a blast by its nearness and size, a heartbeat
    under a quarter of the health, a landing by how hard. Only the player's; never headless; never in the attract mode
    (a demo would buzz a pad left on the table). The engine's own `hitFx` rumble is off: it can't tell the demo.
  - **`docs/TUNING.md` is the knob list, generated** (`tools/tuning-doc.mjs`), and `npm test` fails when it is stale
    (the step "tuning current"), as "dist current" does for the build.
  - **Draw-side profiling** (`?prof=1`): each section of a depth view's frame, and each kind of item (faces, bodies,
    cars, deck cells, glows...), timed with its raster paid where it is drawn. Only with the flag: a clock read an
    item costs.
  - **The look notes:** the title's tagline and the attract mode's captions on bands (the signs behind them ran into
    the words); WRECKED and NABBED on a band of their own (a world label showed through the big word); the
    streetlamps' light, halo and wet-street streak in sodium orange (PLAN.md 10: they had read a pale cream against the
    neon).
  - **Spray & Pray's bay** (D20's carried map fix): the respray happens within 44 of a bay out at the curb in front of
    the door (six tenths of the way from the door to the nearest lane), not of the door itself. The door stands back
    across the sidewalk between two lamp posts, and turning in off Canal Street a car's turning circle swung it into the
    posts short of the door's reach: the bot's evade could never respray there, and a player had to shuffle in. The bot
    is sent to the bay (`world.sprayBay()`); the Hot Pursuit reel's apron is within reach of it.
  - **The gate is read as D20 says, by the tool:** `tools/perf.mjs --gate` measures M2's own build (its
    dist/index.html at `0c3d575`, from git) in turn with the build in each round, the pair's order swapped each round,
    and puts each view on the gate's machine as its median over M2's times M2's figure there (ISO 9.65, TOP-DOWN 8.4,
    MODE 7 15.2); the update is read a step (each frame's update over its steps, the same factor) against D10's 1.5 ms.
    test:full runs it.
  - **Where the depth views' frame went** (switches in a scratch build, each part left out in turn, interleaved; a CPU
    profile): MODE 7's textured faces are paid by the pixel (an affine pattern fill is about ten times a flat fill a
    pixel in the GPU-less Chromium of the gate, acceleration flags or not; a plain scaled blit about a fifth of a
    pattern), the walls beside the lens ran far off the screen, and nothing hid what the nearer walls hide. So, each
    exact or within a pixel: a textured quad cut to the screen before its fill; a front face (an upright rectangle on
    screen under MODE 7's level camera) as scaled blits; MODE 7's floor as one raster (D20's lever); **occlusion in
    MODE 7** (a face wholly nearer than a thing hides it over the face's columns from its top down, the camera being
    level and every wall standing on the floor: faces, bodies, deck cells, cars, lamps and props left out when hidden);
    a moving car kept as an image in MODE 7 while small on screen and its bearing holds (2 degrees); the lamps' warmth
    added over the pools' box only. In ISO: one kept image shared by the props of a model and facing and by the deck
    cells of a variant (the projection is the same everywhere there); the walls prebaked a third of a second ahead of
    the camera, not in a ring round the screen. In every view: the kit's text kept as images. D20's other levers (deck
    cells merged into runs, far bodies as simple shapes, ISO's roofs merged, the sky band kept) were not needed: the
    sky band costs half a millisecond, and the rest change the look.
  - **The floor chunks' cap holds in every view:** only ISO's draw moved the chunks' frame on, so TOP-DOWN and MODE 7
    never evicted a chunk (68-70 kept against the cap of 48 on the tour; the map's own size the only bound).
  - **Not taken:** the engine's present (a full-screen clear before the upscale) and its wall bakes and light field are
    the engine's (PLAN.md 12: patch only where an extension can't reach); the crowd's rigs redrawn less often (a
    choppier walk) and the depth views' light at nearest-neighbour scaling (blocky pools) change the look.
- **Answered:** no. **Landed in:** M13 (parts 1 to 3).

## D29 · 2026-10-22 · M13's FAN-OUT B: forty-seven findings, each a test; performance out of the Definition of Done; bots that may not die
- **Principle:** PLAN.md 13's M13 ("FAN-OUT B: eight adversarial reviewers ... return findings as failing tests; the main
  agent fixes them and re-runs test:full") and 15 (the Definition of Done); the owner's two directions of 2026-10-22.
- **The owner's calls:**
  - **Performance is no longer part of the Definition of Done.** The owner: assume the hardware is unlimited; detail,
    enemies, effects, lights and shadows may be as rich as a scene needs; FPS targets, optimization and performance
    configuration come at a later time. So PLAN.md 15's item 8 keeps "Determinism and replay: both pass" and drops
    "Performance: the medians are within the logged budgets"; D10's and D20's budgets gate no milestone (nor PLAN.md
    7.11's, nor a milestone's perf acceptance); the "perf gates" step leaves test:full. `tools/perf.mjs` (and its `--gate`, read against M2's build as D28 says) stays for that
    later work, and M13's levers (D28) stay in. What FAN-OUT B found that grows without bound (canvases, chunks) is
    fixed all the same: memory that only grows is a bug, not a budget.
  - **The bots may play invulnerable** (the owner left it to the run): `?god=1` (the tools' `--god`): each step the
    crew take no harm (`Ped.god`), nor the vehicles they sit in (`Damage.immune`: no hit, no flip fire, no explosion),
    and the gun in hand is full. The campaign plays god by default (`--mortal` to play without): it proves the way to
    100% (the progression, the economy, completion), and a long session's chance deaths had cost it hours. Each
    mission's beatability stays the mission bot's to prove, mortal, on seeds 1-3 and through a pad (tools/bot.mjs
    without `--god`).
- **The calls FAN-OUT B's fixes make** (eight reviewers, one an area; 47 findings, each a test under `tests/review/`
  that failed until its fix, now a step of `npm test`):
  - **Vehicles:** OVERDRIVE works at the wheel (driving fast and near misses fill it, the Ability button switches it,
    the driver's handling reaches the car: `ctl.handle`); a bail-out dives out of its own door, outward, and stops
    short of a wall or the deck's edge; getting in and out, the tow hook and the water cannon keep to their level (12
    u); a carjack cut short lets its victim go; a car bomb is fitted 'ignition' or 'remote' (DETONATE on the phone); a
    parked car on the drawbridge holds it down.
  - **Traffic and peds:** the drawbridge closes its gates to traffic and the crowd before it lifts, and rises only
    when the span is clear; a driver stops short of a raised span and reroutes; **a ped held at a curb by a car standing
    still goes another way after a moment (1.5 s), not 20 s**, and a driver passes a still ped off the road a body's
    width away (the curb stand-off: each had waited for the other); a car nobody drives in a junction's exit is gone
    round, not waited for; a unit's crew left on foot when it is lost join the crowd; a stolen unit is lost to its call.
  - **Wanted and gangs:** **a crash between two cars dents both**, blamed on the other's driver (`vehicleDamage`'s
    `by`), so ramming a gang's car costs D19's -2; who went down mid-switch is the one revived; the Eye flies off when
    its chase ends; a burning death is the fire-starter's (`fire.src`, `burnBy`); a kill in a vehicle carries the
    victim's gang and faction; `fought` ends with the stand-down.
  - **Missions:** **a job or an activity never starts while wanted** (NOT WHILE WANTED on its card and the phone, as a
    switch and a cab already were, GTA V's rule: the stages' clean slates had been a free way out of four stars); a
    giver standing on a door asks once a visit (a visit ends twice its reach away) and the door answers again (the
    chapel's SAVE, the diner's SHOP); a random event goes on under a card (a card only holds off the next); H4's lobby
    is cleared only by its guards going down; a job's car crews are entries of their own (released wherever they end
    up), and a protagonist riding in a job's car gets out at a door when it goes; a load puts the outfit back on.
  - **Saves:** each write is stamped afresh and numbered (`seq`), and CONTINUE takes the newest; a load restores the
    stats, the outfit, the ability meter, the weapons exactly as saved (a confiscated gun stays gone) and the weather;
    a damaged slot is passed by and said ("SLOT 1 IS DAMAGED"), and a load that won't read starts a new game and says
    so; a schema "1" reads as 1; MIGRATIONS[0] keeps what a save already has; the Proving Ground and the demo never
    write (the store locked); a stage may be `passOnSave` (the prologue's last: the save it asks for holds it done and
    paid); **every world starts from its seed with its actors' ids from 1** (`RNG.seed`, `resetActorIds`, in each
    PLAY.enter and the attract mode's exit): a game after the demo, or a second new game, is a boot's.
  - **The 10-foot UI:** a trigger's travel is its value (a browser's "pressed" from an eighth of the way is not a full
    press); **the press that closes a screen is spent** (`Bindings.spendHeld`: no roll, jump or drive-by from ○
    RESUME); the mouse aims while the engine says it does (`aimSource`), a key between; REBIND refuses a button held as
    part of another action's chord, modifier or release tap, and P; SCREEN FLASHES and REDUCE MOTION reach MOTOR's own
    lightning and the photo shutter (`flashScale`); at HUD Large and Huge a list pages fewer rows, a long legend takes
    two lines, and the phone pages four rows; EXTRAS opens the Proving Ground's menu of PLAN.md 8.23's eight zones,
    and over a zone Options, Esc, P or a browser back opens it with RESUME and BACK TO TITLE. The UI audit runs at HUD
    Huge by pad too (test:full).
  - **The attract mode:** an input in the title's fade into the demo leaves it; a reel's slow motion is undone before
    the fade out; the pointer's pending tap, wheel and held button are drained when the demo leaves and when any
    screen opens; the kiosk's About goes back by a tap, and an unattended kiosk menu closes after 45 s; the kiosk's VIEW
    holds through the reels' own `m.view`; Hot Pursuit runs with no roadblock (`m.wanted.blocks(false)`: the traffic
    queued behind one had held its chase till the watchdog cut it, 24 of 30 seeds in the shipped city); the soak plays
    the shipped page (seed 0) besides seeds 1-3.
  - **Memory:** the lamp halos, their wet streaks and the pickup tokens are bounded caches of quantised sizes (a bigger
    one drawn from the largest image); a glow wholly off the buffer is not drawn; a crowd body's kept image grows in
    16-pixel steps, and one taller than 160 pixels on screen is drawn directly; the floor chunks are trimmed to their
    cap every frame; floor marks and wakes are cut to the buffer before their pixels are stepped.
- **Answered:** the owner's two directions (2026-10-22). **Landed in:** M13 (part 4).

## D30 · 2026-10-22 · M13's part 5: the bot after FAN-OUT B, the campaign's stalls, the look pass on the matrix
- **Principle:** D21's rule (a MOTOR, bot or map change re-runs every merged mission and activity, both ways, and the bot
  gym); PLAN.md 15.4 (the campaign to 100%) as D29 has it played (god); PLAN.md 10's matrix, a verdict a row, every
  look note fixed. A stall the campaign finds is fixed where it lives (MOTOR, the content, or the campaign's tool), with
  a test.
- **Calls:**
  - **The pull-away is from a cop coming for the door** (the AutoPlayer: close, or closing on the car), not from any
    cop within 80: one holding off at range and shooting had it backing and swinging out round and round (H4 seed 3
    failed at the ram; in god mode Bingo Night stood still at three stars, for ever).
  - **The Eye is lost under a deck.** It sees all round from above (police.js), so no drive away loses three stars
    and a respray is never reached unseen: the mission bot's evade, with the Eye up, drives under the L or the Loop
    and holds there while the stars flash out; seen there, on to another stretch away from the police. The free-roam
    evade (the campaign's between jobs) now retargets as the mission evade does.
  - **The player's fighter goes round a car that blocks its shot** once 3 s of steps aside clear nothing (the gym's
    kill: two Rats behind a parked truck). Only the careful fighter, the mission bot's: the gangs' and the police's keep
    their steps.
  - **A wedged far car is put back on its path.** A car off its line can't go over to the far LOD (snap), so one
    wedged out of the full simulation stayed wedged: a long truck turned across Dock Road at the Loop's foot held a
    queue a thousand units long, and H1's bike ride with it, for good. After 8 s barely moving it is put down at the
    first place ahead on its path with room (WEDGED, `DriverBrain.unwedge`).
  - **A point to be reached in a vehicle is driven to in it, never out of it** (`m.reach`'s `inVehicle` reaches the bot's
    hint: the AutoPlayer holds the car through a jam, as it does a job's own): H4's getaway failed on "Dex left the
    getaway car" when a jam made the bot give the car up.
  - **A car given up on stays given up on for a minute** whatever goals follow (`AutoPlayer.shuns`): each new goal had
    cleared the list, and S1's bot walked at one Zephyr out of reach by Club Chrome for 40 minutes.
  - **A trip's counts are the trip's.** The AutoPlayer's boxed-in count, its unstick moves, the clock of its walk to a
    door and its hops on foot ran on from trip to trip, and two AutoPlayers live for hours in the campaign (its own,
    and the career's mission bot's): once three boxes were behind it anywhere it got out of the car at the next, once
    20 s of walks to doors were it gave a car up at a glance, and after its first hop it never walked straight again,
    each walk begun from a farther node. A new goal starts them at nothing (the walk's clock is a car's, the hops a
    place's). The per-mission runs start each mission with a new game, which is why only the campaign met it.
  - **A vehicle to board off the bot's level is far,** and the drive near it goes to its level: S1's bot, driving the
    Loop over Gutterball Lanes, counted the Gnomes' Brute below as near, got out on the deck and walked it for good.
    And the AutoPlayer gets out of a car boxed in a fourth time at street level only, as a stall's: out on a deck, a
    walk has no way down.
  - **A car past its goal on its way's last lane stops there** (`DriverBrain`): a Medic braking for its stop behind a
    car had run past it, read the goal behind it as the next time round, and with nowhere on stood at its lane's end
    for good, its speed running on in place; the queue behind never queued, and test:full's city soak failed on it (a
    stall of 25.7 s with no cause). It came in with FAN-OUT B's part 4, whose timings first ran a unit past its stop.
  - **A traffic car despawned takes its crew with it.** A police unit goes back to the traffic with its crew aboard as
    combat bodies; despawned out of sight, it left them standing there as bodies nobody moved. One, knocked along
    Dock Road by the cars, came to rest on the drawbridge, whose lift waits for its span to clear: it never lifted
    again, and the campaign's two stunts over it failed hours later.
  - **A car the player gets out of is towed once out of sight,** as the traffic's own abandoned cars already were: 10 s
    beyond the spawn ring's inner edge, nobody in it, not burning, never a job's. One parked when the world was made
    (the curbs', a landmark's own, which keep their spot as `home`) goes back to its spot instead, when that is clear
    and out of sight too: the fire station's Pumper is there again for the next call. Nothing had taken them: the
    campaign's bot left the Pumper across the road the courier's first drop ran down, and the bike sat behind it,
    retry after retry. A player who leaves cars in the road blocks it the same way.
  - **Content:** a retry of H1's garage stage puts Dex beside Lefty (it had put him the far side of where the Loop's
    ramp meets the sidewalk, with no way round on foot). The gang shoot-out's tip is for a hand in it: the crew putting
    the rivals down with no rival hit by the player (a gun's, a fist's or their car's) ends it quietly, as the crew
    wiped out does. test:full's gang sim found it: an idle player's respect moved when the random event came up beside
    them and the crew won on its own.
  - **The campaign's tool:** a stunt's line-up stops against the way the car rolls (holding the brake while it backed
    drove it back faster, into the canal behind the Canal's run-up); a failed jump says why. A race's start card asks a
    stopped car, so the campaign holds it still a moment there (Harbor Hustle had "not started" 10 u from its start).
    A car it could not board is passed over for ten minutes, not for good (the only Pumper). A job that starts on the
    way while it is about a token, a stunt or a property is quit at once, as on the way to another job: whatever
    runs, the career's bot has the controls. The stars a job's car brought (a police car broken into for Vigilante,
    a cop watching) are lost in it before the phone, which offers no job while wanted. A stunt's run starts at its
    run-up's start, reached by the dev teleport as the campaign travels between items (PLAN.md 8.20): the car with
    the player in it put down there facing the takeoff; the line-up, the run-up and the jump are driven. Driven
    there hours into a campaign, it had met the city's jams (a junction's exit held on the way up to the Loop Gap's
    stub had it out of car after car; by the canal it stood 30 u short with no room to turn).
  - **The 10-foot UI at HUD Huge** (320 x 180 UI pixels; test:full's audit at that size by pad, which had not run to
    its end since FAN-OUT B added it): the pause map's legend, shown, ran 2 px under the safe area in its one column,
    and so did the STATS tab's second row of cards. The map lays its legend out in two columns (or more) when it is
    too short for one, clear of the district's name; a card grid pages fewer rows when its screen is short of room,
    as a list already did (one row of three, MORE to page). At the Standard size both lay out as before. And the
    audit's own walk visits the safehouse's save after the job stops: the prologue's giver stands at the safehouse's
    door (since A2's prologue), so a new game's first card there is its JOB card, not the save's slots.
  - **The page from a static server** (PLAN.md 15.3): the tab's icon is inline in the page (an SVG of MOTO's M), so a
    server is asked for nothing beyond the page; the smoke test plays it from file:// and from a static server.
  - **The look pass:** the flat roofs' clutter (a stair hut, skylights, a duct, a chimney on brick, an aerial or a dish
    on the tall, more units) on the builder's own stream (`roofs+`), none of it solid; a style's neon (`style.neon`:
    tubes up its street corners, more shop signs; Neon Mile's); TOP-DOWN draws a thing standing on a roof after the
    roof. Accepted as at M2 (D11): the night light field's soft dark between the lamps' pools.
  - **The gym's kill fixture on seed 1** (two armed Rats, the police joining at three stars, then a detour round a
    jammed exit) failed with the bot through part 5's first commits and passed through the pad; it passes both ways
    since `6d4df84`. A fixture of the gym's, not content: it was never tuned to pass.
- **Landed in:** M13 (part 5: `9843969`, `6efaf9c`, `409e551`, `1805e75` and after).

## D31 · 2026-10-23 · M13's close: determinism is per runtime; the slice played in the page itself
- **Principle:** PLAN.md 7.3's proofs (the same seed and Intents give the same hash with or without drawing, in every
  view; a recorded session replays exactly) and 15.3 (the page plays from file:// and from a static server).
- **Calls:**
  - **Determinism holds within a runtime, not across runtimes.** Node 22's V8 (12.4) and Chromium 141's differ in the
    last bit of `Math.pow`, `Math.sin` and `Math.cos` for a few arguments in a hundred (a probe of 20,000 each:
    2,367, 646 and 646 differ), and the simulation runs on them (MOTOR, and the vendored engine's own `E.Mover`), so
    one seed played in Node and in a browser drifts apart: the headless bot runs and the page play different games
    after a while. Every proof of 7.3 holds as written, each within its runtime: the same-seed and view hashes in Node
    (the unit and sim tests), the recorded drive replayed checksum for checksum in Chromium (`tests/e2e/replay.mjs`).
    A recording replayed in another browser, or a bot run expected to match the page step for step, is not promised.
    Making it so would take MOTOR's own sine, cosine and power and a patch through the engine's movement code: not in
    the plan; a limit recorded for later.
  - **The page itself plays the missions through** (from file://, in Chromium, the mission bot at the browser's own
    frame rate: `?bot=1#mission/<id>`), as evidence beside the headless campaign, which stays 15.4's proof.
- **Landed in:** M13 (its acceptance).
