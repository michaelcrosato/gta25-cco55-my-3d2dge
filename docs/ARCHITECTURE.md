# Architecture: MOTOR on my-3D2dge

This is the living architecture document. `PLAN.md` sections 7-8 are the design. This file records what is built and
the **frozen contracts**, which are frozen in M1.

## Layers

```
src/game     content (maps, scenes, vehicles, missions...): data and scripts. Imports only src/motor/index.js.
src/motor    MOTOR: generic open-city systems over my-3D2dge's public API (plus the patches in vendor/my-3d2dge/PATCHES.md).
vendor/      my-3D2dge v0.46.1 @ cfa866a, vendored with checksums (VERSION.json); patched minimally.
src/about.js the Source Information and the engine summary: one source for the page header and Credits & About.
```

`tools/boundary-check.mjs` enforces the layers.

## Build

`tools/build.mjs`:
1. bundles `src/main.js`, plus every `src/game/**/*.js` (found at build time and sorted), into one IIFE with esbuild;
2. inlines the engine and the bundle into `src/index.template.html`;
3. writes `dist/index.html`.

A rebuild of an unchanged tree is byte-identical: the build checks this, and so does `tests/unit/build.test.mjs`.

## Running

- **Browser:** the page's first script is the engine, which defines `My3D2dge`; the second is the bundle.
- **Headless:** `tests/harness.mjs` runs the same two scripts in one `node:vm` context, with no DOM.
- **Options:** `globalThis.__GTM_OPTIONS__ = { hash, query }` stands in for the page's `#hash` and `?query`.

## What is built (updated per milestone)

| Piece | Where | Since |
|---|---|---|
| Engine handle | `src/motor/engine.js` | M0 |
| Registries (`def` / `get` / `all` / `declare`) and schemas (`shape`) | `src/motor/core/registry.js`, `schema.js` | M0, M1 |
| The BUS (scopes, failure isolation) and its catalogue | `src/motor/core/bus.js`, `events.js` | M1 |
| TUNE knobs, named RNG streams | `src/motor/core/tune.js`, `rng.js` | M1 |
| The deterministic Math (fdlibm in plain arithmetic, Node 22's own results) and the prelude that installs it before the engine | `src/motor/core/dmath.js`, `prelude.js` | after M13 (D33) |
| Deep links, the console handle `__gtm`, `game.debug.snapshot` | `src/motor/debug/` | M0 |
| Per-context bindings over raw devices (GTM-PATCH 4), the activity monitor, glyphs, `{action}` prompts | `src/motor/input/` | M1 |
| The HumanController (bindings → a world-space Intent) | `src/motor/input/human.js` | M1 |
| The DualSense by WebHID (its output report by USB and by Bluetooth: the adaptive triggers, the motors, the light bar, the player lights) and what plays on it (R2 and L2 by what the player holds, the light bar the character's colour and the stars); the rumble by it while it is open, else by the Gamepad API | `src/motor/input/dualsense-hid.js`, `haptics.js`, `rumble.js` | L7 |
| The desktop wrapper (Electron: the page unchanged, full screen, a DualSense granted with no chooser, nothing let off the machine; packed per platform) | `desktop/` | L7 |
| Actor, Intent, the footprint rings | `src/motor/sim/actor.js`, `intent.js`, `footprint.js` | M1 |
| The view manager (`iso`, `top`, `side7`; emits `view`) | `src/motor/render/view-manager.js` | M0, M1 |
| The floor chunks (world-space bakes, LRU, one affine blit per chunk in ISO) | `src/motor/render/floor-chunks.js` | M1 (S2) |
| The Stage: how scenes draw the world, the same code in every view | `src/motor/render/stage.js` | M1 (S1) |
| The depth renderer: spans, wall textures, textured faces, SIDE7, TOP | `src/motor/render/depth/` | M1 (S1) |
| Box-part models through the projector (the outside parts sorted by `P.depth3`: M4) | `src/motor/render/box-model.js` | M1 (S3), M4 |
| Vehicle physics (bicycle model, collisions) and the `vehicles` registry | `src/motor/sim/vehicle/` | M1 (S3) |
| The staged mission DSL's shape (`defMission`, `defActivity`, bot hints) | `src/motor/mission/dsl.js` | M1 (the runtime: M8) |
| The Proving Ground: zones `scale`, `views`, `pad` | `src/game/proving/`, `src/game/scenes/proving.js` | M1 |
| Engine patches 1-4 (TileMap scale, wall cache, solids, raw input) | `vendor/my-3d2dge/PATCHES.md` | M1 |
| The world layer: CityMap, the district builder and validator, `buildCity`, decks | `src/motor/world/citymap.js`, `builder.js`, `validator.js`, `district.js` | M2 |
| The world clock, the weather, the drawbridge (simulation state, stepped with the clock) | `src/motor/world/clock.js`, `weather.js`, `drawbridge.js` | M2 |
| The street painter (the city's floor into floor chunks) and the city renderer (props, decks, signs, roofs, yards, glints) | `src/motor/render/surface-paint.js`, `city-render.js` | M2 |
| The ISO cut-away by lot (per view), the quarter turn, the speed zoom | `src/motor/render/cutaway.js`, `stage.js`, `speed-zoom.js` | M2 |
| The sky by hour and weather; rain, wet streets, haze and lightning on screen; MOTOR's light pass and glows | `src/motor/render/sky.js`, `weather-fx.js`, `stage.js` | M2 |
| Lowtown: four neighbourhoods, every landmark, the Loop and the L, the canal and the drawbridge | `src/game/districts/lowtown/` | M2 |
| The crossings between districts: a gate at a road's end at the map's edge, a city built for the ones open (`buildCity`'s `open`: openings cut, barricades left out); crossed, the play scene enters the other district with the save, the vehicle, the view and the stars (one map at a time) | `src/motor/world/crossing.js`, `district.js`, `src/game/scenes/play.js` (`crossAt`, `reopen`, `arrive`) | X1 |
| Ironside, District 2: the Foundry, Scrapyard Flats and Voltage Row, the Flyover, the canal and the river, the east bridge | `src/game/districts/ironside/` | X1 |
| Glass Heights, District 3: Cathedral Hill, the Strip and Marina Heights, the bay and the sea, the Loop Causeway over the bay (shut in Lowtown's sea wall until Blackout) | `src/game/districts/glass-heights/` | X5 |
| Engine patch 7 (canvas lighting cost) and patch 1's `cutTop` | `vendor/my-3d2dge/PATCHES.md` | M2 |
| Saves: a JSON document per slot (migrate, normalize, keep a corrupt one as `:bak`, locked in the demo) | `src/motor/core/save.js`, `src/game/save.js` | M3 |
| Combat data: the `weapons` registry, Vitals (armour, regeneration, knockdown, stun), Inventory (slots of a kind, magazines, reloads), Stats, Abilities | `src/motor/combat/weapons.js`, `vitals.js`, `inventory.js`, `stats.js`, `abilities.js` | M3 |
| Aim: lock-on in a screen cone (threats first), flicks, assist levels (with the mouse's point, never far past it), the shot's pitch; z-aware sight lines | `src/motor/combat/aim.js` | M3 |
| The Combat world: Shots (3D segment hits against bodies and boxes, walls by height, decks; a shot from the shoulder at a car lower than it, at its flank), Explosives (arcs, bounces, rockets, blasts, chains), the Fire grid, Pickups, zaps, the Snap, melee, drive-bys; BUS hit, kill, crime, explode, photo | `src/motor/combat/combat.js`, `shots.js`, `explosives.js`, `pickups.js`, `src/motor/sim/fire.js` | M3 |
| The weapons bench (each weapon's measured DPS against its spec) | `src/motor/combat/bench.js` | M3 |
| Peds on foot: the Mover's verbs, stamina, crouch, a roll that stops short, strafing, knockdown and get-up, seats | `src/motor/actors/ped.js` | M3 |
| PedRig: a look over the Humanoid, MOTOR's weapon models drawn among the limbs (GTM-PATCH 8), the foregrip IK | `src/motor/actors/ped-rig.js`, `src/motor/render/weapon-models.js` | M3 |
| The crew: the protagonists, the switch (camera up, across, down), vignettes, the crew fund; the `characters` registry | `src/motor/actors/crew.js`, `characters.js`, `src/game/characters/` | M3 |
| The combat renderer (tracers, flames, zaps, fire and scorch, thrown things, lights, pickups) and the Stage's glow lines, lights and depth-view particles | `src/motor/render/combat-fx.js`, `stage.js` | M3 |
| UI first pass: the radial wheel, the weapon wheel, the on-foot HUD (cached corners), lock-on marks | `src/motor/ui/wheel.js`, `weapon-wheel.js`, `hud.js` | M3 |
| Chorded mouse buttons (right to aim, left to fire) | `src/motor/input/mouse-chords.js` | M3 |
| The Proving Ground: the combat `range`, the view lab's scale yard, `?selftest=1` self-tests (e2e) | `src/game/proving/range-zone.js`, `city-zones.js`, `tests/e2e/selftest.mjs` | M3 |
| Vehicle models (box parts with kits) and their builders; definitions by model id (D15) | `src/motor/sim/vehicle/model.js`, `defs.js` | M4 |
| The class bodies: the tyre model over the ground (decks, ramps, jumps, flips, towing), boats, the heli, the L's lines and trains, the tow joint | `src/motor/sim/vehicle/body.js`, `boat.js`, `heli.js`, `rail.js`, `tow.js` | M4 |
| Planes: a body that rolls on its gear, lifts off past its rotation speed, banks to turn, stalls under its stall speed and sets down gently or crashes (a seaplane on water), turned back at the world's edge on a predicted exit (along it, flown on); the AutoPlayer flying one (a clear run, a cruising height, an approach, a glide and a go-around) | `src/motor/sim/vehicle/plane.js`, `model.js` (`planeParts`), `src/motor/ai/autoplayer.js` (`_plane`) | X2 |
| Vehicle damage (zone dents, smoke, fire, the explosion) and the handling bench per definition | `src/motor/sim/vehicle/damage.js`, `handling.js` | M4 |
| The Vehicle actor (seats, doors, lights, siren, horn, radio, nitro, mods, sinking) and the Fleet (sleeping, a neighbour grid, cars on cars, knockdowns, street furniture, chains, trains, tools) | `src/motor/actors/vehicle.js`, `fleet.js` | M4 |
| Boarding: enter, carjack, break-in, mount, exit and bail-out as `E.ACTIONS` beats (a door against a parked car passed over for a clear one, a slide across) | `src/motor/actors/boarding.js` | M4 |
| A district's fleet: curb parking by neighbourhood, landmark spots, moorings, the L, the heli's patrol | `src/motor/world/fleet-spawn.js`, `src/game/districts/lowtown/fleet.js` | M4 |
| The vehicle renderer (paint, dents, steering, doors, lights, beams, sirens, rotors, wakes) and VehicleFX (skids, smoke, sparks, slicks, mines, jets) | `src/motor/render/vehicle-draw.js`, `box-model.js` | M4 |
| The radio stub (`stations`), the vehicle HUD panel, the Proving Ground's `garage` and the model sheet | `src/motor/audio/stations.js`, `src/motor/ui/hud.js`, `src/game/proving/garage-zone.js`, `tools/model-sheet.mjs` | M4 |
| The slice's vehicles: 13 models and 19 definitions (FAN-OUT A1) | `src/game/vehicles/` | M4 |
| The road graph (lanes, junction regions, connectors, crosswalks), the GPS (A*, reverse costs), the signals and the junction reservations, the sidewalk graph | `src/motor/nav/` | M5 |
| Traffic (the spawner in the annulus, the far LOD, hand-offs, service units) and its DriverBrain (IDM, junctions, sirens, passing) | `src/motor/ai/traffic.js`, `driver.js` | M5 |
| The crowd (its own ring, gliding peds, reactions, witnesses, troupes, patrols, groups) and the PedBrain | `src/motor/ai/crowd.js`, `pedbrain.js` | M5, M6 |
| The emergency services (the police's look-round, the Medic, the Pumper; a crew back in past a parked car, round it to a clear door) and CityLife, which steps the city together | `src/motor/ai/emergency.js`, `city-life.js` | M5 |
| The AutoPlayer core (walks the sidewalks, drives the GPS route in a style: calm, smooth, careful, player, race; sails a boat over the water's cells round the shore and what lies moored, X6) | `src/motor/ai/autoplayer.js` | M5 |
| The wanted level (crimes, heat, stars, search and evade) and the police (sight, tiers, units, the Eye, roadblocks, spike strips, NABBED) | `src/motor/police/wanted.js`, `police.js`, `pursuit.js`, `cop.js` | M6 |
| One fighting brain for everyone who fights on foot (guns in bursts, a clear line of fire, bats, throws) | `src/motor/ai/fighter.js` | M6 |
| Gangs (respect, stances, hangouts and beats, gang cars in their turf, turf wars and a job's peace that holds them off) | `src/motor/gangs/gangs.js`, `src/game/gangs.js`, `src/game/peds/gangs.js` | M6 |
| The radar (the city baked, turf hatched, blips, the search circle and the cops' cones) and the wanted stars | `src/motor/ui/radar.js` | M6 |
| Lowtown's crimes and police tiers; WRECKED, NABBED, the respray, bribes in play | `src/game/crimes.js`, `police.js`, `scenes/play.js` | M6 |
| The view manager's memory per context and Auto; the dissolve between views and rail turns; the camera rig | `src/motor/render/view-manager.js`, `crossfade.js`, `stage.js` | M7 |
| MODE 7's lenses (on foot, in a vehicle, indoors), Auto-rail and sky; the depth views' quarter-size light pass | `src/motor/render/depth/side7.js`, `sky.js`, `stage.js` | M7 |
| Interiors: the `interiors` registry, `buildInterior` (ASCII rooms), `validateInterior`, and the run while the player is inside (guards, CCTV, noise, takedowns, doors, spots, a staff pass, a vault's door opened) | `src/motor/world/builder.js`, `district.js`, `validator.js`, `interior.js` | M7 |
| The First Lowtown Bank; the occluder fixture | `src/game/interiors/bank.js`, `src/game/proving/occluder-zone.js` | M7 |
| The mission runtime (stages, ops with start, step, end and nav; fails, retry, quit, the medal, the rewards, the record), what a mission spawns (vehicles with drivers on the GPS, peds by role, pickups, props, outdoor takedowns), the random events' runtime | `src/motor/mission/runtime.js`, `actors.js`, `grading.js`, `ambient.js` | M8 |
| The mission bot (plays any objective from its hint through the AutoPlayer's moves: walking, boarding, driving, towing, ramming, fighting, drive-bys, evading, racing, photos, stealth) and the pad pilot (its wishes pressed on a gamepad) | `src/motor/ai/missionbot.js`, `padpilot.js`, `autoplayer.js` | M8 |
| The economy (shops, items, properties and their tills), the completion checklist, collectibles, stunt jumps, hold-ups | `src/motor/play/` | M8 |
| The career: givers and their cards, JOB BLOWN and JOB DONE, the phone (jobs, cabs, contacts, completion), shops at their doors, properties, tokens, stunts, hold-ups, the garage, the saves; Lowtown's shops, properties and checklist; the story cast | `src/game/scenes/career.js`, `src/game/economy.js`, `src/game/peds/cast.js` | M8 |
| The missions and activities (FAN-OUT A2) | `src/game/missions/`, `src/game/activities/` | M8 |

## Frozen contracts (M1)

These shapes are frozen: later milestones add to them, and change them only through a DECISIONS entry.

### The Intent (`src/motor/sim/intent.js`)

What a controller wants one actor to do this step, **in world space**. Every controller writes one: the
HumanController (the player's bindings, screen-relative sticks turned through the active view), the AutoPlayer, the
brains. Ped and vehicle code read only an Intent, never `game.input`, so the attract AI drives the same code as a player
and hash tests drive Intents directly.

```js
{ move: [x, y],            // on foot: a world direction, length <= 1
  aim: [x, y] | null, aimTarget: Actor | null,
  throttle: 0..1, brake: 0..1, steer: -1..1,   // in a vehicle (steer: + right)
  down: { [button]: bool }, tap: { [button]: bool } }   // held, and pressed this step
// buttons: sprint jump roll crouch attack aim interact reload ability wheel phone map pause view switch horn fire nitro
//          handbrake photo weaponPrev weaponNext radioPrev radioNext
```

A controller clears and refills its Intent every step (`clearIntent`); `tapButton` presses one for a step (AI, tests).

### The projector and the Stage (`src/motor/render/stage.js`, `render/depth/`)

Scenes draw the world through the Stage, never through `r.queue` / `r.actor` / `map.queueWalls` directly (HUD
overlays go to `r.overlay`):

```js
stage.setWorld({ map, city, floor, backdrop, night, engineFloor })   // a TileMap (and its CityMap), its FloorChunks, ISO's sky
stage.setSky(skyAt(clock.hour, weather))                             // the hour's light, sky, fog and weather, every view
stage.begin(r, { focus: [x, y], vel: [vx, vy], speed01, player: [x, y, z] })   // presentation only: the cameras follow the focus
stage.actor(x, y, z, (g, sx, sy, view, k) => rig.draw(g, sx, sy, view), { shadow, xray, crowd, key, pose, alpha })
stage.shape(x, y, z, (g, P) => drawBoxModel(g, P, model, x, y, z, heading), { kept, hides, bias })   // vehicles, props, markers
stage.prop('streetlamp', x, y, z, { light, halo, lightRadius })      // the engine's prop sprites
stage.glow(x, y, z, (g, sx, sy, k) => ..., { reflect, iso })         // lamp heads, neon: after the lights, occlusion-checked
stage.floor((g, P) => ...)                                           // on the floor, under what stands on it (glints, sheen)
stage.onScreen(x, y, z0, z1, rad)                                    // the cheap cull for whoever queues many small things
stage.turn(±1); stage.zoomTo(z)                                      // the quarter turn (D12) and the speed zoom's steps
stage.end()
```

- **A projector** `P` has `P.proj(x, y, z) -> [sx, sy, k] | null` (buffer pixels; `k` is pixels per world unit
  there; null behind the camera). Drawing code uses only `proj`, so it draws right in every view. Each projector also
  has `P.depth3(x, y, z)`: a draw-order key in 3D, bigger is farther (a box model sorts its outside parts by it).
- **The depth views** (`Side7View`, `TopView`) are projectors with more:
  - `depth(x, y)`: the draw-order key, bigger is farther;
  - `view(k)`: the engine View a rig is drawn with at that scale;
  - `toGround(bx, by)`;
  - `screenDirToGround(dx, dy)`.
- **ISO** is the engine's own view: `stage.actor` becomes `r.actor` (a `crowd` actor takes the fast path, with no
  outline); `stage.shape` becomes `r.queue` with `P.proj = r.w`.
- **Crowds and kept shapes** (D13): a `crowd` actor with a `key` is drawn into an image of its own every
  `TUNE.crowdEvery` frames (one and a half times that away from the player, D20), posed by `pose(seconds)` just before,
  and the image is reused in between; a shape with `kept: { key, r, h }` is kept the same way until the view or its
  size changes (in a depth view only while it is small on screen). Both work in every view. A shape's `wall: [x, y]`
  (a sign's) draws it after that building in TOP-DOWN.
- **Night** (D11): the engine's canvas lighting draws ISO's dark and pools (GTM-PATCH 7: `lights.res`), the depth
  views take MOTOR's light pass with the same numbers, and anything that shines is a `glow`, never an engine emissive
  item (the glow mask is never built).
- **The view manager** routes `game.setView(id)`: `iso` goes to the engine, `top` and `side7` to MOTOR. It emits
  `view { view, prev }`. `game.views` is `['iso', 'top', 'side7']`.

### The registry kinds (`declare(kind, shape({...}))`)

A bad spec warns once per problem (`E.warn`), gets its defaults, and still registers.

| Kind | Spec | Where declared |
|---|---|---|
| `scenes` | `{ make(app) -> engine scene }` | (the engine's scene shape) |
| `maps` | `{ build(seed, ...) -> TileMap }` (with `paintFloor` for FloorChunks) | content |
| `provingZones` | `{ title, make(app) -> { enter(), update(dt), draw(r), hud(), snapshot(), perf(), stateHash(), handle() } }` | content |
| `glyphSets` | the PlayStation / Xbox / Nintendo / keyboard glyph drawings | `input/glyphs.js` |
| `vehicles` | `{ name, model (a vehicleModels id; M4, D15), kit, class (car truck tow bike boat heli rail), role, handling (the class body's overrides), palette, health, toughness, seats, radio, locked, siren, horn, tool, spec: { t200 or t100, top, brake200 or brake100; boats t100, top; heli top, climb; rail top, dwell }, spawn: { zones, weight, timeOfDay }, price, tags }` | `sim/vehicle/defs.js` |
| `vehicleModels` | `{ name, class, length, width, height, parts: [{ box, color, role, paint }], wheels, seats, doors, lights: { head, tail, siren }, hook, hitch, nozzle, kits: { name: { parts, lights } } }` | `sim/vehicle/model.js` (M4) |
| `fleets` | `{ district, curb: { every, chance, roles, classes }, spots: [{ def, near, n }], water, rail: [{ deck, def, trains }], air: [{ def, patrol, alt }] }` | `world/fleet-spawn.js` (M4) |
| `interiors` | `{ name, blocks (ASCII rows), legend: { char: { wall, floor, mark } }, types, floor, rooms: [{ name, rect, public }], pois, doors: [{ id, from, at, mark }], guards: [{ arch, route }], cameras: [{ at, z, facing, sweep, period, range, fov }], lights: [{ at, radius, color }], music, seed }` (D20) | `world/district.js` (M7) |
| `stations` | `{ name, freq, dj, genre, color }` | `audio/stations.js` (M4's stub; M10) |
| `missions` | `defMission(id, { title, giver, gang, tier, requires, brief, rewards, bonus, stages })`; M8 adds the optional `plays`, `allowSwitch`, `unlock(save, W)` | `mission/dsl.js` |
| `activities` | `defActivity(id, { title, start, levels, stages })`; M8 adds the optional `kind` (job, race, mayhem, event, other), `brief`, `rewardsFor(level)`, `where(W, player)` (an event's spot) | `mission/dsl.js` |
| `shops` | `{ name, poi, items: [{ id, name, kind (weapon, ammo, armor, health, snack, mod, paint, repair, outfit), item, amount, price (a number or a knob), unlock }], drive, holdup, color }` | `play/economy.js` (M8) |
| `properties` | `{ name, poi, price, income, cap }` (numbers or knobs) | `play/economy.js` (M8) |
| `completion` | `{ label, kind (missions, jobs, races, mayhem, stunts, tokens, properties), weight (tenths of a percent: they sum to 1000), order }` | `play/completion.js` (M8) |
| `collectibles` | `{ name, reward, bonus, spots: [{ id, at: [x, y, z], via }] }` | `play/collectibles.js` (M8) |
| `stunts` | `{ name, takeoff: [x, y], r, landing: { at, r }, minDist, minAir, reward, approach }` | `play/stunts.js` (M8) |

The kinds PLAN.md 7.4 lists for later milestones (`districts`, `interiors`, `weapons`, `peds`, `gangs`, `characters`,
`stations`, `reels`...) are declared with their milestone, in the same way.

### The BUS catalogue (`src/motor/core/events.js`)

`BUS.on(event, fn, scope)` and `BUS.emit(event, data)`, with scopes `global`, `world`, `mission`, `scene` and (M7)
`interior`; `BUS.mute(scope)` and `BUS.unmute(scope)` hold a scope's listeners deaf (the city's, `world`, while the
player is inside). The
events MOTOR's systems speak, with their payloads:

| Group | Events (payload fields) |
|---|---|
| Crime and police | `crime` (type, x, y, by, victim, severity, vehicle, lawful) · `witness` (crime, by) · `report` (crime, x, y, by, victim, witness, severity) · `wanted` (stars, heat, prev, why) · `search` (x, y, r) · `evaded` (stars) · `busted` (by, how) · `wrecked` (cause) · `dispatch` (kind, x, y, unit, call, tier) · `onScene` (kind, call, unit, x, y) · `roadblock` / `spikes` (x, y) · `spiked` (vehicle) · `respray` (vehicle, color) · `respawn` (kind, x, y) · `confiscated` (weapons) (M5, M6: D18, D19) |
| The city | `revived` (target, by) · `encore` (troupe, by) · `turfWar` (gangs, x, y) · `turfWarEnd` (gangs, x, y, dead) (M5, M6) |
| Interiors | `interior` (id, door, enter) · `alarm` (interior, by, x, y) · `takedown` (interior, guard, by) (M7) |
| Combat | `hit` (target, by, damage, kind, x, y, z) · `kill` (target, by, kind) · `explode` (x, y, z, r, by, power) · `fire` (x, y, r, by) · `photo` (by, x, y, targets, dir: M8) |
| Vehicles | `vehicleEnter` / `vehicleExit` (vehicle, actor, seat) · `carjack` (vehicle, by, victim) · `vehicleDamage` (vehicle, amount, x, y, by) · `vehicleDestroyed` (vehicle, by) |
| Rewards | `pickup` (item, by) · `cash` (amount, reason) · `respect` (gang, delta, value, why) · `stunt` (id, score) · `collectible` (id) · `stat` (stat, delta) · `purchase` (shop, item, price) · `property` (id, price) · `holdup` (shop, by, cash) · `cab` (to, fee) (M8: D21) |
| Missions | `missionStart` (id) · `stageStart` (mission, stage) · `stageFail` (mission, stage, reason) · `missionPass` (id, medal, elapsed) · `missionFail` (id, reason) · `activityStart` (id, level) · `activityEnd` (id, level, result) |
| The player | `switch` (from, to) · `ability` (who, on) |
| World | `view` (view, prev) · `radio` (station) · `clock` (hour) · `weather` (state, prev) |
| Saves, attract, UI | `save` / `load` (slot) · `attractBeat` (reel, beat) · `uiOpen` / `uiClose` (screen) |

### The staged mission API and hint data (`src/motor/mission/dsl.js`)

```js
defMission('saints_holy_rollers', { title: 'Holy Rollers', giver: { phone: 'saints' }, gang: 'saints', tier: 1,
  requires: ['prologue'], brief: ['Father Fender needs three cars blessed by midnight.'],
  rewards: { cash: 2500, respect: { saints: +15, rats: -5 } },
  bonus: [{ id: 'time', text: 'Under 6:00', check: m => m.elapsed < 360 }],
  stages: [
    { id: 'steal', setup(m) { /* spawns, loadout, time and place */ }, *run(m) { /* objectives */ },
      hints: [{ kind: 'enterVehicle', vehicle: 'target' }] },
    { id: 'deliver', setup(m) { }, *run(m) { }, hints: [{ kind: 'deliver', what: 'target', to: [x, y] }] } ] });
```

- **Stages:** each stage is `{ id, setup(m), *run(m), hints }`, with unique ids. Retrying, and `#mission/<id>/<stage>`,
  restart a stage from its `setup`, so a setup run twice leaves the same state.
- **The `m` API** (the M8 runtime; each call yields until done):
  - objectives: `objective(text, { hint })`, `marker`, `route`;
  - waiting: `waitUntil(pred)`, `wait(s)`;
  - talking: `say(lines, { name, portrait })`, `cutscene(shots)`;
  - spawning and placing: `spawn.vehicle / ped / pickup / prop`, `place(actor, at | { in })`, `tagged(tag)`;
  - verbs: `deliver`, `chase`, `follow`, `protect`, `race`, `timer`;
  - wanted: `wanted.set / floor / cap / clear`;
  - flow: `failIf(pred, reason)`, `parallel`, `first`, `choice`;
  - characters and ending: `switchTo(character)`, `reward()`.
- **Bot hints** (data the AutoPlayer acts on), with their required fields:
  - `goto { at | route, radius }`, `enterVehicle { vehicle }`, `kill { targets }`;
  - `deliver { what, to }`, `evade {}`, `follow { target, dist }`;
  - `race { line }`, `photo { target, from }`, `stealth { path, cover }`.
- **Ownership:** everything a mission spawns is `owner: 'mission'` and released when it ends.
- **Ending:** one main mission at a time, plus activities. A failure shows JOB BLOWN, then *Retry this stage* or *Quit
  to free roam*. A pass shows JOB DONE!, the rewards, the bonus objectives and a medal.
- **The runtime (M8, D21):** an op is `{ step(m, dt) -> undefined | { value }, start(m), end(m), nav(m) }`; markers and
  the objective an op sets as it starts go when it ends. The m API grew the verbs content asks for (`reach`, `enter`,
  `evade`, `kill`, `collect`, `photo`, `sequence`, `remove`, `curb`, `lane`, `as`, `interior`, `outside`, `on`, `fire`,
  `heat`, `allowWanted`, `crewPed`, `stash`, `garaged`, `view`): docs/CONTENT-GUIDE.md lists them. A content error
  fails the job with the reason `error` instead of stopping the game. The random events run in a second runtime with
  the BUS scope `event`.

## The proofs (M1)

- **Headless:** `tests/harness.mjs` runs the engine and the bundle in `node:vm`. Every sim test uses it.
- **`game.stateHash`:** the same Intents give the same hash in every view
  (`tests/sim/proving.test.mjs`).
- **The replay round-trip:** `tests/e2e/replay.mjs` records a session with the engine's recorder (`?record=1`) and
  replays it with the vendored `tools/replay.mjs`. Every checksum matches, each including `game.stateHash`.
- **Determinism, in code:** an ESLint rule bans `Math.random`, `Date`, `performance` and timers in MOTOR's simulation
  folders and in `src/game`.
- **Determinism across runtimes (D33):** browsers' `Math.sin`, `cos`, `atan2`, `exp`, `pow`... differ in the last bit
  between engines and versions, so the page's first script (`src/motor/core/prelude.js`, before the engine) puts
  MOTOR's own on `Math` (`src/motor/core/dmath.js`: V8 12.4's fdlibm and its `hypot`, ported to plain arithmetic, which
  every engine rounds alike). The engine, its mocap player, MOTOR and the content then compute alike everywhere, and
  Node's results are what they always were (`tests/unit/dmath.test.mjs` holds each function to Node 22's own, bit for
  bit, and every Math function the page's scripts call to the exact ones or these). The headless loaders run the
  prelude first too. `src/` writes `Math.pow`, never `**` (the lint rule and the same test). The proof:
  `tests/e2e/cross-runtime.mjs` plays free roam, a mission by the bot and the attract mode headless and in Chromium,
  step for step, and the hash matches at every checkpoint (60 s in `npm test`, 600 s in `test:full`).
- **The full game, verified (X8, D45):** `npm run test:full` runs the heavy suites on the PR's head, alone (PLAN.md 15):
  the perf gate in each district and view (`tools/perf.mjs --gate`); the city soak in each district
  (`tests/full/city-soak.mjs`: Lowtown by day and at night in the rain, Ironside and Glass Heights by day, watched every
  step for cars inside each other, calm red runs and cars standing with no cause); the gang sim
  (`tests/full/gang-soak.mjs`); the screenshot matrix (`tools/shot-matrix.mjs`: every neighbourhood of the three
  districts, by day, at dusk and at night, in ISO, TOP-DOWN and MODE 7); every mission and activity level through the
  bot on seeds 1-3 and through a pad (`tools/bot.mjs`); and the campaign, a new game from the title's NEW GAME played by
  the bot to 100% across the three districts (`tools/bot-campaign.mjs`).
