# Content guide

Grand Theft Moto grows by **adding content, not architecture**. Every `.js` file under `src/game/` is found at build
time and imported, in path order, so content registers itself with `def(kind, id, spec)` from `src/motor/index.js`. No
index file needs editing.

Every recipe below names the test to run. `tests/recipes/<type>.test.mjs` follows each to the letter (PLAN.md M12):
its fixture, `tests/recipes/fixtures/<type>.js`, is the file the recipe describes, and the test bundles it in as if it
were at the path the recipe names (nothing else edited) and proves the new content works end to end. Run one with
`node --test tests/recipes/vehicle.test.mjs`; all of them run in `npm test`. Copy a fixture to start.

## Recipes

| Content | Recipe | Test |
|---|---|---|
| A vehicle (a model and its definition) | `def('vehicleModels', id, { name, class (car \| truck \| tow \| bike \| boat \| heli \| rail), length, width, height, ...carParts({ length, width, height, cabin, cabinAt, wheel, style }), kits })` (or `vanParts`, `truckParts`, `bikeParts`, `boatParts`, `heliParts`, or parts of its own: the Cortez's) and `def('vehicles', id, { name, model, class, role (civilian \| police \| medic \| fire \| gang \| service \| special), seats, radio, health, horn, palette, handling: { mass, top, accel, brake, grip, drift, steer, drive }, spec: { t200, top, brake200 }, spawn: { zones, weight, timeOfDay }, price, tags, about })` in a file under `src/game/vehicles/`. The spec is what the handling suite holds it to: measure it (`measureHandling(id)`) and write what it does | `node --test tests/recipes/vehicle.test.mjs`; `GTM_VEHICLES=<id> node --test tests/unit/handling.test.mjs`; the look: `node tools/model-sheet.mjs --only <id>` |
| A variant of a model | `def('vehicles', id, { model: <a model's id>, kit: <one of its kits, or none>, ... })` as above: the model's parts, its own handling, palette and spec | `node --test tests/recipes/variant.test.mjs`; the handling suite as above |
| A weapon | `def('weapons', id, { name, slot (melee \| pistol \| smg \| shotgun \| heavy \| thrown \| special), projectile (melee \| bullet \| pellets \| rocket \| molotov \| grenade \| stream \| zap \| photo), damage, rate, pellets, mag, reload, spread, range, speed, splash, ammo, model, sound, recoil, rumble, price, unlock })` in a file under `src/game/weapons/`; on a shop's shelf: `get('shops', id).items.push({ id, name, kind: 'weapon', item: <the weapon>, amount, price })` (the file loads after `src/game/economy.js`, by path) | `node --test tests/recipes/weapon.test.mjs` (its DPS on the range bench, within 10% of its spec's); `node --test tests/sim/combat.test.mjs` |
| A ped (a crowd archetype) | `def('peds', id, { name, kind (civilian \| gang \| service \| special \| cast), weight (0: never in the crowd, a mission's or a gang's), zones (neighbourhood ids), times, builds, outfits, sleeves, hairs, hats, palettes: { skin, hair, cloth, coat, pants, boot, belt }, traits, weapons })` in a file under `src/game/peds/` | `node --test tests/recipes/ped.test.mjs` |
| An outfit | a look (`{ build, outfit, hair, sleeves, hat, colors: { skin, hair, cloth, coat, pants, boot, belt } }`) pushed onto each protagonist's `outfits`, its name onto `outfitNames` (the same index for all three), and a shop item `{ id, name, kind: 'outfit', item: <that index>, price }` pushed onto Threads' items, in a file under `src/game/outfits/` (it loads after the characters and the shops, by path) | `node --test tests/recipes/outfit.test.mjs` |
| A gang | `def('gangs', id, { name, colors, icon, pattern, turf: [neighbourhood ids], hq, phone (points of interest), rival, vehicles, weapons, peds: { grunt, enforcer }, thresholds: { hostile, friendly }, beats, chain })`, its two archetypes (`def('peds', ..., { kind: 'gang', faction: <the gang>, weight: 0, ... })`) and its HQ (a landmark, below: a building and a `{ kind: 'gang', gang }` point of interest at its door), in one file under `src/game/gangs/` | `node --test tests/recipes/gang.test.mjs`; `node --test tests/sim/gangs.test.mjs` |
| A mission | `defMission(id, { title, giver, gang, tier, requires, plays, brief, rewards, bonus, stages })` in a file of its own under `src/game/missions/` (`s1-holy-rollers.js` is the template): each stage's setup restores what it needs, each op's hint is the bot's (deliver to a curb, `m.curb(poi)`, where a car can stop) | `node --test tests/recipes/mission.test.mjs`; `node tools/bot.mjs --mission <id>` (seeds 1-3) and `--pad`; `node --test tests/sim/mission-links.test.mjs` |
| An activity (a job, a race, a MAYHEM) | `defActivity(id, { title, kind, start, levels, brief, rewardsFor(level), stages })` under `src/game/activities/` (`m.level` in a stage: the level played) | `node --test tests/recipes/activity.test.mjs`; `node tools/bot.mjs --mission <id> --level <n>` |
| A random event | `defActivity(id, { kind: 'event', levels: 1, where(W, P), rewardsFor, stages })` under `src/game/events/` (one stage; a failure ends it quietly; its setup sets `m.data.at` when a deep link starts it) | `node tools/bot.mjs --mission <id>` |
| A radio station | `def('stations', id, { name, freq, dj, genre ('synth-punk' \| 'boom-bap' \| 'synthwave' \| 'talk'), color, seed, about, songs: [{ title, artist }], djLines, ads: [radioAd ids], jingle, talk: [[lines]] })` and its ads, `def('radioAds', id, { name, lines })`, in a file under `src/game/radio/` (the music is the composer's: no notes to write); it joins every car's dial | `node --test tests/recipes/station.test.mjs`; `node --test tests/unit/audio.test.mjs`; `node tests/e2e/audio.mjs` |
| A song | `def('songs', id, { title, artist, station, bpm, steps, tracks: [{ wave (square \| triangle \| sine \| sawtooth \| pulse \| drums), vol, notes }] })` in the engine's note syntax (`audio/notes.js`: a token a step, a note `C4` `F#3` `Bb2`, `-` holds it, `.` rests, `\|` a bar line; on the drums track `k s h o c t`), in a file under `src/game/songs/`: its station plays it after the songs its composer writes | `node --test tests/recipes/song.test.mjs`; the jukebox, `#proving/ui` |
| A shop | its building and door, a landmark: `def('landmarks', id, { district: 'lowtown', name, lots: [{ rect, kind: 'building', storeys, look, sign: { text, color } }], pois: [{ id, kind: 'shop', at: <a sidewalk cell at the door>, label }] })`, and `def('shops', id, { name, poi, color, items: [{ id, name, kind (weapon \| ammo \| armor \| health \| snack \| mod \| paint \| repair \| outfit), item, amount, price }], drive, holdup })` (prices may name `Prices` knobs), in a file under `src/game/shops/` | `node --test tests/recipes/shop.test.mjs`; `node --test tests/sim/economy.test.mjs` |
| A property | its building and door (a landmark, as a shop's, the point of interest `{ kind: 'property' }`) and `def('properties', id, { name, poi, price, income, cap })`, in a file under `src/game/properties/` | `node --test tests/recipes/property.test.mjs`; `node --test tests/sim/economy.test.mjs` |
| An interior | `def('interiors', id, { name, blocks, legend, types, floor, rooms, doors: [{ id, from: <the city door>, at, mark }], guards, cameras, lights, music })` in a file under `src/game/interiors/`, and its city door: a landmark's `{ kind: 'door', interior: id }` point of interest beside a building | `node --test tests/recipes/interior.test.mjs`; `validateInterior(buildInterior(id))` has no errors (`tests/sim/interior.test.mjs` for the bank); `node vendor/my-3d2dge/tools/check.mjs 'dist/index.html#interior/<id>'` |
| An attract reel | `defReel(id, { title, shows, views, time, stages: [{ id, view, caption, setup(m), *run(m) }] })` in a file under `src/game/reels/` (a mission's stages: see "Attract reels" below) | `node --test tests/recipes/reel.test.mjs`; `#attract/<id>` plays it over and over; `node --expose-gc tools/attract-soak.mjs --mins 6` |
| A district | `def('districts', id, { name, size: [w, h], seed, storey, hoods: { <id>: { name, style, gang, music, rects } }, styles, hoodMap, roads: [{ axis, at, from, to, kind (avenue \| street \| alley), name, oneway }], water: [{ rect }], decks, walls: [{ rect, type }], lots: [{ rect, kind, surface }], props, propList: [{ kind, at, paint, solid }], pois, signs: [{ rect, text, color, h, low }] })` in `src/game/districts/<id>/`, with the three doors the play scene needs (`safehouse`, `hospital`, `precinct`); landmarks add to it (`district: id`). `?dev=1&district=<id>#play` plays it (free roam: the career offers nothing outside Lowtown); District 2 (`src/game/districts/district2/`) is the stub | `node --test tests/recipes/district.test.mjs`; `node --test tests/sim/dev.test.mjs` (District 2) |
| A landmark | `def('landmarks', id, { district, name, lots: [{ rect, kind: 'building' \| 'park' \| 'plaza' \| 'yard' \| 'water' \| 'pier', storeys, look, surface, sign }], pois: [{ id, kind, at, label, ... }], props })`: it claims its lots in a block before the neighbourhood fills the rest | the shop, property, gang and interior tests above; `node --test tests/sim/lowtown.test.mjs` |
| Moto Tokens, stunt jumps | `def('collectibles', id, { name, reward, bonus, spots: [{ id, at: [x, y, z], via }] })`, `def('stunts', id, { name, takeoff, r, landing, minDist, minAir, reward, approach })` (registered in order: the first takeoff circle holding an airborne point owns the jump); a stunt's ramps are a landmark's `decks` of kind `ramp` (`def('landmarks', id, { district, name, decks: [{ id, kind: 'ramp', z, width, path, ramps, openEnd }] })`: terrain only, no lanes and nothing piled on them) | `node --test tests/sim/side-content.test.mjs`; the bot campaign |
| A scene | `def('scenes', id, { make({ game, views, links }) { return { enter, update, draw, ... } } })` in `src/game/scenes/` | `npm test` (`#<id>` opens it) |
| A small test map | `def('maps', id, { build() { return new E.TileMap({...}) } })` | `npm test` |
| A screen (M9) | a plain object for `app.ui.screens.open(screen)`: `{ id, title, list: new List({ items }), tabs, cards, info, body, legend, pause, back() }` drawn by the 10-foot kit (`src/motor/ui/`); MOTOR's own: `confirmScreen`, `settingsScreen`, `slotsScreen`, `guideScreen`, `docScreen`, `tabbedScreen`, `mapPage` | `node tools/ui-audit.mjs` (add the screen to its walk) |
| A first-time hint (M9) | `{ id, text, when(ctx) }` in `src/game/ui/tips.js` (glyph tokens name their context: `{onFoot:interact}`) | `node --test tests/sim/ui.test.mjs` |
| A help page (M9) | `{ title, lines }` in `src/game/ui/guide.js` | the audit's help stops |
| A Proving Ground zone (M12) | `def('provingZones', id, { title, make(app) })` in `src/game/proving/` (`labZone(id, title, { district, hold, enter, update, hud, snapshot, selftest })` builds one over a district's play scene) | `node tests/e2e/selftest.mjs --zones <id>` (`#proving/<id>?selftest=1`) |

## Attract reels

The attract mode (PLAN.md 8.20, D25) plays the reels in `src/game/reels/`, each in a fresh Lowtown, with a card between
every two or three. A reel is a mission's stages (the same `m` API, the same bot hints: the mission bot plays it), with
three differences: it pays nothing and is never recorded; each stage may name its `view` (`iso`, `top`, `side7`: the
director's camera plan, set as the stage starts) and a `caption` (shown under the reel's title); and it has a `time`
(seconds) past which the director cuts to the next. The director also cuts when nothing has moved for six seconds (the
camera's focus still, no op begun): so a reel never waits long on one op without movement (a guard's round to come by,
a line said over a still shot), and puts its people where the action starts (a reel is an edit: a stage's setup may
place the car on the next street, under a change of view). A reel's first stage sets the protagonist, the hour and the
weather (`m.as`, `m.time`, `m.weather`: held till the reel ends) and spawns what it needs; `m.slowmo(k)` slows the game
for a moment (a stunt's flight), `m.switchTo(id, { vignette: true })` switches as a player does, the vignette played,
and the `drive` hint (`{ kind: 'drive', heading, nitro }`) holds the throttle down on a heading (a stunt's run-up). Lowtown's
one-way streets (and the Loop's ring) decide which way a reel's route can go: check it with `#attract/<id>` and a probe
of the bot's state before trusting a line of checkpoints.

## The 10-foot UI

Everything the player reads is drawn on MOTOR's UI layer by its kit (PLAN.md 8.18, D23), so content keeps to a few
rules the audit (`tools/ui-audit.mjs`) checks on every screen:
- **A glyph token names its context** (`{onFoot:interact}`, `{vehicle:handbrake}`, `{menu:confirm}`): a token without
  one resolves in the context live when it is drawn, and under a menu that is `menu`, where `interact` is nobody's
  button. An objective or a line in a mission is plain text; a prompt that shows a button names its context.
- **Six items a page at most:** a `List` pages longer lists itself (`2/4` at the panel's top right); a card's
  `items` are the same.
- **The 5 x 7 font only**, at scale 1 or more (`pen.text(s, x, y, color, { scale })`); never the engine's `tiny`.
- **Inside the safe area** (5% each side): `pen.safe` is [x0, y0, x1, y1] in UI pixels; `hudLayout(pen)` says where
  the HUD's own parts sit.
- **Subtitles** come from `m.say(lines, { name, color })`: the speaker's name in their colour, the line after it;
  the player may turn them off (Settings, Display).
- **A job's score:** `m.music('chase' | 'tension')` under a chase or a sneak, `m.music(null)` after it (the job's end
  clears it too); the radio ducks under it. Presentation only: the bot and the tests never hear it.
- A career card (`career._open({ id, title, body, items })`) is a screen of the kit: `items` are `{ label, sub, right,
  disabled, act }`, ✕ acts, ○ backs out (`back()`), and the bot answers a card's `auto()`.

## Missions

A mission is an ordered list of **stages** (PLAN.md 8.15). Each stage has a `setup(m)` that puts the world as the
stage needs it and a generator `*run(m)` that yields **ops** the runtime steps until each is done. A retry, and every
deep link `#mission/<id>/<stage>`, starts a stage from its setup, so **a setup must be idempotent**: run on a stage
already under way (or twice) it changes nothing. A stage with `passOnSave: true` is a save step (the prologue's
last): a save written while it runs passes the job first, so the slot holds it done and paid. The tools for that:

- `m.ensure.vehicle(tag, def, at, o)` / `m.ensure.ped(tag, arch, at, o)`: the tagged one if it is still about, else a
  new one; `m.place('player', at, { within })` leaves a player already that near where they are;
  `m.place(actor, { in: vehicle, seat })` leaves one already in that seat (one in another of its seats moves over: a
  suspect cuffed in the passenger seat).
- `m.curb(at, { within })` is the free curb spot nearest a point (a parked car's place: never on another car; with
  `within`, null when none is that near, never another street's); `m.lane(at,
  heading, z)` the lane point nearest it (a car that drives off from there; with `z`, on the deck at that height: the
  Loop's lanes are in the road graph up there).
- A point is a poi's id, `[x, y]`, or `[x, y, z]`: with a height (a deck, a roof), `m.reach` and `m.race` count it
  (within 24 u), and the bot routes to the lane up there.

**Spawning** (all of it the mission's: `owner: 'mission'`, released when it ends; a retry releases what the stage
spawned and its setup makes it again): `m.spawn.vehicle(def, at, { tag, heading, color, locked, health, gang, driver,
passengers, weapons, drive })` (a `drive` of `{ to } | { route, loop } | { race, laps } | { chase: 'player' | tag } |
{ flee: 'player' }` and a `style` of `calm | fast | race` puts a driver on the GPS; `siren: true`, a police car's
lights and siren on, through the reds, the traffic pulling over; a point with no height is on the ground, and a
`route`'s or a `race`'s point off the lanes, a sidewalk or a junction's middle, counts once the driver has stopped as
near as the lanes go), `m.spawn.ped(arch, at, { tag,
role, facing, weapons, health, armor, attack, alert, leash, route, follow, aimable })` (`aimable: false`: the lock-on
passes it over, a victim standing nearer than her attacker; roles: `enemy` fights once alerted, `guard`
watches a post or walks a round, `ally` follows and fights the alerted, `flee`, `idle`; an `enemy` or `guard` with a
`leash` (u) gives up past that far from where it was put and walks back: a showroom's bouncers never chase a car
across town), `m.spawn.pickup(kind, at, {
item, tag })` (kind `item`: a mission's package), `m.spawn.prop(kind, at, { tag, model, explosive })` (one of the city's
prop models, or a model of its own; `explosive: { hp, damage, splash, fire }` makes it a red barrel: shot, blasted or
stood in fire a moment it blows, and sets the next one off). A mission ped or car given a `gang` is that gang's to the
city: a stray hit on one rallies its members and a kill costs respect, so leave `gang` off a mission's own fighters.
`m.remove(actor)` takes one out now (the garage takes the car). The cast (`src/game/peds/cast.js`): `fender`,
`bilge`, `nana`, `kettle`, `pennywhistle`, `lefty`; the gangs' `saint-grunt`, `saint-enforcer`, `rat-grunt`...

**Ops** (yield them; each sets the objective line and the bot's hint itself, and its markers go when it ends):
`m.reach(at, { text, radius, foot, inVehicle, vehicle, stopped })`, `m.enter(tag)`, `m.deliver({ what, to, radius,
stopped, health, tow })` (`tow`: the tow truck's tag, for a car brought on its hook), `m.follow(tag, { dist, lose,
near, to, until })`, `m.chase(tag)`, `m.kill(tag, { count, done, vehicle })` (`done(actor)`: when a target counts
before it is dead or wrecked, a car once it smokes; `vehicle`: the tag of the car the job is done from, which the bot
boards and never leaves: a police car ramming suspects),
`m.protect(tag, { until })`, `m.collect(tag)`, `m.photo(tag | [x, y], { from, range })`, `m.evade()`,
`m.race(course, { racers })` (its value: the place), `m.say(lines, { name, color })`, `m.cutscene(shots)`,
`m.wait(s)`, `m.waitUntil(pred, { timeout })`, `m.choice(options, { title, bot })` (its value: the option's id),
`m.parallel([...])`, `m.first([...])`, `m.sequence([...])`, `m.switchTo(id)`, `m.reward()`. Immediate:
`m.objective(text, { hint })` (a hint of `HINTS`' kinds, with its data: `stealth` needs a `path` of waypoints),
`m.marker(at | actor)`, `m.route(to)`, `m.timer(secs, { reason })` (and `m.countdown`, the one running: `{ left, total,
stop() }`), `m.failIf(pred, reason)`, `m.wanted.set / floor /
cap / clear` (a floor or a cap is lifted when the job ends, however it ends), `m.wanted.blocks(false)` (no roadblocks or
spike strips while the job runs: a reel's chase down its own street), `m.alerted(tag)` (a guard or enemy of the
tag has seen the player, been hurt or been called, and is still in it: a stealth stage's fail), `m.ally(gang)` (that
gang's members on the player's side till the job ends: strays on them rally no one and cost no respect; `m.truce(gang)`
the same for a job fought against that gang's own; a mission with a `gang` has that gang's truce from its start, so a
gang never shoots at the player doing its own job), `m.standDown(kind)` (the city's own 'fire', 'medic' or 'police'
service takes no new calls till the job ends: a job that is the service, Firefighter's engine on call),
`m.clearTraffic(at, r)` (the city's traffic within r of a point taken off the road at once, never a unit on a call: a
race's grid, cleared as its cars are put on it), `m.clearSpot(at, r)` (a car left standing within r of a point, nobody in
it and not the job's, towed: a door the stage sends the player through, looked at again while they walk up), `m.shoo(ped)` (a passer-by, and its troupe, sent running from the
player: one a swing caught that would swing back), `m.blast(at, { damage, splash, fire })` (an explosion nobody set
off: a drum the fire reached), `m.adopt(vehicle, tag)` (a world vehicle on the job's list under a tag, so a hint can
name it: a garaged car; the world's again when the job ends), `m.fund` and `m.pay(n, why)` (the crew fund, and money
paid in or out: a bribe), `m.eta(at)` (the road's time from the player to a point: a job's fair clock), `m.byId(id)`
(a BUS event's body or vehicle: its gang, whose it is), `m.time(h)` and `m.hour`, `m.weather(state)`, `m.as(id)` (play as a protagonist from now), `m.interior(id, door)`,
`m.outside()`, `m.loadout({ weapons, ammo, select, health, armor })`, `m.data` (kept across the stages and retries),
`m.save` (the save, to read: respect, missions done), `m.allowWanted()` (the stage goes on with stars: on the way
somewhere the bot loses any stars first otherwise, unless a timer runs),
`m.on(event, fn)` (a BUS listener for the stage), `m.fire(at, r, fuel, { vigor, spread })` and `m.heat(at, r)` (a
fire on the grid, and how hot it is now; `spread: false`, a fire that burns where it was set and no further: a burning
car a job keeps fed), `m.crewPed(id)` (a protagonist's body: seat Dex at a getaway car's wheel while Viv shoots), `m.stash(vehicle, id)` and
`m.garaged(id)` (a car kept in the save's garage, back where it was left in later missions), `m.view(id, { heading })` (a set
piece's view: presentation only; `heading`, MODE 7's rail held looking that way, `'north'`, `'east'`, `'south'`,
`'west'`, till the next `m.view` or the job's end). A mission's seated ped (and the crew `m.spawn.vehicle` seats) rides in its seat wherever the vehicle goes;
`m.inside.run.loopCameras(true)` puts an interior's CCTV on a loop (a crew's hacker); `m.inside.run.pass(true)` is a
staff pass (a bribed janitor's mop: nobody minds the player past the counter, though a gun out, a wanted face or the
alarm still count); `m.inside.run.watch()` is what a mission may read of a running interior, a copy: `{ t, alarm,
looped, staff, guards: [{ at, x, y, cx, cy, facing, down, state, sees }], cameras: [{ phase, period, facing, state,
sees }] }` (H2's radio man calls each moment from the guards' rounds and the CCTV's sweep).

**The bot's hints** (what `tools/bot.mjs` plays from): `goto` (`at`, `radius`; `foot`; `vehicle`: a tag to be in;
`interact`: press △ there, a door's or the safehouse's; `spray`: [x, y] to aim at with the fire button held, from
within `reach`: the Pumper's cannon, a gun), `enterVehicle` (`vehicle`), `deliver` (`what`, `to`; `tow`:
the tow truck's tag, for a car on its hook), `kill` (`targets`: rammed from the wheel, shot or beaten on foot, out of
the window from a passenger seat; `vehicle`: a tag, rammed from that vehicle and never left for the job on foot), `evade` (away from the police), `follow` (`target`, `dist`), `race` (`line`),
`photo` (`target`: a tag or [x, y], `from`), `stealth` (`path`: waypoints walked crouched, waiting while a guard is
uneasy; a guard outdoors that has seen it fought; a guard close with its back turned taken down). The ops above set
their own. The bot does not swim, fly or sail: a stage it must finish is reachable by road or on foot. It fights with
the best gun it carries that has rounds (so give a stage's loadout the gun you mean), drives as a player does (round a
stalled queue, through a junction that stays shut, off the road out of a jam), and never takes a police car, an
ambulance or a fire engine unless the stage hands it one. Two things it can't do, so content doesn't ask them: shake
three stars or more (the Eye sees it everywhere but under the decks: keep a stage it must get through below three, or
drive the three through to a point where the story drops them), and fight back a passer-by who hits it (`m.shoo`
them).

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

