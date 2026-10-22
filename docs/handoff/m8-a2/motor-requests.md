# The MOTOR backlog from FAN-OUT A2 (after part 2b, settled in part 3a; the rest of A2's in parts 3b and 3c; D22)

The `rats` worker's ten requests are done (part 2a, D21). These are the `heist-finale` (H) and `gnomes` (G) workers'
(their full text with each patch: `notes/heist-finale.result.json`, `notes/gnomes.result.json`) and, from part 3c, the
`jobs` (J2-J16), `extras` (E), `saints` (S) and `prologue` (P) workers' (checked against the code the same way, each
done or settled). Each was checked
against the code: every one marked **prepared** is a real gap and is written into `motor-patch.py`. A dry run on part
2b's tree applied it cleanly, with the lint, the boundary check and the missions, combat and mission-links sim suites
passing (26 tests); it has not been through the whole gate or the bot. All four missions pass as written without it
(they work round each gap in content), so the patch should leave them passing: re-run them after it.

| # | Request | Where | Status |
|---|---|---|---|
| H1 | `m.place` on a vehicle threw (getters) | mission/actors.js | done in part 2a |
| H2 | a vehicle spawned at a deck's point lands on the street under it | mission/actors.js `vehicle()` | done (part 3a, D22) |
| H3 | a mission driver's GPS ignores its goal's height; at its stop the held brake backs it up; a crew with no orders has no handbrake and is nudged along by traffic | mission/actors.js `_drive()` | done (part 3a, D22) |
| H4, G1 | a seated mission ped is never stepped: it stays where it got in while its vehicle drives on (hits, draws and a passenger's delivery use the old spot) | mission/actors.js `update()` (`p.ride()`) | done (part 3a, D22) |
| H5 | `m.deliver({ tow })` drops `tow` from its hint, so the bot drives the towed car itself | mission/runtime.js `deliver()` | done (part 3a, D22) |
| H6 | a tow on a deck: the bot's staging point resolves to the street under it | ai/missionbot.js `_towTo()` | done (part 3a, D22) |
| H7 | a guard killed while uneasy keeps its unease: the stealth bot waits for good | ai/missionbot.js `_stealth()` | done (part 3a, D22) |
| H8 | the blast chain is 2D: a street blast sets off the deck's cars 64 u above | actors/fleet.js | done (part 3a, D22) |
| H9 | the aim assist's line of sight ignores deck slabs (a shooter on the deck locks peds on the street) | combat/aim.js `losClear` + play.js | done (part 3a, D22) |
| H10 | a queue at a light counts as boxed in: the bot leaves its car | ai/autoplayer.js | done (part 3a, D22) |
| H11 | no `m.adopt(v, tag)` for a world vehicle (a garaged car can't be named by a hint) | mission/runtime.js | done (part 3a, D22): an adopted car goes back to the world at the end |
| H12 | no CCTV control for a crew's hacker | world/interior.js `loopCameras(on)` | done (part 3a, D22) |
| H13 | `m.view('side7', { heading })` | the views | done (part 3a, D22): `m.view('side7', { heading })`; H4's window is MODE 7 now |
| H14 | the bot's idle stop holds the brake on a car rolling back, which drives it on backwards (body.js) | ai/missionbot.js `_idle()` | done (part 3b, D22): the throttle stops one rolling back; a stopped one sits on its handbrake |
| H15 | the same held brake at an AutoPlayer's stop backs the car off its drop | ai/autoplayer.js `_drive()` | done (part 3b, D22) |
| H16 | a jammed tow is abandoned ('exit'); the end to hook is chosen with the passing traffic counted | ai/missionbot.js `_towTo()`, `_towEnd()` | done (part 3b, D22): the hooked tow is held through a jam; only parked cars count |
| H17 | no read interface for a running interior (H2 read its guards and cameras directly) | world/interior.js | done (part 3b, D22): `m.inside.run.watch()`, a copy; H2 and H4 read it |
| H18 | no leash for a mission's alerted guards and enemies (H1's bouncers chased Dex 2,000 u) | mission/actors.js | done (part 3b, D22): `leash` (u) on `m.spawn.ped`; H1 still removes its bouncers once the star is lost |
| H19 | no staff pass for a bribe (the WIP wrote the lobby's rect over the whole map) | world/interior.js | done (part 3b, D22): `m.inside.run.pass(on)`; H2's bribe is the janitor's mop now, no takedown and no waiting |
| H20 | the stealth bot stands still while an uneasy guard sees it, and its suspicion climbs to an alarm | ai/missionbot.js `_stealth()` | done (part 3b, D22): seen, it backs off the way it came; unseen, it waits at cover as before |
| G2 | fighters never throw (the switch's cooldown eats the one press, and the gun comes back) | ai/fighter.js | done (part 3a, D22) |
| G3 | a spray hint holds the button: no throw, no swing for a weapon that isn't automatic | ai/missionbot.js `_goto()` | done (part 3a, D22) |
| G4 | the bat's walk to a far car re-plans to one blocked sidewalk node (a lamp post) | ai/missionbot.js `_fight()` | done (part 3a, D22) |
| G5 | the bot never fights back a passer-by who hits it | ai/missionbot.js | settled (D22): content sends them running (`m.shoo`) |
| G6 | the bot stuck boarding one car for minutes | ai/missionbot.js `_car()` | done (part 3a, D22): 12 s, then another; a job's own car is never given up |
| G7 | three stars can't be lost (the Eye sees 520 u except under decks; roadblocks on the route) | ai/missionbot.js `_evade()` | settled (D22): content never asks the bot to shake three stars |
| G8 | `m.wanted.clear` lifts the cap before the heat: a star shows for a step | mission/runtime.js | done (part 3a, D22) |
| G9 | a building lot on a pier over water gets no walls (the Rats' Boathouse, the Lighthouse) | world/builder.js `addLot()`: `if (overWater && taken[i] === 1) taken[i] = 0;` | done (part 3a, D22): the Boathouse and the Lighthouse stand; G3's drums moved onto open planks; all re-run |
| G10 | `m.kill(tag, { done })`: when a target counts (G1: a car once it smokes) | mission/runtime.js + the bot | done (part 3a, D22) |
| G11 | `m.hour`, `m.blast(at, o)`, `m.shoo(ped)`, a respect truce | mission/runtime.js | done (part 3a, D22): `m.truce(gang)` is `m.ally` |
| J1 | a race's and a route's checkpoints counted at their height (the Loop's deck) | mission/actors.js `_drive()`: `within(c, v.x, v.y, v.z, 48)` | done (part 3a, D22) |
| J2 | the campaign never boards a locked car, and every police car is locked: Vigilante can't start | tools/bot-campaign.mjs `carNear()` | for the campaign (M8.4) |
| J3 | a racer keeps to the lights and never passes: a race's order is the grid's | mission/actors.js `_drive()` | settled (D22): a race passes on a podium (its brief says so); the bot's silver is the grid's order |
| J4 | a finished racer stops on its last checkpoint and blocks the line | mission/actors.js `_drive()` | settled (D22): content runs its racers on to a cool-down point and counts the places itself |
| J5 | a goal with no height, from a driver up on a deck, is routed at the deck's height | mission/actors.js `_drive()` | done (part 3c, D22): a point with no height is the ground's |
| J6 | a route's point off the lanes (a sidewalk, a junction's middle) is never within reach: the driver sits at its route's end for good | mission/actors.js `_drive()` | done (part 3c, D22): it counts once the driver has stopped there |
| J7 | `m.place(p, { in, seat })` leaves a ped in any seat of that car: a driver can't be moved over | mission/actors.js `place()` | done (part 3c, D22): only the same seat stays |
| J8 | `m.fire` lights at vigour 1: a fire a job keeps fed spreads over the block | mission/runtime.js `fire()` | done (part 3c, D22): `m.fire(at, r, fuel, { vigor, spread: false, heat })` |
| J9 | `m.kill`'s hint drops `o.vehicle` | mission/runtime.js `kill()` | done (part 3c, D22) |
| J10 | the bot's vehicle target picked again each step (two as near flip-flop, neither shot); a car in the line side-stepped without end | ai/missionbot.js `_kill()`, ai/fighter.js | settled (D22): a pick held a second, a clear line first, was tried and sent Boom Gangs' rockets at far cars they never reached (seed 3 failed); the nearest each step stays, and Boom Gangs parks its targets in the open |
| J11 | "rams doing nothing 20 s: out on foot" counts while the car is held in a queue | ai/missionbot.js `_kill()` | settled (D22): a job naming its car (`m.kill(tag, { vehicle })`) is never left |
| J12 | the AutoPlayer's progress check resets each time a goal circling a block comes round nearer | ai/autoplayer.js | settled (D22): Vigilante's stops (rammed, boxed in, tailed) end a chase before it matters |
| J13 | a rocket fired with a car 20-50 u ahead: the blast is the player's | ai/fighter.js | settled (D22): Boom Gangs keeps a sidewalk between the skull and its targets; a cruiser crossing the line is a player's risk too |
| J14 | a Pumper wedged on the L's pillars turning off Loop Avenue | ai/autoplayer.js | settled (D22): a retry puts the engine back on a free lane |
| J15 | a police car put on the wrong-way lane turned round off the canal bridge's end | ai/autoplayer.js | settled (D22): content unsticks only a stopped car, onto the lane its way |
| J16 | the Cranes poi in a lane-less corner; the plaza's poi in the fountain | world (Lowtown) | settled (D22): an activity there starts from a point of its own |
| E1 | a landmark can't carry decks, and a stunt's ramp would get lanes and props | world/district.js, nav/roadgraph.js, world/builder.js | done (part 3c, D22): a landmark's `decks`; kind `ramp` is terrain only (the Container Stack and the Car Park Roof) |
| E2 | the campaign's stunt run starts on the street under the Loop Gap's deck and misses the drawbridge's window | tools/bot-campaign.mjs `stunt()` | for the campaign (M8.4) |
| E3 | a mission enemy fights only the player: no shoot-out already under way | mission/actors.js | settled (D22): the crew shoots the rivals and the rivals shoot wide of the player |
| E4 | no siren for a scripted police car | mission/actors.js `_drive()` | done (part 3c, D22): `drive: { siren: true }` |
| E5 | `m.spawn.ped` can't keep a victim off the lock-on | mission/actors.js `ped()` | done (part 3c, D22): `aimable: false` |
| E6 | the AutoPlayer's last stretch swings a long car's nose into the sidewalk's furniture | ai/autoplayer.js `_final()` | settled (D22): the stalled car's marker sits up the lane |
| S1 | the crew `m.spawn.vehicle` seats (driver, passengers) never rides: their bodies stay where the car was made, and shots at it never find them | mission/actors.js `update()` | done (part 3c, D22) |
| S2 | no drive-bys for a mission's seated peds (the Rats' gunmen) | mission/actors.js | settled (D22): PLAN.md's S2 proves the player's drive-by (from Fender's passenger seat) and the Rats' cars chasing; their gunmen ride without firing |
| S3 | the bot's drive-by fires at the nearest target through buildings and the traffic beside it | ai/missionbot.js `_driveBy()` | done (part 3c, D22): the nearest with a clear line (its own car no blocker), else the trigger held |
| S4 | racers keep to the red lights | mission/actors.js `_drive()` | settled (D22) with J3: S3 and both street races pass as they are, and racers through the reds would make S3's first place a lottery for a player |
| S5 | the AutoPlayer boards only the driver's seat; a passenger with a goto hint gets out | ai/autoplayer.js | settled (D22): a job where the player rides shotgun places them (`m.place(p, { in, seat })`) and gives only kill hints |
| S6 | a brain on a route waits at a full exit for good | ai/driver.js `_junction()` | settled (D22): S2 removes a stalled Brute once out of sight; the gridlock breaker (P4) takes the worst of it |
| P1 | the objective line draws `{action}` tokens raw | src/game/scenes/career.js | with M9's HUD, merged after M8 (its objective line goes through the prompt parser) |
| P2 | headless runs have no save store: the career's SAVE never emits `save` | tools/bot.mjs, tools/bot-campaign.mjs | done (part 3c, D22): a memory backend, as the economy test's |
| P3 | `m.curb(at)` hands back another street's spot when this one's are taken | mission/actors.js `curbNear()`, runtime.js | done (part 3c, D22): `m.curb(at, { within })` (null when none is that near) |
| P4 | Gnome Row × Loop Avenue (j3) gridlocks for minutes | ai/driver.js | done (part 3c, D22): a ring of stopped drivers each waiting on the next (seen too at the Loop's north-east corner, S1 seed 2 stuck 570 s) breaks after `TUNE.gridlock` s: the lowest id creeps through |
| P5 | no `m.police(vehicle)` to hand a mission's cruiser to the police | mission/runtime.js | settled (D22): the prologue's cop is parked with its siren on and the dispatch does the chase |
| P6 | the bot presses a prompt every step while it stands at it (the chapel's SAVE wrote slot 1 165 times) | ai/missionbot.js `_goto()` | done (part 3c, D22): one press each beat |

After the patch, port the content's workarounds to the new pieces: G1's passer-by (`m.on('hit', e => { if (e.target
=== m.player.id) m.shoo(e.by); })`) and its timer (`m.countdown`); G2's clock (`m.hour`); G3's drums (`m.blast`) and
its respect refund (`m.truce('rats')`); H4's cameras (`m.inside.run.loopCameras(true)`). H4 keeps its van's two
troopers at chest height each step so the assist locks on them: with riders riding (H4/G1 above) the runtime puts them
at a seated height each step too; check H4's `window` stage after the patch.
