# The MOTOR backlog from FAN-OUT A2 (after part 2b; all settled in part 3a, D22)

The `rats` worker's ten requests are done (part 2a, D21). These are the `heist-finale` (H) and `gnomes` (G) workers'
(their full text with each patch: `notes/heist-finale.result.json`, `notes/gnomes.result.json`). Each was checked
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

After the patch, port the content's workarounds to the new pieces: G1's passer-by (`m.on('hit', e => { if (e.target
=== m.player.id) m.shoo(e.by); })`) and its timer (`m.countdown`); G2's clock (`m.hour`); G3's drums (`m.blast`) and
its respect refund (`m.truce('rats')`); H4's cameras (`m.inside.run.loopCameras(true)`). H4 keeps its van's two
troopers at chest height each step so the assist locks on them: with riders riding (H4/G1 above) the runtime puts them
at a seated height each step too; check H4's `window` stage after the patch.
