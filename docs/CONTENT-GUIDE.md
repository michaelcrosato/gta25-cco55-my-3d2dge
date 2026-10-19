# Content guide

Grand Theft Moto grows by **adding content, not architecture**. Every `.js` file under `src/game/` is found at build
time and imported, in path order, so content registers itself with `def(kind, id, spec)` from `src/motor/index.js`. No
index file needs editing.

Every recipe below names the test to run. From M12 on, `tests/recipes/*.test.js` follows each recipe to the letter.

## Recipes

| Content | Recipe | Test |
|---|---|---|
| A scene | `def('scenes', id, { make({ game, views, links }) { return { enter, update, draw, ... } } })` in `src/game/scenes/` | `npm test` (`#<id>` opens it) |
| A small test map | `def('maps', id, { build() { return new E.TileMap({...}) } })` | `npm test` |
| A vehicle model | `def('vehicleModels', id, { name, class, length, width, height, ...carParts({...}), kits })` in `src/game/vehicles/` | `node --test tests/unit/handling.test.mjs` (the model's data) |
| A vehicle (or a variant of a model) | `def('vehicles', id, { name, model, kit, role, handling, spec, palette, ... })` in `src/game/vehicles/` | `GTM_VEHICLES=<id> node --test tests/unit/handling.test.mjs`; the look: `tools/model-sheet.mjs --only <id>` |
| A radio station (M4's stub) | `def('stations', id, { name, freq, dj, genre, color })` in `src/game/radio/` | `npm test` |
| An interior | `def('interiors', id, { name, blocks, legend, types, floor, rooms, doors, guards, cameras, lights, music })` in `src/game/interiors/`, and a city door: a `{ kind: 'door', interior: id }` point of interest beside the building | `validateInterior(buildInterior(id))` has no errors (`tests/sim/interior.test.mjs` for the bank); `node vendor/my-3d2dge/tools/check.mjs 'dist/index.html#interior/<id>'` |

More recipes are added as each system lands: vehicle, variant, weapon, ped, outfit, gang, mission, activity, station,
song, shop, property, reel, district.

## Vehicles

A vehicle is two registrations: a **model** (what it looks like and where its people go) and a **definition** (what it
is: its model, paint, handling, role and the numbers its handling is held to). Several definitions can share one model:
a variant names the model and a **kit** of extra parts. `src/game/vehicles/cortez.js` is the template: a model with two
kits and the baseline definition. Put each model and its definitions in a file of its own under `src/game/vehicles/`.

### The model: `def('vehicleModels', id, spec)`

- `name`, `class` (`car` `truck` `tow` `bike` `boat` `heli` `rail`), `length`, `width`, `height` (world units: 16 a
  tile, a storey 24; the Cortez is 58 × 26 × 22, a pedestrian 34 tall).
- `parts`: boxes in the model's own frame (x forward, y right, z up), each `{ box: [x0, y0, z0, x1, y1, z1], color,
  role }`. Roles: `body` (takes the vehicle's paint), `cabin` (a roof: drawn over its glass), `glass`, `wheel` (front
  ones steer), `light` (head lamps: lit at night), `tail` (brake lights), `siren` (alternates red and blue; the box's
  side decides which), `bumper`, `trim`, `rotor` (a heli's blade: spun, drawn twice crossed). `paint: true` puts a part
  of any role in the paint (a roof).
- **Draw order** (`render/box-model.js`, `partOrder`): two parts that a plane between them separates are drawn far
  one first, in every view. For boxes that don't overlap that is a true painter's order, so a locker on the near flank
  of a long body, a lamp on the far end and a light bar on a cab roof all come out right. Parts that overlap keep their
  roles' order: the nested core goes `wheel`, `body`, `glass`, `cabin` (a wheel sunk in the body, the glass on it, the
  roof over the glass), in list order within a role. The exception is a part on the outside (`bumper`, `trim`,
  `light`, `tail`, `siren`) sunk into a core box: it is drawn after the box when the face it pokes out of (most) faces
  the camera, and before it when not. So:
  - build with boxes that touch rather than cross, where you can;
  - sink a lamp into the face it shows on;
  - put roof things on top of the roof;
  - keep an end face's parts inside the body's width, and a side's parts outside it (a stripe or rail wider than
    the body across an end ties the near side to the far one, and the order can loop);
  - avoid one part's top sitting exactly at the bottom of a distant other's, which makes a needless tie;
  - check a model from all four headings in every view: `node tools/model-sheet.mjs --only <id>`.

  `rotor` parts go last.
- The builders make the usual shapes from sizes and return `{ parts, wheels, seats, doors, lights, hook }` to spread
  into the spec (`src/motor/sim/vehicle/model.js` has their options):
  - `carParts({ length, width, height, cabin (share of the length), cabinAt (its centre, share), wheel (radius), style:
    'sedan' | 'wagon' | 'coupe' | 'muscle' | 'police', roof (a colour; default the paint), trim, bar (a light bar) })`;
  - `vanParts({ length, width, height, cab, wheel, box (the box's colour), stripe, bar, armor })`;
  - `truckParts({ length, width, height, wheel, kind: 'pumper' | 'tow' | 'flatbed', trim })`;
  - `bikeParts({ length, height, wheel, style: 'moped' | 'sport' })`, `boatParts({ length, width, height })`,
    `heliParts({ length, width, height })`, `trainParts({ length, width, height })`.
- `wheels: [{ x, y, r, steer }]`, `seats: [{ x, y }]` (the driver first), `doors: [{ id, x, y, side: -1 | 1 | 0,
  seat }]` (where a body stands to get in: outside the body), `lights: { head, tail, siren: [[x, y, z]] }` (where light
  comes from), `hook: [x, y]` (a tow truck's), `hitch: [x, y]`, `nozzle: [x, y, z]` (where a water cannon's jet
  leaves).
- `kits: { name: { parts, lights } }`: extra parts (and siren lights) a definition switches on with `kit: 'name'`.

### The definition: `def('vehicles', id, spec)`

- `name`, `model` (a model id), `kit`, `class` (the model's by default), `role` (`civilian` `police` `medic` `fire`
  `gang` `service` `special`), `seats`, `radio` (`crash` `wheelz` `neon` `lowdown` or `off`), `health`, `toughness` (a
  factor on the damage it takes: armour is below 1), `locked` (police cars: a break-in), `siren`, `horn` (`car` `truck`
  `bike` `boat` `none`), `tool` (`cannon`: the water cannon; `hook`: the tow hook), `palette` (#rrggbb paints, the first
  the usual), `spawn: { zones, weight, timeOfDay }`, `price`, `tags`, `about`.
- `handling`: overrides of the class's body (`HANDLING` in `sim/vehicle/body.js` for land vehicles: `mass`, `top` (u/s),
  `accel` (the launch, u/s²: with `top` it sets the power), `brake` (u/s²: grip-limited), `grip` (the tyres, u/s²),
  `drift` (the rear's grip with the handbrake on), `steer` (the lock, radians), `steerRate`, `steerFade` (less lock at
  speed), `drive` (`rwd` `fwd` `awd`), `wheelbase`, `cg`, `cgHeight`, `rolling`, `reverseTop`, `gears`; `BOAT_HANDLING`
  in `boat.js`: `top`, `accel`, `brake`, `rudder`, `keel`, `rolling`, `reverseTop`; `HELI_HANDLING` in `heli.js`: `top`,
  `accel`, `climb`, `yawRate`, `hoverZ`; a rail definition's `cars`, `carLength`, `gap`, `accel`, `brake`).
- `spec`: what its class's handling test holds it to (`sim/vehicle/handling.js`):
  - land: `t200` (seconds 0 to 200 u/s, within 10%) or `t100` for slow ones; `top` (within 5%); `brake200` (units to
    stop from 200 on dry asphalt, within 10%) or `brake100`; the test also wants wet braking at least 15% longer, skidpad
    grip at least half of `grip`, a handbrake drift past the class's yaw and slip thresholds (`DRIFT`), and no
    tunnelling at 400 u/s;
  - boat: `t100` and `top` on open water, the rudder turning it, a quay stopping it;
  - heli: `top` and `climb`; rail: `top` and `dwell`.
- Tune with `node tools/vehicle-bench.mjs <id>` (each measurement and check), then run
  `GTM_VEHICLES=<id> node --test tests/unit/handling.test.mjs`. The braking distance from v is about v² / 2a, where a
  is the brake or the tyres' grip, whichever is less; the 0-200 time falls as `accel` rises.
- The look: build to a scratch path (`node tools/build.mjs --out <dir>/index.html`), then
  `node tools/model-sheet.mjs --dist <dir>/index.html --only <id> --out <dir>/sheet.png` shoots it in ISO (day and
  night), TOP-DOWN and MODE 7. Read the sheet: it should read as what it is in every view, its silhouette its own.

## Interiors

An interior is a small TileMap drawn as ASCII (`src/game/interiors/bank.js` is the template), built by the district
builder (`buildInterior`) and run by MOTOR's `InteriorRun` while the player is inside; the city stands still meanwhile.

- **`blocks`**: rows of characters, one a 16-unit cell; **`legend`** names each character: `{ wall: type }` (a wall
  cell), `{ floor: surface }` (marble, carpet, steel, concrete, sewer: water no one walks), and `mark` (cells a door or
  a mission finds by name).
- **`types`**: the wall types the legend names (`h`, `side`, `top`, `face`; `cut: false` for furniture lower than a
  body, which no cut-away drops; `cutH` the stub a dropped wall leaves).
- **`rooms`**: `{ name, rect: [x0, y0, x1, y1] }`; a `public: true` room is where anyone may stand (the bank's
  lobby). Outside it, or with a gun out, aiming or wanted, the guards and cameras mind the player.
- **`doors`**: `{ id, from, at, mark }`: `from` the city's door point of interest it joins, `at` the cell inside where
  the player comes in, `mark` the cells where △ leaves by it. Out by the door you came in, you are back where you
  stood; out by another, at its own point of interest.
- **`guards`**: `{ arch, route: [[x, y], ...] }` (a ped archetype; the cells of its round, walked by a flow field).
- **`cameras`**: `{ at, z, facing, sweep, period, range, fov }` (on a wall cell's side: radians, east 0, south pi/2).
- **`lights`**: `{ at, radius, color }`; **`music`**: a station or cue id (M10).

The validator checks every door, round, camera, room and light, and reports which rooms each door reaches on foot:
the bank's front door reaches the lobby and the offices but never the vault, which only the sewer reaches.

