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

| A mission | `defMission(id, { title, giver, gang, tier, requires, plays, brief, rewards, bonus, stages })` in a file of its own under `src/game/missions/` (`s1-holy-rollers.js` is the template) | `node tools/bot.mjs --mission <id>` (the bot, seeds 1-3) and `--pad` (through a gamepad); `node --test tests/sim/mission-links.test.mjs` |
| An activity (a job, a race, a MAYHEM, a random event) | `defActivity(id, { title, kind, start, levels, brief, rewardsFor(level), stages })` under `src/game/activities/` | `node tools/bot.mjs --mission <id> --level <n>` |
| A shop | `def('shops', id, { name, poi, items: [{ id, name, kind, item, amount, price }], drive, holdup })` in `src/game/economy.js` (prices are `Prices` knobs) | `node --test tests/sim/economy.test.mjs` |
| A property | `def('properties', id, { name, poi, price, income, cap })` | the same |
| Moto Tokens, stunt jumps | `def('collectibles', id, { name, reward, bonus, spots: [{ id, at: [x, y, z], via }] })`, `def('stunts', id, { name, takeoff, r, landing, minDist, minAir, reward, approach })` | the same; the bot campaign |

More recipes are added as each system lands: vehicle, variant, weapon, ped, outfit, gang, station, song, reel, district.

## Missions

A mission is an ordered list of **stages** (PLAN.md 8.15). Each stage has a `setup(m)` that puts the world as the
stage needs it and a generator `*run(m)` that yields **ops** the runtime steps until each is done. A retry, and every
deep link `#mission/<id>/<stage>`, starts a stage from its setup, so **a setup must be idempotent**: run on a stage
already under way (or twice) it changes nothing. The tools for that:

- `m.ensure.vehicle(tag, def, at, o)` / `m.ensure.ped(tag, arch, at, o)`: the tagged one if it is still about, else a
  new one; `m.place('player', at, { within })` leaves a player already that near where they are;
  `m.place(actor, { in: vehicle, seat })` leaves one already in it.
- `m.curb(at)` is the free curb spot nearest a point (a parked car's place: never on another car); `m.lane(at,
  heading, z)` the lane point nearest it (a car that drives off from there; with `z`, on the deck at that height: the
  Loop's lanes are in the road graph up there).
- A point is a poi's id, `[x, y]`, or `[x, y, z]`: with a height (a deck, a roof), `m.reach` and `m.race` count it
  (within 24 u), and the bot routes to the lane up there.

**Spawning** (all of it the mission's: `owner: 'mission'`, released when it ends; a retry releases what the stage
spawned and its setup makes it again): `m.spawn.vehicle(def, at, { tag, heading, color, locked, health, gang, driver,
passengers, weapons, drive })` (a `drive` of `{ to } | { route, loop } | { race, laps } | { chase: 'player' } |
{ flee: 'player' }` and a `style` of `calm | fast | race` puts a driver on the GPS), `m.spawn.ped(arch, at, { tag,
role, facing, weapons, health, armor, attack, alert, route, follow })` (roles: `enemy` fights once alerted, `guard`
watches a post or walks a round, `ally` follows and fights the alerted, `flee`, `idle`), `m.spawn.pickup(kind, at, {
item, tag })` (kind `item`: a mission's package), `m.spawn.prop(kind, at, { tag, model, explosive })` (one of the city's
prop models, or a model of its own; `explosive: { hp, damage, splash, fire }` makes it a red barrel: shot, blasted or
stood in fire a moment it blows, and sets the next one off). A mission ped or car given a `gang` is that gang's to the
city: a stray hit on one rallies its members and a kill costs respect, so leave `gang` off a mission's own fighters.
`m.remove(actor)` takes one out now (the garage takes the car). The cast (`src/game/peds/cast.js`): `fender`,
`bilge`, `nana`, `kettle`, `pennywhistle`, `lefty`; the gangs' `saint-grunt`, `saint-enforcer`, `rat-grunt`...

**Ops** (yield them; each sets the objective line and the bot's hint itself, and its markers go when it ends):
`m.reach(at, { text, radius, foot, inVehicle, vehicle, stopped })`, `m.enter(tag)`, `m.deliver({ what, to, radius,
stopped, health })`, `m.follow(tag, { dist, lose, near, to, until })`, `m.chase(tag)`, `m.kill(tag, { count })`,
`m.protect(tag, { until })`, `m.collect(tag)`, `m.photo(tag | [x, y], { from, range })`, `m.evade()`,
`m.race(course, { racers })` (its value: the place), `m.say(lines, { name, color })`, `m.cutscene(shots)`,
`m.wait(s)`, `m.waitUntil(pred, { timeout })`, `m.choice(options, { title, bot })` (its value: the option's id),
`m.parallel([...])`, `m.first([...])`, `m.sequence([...])`, `m.switchTo(id)`, `m.reward()`. Immediate:
`m.objective(text, { hint })` (a hint of `HINTS`' kinds, with its data: `stealth` needs a `path` of waypoints),
`m.marker(at | actor)`, `m.route(to)`, `m.timer(secs, { reason })`, `m.failIf(pred, reason)`, `m.wanted.set / floor /
cap / clear` (a floor or a cap is lifted when the job ends, however it ends), `m.alerted(tag)` (a guard or enemy of the
tag has seen the player, been hurt or been called, and is still in it: a stealth stage's fail), `m.ally(gang)` (that
gang's members on the player's side till the job ends: strays on them rally no one and cost no respect), `m.time(h)`, `m.weather(state)`, `m.as(id)` (play as a protagonist from now), `m.interior(id, door)`,
`m.outside()`, `m.loadout({ weapons, ammo, select, health, armor })`, `m.data` (kept across the stages and retries),
`m.save` (the save, to read: respect, missions done), `m.allowWanted()` (the stage goes on with stars: on the way
somewhere the bot loses any stars first otherwise, unless a timer runs),
`m.on(event, fn)` (a BUS listener for the stage), `m.fire(at, r, fuel)` and `m.heat(at, r)` (a fire on the grid, and
how hot it is now), `m.crewPed(id)` (a protagonist's body: seat Dex at a getaway car's wheel while Viv shoots), `m.stash(vehicle, id)` and
`m.garaged(id)` (a car kept in the save's garage, back where it was left in later missions), `m.view(id)` (a set
piece's view: presentation only).

**The bot's hints** (what `tools/bot.mjs` plays from): `goto` (`at`, `radius`; `foot`; `vehicle`: a tag to be in;
`interact`: press △ there, a door's or the safehouse's; `spray`: [x, y] to aim at with the fire button held, from
within `reach`: the Pumper's cannon, a gun), `enterVehicle` (`vehicle`), `deliver` (`what`, `to`; `tow`:
the tow truck's tag, for a car on its hook), `kill` (`targets`: rammed from the wheel, shot or beaten on foot, out of
the window from a passenger seat), `evade` (away from the police), `follow` (`target`, `dist`), `race` (`line`),
`photo` (`target`: a tag or [x, y], `from`), `stealth` (`path`: waypoints walked crouched, waiting while a guard is
uneasy; a guard outdoors that has seen it fought; a guard close with its back turned taken down). The ops above set
their own. The bot does not swim, fly or sail: a stage it must finish is reachable by road or on foot. It fights with
the best gun it carries that has rounds (so give a stage's loadout the gun you mean), drives as a player does (round a
stalled queue, through a junction that stays shut, off the road out of a jam), and never takes a police car, an
ambulance or a fire engine unless the stage hands it one.

**Failing**: a `failIf`, the timer, an op's own (the escort dead, the delivery lost or wrecked) and the player
WRECKED or NABBED stop the stage on JOB BLOWN (retry the stage, or quit). Give every fail a reason a player reads.

**Passing**: the last stage's end (or `m.reward()`) pays `rewards` (`{ cash, respect: { gang: delta } }`), grades the
medal from `bonus` (`[{ id, text, check(m) }]`: all met and no retry is gold; half or more silver; else bronze), and
records the mission in the save (then the autosave). `requires` lists the missions passed first; `unlock(save)` adds
any other condition (the heist's); `giver: { phone: gang }` puts the offer at that gang's payphone, `{ at: poi }`
anywhere, and `{ intro: true }` starts it with a new game.

**The test**: `node tools/bot.mjs --mission <id>` plays it on seeds 1, 2 and 3 with the mission bot, and `--pad`
again through a gamepad (the bot's wishes pressed on a pad: everything a player can do). Both must pass; `npm run
test:full` runs them for every mission and activity level (`--all`). `npm test`'s `tests/sim/mission-links.test.mjs`
checks that each stage's deep link lands at that stage, and the mission lint.

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

